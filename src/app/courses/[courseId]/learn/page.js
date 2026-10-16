'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import MarkdownNotesViewer from '@/components/MarkdownNotesViewer';
import Logo from '@/components/Logo';
import { 
  BookOpen, CheckCircle2, Lock, ArrowLeft, Award, 
  HelpCircle, Sparkles, ChevronRight, Play, Compass,
  Star, Zap, Trophy, ShieldCheck, Flame, Bookmark, Clock,
  Layers, MapPin, ListFilter
} from 'lucide-react';

export default function GuidedMasteryPage() {
  const { courseId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [stats, setStats] = useState({ total: 0, passed: 0 });
  const [mobileTab, setMobileTab] = useState('notes'); // 'roadmap' | 'notes'

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

  const handleSelectChapter = (chap) => {
    setSelectedChapter(chap);
    setMobileTab('notes');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <Compass className="w-6 h-6 text-blue-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-white text-sm font-black tracking-widest uppercase">Loading Guided Path...</p>
          <p className="text-xs text-slate-400 font-medium">Curating chapter notes and milestone gating</p>
        </div>
      </div>
    );
  }

  const completionRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
  
  const currentChapterIndex = chapters.findIndex(c => c.id === selectedChapter?.id);
  const prevChapter = currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
  const nextChapter = currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1 ? chapters[currentChapterIndex + 1] : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Top Sticky Header */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-4 md:px-8 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left Brand & Return */}
          <div className="flex items-center gap-3 shrink-0">
            <Link 
              href="/student"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all flex items-center justify-center active:scale-95"
              title="Return to Student Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2.5 shrink-0">
              <Logo compact />
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full uppercase tracking-wider border border-blue-200/70">
                <Compass className="w-3 h-3 text-blue-600" /> Guided Path
              </span>
            </div>
          </div>

          {/* Right Action Pills & Progress */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <Link
              href={`/courses/${courseId}/cheat-sheet`}
              className="px-3 py-1.5 bg-amber-50/80 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold border border-amber-200/80 transition-all flex items-center gap-1.5 shadow-2xs hover:scale-[1.02] active:scale-95"
              title="View your saved key points and formulas"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Cheat-Sheet</span>
            </Link>

            <Link
              href={`/courses/${courseId}/notes`}
              className="px-3 py-1.5 bg-blue-50/80 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold border border-blue-200/80 transition-all flex items-center gap-1.5 shadow-2xs hover:scale-[1.02] active:scale-95"
              title="View complete handbook notes and print PDF"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Master Notes</span>
            </Link>

            {/* Progress Bar Badge */}
            <div className="hidden md:flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mastery</p>
                <p className="text-xs font-black text-slate-800">
                  {stats.passed} / {stats.total} <span className="text-slate-400 font-semibold">({completionRate}%)</span>
                </p>
              </div>
              <div className="w-24 sm:w-28 h-2.5 bg-slate-100 border border-slate-200/80 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-700 ease-out" 
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Roadmap / Notes Switcher Tabs */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between sticky top-[61px] z-30">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full">
          <button
            onClick={() => setMobileTab('roadmap')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'roadmap' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Path ({chapters.length})</span>
          </button>
          <button
            onClick={() => setMobileTab('notes')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === 'notes' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Chapter Notes</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Column: Duolingo-style Sequential Roadmap Tree (4 cols, Sticky on Desktop) */}
          <div className={`lg:col-span-4 lg:sticky lg:top-[80px] lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto space-y-4 pr-1 ${mobileTab === 'roadmap' ? 'block' : 'hidden lg:block'}`}>
            
            {/* Header Card for Left Column */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-500" /> Syllabus Path
                  </span>
                  <h3 className="text-base font-black text-slate-900">Chapters & Milestones</h3>
                </div>
                <div className="flex items-center gap-1 text-xs font-black px-2.5 py-1 bg-slate-100 rounded-xl text-slate-700 border border-slate-200">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{stats.passed}/{stats.total} Done</span>
                </div>
              </div>

              {/* Mobile Progress Bar (Visible only inside this card on mobile) */}
              <div className="md:hidden pt-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                  <span>Overall Progression</span>
                  <span className="text-blue-600 font-black">{completionRate}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500" 
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>

              {/* 100% Mastery Trophy Card */}
              {stats.total > 0 && stats.passed === stats.total && (
                <div className="p-4 bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-500 rounded-2xl text-white shadow-lg shadow-amber-500/20 space-y-1.5 text-center animate-in fade-in zoom-in-95 duration-500 border border-yellow-300/40">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Trophy className="w-5 h-5 text-yellow-100" />
                  </div>
                  <h4 className="font-black text-xs uppercase tracking-wider">Course 100% Mastered!</h4>
                  <p className="text-[11px] text-amber-100 leading-snug">
                    Outstanding achievement! You have completed all {stats.total} chapters and unlocked full readiness for the mock exams.
                  </p>
                </div>
              )}
            </div>

            {/* Chapters Roadmap Tree */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs">
              {chapters.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs font-medium space-y-2">
                  <Compass className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700">No chapters configured yet.</p>
                  <p className="text-[11px] text-slate-400">Chapters added by instructors will appear here in sequence.</p>
                </div>
              ) : (
                <div className="relative space-y-3.5">
                  {/* Visual Roadmap Connecting Track Line */}
                  <div className="absolute left-[33px] top-7 bottom-7 w-1 bg-slate-200/80 rounded-full -z-0" />

                  {chapters.map((chap, idx) => {
                    const isSelected = selectedChapter?.id === chap.id;
                    const isPassed = chap.status === 'PASSED';
                    const isLocked = chap.status === 'LOCKED';
                    const isCurrent = !isPassed && !isLocked;

                    return (
                      <button
                        key={chap.id}
                        onClick={() => !isLocked && handleSelectChapter(chap)}
                        disabled={isLocked}
                        className={`relative z-10 w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 group cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-sm translate-x-0.5' 
                            : isPassed
                              ? 'bg-white border-emerald-200/90 hover:border-emerald-300 hover:bg-emerald-50/20 shadow-2xs'
                              : isLocked 
                                ? 'bg-slate-50/60 border-slate-200/70 opacity-60 cursor-not-allowed'
                                : 'bg-white border-blue-200/80 hover:border-blue-400 hover:bg-blue-50/30 shadow-2xs ring-1 ring-blue-500/10'
                        }`}
                      >
                        {/* Milestone Node Icon */}
                        <div className="mt-0.5 shrink-0">
                          {isPassed ? (
                            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center text-xs shadow-md shadow-emerald-500/25 ring-4 ring-emerald-50 transition-transform group-hover:scale-105">
                              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                            </div>
                          ) : isLocked ? (
                            <div className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-xs shadow-2xs">
                              <Lock className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-md shadow-blue-500/30 ring-4 ring-blue-100 transition-transform group-hover:scale-105">
                                <Flame className="w-4 h-4 fill-amber-300 text-amber-300" />
                              </div>
                              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Chapter Details & Micro-Badges */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${
                              isPassed ? 'text-emerald-700' : isCurrent ? 'text-blue-700 font-black' : 'text-slate-400'
                            }`}>
                              Chapter {idx + 1}
                            </span>
                            
                            {isPassed && (
                              <div className="flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 shadow-2xs">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                <span>{Math.round(chap.highestScore)}%</span>
                              </div>
                            )}
                            {isCurrent && (
                              <span className="text-[9px] font-black text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-md uppercase tracking-wider border border-blue-200">
                                In Progress
                              </span>
                            )}
                            {isLocked && (
                              <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Locked
                              </span>
                            )}
                          </div>

                          <h4 className={`font-bold text-xs md:text-sm truncate transition-colors ${
                            isSelected ? 'text-blue-900 font-black' : 'text-slate-800 group-hover:text-slate-900'
                          }`}>
                            {chap.title}
                          </h4>

                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" /> {chap.estimatedReadMinutes || 8}m
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1">
                              <HelpCircle className="w-3 h-3 text-slate-400" /> {chap.quizQuestionCount || 15} Qs
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px] text-slate-400">Pass {chap.passingThreshold || 60}%</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Markdown Notes Reader & Chapter Practice Trigger (8 cols) */}
          <div className={`lg:col-span-8 ${mobileTab === 'notes' ? 'block' : 'hidden lg:block'}`}>
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
                onSelectChapter={handleSelectChapter}
              />
            ) : chapters.length === 0 ? (
              <div className="p-10 md:p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-blue-100">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Curriculum Roadmap In Assembly</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Our academic faculty is currently assembling high-yield chapter notes and milestone quizzes for this course. In the meantime, full timed mock exams are ready to take!
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <Link
                    href={`/exams/${courseId}`}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-105 active:scale-95"
                  >
                    Take Full Timed Mock Exam →
                  </Link>
                  <Link
                    href="/student"
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                  >
                    Back to Student Hub
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-slate-700 font-bold text-sm">Select a chapter from the left to start reading.</p>
                <p className="text-xs text-slate-400">Chapters unlock sequentially as you pass each chapter practice test.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
