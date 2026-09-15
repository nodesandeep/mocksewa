require('dotenv').config();
const admin = require('firebase-admin');
const { createClient } = require('@libsql/client');

if (!admin.apps.length) {
  const serviceAccount = require('../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function verifyRationales() {
  console.log("🔍 Verifying Question Metadata Integrity...");
  try {
    const qResult = await turso.execute("SELECT id, quizId, questionText FROM questions");
    const mResult = await turso.execute("SELECT id, explanationText FROM question_metadata");

    const metaMap = new Map(mResult.rows.map(r => [r.id, r.explanationText]));
    const missing = [];
    const emptyRationale = [];

    qResult.rows.forEach(q => {
      if (!metaMap.has(q.id)) {
        missing.push(q);
      } else if (!metaMap.get(q.id) || metaMap.get(q.id).trim() === '') {
        emptyRationale.push(q);
      }
    });

    if (missing.length > 0 || emptyRationale.length > 0) {
      console.warn(`⚠️ Data Integrity Issue Detected!`);
      console.warn(`- ${missing.length} questions missing metadata records.`);
      console.warn(`- ${emptyRationale.length} questions have empty rationales.`);

      const affectedQuizzes = {};
      [...missing, ...emptyRationale].forEach(q => {
        affectedQuizzes[q.quizId] = (affectedQuizzes[q.quizId] || 0) + 1;
      });

      console.log("📊 Affected Quiz Sets:");
      console.table(Object.entries(affectedQuizzes).map(([id, count]) => ({ quizId: id, missingCount: count })));
      
      return false;
    }
    
    console.log("✅ All questions have complete metadata and rationales.");
    return true;
  } catch (e) {
    console.error("❌ Integrity Check Failed:", e.message);
    return false;
  }
}

async function sync() {
  console.log("🚀 Starting Analytics Sync v4...");
  
  // Run Integrity Check First
  const isHealthy = await verifyRationales();
  if (!isHealthy) {
    console.log("🛑 Sync Proceeding with warnings. Please fix data integrity issues.");
  }

  try {
    const snapshot = await db.collection('studentAttempts').get();
    console.log(`📊 Found ${snapshot.size} attempts in Firestore.`);

    const masteryAgg = {}; // userId_subjectId -> { correct, total, lastAt }
    const mistakesAgg = {}; // userId_questionId -> { subjectId, count, lastAt }

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const userId = data.userId;
      
      let timestamp;
      if (data.timestamp && typeof data.timestamp.toDate === 'function') {
        timestamp = data.timestamp.toDate().toISOString();
      } else if (data.timestamp) {
        timestamp = new Date(data.timestamp).toISOString();
      } else {
        timestamp = new Date().toISOString();
      }
      
      // 1. Mastery Aggregation
      const subjectId = data.subjectId || data.quizTitle?.split('-')[0].trim() || 'General';
      const key = `${userId}_${subjectId}`;
      
      if (!masteryAgg[key]) {
        masteryAgg[key] = { userId, subjectId, correct: 0, total: 0, lastAt: timestamp };
      }
      masteryAgg[key].correct += (data.stats?.correct || 0);
      masteryAgg[key].total += (data.totalQuestions || 0);
      if (timestamp > masteryAgg[key].lastAt) masteryAgg[key].lastAt = timestamp;

      // 2. Mistakes Aggregation
      if (data.answers && Array.isArray(data.answers)) {
        data.answers.forEach(ans => {
          if (ans && ans.isCorrect === false) {
            const mKey = `${userId}_${ans.questionId}`;
            if (!mistakesAgg[mKey]) {
              mistakesAgg[mKey] = { userId, questionId: ans.questionId, subjectId: ans.subjectId || subjectId, count: 0, lastAt: timestamp };
            }
            mistakesAgg[mKey].count += 1;
            if (timestamp > mistakesAgg[mKey].lastAt) mistakesAgg[mKey].lastAt = timestamp;
          }
        });
      }
    });

    console.log(`📈 Aggregated ${Object.keys(masteryAgg).length} mastery records and ${Object.keys(mistakesAgg).length} unique mistakes.`);

    // 3. Batch Upload to Turso
    const batch = [];
    
    // Mastery
    for (const key in masteryAgg) {
      const m = masteryAgg[key];
      const level = (m.correct / (m.total || 1)) * 100;
      batch.push({
        sql: `INSERT INTO user_mastery (userId, subjectId, totalCorrect, totalAttempted, masteryLevel, lastAttemptAt, last_updated)
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(userId, subjectId) DO UPDATE SET
              totalCorrect = ?, totalAttempted = ?, masteryLevel = ?, lastAttemptAt = ?, last_updated = ?`,
        args: [m.userId, m.subjectId, m.correct, m.total, level, m.lastAt, m.lastAt, m.correct, m.total, level, m.lastAt, m.lastAt]
      });
    }

    // Mistakes
    for (const key in mistakesAgg) {
      const m = mistakesAgg[key];
      batch.push({
        sql: `INSERT INTO user_mistakes (userId, questionId, subjectId, incorrectCount, lastIncorrectAt)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(userId, questionId) DO UPDATE SET
              incorrectCount = ?, lastIncorrectAt = ?`,
        args: [m.userId, m.questionId, m.subjectId, m.count, m.lastAt, m.count, m.lastAt]
      });
    }

    // Process in chunks of 50 to avoid Turso limits
    const chunkSize = 50;
    for (let i = 0; i < batch.length; i += chunkSize) {
      const chunk = batch.slice(i, i + chunkSize);
      await turso.batch(chunk);
      console.log(`✅ Synced chunk ${i/chunkSize + 1}/${Math.ceil(batch.length/chunkSize)}`);
    }

    console.log("🎊 Analytics Migration Complete!");

  } catch (error) {
    console.error("❌ Sync Failed:", error.message);
  }
  process.exit(0);
}

sync();
