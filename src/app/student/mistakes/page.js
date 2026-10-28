'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth } from '@/utils/firebase';
import Logo from '@/components/Logo';
import PageLoader from '@/components/PageLoader';
import BrandName from '@/components/BrandName';
import { 
  AlertTriangle, CheckCircle2, XCircle, ArrowLeft, 
  RotateCcw, Sparkles, BookOpen, Brain, Check, Filter
} from 'lucide-react';
import FormattedQuestionText from '@/components/FormattedQuestionText';

export default function MistakesNotebookPage() {
  const [loading, setLoading] = useState(true);
  const [mistakes, setMistakes] = useState([]);
  const [activeDrillIndex, setActiveDrillIndex] = useState(null); // null = list view, number = active question
  const [selectedOption, setSelectedOption] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [clearingId, setClearingId] = useState(null);

  useEffect(() => {
    async function loadMistakes() {
      setLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch('/api/student/mistakes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.mistakes) {
          setMistakes(data.mistakes);
        }
      } catch (err) {
        console.error('Failed to load mistakes:', err);
      } finally {
        setLoading(false);
      }
    }

    loadMistakes();
  }, []);

  const handleDrillOption = (optIdx) => {
    if (revealed) return;
    setSelectedOption(optIdx);
    setRevealed(true);
  };

  const handleNextDrill = () => {
    if (activeDrillIndex < mistakes.length - 1) {
      setActiveDrillIndex(prev => prev + 1);
      setSelectedOption(null);
      setRevealed(false);
    } else {
      setActiveDrillIndex(null);
      setSelectedOption(null);
      setRevealed(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link 
            href="/student"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Student Hub
          </Link>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-black rounded-full border border-rose-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>{mistakes.length} Questions to Master</span>
            </span>
            {mistakes.length > 0 && activeDrillIndex === null && (
              <button
                onClick={() => setActiveDrillIndex(0)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Start Drill
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-10 space-y-8">
        <header className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider rounded-full">
            <Brain className="w-3 h-3 text-rose-600" /> Spaced Repetition Engine
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Smart Mistakes Notebook
          </h1>
          <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto">
            Every question you missed in chapter quizzes or mock tests is collected here for targeted revision until you master it.
          </p>
        </header>

        {mistakes.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-xl font-black text-slate-900">Your Notebook is Clean!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You currently have zero unmastered mistakes. Any questions you get wrong in future chapter tests will automatically appear here.
            </p>
            <Link
              href="/student"
              className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20"
            >
              Take More Tests
            </Link>
          </div>
        ) : activeDrillIndex !== null ? (
          /* Interactive Drill View */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-10 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">
                Mistake Drill • {activeDrillIndex + 1} of {mistakes.length}
              </span>
              <button
                onClick={() => setActiveDrillIndex(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Exit Drill
              </button>
            </div>

            <div className="space-y-2">
              <FormattedQuestionText text={mistakes[activeDrillIndex].questionText} size="base" />
            </div>

            <div className="space-y-3">
              {(mistakes[activeDrillIndex].options || []).map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === mistakes[activeDrillIndex].correctOptionIndex;

                let style = "bg-white border-slate-200 hover:border-rose-400";
                let badge = "bg-slate-100 text-slate-600";

                if (revealed) {
                  if (isCorrect) {
                    style = "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20";
                    badge = "bg-emerald-600 text-white";
                  } else if (isSelected) {
                    style = "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20";
                    badge = "bg-rose-600 text-white";
                  } else {
                    style = "opacity-50 border-slate-200 bg-slate-50";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleDrillOption(idx)}
                    disabled={revealed}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${style}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${badge}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-bold text-xs md:text-sm">{opt}</span>
                    </div>
                    {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {revealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {revealed && (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-600">
                  <Sparkles className="w-3.5 h-3.5" /> Concept Rationale
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {mistakes[activeDrillIndex].explanationText || 'Carefully review the chapter notes regarding this question topic to master the concept.'}
                </p>
              </div>
            )}

            {revealed && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextDrill}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                >
                  {activeDrillIndex < mistakes.length - 1 ? 'Next Question →' : 'Finish Drill'}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {mistakes.map((m, idx) => (
              <div
                key={m.questionId || idx}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-rose-300 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                    Missed {m.incorrectCount || 1} time{m.incorrectCount > 1 ? 's' : ''}
                  </span>
                  {m.setTitle && (
                    <span className="text-[11px] font-bold text-slate-400">
                      {m.setTitle}
                    </span>
                  )}
                </div>

                <FormattedQuestionText text={m.questionText} size="sm" />

                <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Correct Answer: {m.options?.[m.correctOptionIndex] || 'Option ' + String.fromCharCode(65 + (m.correctOptionIndex || 0))}</span>
                  </div>
                  {m.explanationText && (
                    <p className="text-slate-600 text-[11px] leading-relaxed pl-6 italic">
                      "{m.explanationText}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
