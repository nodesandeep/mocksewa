require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function setup() {
  console.log("🛠️ Setting up Payments Table...");
  
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        userName TEXT,
        courseId TEXT NOT NULL,
        courseTitle TEXT,
        screenshotUrl TEXT,
        transactionId TEXT,
        status TEXT DEFAULT 'pending',
        amount REAL,
        createdAt TEXT,
        verifiedAt TEXT
      )
    `);
    console.log("✅ Table 'payments' ready.");

    // Also ensure user_enrollments exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_enrollments (
        userId TEXT NOT NULL,
        courseId TEXT NOT NULL,
        grantedAt TEXT,
        PRIMARY KEY (userId, courseId)
      )
    `);
    console.log("✅ Table 'user_enrollments' ready.");

  } catch (error) {
    console.error("❌ Setup Failed:", error.message);
  }
  process.exit(0);
}

setup();
