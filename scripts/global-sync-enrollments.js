const admin = require('firebase-admin');
const { createClient } = require('@libsql/client');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = require('../service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Initialize Turso
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function syncAll() {
  console.log('🔄 Syncing Turso -> Firestore Enrollments...');
  
  try {
    const res = await turso.execute('SELECT userId, courseId FROM user_enrollments');
    const enrollments = res.rows;
    
    const userMap = {};
    enrollments.forEach(e => {
      if (!userMap[e.userId]) userMap[e.userId] = [];
      userMap[e.userId].push(e.courseId);
    });

    for (const [uid, courses] of Object.entries(userMap)) {
      console.log(`Syncing UID: ${uid} -> ${courses.length} courses`);
      await db.collection('users').doc(uid).set({
        enrolledCourses: admin.firestore.FieldValue.arrayUnion(...courses)
      }, { merge: true });
    }

    console.log('✅ Global Sync Complete!');
  } catch (err) {
    console.error('❌ Sync Error:', err);
  } finally {
    process.exit();
  }
}

syncAll();
