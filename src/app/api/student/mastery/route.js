import { NextResponse } from 'next/server';
import { adminAuth } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const user = await adminAuth.verifyIdToken(token);
    
    // Fetch mastery joined with subject titles
    const result = await turso.execute({
      sql: `
        SELECT 
          m.subjectId,
          m.totalCorrect,
          m.totalAttempted,
          m.masteryLevel,
          m.lastAttemptAt,
          s.title as subjectTitle
        FROM user_mastery m
        LEFT JOIN subjects s ON m.subjectId = s.id
        WHERE m.userId = ?
        ORDER BY m.masteryLevel DESC
      `,
      args: [user.uid]
    });

    const mastery = result.rows.map(row => ({
      subjectId: row.subjectId,
      subjectTitle: row.subjectTitle || row.subjectId,
      totalCorrect: row.totalCorrect,
      totalAttempted: row.totalAttempted,
      masteryLevel: row.masteryLevel,
      lastAttemptAt: row.lastAttemptAt
    }));

    return NextResponse.json({ mastery });

  } catch (error) {
    console.error('Mastery Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
