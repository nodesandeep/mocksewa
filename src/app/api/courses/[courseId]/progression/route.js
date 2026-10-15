import { NextResponse } from 'next/server';
import { adminAuth } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

export async function GET(request, { params }) {
  const { courseId } = await params;
  const authHeader = request.headers.get('Authorization');
  let userId = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split('Bearer ')[1];
      const decoded = await adminAuth.verifyIdToken(token);
      userId = decoded.uid;
    } catch (e) {
      // Allow unauthenticated fallback (everything except chapter 1 locked)
    }
  }

  try {
    // 1. Fetch all chapters for this course ordered by sequence
    const chaptersRes = await turso.execute({
      sql: `SELECT c.*, q.id as quizId, q.title as quizTitle, q.timeLimit as quizTimeLimit
            FROM chapters c
            LEFT JOIN quizzes q ON q.chapterId = c.id
            WHERE c.courseId = ?
            ORDER BY c.sequenceOrder ASC`,
      args: [courseId]
    });

    const chapters = chaptersRes.rows;

    // If no user is logged in, only Chapter 1 is accessible for preview
    if (!userId) {
      const guestChapters = chapters.map((chap, idx) => ({
        ...chap,
        status: idx === 0 ? 'READING' : 'LOCKED',
        isUnlocked: idx === 0,
        isPassed: false,
        readingMaterial: idx === 0 ? chap.readingMaterial : null, // Prevent data leak of locked chapters
      }));
      return NextResponse.json({
        success: true,
        chapters: guestChapters,
        totalChapters: chapters.length,
        passedChapters: 0,
        userProgress: null
      });
    }

    // 2. Fetch user's progression for this course
    const progRes = await turso.execute({
      sql: `SELECT * FROM user_progression WHERE userId = ? AND courseId = ?`,
      args: [userId, courseId]
    });

    const progMap = progRes.rows.reduce((acc, row) => {
      acc[row.chapterId] = row;
      return acc;
    }, {});

    // 3. Sequential Gating Logic:
    // Chapter 1 is always unlocked.
    // Chapter N is unlocked if Chapter (N - 1) is 'PASSED'.
    let previousPassed = true; // Chapter 1 starts unlocked
    const evaluatedChapters = [];

    for (let i = 0; i < chapters.length; i++) {
      const chap = chapters[i];
      const userState = progMap[chap.id];

      const isUnlocked = i === 0 || previousPassed;
      const isPassed = userState?.status === 'PASSED';

      // Status resolution
      let currentStatus = 'LOCKED';
      if (isPassed) {
        currentStatus = 'PASSED';
      } else if (isUnlocked) {
        currentStatus = userState?.status === 'TEST_UNLOCKED' ? 'TEST_UNLOCKED' : 'READING';
      }

      evaluatedChapters.push({
        ...chap,
        status: currentStatus,
        isUnlocked,
        isPassed,
        highestScore: userState?.highestScore || 0,
        attemptsCount: userState?.attemptsCount || 0,
        // Strip reading material if locked to protect course content
        readingMaterial: isUnlocked ? chap.readingMaterial : null
      });

      // Update condition for next chapter in sequence
      previousPassed = isPassed;
    }

    return NextResponse.json({
      success: true,
      chapters: evaluatedChapters,
      totalChapters: chapters.length,
      passedChapters: evaluatedChapters.filter(c => c.isPassed).length
    });

  } catch (error) {
    console.error('Progression Fetch Error:', error);
    return NextResponse.json({ error: 'Failed to fetch progression' }, { status: 500 });
  }
}

// POST: Mark chapter reading complete or submit time spent
export async function POST(request, { params }) {
  const { courseId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const user = await adminAuth.verifyIdToken(token);
    const { chapterId, readingSeconds = 60 } = await request.json();

    // Upsert reading status to TEST_UNLOCKED if currently READING or LOCKED
    await turso.execute({
      sql: `INSERT INTO user_progression (
              userId, chapterId, courseId, status, hasReadMaterial, readingSecondsSpent, unlockedAt
            ) VALUES (?, ?, ?, 'TEST_UNLOCKED', 1, ?, datetime('now'))
            ON CONFLICT(userId, chapterId) DO UPDATE SET
              hasReadMaterial = 1,
              readingSecondsSpent = readingSecondsSpent + ?,
              status = CASE 
                WHEN status = 'PASSED' THEN 'PASSED' 
                ELSE 'TEST_UNLOCKED' 
              END`,
      args: [user.uid, chapterId, courseId, readingSeconds, readingSeconds]
    });

    return NextResponse.json({ success: true, message: 'Chapter test unlocked!' });

  } catch (error) {
    console.error('Progression Update Error:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
