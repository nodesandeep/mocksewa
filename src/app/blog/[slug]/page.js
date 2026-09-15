import BlogClient from './BlogClient';

export const dynamicParams = false;

export async function generateStaticParams() {
  return [
    { slug: 'psc-loksewa-mastery-guide-2083' },
    { slug: 'nec-engineering-license-exam-secrets' },
    { slug: 'nea-exam-success-simulation-strategy' }
  ];
}

export default async function Page({ params }) {
  const { slug } = await params;
  return <BlogClient slug={slug} />;
}
