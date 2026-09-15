import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      serviceAccount = require("../../service-account.json");
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

export const adminDb = isBuild ? {
  collection: () => ({
    get: async () => ({ docs: [] }),
    where: () => ({ get: async () => ({ docs: [] }) }),
    doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }) })
  })
} : admin.firestore();

export const adminAuth = admin.auth();
