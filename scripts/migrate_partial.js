const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createClient } = require('@libsql/client');
require('dotenv').config();

const serviceAccount = require('../service-account.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  console.log('🚀 Starting Partial Migration (Non-Question Data)...');

  try {
    // Migrate Materials
    console.log('Migrating materials...');
    const materialsSnap = await db.collection('materials').get();
    for (const doc of materialsSnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO materials (id, courseId, title, url, type, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        args: [doc.id, data.courseId || '', data.title || '', data.url || '', data.type || '', data.createdAt || new Date().toISOString()]
      });
    }

    // Migrate Notifications
    console.log('Migrating notifications...');
    const notifySnap = await db.collection('notifications').get();
    for (const doc of notifySnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO notifications (id, title, message, type, createdAt) VALUES (?, ?, ?, ?, ?)',
        args: [doc.id, data.title || '', data.message || '', data.type || '', data.createdAt || new Date().toISOString()]
      });
    }

    // Migrate Enrollments
    console.log('Migrating enrollments...');
    const usersSnap = await db.collection('users').get();
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      if (userData.enrolledCourses && Array.isArray(userData.enrolledCourses)) {
        for (const courseId of userData.enrolledCourses) {
          await turso.execute({
            sql: 'INSERT OR REPLACE INTO user_enrollments (userId, courseId, grantedAt) VALUES (?, ?, ?)',
            args: [userDoc.id, courseId, new Date().toISOString()]
          });
        }
      }
    }

    console.log('✅ Partial Migration completed!');
  } catch (error) {
    console.error('❌ Partial Migration failed:', error);
  }
}

migrate();
