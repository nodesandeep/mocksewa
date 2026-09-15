import { db } from '@/utils/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import ExamClient from './ExamClient';

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const q = query(collection(db, 'courses'), where('status', '==', 'active'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      slug: doc.data().slug || doc.id
    }));
  } catch (err) {
    console.error("Exam Static Params Failure:", err);
    return [];
  }
}

export default async function Page({ params }) {
  const { slug } = await params;
  return <ExamClient slug={slug} />;
}
