import { NextResponse } from 'next/server';
import turso from '@/utils/turso';

export async function GET(request, { params }) {
  const { courseId } = await params;

  try {
    // 1. Fetch course details
    const courseRes = await turso.execute({
      sql: 'SELECT id, title, description, category FROM courses WHERE id = ?',
      args: [courseId]
    });

    if (courseRes.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const course = courseRes.rows[0];

    // 2. Fetch all chapters ordered by sequence
    const chaptersRes = await turso.execute({
      sql: `SELECT id, title, sequenceOrder, readingMaterial, summaryPoints, estimatedReadMinutes
            FROM chapters
            WHERE courseId = ?
            ORDER BY sequenceOrder ASC`,
      args: [courseId]
    });

    // 3. Fetch subject-level master notes if any exist
    const subjectsRes = await turso.execute({
      sql: 'SELECT id, name, title, fullNotesMarkdown FROM subjects WHERE courseId = ?',
      args: [courseId]
    });

    return NextResponse.json({
      success: true,
      course,
      chapters: chaptersRes.rows,
      subjects: subjectsRes.rows,
      totalChapters: chaptersRes.rows.length,
      estimatedTotalMinutes: chaptersRes.rows.reduce((acc, c) => acc + (c.estimatedReadMinutes || 8), 0)
    });

  } catch (error) {
    console.error('[Master Notes API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch master notes' }, { status: 500 });
  }
}
