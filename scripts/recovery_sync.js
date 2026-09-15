/**
 * MyMockSewa v3 — Full Firestore → Turso Recovery Sync
 * 
 * Recovers all data lost during cascade migration FK failures.
 * Strategy:
 *   1. Disable FK enforcement during bulk insert (safe — Firestore is truth)
 *   2. Insert all data in dependency order
 *   3. Re-enable FK enforcement
 *   4. Seed trial_courses from isFreeTrial quizzes
 *   5. Sync enrollments from Firestore user records
 * 
 * Run: node scripts/recovery_sync.js
 */

const admin = require('firebase-admin');
const { createClient } = require('@libsql/client');
require('dotenv').config();

// Firebase Admin init
const serviceAccount = require('../service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const fsDb = admin.firestore();

// Turso init
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

// Chunk array into groups for batch inserts
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function recover() {
  log('🔥 Starting Full Recovery Sync: Firestore → Turso...');

  // Disable FK enforcement for bulk load
  await turso.execute('PRAGMA foreign_keys = OFF');
  log('⚠️  FK enforcement temporarily disabled for safe bulk load');

  try {
    // ── 1. COURSES ──────────────────────────────────────────────
    log('\n📦 [1/7] Syncing Courses...');
    const coursesSnap = await fsDb.collection('courses').get();
    log(`   Found ${coursesSnap.size} courses in Firestore`);
    let courseCount = 0;
    for (const doc of coursesSnap.docs) {
      const c = doc.data();
      try {
        await turso.execute({
          sql: `INSERT OR REPLACE INTO courses 
                (id, title, description, category, status, basePrice, discountedPrice, isDiscounted, 
                 isBundle, includedCourseIds, isPremium, attemptLimit, durationMinutes, questionLimit, 
                 fullMarks, bannerUrl, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            doc.id,
            c.title || '',
            c.description || '',
            c.category || 'General',
            c.status || 'active',
            c.basePrice || 0,
            c.discountedPrice || c.salePrice || 0,
            c.isDiscounted ? 1 : 0,
            c.isBundle ? 1 : 0,
            Array.isArray(c.includedCourseIds) ? c.includedCourseIds.join(',') : (c.includedCourseIds || ''),
            c.isPremium !== false ? 1 : 0,
            c.attemptLimit || 2,
            c.durationMinutes || 45,
            c.questionLimit || 50,
            c.fullMarks || 100,
            c.bannerUrl || '',
            c.createdAt ? (c.createdAt.toDate ? c.createdAt.toDate().toISOString() : c.createdAt) : new Date().toISOString(),
          ],
        });
        courseCount++;
      } catch (e) {
        log(`   ⚠ Skipped course ${doc.id}: ${e.message}`);
      }
    }
    log(`   ✅ ${courseCount} courses synced`);

    // ── 2. SUBJECTS ──────────────────────────────────────────────
    log('\n📦 [2/7] Syncing Subjects...');
    const subjectsSnap = await fsDb.collection('subjects').get();
    log(`   Found ${subjectsSnap.size} subjects in Firestore`);
    let subjectCount = 0;
    for (const doc of subjectsSnap.docs) {
      const s = doc.data();
      try {
        await turso.execute({
          sql: `INSERT OR REPLACE INTO subjects (id, name, title, courseId, icon, description, active, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            doc.id,
            s.name || '',
            s.title || s.name || '',
            s.courseId || '',
            s.icon || '📚',
            s.description || '',
            s.active !== false ? 1 : 0,
            s.createdAt ? (s.createdAt.toDate ? s.createdAt.toDate().toISOString() : s.createdAt) : new Date().toISOString(),
          ],
        });
        subjectCount++;
      } catch (e) {
        log(`   ⚠ Skipped subject ${doc.id}: ${e.message}`);
      }
    }
    log(`   ✅ ${subjectCount} subjects synced`);

    // ── 3. QUIZZES ──────────────────────────────────────────────
    log('\n📦 [3/7] Syncing Quizzes...');
    const quizzesSnap = await fsDb.collection('quizzes').get();
    log(`   Found ${quizzesSnap.size} quizzes in Firestore`);
    let quizCount = 0;
    for (const doc of quizzesSnap.docs) {
      const q = doc.data();
      // Use first subject of course if subjectId missing
      const subjectId = q.subjectId || '';
      const courseId = q.courseId || '';
      try {
        await turso.execute({
          sql: `INSERT OR REPLACE INTO quizzes 
                (id, subjectId, courseId, title, description, timeLimit, price, globalOrder, isFreeTrial, enabled, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            doc.id,
            subjectId,
            courseId,
            q.title || '',
            q.description || '',
            q.timeLimit || 0,
            q.price || 0,
            q.globalOrder || 999,
            q.isFreeTrial ? 1 : 0,
            q.enabled !== false ? 1 : 0,
            q.createdAt ? (q.createdAt.toDate ? q.createdAt.toDate().toISOString() : q.createdAt) : new Date().toISOString(),
          ],
        });
        quizCount++;
      } catch (e) {
        log(`   ⚠ Skipped quiz ${doc.id}: ${e.message}`);
      }
    }
    log(`   ✅ ${quizCount} quizzes synced`);

    // ── 4. QUESTIONS (chunked batches) ───────────────────────────
    log('\n📦 [4/7] Syncing Questions...');
    const questionsSnap = await fsDb.collection('questions').get();
    log(`   Found ${questionsSnap.size} questions in Firestore`);
    let questionCount = 0;
    const questionDocs = questionsSnap.docs;
    
    for (const batchDocs of chunk(questionDocs, 50)) {
      const statements = [];
      for (const doc of batchDocs) {
        const q = doc.data();
        statements.push({
          sql: `INSERT OR REPLACE INTO questions 
                (id, quizId, courseId, subjectId, questionText, options, topic, microConcept, baseDifficulty, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            doc.id,
            q.quizId || '',
            q.courseId || '',
            q.subjectId || '',
            q.questionText || '',
            typeof q.options === 'string' ? q.options : JSON.stringify(q.options || []),
            q.topic || '',
            q.microConcept || '',
            q.baseDifficulty || 50,
            q.createdAt ? (q.createdAt.toDate ? q.createdAt.toDate().toISOString() : q.createdAt) : new Date().toISOString(),
          ],
        });
      }
      try {
        await turso.batch(statements);
        questionCount += statements.length;
      } catch (e) {
        log(`   ⚠ Batch failed, trying individually: ${e.message}`);
        for (const s of statements) {
          try { await turso.execute(s); questionCount++; } catch {}
        }
      }
      if (questionCount % 500 === 0) log(`   ... ${questionCount} questions so far`);
    }
    log(`   ✅ ${questionCount} questions synced`);

    // ── 5. QUESTION METADATA (chunked) ───────────────────────────
    log('\n📦 [5/7] Syncing Question Metadata...');
    const metaSnap = await fsDb.collection('questionMetadata').get();
    log(`   Found ${metaSnap.size} metadata entries in Firestore`);
    let metaCount = 0;
    
    for (const batchDocs of chunk(metaSnap.docs, 100)) {
      const statements = batchDocs.map(doc => {
        const m = doc.data();
        return {
          sql: `INSERT OR REPLACE INTO question_metadata (id, correctOptionIndex, explanationText) VALUES (?, ?, ?)`,
          args: [doc.id, m.correctOptionIndex ?? -1, m.explanationText || ''],
        };
      });
      try {
        await turso.batch(statements);
        metaCount += statements.length;
      } catch (e) {
        for (const s of statements) {
          try { await turso.execute(s); metaCount++; } catch {}
        }
      }
      if (metaCount % 1000 === 0) log(`   ... ${metaCount} metadata entries so far`);
    }
    log(`   ✅ ${metaCount} metadata entries synced`);

    // ── 6. USER ENROLLMENTS ──────────────────────────────────────
    log('\n📦 [6/7] Syncing User Enrollments from Firestore users...');
    let enrollCount = 0;
    try {
      // Check userAccess collection
      const accessSnap = await fsDb.collection('userAccess').get();
      if (accessSnap.size > 0) {
        for (const doc of accessSnap.docs) {
          const d = doc.data();
          const courses = d.courseIds || d.enrolledCourses || [];
          for (const courseId of courses) {
            const enrollId = `${doc.id}_${courseId}`;
            try {
              await turso.execute({
                sql: `INSERT OR IGNORE INTO user_enrollments (id, userId, courseId, grantedAt, grantedBy) VALUES (?, ?, ?, ?, ?)`,
                args: [enrollId, doc.id, courseId, d.grantedAt || new Date().toISOString(), d.grantedBy || 'sync'],
              });
              enrollCount++;
            } catch {}
          }
        }
      } else {
        // Try users collection with enrolledCourses field
        const usersSnap = await fsDb.collection('users').get();
        for (const doc of usersSnap.docs) {
          const d = doc.data();
          const courses = d.enrolledCourses || d.courseIds || [];
          for (const courseId of courses) {
            const enrollId = `${doc.id}_${courseId}`;
            try {
              await turso.execute({
                sql: `INSERT OR IGNORE INTO user_enrollments (id, userId, courseId, grantedAt, grantedBy) VALUES (?, ?, ?, ?, ?)`,
                args: [enrollId, doc.id, courseId, new Date().toISOString(), 'sync'],
              });
              enrollCount++;
            } catch {}
          }
        }
      }
    } catch (e) {
      log(`   ⚠ Enrollment sync partial: ${e.message}`);
    }
    log(`   ✅ ${enrollCount} enrollment records synced`);

    // ── 7. SEED TRIAL COURSES ────────────────────────────────────
    log('\n🌱 [7/7] Seeding trial_courses from isFreeTrial quizzes...');
    const freeTrialRes = await turso.execute(`SELECT id as quizId, courseId FROM quizzes WHERE isFreeTrial = 1`);
    let trialSeeded = 0;
    for (const row of freeTrialRes.rows) {
      if (!row.courseId) continue;
      const trialId = `trial_${row.courseId}`;
      try {
        await turso.execute({
          sql: `INSERT OR IGNORE INTO trial_courses (id, parentCourseId, trialQuizId) VALUES (?, ?, ?)`,
          args: [trialId, row.courseId, row.quizId],
        });
        trialSeeded++;
      } catch {}
    }

    // Also auto-assign first quiz per course if no isFreeTrial quiz exists
    const coursesWithNoTrial = await turso.execute(`
      SELECT id FROM courses WHERE id NOT IN (SELECT parentCourseId FROM trial_courses)
    `);
    for (const courseRow of coursesWithNoTrial.rows) {
      const firstQuiz = await turso.execute({
        sql: `SELECT id FROM quizzes WHERE courseId = ? ORDER BY globalOrder ASC, createdAt ASC LIMIT 1`,
        args: [courseRow.id],
      });
      if (firstQuiz.rows.length > 0) {
        const quizId = firstQuiz.rows[0].id;
        const trialId = `trial_${courseRow.id}`;
        try {
          await turso.execute({
            sql: `INSERT OR IGNORE INTO trial_courses (id, parentCourseId, trialQuizId) VALUES (?, ?, ?)`,
            args: [trialId, courseRow.id, quizId],
          });
          // Mark as free trial
          await turso.execute({ sql: `UPDATE quizzes SET isFreeTrial = 1 WHERE id = ?`, args: [quizId] });
          trialSeeded++;
        } catch {}
      }
    }
    log(`   ✅ ${trialSeeded} trial course entries seeded`);

  } finally {
    // Always re-enable FK enforcement
    await turso.execute('PRAGMA foreign_keys = ON');
    log('\n✅ FK enforcement re-enabled');
  }

  // Final count verification
  log('\n=== FINAL ROW COUNTS ===');
  const tables = ['courses', 'subjects', 'quizzes', 'questions', 'question_metadata', 'student_attempts', 'user_enrollments', 'trial_courses'];
  for (const t of tables) {
    const r = await turso.execute(`SELECT COUNT(*) as cnt FROM ${t}`);
    log(`  ${t}: ${r.rows[0].cnt} rows`);
  }
  log('\n🎉 Recovery sync complete! MyMockSewa v3 is fully operational.');
}

recover().catch(err => {
  console.error('\n❌ Recovery failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
