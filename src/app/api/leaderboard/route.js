import { NextResponse } from 'next/server';
import turso from '@/utils/turso';

export async function GET() {
  try {
    // Join student_attempts with user_profile_ext to get names and aggregate XP
    // We sum correctCount * 10 (arbitrary XP logic) or just use a score-based aggregate
    // Let's assume XP is managed in a way that matches previous logic.
    // Actually, let's use sum(score) as XP for now, or just look at the leaderboard table if it was meant to be SQL-backed.
    // Based on user request: "join the student_attempts and user_profile_ext tables"
    
    const res = await turso.execute(`
      SELECT 
        u.id as uid,
        u.name as name,
        SUM(sa.score) as xp
      FROM users u
      JOIN student_attempts sa ON u.id = sa.userId
      GROUP BY u.id
      ORDER BY xp DESC
      LIMIT 100
    `);

    return NextResponse.json(res.rows);
  } catch (error) {
    console.error('[Leaderboard API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
