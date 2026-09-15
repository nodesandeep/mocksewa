const { createClient } = require('@libsql/client');
require('dotenv').config();

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function upgrade() {
  try {
    console.log("🚀 Upgrading Turso Schema V2...");

    // 1. Courses Table
    console.log("Recreating 'courses' table...");
    await turso.execute("DROP TABLE IF EXISTS courses");
    await turso.execute(`
      CREATE TABLE courses (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        category TEXT,
        status TEXT,
        basePrice REAL,
        salePrice REAL,
        bannerUrl TEXT,
        attemptLimit INTEGER,
        questionLimit INTEGER,
        durationMinutes INTEGER
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
        active INTEGER
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
        price REAL,
        enabled INTEGER,
        isFreeTrial INTEGER,
        globalOrder INTEGER
      )
    `);

    // 4. Study Materials Table
    console.log("Creating 'study_materials' table...");
    await turso.execute("DROP TABLE IF EXISTS study_materials");
    await turso.execute(`
      CREATE TABLE study_materials (
        id TEXT PRIMARY KEY,
        courseId TEXT,
        subjectId TEXT,
        title TEXT,
        url TEXT,
        type TEXT,
        createdAt TEXT
      )
    `);

    console.log("✅ Schema upgrade V2 complete!");
  } catch (e) {
    console.error("❌ Schema upgrade failed:", e);
  }
}

upgrade();
