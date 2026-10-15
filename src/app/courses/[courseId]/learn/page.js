'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import MarkdownNotesViewer from '@/components/MarkdownNotesViewer';
import Logo from '@/components/Logo';
import BrandName from '@/components/BrandName';
import { 
  BookOpen, CheckCircle2, Lock, ArrowLeft, Award, 
  HelpCircle, Sparkles, ChevronRight, Play, Compass,
  Star, Zap, Trophy, ShieldCheck, Flame, Bookmark
} from 'lucide-react';

export default function GuidedMasteryPage() {
  const { courseId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'quiz'
  const [stats, setStats] = useState({ total: 0, passed: 0 });

  useEffect(() => {
    async function loadProgression(user) {
      try {
        setLoading(true);
        let token = '';
        if (user) {
          token = await user.getIdToken();
        }

        const res = await fetch(`/api/courses/${courseId}/progression`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();

        if (data.success && data.chapters) {
          setChapters(data.chapters);
          setStats({ total: data.totalChapters || data.chapters.length, passed: data.passedChapters || 0 });
          
          setSelectedChapter(prev => {
            if (prev) {
              const stillExists = data.chapters.find(c => c.id === prev.id);
              if (stillExists) return stillExists;
            }
            return data.chapters.find(c => c.status === 'READING' || c.status === 'TEST_UNLOCKED') || data.chapters[0] || null;
          });
        }
      } catch (err) {
        console.error("Failed to load progression:", err);
      } finally {
        setLoading(false);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      loadProgression(user);
    });

    return () => unsubscribe();
  }, [courseId]);

  const handleStartQuiz = (chapterId) => {
    if (!chapterId) return;
    router.push(`/courses/${courseId}/practice/${chapterId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-white text-sm font-bold tracking-widest uppercase">Loading Guided Path...</p>
      </div>
    );
  }

  const completionRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
  
  const currentChapterIndex = chapters.findIndex(c => c.id === selectedChapter?.id);
  const prevChapter = currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1 ? chapters[currentChapterIndex + 1] : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/student"
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Logo className="w-8 h-8" />
              <BrandName />
              <span className="text-xs font-black px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md uppercase tracking-wider ml-1">
                Guided Path
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/courses/${courseId}/cheat-sheet`}
              className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 transition-all flex items-center gap-1.5"
              title="View your saved key points and formulas"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-600" /> Cheat-Sheet
            </Link>

            <Link
              href={`/courses/${courseId}/notes`}
              className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-all flex items-center gap-1.5"
              title="View full comprehensive notes and print PDF"
            >
              <BookOpen className="w-3.5 h-3.5" /> Full Notes & Print
            </Link>

            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mastery Progress</p>
              <p className="text-xs font-black text-slate-800">{stats.passed} / {stats.total} Chapters ({completionRate}%)</p>
            </div>
            <div className="w-24 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Sequential Chapters Path (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            {/* 100% Mastery Trophy Card */}
            {stats.total > 0 && stats.passed === stats.total && (
              <div className="p-4 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl text-white shadow-lg shadow-amber-500/20 space-y-2 text-center animate-in fade-in zoom-in-95 duration-500">
                <Trophy className="w-8 h-8 mx-auto text-yellow-100" />
                <h4 className="font-black text-sm uppercase tracking-wider">Syllabus Mastered!</h4>
                <p className="text-[11px] text-amber-100 leading-snug">
                  You have conquered all {stats.total} chapters! You are 100% prepared for the official mock exam.
                </p>
              </div>
            )}

            {chapters.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs font-medium">
                No chapters added for this course yet.
              </div>
            ) : (
              <div className="relative space-y-4">
                {/* Visual Roadmap Connecting Line */}
                <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-slate-200 -z-0" />

                {chapters.map((chap, idx) => {
                  const isSelected = selectedChapter?.id === chap.id;
                  const isPassed = chap.status === 'PASSED';
                  const isLocked = chap.status === 'LOCKED';
                  const isCurrent = !isPassed && !isLocked;

                  return (
                    <button
                      key={chap.id}
                      onClick={() => !isLocked && setSelectedChapter(chap)}
                      disabled={isLocked}
                      className={`relative z-10 w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-sm' 
                          : isPassed
                            ? 'bg-white border-emerald-200 hover:border-emerald-300'
                            : isLocked 
                              ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                              : 'bg-white border-blue-200 hover:border-blue-400 hover:bg-slate-50/80 shadow-sm ring-1 ring-blue-500/10'
                      }`}
                    >
                      {/* Node Icon */}
                      <div className="mt-0.5 shrink-0">
                        {isPassed ? (
                          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-md shadow-emerald-500/30">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : isLocked ? (
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-md shadow-blue-500/30 animate-pulse">
                            <Flame className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Info & Gamified Progress */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${
                            isPassed ? 'text-emerald-600' : isCurrent ? 'text-blue-600 font-black' : 'text-slate-400'
                          }`}>
                            Chapter {idx + 1}
                          </span>
                          
                          {isPassed && (
                            <div className="flex items-center gap-1 text-[10px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span>{Math.round(chap.highestScore)}%</span>
                            </div>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              In Progress
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-xs md:text-sm text-slate-900 truncate mt-0.5">
                          {chap.title}
                        </h4>

                        <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500 font-medium">
                          <span>{chap.estimatedReadMinutes || 8} min read</span>
                          <span>•</span>
                          <span>{chap.quizQuestionCount || 15} Qs Quiz</span>
                          <span>•</span>
                          <span className="text-[10px] text-slate-400">Pass: {chap.passingThreshold || 60}%</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Markdown Notes & Quiz Trigger (8 cols) */}
          <div className="lg:col-span-8">
            {selectedChapter ? (
              <MarkdownNotesViewer
                content={selectedChapter.readingMaterial}
                title={selectedChapter.title}
                chapterId={selectedChapter.id}
                courseId={courseId}
                estimatedMinutes={selectedChapter.estimatedReadMinutes}
                passingThreshold={selectedChapter.passingThreshold || 60}
                hasQuiz={true}
                isUnlocked={selectedChapter.isUnlocked}
                isPassed={selectedChapter.isPassed}
                onStartQuiz={() => handleStartQuiz(selectedChapter.id)}
                prevChapter={prevChapter}
                nextChapter={nextChapter}
                onSelectChapter={setSelectedChapter}
              />
            ) : chapters.length === 0 ? (
              <div className="p-12 md:p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Curriculum Roadmap In Assembly</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Our faculty is currently compiling chapter-wise high-yield notes and question banks for this course. In the meantime, you can dive straight into complete timed mock exams!
                </p>
                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <Link
                    href={`/exams/${courseId}`}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                  >
                    Take Full Mock Exam
                  </Link>
                  <Link
                    href="/student"
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                  >
                    Back to Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-bold">Select a chapter from the left to start reading.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
