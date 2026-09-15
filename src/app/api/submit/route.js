import { NextResponse } from 'next/server';
import { adminAuth } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  let user;
  try {
    user = await adminAuth.verifyIdToken(token);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { quizId, answers, timeSpent } = await request.json();

  try {
    // 1. Fetch quiz and metadata
    const quizResult = await turso.execute({
      sql: 'SELECT q.*, s.name as subjectName FROM quizzes q JOIN subjects s ON q.subjectId = s.id WHERE q.id = ?',
      args: [quizId]
    });
    
    if (quizResult.rows.length === 0) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    const quiz = quizResult.rows[0];

    const questionsResult = await turso.execute({
      sql: 'SELECT q.id, m.correctOptionIndex FROM questions q JOIN question_metadata m ON q.id = m.id WHERE q.quizId = ?',
      args: [quizId]
    });

    const correctAnswersMap = questionsResult.rows.reduce((acc, row) => {
      acc[row.id] = row.correctOptionIndex;
      return acc;
    }, {});

    // 2. Fetch questions in order (assuming order matters or IDs are mapped)
    const fullQuestions = await turso.execute({
        sql: 'SELECT id FROM questions WHERE quizId = ? ORDER BY createdAt ASC, id ASC',
        args: [quizId]
    });

    let correct = 0, wrong = 0, skipped = 0;
    const submissionAnswers = []; // For detailed analytics

    fullQuestions.rows.forEach((row, idx) => {
        const selected = answers[idx];
        const correctIdx = correctAnswersMap[row.id];
        const isCorrect = selected !== undefined && selected === correctIdx;

        if (selected === undefined) skipped++;
        else if (isCorrect) correct++;
        else wrong++;

        submissionAnswers.push({
          questionId: row.id,
          subjectId: quiz.subjectId,
          selected,
          isCorrect
        });
    });

    const totalQuestions = fullQuestions.rows.length;
    const finalScore = correct - (wrong * 0.25);
    const timestamp = new Date().toISOString();

    // 3. Save attempt
    const attemptId = `att_${Date.now()}`;
    await turso.execute({
      sql: `INSERT INTO student_attempts (
        id, userId, quizId, quizTitle, courseId, score, finalScore, 
        totalQuestions, timeTakenSeconds, stats, answers, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        attemptId, user.uid, quizId, quiz.title, quiz.courseId, 
        correct, finalScore, totalQuestions, timeSpent, 
        JSON.stringify({ correct, wrong, skipped }), 
        JSON.stringify(submissionAnswers), 
        timestamp
      ]
    });

    // 4. Real-time Analytics Update (Mastery)
    await turso.execute({
      sql: `INSERT INTO user_mastery (userId, subjectId, totalCorrect, totalAttempted, masteryLevel, lastAttemptAt, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(userId, subjectId) DO UPDATE SET
            totalCorrect = totalCorrect + ?, 
            totalAttempted = totalAttempted + ?, 
            masteryLevel = ((totalCorrect + ?) * 100.0 / (totalAttempted + ?)),
            lastAttemptAt = ?,
            last_updated = ?`,
      args: [
        user.uid, quiz.subjectId, correct, totalQuestions, (correct/totalQuestions)*100, timestamp, timestamp,
        correct, totalQuestions, correct, totalQuestions, timestamp, timestamp
      ]
    });

    // 5. Update Mistakes (In batch for efficiency)
    const mistakeStatements = submissionAnswers
      .filter(a => !a.isCorrect && a.selected !== undefined)
      .map(m => ({
        sql: `INSERT INTO user_mistakes (userId, questionId, subjectId, incorrectCount, lastIncorrectAt)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(userId, questionId) DO UPDATE SET
              incorrectCount = incorrectCount + 1,
              lastIncorrectAt = ?`,
        args: [user.uid, m.questionId, m.subjectId, 1, timestamp, timestamp]
      }));
    
    if (mistakeStatements.length > 0) {
      try {
        await turso.batch(mistakeStatements);
      } catch (mistakeErr) {
        console.error("Mistakes batch insert error:", mistakeErr);
      }
    }

    // 6. If this is a Chapter Practice Quiz, evaluate passing threshold & unlock progression
    let chapterUnlocked = false;
    if (quiz.chapterId) {
      try {
        const chapRes = await turso.execute({
          sql: 'SELECT passingThreshold, courseId, sequenceOrder FROM chapters WHERE id = ?',
          args: [quiz.chapterId]
        });

        if (chapRes.rows.length > 0) {
          const chap = chapRes.rows[0];
          const scorePercent = (correct / totalQuestions) * 100;
          const isPassed = scorePercent >= (chap.passingThreshold || 60);

          await turso.execute({
            sql: `INSERT INTO user_progression (
                    userId, chapterId, courseId, status, highestScore, lastAttemptScore, attemptsCount, completedAt
                  ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
                  ON CONFLICT(userId, chapterId) DO UPDATE SET
                    attemptsCount = attemptsCount + 1,
                    lastAttemptScore = ?,
                    highestScore = MAX(highestScore, ?),
                    status = CASE 
                      WHEN ? = 1 THEN 'PASSED' 
                      ELSE status 
                    END,
                    completedAt = CASE 
                      WHEN ? = 1 AND completedAt IS NULL THEN ? 
                      ELSE completedAt 
                    END`,
            args: [
              user.uid, quiz.chapterId, chap.courseId, 
              isPassed ? 'PASSED' : 'TEST_UNLOCKED',
              scorePercent, scorePercent, isPassed ? timestamp : null,
              scorePercent, scorePercent, isPassed ? 1 : 0, isPassed ? 1 : 0, timestamp
            ]
          });

          chapterUnlocked = isPassed;
        }
      } catch (progErr) {
        console.error("Progression unlock check error:", progErr);
      }
    }

    return NextResponse.json({
      success: true,
      finalScore,
      stats: { correct, wrong, skipped },
      attemptId,
      chapterUnlocked
    });

  } catch (error) {
    console.error('Submission Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
