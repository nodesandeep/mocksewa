import { adminAuth, adminDb } from './firebase-admin';

// Known admin emails that have verified administrative privileges
const MASTER_ADMIN_EMAILS = [
  'nodesandeep@gmail.com',
];

/**
 * Robust server-side Admin Guard
 * Verifies that the caller's Firebase ID token is valid AND belongs to an authorized admin.
 * Checks token claims, master email list, and Firestore user role.
 * 
 * @param {Request} request Next.js request
 * @returns {Promise<{ authorized: boolean, user?: object, error?: string, status: number }>}
 */
export async function verifyAdminUser(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Unauthorized: Authentication required', status: 401 };
  }

  const token = authHeader.split('Bearer ')[1];
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch (err) {
    return { authorized: false, error: 'Unauthorized: Invalid authentication token', status: 401 };
  }

  // 1. Check Master Admin Email
  if (decoded.email && MASTER_ADMIN_EMAILS.includes(decoded.email.toLowerCase())) {
    return { authorized: true, user: decoded };
  }

  // 2. Check Custom Claims (Firebase Auth)
  if (decoded.admin === true || decoded.role === 'admin') {
    return { authorized: true, user: decoded };
  }

  // 3. Check Firestore User Document Role
  try {
    if (adminDb && typeof adminDb.collection === 'function') {
      const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
      if (userDoc.exists && userDoc.data()?.role === 'admin') {
        return { authorized: true, user: decoded };
      }
    }
  } catch (dbErr) {
    console.warn('[AdminGuard] Firestore role check warning:', dbErr.message);
  }

  // Log unauthorized attempt for security forensics
  console.warn(`[SECURITY ALERT] Unauthorized admin access attempt by UID: ${decoded.uid}, Email: ${decoded.email}`);
  return { authorized: false, error: 'Forbidden: Administrative privileges required', status: 403 };
}
