"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, BookOpen, GraduationCap, Trophy, History, Settings, LogOut, ChevronRight, Star, AlertCircle, Clock, Trash2, Filter, CheckCircle2 } from "lucide-react";
import TrialCourseCard from "./TrialCourseCard";
import FormattedQuestionText from "./FormattedQuestionText";

import { db, auth } from "../utils/firebase";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";

import { useAuth } from "@/context/AuthContext";

import QuizEngine from "./QuizEngine";

import CourseCard from "./CourseCard";

import PaymentModal from "./PaymentModal";

import RestrictedAccessModal from "./RestrictedAccessModal";

import Logo from "./Logo";

import { motion, AnimatePresence } from "framer-motion";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

export default function StudentHub() {
  const {
    user,
    loading: authLoading,
    logout,
    darkMode,
    toggleDarkMode,
    mounted,
  } = useAuth();

  const [courses, setCourses] = useState([]);

  const [attempts, setAttempts] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [masteryData, setMasteryData] = useState([]);
  const [trialCourses, setTrialCourses] = useState([]);
  const heartbeatRef = useRef(null);

  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [paymentCourse, setPaymentCourse] = useState(null);

  const [activeQuiz, setActiveQuiz] = useState(null);

  const [reviewAttempt, setReviewAttempt] = useState(null);

  const [masteryQuestions, setMasteryQuestions] = useState(null);

  const [isRestrictedModalOpen, setRestrictedModalOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("courses");

  const [isRadarReady, setIsRadarReady] = useState(false);
  const [error, setError] = useState(null);
  const [loadTimeout, setLoadTimeout] = useState(false);

  // Auto-sync data on mount
  useEffect(() => {
    if (user) {
      fetchData();

      // 90-second heartbeat for session tracking
      heartbeatRef.current = setInterval(async () => {
        try {
          const token = await auth.currentUser?.getIdToken();
          if (token) {
            await fetch('/api/heartbeat', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        } catch (e) { /* silent */ }
      }, 90000);
      // Fire once immediately
      (async () => {
        try {
          const token = await auth.currentUser?.getIdToken();
          if (token) await fetch('/api/heartbeat', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        } catch (e) { /* silent */ }
      })();
      
      // Show help message if loading takes > 10s
      const timer = setTimeout(() => {
        setLoadTimeout(true);
      }, 10000);
      return () => {
        clearTimeout(timer);
        clearInterval(heartbeatRef.current);
      };
    }
  }, [user]);

  const fetchData = async (isManualRetry = false) => {
    if (isManualRetry) {
      setLoading(true);
      setError(null);
      setLoadTimeout(false);
      
      // Clear all possible cache versions
      localStorage.removeItem(`ms_hub_cache_v2_${user.uid}`);
      localStorage.removeItem('ms_hub_cache');
      
      console.warn("[hub] Manual retry triggered: Clearing cache and refreshing tokens...");
      
      // Force token refresh on manual retry to fix auth issues
      try {
        await auth.currentUser?.getIdToken(true);
        // Small delay to allow any backend propagation/edge cache clearing if applicable
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error("Token refresh failed", e);
      }
    }
    
    const cacheKey = `ms_hub_cache_v2_${user.uid}`;
    
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached && !isManualRetry) {
        try {
          const { courses: c, attempts: a, subjects: s, quizzes: q, materials: m, enrolledCourseIds: e, mastery: mastery_cache, ts } = JSON.parse(cached);
          if (Date.now() - ts < 300000) {
            setCourses(c || []);
            setAttempts(a || []);
            setSubjects(s || []);
            setQuizzes(q || []);
            setMaterials(m || []);
            setEnrolledCourseIds(e || []);
            setMasteryData(mastery_cache || []);
            setLoading(false);
            return;
          }
        } catch(parseErr) {
          localStorage.removeItem(cacheKey);
        }
      }

      if (!auth.currentUser) {
        throw new Error("Authentication failed: No active session found.");
      }
      const token = await auth.currentUser.getIdToken(Boolean(isManualRetry));
      const res = await fetch('/api/student/hub', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || errBody.error || `Hub sync failed (${res.status})`);
      }

      const data = await res.json();
      const {
        courses: fetchedCourses = [],
        attempts: fetchedAttempts = [],
        subjects: fetchedSubjects = [],
        quizzes: fetchedQuizzes = [],
        materials: fetchedMaterials = [],
        enrolledCourseIds: fetchedEnrolled = [],
      } = data;

      // Merge API enrolled list with Firestore user.enrolledCourses (if any)
      const merged = [...new Set([...fetchedEnrolled, ...(user?.enrolledCourses || [])])];

      setCourses(fetchedCourses);
      setAttempts(fetchedAttempts);
      setSubjects(fetchedSubjects);
      setQuizzes(fetchedQuizzes);
      setMaterials(fetchedMaterials);
      setEnrolledCourseIds(merged);
      setMasteryData(data.mastery || []);
      setTrialCourses(data.trialCourses || []);
      setLoadTimeout(false); // Reset timeout on success

      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          courses: fetchedCourses,
          attempts: fetchedAttempts,
          subjects: fetchedSubjects,
          quizzes: fetchedQuizzes,
          materials: fetchedMaterials,
          enrolledCourseIds: merged,
          mastery: data.mastery || [],
          ts: Date.now(),
        }),
      );
    } catch (err) {
      console.error('[Hub] Data Fetch Error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "progress") {
      const t = setTimeout(() => setIsRadarReady(true), 300);

      return () => {
        clearTimeout(t);

        setIsRadarReady(false);
      };
    }
  }, [activeTab]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="relative">
          <div className="w-24 h-24 bg-brand/5 rounded-[2rem] flex items-center justify-center text-4xl animate-pulse">
          </div>
          <div className="absolute inset-0 border-4 border-brand/10 border-t-brand rounded-[2rem] animate-spin"></div>
        </div>
        <div className="mt-8 text-center space-y-2">
          <h2 className="text-xl font-black text-textPrimary tracking-tighter uppercase italic">
            Learner Dashboard
          </h2>
          <p className="text-[10px] font-black text-textSecondary uppercase tracking-[0.3em]">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  const stats = (() => {
    if (attempts.length === 0)
      return {
        avg: 0,
        total: 0,
        accuracy: 0,
        mastery: [],
        radarData: [],
        pacing: "0s",
        percentile: "0th",
      };

    const total = attempts.length;

    const avgScore =
      attempts.reduce((acc, curr) => acc + curr.finalScore, 0) / total;

    const totalQuestions = attempts.reduce(
      (acc, curr) => acc + curr.totalQuestions,
      0,
    );

    const totalCorrect = attempts.reduce(
      (acc, curr) => acc + curr.stats.correct,
      0,
    );

    const totalSeconds = attempts.reduce(
      (acc, curr) => acc + (curr.timeTakenSeconds || 2700),
      0,
    );

    const accuracyDecimal = totalCorrect / (totalQuestions || 1);

    const accuracy = (accuracyDecimal * 100).toFixed(1);

    // ── SQL-First Mastery ──────────────────────────────────────────────────
    // If we have pre-calculated mastery from SQL, use it.
    // Otherwise fallback to calculating from recent attempts.
    let mastery = [];
    if (masteryData && masteryData.length > 0) {
      mastery = masteryData.map(m => ({
        name: m.subjectTitle || m.subjectId,
        score: Math.round(m.masteryLevel || 0)
      })).sort((a, b) => b.score - a.score);
    } else {
      const masteryMap = {};
      attempts.forEach((att) => {
        const subject = att.quizTitle.split("-")[0].trim();

        if (!masteryMap[subject]) {
          masteryMap[subject] = {
            scores: [],
            count: 0,
          };
        }

        masteryMap[subject].scores.push(
          (att.finalScore / (att.totalQuestions || 1)) * 100,
        );

        masteryMap[subject].count++;
      });

      mastery = Object.keys(masteryMap)
        .map((sub) => ({
          name: sub,
          score: Math.max(
            0,
            masteryMap[sub].scores.reduce((a, b) => a + b, 0) /
              masteryMap[sub].scores.length,
          ).toFixed(0),
        }))
        .sort((a, b) => b.score - a.score);
    }

    const radarData = mastery.slice(0, 6).map((m) => ({
      subject: m.name,
      A: parseInt(m.score),
      fullMark: 100,
    }));

    const avgPacing = Math.round(totalSeconds / (totalQuestions || 1));

    const percentile = Math.min(
      99,
      Math.round(accuracyDecimal * 60 + total * 2 + 20),
    );

    return {
      avg: Math.max(0, avgScore).toFixed(2),
      total,
      accuracy,
      mastery,
      radarData,
      pacing: `${avgPacing}s`,
      percentile: `${percentile}th`,
    };
  })();

  if (activeQuiz || reviewAttempt || masteryQuestions) {
    return (
      <QuizEngine
        quizId={activeQuiz || reviewAttempt?.quizId}
        reviewMode={reviewAttempt}
        attemptLimit={selectedCourse?.attemptLimit || 2}
        courseDuration={selectedCourse?.durationMinutes}
        questionLimit={selectedCourse?.questionLimit || 50}
        fullMarks={selectedCourse?.fullMarks}
        masteryQuestions={masteryQuestions}
        onClose={() => {
          setActiveQuiz(null);

          setReviewAttempt(null);

          setMasteryQuestions(null);

          window.location.reload();
        }}
      />
    );
  }

  const handleJoinStudyRoom = (course, initialEnrolled) => {
    const isPremium = course.isPremium ?? (Number(course.basePrice) > 0);

    const isEnrolled =
      !isPremium ||
      initialEnrolled ||
      enrolledCourseIds.includes(course.id) ||
      user?.enrolledCourses?.includes(course.id);

    if (!isEnrolled) {
      setPaymentCourse(course);

      setIsPaymentModalOpen(true);

      return;
    }

    setSelectedCourse({
      ...course,
      isEnrolled,
    });
  };
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row transition-colors duration-300">
      <div className="lg:hidden flex items-center justify-between p-4 bg-brand text-white sticky top-0 z-50">
        <Logo className="h-8" />
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-white/10 rounded-lg text-lg"
        >
          {isSidebarOpen ? "✕" : "☰"}
        </button>
      </div>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface border-r border-border p-8 flex flex-col transition-transform duration-500 lg:sticky lg:h-screen lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="hidden lg:flex items-center gap-3 mb-10 px-2">
          <Logo />
        </div>

        <nav className="space-y-1.5 flex-1 text-sm overflow-y-auto pr-2 custom-scrollbar">
          <SidebarBtn
            active={activeTab === "courses"}
            onClick={() => {
              setActiveTab("courses");
              setSidebarOpen(false);
            }}
            icon="📘"
            label="Study Hall"
          />
          <SidebarBtn
            active={activeTab === "my_courses"}
            onClick={() => {
              setActiveTab("my_courses");
              setSidebarOpen(false);
            }}
            icon="🎓"
            label="My Courses"
          />
          <SidebarBtn
            active={activeTab === "paths"}
            onClick={() => {
              setActiveTab("paths");
              setSidebarOpen(false);
            }}
            icon="🗺️"
            label="Learning Paths"
          />
          <Link
            href="/student/mistakes"
            className="w-full text-left p-4 rounded-2xl font-bold flex items-center justify-between transition-all duration-300 text-textSecondary hover:text-brand hover:bg-brand/5 group"
          >
            <div className="flex items-center gap-4">
              <span className="text-xl opacity-80 group-hover:scale-110 transition-transform">🧠</span>
              <span>Mistakes Drill</span>
            </div>
            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 text-[10px] font-black rounded-full uppercase tracking-wider">
              Spaced
            </span>
          </Link>
          <SidebarBtn
            active={activeTab === "progress"}
            onClick={() => {
              setActiveTab("progress");
              setSidebarOpen(false);
            }}
            icon="📈"
            label="Excellence Radar"
          />
          <SidebarBtn
            active={activeTab === "revision"}
            onClick={() => {
              setActiveTab("revision");
              setSidebarOpen(false);
            }}
            icon="📑"
            label="Saved Bookmarks"
          />
          {/* Rankings feature temporarily disabled as requested */}
          {/* <SidebarBtn
            active={activeTab === "leaderboard"}
            onClick={() => {
              setActiveTab("leaderboard");
              setSidebarOpen(false);
            }}
            icon="🏆"
            label="Rankings"
          /> */}
          <SidebarBtn
            active={activeTab === "notices"}
            onClick={() => {
              setActiveTab("notices");
              setSidebarOpen(false);
            }}
            icon="📣"
            label="Broadcasts"
          />
        </nav>

        <div className="mt-8 p-6 bg-background rounded-[2rem] border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center font-black text-white italic shadow-lg">
              {user.name?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="font-black text-textPrimary text-xs truncate uppercase tracking-tighter">
                {user.name}
              </p>
              <p className="text-[9px] font-bold text-textSecondary uppercase tracking-widest">
                Premium Learner
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-500 hover:text-white transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 lg:py-14">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{
                opacity: 0,
                x: 20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              exit={{
                opacity: 0,
                x: -20,
              }}
              transition={{
                duration: 0.4,
              }}
              className="space-y-12"
            >
              {activeTab === "courses" ? (
                <div className="space-y-12">
                  {/* 🚀 GRAND HERO BANNER */}
                  <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 text-white p-8 md:p-12 shadow-2xl border border-white/10">
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-black uppercase tracking-wider text-blue-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Next-Gen Smart LMS Active
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold">
                          <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/10 flex items-center gap-1.5">
                            <span>🔥</span>
                            <span>{user?.streak || 1} Day Streak</span>
                          </div>
                          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center gap-1.5">
                            <span>⚡</span>
                            <span>{user?.xp || 0} XP</span>
                          </div>
                        </div>
                      </div>

                      <div className="max-w-2xl space-y-2">
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                          Namaste, {user?.name || "Scholar"} 👋
                        </h1>
                        <p className="text-sm md:text-base text-blue-100/80 font-medium leading-relaxed">
                          Your comprehensive learning suite for Loksewa, Engineering (NEC), and Medical licensure. Master notes, conquer sequential chapters, and eliminate exam mistakes.
                        </p>
                      </div>

                      {/* ⚡ 4 PRIMARY ACTION LAUNCHPADS */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
                        <button
                          onClick={() => setActiveTab("paths")}
                          className="text-left p-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-sm transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl"
                        >
                          <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🗺️</div>
                          <h4 className="font-black text-sm text-white tracking-tight mb-1">Learning Roadmaps</h4>
                          <p className="text-[11px] text-blue-200/80 font-medium leading-normal mb-3">
                            Duolingo-style chapter gating. Read notes, test & unlock next modules.
                          </p>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 flex items-center gap-1">
                            Explore Paths →
                          </span>
                        </button>

                        <Link
                          href="/student/mistakes"
                          className="text-left p-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-sm transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl"
                        >
                          <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🧠</div>
                          <h4 className="font-black text-sm text-white tracking-tight mb-1">Mistakes Drill</h4>
                          <p className="text-[11px] text-blue-200/80 font-medium leading-normal mb-3">
                            Targeted spaced repetition drill on every MCQ you have ever failed.
                          </p>
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1">
                            Launch Drill →
                          </span>
                        </Link>

                        <button
                          onClick={() => {
                            if (courses.length > 0) {
                              const targetCourse = courses.find(c => enrolledCourseIds.includes(c.id)) || courses[0];
                              window.location.href = `/courses/${targetCourse.id}/cheat-sheet`;
                            } else {
                              setActiveTab("courses");
                            }
                          }}
                          className="text-left p-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-sm transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl"
                        >
                          <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📑</div>
                          <h4 className="font-black text-sm text-white tracking-tight mb-1">Revision Cheat-Sheet</h4>
                          <p className="text-[11px] text-blue-200/80 font-medium leading-normal mb-3">
                            Review all highlighted formulas, critical clauses and personal bookmarks.
                          </p>
                          <span className="text-[10px] font-black uppercase tracking-widest text-sky-300 flex items-center gap-1">
                            View Highlights →
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            const activeCourse = courses.find(c => enrolledCourseIds.includes(c.id)) || courses[0];
                            if (activeCourse) handleJoinStudyRoom(activeCourse, true);
                          }}
                          className="text-left p-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-sm transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl"
                        >
                          <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">⚡</div>
                          <h4 className="font-black text-sm text-white tracking-tight mb-1">Timed Mock Exam</h4>
                          <p className="text-[11px] text-blue-200/80 font-medium leading-normal mb-3">
                            Simulate real exam pressure with negative marking & instant analytics.
                          </p>
                          <span className="text-[10px] font-black uppercase tracking-widest text-rose-300 flex items-center gap-1">
                            Start Simulator →
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <NoticeBoard />

                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center gap-4 text-center sm:text-left">
                        <div className="text-2xl">⚠️</div>
                        <div>
                          <h4 className="text-sm font-black text-rose-600 uppercase tracking-tighter">Synchronization Conflict</h4>
                          <p className="text-[10px] font-bold text-rose-500/80 uppercase tracking-widest">{error}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => fetchData(true)}
                        className="px-6 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg"
                      >
                        Force Pipeline Reset
                      </button>
                    </div>
                  )}

                  {/* 🎓 QUICK ACCESS: My Enrolled Courses */}
                  {(enrolledCourseIds.length > 0 || (user?.enrolledCourses?.length || 0) > 0) && (
                    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-brand rounded-full"></div>
                          <div>
                            <h3 className="text-xl font-black text-textPrimary uppercase tracking-tighter">
                              My Active Courses
                            </h3>
                            <p className="text-xs text-textSecondary font-medium">Continue your structured chapter pathway or take timed mock tests</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab("my_courses")}
                          className="text-xs font-bold text-brand hover:underline"
                        >
                          View All ({enrolledCourseIds.length}) →
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses
                          .filter((c) => enrolledCourseIds.includes(c.id) || user?.enrolledCourses?.includes(c.id))
                          .map((course) => (
                            <div
                              key={`quick-${course.id}`}
                              className="bg-surface p-7 rounded-[2rem] shadow-sm border border-border flex flex-col justify-between group hover:shadow-xl hover:border-brand/30 transition-all h-full relative overflow-hidden"
                            >
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="w-12 h-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center text-xl font-black italic shadow-sm">
                                    {course.title?.charAt(0)}
                                  </div>
                                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-100">
                                    Enrolled
                                  </span>
                                </div>
                                <div>
                                  <h4 className="text-lg font-black text-textPrimary tracking-tight leading-snug group-hover:text-brand transition-colors line-clamp-2">
                                    {course.title}
                                  </h4>
                                  <p className="text-xs text-textSecondary line-clamp-2 mt-1 font-medium">
                                    {course.description || "Master syllabus with chapter notes and real-time mock sets."}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-6 pt-4 border-t border-border/50 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <Link
                                    href={`/courses/${course.id}/learn`}
                                    className="py-3 px-2 bg-brand text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-brand-accent transition-all shadow-md flex items-center justify-center gap-1 text-center"
                                  >
                                    🗺️ Roadmap & Notes
                                  </Link>
                                  <button
                                    onClick={() => handleJoinStudyRoom(course, true)}
                                    className="py-3 px-2 bg-surface border border-border text-textPrimary text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-brand/5 hover:border-brand transition-all flex items-center justify-center gap-1 text-center"
                                  >
                                    ⚡ Mock Exam
                                  </button>
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-bold text-textSecondary px-1 pt-1">
                                  <Link href={`/courses/${course.id}/notes`} className="hover:text-brand transition-colors">
                                    📖 Master Notes
                                  </Link>
                                  <span>•</span>
                                  <Link href={`/courses/${course.id}/cheat-sheet`} className="hover:text-brand transition-colors">
                                    📑 Revision Sheet
                                  </Link>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </section>
                  )}

                  {/* 🎯 SHADOW TRIAL FUNNEL — Free preview for unenrolled users */}
                  {trialCourses.length > 0 && (
                    <section className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-emerald-400 rounded-full"></div>
                        <div>
                          <h3 className="text-xl font-black text-textPrimary uppercase tracking-tighter">
                            Try Before You Commit
                          </h3>
                          <p className="text-xs text-textSecondary font-medium">
                            {trialCourses.length} free trial set{trialCourses.length > 1 ? 's' : ''} available · No payment needed
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {trialCourses.map((trial) => (
                          <TrialCourseCard
                            key={trial.trialId}
                            trial={trial}
                            onStartTrial={(tId) => setActiveQuiz(tId)}
                            onBuyPremium={(t) => {
                              const course = courses.find(c => c.id === t.parentCourseId);
                              if (course) { setPaymentCourse(course); setIsPaymentModalOpen(true); }
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="space-y-16">
                    {Object.entries(
                      courses.reduce((acc, course) => {
                        let cat = (course.category || "General Curriculum").trim();
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(course);
                        return acc;
                      }, {})
                    ).sort((a, b) => a[0].localeCompare(b[0])).map(([category, catCourses]) => (
                      <div key={category} className="space-y-8">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-slate-200 rounded-full"></div>
                          <h3 className="text-xl font-black text-textPrimary uppercase tracking-tighter">
                            {category}
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                          {catCourses.map((course) => (
                            <CourseCard
                              key={course.id}
                              course={course}
                              providedEnrolled={enrolledCourseIds.includes(course.id)}
                              onLaunch={handleJoinStudyRoom}
                              onUnlock={(c) => {
                                setPaymentCourse(c);
                                setIsPaymentModalOpen(true);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                    {courses.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center p-10 bg-surface rounded-[3rem] border-2 border-dashed border-border">
                        <div className="text-5xl opacity-20 mb-4">📂</div>
                        <h2 className="text-xl font-bold text-textPrimary">No Active Enrollments</h2>
                        <p className="text-textSecondary font-medium mt-2">Visit the course catalog to get started.</p>
                        <button onClick={() => fetchData(true)} className="mt-6 px-6 py-3 bg-brand/10 text-brand rounded-xl font-black uppercase tracking-widest text-xs hover:bg-brand hover:text-white transition-all shadow-sm">
                          Retry Sync
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === "my_courses" ? (
                <div className="space-y-10">
                  <header>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/10 text-brand rounded-full text-xs font-black uppercase tracking-wider mb-2">
                      🎓 Active Enrollments
                    </div>
                    <h2 className="text-4xl font-black text-textPrimary tracking-tighter">
                      My Learning Hub
                    </h2>
                    <p className="text-textSecondary font-medium mt-1">
                      Pick up right where you left off. Access your structured chapter paths or timed mock tests.
                    </p>
                  </header>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses
                      .filter((c) => enrolledCourseIds.includes(c.id) || user?.enrolledCourses?.includes(c.id))
                      .sort((a, b) => (a.title || "").localeCompare(b.title || ""))
                      .map((course) => (
                        <div
                          key={course.id}
                          className="bg-surface p-7 rounded-[2rem] shadow-sm border border-border flex flex-col justify-between group hover:shadow-xl hover:border-brand/30 transition-all h-full relative"
                        >
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="w-12 h-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center text-xl font-black italic shadow-sm">
                                {course.title?.charAt(0)}
                              </div>
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-100">
                                Active Pass
                              </span>
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-textPrimary tracking-tight leading-snug group-hover:text-brand transition-colors line-clamp-2">
                                {course.title}
                              </h4>
                              <p className="text-xs text-textSecondary line-clamp-2 mt-1 font-medium">
                                {course.description || "Master your syllabus with chapter notes and real-time mock sets."}
                              </p>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-border/50 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Link
                                href={`/courses/${course.id}/learn`}
                                className="py-3 px-2 bg-brand text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-brand-accent transition-all shadow-md flex items-center justify-center gap-1 text-center"
                              >
                                🗺️ Roadmap & Notes
                              </Link>
                              <button
                                onClick={() => handleJoinStudyRoom(course, true)}
                                className="py-3 px-2 bg-surface border border-border text-textPrimary text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-brand/5 hover:border-brand transition-all flex items-center justify-center gap-1 text-center"
                              >
                                ⚡ Mock Exam
                              </button>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-textSecondary px-1 pt-1">
                              <Link href={`/courses/${course.id}/notes`} className="hover:text-brand transition-colors">
                                📖 Master Notes
                              </Link>
                              <span>•</span>
                              <Link href={`/courses/${course.id}/cheat-sheet`} className="hover:text-brand transition-colors">
                                📑 Revision Sheet
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}

                    {courses.filter((c) => enrolledCourseIds.includes(c.id) || user?.enrolledCourses?.includes(c.id)).length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center p-12 bg-surface rounded-[2.5rem] border-2 border-dashed border-border text-center space-y-3">
                        <div className="text-5xl">📚</div>
                        <h3 className="text-lg font-black text-textPrimary">No Enrolled Courses Yet</h3>
                        <p className="text-xs text-textSecondary font-medium max-w-sm">
                          Explore our comprehensive course catalog in the Study Hall and unlock your targeted exam curriculum.
                        </p>
                        <button
                          onClick={() => setActiveTab("courses")}
                          className="mt-2 px-6 py-3 bg-brand text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:bg-brand-accent transition-all"
                        >
                          Browse Study Hall →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === "paths" ? (
                <div className="space-y-10">
                  <header>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-xs font-black uppercase tracking-wider mb-2">
                      🗺️ Sequential Mastery
                    </div>
                    <h2 className="text-4xl font-black text-textPrimary tracking-tighter">
                      Learning Roadmaps
                    </h2>
                    <p className="text-textSecondary font-medium mt-1">
                      Read curated chapter notes, test comprehension with instant feedback, score 60%+ to unlock sequential chapters, and reach 100% exam readiness.
                    </p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => {
                      const isEnrolled = enrolledCourseIds.includes(course.id) || user?.enrolledCourses?.includes(course.id);
                      return (
                        <div
                          key={`path-${course.id}`}
                          className="bg-surface p-7 rounded-[2rem] shadow-sm border border-border flex flex-col justify-between group hover:shadow-xl hover:border-emerald-500/30 transition-all h-full"
                        >
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center text-xl font-black italic shadow-sm">
                                🗺️
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                isEnrolled 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                                {isEnrolled ? "Unlocked" : "Preview Available"}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-textPrimary tracking-tight leading-snug group-hover:text-emerald-600 transition-colors line-clamp-2">
                                {course.title}
                              </h4>
                              <p className="text-xs text-textSecondary line-clamp-2 mt-1 font-medium">
                                Step-by-step chapter gating with in-note text highlights, formula bookmarks, and chapter practice quizzes.
                              </p>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-border/50 space-y-2">
                            <Link
                              href={`/courses/${course.id}/learn`}
                              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 text-center"
                            >
                              <span>🚀</span> Launch Learning Roadmap →
                            </Link>
                            <div className="flex items-center justify-between text-[10px] font-bold text-textSecondary px-1 pt-1">
                              <Link href={`/courses/${course.id}/notes`} className="hover:text-emerald-600 transition-colors">
                                📖 Handbook Notes
                              </Link>
                              <span>•</span>
                              <Link href={`/courses/${course.id}/cheat-sheet`} className="hover:text-emerald-600 transition-colors">
                                📑 Cheat-Sheet
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : activeTab === "progress" ? (
                <div className="space-y-12">
                  <header>
                    <h2 className="text-4xl font-black text-textPrimary tracking-tighter">
                      Performance Analytics
                    </h2>
                    <p className="text-textSecondary font-medium mt-2">
                      Multi-dimensional analysis of your subject-wise
                      proficiency.
                    </p>
                  </header>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="bg-surface p-10 rounded-[3rem] border border-border shadow-xl shadow-slate-100 min-h-[450px] flex flex-col">
                      <h4 className="text-xl font-black text-textPrimary mb-8 italic">
                        Performance Radar
                      </h4>
                      <div className="flex-1 min-h-[300px]">
                        {stats.radarData.length > 2 ? (
                          <ResponsiveContainer width="99%" height="100%">
                            {isRadarReady ? (
                              <RadarChart
                                cx="50%"
                                cy="50%"
                                outerRadius="80%"
                                data={stats.radarData}
                              >
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis
                                  dataKey="subject"
                                  tick={{
                                    fill: "#64748b",
                                    fontSize: 8,
                                    fontWeight: 900,
                                    textTransform: "uppercase",
                                  }}
                                />
                                <PolarRadiusAxis
                                  angle={90}
                                  domain={[0, 100]}
                                  tick={{
                                    fill: "#94a3b8",
                                    fontSize: 8,
                                  }}
                                  axisLine={false}
                                  tickCount={6}
                                />
                                <Radar
                                  name="Current Level"
                                  dataKey="A"
                                  stroke="#3b82f6"
                                  fill="#3b82f6"
                                  fillOpacity={0.4}
                                />
                              </RadarChart>
                            ) : (
                              <div className="h-full flex items-center justify-center animate-pulse">
                                <div className="w-8 h-8 border-2 border-t-brand rounded-full animate-spin"></div>
                              </div>
                            )}
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8 grayscale opacity-50 space-y-4">
                            <div className="text-4xl">📡</div>
                            <p className="text-xs font-bold text-textSecondary">
                              Not enough data to triangulate your performance.{" "}
                              <br />
                              Complete 3 or more mock tests.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <AnalyticsStat
                          label="Global Percentile"
                          value={stats.percentile}
                          sub={`Top ${100 - parseInt(stats.percentile)}% of candidates`}
                          icon="⚡"
                        />
                        <AnalyticsStat
                          label="Average Pacing"
                          value={stats.pacing}
                          sub="Time per question"
                          icon="⏱️"
                        />
                      </div>

                      <div
                        className={`p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all duration-500 ${stats.mastery.length > 0 && stats.mastery[stats.mastery.length - 1].score < 30 ? "bg-rose-900 ring-4 ring-rose-500/20" : "bg-textPrimary"}`}
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/20 rounded-full blur-3xl"></div>
                        <div className="relative z-10 space-y-5">
                          <div className="flex justify-between items-center">
                            <div className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                              Prescriptive Insight
                            </div>
                            <span className="text-[10px] bg-brand text-white px-2 py-0.5 rounded-full font-black animate-pulse">
                              Performance Insights
                            </span>
                          </div>
                          <h4 className="text-2xl font-black leading-tight italic text-white">
                            {stats.mastery.length === 0 ? (
                              "Initiate your first diagnostic mock to generate your Performance Profile."
                            ) : parseInt(stats.accuracy) > 85 ? (
                              "Outstanding consistency detected. You are ready for the Final Mocks. Maintain this momentum."
                            ) : (
                              <>
                                Your immediate focus should be{" "}
                                <span className="text-blue-400 underline decoration-2">
                                  {
                                    stats.mastery[stats.mastery.length - 1]
                                      ?.name
                                  }
                                </span>
                                . You are at{" "}
                                {stats.mastery[stats.mastery.length - 1]?.score}
                                %. Review mistakes to balance your shape.
                              </>
                            )}
                          </h4>
                          <button
                            onClick={() => {
                              if (stats.mastery.length > 0)
                                setActiveTab("revision");
                              else setSidebarOpen(true);
                            }}
                            className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl transition-all text-xs uppercase tracking-widest border border-white/5"
                          >
                            {stats.mastery.length === 0
                              ? "Select Course"
                              : "Review Targeted Mistakes →"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface p-10 rounded-[3rem] border border-border space-y-8">
                    <h4 className="text-xl font-black text-textPrimary">
                      Detailed Subject Mastery
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                      {stats.mastery.map((m) => (
                        <div key={m.name} className="space-y-3">
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-black text-textSecondary uppercase tracking-widest">
                              {m.name}
                            </span>
                            <span className="text-lg font-black text-brand italic leading-none">
                              {m.score}%
                            </span>
                          </div>
                          <div className="h-2.5 bg-background rounded-full overflow-hidden">
                            <motion.div
                              initial={{
                                width: 0,
                              }}
                              animate={{
                                width: `${m.score}%`,
                              }}
                              transition={{
                                duration: 1.5,
                                ease: "easeOut",
                              }}
                              className="h-full bg-gradient-to-r from-brand to-indigo-400 rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeTab === "revision" ? (
                <MistakeBank
                  user={user}
                  attempts={attempts}
                  onReview={setReviewAttempt}
                  onStartPractice={setActiveQuiz}
                  onStartMastery={setMasteryQuestions}
                />
              ) : activeTab === "leaderboard" ? (
                <div className="p-16 text-center bg-surface rounded-[2.5rem] border border-border space-y-4">
                  <div className="text-4xl">🏆</div>
                  <h3 className="text-xl font-black text-textPrimary">Rankings are Under Maintenance</h3>
                  <p className="text-sm text-textSecondary max-w-md mx-auto">
                    The national rankings algorithm is currently being calibrated with new weighting metrics. Check back soon!
                  </p>
                </div>
              ) : (
                <NoticeBoard fullScreen />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {selectedCourse && (
        <StudyRoom
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onStartQuiz={setActiveQuiz}
          setRestrictedModalOpen={setRestrictedModalOpen}
          allSubjects={subjects}
          allQuizzes={quizzes}
          allMaterials={materials}
          loading={loading}
          fetchData={fetchData}
          loadTimeout={loadTimeout}
        />
      )}

      <RestrictedAccessModal
        isOpen={isRestrictedModalOpen}
        onClose={() => setRestrictedModalOpen(false)}
        courseTitle={selectedCourse?.title}
      />
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        course={paymentCourse}
      />

      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full overflow-hidden text-center"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />
              <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6 text-rose-500 border border-rose-500/20 animate-bounce">
                ⚠️
              </div>
              <h3 className="text-2xl font-black text-textPrimary tracking-tight">
                Confirm Sign Out
              </h3>
              <p className="text-sm font-semibold text-textSecondary mt-3 leading-relaxed">
                Are you sure you want to end your active session? Any unsaved progress will be lost.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-8">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] text-textSecondary font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all cursor-pointer border border-border"
                >
                  Cancel
                </button>
                <button
                  onClick={logout}
                  className="px-6 py-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-rose-600/20"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnalyticsStat({ label, value, sub, icon }) {
  return (
    <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm space-y-1">
      <div className="flex justify-between items-start">
        <span className="text-[9px] font-black text-textSecondary uppercase tracking-widest">
          {label}
        </span>
        <span className="text-lg opacity-40">{icon}</span>
      </div>
      <h4 className="text-3xl font-black text-textPrimary tracking-tighter">
        {value}
      </h4>
      <p className="text-[9px] font-bold text-textSecondary italic mt-1">
        {sub}
      </p>
    </div>
  );
}

function SidebarBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl font-bold flex items-center gap-4 transition-all duration-300 ${active ? "bg-brand text-white shadow-lg shadow-brand/20" : "text-textSecondary hover:text-brand hover:bg-brand/5"}`}
    >
      <span className={`text-xl ${active ? "opacity-100" : "opacity-40"}`}>
        {icon}
      </span>{" "}
      {label}
    </button>
  );
}

function NoticeBoard({ fullScreen }) {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "siteNotifications"),
      orderBy("timestamp", "desc"),
      limit(10),
    );

    return onSnapshot(q, (snap) =>
      setNotices(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
      ),
    );
  }, []);

  if (notices.length === 0 && !fullScreen) return null;

  return (
    <div className={`space-y-4 ${fullScreen ? "p-10" : "mb-12"}`}>
      {!fullScreen && (
        <h4 className="text-[9px] font-black text-textSecondary uppercase tracking-widest mb-4">
          Urgent Broadcasts
        </h4>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notices.map((n) => (
          <div
            key={n.id}
            className="p-6 bg-surface rounded-[2rem] border border-border shadow-sm flex items-start gap-4 hover:border-brand transition-all cursor-default group"
          >
            <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform tracking-tight shadow-sm">
              💡
            </div>
            <div>
              <div className="font-black text-textPrimary uppercase tracking-tighter text-xs">
                {n.title}
              </div>
              <p className="text-[10px] text-textSecondary italic mt-1 line-clamp-2">
                {n.body}
              </p>
            </div>
          </div>
        ))}

        {notices.length === 0 && fullScreen && (
          <div className="col-span-full py-20 text-center text-textSecondary font-bold italic">
            No active broadcasts at this time.
          </div>
        )}
      </div>
    </div>
  );
}

function MistakeBank({
  user,
  attempts,
  onReview,
  onStartPractice,
  onStartMastery,
}) {
  const [viewMode, setViewMode] = useState('mistakes');
  const [mistakes, setMistakes] = useState([]);
  const [marked, setMarked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuizId, setSelectedQuizId] = useState('all');
  const [isClearing, setIsClearing] = useState(false);
  const [selectedMarkedIds, setSelectedMarkedIds] = useState([]);

  const fetchRevisionData = async () => {
    try {
      // IMPORTANT: user in context is a plain object (no getIdToken).
      // Must use auth.currentUser which is the real Firebase Auth user.
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        console.error('No Firebase auth user found');
        setLoading(false);
        return;
      }
      const token = await firebaseUser.getIdToken();
      
      const promises = [
        fetch('/api/student/mistakes', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
      ];
      
      if (user.savedQuestions && user.savedQuestions.length > 0) {
        promises.push(
          fetch('/api/student/marked', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ questionIds: user.savedQuestions })
          }).then(res => res.json())
        );
      }
      
      const results = await Promise.allSettled(promises);
        
      if (results[0] && results[0].status === 'fulfilled' && results[0].value.mistakes) {
        setMistakes(results[0].value.mistakes);
      } else if (results[0] && results[0].status === 'rejected') {
        console.error("Mistakes fetch failed", results[0].reason);
      }
      
      if (promises.length > 1 && results[1]) {
        if (results[1].status === 'fulfilled' && results[1].value.questions) {
          setMarked(results[1].value.questions);
        } else if (results[1].status === 'rejected') {
          console.error("Marked fetch failed", results[1].reason);
        }
      }
      
    } catch (err) {
      console.error("Failed to fetch revision data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchRevisionData();
  }, [user, user?.savedQuestions]);

  useEffect(() => {
    setSelectedMarkedIds([]);
  }, [viewMode]);

  const handleUnmarkSingle = async (questionId) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        savedQuestions: arrayRemove(questionId)
      });
      setSelectedMarkedIds(prev => prev.filter(id => id !== questionId));
      setMarked(prev => prev.filter(m => m.id !== questionId));
    } catch (err) {
      console.error("Failed to unmark question:", err);
      alert("Failed to unmark bookmark.");
    }
  };

  const handleUnmarkMultiple = async () => {
    if (selectedMarkedIds.length === 0) return;
    if (!confirm(`Are you sure you want to unmark the ${selectedMarkedIds.length} selected bookmarks?`)) return;

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        savedQuestions: arrayRemove(...selectedMarkedIds)
      });
      setMarked(prev => prev.filter(m => !selectedMarkedIds.includes(m.id)));
      setSelectedMarkedIds([]);
    } catch (err) {
      console.error("Failed to unmark questions:", err);
      alert("Failed to unmark selected bookmarks.");
    }
  };

  const activeData = viewMode === 'mistakes' ? mistakes : marked;

  const uniqueSets = useMemo(() => {
    const sets = new Map();
    activeData.forEach(m => {
      if (m.quizId) {
        sets.set(String(m.quizId), m.setTitle);
      }
    });
    return Array.from(sets.entries()).map(([id, title]) => ({ id, title }));
  }, [activeData]);

  const filteredData = useMemo(() => {
    if (selectedQuizId === 'all') return activeData;
    return activeData.filter(m => String(m.quizId) === String(selectedQuizId));
  }, [activeData, selectedQuizId]);

  const handleClearReview = async () => {
    if (viewMode !== 'mistakes') return;
    if (selectedQuizId === 'all') {
      alert("Please select a specific set to clear review.");
      return;
    }
    
    const setTitle = uniqueSets.find(s => s.id === selectedQuizId)?.title || "this set";
    if (!confirm(`Are you sure you want to clear all pending mistakes for ${setTitle}? This action cannot be undone.`)) return;

    setIsClearing(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Not authenticated');
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`/api/student/mistakes?quizId=${selectedQuizId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchRevisionData();
        setSelectedQuizId('all');
      } else {
        throw new Error("Failed to clear mistakes");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsClearing(false);
    }
  };

  const launchMistakePractice = () => {
    if (filteredData.length === 0)
      return alert("No data found for the selected filter.");

    const masterySet = filteredData.map((m) => ({
      id: m.id,
      questionId: m.questionId || m.id,
      questionText: m.questionText,
      questionImage: m.questionImage || null,
      options: m.options || [],
      correctOptionIndex: m.correctOptionIndex ?? 0,
      explanationText: m.explanationText || m.rationale || "",
      topic: m.setTitle || "Mastery Review",
      isMastery: true,
    }));

    onStartMastery(masterySet);
  };

  if (loading) {
    return (
      <div className="p-20 text-center animate-pulse text-textSecondary font-black uppercase tracking-widest">
        Syncing Revision Vault...
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-textPrimary tracking-tighter">
            Revision <br />
            Vault
          </h2>
          <p className="text-textSecondary font-medium mt-2">
            Every error is a chance to upgrade your intelligence. Mastery starts
            here.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-border pb-6">
          <div className="flex gap-2 p-1.5 bg-surface border border-border rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => { setViewMode('mistakes'); setSelectedQuizId('all'); }}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                viewMode === 'mistakes'
                  ? 'bg-rose-500/10 text-rose-600 shadow-sm border border-rose-500/20'
                  : 'text-textSecondary hover:bg-black/5 hover:text-textPrimary'
              }`}
            >
              Mistakes ({mistakes.length})
            </button>
            <button
              onClick={() => { setViewMode('marked'); setSelectedQuizId('all'); }}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                viewMode === 'marked'
                  ? 'bg-amber-500/10 text-amber-600 shadow-sm border border-amber-500/20'
                  : 'text-textSecondary hover:bg-black/5 hover:text-textPrimary'
              }`}
            >
              Bookmarked ({marked.length})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {viewMode === 'marked' && selectedMarkedIds.length > 0 && (
              <button
                onClick={handleUnmarkMultiple}
                className="px-8 py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/10 text-[10px] uppercase tracking-widest"
              >
                Unmark Selected ({selectedMarkedIds.length})
              </button>
            )}

            {viewMode === 'mistakes' && selectedQuizId !== 'all' && (
              <button
                onClick={handleClearReview}
                disabled={isClearing}
                className="px-8 py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/10 text-[10px] uppercase tracking-widest disabled:opacity-50"
              >
                {isClearing ? "Clearing..." : "Submit Review"}
              </button>
            )}
          </div>
        </div>
      </header>

      {viewMode === 'marked' && filteredData.length > 0 && (
        <div className="flex items-center justify-between bg-surface p-6 rounded-3xl border border-border shadow-sm">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filteredData.length > 0 && filteredData.every(m => selectedMarkedIds.includes(m.id))}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedMarkedIds(filteredData.map(m => m.id));
                } else {
                  setSelectedMarkedIds([]);
                }
              }}
              className="w-5 h-5 rounded border-border text-brand focus:ring-brand cursor-pointer"
            />
            <span className="text-xs font-black text-textPrimary uppercase tracking-widest">
              Select All Bookmarks ({filteredData.length})
            </span>
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {filteredData.length === 0 ? (
          <div className="p-20 bg-surface rounded-[3rem] border-2 border-dashed border-border text-center">
             <div className="text-6xl mb-6">🎯</div>
             <h3 className="text-2xl font-black text-textPrimary tracking-tight">Vault Clear!</h3>
             <p className="text-textSecondary text-sm font-medium">No items found for this selection.</p>
          </div>
        ) : (
          filteredData.map((m) => (
            <div
              key={m.id}
              className="bg-surface p-8 rounded-[2.5rem] border border-border shadow-sm transition-all group hover:border-brand/50"
            >
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                {viewMode === 'marked' && (
                  <div className="pt-1 select-none">
                    <input
                      type="checkbox"
                      checked={selectedMarkedIds.includes(m.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMarkedIds(prev => [...prev, m.id]);
                        } else {
                          setSelectedMarkedIds(prev => prev.filter(id => id !== m.id));
                        }
                      }}
                      className="w-5 h-5 rounded border-border text-brand focus:ring-brand cursor-pointer"
                    />
                  </div>
                )}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-brand uppercase tracking-widest bg-brand/10 px-3 py-1 rounded-full border border-brand/20">
                        {m.setTitle || "General Knowledge"}
                      </span>
                      {viewMode === 'mistakes' && (
                        <span className="text-[9px] font-bold text-textSecondary uppercase tracking-widest">
                          {new Date(m.lastIncorrectAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {viewMode === 'marked' && (
                      <button
                        onClick={() => handleUnmarkSingle(m.id)}
                        className="text-textSecondary hover:text-rose-500 p-2 rounded-xl hover:bg-rose-500/10 transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider"
                        title="Unmark Bookmark"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Unmark</span>
                      </button>
                    )}
                  </div>
                  <FormattedQuestionText text={m.questionText} size="base" />

                  <div className="grid grid-cols-1 gap-3 pt-2">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">
                        Verified Correct Answer
                      </p>
                      <p className="text-xs font-bold text-emerald-700 font-nepali">
                        {m.options[m.correctOptionIndex] || "Answer Key"}
                      </p>
                    </div>
                    {m.explanationText && (
                       <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                          <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">
                            Educational Rationale
                          </p>
                          <div className="text-xs font-medium text-blue-700 font-nepali leading-relaxed space-y-2">
                            {m.explanationText.split('\n').map((line, idx) => (
                              <p key={idx}>{line.replace(/\*\*/g, '')}</p>
                            ))}
                          </div>
                       </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-5 bg-background rounded-2xl border border-border md:max-w-xs w-full">
                  <p className="text-xs text-textSecondary italic leading-relaxed">
                    <span className="text-brand font-black not-italic">
                      💡 Hint:
                    </span>{" "}
                    {m.rationale ||
                      m.explanationText ||
                      "Scientific verification of this logic segment is being processed."}
                  </p>
                </div>
              </div>
            </div>
        )))}
      </div>
    </div>
  );
}

function Leaderboard({ currentUserId }) {
  const [rankings, setRankings] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const data = await res.json();
          setRankings(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const maskName = (name, isCurrentUser) => {
    if (!name) return "Unknown User";

    if (isCurrentUser) return name;

    return name
      .split(" ")
      .map((word) => word[0] + "*".repeat(Math.max(word.length - 1, 3)))
      .join(" ");
  };
  if (loading)
    return (
      <div className="p-20 text-center animate-pulse text-textSecondary font-black uppercase tracking-widest">
        Compiling Global Rankings...
      </div>
    );

  return (
    <div className="space-y-12">
      <header>
        <h2 className="text-4xl font-black text-textPrimary tracking-tighter italic">
          Global <span className="text-brand">Standings</span> 🏆
        </h2>
      </header>
      <div className="bg-surface rounded-[3rem] border border-border shadow-2xl overflow-hidden">
        {rankings.map((r, i) => (
          <div
            key={r.uid}
            className={`flex items-center justify-between p-8 border-b border-border ${r.uid === currentUserId ? "bg-brand/5 border-l-8 border-l-brand" : ""}`}
          >
            <div className="flex items-center gap-6">
              <span
                className={`text-2xl font-black italic ${i < 3 ? "text-brand" : "text-textSecondary"}`}
              >
                {i + 1}
              </span>
              <div>
                <p className="font-black text-textPrimary text-lg uppercase tracking-tighter">
                  {maskName(r.name, r.uid === currentUserId)}
                </p>
                {r.uid === currentUserId && (
                  <p className="text-[9px] font-black text-brand uppercase tracking-[0.2em] mt-1">
                    That's You
                  </p>
                )}
              </div>
            </div>
            <div className="text-3xl font-black text-textPrimary italic">
              {(r.xp || 0).toFixed(0)}
              <span className="text-[10px] uppercase text-textSecondary not-italic ml-1">
                XP
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudyRoom({ course, onClose, onStartQuiz, setRestrictedModalOpen, allSubjects, allQuizzes, allMaterials, loading, fetchData, loadTimeout }) {
  const [searchTerm, setSearchTerm] = useState("");

  const subjects = (allSubjects || [])
    .filter(s => s.courseId === course.id && (s.active === 1 || s.active === true))
    .sort((a, b) => (a.title || a.name || "").localeCompare(b.title || b.name || ""));

  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      className="fixed inset-0 bg-textPrimary/70 backdrop-blur-md z-50 flex justify-end"
    >
      <motion.div
        initial={{
          x: "100%",
        }}
        animate={{
          x: 0,
        }}
        className="w-full max-w-2xl bg-background h-full shadow-2xl flex flex-col border-l border-border"
      >
        <header className="p-8 border-b border-border space-y-6 bg-surface">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-5 h-12 flex items-center justify-center gap-2 rounded-2xl bg-surface text-textSecondary border border-border hover:text-brand hover:border-brand transition-all shadow-sm font-bold uppercase tracking-widest text-xs"
            >
              <span>←</span> Back to Courses
            </button>
            <div className="text-right">
              <h4 className="text-xl font-black text-textPrimary tracking-tight leading-none">
                {course.title}
              </h4>
              <p className="text-[9px] font-black text-brand uppercase tracking-[0.2em] mt-1">
                Active Curriculum Stream
              </p>
            </div>
          </div>

          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none group-focus-within:text-brand transition-colors">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search specifically for a set (e.g. Set 45)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-4 pl-12 bg-background border-2 border-border rounded-[1.5rem] outline-none focus:border-brand font-bold text-textPrimary transition-all shadow-sm"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
          {loading || !subjects ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 p-6 text-center">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
              <p className="text-lg font-medium animate-pulse">
                {loadTimeout ? "Curriculum pipeline sync is taking longer than usual..." : "Curriculum pipeline initialization pending..."}
              </p>
              <p className="text-sm mt-2">
                {loadTimeout ? "We're attempting a secure fallback connection." : "Connecting to secure data nodes..."}
              </p>
              {loadTimeout && (
                <button 
                  onClick={() => fetchData(true)}
                  className="mt-6 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors border border-blue-500/30 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Connection
                </button>
              )}
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 grayscale opacity-30">
              <div className="text-7xl">🏗️</div>
              <div className="space-y-2">
                <h5 className="text-xl font-black text-textPrimary uppercase">
                  Under Construction
                </h5>
                <p className="text-xs font-bold text-textSecondary max-w-[220px]">
                  Educators are finalizing this track. Check back in 24 hours.
                </p>
              </div>
            </div>
          ) : (
            subjects.map((sub) => (
              <SubjectItem
                key={sub.id}
                subject={sub}
                searchTerm={searchTerm}
                onStartQuiz={onStartQuiz}
                isParentEnrolled={course.isEnrolled}
                onRestrictedClick={() => setRestrictedModalOpen(true)}
                parentCourse={course}
                allQuizzes={allQuizzes}
                allMaterials={allMaterials}
              />
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SubjectItem({
  subject,
  searchTerm,
  onStartQuiz,
  isParentEnrolled,
  onRestrictedClick,
  parentCourse,
  allQuizzes,
  allMaterials,
}) {
  const quizzes = (allQuizzes || [])
    .filter(q => q.subjectId === subject.id)
    .sort((a, b) => {
        if (a.globalOrder !== undefined && b.globalOrder !== undefined && a.globalOrder !== b.globalOrder) {
          return a.globalOrder - b.globalOrder;
        }
        if (a.createdAt && b.createdAt) {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
        return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
      });

  const materials = (allMaterials || []).filter(m => m.subjectId === subject.id);

  const filteredQuizzes = quizzes.filter((q) =>
    q.title?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (searchTerm && filteredQuizzes.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="w-1.5 h-6 bg-brand rounded-full"></span>
        <h5 className="text-xl font-black text-textPrimary uppercase tracking-tighter italic">
          {subject.title}
        </h5>
      </div>

      {!searchTerm && materials.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {materials.map((mat) => (
            <button
              key={mat.id}
              onClick={() => window.open(mat.fileUrl || mat.url, "_blank")}
              className="p-4 rounded-2xl bg-surface border border-border text-[10px] font-black uppercase text-textSecondary text-left hover:border-brand transition-all group flex items-center justify-between"
            >
              <span>
                {mat.type === "youtube" ? "🎥" : "📄"}
                {mat.title}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-all">
                →
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredQuizzes.map((quiz, index) => {
          const isAccessible = quiz.isFreeTrial || isParentEnrolled;

          const setNumber = quizzes.indexOf(quiz) + 1;

          return (
            <button
              key={quiz.id}
              onClick={() =>
                isAccessible ? onStartQuiz(quiz.id) : onRestrictedClick()
              }
              className={`p-5 rounded-[2rem] flex flex-col justify-between text-left transition-all group relative overflow-hidden border-2 ${isAccessible ? "bg-surface border-border hover:border-brand hover:shadow-xl hover:shadow-brand/5" : "bg-background border-transparent grayscale opacity-50 cursor-not-allowed"}`}
            >
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between items-start">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${isAccessible ? "bg-brand text-white" : "bg-background text-textSecondary"}`}
                  >
                    {isAccessible ? "✓" : "🔒"}
                  </div>
                  {quiz.isFreeTrial && (
                    <span className="text-[8px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">
                      Free Trial
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-black text-xs uppercase tracking-tight text-textPrimary block group-hover:text-brand transition-colors leading-tight">
                    Set {setNumber}: {quiz.title}
                  </span>
                  <p className="text-[9px] font-bold text-textSecondary uppercase tracking-widest mt-1">
                    {quiz.questionCount || parentCourse?.questionLimit || 50}
                    Questions • {quiz.timeLimit || parentCourse?.durationMinutes || 45} Mins
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center relative z-10">
                <span
                  className={`text-[9px] font-black uppercase tracking-widest transition-all ${isAccessible ? "text-brand opacity-60 group-hover:opacity-100" : "text-textSecondary"}`}
                >
                  {isAccessible ? "Launch Exam" : "Locked"}
                </span>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isAccessible ? "bg-textPrimary text-white group-hover:scale-110" : "bg-background text-textSecondary"}`}
                >
                  →
                </div>
              </div>

              {isAccessible && (
                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-brand/5 rounded-full blur-2xl group-hover:bg-brand/10 transition-colors" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();

      const distance = new Date(targetDate).getTime() - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft("EXPIRED");
        return;
      }

      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="text-sm font-black text-orange-600 font-mono tracking-tighter">
      {timeLeft}
    </div>
  );
}
