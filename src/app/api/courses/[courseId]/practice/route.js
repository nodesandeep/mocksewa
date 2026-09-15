import { NextResponse } from 'next/server';
import { adminAuth } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

// GET: Fetch questions linked to a specific chapter (or its quiz)
export async function GET(request, { params }) {
  const { courseId } = await params;
  const { searchParams } = new URL(request.url);
  const chapterId = searchParams.get('chapterId');

  if (!chapterId) {
    return NextResponse.json({ error: 'chapterId is required' }, { status: 400 });
  }

  try {
    // 1. Fetch chapter details & check linked quiz
    const chapRes = await turso.execute({
      sql: `SELECT c.*, q.id as quizId, q.title as quizTitle
            FROM chapters c
            LEFT JOIN quizzes q ON q.chapterId = c.id
            WHERE c.id = ?`,
      args: [chapterId]
    });

    if (chapRes.rows.length === 0) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const chapter = chapRes.rows[0];
    const quizId = chapter.quizId;

    // 2. Fetch questions: First try quizId, if none fallback to course/subject questions
    let questions = [];
    if (quizId) {
      const qRes = await turso.execute({
        sql: `SELECT q.id, q.questionText, q.options, qm.correctOptionIndex, qm.explanationText
              FROM questions q
              LEFT JOIN question_metadata qm ON q.id = qm.id
              WHERE q.quizId = ?
              LIMIT ?`,
        args: [quizId, chapter.quizQuestionCount || 15]
      });
      questions = qRes.rows;
    }

    // Fallback: If no quiz or no questions in quiz, pull questions from course to practice
    if (questions.length === 0) {
      const fallbackRes = await turso.execute({
        sql: `SELECT q.id, q.questionText, q.options, qm.correctOptionIndex, qm.explanationText
              FROM questions q
              LEFT JOIN question_metadata qm ON q.id = qm.id
              WHERE q.courseId = ?
              ORDER BY RANDOM()
              LIMIT ?`,
        args: [courseId, chapter.quizQuestionCount || 15]
      });
      questions = fallbackRes.rows;
    }

    // Format options JSON
    const parsedQuestions = questions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      correctOptionIndex: q.correctOptionIndex ?? 0,
      explanationText: q.explanationText || 'Refer to the chapter notes for comprehensive conceptual clarity.'
    }));

    return NextResponse.json({
      success: true,
      chapter: {
        id: chapter.id,
        title: chapter.title,
        sequenceOrder: chapter.sequenceOrder,
        passingThreshold: chapter.passingThreshold || 60,
        estimatedReadMinutes: chapter.estimatedReadMinutes
      },
      questions: parsedQuestions
    });

  } catch (error) {
    console.error('[Chapter Practice API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch chapter questions' }, { status: 500 });
  }
}
