import { NextResponse } from 'next/server';
import turso from '@/utils/turso';
import { verifyAdminUser } from '@/utils/admin-guard';

export async function GET(request) {
  const authCheck = await verifyAdminUser(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    
    // Aggregate XP from student_attempts by userId
    // Note: Since we don't have a 'users' table with names yet, 
    // we'll return the UIDs. The frontend will need to handle this 
    // or we can join with a temporary logic.
    // For now, let's just get the leaderboard based on student_attempts.
    
    const query = `
      SELECT 
        sa.userId, 
        SUM(sa.xpGain) as totalXp,
        COUNT(sa.id) as totalAttempts,
        MAX(sa.timestamp) as lastActivity,
        up.displayName
      FROM student_attempts sa
      LEFT JOIN user_profile_ext up ON sa.userId = up.userId
      GROUP BY sa.userId
      ORDER BY totalXp DESC
      LIMIT 100
    `;
    
    const res = await turso.execute(query);
    
    return NextResponse.json({
      leaders: res.rows.map(row => ({
        uid: row.userId,
        xp: row.totalXp,
        attempts: row.totalAttempts,
        lastActive: row.lastActivity,
        name: row.displayName || `Student ${row.userId.substring(0, 5)}...`
      }))
    });

  } catch (error) {
    console.error('Leaderboard API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
