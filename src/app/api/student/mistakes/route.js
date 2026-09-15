import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/utils/firebase-admin';
import turso from '@/utils/turso';
import { FieldPath } from 'firebase-admin/firestore';

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const user = await adminAuth.verifyIdToken(token);
    
    // Fetch mistakes joined with question content and metadata
    const result = await turso.execute({
      sql: `
        SELECT 
          m.questionId,
          m.incorrectCount,
          m.lastIncorrectAt,
          m.isBookmarked,
          q.questionText,
          q.options,
          q.subjectId,
          q.quizId,
          qz.title as setTitle,
          meta.correctOptionIndex,
          meta.explanationText
        FROM user_mistakes m
        LEFT JOIN questions q ON m.questionId = q.id
        LEFT JOIN quizzes qz ON q.quizId = qz.id
        LEFT JOIN question_metadata meta ON m.questionId = meta.id
        WHERE m.userId = ?
        ORDER BY m.lastIncorrectAt DESC
        LIMIT 150
      `,
      args: [user.uid]
    });

    const mistakes = [];
    const missingIds = [];
    const rowMap = new Map();

    for (const row of result.rows) {
      let questionText = row.questionText;
      let options = JSON.parse(row.options || '[]');
      
      if (!questionText) {
        missingIds.push(row.questionId);
        rowMap.set(row.questionId, row);
      } else {
        mistakes.push({
          id: row.questionId,
          questionId: row.questionId,
          incorrectCount: row.incorrectCount,
          lastIncorrectAt: row.lastIncorrectAt,
          isBookmarked: row.isBookmarked === 1,
          questionText,
          options,
          subjectId: row.subjectId,
          quizId: row.quizId,
          setTitle: row.setTitle || 'General Review',
          correctOptionIndex: row.correctOptionIndex !== null && row.correctOptionIndex !== undefined ? row.correctOptionIndex : 0,
          explanationText: row.explanationText || ''
        });
      }
    }

    if (missingIds.length > 0) {
      for (let i = 0; i < missingIds.length; i += 10) {
        const chunk = missingIds.slice(i, i + 10);
        try {
          const qSnap = await adminDb.collection('questions').where(FieldPath.documentId(), 'in', chunk).get();
          const mSnap = await adminDb.collection('questionMetadata').where(FieldPath.documentId(), 'in', chunk).get();
          
          const qDataMap = {};
          qSnap.docs.forEach(doc => qDataMap[doc.id] = doc.data());
          const mDataMap = {};
          mSnap.docs.forEach(doc => mDataMap[doc.id] = doc.data());

          for (const qId of chunk) {
            const row = rowMap.get(qId);
            const qData = qDataMap[qId];
            let questionText = "Question details are temporarily loading or unavailable.";
            let options = [];
            let subjectId = '';
            let quizId = '';
            let correctOptionIndex = 0;
            let explanationText = '';

            if (qData) {
              questionText = qData.questionText || questionText;
              options = qData.options || [];
              subjectId = qData.subjectId || '';
              quizId = qData.quizId || '';
              
              const mData = mDataMap[qId];
              if (mData) {
                correctOptionIndex = mData.correctOptionIndex !== undefined ? mData.correctOptionIndex : 0;
                explanationText = mData.explanationText || '';
              }

              turso.execute({
                sql: `INSERT OR REPLACE INTO questions (id, quizId, courseId, subjectId, questionText, options) VALUES (?, ?, ?, ?, ?, ?)`,
                args: [qId, quizId, qData.courseId || '', subjectId, questionText, JSON.stringify(options)]
              }).catch(e => console.error("Autoheal error:", e));
            }

            mistakes.push({
              id: row.questionId,
              questionId: row.questionId,
              incorrectCount: row.incorrectCount,
              lastIncorrectAt: row.lastIncorrectAt,
              isBookmarked: row.isBookmarked === 1,
              questionText,
              options,
              subjectId,
              quizId,
              setTitle: 'General Review',
              correctOptionIndex,
              explanationText
            });
          }
        } catch (e) {
          console.error("Batch fallback error:", e);
        }
      }
    }

    return NextResponse.json({ mistakes });

  } catch (error) {
    console.error('Mistakes Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const user = await adminAuth.verifyIdToken(token);
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');

    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID required' }, { status: 400 });
    }

    // Clear mistakes for a specific set (quizId)
    await turso.execute({
      sql: `
        DELETE FROM user_mistakes 
        WHERE userId = ? 
        AND questionId IN (SELECT id FROM questions WHERE quizId = ?)
      `,
      args: [user.uid, quizId]
    });

    return NextResponse.json({ success: true, message: 'Review submitted and mistakes cleared.' });

  } catch (error) {
    console.error('Mistakes Clear Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
