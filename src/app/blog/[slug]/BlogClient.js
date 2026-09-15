'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { motion } from 'framer-motion';

const BLOG_DATA = {
  'psc-loksewa-mastery-guide-2083': {
    title: 'The Ultimate Guide to PSC (Loksewa) Preparation 2083',
    category: 'Loksewa Strategy',
    date: 'April 15, 2026',
    author: 'MockSewa Experts',
    content: `
      ## Understanding the Loksewa Landscape
      The Public Service Commission (PSC) of Nepal remains the most prestigious path for secure career growth. However, with over 100,000 aspirants every year, the competition is no longer just about hard work—it’s about data-driven precision.
      
      ## The GK & IQ Trap
      Most candidates fail in the first paper—General Knowledge (GK) and Intelligence Quotient (IQ). The secret isn't memorizing more facts; it's understanding the weightage of the syllabus. Geography, Constitution, and International Affairs consistently carry the most marks.
      
      ## Why Mock Tests are Mandatory
      Negative marking (-20%) is the silent killer of Loksewa dreams. Practicing in a time-locked environment helps you build the internal "Risk-Reward" model needed to skip uncertain questions and secure your pass marks.
    `,
    ctaTitle: 'Ready to Crack Loksewa 2083?',
    ctaText: 'Access 5,000+ verified Loksewa MCQs and track your national rank instantly.'
  },
  'nec-engineering-license-exam-secrets': {
    title: 'Mastering the NEC License Exam: Engineering MCQ Secrets',
    category: 'Engineering License',
    date: 'April 16, 2026',
    author: 'Engineering Node',
    content: `
      ## The New NEC Standard
      The Nepal Engineering Council (NEC) has standardized the licensing process to ensure professional competency. For Civil, Electrical, and Computer engineers, the focus has shifted from "memorization" to "professional practice."
      
      ## Core Technical Clusters
      70% of the exam focuses on your core engineering discipline, while 30% focuses on professional ethics, law, and project management. Skipping the 'Ethics' section is a common mistake that leads to failure.
      
      ## Tactical Preparation
      Don't just solve problems—solve them against the clock. Professional engineers need to make decisions under pressure, and our simulation environment perfectly mirrors the NEC interface.
    `,
    ctaTitle: 'Unlock Your Engineering License',
    ctaText: 'Practice with previous year trends and high-yield engineering license MCQs.'
  },
  'nea-exam-success-simulation-strategy': {
    title: 'NEA Exam Success: Why Mock Tests Are Non-Negotiable',
    category: 'NEA Excellence',
    date: 'April 17, 2026',
    author: 'Technical Triage',
    content: `
      ## The NEA Psychological Barrier
      The Nepal Electricity Authority (NEA) exam is notoriously fast-paced. Students often report that "the questions were easy, but there wasn't enough time." This is a pacing failure, not a knowledge failure.
      
      ## Identifying Your Proficiency "Dents"
      Our Radar analysis shows that NEA candidates often score high in Circuits but fail in Power Systems or GK. You cannot afford a weak link. Identifying these gaps early is the difference between a job and another year of waiting.
      
      ## The Power of Simulation
      A mock test is not just a test; it's a dress rehearsal. When you sit for the real NEA exam, it should feel like just another day on the myMockSewa platform.
    `,
    ctaTitle: 'Get Hired by NEA',
    ctaText: 'Start your level 4/5 preparation with the most accurate mock sets in Nepal.'
  }
};

export default function BlogClient({ slug }) {
  const post = BLOG_DATA[slug];

  if (!post) return <div className="min-h-screen flex items-center justify-center font-black italic">Article Archive Not Found.</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-blue-600 selection:text-white transition-colors duration-300 pb-40">
      
      <nav className="p-8 max-w-5xl mx-auto flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-b-[2rem] border-x border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50">
         <Logo />
         <Link href="/blog" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-all">← Back to Lab</Link>
      </nav>

      <article className="max-w-3xl mx-auto px-6 pt-24 space-y-12">
         <header className="space-y-6">
            <div className="flex items-center gap-4">
               <span className="px-4 py-1.5 bg-blue-600/10 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-full">{post.category}</span>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{post.date}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-none italic uppercase">
               {post.title}
            </h1>
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-slate-950 dark:bg-slate-800 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-tighter italic">M</div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">By {post.author}</p>
            </div>
         </header>

         <div className="prose prose-slate prose-xl dark:prose-invert max-w-none space-y-8">
            {post.content.split('\n\n').map((para, i) => {
              if (para.trim().startsWith('##')) {
                return <h2 key={i} className="text-3xl font-black text-slate-900 dark:text-white tracking-tight pt-6">{para.replace('##', '').trim()}</h2>;
              }
              return <p key={i} className="text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic">{para.trim()}</p>;
            })}
         </div>

         <div className="mt-24 p-12 bg-slate-950 dark:bg-blue-600 rounded-[4rem] text-white space-y-8 shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 text-9xl opacity-10 grayscale group-hover:grayscale-0 transition-opacity">🚀</div>
            <div className="relative z-10 space-y-4">
               <h3 className="text-4xl font-black tracking-tighter italic leading-none">{post.ctaTitle}</h3>
               <p className="max-w-md text-slate-300 font-medium">{post.ctaText}</p>
               <div className="pt-4">
                  <Link href="/register" className="inline-block px-12 py-5 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">
                     Start Free Mock Test →
                  </Link>
               </div>
            </div>
         </div>

         <footer className="mt-20 pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">© 2026 MOCKSEWA CONTENT LAB</p>
            <div className="flex gap-4">
               <button className="text-[10px] font-black uppercase tracking-widest hover:text-blue-600 transition-all text-slate-500">Twitter</button>
               <button className="text-[10px] font-black uppercase tracking-widest hover:text-blue-600 transition-all text-slate-500">Facebook</button>
            </div>
         </footer>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": post.title,
            "datePublished": "2026-04-15",
            "author": {
              "@type": "Organization",
              "name": "myMockSewa"
            }
          })
        }}
      />
    </div>
  );
}
