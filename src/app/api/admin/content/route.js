import { NextResponse } from 'next/server';
import { adminAuth } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

// ─── Admin auth guard ─────────────────────────────────────────────────
async function verifyAdmin(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch {
    return null;
  }
}

// ─── GET: Read content ────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const courseId = searchParams.get('courseId');
  const subjectId = searchParams.get('subjectId');

  try {
    if (type === 'courses') {
      const res = await turso.execute('SELECT * FROM courses ORDER BY createdAt DESC');
      return NextResponse.json(res.rows);
    }
    if (type === 'subjects') {
      if (courseId) {
        const res = await turso.execute({ sql: 'SELECT * FROM subjects WHERE courseId = ?', args: [courseId] });
        return NextResponse.json(res.rows);
      }
      const res = await turso.execute('SELECT * FROM subjects ORDER BY createdAt ASC');
      return NextResponse.json(res.rows);
    }
    if (type === 'quizzes') {
      if (subjectId) {
        const res = await turso.execute({ sql: 'SELECT * FROM quizzes WHERE subjectId = ? ORDER BY globalOrder ASC, createdAt ASC', args: [subjectId] });
        return NextResponse.json(res.rows);
      }
      if (courseId) {
        const res = await turso.execute({ sql: 'SELECT * FROM quizzes WHERE courseId = ? ORDER BY globalOrder ASC, createdAt ASC', args: [courseId] });
        return NextResponse.json(res.rows);
      }
      const res = await turso.execute('SELECT * FROM quizzes ORDER BY globalOrder ASC, createdAt ASC');
      return NextResponse.json(res.rows);
    }
    if (type === 'chapters') {
      if (courseId) {
        const res = await turso.execute({ 
          sql: 'SELECT c.*, q.title as quizTitle FROM chapters c LEFT JOIN quizzes q ON q.chapterId = c.id WHERE c.courseId = ? ORDER BY c.sequenceOrder ASC', 
          args: [courseId] 
        });
        return NextResponse.json(res.rows);
      }
      const res = await turso.execute('SELECT c.*, q.title as quizTitle FROM chapters c LEFT JOIN quizzes q ON q.chapterId = c.id ORDER BY c.createdAt DESC');
      return NextResponse.json(res.rows);
    }
    if (type === 'questions') {
      const quizId = searchParams.get('quizId');
      const subjectId = searchParams.get('subjectId');
      if (quizId) {
        const res = await turso.execute({ sql: 'SELECT q.*, qm.correctOptionIndex, qm.explanationText FROM questions q LEFT JOIN question_metadata qm ON q.id = qm.id WHERE q.quizId = ?', args: [quizId] });
        return NextResponse.json(res.rows);
      }
      if (subjectId) {
        const res = await turso.execute({ sql: 'SELECT q.*, qm.correctOptionIndex, qm.explanationText FROM questions q LEFT JOIN question_metadata qm ON q.id = qm.id WHERE q.subjectId = ? LIMIT 5000', args: [subjectId] });
        return NextResponse.json(res.rows);
      }
    }
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('[Admin Content API] GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST: Write content ──────────────────────────────────────────────
export async function POST(request) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { type, action, data } = await request.json();

    // ── COURSE ────────────────────────────────────────────
    if (type === 'course') {
      if (action === 'save') {
        const id = data.id || `course_${Date.now()}`;
        await turso.execute({
          sql: `INSERT INTO courses (id, title, description, category, basePrice, discountedPrice, isDiscounted, isBundle, includedCourseIds, status, isPremium, attemptLimit, durationMinutes, questionLimit, fullMarks, bannerUrl, showTrial, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  title=excluded.title, description=excluded.description, category=excluded.category,
                  basePrice=excluded.basePrice, discountedPrice=excluded.discountedPrice,
                  isDiscounted=excluded.isDiscounted, isBundle=excluded.isBundle,
                  includedCourseIds=excluded.includedCourseIds, status=excluded.status,
                  isPremium=excluded.isPremium, attemptLimit=excluded.attemptLimit,
                  durationMinutes=excluded.durationMinutes, questionLimit=excluded.questionLimit,
                  fullMarks=excluded.fullMarks, bannerUrl=excluded.bannerUrl,
                  showTrial=excluded.showTrial`,
          args: [
            id, data.title || '', data.description || '', data.category || 'General',
            data.basePrice || 0, data.discountedPrice || 0, data.isDiscounted ? 1 : 0,
            data.isBundle ? 1 : 0, data.includedCourseIds || '', data.status || 'active',
            data.isPremium !== false ? 1 : 0, data.attemptLimit || 2, data.durationMinutes || 45,
            data.questionLimit || 50, data.fullMarks || 100, data.bannerUrl || '',
            data.showTrial !== false ? 1 : 0,
            data.createdAt || new Date().toISOString(),
          ],
        });
        return NextResponse.json({ success: true, id });
      }

      if (action === 'delete') {
        const { id } = data;
        if (!id) return NextResponse.json({ error: 'No course id' }, { status: 400 });

        // With ON DELETE CASCADE, deleting the course cascades to:
        // subjects → quizzes → questions + question_metadata + student_attempts + trial_courses + user_enrollments
        // We batch the delete with explicit pre-deletes for safety on older schema fallback
        const statements = [
          // Explicit purge order for safety (CASCADE handles it, but belt+suspenders)
          { sql: `DELETE FROM question_metadata WHERE id IN (SELECT id FROM questions WHERE courseId = ?)`, args: [id] },
          { sql: `DELETE FROM questions WHERE courseId = ?`, args: [id] },
          { sql: `DELETE FROM student_attempts WHERE courseId = ?`, args: [id] },
          { sql: `DELETE FROM user_enrollments WHERE courseId = ?`, args: [id] },
          { sql: `DELETE FROM trial_courses WHERE parentCourseId = ?`, args: [id] },
          { sql: `DELETE FROM user_mastery WHERE subjectId IN (SELECT id FROM subjects WHERE courseId = ?)`, args: [id] },
          { sql: `DELETE FROM quizzes WHERE courseId = ?`, args: [id] },
          { sql: `DELETE FROM subjects WHERE courseId = ?`, args: [id] },
          { sql: `DELETE FROM courses WHERE id = ?`, args: [id] },
        ];
        await turso.batch(statements);
        console.log(`[Admin] Course ${id} and all children purged in transaction`);
        return NextResponse.json({ success: true });
      }
    }

    // ── SUBJECT ───────────────────────────────────────────
    if (type === 'subject') {
      if (action === 'save') {
        const id = data.id || `subject_${Date.now()}`;
        await turso.execute({
          sql: `INSERT INTO subjects (id, name, title, courseId, icon, description, active, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  name=excluded.name, title=excluded.title, courseId=excluded.courseId,
                  icon=excluded.icon, description=excluded.description, active=excluded.active`,
          args: [
            id, data.name || '', data.title || data.name || '', data.courseId || '',
            data.icon || '📚', data.description || '', data.active !== false ? 1 : 0,
            data.createdAt || new Date().toISOString(),
          ],
        });
        return NextResponse.json({ success: true, id });
      }
      if (action === 'delete') {
        const { id } = data;
        const statements = [
          { sql: `DELETE FROM question_metadata WHERE id IN (SELECT id FROM questions WHERE subjectId = ?)`, args: [id] },
          { sql: `DELETE FROM questions WHERE subjectId = ?`, args: [id] },
          { sql: `DELETE FROM user_mastery WHERE subjectId = ?`, args: [id] },
          { sql: `DELETE FROM quizzes WHERE subjectId = ?`, args: [id] },
          { sql: `DELETE FROM subjects WHERE id = ?`, args: [id] },
        ];
        await turso.batch(statements);
        return NextResponse.json({ success: true });
      }
    }

    // ── QUIZ / SET ─────────────────────────────────────────
    if (type === 'quiz') {
      if (action === 'save') {
        const id = data.id || `quiz_${Date.now()}`;
        await turso.execute({
          sql: `INSERT INTO quizzes (id, subjectId, courseId, title, description, timeLimit, price, globalOrder, isFreeTrial, enabled, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  title=excluded.title, globalOrder=excluded.globalOrder,
                  isFreeTrial=excluded.isFreeTrial, enabled=excluded.enabled,
                  description=excluded.description`,
          args: [
            id, data.subjectId, data.courseId || '', data.title || '', data.description || '',
            data.timeLimit || 0, data.price || 0, data.globalOrder || 999,
            data.isFreeTrial ? 1 : 0, data.enabled !== false ? 1 : 0,
            data.createdAt || new Date().toISOString(),
          ],
        });

        // If this quiz is a free trial, upsert into trial_courses
        if (data.isFreeTrial && data.courseId) {
          const trialId = `trial_${data.courseId}`;
          await turso.execute({
            sql: `INSERT INTO trial_courses (id, parentCourseId, trialQuizId) VALUES (?, ?, ?)
                  ON CONFLICT(parentCourseId) DO UPDATE SET trialQuizId=excluded.trialQuizId`,
            args: [trialId, data.courseId, id],
          });
        }
        return NextResponse.json({ success: true, id });
      }

      if (action === 'delete') {
        const { id } = data;
        // Check if this was a trial set — promote the next set if so
        const trialCheck = await turso.execute({ sql: 'SELECT parentCourseId FROM trial_courses WHERE trialQuizId = ?', args: [id] });
        
        const statements = [
          { sql: 'DELETE FROM question_metadata WHERE id IN (SELECT id FROM questions WHERE quizId = ?)', args: [id] },
          { sql: 'DELETE FROM questions WHERE quizId = ?', args: [id] },
          { sql: 'DELETE FROM student_attempts WHERE quizId = ?', args: [id] },
          { sql: 'DELETE FROM trial_courses WHERE trialQuizId = ?', args: [id] },
          { sql: 'DELETE FROM quizzes WHERE id = ?', args: [id] },
        ];
        await turso.batch(statements);

        // If this was the trial set, auto-promote the next available set
        if (trialCheck.rows.length > 0) {
          const courseId = trialCheck.rows[0].parentCourseId;
          const nextSet = await turso.execute({
            sql: 'SELECT id FROM quizzes WHERE courseId = ? ORDER BY globalOrder ASC, createdAt ASC LIMIT 1',
            args: [courseId],
          });
          if (nextSet.rows.length > 0) {
            const newTrialId = nextSet.rows[0].id;
            const newTrialRowId = `trial_${courseId}`;
            await turso.execute({
              sql: `INSERT INTO trial_courses (id, parentCourseId, trialQuizId) VALUES (?, ?, ?)
                    ON CONFLICT(parentCourseId) DO UPDATE SET trialQuizId=excluded.trialQuizId`,
              args: [newTrialRowId, courseId, newTrialId],
            });
            // Also mark new quiz as isFreeTrial
            await turso.execute({ sql: 'UPDATE quizzes SET isFreeTrial = 1 WHERE id = ?', args: [newTrialId] });
          }
        }
        return NextResponse.json({ success: true });
      }
    }

    // ── CHAPTER (Guided Mastery & Notes) ──────────────────
    if (type === 'chapter') {
      if (action === 'save') {
        const id = data.id || `chap_${Date.now()}`;
        await turso.execute({
          sql: `INSERT INTO chapters (
                  id, courseId, subjectId, title, sequenceOrder, readingMaterial, 
                  summaryPoints, passingThreshold, quizQuestionCount, estimatedReadMinutes, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  title=excluded.title,
                  courseId=excluded.courseId,
                  subjectId=excluded.subjectId,
                  sequenceOrder=excluded.sequenceOrder,
                  readingMaterial=excluded.readingMaterial,
                  summaryPoints=excluded.summaryPoints,
                  passingThreshold=excluded.passingThreshold,
                  quizQuestionCount=excluded.quizQuestionCount,
                  estimatedReadMinutes=excluded.estimatedReadMinutes`,
          args: [
            id, data.courseId, data.subjectId || '', data.title || '',
            data.sequenceOrder || 1, data.readingMaterial || '',
            data.summaryPoints || '', data.passingThreshold || 60,
            data.quizQuestionCount || 15, data.estimatedReadMinutes || 8,
            data.createdAt || new Date().toISOString()
          ]
        });

        // If quizId was chosen to link to this chapter, update quiz
        if (data.quizId) {
          await turso.execute({
            sql: 'UPDATE quizzes SET chapterId = ? WHERE id = ?',
            args: [id, data.quizId]
          });
        }

        return NextResponse.json({ success: true, id });
      }

      if (action === 'delete') {
        const { id } = data;
        if (!id) return NextResponse.json({ error: 'No chapter id' }, { status: 400 });
        await turso.batch([
          { sql: 'UPDATE quizzes SET chapterId = NULL WHERE chapterId = ?', args: [id] },
          { sql: 'DELETE FROM user_progression WHERE chapterId = ?', args: [id] },
          { sql: 'DELETE FROM chapters WHERE id = ?', args: [id] },
        ]);
        return NextResponse.json({ success: true });
      }
    }

    // ── SINGLE QUESTION ────────────────────────────────────
    if (type === 'question') {
      if (action === 'save') {
        const id = data.id || `q_${Date.now()}`;
        await turso.execute({
          sql: `INSERT INTO questions (id, quizId, courseId, subjectId, questionText, options, topic, microConcept, baseDifficulty, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET questionText=excluded.questionText, options=excluded.options, topic=excluded.topic`,
          args: [id, data.quizId, data.courseId || '', data.subjectId || '', data.questionText || '', JSON.stringify(data.options || []), data.topic || '', data.microConcept || '', data.baseDifficulty || 50, data.createdAt || new Date().toISOString()],
        });
        await turso.execute({
          sql: `INSERT INTO question_metadata (id, correctOptionIndex, explanationText) VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET correctOptionIndex=excluded.correctOptionIndex, explanationText=excluded.explanationText`,
          args: [id, data.correctOptionIndex ?? -1, data.explanationText || ''],
        });
        return NextResponse.json({ success: true, id });
      }
      if (action === 'delete') {
        await turso.batch([
          { sql: 'DELETE FROM question_metadata WHERE id = ?', args: [data.id] },
          { sql: 'DELETE FROM questions WHERE id = ?', args: [data.id] },
        ]);
        return NextResponse.json({ success: true });
      }
    }

    // ── BULK QUESTIONS ─────────────────────────────────────
    if (type === 'questions_bulk' && action === 'save') {
      const statements = [];
      for (const q of data.questions) {
        const id = q.id || `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        statements.push({
          sql: `INSERT INTO questions (id, quizId, courseId, subjectId, questionText, options, topic, microConcept, baseDifficulty, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET questionText=excluded.questionText, options=excluded.options`,
          args: [id, q.quizId, q.courseId || '', q.subjectId || '', q.questionText || '', JSON.stringify(q.options || []), q.topic || '', q.microConcept || '', q.baseDifficulty || 50, q.createdAt || new Date().toISOString()],
        });
        statements.push({
          sql: `INSERT INTO question_metadata (id, correctOptionIndex, explanationText) VALUES (?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET correctOptionIndex=excluded.correctOptionIndex, explanationText=excluded.explanationText`,
          args: [id, q.correctOptionIndex ?? -1, q.explanationText || ''],
        });
      }
      // Turso batch limit safety: chunk to 100 questions (200 statements) at a time
      const CHUNK = 200; 
      for (let i = 0; i < statements.length; i += CHUNK) {
        await turso.batch(statements.slice(i, i + CHUNK));
      }
      return NextResponse.json({ success: true, count: data.questions.length });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Content API] POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
