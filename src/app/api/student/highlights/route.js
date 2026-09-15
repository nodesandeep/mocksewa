import { NextResponse } from 'next/server';
import { adminAuth } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const user = await adminAuth.verifyIdToken(token);
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');
    const courseId = searchParams.get('courseId');

    let sql = 'SELECT * FROM user_highlights WHERE userId = ?';
    const args = [user.uid];

    if (chapterId) {
      sql += ' AND chapterId = ?';
      args.push(chapterId);
    } else if (courseId) {
      sql += ' AND courseId = ?';
      args.push(courseId);
    }
    sql += ' ORDER BY createdAt DESC';

    const res = await turso.execute({ sql, args });
    return NextResponse.json({ success: true, highlights: res.rows });

  } catch (err) {
    console.error('[Highlights GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch highlights' }, { status: 500 });
  }
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const user = await adminAuth.verifyIdToken(token);
    const { courseId, chapterId, highlightedText, noteComment, color = 'yellow' } = await request.json();

    if (!highlightedText || !chapterId) {
      return NextResponse.json({ error: 'highlightedText and chapterId are required' }, { status: 400 });
    }

    const id = `hl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    await turso.execute({
      sql: `INSERT INTO user_highlights (id, userId, courseId, chapterId, highlightedText, noteComment, color, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [id, user.uid, courseId || '', chapterId, highlightedText.trim(), noteComment || '', color]
    });

    return NextResponse.json({ success: true, id, message: 'Saved to Cheat-Sheet!' });

  } catch (err) {
    console.error('[Highlights POST] Error:', err);
    return NextResponse.json({ error: 'Failed to save highlight' }, { status: 500 });
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
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await turso.execute({
      sql: 'DELETE FROM user_highlights WHERE id = ? AND userId = ?',
      args: [id, user.uid]
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('[Highlights DELETE] Error:', err);
    return NextResponse.json({ error: 'Failed to delete highlight' }, { status: 500 });
  }
}
