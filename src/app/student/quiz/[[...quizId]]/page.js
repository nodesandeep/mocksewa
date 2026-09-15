import { use } from 'react';
import QuizPageClient from '@/components/QuizPageClient';

export function generateStaticParams() {
  return [{ quizId: [] }]; // Generates the base /student/quiz/ route
}

export const dynamicParams = false; // Required for output: export

export default function QuizPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  // quizId will be an array for catch-all routes [[...quizId]]
  const quizId = params.quizId?.[0] || 'index';

  return <QuizPageClient quizId={quizId} />;
}
