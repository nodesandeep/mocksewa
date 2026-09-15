require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function setup() {
  console.log("🛠️ Setting up Analytics Tables...");
  
  try {
    // 1. User Mastery Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_mastery (
        userId TEXT NOT NULL,
        subjectId TEXT NOT NULL,
        totalCorrect INTEGER DEFAULT 0,
        totalAttempted INTEGER DEFAULT 0,
        masteryLevel REAL DEFAULT 0,
        lastAttemptAt TEXT,
        last_updated TEXT,
        PRIMARY KEY (userId, subjectId)
      )
    `);
    console.log("✅ Table 'user_mastery' ready.");

    // 2. User Mistakes Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_mistakes (
        userId TEXT NOT NULL,
        questionId TEXT NOT NULL,
        subjectId TEXT,
        incorrectCount INTEGER DEFAULT 0,
        lastIncorrectAt TEXT,
        isBookmarked INTEGER DEFAULT 0,
        PRIMARY KEY (userId, questionId)
      )
    `);
    console.log("✅ Table 'user_mistakes' ready.");

    // 3. User Enrollments Table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_enrollments (
        userId TEXT NOT NULL,
        courseId TEXT NOT NULL,
        enrolledAt TEXT,
        status TEXT DEFAULT 'active',
        PRIMARY KEY (userId, courseId)
      )
    `);
    console.log("✅ Table 'user_enrollments' ready.");

    // 4. Student Attempts Table (if not exists)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS student_attempts (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        quizId TEXT,
        quizTitle TEXT,
        courseId TEXT,
        score REAL,
        finalScore REAL,
        totalQuestions INTEGER,
        stats TEXT,
        answers TEXT,
        timeTakenSeconds INTEGER,
        xpGain INTEGER,
        timestamp TEXT
      )
    `);
    console.log("✅ Table 'student_attempts' ready.");

  } catch (error) {
    console.error("❌ Setup Failed:", error.message);
  }
  process.exit(0);
}

setup();
