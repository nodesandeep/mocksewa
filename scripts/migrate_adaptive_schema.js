const admin = require('firebase-admin');

/**
 * MIGRATION SCRIPT: Knowledge Graph Upgrade
 * 
 * Task: Upgrade existing Firestore questions to support the Adaptive Learning Engine.
 * Fields Added:
 * - microConcept: Mapping questions to granular topics.
 * - baseDifficulty: Setting initial difficulty baseline (50).
 */

// If running in an environment with default credentials or service account env var
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function migrateQuestions() {
    console.log("🚀 Starting Migration: Knowledge Graph Upgrade...");
    
    const questionsRef = db.collection('questions');
    const snapshot = await questionsRef.get();
    
    if (snapshot.empty) {
        console.log("⚠️ No questions found to migrate.");
        return;
    }
    
    console.log(`🔍 Found ${snapshot.size} questions. Initializing batch operation...`);
    
    let batch = db.batch();
    let count = 0;
    let committedCount = 0;
    
    for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Define microConcept based on topic or subjectId
        const microConcept = data.topic || data.subjectId || "general";
        
        batch.update(doc.ref, {
            microConcept: microConcept,
            baseDifficulty: 50,
            schemaVersion: 2,
            lastMigrated: admin.firestore.FieldValue.serverTimestamp()
        });
        
        count++;
        
        // Firestore batches are limited to 500 operations
        if (count === 499) {
            await batch.commit();
            committedCount += count;
            console.log(`📦 Batch commit successful: ${committedCount} questions...`);
            batch = db.batch();
            count = 0;
        }
    }
    
    if (count > 0) {
        await batch.commit();
        committedCount += count;
    }
    
    console.log(`✅ SUCCESS: Migrated ${committedCount} questions to the Adaptive Engine schema.`);
}

migrateQuestions().catch(err => {
    console.error("❌ Migration Failed:", err);
    process.exit(1);
});
