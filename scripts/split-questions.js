const admin = require("firebase-admin");
const serviceAccount = require("../service-account.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function splitQuestions() {
  console.log("🚀 Starting Question Data Splitting...");
  
  const questionsSnap = await db.collection("questions").get();
  console.log(`Found ${questionsSnap.size} questions.`);

  const batchSize = 400;
  let count = 0;
  let batch = db.batch();

  for (const doc of questionsSnap.docs) {
    const data = doc.data();
    const qId = doc.id;

    // 1. Prepare Metadata (Sensitive)
    const metadata = {
      courseId: data.courseId || "unknown",
      quizId: data.quizId || "unknown",
      correctOptionIndex: data.correctOptionIndex ?? data.correctAns ?? data.CorrectAns ?? 0,
      explanationText: data.explanationText ?? data.explanation ?? data.Rationale ?? data.rationale ?? "",
    };

    // 2. Prepare Sanitized Question (Public)
    const sanitizedQuestion = { ...data };
    delete sanitizedQuestion.correctOptionIndex;
    delete sanitizedQuestion.correctAns;
    delete sanitizedQuestion.CorrectAns;
    delete sanitizedQuestion.explanationText;
    delete sanitizedQuestion.explanation;
    delete sanitizedQuestion.Rationale;
    delete sanitizedQuestion.rationale;

    // Add to batch
    const metadataRef = db.collection("questionMetadata").doc(qId);
    const questionRef = db.collection("questions").doc(qId);

    batch.set(metadataRef, metadata);
    batch.set(questionRef, sanitizedQuestion);

    count++;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`Processed ${count} questions...`);
    }
  }

  if (count % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`✅ Successfully split ${count} questions into 'questions' and 'questionMetadata'.`);
}

splitQuestions().catch(console.error);
