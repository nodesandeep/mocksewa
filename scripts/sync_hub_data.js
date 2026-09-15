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

async function sync() {
  console.log("🚀 Starting Comprehensive Hub Sync...");

  try {
    // --- 1. Sync Courses ---
    console.log("📦 Syncing Courses...");
    const coursesSnap = await db.collection('courses').get();
    for (const doc of coursesSnap.docs) {
      const c = doc.data();
      await turso.execute({
        sql: `INSERT OR REPLACE INTO courses (id, title, description, category, status, basePrice, salePrice, bannerUrl, attemptLimit, questionLimit, durationMinutes) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            doc.id, 
            c.title || '', 
            c.description || '', 
            c.category || 'general', 
            c.status || 'active', 
            c.basePrice || 0, 
            c.salePrice || 0, 
            c.bannerUrl || '',
            c.attemptLimit || 2,
            c.questionLimit || 50,
            c.durationMinutes || 45
        ]
      });
    }
    console.log(`✅ Migrated ${coursesSnap.size} Courses`);

    // --- 2. Sync Subjects ---
    console.log("📦 Syncing Subjects...");
    const subjectsSnap = await db.collection('subjects').get();
    for (const doc of subjectsSnap.docs) {
      const s = doc.data();
      await turso.execute({
        sql: `INSERT OR REPLACE INTO subjects (id, name, title, courseId, icon, active) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
            doc.id, 
            s.name || '', 
            s.title || s.name || '',
            s.courseId || '', 
            s.icon || '📚', 
            s.active ? 1 : 0
        ]
      });
    }
    console.log(`✅ Migrated ${subjectsSnap.size} Subjects`);

    // --- 3. Sync Quizzes ---
    console.log("📦 Syncing Quizzes...");
    const quizzesSnap = await db.collection('quizzes').get();
    for (const doc of quizzesSnap.docs) {
      const q = doc.data();
      await turso.execute({
        sql: `INSERT OR REPLACE INTO quizzes (id, courseId, subjectId, title, description, timeLimit, price, enabled, isFreeTrial, globalOrder) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
            doc.id, 
            q.courseId || '', 
            q.subjectId || '', 
            q.title || '', 
            q.description || '', 
            q.timeLimit || 0, 
            q.price || 0,
            q.enabled !== false ? 1 : 0,
            q.isFreeTrial ? 1 : 0,
            q.globalOrder || 0
        ]
      });
    }
    console.log(`✅ Migrated ${quizzesSnap.size} Quizzes`);

    // --- 4. Sync Study Materials ---
    console.log("📦 Syncing Study Materials...");
    const materialsSnap = await db.collection('studyMaterials').get();
    for (const doc of materialsSnap.docs) {
      const m = doc.data();
      await turso.execute({
        sql: `INSERT OR REPLACE INTO study_materials (id, courseId, subjectId, title, url, type, createdAt) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
            doc.id, 
            m.courseId || '', 
            m.subjectId || '', 
            m.title || '', 
            m.url || m.fileUrl || '', 
            m.type || 'document',
            m.createdAt || new Date().toISOString()
        ]
      });
    }
    console.log(`✅ Migrated ${materialsSnap.size} Study Materials`);

    console.log("\n✨ Sync Complete! Hub is now fully decoupled from Firestore for metadata.");
  } catch (err) {
    console.error("❌ Sync Failed:", err);
  }
}

sync();
