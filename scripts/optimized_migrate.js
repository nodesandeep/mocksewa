const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createClient } = require('@libsql/client');
require('dotenv').config();

// Initialize Firebase
const serviceAccount = require('../service-account.json');
if (require('firebase-admin/app').getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}
const db = getFirestore();

// Initialize Turso
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  console.log('🚀 Starting optimized migration to Turso...');

  try {
    // 1. Migrate Questions (The main issue)
    console.log('Migrating questions...');
    const questionsSnap = await db.collection('questions').get();
    console.log(`📦 Found ${questionsSnap.size} questions in Firestore.`);
    
    for (const doc of questionsSnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO questions (id, quizId, courseId, subjectId, setTitle, questionText, options, topic, microConcept, baseDifficulty, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          doc.id, 
          data.quizId || '', 
          data.courseId || '', 
          data.subjectId || '', 
          data.setTitle || '', 
          data.questionText || '', 
          JSON.stringify(data.options || []), 
          data.topic || '', 
          data.microConcept || '', 
          data.baseDifficulty || 0, 
          data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : new Date().toISOString()
        ]
      });
    }
    console.log('✅ Questions migrated.');

    // 2. Migrate Question Metadata
    console.log('Migrating question metadata...');
    const metaSnap = await db.collection('questionMetadata').get();
    console.log(`📦 Found ${metaSnap.size} metadata entries in Firestore.`);
    
    for (const doc of metaSnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO question_metadata (id, correctOptionIndex, explanationText) VALUES (?, ?, ?)',
        args: [doc.id, data.correctOptionIndex ?? -1, data.explanationText || '']
      });
    }
    console.log('✅ Metadata migrated.');

    // 3. Migrate Quizzes
    console.log('Migrating quizzes...');
    const quizzesSnap = await db.collection('quizzes').get();
    for (const doc of quizzesSnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO quizzes (id, courseId, subjectId, title, description, timeLimit, price, enabled, isFreeTrial, globalOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          doc.id, 
          data.courseId || '', 
          data.subjectId || '', 
          data.title || '', 
          data.description || '', 
          data.timeLimit || 0, 
          data.price || 0, 
          data.enabled ? 1 : 0, 
          data.isFreeTrial ? 1 : 0, 
          data.globalOrder || 0
        ]
      });
    }
    console.log('✅ Quizzes migrated.');

    console.log('✨ Optimized migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrate();
