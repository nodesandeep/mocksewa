import { NextResponse } from 'next/server';
import { adminAuth } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

/**
 * POST /api/profile/update
 * Upserts user_profile_ext with phone, country code, display name.
 * Zero Firebase writes — all stored in Turso.
 */
export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      displayName = '',
      countryCode = '+977',
      phone = '',
      whatsappOptedIn = true,
    } = body;

    // Validate phone — strip non-numeric except leading +
    const cleanPhone = phone.replace(/[^\d]/g, '').slice(0, 15);

    await turso.execute({
      sql: `INSERT INTO user_profile_ext (userId, displayName, countryCode, phone, whatsappOptedIn, joinedAt)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(userId) DO UPDATE SET
              displayName = CASE WHEN excluded.displayName != '' THEN excluded.displayName ELSE displayName END,
              countryCode = excluded.countryCode,
              phone = excluded.phone,
              whatsappOptedIn = excluded.whatsappOptedIn`,
      args: [uid, displayName, countryCode, cleanPhone, whatsappOptedIn ? 1 : 0],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/profile/update
 * Returns the current user's profile_ext data
 */
export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let uid;
  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const res = await turso.execute({
      sql: 'SELECT * FROM user_profile_ext WHERE userId = ?',
      args: [uid],
    });
    return NextResponse.json(res.rows[0] || null);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
