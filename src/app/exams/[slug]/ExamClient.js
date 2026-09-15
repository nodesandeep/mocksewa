'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/utils/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { motion } from 'framer-motion';

export default function ExamClient({ slug = '' }) {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // Normalize slug for metadata and content
  const examTitle = (slug || '').split('-').map(w => w.toUpperCase()).join(' ');

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const q = query(collection(db, 'courses'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setCourse(snap.docs[0].data());
        }
      } catch (err) {
        console.error("Exam fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchExam();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black italic animate-pulse">Synchronizing {examTitle} Ecosystem...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-600 selection:text-white transition-colors duration-300">
      
      <nav className="p-8 max-w-7xl mx-auto flex justify-between items-center bg-white dark:bg-slate-900 rounded-b-[2.5rem] shadow-sm border-x border-b border-slate-100 dark:border-slate-800">
         <Logo />
         <Link href="/login" className="px-8 py-3 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all">
            Join Platform
         </Link>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
           <div className="space-y-10">
              <motion.div 
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                className="inline-block px-5 py-2 bg-blue-600/10 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.3em]"
              >
                Official {examTitle} Prep Path
              </motion.div>
              
              <h1 className="text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tighter leading-none italic uppercase">
                Crack {examTitle} <br/> with <span className="text-blue-600 underline decoration-4 underline-offset-8">MockSewa.</span>
              </h1>

              <p className="text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-xl">
                 Step into Nepal's most precise exam simulation environment. Our {examTitle} track features verified MCQs, rank-tracking analytics, and chapter-wise proficiency radar.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 pt-4">
                 <Link href="/login" className="px-12 py-6 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all text-center">
                    Start {examTitle} Mock Test
                 </Link>
                 <Link href="/library/psc-nepal-guide" className="px-12 py-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-800 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all text-center">
                    View Syllabus
                 </Link>
              </div>

              <div className="pt-10 grid grid-cols-2 gap-8 border-t border-slate-100 dark:border-slate-800 opacity-60">
                 <div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Verified</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">💡 Question Hints</p>
                 </div>
                 <div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Real-Time</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Ranking</p>
                 </div>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 p-12 lg:p-20 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 text-9xl opacity-10 grayscale group-hover:grayscale-0 transition-all">🎯</div>
              <div className="relative space-y-8 z-10">
                 <div className="space-y-4">
                    <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Why use myMockSewa for {examTitle}?</h3>
                    <p className="text-slate-500 font-medium">Unlike generic PDF sets, our digital platform tracks your performance trends across 15+ sub-categories specific to the {examTitle} curriculum.</p>
                 </div>
                 
                 <div className="space-y-4">
                    {[
                      'Exam-like locked timer environment',
                      'Immediate negative marking simulation',
                      'Benchmark against 5,000+ candidates',
                      'Weekly updated model question sets'
                    ].map((feat, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                        <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center text-[10px]">✓</span>
                        {feat}
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </main>

      <footer className="bg-slate-900 py-32 text-white mt-20">
         <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
            <h2 className="text-3xl font-black tracking-tighter">Mastering the {examTitle} Landscape in Nepal</h2>
            <div className="text-slate-400 text-sm font-medium leading-relaxed space-y-6 text-left border-l-4 border-blue-600 pl-8">
               <p>The {examTitle} examination is one of the most competitive milestones for aspirants in Nepal. Success requires more than just subject knowledge; it demands rigorous time management and a deep understanding of the MCQ pattern used by government and licensing boards.</p>
               <p>At <strong>myMockSewa</strong>, our {examTitle} prep track is engineered to eliminate exam anxiety. We provide students with high-fidelity simulations that mirror the real {examTitle} environment, ensuring that on exam day, you are not just taking a test, but executing a plan. Our curriculum for {examTitle} is reviewed weekly by subject specialists to include the latest 2083/2084 syllabus updates.</p>
               <p>Join the future of exam preparation in Nepal. Register for the {examTitle} mock series today and see your national rank improve in real-time.</p>
            </div>
            <Link href="/login" className="inline-block pb-2 border-b-2 border-blue-600 text-blue-400 font-black text-xs uppercase tracking-widest hover:text-white transition-all">Start Free Registration →</Link>
         </div>
      </footer>
    </div>
  );
}
