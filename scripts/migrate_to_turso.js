const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createClient } = require('@libsql/client');
require('dotenv').config();

// Initialize Firebase
const serviceAccount = require('../service-account.json');
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

// Initialize Turso
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || 'YOUR_TURSO_URL',
  authToken: process.env.TURSO_AUTH_TOKEN || 'YOUR_TURSO_TOKEN',
});

async function migrate() {
  console.log('🚀 Starting migration to Turso...');

  try {
    // 1. Create Tables
    console.log('Creating tables...');
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        price REAL,
        image TEXT
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        courseId TEXT,
        title TEXT,
        description TEXT,
        timeLimit INTEGER,
        price REAL
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        quizId TEXT,
        courseId TEXT,
        subjectId TEXT,
        setTitle TEXT,
        questionText TEXT,
        options TEXT,
        topic TEXT,
        microConcept TEXT,
        baseDifficulty INTEGER,
        createdAt TEXT
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS question_metadata (
        id TEXT PRIMARY KEY,
        correctOptionIndex INTEGER,
        explanationText TEXT
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS user_enrollments (
        userId TEXT,
        courseId TEXT,
        grantedAt TEXT,
        PRIMARY KEY (userId, courseId)
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS student_attempts (
        id TEXT PRIMARY KEY,
        userId TEXT,
        quizId TEXT,
        courseId TEXT,
        score REAL,
        totalQuestions INTEGER,
        correctAnswers INTEGER,
        wrongAnswers INTEGER,
        skippedQuestions INTEGER,
        timeTaken INTEGER,
        timestamp TEXT
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        courseId TEXT,
        title TEXT,
        url TEXT,
        type TEXT,
        createdAt TEXT
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT,
        message TEXT,
        type TEXT,
        createdAt TEXT
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        userId TEXT,
        questionId TEXT,
        issue TEXT,
        status TEXT,
        createdAt TEXT
      )
    `);

    // 2. Migrate Courses (Skipping already done logic for brevity, but script will handle INSERT OR REPLACE)
    console.log('Migrating courses...');
    // ... (Keep existing course migration)


    // 2. Migrate Courses
    console.log('Migrating courses...');
    const coursesSnap = await db.collection('courses').get();
    for (const doc of coursesSnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO courses (id, title, description, price, image) VALUES (?, ?, ?, ?, ?)',
        args: [doc.id, data.title || '', data.description || '', data.price || 0, data.image || '']
      });
    }

    // 3. Migrate Quizzes
    console.log('Migrating quizzes...');
    const quizzesSnap = await db.collection('quizzes').get();
    for (const doc of quizzesSnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO quizzes (id, courseId, title, description, timeLimit, price) VALUES (?, ?, ?, ?, ?, ?)',
        args: [doc.id, data.courseId || '', data.title || '', data.description || '', data.timeLimit || 0, data.price || 0]
      });
    }

    // 4. Migrate Questions (Batched)
    console.log('Migrating questions...');
    const questionsSnap = await db.collection('questions').get();
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
          data.createdAt || new Date().toISOString()
        ]
      });
    }

    // 5. Migrate Question Metadata
    console.log('Migrating question metadata...');
    const metaSnap = await db.collection('questionMetadata').get();
    for (const doc of metaSnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO question_metadata (id, correctOptionIndex, explanationText) VALUES (?, ?, ?)',
        args: [doc.id, data.correctOptionIndex ?? -1, data.explanationText || '']
      });
    }

    // 6. Migrate User Enrollments
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

    // 7. Migrate Student Attempts
    console.log('Migrating student attempts...');
    const attemptsSnap = await db.collection('studentAttempts').get();
    for (const doc of attemptsSnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO student_attempts (id, userId, quizId, courseId, score, totalQuestions, correctAnswers, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          doc.id,
          data.userId || '',
          data.quizId || '',
          data.courseId || '',
          data.score || 0,
          data.totalQuestions || 0,
          data.correctAnswers || 0,
          data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toISOString() : data.timestamp) : new Date().toISOString()
        ]
      });
    }

    // 8. Migrate Materials
    console.log('Migrating materials...');
    const materialsSnap = await db.collection('materials').get();
    for (const doc of materialsSnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO materials (id, courseId, title, url, type, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        args: [doc.id, data.courseId || '', data.title || '', data.url || '', data.type || '', data.createdAt || new Date().toISOString()]
      });
    }

    // 9. Migrate Notifications
    console.log('Migrating notifications...');
    const notifySnap = await db.collection('notifications').get();
    for (const doc of notifySnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO notifications (id, title, message, type, createdAt) VALUES (?, ?, ?, ?, ?)',
        args: [doc.id, data.title || '', data.message || '', data.type || '', data.createdAt || new Date().toISOString()]
      });
    }

    // 10. Migrate Reports
    console.log('Migrating reports...');
    const reportsSnap = await db.collection('reports').get();
    for (const doc of reportsSnap.docs) {
      const data = doc.data();
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO reports (id, userId, questionId, issue, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        args: [doc.id, data.userId || '', data.questionId || '', data.issue || '', data.status || '', data.createdAt || new Date().toISOString()]
      });
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrate();
