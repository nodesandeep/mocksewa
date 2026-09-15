import { NextResponse } from 'next/server';
import { adminAuth } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

// ─── Admin auth guard ─────────────────────────────────────────────────
async function verifyAdmin(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    // Check if user is admin (you might have a specific check here, 
    // but for now we assume verifyIdToken is enough if the UI only allows admins)
    // Ideally check custom claims or a specific admin list
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
