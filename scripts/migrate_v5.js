const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createClient } = require('@libsql/client');
require('dotenv').config();

// Initialize Firebase
const serviceAccount = require('../service-account.json');
if (!serviceAccount) throw new Error('service-account.json missing');

initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

// Initialize Turso
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  console.log('🚀 Starting Robust Migration v5 (Architecture Lockdown)...');

  try {
    // 1. Courses
    console.log('Migrating courses...');
    const coursesSnap = await db.collection('courses').get();
    for (const doc of coursesSnap.docs) {
      const data = doc.data();
      // discountedPrice vs salePrice handling
      const discountedPrice = Number(data.salePrice || data.discountedPrice || 0);
      const isDiscounted = (discountedPrice > 0 && discountedPrice < (data.basePrice || 0)) ? 1 : 0;

      await turso.execute({
        sql: `INSERT OR REPLACE INTO courses (
          id, title, description, category, status, basePrice, discountedPrice, 
          isDiscounted, isBundle, includedCourseIds, isPremium, attemptLimit, 
          questionLimit, durationMinutes, fullMarks, bannerUrl, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          doc.id,
          data.title || '',
          data.description || '',
          data.category || 'General',
          data.status || 'active',
          data.basePrice || 0,
          discountedPrice,
          isDiscounted,
          data.isBundle ? 1 : 0,
          data.includedCourseIds || '',
          data.isPremium !== false ? 1 : 0,
          data.attemptLimit || 2,
          data.questionLimit || 50,
          data.durationMinutes || 45,
          data.fullMarks || 100,
          data.bannerUrl || data.image || '',
          data.createdAt || new Date().toISOString()
        ]
      });
    }

    // 2. Subjects
    console.log('Migrating subjects...');
    const subjectsSnap = await db.collection('subjects').get();
    for (const doc of subjectsSnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO subjects (id, name, title, courseId, icon, active, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [
          doc.id,
          data.name || '',
          data.title || data.name || '',
          data.courseId || '',
          data.icon || '📚',
          data.active !== false ? 1 : 0,
          data.createdAt || new Date().toISOString()
        ]
      });
    }

    // 3. Quizzes
    console.log('Migrating quizzes...');
    const quizzesSnap = await db.collection('quizzes').get();
    for (const doc of quizzesSnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: `INSERT OR REPLACE INTO quizzes (
          id, courseId, subjectId, title, description, timeLimit, price, enabled, isFreeTrial, globalOrder, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          doc.id,
          data.courseId || '',
          data.subjectId || '',
          data.title || '',
          data.description || '',
          data.timeLimit || 0,
          data.price || 0,
          data.enabled !== false ? 1 : 0,
          data.isFreeTrial ? 1 : 0,
          data.globalOrder || 999,
          data.createdAt || new Date().toISOString()
        ]
      });
    }

    console.log('✅ Migration v5 completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrate();
