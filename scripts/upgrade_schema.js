const { createClient } = require('@libsql/client');
require('dotenv').config();

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function upgrade() {
  try {
    console.log("🚀 Upgrading Turso Schema...");

    // 1. Recreate courses table
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
        bannerUrl TEXT
      )
    `);

    // 2. Create subjects table
    console.log("Creating 'subjects' table...");
    await turso.execute("DROP TABLE IF EXISTS subjects");
    await turso.execute(`
      CREATE TABLE subjects (
        id TEXT PRIMARY KEY,
        name TEXT,
        courseId TEXT,
        icon TEXT,
        description TEXT,
        active INTEGER
      )
    `);

    console.log("✅ Schema upgrade complete!");
  } catch (e) {
    console.error("❌ Schema upgrade failed:", e);
  }
}

upgrade();
