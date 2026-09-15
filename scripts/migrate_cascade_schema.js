/**
 * MyMockSewa v3 — Safe Cascade Schema Migration
 * 
 * Strategy: Rename → Create New (with FK CASCADE) → Copy → Drop backups
 * This is the only safe way to add FK constraints to existing SQLite/Turso tables.
 * 
 * New tables added:
 *   - user_profile_ext  (phone, country_code, whatsapp, heartbeat, session tracking)
 *   - trial_courses     (links parentCourse → trialQuizId)
 * 
 * Run: node scripts/migrate_cascade_schema.js
 */

const { createClient } = require('@libsql/client');
require('dotenv').config();

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function tableExists(name) {
  const res = await turso.execute({
    sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    args: [name],
  });
  return res.rows.length > 0;
}

async function columnExists(table, column) {
  try {
    const res = await turso.execute(`PRAGMA table_info(${table})`);
    return res.rows.some(r => r.name === column);
  } catch {
    return false;
  }
}

async function migrate() {
  log('🚀 Starting MyMockSewa v3 Safe Schema Migration...');

  // ─────────────────────────────────────────
  // STEP 1 — Enable FK enforcement
  // ─────────────────────────────────────────
  await turso.execute('PRAGMA foreign_keys = ON');
  log('✅ Foreign key enforcement enabled');

  // ─────────────────────────────────────────
  // STEP 2 — Rename existing tables to _bak
  // ─────────────────────────────────────────
  const coreTables = ['courses', 'subjects', 'quizzes', 'questions', 'question_metadata', 'student_attempts', 'user_enrollments', 'user_mastery'];
  
  for (const tbl of coreTables) {
    if (await tableExists(tbl)) {
      await turso.execute(`ALTER TABLE ${tbl} RENAME TO ${tbl}_bak`);
      log(`  ↩ Renamed ${tbl} → ${tbl}_bak`);
    } else {
      log(`  ⚠ Table ${tbl} not found — skipping rename`);
    }
  }

  // ─────────────────────────────────────────
  // STEP 3 — Create new tables with CASCADE constraints
  // ─────────────────────────────────────────
  log('\n📐 Creating new tables with ON DELETE CASCADE...');

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS courses (
      id                TEXT PRIMARY KEY,
      title             TEXT NOT NULL DEFAULT '',
      description       TEXT DEFAULT '',
      category          TEXT DEFAULT 'General',
      status            TEXT DEFAULT 'active',
      basePrice         REAL DEFAULT 0,
      discountedPrice   REAL DEFAULT 0,
      isDiscounted      INTEGER DEFAULT 0,
      isBundle          INTEGER DEFAULT 0,
      includedCourseIds TEXT DEFAULT '',
      isPremium         INTEGER DEFAULT 1,
      attemptLimit      INTEGER DEFAULT 2,
      durationMinutes   INTEGER DEFAULT 45,
      questionLimit     INTEGER DEFAULT 50,
      fullMarks         INTEGER DEFAULT 100,
      bannerUrl         TEXT DEFAULT '',
      flashSaleEndTime  TEXT,
      createdAt         TEXT DEFAULT (datetime('now'))
    )
  `);
  log('  ✅ courses');

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS subjects (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL DEFAULT '',
      title       TEXT DEFAULT '',
      courseId    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      icon        TEXT DEFAULT '📚',
      description TEXT DEFAULT '',
      active      INTEGER DEFAULT 1,
      createdAt   TEXT DEFAULT (datetime('now'))
    )
  `);
  log('  ✅ subjects');

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id          TEXT PRIMARY KEY,
      subjectId   TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      courseId    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title       TEXT DEFAULT '',
      description TEXT DEFAULT '',
      timeLimit   INTEGER DEFAULT 0,
      price       REAL DEFAULT 0,
      globalOrder INTEGER DEFAULT 999,
      isFreeTrial INTEGER DEFAULT 0,
      enabled     INTEGER DEFAULT 1,
      createdAt   TEXT DEFAULT (datetime('now'))
    )
  `);
  log('  ✅ quizzes');

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS questions (
      id            TEXT PRIMARY KEY,
      quizId        TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      courseId      TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      subjectId     TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      questionText  TEXT DEFAULT '',
      options       TEXT DEFAULT '[]',
      topic         TEXT DEFAULT '',
      microConcept  TEXT DEFAULT '',
      baseDifficulty INTEGER DEFAULT 50,
      createdAt     TEXT DEFAULT (datetime('now'))
    )
  `);
  log('  ✅ questions');

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS question_metadata (
      id                 TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
      correctOptionIndex INTEGER DEFAULT 0,
      explanationText    TEXT DEFAULT ''
    )
  `);
  log('  ✅ question_metadata');

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS student_attempts (
      id            TEXT PRIMARY KEY,
      userId        TEXT NOT NULL,
      quizId        TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      courseId      TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      score         REAL DEFAULT 0,
      totalQ        INTEGER DEFAULT 0,
      correctCount  INTEGER DEFAULT 0,
      wrongCount    INTEGER DEFAULT 0,
      skippedCount  INTEGER DEFAULT 0,
      timeTaken     INTEGER DEFAULT 0,
      timestamp     TEXT DEFAULT (datetime('now')),
      answers       TEXT DEFAULT '{}'
    )
  `);
  log('  ✅ student_attempts');

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS user_enrollments (
      id        TEXT PRIMARY KEY,
      userId    TEXT NOT NULL,
      courseId  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      grantedAt TEXT DEFAULT (datetime('now')),
      grantedBy TEXT DEFAULT '',
      UNIQUE(userId, courseId)
    )
  `);
  log('  ✅ user_enrollments');

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS user_mastery (
      id         TEXT PRIMARY KEY,
      userId     TEXT NOT NULL,
      subjectId  TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      topic      TEXT DEFAULT '',
      accuracy   REAL DEFAULT 0,
      attempts   INTEGER DEFAULT 0,
      updatedAt  TEXT DEFAULT (datetime('now')),
      UNIQUE(userId, subjectId, topic)
    )
  `);
  log('  ✅ user_mastery');

  // ─────────────────────────────────────────
  // STEP 4 — New tables (v3)
  // ─────────────────────────────────────────
  log('\n🆕 Creating v3 new tables...');

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS trial_courses (
      id              TEXT PRIMARY KEY,
      parentCourseId  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      trialQuizId     TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      createdAt       TEXT DEFAULT (datetime('now')),
      UNIQUE(parentCourseId)
    )
  `);
  log('  ✅ trial_courses');

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS user_profile_ext (
      userId              TEXT PRIMARY KEY,
      displayName         TEXT DEFAULT '',
      countryCode         TEXT DEFAULT '+977',
      phone               TEXT DEFAULT '',
      whatsappOptedIn     INTEGER DEFAULT 1,
      last_active_at      TEXT,
      session_start_at    TEXT,
      total_session_mins  INTEGER DEFAULT 0,
      joinedAt            TEXT DEFAULT (datetime('now'))
    )
  `);
  log('  ✅ user_profile_ext');

  // ─────────────────────────────────────────
  // STEP 5 — Copy data from _bak tables
  // ─────────────────────────────────────────
  log('\n📦 Migrating data from backup tables...');

  const copyMap = {
    courses: {
      from: 'courses_bak',
      cols: 'id, title, description, category, status, basePrice, discountedPrice, isDiscounted, isBundle, includedCourseIds, isPremium, attemptLimit, durationMinutes, questionLimit, fullMarks, bannerUrl, createdAt',
    },
    subjects: {
      from: 'subjects_bak',
      cols: 'id, name, title, courseId, icon, description, active, createdAt',
    },
    quizzes: {
      from: 'quizzes_bak',
      cols: 'id, subjectId, courseId, title, description, timeLimit, price, globalOrder, isFreeTrial, enabled, createdAt',
    },
    questions: {
      from: 'questions_bak',
      cols: 'id, quizId, courseId, subjectId, questionText, options, topic, microConcept, baseDifficulty, createdAt',
    },
    question_metadata: {
      from: 'question_metadata_bak',
      cols: 'id, correctOptionIndex, explanationText',
    },
    student_attempts: {
      from: 'student_attempts_bak',
      cols: 'id, userId, quizId, courseId, score, totalQ, correctCount, wrongCount, skippedCount, timeTaken, timestamp, answers',
    },
    user_enrollments: {
      from: 'user_enrollments_bak',
      cols: 'id, userId, courseId, grantedAt, grantedBy',
    },
    user_mastery: {
      from: 'user_mastery_bak',
      cols: 'id, userId, subjectId, topic, accuracy, attempts, updatedAt',
    },
  };

  for (const [newTbl, { from, cols }] of Object.entries(copyMap)) {
    if (!(await tableExists(from))) {
      log(`  ⚠ Backup ${from} not found — skipping data copy`);
      continue;
    }
    try {
      // Get only columns that exist in the source backup table
      const pragmaRes = await turso.execute(`PRAGMA table_info(${from})`);
      const srcCols = new Set(pragmaRes.rows.map(r => r.name));
      const safeCols = cols.split(',').map(c => c.trim()).filter(c => srcCols.has(c));
      
      if (safeCols.length === 0) {
        log(`  ⚠ No matching columns for ${newTbl} — skipping`);
        continue;
      }

      const colStr = safeCols.join(', ');
      await turso.execute(
        `INSERT OR IGNORE INTO ${newTbl} (${colStr}) SELECT ${colStr} FROM ${from}`
      );
      const countRes = await turso.execute(`SELECT COUNT(*) as cnt FROM ${newTbl}`);
      log(`  ✅ ${newTbl}: ${countRes.rows[0].cnt} rows migrated`);
    } catch (err) {
      log(`  ❌ Failed to copy ${from} → ${newTbl}: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────
  // STEP 6 — Create indexes for performance
  // ─────────────────────────────────────────
  log('\n🔍 Creating performance indexes...');
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_subjects_courseId ON subjects(courseId)',
    'CREATE INDEX IF NOT EXISTS idx_quizzes_courseId ON quizzes(courseId)',
    'CREATE INDEX IF NOT EXISTS idx_quizzes_subjectId ON quizzes(subjectId)',
    'CREATE INDEX IF NOT EXISTS idx_quizzes_isFreeTrial ON quizzes(isFreeTrial)',
    'CREATE INDEX IF NOT EXISTS idx_questions_quizId ON questions(quizId)',
    'CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic)',
    'CREATE INDEX IF NOT EXISTS idx_attempts_userId ON student_attempts(userId)',
    'CREATE INDEX IF NOT EXISTS idx_attempts_quizId ON student_attempts(quizId)',
    'CREATE INDEX IF NOT EXISTS idx_attempts_courseId ON student_attempts(courseId)',
    'CREATE INDEX IF NOT EXISTS idx_enrollments_userId ON user_enrollments(userId)',
    'CREATE INDEX IF NOT EXISTS idx_enrollments_courseId ON user_enrollments(courseId)',
    'CREATE INDEX IF NOT EXISTS idx_profile_last_active ON user_profile_ext(last_active_at)',
  ];
  for (const sql of indexes) {
    await turso.execute(sql);
  }
  log('  ✅ All indexes created');

  // ─────────────────────────────────────────
  // STEP 7 — Seed trial_courses from existing isFreeTrial quizzes
  // ─────────────────────────────────────────
  log('\n🌱 Seeding trial_courses from existing isFreeTrial quizzes...');
  const freeTrialRes = await turso.execute(
    `SELECT id as quizId, courseId FROM quizzes WHERE isFreeTrial = 1`
  );
  let trialSeeded = 0;
  for (const row of freeTrialRes.rows) {
    const trialId = `trial_${row.courseId}`;
    try {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO trial_courses (id, parentCourseId, trialQuizId) VALUES (?, ?, ?)`,
        args: [trialId, row.courseId, row.quizId],
      });
      trialSeeded++;
    } catch (e) {
      // ignore duplicate
    }
  }
  log(`  ✅ ${trialSeeded} trial course entries seeded`);

  // ─────────────────────────────────────────
  // STEP 8 — Drop backup tables (OPTIONAL: comment out to keep backups)
  // ─────────────────────────────────────────
  log('\n🗑  Dropping backup tables...');
  for (const tbl of coreTables) {
    const bakName = `${tbl}_bak`;
    if (await tableExists(bakName)) {
      await turso.execute(`DROP TABLE IF EXISTS ${bakName}`);
      log(`  ✅ Dropped ${bakName}`);
    }
  }

  log('\n🎉 Migration complete! MyMockSewa v3 schema is live.');
  log('   → Run: node scripts/verify_schema.js to confirm integrity');
}

migrate().catch(err => {
  console.error('\n❌ MIGRATION FAILED:', err.message);
  console.error('   Backup tables (_bak) are preserved. Investigate and re-run.');
  process.exit(1);
});
