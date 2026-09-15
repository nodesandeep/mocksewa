const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * SECURE: Fetch questions for a quiz
 * Validates enrollment and sanitizes data.
 */
exports.getQuestions = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { quizId } = data;
  const uid = context.auth.uid;

  if (!quizId) {
    throw new functions.https.HttpsError("invalid-argument", "quizId is required.");
  }

  try {
    // 2. Get Quiz Data
    const quizSnap = await db.collection("quizzes").doc(quizId).get();
    if (!quizSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Quiz not found.");
    }
    const quizData = quizSnap.data();
    const courseId = quizData.courseId;

    // 3. Admin Check
    const userSnap = await db.collection("users").doc(uid).get();
    const isAdmin = userSnap.data()?.role === "admin";

    // 4. Enrollment Check (Skip if Free Trial or Admin)
    if (!quizData.isFreeTrial && !isAdmin) {
      const enrollmentSnap = await db
        .collection("enrollments")
        .where("userId", "==", uid)
        .where("courseId", "==", courseId)
        .where("status", "==", "active")
        .get();

      if (enrollmentSnap.empty) {
        throw new functions.https.HttpsError("permission-denied", "Access Denied: Course enrollment required.");
      }
    }

    // 5. Check for Existing Attempt
    const attemptsSnap = await db
      .collection("studentAttempts")
      .where("userId", "==", uid)
      .where("quizId", "==", quizId)
      .limit(1)
      .get();
    
    const hasAttempt = !attemptsSnap.empty;
    const latestAttempt = hasAttempt ? attemptsSnap.docs[0].data() : null;
    const shouldRevealAnswers = hasAttempt || isAdmin;

    // 6. Fetch Questions
    const questionsSnap = await db
      .collection("questions")
      .where("quizId", "==", quizId)
      .get();

    let questions = questionsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (quizData.questionLimit) {
      questions = questions.slice(0, Number(quizData.questionLimit));
    }

    // 7. Sanitize
    const finalQuestions = shouldRevealAnswers 
      ? questions 
      : questions.map((q) => {
          const {
            correctOptionIndex,
            correctAns,
            CorrectAns,
            explanationText,
            explanation,
            Rationale,
            rationale,
            ...safeQuestion
          } = q;
          return safeQuestion;
        });

    return {
      questions: finalQuestions,
      quiz: {
        title: quizData.title,
        durationMinutes: quizData.durationMinutes,
      },
      hasAttempt,
      attempt: latestAttempt ? {
        finalScore: latestAttempt.finalScore,
        stats: latestAttempt.stats,
        answers: latestAttempt.answers,
      } : null,
    };
  } catch (error) {
    console.error("Error in getQuestions:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * SECURE: Submit quiz attempt
 * Validates score and updates mastery on server.
 */
exports.submitQuiz = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { quizId, answers, timeTakenSeconds } = data;
  const uid = context.auth.uid;

  try {
    // 1. Fetch Key Data
    const [quizSnap, questionsSnap] = await Promise.all([
      db.collection("quizzes").doc(quizId).get(),
      db.collection("questions").where("quizId", "==", quizId).get(),
    ]);

    if (!quizSnap.exists) throw new functions.https.HttpsError("not-found", "Quiz not found.");
    
    const quizData = quizSnap.data();
    let questions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (quizData.questionLimit) questions = questions.slice(0, Number(quizData.questionLimit));

    // 2. Server-Side Score Calculation
    let correct = 0, wrong = 0, skipped = 0;
    const penaltyRate = quizData.negativeMarkingPercentage || 0.2;

    questions.forEach((q, idx) => {
      const selected = answers[idx];
      if (selected === undefined) skipped++;
      else if (selected === q.correctOptionIndex) correct++;
      else wrong++;
    });

    const totalPossibleMarks = Number(quizData.fullMarks) || questions.length || 100;
    const marksPerQuestion = totalPossibleMarks / (questions.length || 1);
    const penaltyPerQuestion = marksPerQuestion * penaltyRate;
    const finalScore = (correct * marksPerQuestion) - (wrong * penaltyPerQuestion);

    // XP and Accuracy
    const accuracy = correct / (questions.length || 1);
    const xpGain = Math.max(0, Math.round(finalScore * 10 + accuracy * 50));

    // 3. Atomic Update (Transaction)
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection("users").doc(uid);
      const attemptRef = db.collection("studentAttempts").doc();
      const userDoc = await transaction.get(userRef);

      // Log Attempt
      transaction.set(attemptRef, {
        userId: uid,
        quizId,
        courseId: quizData.courseId,
        answers,
        stats: { correct, wrong, skipped },
        finalScore,
        accuracy,
        timeTakenSeconds,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update User XP
      if (userDoc.exists) {
        transaction.update(userRef, {
          totalXP: admin.firestore.FieldValue.increment(xpGain),
          quizzesCompleted: admin.firestore.FieldValue.increment(1),
          lastActive: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Update Mastery
      const masteryAggregates = {};
      questions.forEach((q, idx) => {
        const selected = answers[idx];
        if (selected === undefined) return;
        const micro = q.microConcept || q.topic || q.subjectId || "general";
        if (!masteryAggregates[micro]) masteryAggregates[micro] = { correct: 0, total: 0 };
        masteryAggregates[micro].total++;
        if (selected === q.correctOptionIndex) masteryAggregates[micro].correct++;
      });

      for (const [micro, mData] of Object.entries(masteryAggregates)) {
        const masteryRef = userRef.collection("mastery").doc(micro);
        const acc = mData.correct / mData.total;
        let thetaAdj = acc >= 0.7 ? 2 : acc <= 0.3 ? -2 : 0;
        transaction.set(masteryRef, {
          microConceptId: micro,
          totalAttempts: admin.firestore.FieldValue.increment(mData.total),
          correctAttempts: admin.firestore.FieldValue.increment(mData.correct),
          currentTheta: admin.firestore.FieldValue.increment(thetaAdj),
          lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
          lastAccuracy: acc
        }, { merge: true });
      }
    });

    return { success: true, score: finalScore, stats: { correct, wrong, skipped }, xpGain };
  } catch (error) {
    console.error("Error in submitQuiz:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * TURSO API BRIDGE
 * This Express app handles all /api/* requests for the static site.
 */
const express = require('express');
const cors = require('cors');
const { createClient } = require('@libsql/client');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Initialize Turso
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://mymocksewa-db-nodesandeep.aws-ap-south-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Middleware to verify Firebase ID Token
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- ADMIN ROUTES ---
app.get('/api/admin/stats', authenticate, async (req, res) => {
  try {
    // Verify Admin Role
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (userDoc.data()?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    // 1. Get Active Students (from Turso user_enrollments)
    const studentsRes = await turso.execute("SELECT COUNT(DISTINCT userId) as count FROM user_enrollments WHERE status = 'active'");
    
    // 2. Mock Stats (since we haven't migrated payments to Turso yet)
    // We can still read these from Firestore as Admin if needed
    const paymentsSnap = await db.collection('paymentVerifications').get();
    let revenue = 0;
    let pending = 0;
    paymentsSnap.forEach(doc => {
      const d = doc.data();
      if (d.status === 'verified') revenue += parseFloat(d.amount || 0);
      if (d.status === 'pending') pending++;
    });

    res.json({
      activeStudents: studentsRes.rows[0].count || 0,
      revenue,
      pendingPayments: pending,
      newLeads: 0 // Placeholder
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/content', authenticate, async (req, res) => {
  const { type, action, data } = req.body;
  
  // Verify Admin Role
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  if (userDoc.data()?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    if (type === 'questions_bulk' && action === 'save') {
      const { questions } = data;
      const batches = [];
      for (const q of questions) {
        batches.push({
          sql: `INSERT OR REPLACE INTO questions (id, quizId, questionText, optionA, optionB, optionC, optionD, correctOptionIndex, explanationText, difficulty, microConcept, topic, marks, negativeMarks) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [q.id, q.quizId, q.questionText, q.optionA, q.optionB, q.optionC, q.optionD, q.correctOptionIndex, q.explanationText || '', q.difficulty || 'medium', q.microConcept || '', q.topic || '', q.marks || 1, q.negativeMarks || 0.2]
        });
      }
      await turso.batch(batches);
      return res.json({ success: true, count: questions.length });
    }

    if (type === 'quiz' && action === 'save') {
      const q = data;
      await turso.execute({
        sql: `INSERT OR REPLACE INTO quizzes (id, title, courseId, subjectId, durationMinutes, fullMarks, passMarks, negativeMarkingPercentage, questionLimit, enabled, isFreeTrial, globalOrder) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [q.id, q.title, q.courseId, q.subjectId, q.durationMinutes || 45, q.fullMarks || 100, q.passMarks || 40, q.negativeMarkingPercentage || 0.2, q.questionLimit || 50, q.enabled ? 1 : 0, q.isFreeTrial ? 1 : 0, q.globalOrder || 999]
      });
      return res.json({ success: true });
    }

    if (type === 'course' && action === 'save') {
      const c = data;
      await turso.execute({
        sql: `INSERT OR REPLACE INTO courses (id, title, description, category, status, basePrice, salePrice, bannerUrl) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [c.id, c.title, c.description || '', c.category || 'general', c.status || 'active', c.basePrice || 0, c.salePrice || 0, c.bannerUrl || '']
      });
      return res.json({ success: true });
    }

    if (type === 'subject' && action === 'save') {
      const s = data;
      await turso.execute({
        sql: `INSERT OR REPLACE INTO subjects (id, name, courseId, icon, description, active) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [s.id, s.name, s.courseId, s.icon || '📚', s.description || '', s.active ? 1 : 0]
      });
      return res.json({ success: true });
    }

    res.status(400).json({ error: 'Invalid type or action' });
  } catch (error) {
    console.error('Turso Admin Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- QUIZ & ATTEMPT ROUTES ---
app.get('/api/student/hub', authenticate, async (req, res) => {
  const uid = req.user.uid;
  try {
    let coursesResult = { rows: [] }, 
        subjectsResult = { rows: [] }, 
        quizzesResult = { rows: [] }, 
        materialsResult = { rows: [] }, 
        attemptsResult = { rows: [] }, 
        enrollmentsResult = { rows: [] }, 
        masteryResult = { rows: [] };

    // 1. Parallel Fetch from Turso
    try {
      const results = await Promise.all([
        turso.execute('SELECT id, title, description, category, status, basePrice, discountedPrice, bannerUrl, attemptLimit, questionLimit, durationMinutes, fullMarks FROM courses'),
        turso.execute('SELECT id, name, title, courseId, icon, active FROM subjects'),
        turso.execute('SELECT id, courseId, subjectId, title, description, timeLimit, price, enabled, isFreeTrial, globalOrder FROM quizzes'),
        turso.execute('SELECT id, title, subjectId, courseId, type, url, createdAt FROM study_materials').catch(() => ({ rows: [] })),
        turso.execute({ sql: 'SELECT * FROM student_attempts WHERE userId = ? ORDER BY timestamp DESC LIMIT 50', args: [uid] }).catch(() => ({ rows: [] })),
        turso.execute({ sql: 'SELECT courseId FROM user_enrollments WHERE userId = ?', args: [uid] }).catch(() => ({ rows: [] })),
        turso.execute({ sql: 'SELECT m.*, s.title as subjectTitle FROM user_mastery m LEFT JOIN subjects s ON m.subjectId = s.id WHERE m.userId = ?', args: [uid] }).catch(() => ({ rows: [] })),
      ]);
      [coursesResult, subjectsResult, quizzesResult, materialsResult, attemptsResult, enrollmentsResult, masteryResult] = results;
    } catch (tursoError) {
      console.error(`[hub] Turso connectivity failed:`, tursoError.message);
    }

    let coursesRaw = coursesResult.rows;
    let subjects = subjectsResult.rows;
    let quizzes = quizzesResult.rows;
    let materials = materialsResult.rows;

    // 2. Cross-Check Enrollments (Turso + Firestore)
    const tursoEnrolledIds = enrollmentsResult.rows.map(r => r.courseId);
    let firestoreEnrolledIds = [];
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        firestoreEnrolledIds = userDoc.data().enrolledCourses || [];
      }
    } catch (e) {
      console.warn('[hub] Firestore user doc read skipped:', e.message);
    }
    const enrolledCourseIds = [...new Set([...tursoEnrolledIds, ...firestoreEnrolledIds])];

    // 3. Deep Self-Healing Fallback
    const missingCourseIds = enrolledCourseIds.filter(id => !coursesRaw.some(c => c.id === id));
    if (missingCourseIds.length > 0) {
      console.warn(`[hub] Found ${missingCourseIds.length} missing courses in Turso. Fetching from Firestore...`);
      try {
        const cSnap = await db.collection('courses').where('id', 'in', missingCourseIds).get();
        const fsCourses = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        coursesRaw = [...coursesRaw, ...fsCourses];

        const sSnap = await db.collection('subjects').where('courseId', 'in', missingCourseIds).get();
        const fsSubjects = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        subjects = [...subjects, ...fsSubjects];

        const qSnap = await db.collection('quizzes').where('courseId', 'in', missingCourseIds).get();
        const fsQuizzes = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        quizzes = [...quizzes, ...fsQuizzes];
      } catch (fallbackError) {
        console.error(`[hub] Deep fallback failed:`, fallbackError);
      }
    }

    // 4. Normalize and Return
    const courses = coursesRaw.map(c => ({
      id: c.id,
      title: c.title || '',
      description: c.description || '',
      category: c.category || 'General Curriculum',
      status: c.status || 'active',
      basePrice: Number(c.basePrice) || 0,
      salePrice: Number(c.salePrice || c.discountedPrice) || 0,
      bannerUrl: c.bannerUrl || '',
      attemptLimit: Number(c.attemptLimit) || 2,
      questionLimit: Number(c.questionLimit) || 50,
      durationMinutes: Number(c.durationMinutes) || 45,
      fullMarks: Number(c.fullMarks) || 100,
    }));

    let attempts = attemptsResult.rows;
    if (attempts.length === 0) {
      const snap = await db.collection('studentAttempts').where('userId', '==', uid).orderBy('timestamp', 'desc').limit(50).get();
      attempts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    res.json({
      courses,
      subjects,
      quizzes,
      materials,
      attempts,
      mastery: masteryResult.rows,
      enrolledCourseIds,
    });
  } catch (error) {
    console.error('Hub API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/quiz', authenticate, async (req, res) => {
  const { quizId } = req.query;
  const uid = req.user.uid;
  if (!quizId) return res.status(400).json({ error: "quizId is required" });

  try {
    // 1. Fetch Quiz & Questions with Metadata in one JOIN
    let quizResult = { rows: [] };
    let questionsResult = { rows: [] };

    try {
      [quizResult, questionsResult] = await Promise.all([
        turso.execute({ sql: 'SELECT * FROM quizzes WHERE id = ?', args: [quizId] }),
        turso.execute({ 
          sql: `
            SELECT q.*, m.correctOptionIndex as metaCorrect, m.explanationText as metaExplanation 
            FROM questions q
            LEFT JOIN question_metadata m ON q.id = m.id
            WHERE q.quizId = ?
            LIMIT 1000
          `, 
          args: [quizId] 
        })
      ]);
    } catch (e) {
      console.warn('[quiz] Turso fetch failed, will try fallback.', e.message);
    }

    let quiz = quizResult.rows[0];
    let questionsRaw = questionsResult.rows;

    // 2. Quiz Fallback (if Turso is empty or failed)
    if (!quiz || questionsRaw.length === 0) {
      console.warn(`[quiz] Quiz ${quizId} not found in Turso. Falling back to Firestore...`);
      try {
        if (!quiz) {
          const qDoc = await db.collection('quizzes').doc(quizId).get();
          if (qDoc.exists) quiz = { id: qDoc.id, ...qDoc.data() };
        }
        if (questionsRaw.length === 0) {
          const qsSnap = await db.collection('questions').where('quizId', '==', quizId).get();
          questionsRaw = qsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (e) {
        console.error('[quiz] Firestore fallback failed:', e.message);
      }
    }

    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    // 3. Process and Sanitize Questions
    let questions = questionsRaw.map(q => {
      // Handle options parsing
      let options = q.options;
      if (typeof options === 'string') {
        try { options = JSON.parse(options); } catch (e) { options = []; }
      }
      
      // Merge metadata with fallbacks
      return { 
        ...q, 
        options: Array.isArray(options) ? options : [],
        correctOptionIndex: q.metaCorrect ?? q.correctOptionIndex ?? q.correctAns ?? q.CorrectAns,
        explanationText: q.metaExplanation ?? q.explanationText ?? q.explanation ?? q.rationale ?? q.Rationale ?? ''
      };
    });

    // 4. Enrollment Check
    let isEnrolled = false;
    const courseId = quiz.courseId;
    try {
      const enrollRes = await turso.execute({ 
        sql: "SELECT 1 FROM user_enrollments WHERE userId = ? AND courseId = ? AND status = 'active'", 
        args: [uid, courseId] 
      });
      isEnrolled = enrollRes.rows.length > 0;
      if (!isEnrolled) {
        const userDoc = await db.collection('users').doc(uid).get();
        const enrolled = userDoc.data()?.enrolledCourses || [];
        isEnrolled = enrolled.includes(courseId);
      }
    } catch (e) {
      console.warn('[quiz] Enrollment check failed:', e.message);
    }

    const isFree = quiz.isFreeTrial === 1 || quiz.isFreeTrial === true;

    // 5. Deep Metadata Fallback (if JOIN missed some metadata)
    const missingMetaIds = questions
      .filter(q => q.correctOptionIndex === undefined)
      .map(q => q.id);

    if (missingMetaIds.length > 0 && (isEnrolled || isFree)) {
      console.warn(`[quiz] Missing metadata for ${missingMetaIds.length} questions. Backfilling...`);
      try {
        const metaMap = {};
        for (let i = 0; i < missingMetaIds.length; i += 10) {
          const chunk = missingMetaIds.slice(i, i + 10);
          const mSnap = await db.collection('questionMetadata').where('id', 'in', chunk).get();
          mSnap.docs.forEach(d => { metaMap[d.id] = { id: d.id, ...d.data() }; });
          
          // Legacy check for IDs still missing
          const stillMissing = chunk.filter(id => !metaMap[id]);
          if (stillMissing.length > 0) {
            const legacySnap = await db.collection('questions').where(admin.firestore.FieldPath.documentId(), 'in', stillMissing).get();
            legacySnap.docs.forEach(d => { metaMap[d.id] = { id: d.id, ...d.data() }; });
          }
        }
        
        questions = questions.map(q => {
          if (metaMap[q.id]) {
            const m = metaMap[q.id];
            return {
              ...q,
              correctOptionIndex: m.correctOptionIndex ?? m.correctAns ?? m.CorrectAns,
              explanationText: m.explanationText || m.explanation || m.rationale || m.Rationale || ''
            };
          }
          return q;
        });
      } catch (e) {
        console.error('[quiz] Metadata deep fallback failed:', e.message);
      }
    }

    // 6. Security Sanitization
    if (!isEnrolled && !isFree) {
      return res.json({
        quiz,
        questions: questions.map(q => ({
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          topic: q.topic,
          microConcept: q.microConcept
        })),
        isLocked: true
      });
    }

    res.json({ quiz, questions, isLocked: false });
  } catch (error) {
    console.error('Quiz API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/student/attempt', authenticate, async (req, res) => {
  const { quizId, answers, score, stats, timeTakenSeconds } = req.body;
  try {
    await turso.execute({
      sql: `INSERT INTO student_attempts (userId, quizId, score, correct, wrong, skipped, timeTakenSeconds) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [req.user.uid, quizId, score, stats.correct, stats.wrong, stats.skipped, timeTakenSeconds]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

exports.api = functions.https.onRequest(app);
