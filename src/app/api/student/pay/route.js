import { NextResponse } from 'next/server';
import { adminAuth } from '@/utils/firebase-admin';
import turso from '@/utils/turso';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const user = await adminAuth.verifyIdToken(token);

    const { courseId, courseTitle, screenshotUrl, transactionId, amount, userName } = await request.json();
    
    const paymentId = uuidv4();
    const timestamp = new Date().toISOString();

    await turso.execute({
      sql: `INSERT INTO payments (id, userId, userName, courseId, courseTitle, screenshotUrl, transactionId, amount, createdAt, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        paymentId,
        user.uid,
        userName || user.name || user.email || 'Anonymous',
        courseId,
        courseTitle,
        screenshotUrl,
        transactionId,
        amount,
        timestamp,
        'pending'
      ]
    });

    return NextResponse.json({ success: true, paymentId });
  } catch (error) {
    console.error('Submit Payment Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
