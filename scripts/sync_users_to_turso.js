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

async function syncUsers() {
  console.log('🚀 Syncing Users to Turso...');

  try {
    // 1. Create Users Table if not exists
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        fbDisplayName TEXT,
        photoUrl TEXT,
        role TEXT DEFAULT 'student',
        enrolledCourses TEXT DEFAULT '[]',
        createdAt TEXT
      )
    `);
    console.log('✅ Users table ensured.');

    // 2. Fetch Users from Firestore
    console.log('Fetching users from Firestore...');
    const usersSnap = await db.collection('users').get();
    console.log(`Found ${usersSnap.docs.length} users.`);

    // 3. Batch Sync
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: `INSERT OR REPLACE INTO users (
          id, name, email, fbDisplayName, photoUrl, role, enrolledCourses, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          doc.id,
          data.name || data.displayName || 'Anonymous',
          data.email || '',
          data.fbDisplayName || data.displayName || '',
          data.photoUrl || data.photoURL || '',
          data.role || 'student',
          JSON.stringify(data.enrolledCourses || []),
          data.createdAt || new Date().toISOString()
        ]
      });
    }

    console.log(`✅ Successfully synced ${usersSnap.docs.length} users to Turso.`);
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

syncUsers();
