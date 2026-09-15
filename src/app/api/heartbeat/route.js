import { NextResponse } from 'next/server';
import { adminAuth } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

const SESSION_TIMEOUT_MINS = 30; // gap longer than this = new session

/**
 * POST /api/heartbeat
 * Called every 90 seconds by StudentHub.
 * Updates last_active_at and accumulates session duration.
 * Zero Firebase reads/writes.
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
    const now = new Date();
    const nowISO = now.toISOString();

    // Get existing profile row
    const existing = await turso.execute({
      sql: 'SELECT last_active_at, session_start_at, total_session_mins FROM user_profile_ext WHERE userId = ?',
      args: [uid],
    });

    if (existing.rows.length === 0) {
      // First heartbeat — create profile row
      await turso.execute({
        sql: `INSERT INTO user_profile_ext (userId, last_active_at, session_start_at, total_session_mins, joinedAt)
              VALUES (?, ?, ?, 0, ?)
              ON CONFLICT(userId) DO UPDATE SET
                last_active_at = excluded.last_active_at,
                session_start_at = COALESCE(session_start_at, excluded.session_start_at)`,
        args: [uid, nowISO, nowISO, nowISO],
      });
    } else {
      const row = existing.rows[0];
      const lastActiveAt = row.last_active_at ? new Date(row.last_active_at) : null;
      const sessionStartAt = row.session_start_at ? new Date(row.session_start_at) : null;
      let totalMins = Number(row.total_session_mins) || 0;

      if (lastActiveAt) {
        const gapMins = (now - lastActiveAt) / 60000;

        if (gapMins > SESSION_TIMEOUT_MINS) {
          // Session ended — accumulate closed session duration
          if (sessionStartAt) {
            const closedSessionMins = Math.round((lastActiveAt - sessionStartAt) / 60000);
            if (closedSessionMins > 0) totalMins += closedSessionMins;
          }
          // Start new session
          await turso.execute({
            sql: `UPDATE user_profile_ext
                  SET last_active_at = ?, session_start_at = ?, total_session_mins = ?
                  WHERE userId = ?`,
            args: [nowISO, nowISO, totalMins, uid],
          });
        } else {
          // Active session — just update last_active_at
          await turso.execute({
            sql: `UPDATE user_profile_ext SET last_active_at = ? WHERE userId = ?`,
            args: [nowISO, uid],
          });
        }
      } else {
        // No previous last_active — init session
        await turso.execute({
          sql: `UPDATE user_profile_ext SET last_active_at = ?, session_start_at = COALESCE(session_start_at, ?) WHERE userId = ?`,
          args: [nowISO, nowISO, uid],
        });
      }
    }

    return NextResponse.json({ ok: true, ts: nowISO });
  } catch (error) {
    console.error('[Heartbeat API] Error:', error);
    // Return 200 anyway — don't break student UX over analytics
    return NextResponse.json({ ok: false, error: error.message });
  }
}
