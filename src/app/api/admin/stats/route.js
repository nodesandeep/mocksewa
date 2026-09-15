import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    // 1. Authenticate
    await adminAuth.verifyIdToken(token);
    
    // 2. Fetch Base Data from Turso (Courses & Enrollments)
    const [enrollmentsRes, coursesRes, attemptsRes] = await Promise.all([
      turso.execute('SELECT userId, courseId, grantedAt FROM user_enrollments'),
      turso.execute('SELECT id, title, basePrice, discountedPrice FROM courses'),
      turso.execute('SELECT userId, MAX(timestamp) as lastActive, COUNT(id) as totalAttempts FROM student_attempts GROUP BY userId')
    ]);

    // 3. Process Revenue
    const coursePriceMap = {};
    const courseTitleMap = {};
    coursesRes.rows.forEach(c => {
      coursePriceMap[c.id] = c.discountedPrice || c.basePrice || 0;
      courseTitleMap[c.id] = c.title;
    });

    let totalRevenue = 0;
    const activeUids = new Set();
    const performanceMap = {};

    enrollmentsRes.rows.forEach(e => {
      const price = coursePriceMap[e.courseId] || 0;
      totalRevenue += price;
      activeUids.add(e.userId);

      if (!performanceMap[e.courseId]) {
        performanceMap[e.courseId] = {
          title: courseTitleMap[e.courseId] || 'Unknown Course',
          count: 0,
          revenue: 0
        };
      }
      performanceMap[e.courseId].count++;
      performanceMap[e.courseId].revenue += price;
    });

    // 4. Fetch Pending Payments (Still Firestore for now)
    let pendingPayments = 0;
    try {
      const pendingSnap = await adminDb.collection('paymentVerifications')
        .where('status', '==', 'pending')
        .get();
      pendingPayments = pendingSnap.size;
    } catch (e) {
      console.warn('Firestore pendingPayments fail:', e.message);
    }

    // 5. Fetch New Leads (Still Firestore for now)
    let newLeads = 0;
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const leadsSnap = await adminDb.collection('users')
        .where('createdAt', '>', oneDayAgo)
        .get();
      newLeads = leadsSnap.size;
    } catch (e) {
      console.warn('Firestore newLeads fail:', e.message);
    }

    return NextResponse.json({
      revenue: totalRevenue,
      activeStudents: activeUids.size,
      pendingPayments: pendingPayments,
      newLeads: newLeads,
      coursePerformance: Object.values(performanceMap).sort((a, b) => b.revenue - a.revenue),
      // We send a summary of activity for the user manager
      userActivity: attemptsRes.rows.map(row => ({
        uid: row.userId,
        lastActive: row.lastActive,
        totalAttempts: row.totalAttempts
      }))
    });

  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
