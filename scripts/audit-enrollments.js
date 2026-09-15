const { adminDb } = require('../src/utils/firebase-admin');
const turso = require('../src/utils/turso').default;

async function auditEnrollments() {
  console.log('🚀 Starting Enrollment Audit...');

  try {
    // 1. Get all Turso enrollments
    const tursoEnrollments = await turso.execute('SELECT userId, courseId FROM user_enrollments');
    const tursoMap = {};
    tursoEnrollments.rows.forEach(row => {
      if (!tursoMap[row.userId]) tursoMap[row.userId] = [];
      tursoMap[row.userId].push(row.courseId);
    });

    // 2. Get all Firestore users
    const usersSnap = await adminDb.collection('users').get();
    let discrepancies = 0;

    for (const doc of usersSnap.docs) {
      const userData = doc.data();
      const uid = doc.id;
      const firestoreCourses = userData.enrolledCourses || [];
      const tursoCourses = tursoMap[uid] || [];

      const missingInFirestore = tursoCourses.filter(cid => !firestoreCourses.includes(cid));
      const missingInTurso = firestoreCourses.filter(cid => !tursoCourses.includes(cid));

      if (missingInFirestore.length > 0 || missingInTurso.length > 0) {
        discrepancies++;
        console.log(`\n⚠️ Discrepancy for User: ${userData.email || uid}`);
        if (missingInFirestore.length > 0) console.log(`   Missing in Firestore: ${missingInFirestore.join(', ')}`);
        if (missingInTurso.length > 0) console.log(`   Missing in Turso: ${missingInTurso.join(', ')}`);
      }
    }

    console.log(`\n✅ Audit Complete. Found ${discrepancies} users with discrepancies.`);
  } catch (error) {
    console.error('❌ Audit Failed:', error);
  }
}

auditEnrollments();
