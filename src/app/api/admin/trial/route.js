import { NextResponse } from 'next/server';
import { adminAuth } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

async function verifyAdmin(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/trial
 * Returns all trial course mappings with stats
 */
export async function GET(request) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await turso.execute(`
      SELECT
        tc.id,
        tc.parentCourseId,
        tc.trialQuizId,
        tc.createdAt,
        c.title as courseTitle,
        c.basePrice,
        q.title as trialSetTitle,
        (SELECT COUNT(*) FROM quizzes WHERE courseId = c.id) as totalSets
      FROM trial_courses tc
      JOIN courses c ON tc.parentCourseId = c.id
      JOIN quizzes q ON tc.trialQuizId = q.id
      ORDER BY tc.createdAt DESC
    `);
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error('[Trial API] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/trial
 * body: { action: 'sync', courseId } — Re-scans quizzes for isFreeTrial=1 and upserts trial_courses
 * body: { action: 'set', courseId, quizId } — Manually designate a trial set
 * body: { action: 'remove', courseId } — Remove trial mapping for a course
 */
export async function POST(request) {
  const user = await verifyAdmin(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { action, courseId, quizId } = await request.json();

    if (action === 'sync') {
      if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 });

      // Find the isFreeTrial=1 quiz for this course (lowest globalOrder)
      const freeRes = await turso.execute({
        sql: `SELECT id FROM quizzes WHERE courseId = ? AND isFreeTrial = 1 ORDER BY globalOrder ASC, createdAt ASC LIMIT 1`,
        args: [courseId],
      });

      if (freeRes.rows.length === 0) {
        // No free trial quiz — use the first quiz as trial
        const firstRes = await turso.execute({
          sql: `SELECT id FROM quizzes WHERE courseId = ? ORDER BY globalOrder ASC, createdAt ASC LIMIT 1`,
          args: [courseId],
        });
        if (firstRes.rows.length === 0) {
          return NextResponse.json({ error: 'No quizzes found for this course' }, { status: 404 });
        }
        const firstQuizId = firstRes.rows[0].id;
        // Mark it as free trial
        await turso.execute({ sql: 'UPDATE quizzes SET isFreeTrial = 1 WHERE id = ?', args: [firstQuizId] });
        await turso.execute({
          sql: `INSERT INTO trial_courses (id, parentCourseId, trialQuizId) VALUES (?, ?, ?)
                ON CONFLICT(parentCourseId) DO UPDATE SET trialQuizId=excluded.trialQuizId, createdAt=datetime('now')`,
          args: [`trial_${courseId}`, courseId, firstQuizId],
        });
        return NextResponse.json({ success: true, trialQuizId: firstQuizId, autoAssigned: true });
      }

      const trialQuizId = freeRes.rows[0].id;
      await turso.execute({
        sql: `INSERT INTO trial_courses (id, parentCourseId, trialQuizId) VALUES (?, ?, ?)
              ON CONFLICT(parentCourseId) DO UPDATE SET trialQuizId=excluded.trialQuizId, createdAt=datetime('now')`,
        args: [`trial_${courseId}`, courseId, trialQuizId],
      });
      return NextResponse.json({ success: true, trialQuizId });
    }

    if (action === 'set') {
      if (!courseId || !quizId) return NextResponse.json({ error: 'courseId and quizId required' }, { status: 400 });
      // Clear old trial flag
      await turso.execute({ sql: 'UPDATE quizzes SET isFreeTrial = 0 WHERE courseId = ?', args: [courseId] });
      // Set new trial flag
      await turso.execute({ sql: 'UPDATE quizzes SET isFreeTrial = 1 WHERE id = ?', args: [quizId] });
      // Upsert trial_courses
      await turso.execute({
        sql: `INSERT INTO trial_courses (id, parentCourseId, trialQuizId) VALUES (?, ?, ?)
              ON CONFLICT(parentCourseId) DO UPDATE SET trialQuizId=excluded.trialQuizId`,
        args: [`trial_${courseId}`, courseId, quizId],
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'remove') {
      if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 });
      await turso.execute({ sql: 'DELETE FROM trial_courses WHERE parentCourseId = ?', args: [courseId] });
      await turso.execute({ sql: 'UPDATE quizzes SET isFreeTrial = 0 WHERE courseId = ?', args: [courseId] });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Trial API] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
