const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://mymocksewa-db-nodesandeep.aws-ap-south-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzc2OTIzNjksImlkIjoiMDE5ZGQzYTQtZGYwMS03MmFjLWE1M2ItYmY1Y2I2MmI5NTNkIiwicmlkIjoiMzk3ZmFhYjItOGYxNS00NDdiLWI2MzYtNDZjZTU1YmZkZjM1In0.-N8VRNd05hMBKRVc4jOLVMSnV-YPrS8JmLavdUwdYwBeFpTIuBXdD7-rIzA3UIB5-khaK3i4opgGjLelXUMjDg',
});

async function runPatch() {
  console.log('🚀 Starting Final V3 Schema Patch...');

  try {
    // 1. Add showTrial to courses
    console.log('--- Patching courses table ---');
    try {
      await client.execute("ALTER TABLE courses ADD COLUMN showTrial INTEGER DEFAULT 1");
      console.log('✅ Added showTrial to courses');
    } catch (e) {
      if (e.message.includes('duplicate column name')) console.log('ℹ️ showTrial already exists');
      else throw e;
    }

    // 2. Patch user_mastery table
    console.log('--- Patching user_mastery table ---');
    const masteryCols = [
      "ALTER TABLE user_mastery ADD COLUMN totalCorrect INTEGER DEFAULT 0",
      "ALTER TABLE user_mastery ADD COLUMN totalAttempted INTEGER DEFAULT 0",
      "ALTER TABLE user_mastery ADD COLUMN masteryLevel REAL DEFAULT 0.0",
      "ALTER TABLE user_mastery ADD COLUMN lastAttemptAt TEXT"
    ];

    for (const colSql of masteryCols) {
      try {
        await client.execute(colSql);
        console.log(`✅ Executed: ${colSql.split('ADD COLUMN ')[1]}`);
      } catch (e) {
        if (e.message.includes('duplicate column name')) continue;
        console.warn(`⚠️ Warning on ${colSql}: ${e.message}`);
      }
    }

    // 3. Ensure Indices
    console.log('--- Ensuring Indices ---');
    await client.execute("CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status)");
    await client.execute("CREATE INDEX IF NOT EXISTS idx_user_mastery_lookup ON user_mastery(userId, subjectId)");
    
    console.log('🎉 Schema Patch Completed Successfully!');
  } catch (err) {
    console.error('❌ Patch Failed:', err);
  } finally {
    process.exit();
  }
}

runPatch();
