import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const quizId = searchParams.get('quizId');
  const courseId = searchParams.get('courseId');
  
  // 1. Get Auth Token
  const authHeader = request.headers.get('Authorization');
  let user = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      user = await adminAuth.verifyIdToken(token);
    } catch (e) {
      console.error('Invalid token');
    }
  }

  try {
    // 2. Fetch Quizzes (If no quizId provided)
    if (!quizId) {
      const result = await turso.execute({
        sql: 'SELECT * FROM quizzes WHERE courseId = ? OR ? IS NULL',
        args: [courseId || '', courseId ? 0 : 1]
      });
      return NextResponse.json(result.rows);
    }

    // 3. Fetch Quiz Metadata
    let quizResult = { rows: [] };
    try {
      quizResult = await turso.execute({ sql: 'SELECT * FROM quizzes WHERE id = ?', args: [quizId] });
    } catch (e) {
      console.warn('[quiz] Turso quiz fetch failed.');
    }

    let quiz = quizResult.rows[0];

    // Fallback if quiz missing in Turso
    if (!quiz && process.env.NEXT_PHASE !== 'phase-production-build') {
      try {
        const qDoc = await adminDb.collection('quizzes').doc(quizId).get();
        if (qDoc.exists) quiz = { id: qDoc.id, ...qDoc.data() };
      } catch (e) {
        console.error('[quiz] Firestore quiz fallback failed:', e.message);
      }
    }

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // 4. Check Enrollment
    let isEnrolled = false;
    const courseIdForCheck = quiz.courseId || courseId;

    if (user && courseIdForCheck) {
      try {
        const enrollResult = await turso.execute({
          sql: 'SELECT 1 FROM user_enrollments WHERE userId = ? AND courseId = ?',
          args: [user.uid, courseIdForCheck]
        });
        isEnrolled = enrollResult.rows.length > 0;

        if (!isEnrolled) {
          const userDoc = await adminDb.collection('users').doc(user.uid).get();
          const enrolled = userDoc.data()?.enrolledCourses || [];
          isEnrolled = enrolled.includes(courseIdForCheck);
        }
      } catch (e) {
        console.warn('[quiz] Enrollment check fallback:', e.message);
      }
    }

    // 5. Fetch Questions (with Metadata if Enrolled)
    const canSeeMetadata = isEnrolled || quiz.isFreeTrial;
    let questionsRaw = [];

    try {
      if (canSeeMetadata) {
        // Use JOIN to get everything in one go - Explicit LIMIT 5000 to handle large sets
        const res = await turso.execute({
          sql: `SELECT q.*, m.correctOptionIndex, m.explanationText 
                FROM questions q 
                LEFT JOIN question_metadata m ON q.id = m.id 
                WHERE q.quizId = ? 
                ORDER BY q.createdAt ASC, q.id ASC
                LIMIT 5000`,
          args: [quizId]
        });
        questionsRaw = res.rows;

        // Recovery: If some questions are missing metadata (due to import batch limits), fetch from Firestore
        const missingMetaIds = questionsRaw
          .filter(q => q.correctOptionIndex === null || q.correctOptionIndex === undefined)
          .map(q => q.id);
        
        if (missingMetaIds.length > 0) {
          console.log(`[quiz] Recovering ${missingMetaIds.length} metadata entries from Firestore...`);
          try {
            const { FieldPath } = require('firebase-admin/firestore');
            const metaMap = {};
            for (let i = 0; i < missingMetaIds.length; i += 10) {
              const chunk = missingMetaIds.slice(i, i + 10);
              
              // 1. Try questionMetadata collection first
              const mSnap = await adminDb.collection('questionMetadata').where(FieldPath.documentId(), 'in', chunk).get();
              mSnap.docs.forEach(d => { 
                const data = d.data();
                if (data.correctOptionIndex !== undefined) metaMap[d.id] = data; 
              });

              // 2. Try questions collection for those still missing
              const stillMissing = chunk.filter(id => !metaMap[id]);
              if (stillMissing.length > 0) {
                const qSnap = await adminDb.collection('questions').where(FieldPath.documentId(), 'in', stillMissing).get();
                qSnap.docs.forEach(d => {
                  const data = d.data();
                  if (data.correctOptionIndex !== undefined) metaMap[d.id] = data;
                });
              }
            }

            questionsRaw = questionsRaw.map(q => {
              if (metaMap[q.id]) {
                const meta = metaMap[q.id];
                return { 
                  ...q, 
                  correctOptionIndex: meta.correctOptionIndex,
                  explanationText: meta.explanationText || meta.explanation || meta.rationale || ''
                };
              }
              return q;
            });
            
            // Permanently heal the Turso database asynchronously
            const statements = Object.entries(metaMap).map(([id, meta]) => ({
              sql: `INSERT INTO question_metadata (id, correctOptionIndex, explanationText) VALUES (?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET correctOptionIndex=excluded.correctOptionIndex, explanationText=excluded.explanationText`,
              args: [id, meta.correctOptionIndex ?? -1, meta.explanationText || '']
            }));
            
            if (statements.length > 0) {
              // Chunk the batch to respect Turso limit (200 statements max)
              const CHUNK = 200;
              for (let i = 0; i < statements.length; i += CHUNK) {
                turso.batch(statements.slice(i, i + CHUNK)).catch(e => console.error('[quiz] Turso auto-heal batch failed:', e.message));
              }
              console.log(`[quiz] Auto-healing triggered for ${statements.length} metadata entries in Turso.`);
            }
          } catch (err) {
            console.error('[quiz] Metadata recovery failed:', err.message);
          }
        }
      } else {
        const res = await turso.execute({
          sql: `SELECT id, questionText, options, topic, microConcept, quizId, courseId 
                FROM questions 
                WHERE quizId = ? 
                ORDER BY createdAt ASC, id ASC
                LIMIT 5000`,
          args: [quizId]
        });
        questionsRaw = res.rows;
      }
    } catch (e) {
      console.warn('[quiz] Turso questions fetch failed:', e.message);
    }

    // Deep Fallback for Missing Questions
    if (questionsRaw.length === 0 && process.env.NEXT_PHASE !== 'phase-production-build') {
      try {
        const qsSnap = await adminDb.collection('questions').where('quizId', '==', quizId).get();
        questionsRaw = qsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (canSeeMetadata && questionsRaw.length > 0) {
          // Fetch metadata in chunks
          const { FieldPath } = require('firebase-admin/firestore');
          const ids = questionsRaw.map(q => q.id);
          const metaMap = {};
          for (let i = 0; i < ids.length; i += 10) {
            const chunk = ids.slice(i, i + 10);
            const mSnap = await adminDb.collection('questionMetadata')
              .where(FieldPath.documentId(), 'in', chunk)
              .get();
            mSnap.docs.forEach(d => {
              metaMap[d.id] = d.data();
            });
          }
          questionsRaw = questionsRaw.map(q => ({ ...q, ...metaMap[q.id] }));
          
          // Optionally heal Turso here too, but if questions are entirely missing from Turso,
          // the admin probably needs to do a full re-import anyway.
        }
      } catch (e) {
        console.error('[quiz] Firestore fallback failed:', e.message);
      }
    }

    const questions = questionsRaw.map(q => {
      let options = q.options;
      if (typeof options === 'string') {
        try {
          options = JSON.parse(options);
        } catch (e) {
          options = [];
        }
      }
      return { 
        ...q, 
        options: Array.isArray(options) ? options : [],
        // Ensure critical fields exist
        correctOptionIndex: q.correctOptionIndex ?? null,
        explanationText: q.explanationText ?? q.explanation ?? q.rationale ?? null
      };
    });

    return NextResponse.json({
      quiz,
      questions,
      isLocked: !canSeeMetadata
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', detail: error.message }, { status: 500 });
  }
}
