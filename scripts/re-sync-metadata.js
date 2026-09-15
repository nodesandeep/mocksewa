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

async function fixMetadata() {
  console.log("🚀 Starting Metadata Repair...");
  
  try {
    // 1. Identify missing metadata in Turso
    const qResult = await turso.execute("SELECT q.id FROM questions q LEFT JOIN question_metadata m ON q.id = m.id WHERE m.id IS NULL");
    const missingIds = qResult.rows.map(r => r.id);
    
    if (missingIds.length === 0) {
      console.log("✅ No missing metadata found in Turso.");
      return;
    }
    
    console.log(`🔍 Found ${missingIds.length} questions missing metadata in Turso. Fetching from Firestore...`);
    
    const batch = [];
    const chunkSize = 10; // Firestore 'in' query limit or safe chunk
    
    for (let i = 0; i < missingIds.length; i += chunkSize) {
      const chunk = missingIds.slice(i, i + chunkSize);
      
      // Try questionMetadata collection first
      const metaSnap = await db.collection('questionMetadata').where('id', 'in', chunk).get();
      const foundIds = new Set();
      
      metaSnap.docs.forEach(doc => {
        const data = doc.data();
        foundIds.add(doc.id);
        batch.push({
          sql: "INSERT OR REPLACE INTO question_metadata (id, correctOptionIndex, explanationText) VALUES (?, ?, ?)",
          args: [doc.id, data.correctOptionIndex, data.explanationText || data.explanation || data.rationale || '']
        });
      });
      
      // For IDs not found, try the legacy 'questions' collection (pre-split)
      const remainingIds = chunk.filter(id => !foundIds.has(id));
      if (remainingIds.length > 0) {
        const legacySnap = await db.collection('questions').where(admin.firestore.FieldPath.documentId(), 'in', remainingIds).get();
        legacySnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.correctOptionIndex !== undefined || data.correctAns !== undefined) {
            batch.push({
              sql: "INSERT OR REPLACE INTO question_metadata (id, correctOptionIndex, explanationText) VALUES (?, ?, ?)",
              args: [doc.id, data.correctOptionIndex ?? data.correctAns ?? data.CorrectAns ?? 0, data.explanationText || data.explanation || data.Rationale || data.rationale || '']
            });
          }
        });
      }
      
      process.stdout.write(`.`);
    }
    
    console.log(`\n📦 Prepared ${batch.length} records for Turso. Uploading...`);
    
    const tursoChunkSize = 50;
    for (let i = 0; i < batch.length; i += tursoChunkSize) {
      const chunk = batch.slice(i, i + tursoChunkSize);
      await turso.batch(chunk);
      console.log(`✅ Uploaded chunk ${i/tursoChunkSize + 1}/${Math.ceil(batch.length/tursoChunkSize)}`);
    }
    
    console.log("🎊 Metadata Repair Complete!");
    
  } catch (error) {
    console.error("❌ Repair Failed:", error.message);
  }
  process.exit(0);
}

fixMetadata();
