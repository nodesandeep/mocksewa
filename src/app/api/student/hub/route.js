import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  let user;
  try {
    user = await adminAuth.verifyIdToken(token);
    
    // Safety Check: Verify status
    const statusCheck = await turso.execute({
      sql: 'SELECT status FROM user_profile_ext WHERE userId = ?',
      args: [user.uid]
    });
    if (statusCheck.rows.length > 0 && statusCheck.rows[0].status === 'blocked') {
      return NextResponse.json({ 
        error: 'ACCOUNT_BLOCKED', 
        message: 'Your account has been suspended. Please contact administration.' 
      }, { status: 403 });
    }
  } catch (e) {
    console.error('[hub auth error]:', e.message);
    return NextResponse.json({ error: 'Invalid token', detail: e.message }, { status: 401 });
  }

  try {
    let coursesResult = { rows: [] }, 
        subjectsResult = { rows: [] }, 
        quizzesResult = { rows: [] }, 
        materialsResult = { rows: [] }, 
        attemptsResult = { rows: [] }, 
        enrollmentsResult = { rows: [] }, 
        masteryResult = { rows: [] },
        trialCoursesResult = { rows: [] };

    try {
      const results = await Promise.all([
        turso.execute('SELECT id, title, description, category, status, basePrice, discountedPrice, bannerUrl, attemptLimit, questionLimit, durationMinutes, fullMarks FROM courses'),
        turso.execute('SELECT id, name, title, courseId, icon, active FROM subjects'),
        turso.execute('SELECT id, courseId, subjectId, title, description, timeLimit, price, enabled, isFreeTrial, globalOrder, createdAt FROM quizzes ORDER BY globalOrder ASC, createdAt ASC'),
        turso.execute('SELECT id, title, subjectId, courseId, type, url, createdAt FROM study_materials').catch(() => ({ rows: [] })),
        turso.execute({ sql: 'SELECT * FROM student_attempts WHERE userId = ? ORDER BY timestamp DESC LIMIT 50', args: [user.uid] }).catch(() => ({ rows: [] })),
        turso.execute({ sql: 'SELECT courseId FROM user_enrollments WHERE userId = ?', args: [user.uid] }).catch(() => ({ rows: [] })),
        turso.execute({ sql: 'SELECT m.*, s.title as subjectTitle FROM user_mastery m LEFT JOIN subjects s ON m.subjectId = s.id WHERE m.userId = ?', args: [user.uid] }).catch(() => ({ rows: [] })),
        // Trial courses for free-preview funnel
        turso.execute(`
          SELECT
            tc.id as trialId,
            tc.parentCourseId,
            tc.trialQuizId,
            c.title as courseTitle,
            c.description as courseDescription,
            c.basePrice,
            c.discountedPrice,
            c.bannerUrl,
            q.title as trialSetTitle,
            q.timeLimit,
            (SELECT COUNT(*) FROM quizzes WHERE courseId = c.id AND enabled = 1) as totalSets
          FROM trial_courses tc
          JOIN courses c ON tc.parentCourseId = c.id
          JOIN quizzes q ON tc.trialQuizId = q.id
          WHERE c.status = 'active' AND c.showTrial = 1
        `).catch(() => ({ rows: [] })),
      ]);
      [coursesResult, subjectsResult, quizzesResult, materialsResult, attemptsResult, enrollmentsResult, masteryResult] = results.slice(0, 7);
      trialCoursesResult = results[7];
      console.log(`[hub] Turso data sync success: ${coursesResult.rows.length} courses`);
    } catch (tursoError) {
      console.error(`[hub] Turso connectivity failed:`, tursoError.message);
    }

    let coursesRaw = coursesResult.rows;
    let subjects = subjectsResult.rows;
    let quizzes = quizzesResult.rows;
    let materials = materialsResult.rows;

    // ── Get Enrollments from Turso and Firestore ─────────────────
    const tursoEnrolledIds = enrollmentsResult.rows.map(r => r.courseId);
    let firestoreEnrolledIds = [];
    try {
      if (process.env.NEXT_PHASE !== 'phase-production-build') {
        const userDoc = await adminDb.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          firestoreEnrolledIds = userDoc.data().enrolledCourses || [];
        }
      }
    } catch (e) {
      console.warn('[hub] Firestore user doc read skipped:', e.message);
    }
    const enrolledCourseIds = [...new Set([...tursoEnrolledIds, ...firestoreEnrolledIds])];

    // ── Deep Self-Healing Fallback (Targeted Read) ────────
    // If some enrolled courses are missing in Turso, fetch them and their children from Firestore
    const missingCourseIds = enrolledCourseIds.filter(id => !coursesRaw.some(c => c.id === id));
    
    if (missingCourseIds.length > 0 && process.env.NEXT_PHASE !== 'phase-production-build') {
      console.warn(`[hub] Found ${missingCourseIds.length} missing courses in Turso. Fetching from Firestore...`);
      try {
        const cSnap = await adminDb.collection('courses')
          .where('id', 'in', missingCourseIds)
          .get();
        
        const fsCourses = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        coursesRaw = [...coursesRaw, ...fsCourses];

        // Also fetch subjects for these courses
        const sSnap = await adminDb.collection('subjects')
          .where('courseId', 'in', missingCourseIds)
          .get();
        const fsSubjects = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        subjects = [...subjects, ...fsSubjects];

        // Also fetch quizzes for these courses
        const qSnap = await adminDb.collection('quizzes')
          .where('courseId', 'in', missingCourseIds)
          .get();
        const fsQuizzes = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        quizzes = [...quizzes, ...fsQuizzes];
        
        console.log(`[hub] Deep fallback complete: Added ${fsCourses.length} courses, ${fsSubjects.length} subjects, ${fsQuizzes.length} quizzes.`);
      } catch (fallbackError) {
        console.error(`[hub] Deep fallback failed:`, fallbackError);
      }
    } else if (coursesRaw.length === 0 && process.env.NEXT_PHASE !== 'phase-production-build') {
      // Fallback for public courses if Turso is totally empty
      console.warn(`[hub] Turso totally empty. Falling back to Firestore for all active courses...`);
      try {
        const cSnap = await adminDb.collection('courses').where('status', '==', 'active').get();
        coursesRaw = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.error('[hub] Global fallback failed:', e);
      }
    }

    // ── Normalise course shape ─────────────────
    const courses = coursesRaw.map(c => ({
      id:               c.id,
      title:            c.title || '',
      description:      c.description || '',
      category:         c.category || 'General Curriculum',
      status:           c.status || 'active',
      basePrice:        Number(c.basePrice) || 0,
      discountedPrice:  Number(c.discountedPrice) || 0,
      isDiscounted:     Number(c.discountedPrice) > 0 && 
                        Number(c.discountedPrice) < Number(c.basePrice),
      isPremium:        Number(c.basePrice) > 0,
      isBundle:         c.isBundle || false,
      bannerUrl:        c.bannerUrl || '',
      attemptLimit:     Number(c.attemptLimit) || 1,
      questionLimit:    Number(c.questionLimit) || 50,
      durationMinutes:  Number(c.durationMinutes) || 45,
      fullMarks:        Number(c.fullMarks) || 100,
    }));

    let attempts = attemptsResult.rows;
    if (attempts.length === 0) {
      try {
        const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
        if (!isBuild) {
          const snap = await adminDb.collection('studentAttempts')
            .where('userId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .limit(50)   
            .get();
          attempts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (e) {
        console.warn('[hub] Firestore attempts fallback skipped:', e.message);
      }
    }

    // Build trial courses list — exclude ones user is already enrolled in
    const trialCourses = (trialCoursesResult.rows || []).filter(
      tc => !enrolledCourseIds.includes(tc.parentCourseId)
    ).map(tc => ({
      trialId: tc.trialId,
      parentCourseId: tc.parentCourseId,
      trialQuizId: tc.trialQuizId,
      courseTitle: tc.courseTitle || '',
      courseDescription: tc.courseDescription || '',
      basePrice: Number(tc.basePrice) || 0,
      discountedPrice: Number(tc.discountedPrice) || 0,
      bannerUrl: tc.bannerUrl || '',
      trialSetTitle: tc.trialSetTitle || '',
      timeLimit: Number(tc.timeLimit) || 45,
      totalSets: Number(tc.totalSets) || 0,
    }));

    return NextResponse.json({
      courses,
      subjects,
      quizzes,
      materials,
      attempts,
      mastery: masteryResult.rows,
      enrolledCourseIds,
      trialCourses,
    });

  } catch (error) {
    console.error('[Hub API Error]', error);
    return NextResponse.json({ error: 'Internal Server Error', detail: error.message }, { status: 500 });
  }
}
