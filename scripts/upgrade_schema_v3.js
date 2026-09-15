const { createClient } = require('@libsql/client');
require('dotenv').config();

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function upgrade() {
  try {
    console.log("🚀 Upgrading Turso Schema V3 (Final Architecture)...");

    // 1. Courses Table
    console.log("Recreating 'courses' table with full fields...");
    await turso.execute("DROP TABLE IF EXISTS courses");
    await turso.execute(`
      CREATE TABLE courses (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        category TEXT,
        status TEXT DEFAULT 'active',
        basePrice REAL DEFAULT 0,
        discountedPrice REAL DEFAULT 0,
        isDiscounted INTEGER DEFAULT 0,
        isBundle INTEGER DEFAULT 0,
        includedCourseIds TEXT,
        isPremium INTEGER DEFAULT 1,
        attemptLimit INTEGER DEFAULT 2,
        questionLimit INTEGER DEFAULT 50,
        durationMinutes INTEGER DEFAULT 45,
        fullMarks REAL DEFAULT 100,
        bannerUrl TEXT,
        createdAt TEXT
      )
    `);

    // 2. Subjects Table
    console.log("Recreating 'subjects' table...");
    await turso.execute("DROP TABLE IF EXISTS subjects");
    await turso.execute(`
      CREATE TABLE subjects (
        id TEXT PRIMARY KEY,
        name TEXT,
        title TEXT,
        courseId TEXT,
        icon TEXT,
        active INTEGER DEFAULT 1,
        createdAt TEXT
      )
    `);

    // 3. Quizzes Table
    console.log("Recreating 'quizzes' table...");
    await turso.execute("DROP TABLE IF EXISTS quizzes");
    await turso.execute(`
      CREATE TABLE quizzes (
        id TEXT PRIMARY KEY,
        courseId TEXT,
        subjectId TEXT,
        title TEXT,
        description TEXT,
        timeLimit INTEGER,
        price REAL DEFAULT 0,
        enabled INTEGER DEFAULT 1,
        isFreeTrial INTEGER DEFAULT 0,
        globalOrder INTEGER DEFAULT 999,
        createdAt TEXT
      )
    `);

    // 4. Questions & Metadata
    console.log("Ensuring 'questions' and 'question_metadata' tables exist...");
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        quizId TEXT,
        courseId TEXT,
        subjectId TEXT,
        questionText TEXT,
        options TEXT,
        topic TEXT,
        microConcept TEXT,
        baseDifficulty REAL,
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

    // 5. Analytics & Mastery
    console.log("Ensuring analytics tables exist...");
    await turso.execute("DROP TABLE IF EXISTS student_attempts");
    await turso.execute(`
      CREATE TABLE student_attempts (
        id TEXT PRIMARY KEY,
        userId TEXT,
        quizId TEXT,
        quizTitle TEXT,
        courseId TEXT,
        score REAL,
        finalScore REAL,
        totalQuestions INTEGER,
        timeTakenSeconds INTEGER,
        stats TEXT,
        answers TEXT,
        timestamp TEXT
      )
    `);

    await turso.execute("DROP TABLE IF EXISTS user_mastery");
    await turso.execute(`
      CREATE TABLE user_mastery (
        userId TEXT,
        subjectId TEXT,
        totalCorrect INTEGER DEFAULT 0,
        totalAttempted INTEGER DEFAULT 0,
        masteryLevel REAL DEFAULT 0,
        lastAttemptAt TEXT,
        last_updated TEXT,
        PRIMARY KEY (userId, subjectId)
      )
    `);

    await turso.execute("DROP TABLE IF EXISTS user_mistakes");
    await turso.execute(`
      CREATE TABLE user_mistakes (
        userId TEXT,
        questionId TEXT,
        subjectId TEXT,
        incorrectCount INTEGER DEFAULT 0,
        lastIncorrectAt TEXT,
        PRIMARY KEY (userId, questionId)
      )
    `);

    console.log("✅ Schema upgrade V3 complete!");
  } catch (e) {
    console.error("❌ Schema upgrade failed:", e);
  }
}

upgrade();
