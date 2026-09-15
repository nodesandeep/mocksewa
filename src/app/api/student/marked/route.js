import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/utils/firebase-admin';
import turso from '@/utils/turso';
import { FieldPath } from 'firebase-admin/firestore';

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const user = await adminAuth.verifyIdToken(token);
    const body = await request.json();
    const { questionIds } = body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ questions: [] });
    }

    // Limit to 200 questions to prevent query explosion
    const maxIds = questionIds.slice(0, 200);
    const placeholders = maxIds.map(() => '?').join(',');

    const sql = `
      SELECT 
        q.id as questionId,
        q.questionText,
        q.options,
        q.subjectId,
        q.quizId,
        qz.title as setTitle,
        meta.correctOptionIndex,
        meta.explanationText
      FROM questions q
      LEFT JOIN quizzes qz ON q.quizId = qz.id
      LEFT JOIN question_metadata meta ON q.id = meta.id
      WHERE q.id IN (${placeholders})
    `;

    const result = await turso.execute({
      sql: sql,
      args: maxIds
    });

    const questions = [];
    const foundIds = new Set();

    for (const row of result.rows) {
      foundIds.add(row.questionId);
      questions.push({
        id: row.questionId,
        questionId: row.questionId,
        questionText: row.questionText,
        options: JSON.parse(row.options || '[]'),
        subjectId: row.subjectId,
        quizId: row.quizId,
        setTitle: row.setTitle || 'General Review',
        correctOptionIndex: row.correctOptionIndex !== null && row.correctOptionIndex !== undefined ? row.correctOptionIndex : 0,
        explanationText: row.explanationText || ''
      });
    }

    const missingIds = maxIds.filter(id => !foundIds.has(id));

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
            const qData = qDataMap[qId];
            if (qData) {
              const questionText = qData.questionText || '';
              const options = qData.options || [];
              const subjectId = qData.subjectId || '';
              const quizId = qData.quizId || '';
              
              let correctOptionIndex = 0;
              let explanationText = '';
              const mData = mDataMap[qId];
              if (mData) {
                correctOptionIndex = mData.correctOptionIndex !== undefined ? mData.correctOptionIndex : 0;
                explanationText = mData.explanationText || '';
              }

              turso.execute({
                sql: `INSERT OR REPLACE INTO questions (id, quizId, courseId, subjectId, questionText, options) VALUES (?, ?, ?, ?, ?, ?)`,
                args: [qId, quizId, qData.courseId || '', subjectId, questionText, JSON.stringify(options)]
              }).catch(e => console.error("Autoheal error:", e));

              // Auto-heal question_metadata table
              turso.execute({
                sql: `INSERT OR REPLACE INTO question_metadata (id, correctOptionIndex, explanationText) VALUES (?, ?, ?)`,
                args: [qId, correctOptionIndex, explanationText]
              }).catch(e => console.error("Autoheal metadata error:", e));

              questions.push({
                id: qId,
                questionId: qId,
                questionText,
                options,
                subjectId,
                quizId,
                setTitle: 'General Review',
                correctOptionIndex,
                explanationText
              });
            }
          }
        } catch (err) {
          console.error(`Bookmarked Firestore recovery failed:`, err);
        }
      }
    }

    return NextResponse.json({ questions });

  } catch (error) {
    console.error('Marked Questions Fetch Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
