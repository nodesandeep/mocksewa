'use client';
import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { motion } from 'framer-motion';

const BLOG_POSTS = [
  {
    slug: 'psc-loksewa-mastery-guide-2083',
    title: 'The Ultimate Guide to PSC (Loksewa) Preparation 2083',
    excerpt: 'Mastering the Loksewa exam requires more than just reading books. Learn how to optimize your GK, IQ, and time management skills...',
    date: 'April 15, 2026',
    category: 'Loksewa',
    readTime: '8 min'
  },
  {
    slug: 'nec-engineering-license-exam-secrets',
    title: 'Mastering the NEC License Exam: Engineering MCQ Secrets',
    excerpt: 'Engineering license exams in Nepal are evolving. Discover the tactical shifts needed to clear the NEC exam on your first attempt...',
    date: 'April 16, 2026',
    category: 'Engineering',
    readTime: '6 min'
  },
  {
    slug: 'nea-exam-success-simulation-strategy',
    title: 'NEA Exam Success: Why Mock Tests Are Non-Negotiable',
    excerpt: 'Why do students with great GPA fail the NEA exam? Exploring the psychological gap and why simulation is the only cure...',
    date: 'April 17, 2026',
    category: 'NEA',
    readTime: '5 min'
  }
];

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-600 selection:text-white transition-colors duration-300 pb-20">
      
      {/* 🧭 NAVIGATION */}
      <nav className="p-8 max-w-7xl mx-auto flex justify-between items-center bg-white dark:bg-slate-900 rounded-b-[2.5rem] shadow-sm border-x border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50">
         <Logo />
         <Link href="/login" className="px-8 py-3 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all">
            Join Platform
         </Link>
      </nav>

      <header className="max-w-7xl mx-auto px-6 pt-24 pb-16 text-center space-y-6">
         <h4 className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em]">The Growth Lab</h4>
         <h1 className="text-6xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter italic">Exam Intelligence</h1>
         <p className="max-w-2xl mx-auto text-lg text-slate-500 font-medium leading-relaxed italic">
            "Expert insights, tactical guides, and data-driven preparation strategies for Nepalese aspirants."
         </p>
      </header>

      <main className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-10 mt-10">
         {BLOG_POSTS.map((post, i) => (
           <motion.div 
             key={post.slug}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.1 }}
             className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between group hover:shadow-2xl hover:shadow-blue-600/5 transition-all"
           >
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <span className="px-5 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-[9px] font-black uppercase tracking-widest rounded-full">{post.category}</span>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{post.readTime} Read</span>
                 </div>
                 <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight group-hover:text-blue-600 transition-all cursor-pointer">
                    <Link href={`/blog/${post.slug}`}>
                       {post.title}
                    </Link>
                 </h3>
                 <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-3 italic">
                    {post.excerpt}
                 </p>
              </div>
              <div className="pt-10 flex items-center justify-between">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{post.date}</p>
                 <Link href={`/blog/${post.slug}`} className="w-12 h-12 bg-slate-950 dark:bg-slate-800 text-white rounded-2xl flex items-center justify-center group-hover:bg-blue-600 transition-all">
                    →
                 </Link>
              </div>
           </motion.div>
         ))}
      </main>

      <footer className="mt-40 text-center opacity-30 select-none pointer-events-none">
         <p className="text-[12rem] font-black tracking-tighter text-slate-200 dark:text-slate-900 italic transform rotate-[-2deg]">MOCKSEWA</p>
      </footer>
    </div>
  );
}
