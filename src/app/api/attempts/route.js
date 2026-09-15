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

  const body = await request.json();
  const { quizId, courseId, answers, stats, finalScore } = body;

  try {
    const attemptId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await turso.execute({
      sql: `INSERT INTO student_attempts (
        id, userId, quizId, score, totalQuestions, correctAnswers, wrongAnswers, skippedQuestions, timeTaken, completedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        attemptId,
        user.uid,
        quizId,
        finalScore,
        stats.correct + stats.wrong + stats.skipped,
        stats.correct,
        stats.wrong,
        stats.skipped,
        body.timeTaken || 0,
        new Date().toISOString()
      ]
    });

    return NextResponse.json({ success: true, attemptId });
  } catch (error) {
    console.error('Save Attempt Error:', error);
    return NextResponse.json({ error: 'Database Error' }, { status: 500 });
  }
}
