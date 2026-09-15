const { createClient } = require('@libsql/client');
require('dotenv').config();

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function setup() {
  try {
    console.log("🚀 Setting up Mastery & Mistake tables...");

    // 1. User Mistakes Table
    // Tracks specific question performance
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS user_mistakes (
        userId TEXT,
        questionId TEXT,
        subjectId TEXT,
        incorrectCount INTEGER DEFAULT 1,
        lastIncorrectAt TEXT,
        isBookmarked INTEGER DEFAULT 0,
        PRIMARY KEY (userId, questionId)
      )
    `);

    // 2. User Mastery Table
    // Tracks aggregate performance per subject
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS user_mastery (
        userId TEXT,
        subjectId TEXT,
        totalCorrect INTEGER DEFAULT 0,
        totalAttempted INTEGER DEFAULT 0,
        masteryLevel REAL DEFAULT 0,
        lastAttemptAt TEXT,
        PRIMARY KEY (userId, subjectId)
      )
    `);

    console.log("✅ Mastery & Mistake tables ready!");
  } catch (e) {
    console.error("❌ Setup failed:", e);
  }
}

setup();
