"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function SEOPreviewInteractive({ questions, totalQuestions, courseId, quizId }) {
  const [showModal, setShowModal] = useState(false);

  const openTrap = () => setShowModal(true);

  return (
    <div className="space-y-16 relative">
      {questions.map((q, i) => (
        <div key={q.id} className="space-y-6">
          <div className="flex gap-4">
            <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-400 text-xs shrink-0">
              0{i + 1}
            </span>
            <p className="text-lg font-bold text-slate-900 leading-relaxed italic font-nepali">
              "{q.questionText}"
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-12">
            {q.options.map((opt, optIndex) => (
              <button
                key={optIndex}
                onClick={openTrap}
                className="p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-600 flex items-center gap-3 hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/5 transition-all text-left group font-nepali"
              >
                <span className="w-6 h-6 bg-slate-50 border border-slate-100 rounded-md flex items-center justify-center text-[10px] font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {String.fromCharCode(65 + optIndex)}
                </span>
                {opt}
              </button>
            ))}
          </div>

          {/* 🛡️ Blurred Rationale Lock */}
          <div className="pl-12">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 relative overflow-hidden">
              <div className="filter blur-[4px] select-none opacity-40">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">💡 Hint</p>
                <p className="text-xs leading-relaxed">
                  Based on the official curriculum guidelines of NEA/PSC, this answer is determined by the intersection of theory and practical application in the field of engineering...
                </p>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                <button 
                  onClick={openTrap}
                  className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                >
                  🔒 Log in to Reveal Hint
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* 🚀 Paywall CTA Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/80 to-transparent flex items-end justify-center pb-8">
        <div className="w-full bg-white p-10 rounded-[3rem] border border-slate-200 shadow-2xl text-center space-y-6">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-[#1E3A8A] tracking-tighter">
              Unlock All {totalQuestions} Questions
            </h3>
            <p className="text-slate-500 text-sm font-medium">
              Join 5,000+ candidates competing for National Rankings.
            </p>
          </div>
          <Link
            href={`/login?redirect=/practice/${courseId}/${quizId}`}
            className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-black rounded-3xl shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest"
          >
            🚀 Start Free Practice Now
          </Link>
        </div>
      </div>

      {/* 🚀 The "Click-to-Reveal" Registration Trap Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-[#1E3A8A]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl text-center space-y-8 border border-slate-100"
            >
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-inner">
                🏆
              </div>
              <div className="space-y-3">
                <h4 className="text-2xl font-black text-[#1E3A8A] tracking-tighter leading-tight">
                  Ready to Conquer the <br/> National Leaderboard?
                </h4>
                <p className="text-slate-500 text-sm font-medium leading-relaxed px-2">
                  Unlock correct answers, detailed explanations, and real-time performance analytics used by top-ranking NEA/PSC candidates.
                </p>
              </div>
              
              <div className="space-y-4 pt-2">
                <Link
                  href={`/register?redirect=/practice/${courseId}/${quizId}`}
                  className="block w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all text-xs uppercase tracking-widest"
                >
                  Create My Aspirant Account
                </Link>
                <Link
                  href={`/login?redirect=/practice/${courseId}/${quizId}`}
                  className="block w-full py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                >
                  Already a Member? Log In
                </Link>
              </div>
              
              <button 
                onClick={() => setShowModal(false)}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Maybe Later
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
