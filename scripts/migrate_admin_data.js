const admin = require('firebase-admin');
const { createClient } = require('@libsql/client');
require('dotenv').config();

// 1. Initialize Firebase Admin
const serviceAccount = require('../service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// 2. Initialize Turso
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
  console.log("🚀 Starting Admin Data Migration (Attempts & Enrollments)...");

  try {
    // --- 1. Migrate Student Attempts ---
    console.log("Fetching studentAttempts from Firestore...");
    const attemptsSnap = await db.collection('studentAttempts').get();
    console.log(`📦 Found ${attemptsSnap.size} attempts.`);

    for (const doc of attemptsSnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: `INSERT OR REPLACE INTO student_attempts 
              (id, userId, quizId, courseId, score, totalQuestions, correctAnswers, timestamp, quizTitle, stats, answers, timeTakenSeconds, xpGain) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          doc.id,
          data.userId || '',
          data.quizId || '',
          data.courseId || '',
          data.finalScore || data.score || 0,
          data.totalQuestions || 0,
          data.correctAnswers || 0,
          data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toISOString() : data.timestamp) : new Date().toISOString(),
          data.setTitle || data.quizTitle || '',
          JSON.stringify(data.stats || {}),
          JSON.stringify(data.answers || []),
          data.timeTakenSeconds || 0,
          data.xpGain || 0
        ]
      });
    }
    console.log("✅ Student attempts migrated.");

    // --- 2. Migrate Enrollments from Users collection ---
    console.log("Deriving enrollments from users collection...");
    const usersSnap = await db.collection('users').get();
    let enrollmentCount = 0;

    for (const doc of usersSnap.docs) {
      const data = doc.data();
      if (data.enrolledCourses && Array.isArray(data.enrolledCourses)) {
        for (const courseId of data.enrolledCourses) {
          await turso.execute({
            sql: `INSERT OR REPLACE INTO user_enrollments (userId, courseId, grantedAt) VALUES (?, ?, ?)`,
            args: [doc.id, courseId, data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : new Date().toISOString()]
          });
          enrollmentCount++;
        }
      }
    }
    console.log(`✅ ${enrollmentCount} enrollments migrated.`);

    console.log("\n✨ Admin Migration Complete!");
  } catch (err) {
    console.error("❌ Migration Failed:", err);
  }
}

migrate();
