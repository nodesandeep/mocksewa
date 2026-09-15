import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/utils/firebase-admin';
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

const ONLINE_THRESHOLD_MINS = 5;
const PAGE_SIZE = 20;

/**
 * GET /api/admin/leads
 * Multi-filter paginated lead list with online status, course enrollment, and search.
 * 
 * Query params:
 *   status=online|offline|all
 *   courseId=X
 *   search=name_or_email
 *   page=1
 *   uid=X  (single user fingerprint — returns deep profile)
 */
export async function GET(request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';
  const courseId = searchParams.get('courseId') || '';
  const search = searchParams.get('search') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const uid = searchParams.get('uid') || '';

  // ─── SINGLE USER PERFORMANCE FINGERPRINT ───────────────────────────
  if (uid) {
    return getPerformanceFingerprint(uid);
  }

  // ─── PAGINATED LEAD LIST ─────────────────────────────────────────────
  try {
    const onlineThreshold = new Date(Date.now() - ONLINE_THRESHOLD_MINS * 60 * 1000).toISOString();
    const offset = (page - 1) * PAGE_SIZE;

    const args = [];
    const wheres = [];

    if (status === 'online') {
      wheres.push(`p.last_active_at >= ?`);
      args.push(onlineThreshold);
    } else if (status === 'offline') {
      wheres.push(`(p.last_active_at IS NULL OR p.last_active_at < ?)`);
      args.push(onlineThreshold);
    }

    if (search) {
      wheres.push(`(p.displayName LIKE ? OR u.userId LIKE ?)`); // Fallback to UID search if no display name
      args.push(`%${search}%`, `%${search}%`);
    }

    // Base query: inclusive join of all known UIDs
    let sql = `
      SELECT
        u.userId,
        p.displayName,
        p.countryCode,
        p.phone,
        p.whatsappOptedIn,
        p.last_active_at,
        p.session_start_at,
        p.total_session_mins,
        p.joinedAt,
        CASE WHEN p.last_active_at >= ? THEN 1 ELSE 0 END as isOnline,
        COUNT(DISTINCT sa.id) as totalAttempts,
        MAX(sa.timestamp) as lastAttemptAt,
        AVG(sa.score) as avgScore,
        GROUP_CONCAT(DISTINCT ue.courseId) as enrolledCourseIds
      FROM (
        SELECT userId FROM user_profile_ext
        UNION
        SELECT userId FROM user_enrollments
        UNION
        SELECT userId FROM student_attempts
      ) u
      LEFT JOIN user_profile_ext p ON u.userId = p.userId
      LEFT JOIN student_attempts sa ON sa.userId = u.userId
      LEFT JOIN user_enrollments ue ON ue.userId = u.userId
    `;
    
    // Add isOnline threshold to args for the SELECT clause
    args.unshift(onlineThreshold);

    const whereClauses = [...wheres];
    if (courseId) {
      whereClauses.push(`ue.courseId = ?`);
      args.push(courseId);
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')} `;
    }

    sql += `
      GROUP BY u.userId
      ORDER BY p.last_active_at DESC NULLS LAST
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `;

    const leadsRes = await turso.execute({ sql, args });

    // Count total for pagination
    let countSql = `
      SELECT COUNT(DISTINCT u.userId) as total 
      FROM (
        SELECT userId FROM user_profile_ext
        UNION
        SELECT userId FROM user_enrollments
        UNION
        SELECT userId FROM student_attempts
      ) u
      LEFT JOIN user_profile_ext p ON u.userId = p.userId
      LEFT JOIN user_enrollments ue ON ue.userId = u.userId
    `;
    if (whereClauses.length > 0) {
      countSql += ` WHERE ${whereClauses.join(' AND ')} `;
    }
    
    const countArgs = [...args.slice(1)]; // Skip the threshold used in SELECT
    const countRes = await turso.execute({ sql: countSql, args: countArgs });
    const total = Number(countRes.rows[0]?.total) || 0;

    // Also get Firebase user list for emails (cached, minimal reads)
    // We only fetch emails for the current page (max 20 users)
    let emailMap = {};
    try {
      if (leadsRes.rows.length > 0) {
        const uids = leadsRes.rows.map(r => r.userId).filter(Boolean);
        const fbUsers = await adminAuth.getUsers(uids.map(u => ({ uid: u })));
        fbUsers.users.forEach(u => {
          emailMap[u.uid] = { email: u.email, photoURL: u.photoURL, displayName: u.displayName };
        });
      }
    } catch (e) {
      console.warn('[Leads API] Firebase user lookup failed:', e.message);
    }

    const leads = leadsRes.rows.map(row => ({
      ...row,
      email: emailMap[row.userId]?.email || '',
      photoURL: emailMap[row.userId]?.photoURL || '',
      fbDisplayName: emailMap[row.userId]?.displayName || '',
      displayName: row.displayName || emailMap[row.userId]?.displayName || '',
      isOnline: row.isOnline === 1,
      enrolledCourseIds: row.enrolledCourseIds ? row.enrolledCourseIds.split(',') : [],
      totalAttempts: Number(row.totalAttempts) || 0,
      avgScore: row.avgScore ? Math.round(Number(row.avgScore) * 10) / 10 : null,
      totalSessionMins: Number(row.total_session_mins) || 0,
    }));

    return NextResponse.json({
      leads,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (error) {
    console.error('[Leads API] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── PERFORMANCE FINGERPRINT ─────────────────────────────────────────────
async function getPerformanceFingerprint(uid) {
  try {
    const [attemptsRes, topicRes, enrollRes, profileRes] = await Promise.all([
      // Full attempt history
      turso.execute({
        sql: `
          SELECT
            sa.id, sa.quizId, sa.score, sa.totalQ, sa.correctCount, sa.wrongCount,
            sa.skippedCount, sa.timeTaken, sa.timestamp, sa.courseId,
            q.title as quizTitle,
            c.title as courseTitle
          FROM student_attempts sa
          LEFT JOIN quizzes q ON sa.quizId = q.id
          LEFT JOIN courses c ON sa.courseId = c.id
          WHERE sa.userId = ?
          ORDER BY sa.timestamp DESC
          LIMIT 100
        `,
        args: [uid],
      }),

      // Topic-wise accuracy (Performance Matrix)
      turso.execute({
        sql: `
          SELECT
            qs.topic,
            COUNT(DISTINCT qs.id) as totalQuestions,
            AVG(CASE WHEN sa.correctCount > 0 THEN 
              CAST(sa.correctCount AS REAL) / NULLIF(sa.totalQ, 0) 
            ELSE 0 END) as avgAccuracy,
            COUNT(DISTINCT sa.id) as timesAttempted
          FROM student_attempts sa
          JOIN quizzes qz ON sa.quizId = qz.id
          JOIN questions qs ON qs.quizId = qz.id
          WHERE sa.userId = ?
          GROUP BY qs.topic
          HAVING qs.topic != ''
          ORDER BY avgAccuracy ASC
        `,
        args: [uid],
      }),

      // Enrolled courses
      turso.execute({
        sql: `
          SELECT ue.courseId, c.title as courseTitle, ue.grantedAt
          FROM user_enrollments ue
          LEFT JOIN courses c ON ue.courseId = c.id
          WHERE ue.userId = ?
        `,
        args: [uid],
      }),

      // Profile
      turso.execute({
        sql: 'SELECT * FROM user_profile_ext WHERE userId = ?',
        args: [uid],
      }),
    ]);

    const topicMastery = topicRes.rows.map(row => ({
      topic: row.topic,
      totalQuestions: Number(row.totalQuestions) || 0,
      accuracy: Math.round((Number(row.avgAccuracy) || 0) * 100),
      timesAttempted: Number(row.timesAttempted) || 0,
      isWeak: (Number(row.avgAccuracy) || 0) * 100 < 40,
    }));

    const weakAreas = topicMastery.filter(t => t.isWeak && t.timesAttempted > 0);
    const strongAreas = topicMastery.filter(t => !t.isWeak && t.timesAttempted > 0);

    // Get email from Firebase (1 read for admin)
    let email = '';
    let photoURL = '';
    try {
      const fbUser = await adminAuth.getUser(uid);
      email = fbUser.email || '';
      photoURL = fbUser.photoURL || '';
    } catch {}

    const profile = profileRes.rows[0] || {};
    const onlineThreshold = new Date(Date.now() - ONLINE_THRESHOLD_MINS * 60 * 1000).toISOString();
    const isOnline = profile.last_active_at ? profile.last_active_at >= onlineThreshold : false;

    return NextResponse.json({
      profile: {
        userId: uid,
        email,
        photoURL,
        displayName: profile.displayName || '',
        countryCode: profile.countryCode || '+977',
        phone: profile.phone || '',
        whatsappOptedIn: profile.whatsappOptedIn === 1,
        last_active_at: profile.last_active_at || null,
        total_session_mins: Number(profile.total_session_mins) || 0,
        joinedAt: profile.joinedAt || null,
        isOnline,
      },
      attempts: attemptsRes.rows.map(a => ({
        ...a,
        score: Number(a.score) || 0,
        accuracy: a.totalQ > 0 ? Math.round((Number(a.correctCount) / Number(a.totalQ)) * 100) : 0,
      })),
      topicMastery,
      weakAreas,
      strongAreas,
      enrolledCourses: enrollRes.rows,
      stats: {
        totalAttempts: attemptsRes.rows.length,
        avgScore: attemptsRes.rows.length > 0
          ? Math.round(attemptsRes.rows.reduce((s, a) => s + Number(a.score), 0) / attemptsRes.rows.length * 10) / 10
          : 0,
        weakTopicCount: weakAreas.length,
        strongTopicCount: strongAreas.length,
      },
    });
  } catch (error) {
    console.error('[Leads API] Fingerprint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
