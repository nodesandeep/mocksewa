import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { adminAuth, adminDb } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = 'SELECT * FROM payments ORDER BY createdAt DESC';
    let args = [];

    if (status) {
      query = 'SELECT * FROM payments WHERE status = ? ORDER BY createdAt DESC';
      args = [status];
    }

    const result = await turso.execute({ sql: query, args });
    return NextResponse.json({ payments: result.rows });
  } catch (error) {
    console.error('Fetch Payments Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    await adminAuth.verifyIdToken(token);

    const { paymentId, status, userId, courseId } = await request.json();
    const timestamp = new Date().toISOString();

    if (status === 'approved') {
      const batch = [
        // 1. Update Payment Status
        {
          sql: 'UPDATE payments SET status = ?, verifiedAt = ? WHERE id = ?',
          args: ['approved', timestamp, paymentId]
        },
        // 2. Insert into Enrollments
        {
          sql: 'INSERT OR REPLACE INTO user_enrollments (userId, courseId, grantedAt) VALUES (?, ?, ?)',
          args: [userId, courseId, timestamp]
        }
      ];
      await turso.batch(batch);

      // 3. Fallback: Update Firestore User Doc for backward compatibility (optional but recommended for now)
      try {
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({
          enrolledCourses: admin.firestore.FieldValue.arrayUnion(courseId),
          status: 'active'
        });
      } catch (fError) {
        console.warn('Firestore fallback sync failed:', fError.message);
      }
    } else {
      await turso.execute({
        sql: 'UPDATE payments SET status = ? WHERE id = ?',
        args: [status, paymentId]
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Payment Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
