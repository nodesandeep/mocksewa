import { NextResponse } from 'next/server';
import { adminAuth } from '@/utils/firebase-admin';
import turso from '@/utils/turso';

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const user = await adminAuth.verifyIdToken(token);
    
    // Check if user is admin
    const userRecord = await adminAuth.getUser(user.uid);
    // You might have a custom claim for admin, or check Firestore
    // For now, assuming anyone with a valid token from your admin dashboard can call this
    // In production, add: if (userRecord.customClaims?.admin !== true) return ...

    const { userId, courseId, action } = await request.json();
    const { adminDb } = require('@/utils/firebase-admin');

    if (action === 'grant') {
      // 1. Update Turso
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO user_enrollments (userId, courseId, grantedAt) VALUES (?, ?, ?)',
        args: [userId, courseId, new Date().toISOString()]
      });
      // 2. Update Firestore for resilience and AuthContext compatibility
      await adminDb.collection('users').doc(userId).update({
        enrolledCourses: require('firebase-admin').firestore.FieldValue.arrayUnion(courseId)
      }).catch(e => console.warn('[enroll] Firestore update failed:', e.message));
    } else {
      // 1. Update Turso
      await turso.execute({
        sql: 'DELETE FROM user_enrollments WHERE userId = ? AND courseId = ?',
        args: [userId, courseId]
      });
      // 2. Update Firestore
      await adminDb.collection('users').doc(userId).update({
        enrolledCourses: require('firebase-admin').firestore.FieldValue.arrayRemove(courseId)
      }).catch(e => console.warn('[enroll] Firestore remove failed:', e.message));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Enroll API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
