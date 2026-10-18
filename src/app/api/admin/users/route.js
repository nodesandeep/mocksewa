import { NextResponse } from 'next/server';
import turso from '@/utils/turso';
import { verifyAdminUser } from '@/utils/admin-guard';

export async function GET(request) {
  const authCheck = await verifyAdminUser(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');

  try {
    if (uid) {
      const res = await turso.execute({
        sql: 'SELECT status FROM user_profile_ext WHERE userId = ?',
        args: [uid]
      });
      return NextResponse.json(res.rows[0] || { status: 'active' });
    }
    
    // List all user statuses
    const res = await turso.execute('SELECT userId, status FROM user_profile_ext');
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authCheck = await verifyAdminUser(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { uid, status, action } = await request.json();

    if (action === 'updateStatus') {
      // 1. Update Turso
      await turso.execute({
        sql: `INSERT INTO user_profile_ext (userId, status) VALUES (?, ?)
              ON CONFLICT(userId) DO UPDATE SET status = excluded.status`,
        args: [uid, status]
      });

      // 2. Update Firebase Auth (Disable/Enable)
      if (status === 'blocked') {
        await adminAuth.updateUser(uid, { disabled: true });
      } else if (status === 'active') {
        await adminAuth.updateUser(uid, { disabled: false });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Admin Users API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
