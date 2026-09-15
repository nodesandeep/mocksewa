const admin = require('firebase-admin');
const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

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
  console.log("🚀 Starting Data Migration to Turso...");

  try {
    // --- 1. Migrate Courses ---
    const coursesSnap = await db.collection('courses').get();
    console.log(`📦 Found ${coursesSnap.size} courses in Firestore.`);
    
    for (const doc of coursesSnap.docs) {
      const c = doc.data();
      await turso.execute({
        sql: `INSERT OR REPLACE INTO courses (id, title, description, category, status, basePrice, salePrice, bannerUrl) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [doc.id, c.title, c.description || '', c.category || 'general', c.status || 'active', c.basePrice || 0, c.salePrice || 0, c.bannerUrl || '']
      });
      console.log(`✅ Migrated Course: ${c.title}`);
    }

    // --- 2. Migrate Subjects ---
    const subjectsSnap = await db.collection('subjects').get();
    console.log(`📦 Found ${subjectsSnap.size} subjects in Firestore.`);
    
    for (const doc of subjectsSnap.docs) {
      const s = doc.data();
      await turso.execute({
        sql: `INSERT OR REPLACE INTO subjects (id, name, courseId, icon, description, active) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [doc.id, s.name, s.courseId, s.icon || '📚', s.description || '', s.active ? 1 : 0]
      });
      console.log(`✅ Migrated Subject: ${s.name}`);
    }

    console.log("\n✨ Migration Complete! Refresh your Student Hub.");
  } catch (err) {
    console.error("❌ Migration Failed:", err);
  }
}

migrate();
