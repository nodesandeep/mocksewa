import { NextResponse } from 'next/server';
import { adminAuth } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const user = await adminAuth.verifyIdToken(token);
    
    // Safety check: Blocked status
    const statusCheck = await turso.execute({
      sql: 'SELECT status FROM user_profile_ext WHERE userId = ?',
      args: [user.uid]
    });
    if (statusCheck.rows.length > 0 && statusCheck.rows[0].status === 'blocked') {
      return NextResponse.json({ error: 'ACCOUNT_BLOCKED' }, { status: 403 });
    }
    const { 
      quizId, 
      quizTitle, 
      courseId,
      score,
      finalScore, 
      totalQuestions, 
      stats, 
      answers, 
      timeTakenSeconds,
      xpGain
    } = await request.json();

    // 0. Check Attempt Limit
    if (courseId && user.uid) {
      const courseRes = await turso.execute({
        sql: 'SELECT attemptLimit FROM courses WHERE id = ?',
        args: [courseId]
      });
      
      // If course doesn't exist or has no limit, we default to 1 as per user request
      const limitVal = (courseRes.rows.length > 0 && courseRes.rows[0].attemptLimit !== null) 
        ? courseRes.rows[0].attemptLimit 
        : 1; 

      const attemptRes = await turso.execute({
        sql: 'SELECT COUNT(*) as count FROM student_attempts WHERE userId = ? AND quizId = ?',
        args: [user.uid, quizId]
      });
      const currentAttempts = Number(attemptRes.rows[0]?.count || 0);

      if (currentAttempts >= limitVal) {
        return NextResponse.json({ 
          error: 'LIMIT_EXCEEDED', 
          message: 'You have reached the maximum attempt limit for this set. Please review your mistakes instead.'
        }, { status: 403 });
      }
    }

    // 1. Save Student Attempt in Turso
    const attemptId = `att_${Date.now()}_${user.uid}`;
    const timestamp = new Date().toISOString();

    await turso.execute({
      sql: `INSERT INTO student_attempts 
            (id, userId, quizId, quizTitle, courseId, score, finalScore, totalQuestions, totalQ, stats, answers, timeTakenSeconds, timeTaken, xpGain, correctCount, wrongCount, skippedCount, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        attemptId, 
        user.uid, 
        quizId, 
        quizTitle || "Untitled Quiz", 
        courseId || null,
        score || 0,
        finalScore || 0, 
        totalQuestions || 0,
        totalQuestions || 0, // totalQ
        JSON.stringify(stats || {}), 
        JSON.stringify(answers || []), 
        timeTakenSeconds || 0, 
        timeTakenSeconds || 0, // timeTaken
        xpGain || 0,
        stats?.correct || 0,
        stats?.wrong || 0,
        stats?.skipped || 0,
        timestamp
      ]
    });

    // 2. Update Mastery & Mistakes (SQL-First Batch)
    const batch = [];

    // Track mistakes
    if (answers && Array.isArray(answers)) {
      for (const ans of answers) {
        if (!ans.isCorrect) {
          batch.push({
            sql: `INSERT INTO user_mistakes (userId, questionId, subjectId, lastIncorrectAt, incorrectCount) 
                  VALUES (?, ?, ?, ?, 1)
                  ON CONFLICT(userId, questionId) DO UPDATE SET 
                  incorrectCount = incorrectCount + 1,
                  lastIncorrectAt = ?`,
            args: [user.uid, ans.questionId, ans.subjectId || '', timestamp, timestamp]
          });
        }
      }
    }

    // Update Subject Mastery
    // We update totalAttempted and totalCorrect to calculate mastery level
    const safeAnswers = Array.isArray(answers) ? answers : [];
    const correctCount = safeAnswers.filter(a => a && a.isCorrect).length;
    const totalCount = safeAnswers.length;
    
    // Note: We'll update for the specific quiz's subject if available
    const subjectId = safeAnswers[0]?.subjectId || 'general';
    
    batch.push({
      sql: `INSERT INTO user_mastery (userId, subjectId, topic, totalCorrect, totalAttempted, masteryLevel, lastAttemptAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(userId, subjectId, topic) DO UPDATE SET
            totalCorrect = user_mastery.totalCorrect + excluded.totalCorrect,
            totalAttempted = user_mastery.totalAttempted + excluded.totalAttempted,
            masteryLevel = ((CAST(user_mastery.totalCorrect + excluded.totalCorrect AS REAL) / (user_mastery.totalAttempted + excluded.totalAttempted)) * 100),
            lastAttemptAt = excluded.lastAttemptAt,
            updatedAt = excluded.updatedAt`,
      args: [
        user.uid, 
        subjectId, 
        'general',
        correctCount, 
        totalCount, 
        (totalCount > 0 ? (correctCount / totalCount) * 100 : 0), 
        timestamp,
        timestamp
      ]
    });

    await turso.batch(batch);
    
    return NextResponse.json({ success: true, attemptId, xpGain });

  } catch (error) {
    console.error('Attempt Submission Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      message: error.message,
      code: error.code
    }, { status: 500 });
  }
}
