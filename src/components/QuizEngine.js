"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

import { db, auth } from "../utils/firebase";
import {
  collection,
  addDoc,
  doc as fireDoc,
  getDoc as getFireDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  serverTimestamp,
  increment,
} from "firebase/firestore";

import { useAuth } from "@/context/AuthContext";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

import BrandName from "./BrandName";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  Target, 
  Sparkles, 
  Lightbulb, 
  Quote, 
  ShieldCheck, 
  Workflow, 
  Info,
  CheckCircle2,
  XCircle,
  Bookmark,
  AlertTriangle,
  ArrowRight,
  Shield,
  List,
  Clock,
  ArrowLeft
} from "lucide-react";

export default function QuizEngine({
  quizId,
  onClose,
  reviewMode = null,
  attemptLimit = 2,
  courseDuration,
  questionLimit,
  fullMarks = null,
  masteryQuestions = null,
}) {
  const isMasteryMode = !!masteryQuestions;

  const { user, darkMode, toggleDarkMode, mounted } = useAuth();

  const [quiz, setQuiz] = useState(null);

  const [questions, setQuestions] = useState([]);

  const [answers, setAnswers] = useState(reviewMode?.answers || {});

  const [markedForReview, setMarkedForReview] = useState({});

  const [submitted, setSubmitted] = useState(!!reviewMode);

  const [isAttemptLocked, setIsAttemptLocked] = useState(false);

  const [score, setScore] = useState(reviewMode?.finalScore || 0);

  const [stats, setStats] = useState(
    reviewMode?.stats || {
      correct: 0,
      wrong: 0,
      skipped: 0,
    },
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isReady, setIsReady] = useState(false);

  // For Recharts dimension delay // Navigation State
const [currentIdx, setCurrentIdx] = useState(0);

  const [isReporting, setIsReporting] = useState(false);

  const [reportComment, setReportComment] = useState("");

  const [isReportSubmitting, setIsReportSubmitting] = useState(false);

  const [isQuestionMapOpen, setIsQuestionMapOpen] = useState(false);

  // Timer State
const [timeLeft, setTimeLeft] = useState(2700);

  const timerRef = useRef(null);

  useEffect(() => {
    // MASTERY MODE: Skip quiz fetch, use provided questions directly
if (isMasteryMode)
    {
      setQuiz({
        title: "Mastery Mode",
        setTitle: "Mistake Vault Review",
        durationMinutes: 45,
      });

      const initializeMastery = async () => {
        try {
          const enriched = await Promise.all(
            masteryQuestions.map(async (m) => {
              // If options exist, use as is (Snapshot optimization)
if (m.options && m.options.length > 0)
              return m;

              // Fallback: Fetch from master curriculum
 // if snapshot is missing options (Legacy support)
const qRef = fireDoc(db, "questions", m.questionId || m.id);

              const qSnap = await getFireDoc(qRef);

              if (qSnap.exists()) {
                const qData = qSnap.data();

                return {
                  ...m,
                  options: qData.options || [],
                  questionImage: qData.questionImage || null,
                  explanationText:
                    qData.explanationText ||
                    qData.explanation ||
                    m.explanationText,
                };
              }

              return m;
            }),
          );

          setQuestions(enriched);

          if (enriched.length > 0) {
            setTimeLeft(Math.max(1200, enriched.length * 60));

            // 1 min per question or 20 mins min
          }
        } catch (err) {
          console.error("Mastery Sync Failed:", err);

          setQuestions(masteryQuestions);
        } finally {
          setLoading(false);
        }
      };

      initializeMastery();

      return;
    }
  }, [quizId, isMasteryMode]);

  const fetchQuizData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/quiz?quizId=${quizId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch quiz data");
      }
      
      const data = await res.json();
      
      // Handle the unified response from our Turso API
      if (data.quiz) {
        setQuiz(data.quiz);
        const duration = data.quiz.timeLimit || data.quiz.durationMinutes || courseDuration || 45;
        setTimeLeft(duration * 60);
      }
      
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        if (data.isLocked) {
          console.log("🔒 Content restricted: Enrolment verification required.");
        }
      } else {
        throw new Error("Questions currently unavailable for this module.");
      }
    } catch (err) {
      console.error("API Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [quizId, courseDuration]);

  const handleSubmit = async (isAuto = false) => {
    if (isSubmitting) return;
    
    if (isAttemptLocked) {
      alert("Submission Blocked: You have already reached the maximum attempt limit for this examination.");
      onClose();
      return;
    }

    if (!isAuto && !confirm("Finalize your examination and generate analytics?")) return;

    setIsSubmitting(true);
    clearInterval(timerRef.current);

    // 1. Calculate Results Client-Side
    let correct = 0, wrong = 0, skipped = 0;
    const penaltyRate = quiz?.negativeMarkingPercentage || 0.2;
    questions.forEach((q, idx) => {
      const selected = answers[idx];
      if (selected === undefined) skipped++;
      else if (selected === q.correctOptionIndex) correct++;
      else wrong++;
    });

    const totalPossibleMarks = Number(fullMarks) || Number(quiz?.fullMarks) || questions.length || 100;
    const marksPerQuestion = totalPossibleMarks / (questions.length || 1);
    const penaltyPerQuestion = marksPerQuestion * penaltyRate;
    const finalScore = (correct * marksPerQuestion) - (wrong * penaltyPerQuestion);
    
    const duration = quiz?.timeLimit || quiz?.durationMinutes || courseDuration || 45;
    const timeTakenSeconds = (duration * 60) - timeLeft;
    
    const accuracyDecimal = correct / (questions.length || 1);
    const xpGain = Math.max(0, Math.round(finalScore * 10 + accuracyDecimal * 50));

    // 2. Submit to Turso API
    if (!reviewMode && user) {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/student/attempt', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            quizId,
            quizTitle: quiz?.setTitle || quiz?.title,
            courseId: quiz?.courseId || null,
            score: correct,
            finalScore,
            totalQuestions: questions.length,
            stats: { correct, wrong, skipped },
            answers: questions.map((q, idx) => ({
              questionId: q.id,
              subjectId: q.subjectId || q.category || 'general',
              selected: answers[idx],
              isCorrect: answers[idx] === q.correctOptionIndex
            })),
            timeTakenSeconds,
            xpGain
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (errData.error === 'LIMIT_EXCEEDED') {
            alert(errData.message);
            setIsSubmitting(false);
            onClose();
            return;
          }
          throw new Error("Result synchronization failed");
        }

        setScore(finalScore);
        setStats({ correct, wrong, skipped });
        setSubmitted(true);
        setTimeout(() => setIsReady(true), 300);
      } catch (err) {
        console.error("Submission error:", err);
        alert("Session sync failed. Check your connection.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setScore(finalScore);
      setStats({ correct, wrong, skipped });
      setSubmitted(true);
      setTimeout(() => setIsReady(true), 300);
      setIsSubmitting(false);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (isMasteryMode && user) return;
    fetchQuizData();
  }, [quizId, isMasteryMode, fetchQuizData, user]);

  useEffect(() => {
    if (!submitted && !loading && !reviewMode) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = "";
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [submitted, loading, reviewMode]);

  useEffect(() => {
    if (!submitted && !loading && !reviewMode) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [submitted, loading, reviewMode]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ":" + secs.toString().padStart(2, "0");
  };

  const handleToggleBookmark = async (qId) => {
    if (!user) return;
    const userRef = fireDoc(db, "users", user.uid);
    const isBookmarked = user.savedQuestions?.includes(qId);
    try {
      await updateDoc(userRef, {
        savedQuestions: isBookmarked ? arrayRemove(qId) : arrayUnion(qId),
      });
    } catch (err) {
      console.error(err);
    }
  };
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
            Calibrating Exam Pod...
          </p>
        </div>
      </div>
    );

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2rem] p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto text-2xl">
            ⚠️
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Module Sync Issue</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {error === "Questions currently unavailable for this module." 
                ? "This study module is currently being updated or has not been synced to your local region yet."
                : error}
            </p>
          </div>
          <div className="flex flex-col gap-3">
             <button
               onClick={fetchQuizData}
               className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 transition-all text-xs uppercase tracking-widest"
             >
               Retry Synchronization
             </button>
             <button
               onClick={onClose}
               className="w-full py-4 bg-slate-800 text-slate-400 font-black rounded-2xl hover:bg-slate-700 transition-all text-xs uppercase tracking-widest"
             >
               Exit Session
             </button>
          </div>
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
            ErrorCode: {quizId ? `QZ-${quizId.slice(0, 8)}` : "AUTH_SYNC_FAILURE"}
          </p>
        </div>
      </div>
    );
  }

  // 🏆 RESULT VIEW
if (submitted)
  {
    const accuracy = ((stats.correct / (questions.length || 1)) * 100).toFixed(
      0,
    );

    // Mock percentile logic: score / max possible * random variation + base
    const percentile = Math.min(
      99,
      Math.max(
        10,
        (score / (questions.length || 1)) * 20 + 70 + Math.random() * 5,
      ),
    ).toFixed(1);

    return (
      <div className="min-h-screen bg-slate-50 transition-colors">
        {" "}
        <div className="max-w-6xl mx-auto p-4 md:p-12 space-y-12">
          {" "}
          <header className="bg-white p-10 md:p-16 rounded-[3rem] shadow-2xl border border-slate-100 relative overflow-hidden">
            {" "}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-20 -mt-20"></div>{" "}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-12 relative z-10">
              {" "}
              <div className="space-y-6 text-center lg:text-left flex-1">
                {" "}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
                  {" "}
                  Examination Finalized ✓{" "}
                </div>{" "}
                <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">
                  {" "}
                  Your Performance <br />{" "}
                  <span className="text-blue-600 italic">Fingerprint</span>{" "}
                </h1>{" "}
                {/* Strategic Excellence Radar - Results Integration */}
                <div className="h-48 w-full bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 mt-4 overflow-hidden">
                  {" "}
                  {isReady ? (
                    <ResponsiveContainer width="99%" height="100%">
                      {" "}
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="60%"
                        data={[
                          {
                            subject: "Accuracy",
                            A: (stats.correct / (questions.length || 1)) * 100,
                          },
                          {
                            subject: "Pace",
                            A: Math.min(
                              100,
                              (questions.length / (2700 - timeLeft)) * 300,
                            ),
                          },
                          {
                            subject: "Consistency",
                            A: 85,
                          },
                          {
                            subject: "Focus",
                            A: 90,
                          },
                          {
                            subject: "Precision",
                            A:
                              (stats.correct /
                                (stats.correct + stats.wrong || 1)) *
                              100,
                          },
                        ]}
                      >
                        {" "}
                        <PolarGrid
                          stroke={darkMode ? "#334155" : "#e2e8f0"}
                        />{" "}
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{
                            fill: darkMode ? "#94a3b8" : "#64748b",
                            fontSize: 8,
                            fontWeight: 800,
                          }}
                        />{" "}
                        <Radar
                          name="Performance"
                          dataKey="A"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.5}
                        />{" "}
                      </RadarChart>{" "}
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 grayscale opacity-20">
                      {" "}
                      <div className="w-8 h-8 border-2 border-t-blue-600 rounded-full animate-spin mb-2"></div>{" "}
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                        Rendering Analytics Radar...
                      </p>{" "}
                    </div>
                  )}
                </div>{" "}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  {" "}
                  <MetricCard
                    label="Final Score"
                    val={`${score.toFixed(1)} / ${fullMarks || questions.length}`}
                    sub="Scaled Result"
                    color="text-brand"
                  />{" "}
                  <MetricCard
                    label="Precision"
                    val={`${accuracy}%`}
                    sub="Accuracy Rate"
                  />{" "}
                  <MetricCard
                    label="Percentile"
                    val={`${percentile}th`}
                    sub="National Rank"
                    color="text-blue-600"
                  />{" "}
                  <MetricCard
                    label="Efficiency"
                    val={stats.correct}
                    sub={`${stats.wrong}errors`}
                    color="text-emerald-500"
                  />{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex flex-col items-center gap-6">
                {" "}
                <div className="w-48 h-48 rounded-full border-[10px] border-slate-100 flex items-center justify-center relative">
                  {" "}
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    {" "}
                    <circle
                      cx="50%"
                      cy="50%"
                      r="42%"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray="264"
                      strokeDashoffset={264 - 264 * (accuracy / 100)}
                    />{" "}
                  </svg>{" "}
                  <div className="text-center">
                    {" "}
                    <p className="text-4xl font-black text-slate-900 leading-none">
                      {accuracy}%
                    </p>{" "}
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      Consistency
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                <button
                  onClick={onClose}
                  className="w-full md:w-auto px-10 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-blue-600 transition-all shadow-xl text-xs uppercase tracking-widest"
                >
                  {" "}
                  Terminate Session{" "}
                </button>{" "}
              </div>{" "}
            </div>{" "}
          </header>{" "}
          <div className="space-y-8">
            {" "}
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">
              💡 Hint Analysis
            </h3>{" "}
            <div className="grid grid-cols-1 gap-6">
              {" "}
              {questions.map((q, idx) => (
                <SolutionCard
                  key={idx}
                  idx={idx}
                  q={q}
                  selectedIdx={answers[idx]}
                  saved={user?.savedQuestions?.includes(q.id)}
                  onSave={handleToggleBookmark}
                />
              ))}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>
    );
  }

  const handleReportError = async () => {
    if (!reportComment.trim()) return;

    setIsReportSubmitting(true);

    try {
      await addDoc(collection(db, "reports"), {
        userId: user?.uid || "anonymous",
        userName: user?.name || "Anonymous",
        questionId: currentQ.id,
        questionText: currentQ.questionText,
        quizId,
        quizTitle: quiz?.title || "Untitled",
        feedback: reportComment,
        status: "open",
        timestamp: serverTimestamp(),
      });

      alert(
        "Report synchronized. Our educators will verify this logic segment.",
      );

      setIsReporting(false);

      setReportComment("");
    } catch (err) {
      console.error(err);

      alert("Reporting failed. Please check your connection.");
    } finally {
      setIsReportSubmitting(false);
    }
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col transition-all selection:bg-blue-500 selection:text-white">
      {" "}
      {/* High-Fidelity Fixed Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 py-2 md:px-6 md:py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {" "}
          <div className="flex items-center gap-4">
            {" "}
            {!reviewMode && (
              <button
                onClick={() =>
                  confirm(
                    "Abandon this session? Your progress will be lost.",
                  ) && onClose()
                }
                className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="space-y-0.5">
              {" "}
              <h3 className="text-sm font-black text-slate-900 tracking-tight leading-none truncate max-w-[200px]">
                {quiz?.setTitle || quiz?.title}
              </h3>{" "}
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest italic flex items-center gap-1">
                Focus Mode Active <Shield size={10} strokeWidth={3} />
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex items-center gap-4">
            {" "}
            <button
              onClick={() => setIsQuestionMapOpen(!isQuestionMapOpen)}
              className="lg:hidden p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-colors"
            >
              {" "}
              <List size={20} />{" "}
            </button>{" "}
            <div className="bg-slate-900 text-white px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl font-mono text-lg md:text-xl font-black shadow-inner flex items-center gap-2 md:gap-3">
              <Clock size={16} className="text-blue-400" />{" "}
              {formatTime(timeLeft)}
            </div>{" "}
            <button
              disabled={isSubmitting}
              onClick={() => handleSubmit()}
              className="px-4 py-2 md:px-8 md:py-3 bg-blue-600 text-white font-black rounded-xl md:rounded-2xl shadow-lg hover:bg-slate-900 transition-all text-[10px] md:text-xs uppercase tracking-widest disabled:opacity-50 disabled:grayscale"
            >
              {isSubmitting ? "Sync..." : "Submit"}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </header>{" "}
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-2 sm:p-4 md:p-6 lg:p-8 gap-3 md:gap-6">
        {" "}
        {/* Question Area */}
        <main className="flex-1 space-y-4 md:space-y-8">
          {" "}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-4 sm:p-6 md:p-8 border border-slate-200 shadow-xl relative overflow-hidden transition-all"
            >
              {/* CBT Security Overlay - Distributed Watermarking */}
              <div
                className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden opacity-[0.05]"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gridTemplateRows: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: "20px",
                  padding: "20px",
                  transform: "rotate(-20deg) scale(1.2)",
                }}
              >
                {Array.from({
                  length: 20,
                }).map((_, i) => (
                  <div
                    key={i}
                    className="text-slate-400 font-black italic text-lg uppercase tracking-widest flex items-center justify-center"
                  >
                    myMockSewa
                  </div>
                ))}
              </div>
              <div className="relative z-10 space-y-4 md:space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 md:w-10 md:h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-sm md:text-lg italic shadow-md">
                      {currentIdx + 1}
                    </span>
                    <div>
                      <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Question Segment
                      </p>
                      <h2 className="text-base md:text-xl font-bold text-slate-900 tracking-tight leading-tight font-nepali">
                        {currentQ?.questionText}
                      </h2>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 md:gap-3 pt-2">
                  {currentQ?.options.map((opt, i) => (
                    <label
                      key={i}
                      className={`min-h-[36px] md:min-h-[44px] p-2 md:px-4 md:py-3 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 group ${answers[currentIdx] === i? "border-blue-600 bg-blue-50 ": "border-slate-100 hover:border-blue-300"}`}
                    >
                      <input
                        type="radio"
                        className="hidden"
                        name="qz"
                        checked={answers[currentIdx] === i}
                        onChange={() =>
                          setAnswers({
                            ...answers,
                            [currentIdx]: i,
                          })
                        }
                      />
                      <div
                        className={`w-6 h-6 md:w-8 md:h-8 rounded-lg border-2 flex items-center justify-center font-black text-[10px] md:text-sm transition-all ${answers[currentIdx] === i? "bg-blue-600 border-blue-600 text-white": "border-slate-200 bg-white text-slate-400"}`}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span
                        className={`text-sm md:text-base font-bold font-nepali ${answers[currentIdx] === i? "text-blue-700 ": "text-slate-600 "}`}
                      >
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-between pt-4 md:pt-10">
                  {" "}
                  <button
                    onClick={() => {
                      setMarkedForReview({
                        ...markedForReview,
                        [currentIdx]: !markedForReview[currentIdx],
                      });
                      handleToggleBookmark(questions[currentIdx].id);
                    }}
                    className={`px-3 py-1.5 md:px-8 md:py-4 rounded-lg md:rounded-2xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${markedForReview[currentIdx]? "bg-amber-500 text-white shadow-lg": "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"}`}
                  >
                    <Bookmark size={12} fill={markedForReview[currentIdx] ? "currentColor" : "none"} />
                    {markedForReview[currentIdx] ? "Marked" : "Mark"}
                  </button>{" "}
                  <button
                    onClick={() => setIsReporting(true)}
                    className="flex items-center gap-1.5 px-2 py-1.5 md:px-5 md:py-3 rounded-lg md:rounded-2xl border-2 border-slate-100 text-slate-400 font-bold hover:bg-slate-50 transition-all text-[8px] md:text-[10px] uppercase tracking-widest disabled:opacity-50"
                  >
                    <AlertTriangle size={12} /> Report
                  </button>{" "}
                  <button
                    onClick={() => {
                      const ns = {
                        ...answers,
                      };

                      delete ns[currentIdx];

                      setAnswers(ns);
                    }}
                    className="px-3 py-2 text-[8px] md:text-xs font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-all"
                  >
                    {" "}
                    Clear Choice{" "}
                  </button>{" "}
                </div>{" "}
              </div>{" "}
            </motion.div>{" "}
          </AnimatePresence>{" "}
          <div className="flex justify-between items-center px-2 md:px-4 pt-2">
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((p) => p - 1)}
              className="px-4 py-2.5 md:px-8 md:py-3 bg-white border border-slate-200 text-slate-900 font-black rounded-xl md:rounded-xl hover:bg-slate-50 transition-all disabled:opacity-20 text-[9px] md:text-xs uppercase tracking-widest flex items-center gap-2"
            >
              <ArrowLeft size={14} /> Previous
            </button>
            {currentIdx === questions.length - 1 ? (
              <button
                onClick={() => handleSubmit()}
                className="px-6 py-2.5 md:px-10 md:py-3 bg-emerald-600 text-white font-black rounded-xl md:rounded-xl shadow-xl hover:-translate-y-1 active:scale-95 transition-all text-[9px] md:text-xs uppercase tracking-widest flex items-center gap-2"
              >
                Finish <CheckCircle2 size={14} />
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx((p) => p + 1)}
                className="px-6 py-2.5 md:px-10 md:py-3 bg-slate-900 text-white font-black rounded-xl md:rounded-xl shadow-xl hover:-translate-y-1 active:scale-95 transition-all text-[9px] md:text-xs uppercase tracking-widest flex items-center gap-2"
              >
                Next <ArrowRight size={14} />
              </button>
            )}
          </div>{" "}
        </main>{" "}
        {/* Mobile Drawer Overlay */}
        <AnimatePresence>
          {" "}
          {isQuestionMapOpen && (
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
              className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-sm"
              onClick={() => setIsQuestionMapOpen(false)}
            />
          )}
        </AnimatePresence>{" "}
        {/* Dynamic Question Palette (Desktop Aside / Mobile Drawer) */}
        <aside
          className="w-full lg:w-80 flex flex-col gap-8 lg:sticky lg:top-[100px] h-fit"
        >
          {" "}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl flex flex-col gap-8">
            {" "}
            <div className="flex-1 flex flex-col min-h-0">
              {" "}
              <h5 className="hidden lg:block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                Question Map
              </h5>{" "}
              <div className="grid grid-cols-6 sm:grid-cols-5 gap-2 flex-1 overflow-y-auto pr-2 custom-scrollbar lg:max-h-[400px]">
                {" "}
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentIdx(i);

                      setIsQuestionMapOpen(false);
                    }}
                    className={`h-10 rounded-xl font-black text-xs transition-all border-2 flex items-center justify-center ${currentIdx === i? "border-blue-600 bg-blue-50 text-blue-600 ring-2 ring-blue-500 shadow-glow": markedForReview[i]? "bg-amber-100 border-amber-500 text-amber-600": answers[i] !== undefined? "bg-slate-900 border-slate-900 text-white": "bg-slate-50 border-slate-100 text-slate-400"}`}
                  >
                    {" "}
                    {i + 1}
                  </button>
                ))}
              </div>{" "}
            </div>{" "}
            <div className="p-6 bg-slate-50 rounded-3xl space-y-4 shrink-0">
              {" "}
              <h6 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Legend Overview
              </h6>{" "}
              <div className="grid grid-cols-2 gap-3">
                {" "}
                <LegendItem color="bg-slate-900" label="Answered" />{" "}
                <LegendItem color="bg-amber-500" label="Marked" />{" "}
                <LegendItem
                  color="bg-blue-50 border-2 border-blue-600"
                  label="Active"
                />{" "}
                <LegendItem color="bg-slate-100" label="Skipped" />{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </aside>{" "}
      </div>{" "}
      {/* 🛡️ CONTENT REPORT MODAL */}
      <AnimatePresence>
        {" "}
        {isReporting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {" "}
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
              onClick={() => setIsReporting(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />{" "}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.9,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: 20,
              }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200"
            >
              {" "}
              <div className="p-8 space-y-6">
                {" "}
                <div className="flex justify-between items-center">
                  {" "}
                  <div>
                    {" "}
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter italic">
                      Accuracy Shield
                    </h3>{" "}
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Incident Reporting Interface
                    </p>{" "}
                  </div>{" "}
                  <button
                    onClick={() => setIsReporting(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    ✕
                  </button>{" "}
                </div>{" "}
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  {" "}
                  <p className="text-xs font-bold text-blue-700 mb-1">
                    Impacted Content:
                  </p>{" "}
                  <p className="text-xs text-slate-600 font-medium line-clamp-2 italic">
                    "{currentQ?.questionText}"
                  </p>{" "}
                </div>{" "}
                <div className="space-y-2">
                  {" "}
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                    Explain the discrepancy:
                  </label>{" "}
                  <textarea
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                    placeholder="e.g. Option B is factually incorrect according to NEC Chapter 4..."
                    className="w-full h-32 bg-slate-50 rounded-2.5xl p-5 border-2 border-transparent focus:border-blue-600 outline-none text-sm font-medium transition-all resize-none"
                  />{" "}
                </div>{" "}
                <div className="flex gap-4">
                  {" "}
                  <button
                    onClick={() => setIsReporting(false)}
                    className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 :bg-slate-800 rounded-2xl transition-all"
                  >
                    {" "}
                    Cancel{" "}
                  </button>{" "}
                  <button
                    onClick={handleReportError}
                    disabled={isReportSubmitting || !reportComment.trim()}
                    className="flex-1 py-4 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 transition-all ring-offset-2 focus:ring-2 ring-blue-500"
                  >
                    {" "}
                    {isReportSubmitting
                      ? "Synchronizing..."
                      : "Transmit Report"}
                  </button>{" "}
                </div>{" "}
              </div>{" "}
            </motion.div>{" "}
          </div>
        )}
      </AnimatePresence>{" "}
    </div>
  );
}

function MetricCard({ label, val, sub, color }) {
  return (
    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-1">
      {" "}
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
        {label}
      </p>{" "}
      <h4
        className={`text-3xl font-black tracking-tighter ${color || "text-slate-900 "}`}
      >
        {val}
      </h4>{" "}
      <p className="text-[8px] font-bold text-slate-500 italic uppercase">
        {sub}
      </p>{" "}
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      {" "}
      <div
        className={`w-3 h-3 rounded-md ${color}`}
      />{" "}
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">
        {label}
      </span>{" "}
    </div>
  );
}

function SolutionCard({ idx, q, selectedIdx, saved, onSave }) {
  const isCorrect = selectedIdx === q.correctOptionIndex;
  const isSkipped = selectedIdx === undefined;

  // Premium Rationale Parser with Smart Segmentation
  const SmartRationale = ({ text }) => {
    if (!text) return <p className="text-slate-500 italic">Detailed logical verification is pending for this rationalization segment.</p>;

    // Only match section headers at the START of a line (anchored), not words mid-sentence.
    // This prevents "Core Concept", "Logic", "Mastery" appearing inside normal sentences
    // from being treated as new section headers and splitting the explanation incorrectly.
    const sectionMarkers = [
      { id: 'concept',  pattern: /^(?:####\s*)?(?:\d[.)]\s*)?(?:Core Concept|Core Principle)\s*:?\s*$/im,  label: 'Core Concept',    icon: Brain,     color: 'blue'   },
      { id: 'workflow', pattern: /^(?:####\s*)?(?:\d[.)]\s*)?(?:Logic\s*&\s*Reasoning|Workflow)\s*:?\s*$/im, label: 'Logic & Reasoning', icon: Workflow, color: 'slate'  },
      { id: 'analysis', pattern: /^(?:####\s*)?(?:\d[.)]\s*)?(?:Option Analysis|Elimination)\s*:?\s*$/im,   label: 'Option Analysis',  icon: Target,    color: 'amber'  },
      { id: 'mastery',  pattern: /^(?:####\s*)?(?:\d[.)]\s*)?(?:Mastery Note|Professional Hint|Pro Tip)\s*:?\s*$/im, label: 'Mastery Note', icon: Sparkles, color: 'indigo' }
    ];

    // Split the text by newlines, then group lines into sections
    const lines = text.split(/\r?\n/).map(l => l.trim());

    let currentSections = [];
    let currentSection = { id: 'concept', label: 'Core Concept', icon: Brain, color: 'blue', content: [] };

    for (const line of lines) {
      const markerMatch = sectionMarkers.find(m => m.pattern.test(line));
      if (markerMatch) {
        // Save the current section if it has any content
        if (currentSection.content.filter(Boolean).length > 0) {
          currentSections.push(currentSection);
        }
        // Start a fresh section
        currentSection = { ...markerMatch, content: [] };
      } else if (line) {
        // Non-empty, non-header line → belongs to current section
        currentSection.content.push(line);
      }
    }
    // Push the last section
    if (currentSection.content.filter(Boolean).length > 0) {
      currentSections.push(currentSection);
    }

    // If the parser found NO explicit headers, treat the whole text as one Core Concept
    if (currentSections.length === 0) {
      currentSections = [{
        id: 'concept', label: 'Core Concept', icon: Brain, color: 'blue',
        content: [text]
      }];
    }

    if (currentSections[0]?.content[0]?.startsWith(':')) {
      currentSections[0].content[0] = currentSections[0].content[0].substring(1).trim();
    }

    const processInline = (str) => {
      // Handle Bold
      let parts = str.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <b key={pIdx} className="font-black text-slate-800">{part.slice(2, -2)}</b>;
        }
        return part;
      });

      // Handle Option Analysis specifically (A:, B:, etc.)
      return parts.map((part, pIdx) => {
        if (typeof part === 'string') {
          return part.split(/(- [A-D]:)/g).map((sub, sIdx) => {
            if (/^- [A-D]:$/.test(sub)) {
              return <b key={sIdx} className="text-slate-900 font-black ml-1">{sub}</b>;
            }
            return sub;
          });
        }
        return part;
      });
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white/90 backdrop-blur-md border border-slate-100 rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-slate-100/50 space-y-6 divide-y divide-slate-100/80"
      >
        {currentSections.map((section, sIdx) => {
          const Icon = section.icon;
          return (
            <div 
              key={section.id}
              className={`pt-6 first:pt-0 ${
                section.id === 'mastery' ? 'text-indigo-900' :
                section.id === 'analysis' ? 'text-amber-900' :
                section.id === 'workflow' ? 'text-slate-900' : 'text-blue-900'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${
                  section.id === 'mastery' ? 'bg-indigo-50 text-indigo-600' : 
                  section.id === 'analysis' ? 'bg-amber-50 text-amber-600' :
                  section.id === 'workflow' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  <Icon size={18} strokeWidth={2.5} />
                </div>
                <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${
                  section.id === 'mastery' ? 'text-indigo-700' : 
                  section.id === 'analysis' ? 'text-amber-700' :
                  section.id === 'workflow' ? 'text-slate-700' : 'text-blue-700'
                }`}>
                  {section.label}
                </span>
              </div>
              <div className="space-y-3 pl-11">
                {section.content.map((c, cIdx) => (
                  <p key={cIdx} className="text-slate-700 leading-relaxed text-base md:text-[1.05rem] font-medium font-nepali">
                    {processInline(c)}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`bg-white rounded-[3rem] p-8 md:p-14 border border-slate-100 shadow-2xl shadow-slate-200/40 transition-all relative overflow-hidden`}
    >
      {/* Status Indicators */}
      <div className="absolute top-0 right-0 p-8 flex gap-3 z-0 opacity-10">
        {isCorrect ? <CheckCircle2 size={120} /> : !isSkipped ? <XCircle size={120} /> : <Info size={120} />}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12 relative z-10">
        <div className="flex-1 space-y-5">
          <div className="flex flex-wrap items-center gap-4">
            <span
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg ${
                isCorrect ? "bg-emerald-600 text-white" : isSkipped ? "bg-slate-200 text-slate-500" : "bg-rose-600 text-white"
              }`}
            >
              {idx + 1}
            </span>
            <div
              className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border-2 ${
                isCorrect ? "bg-emerald-50 text-emerald-700 border-emerald-100" : isSkipped ? "bg-slate-50 text-slate-500 border-slate-100" : "bg-rose-50 text-rose-700 border-rose-100"
              }`}
            >
              {isCorrect ? "Precision Achievement ✓" : isSkipped ? "Logic Segment Skipped" : "Logical Discrepancy Found"}
            </div>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight font-nepali">
            {q.questionText}
          </h2>
        </div>
        <button
          onClick={() => onSave(q.id)}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
            saved ? "bg-amber-500 text-white shadow-amber-500/30" : "bg-slate-50 text-slate-300 hover:text-amber-500 hover:bg-white"
          }`}
        >
          <Bookmark size={24} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Options Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 relative z-10">
        {q.options.map((opt, i) => {
          const isCorrectOpt = i === q.correctOptionIndex;
          const isUserOpt = i === selectedIdx;
          let style = "border-slate-50 bg-slate-50/30 text-slate-400 opacity-60";

          if (isCorrectOpt)
            style = "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold scale-[1.01] shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/20 z-10";
          if (isUserOpt && !isCorrectOpt)
            style = "border-rose-500 bg-rose-50 text-rose-700 font-bold ring-2 ring-rose-500/20";

          return (
            <div key={i} className={`p-6 md:p-8 rounded-[2rem] border-2 flex items-center gap-5 transition-all relative ${style}`}>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border-2 ${
                  isCorrectOpt ? "bg-emerald-600 border-emerald-600 text-white" : isUserOpt ? "bg-rose-600 border-rose-600 text-white" : "border-slate-200 text-slate-400"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </div>
              <span className="flex-1 text-lg font-bold font-nepali">{opt}</span>
              {isCorrectOpt && <CheckCircle2 className="text-emerald-600" size={24} />}
              {isUserOpt && !isCorrectOpt && <XCircle className="text-rose-600" size={24} />}
            </div>
          );
        })}
      </div>

      {/* High-Fidelity Rationalization Section */}
      <div className="bg-slate-50/50 p-6 md:p-12 rounded-[3rem] border border-slate-100 space-y-10 relative overflow-hidden group">
        {/* Background Decorative Quote */}
        <div className="absolute top-0 right-0 p-12 opacity-[0.04] text-slate-900 transition-all group-hover:scale-110 group-hover:rotate-6">
          <Quote size={160} strokeWidth={1} />
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-5">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
              <div className="w-3 h-3 bg-blue-400 rounded-full" />
              <div className="w-3 h-3 bg-blue-200 rounded-full" />
            </div>
            <div className="px-5 py-2 bg-white border border-slate-200 rounded-full flex items-center gap-3 shadow-md">
              <Lightbulb className="text-blue-600" size={18} />
              <span className="text-[12px] font-black text-slate-900 uppercase tracking-[0.25em]">Learning Studio</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {/* Removed AI-Enhanced Rationalization Label as requested */}
          </div>
        </div>

        <div className="relative z-10">
          {q.explanationImage && (
            <div className="mb-12 rounded-[3rem] overflow-hidden border-[12px] border-white shadow-2xl transition-transform hover:scale-[1.01]">
              <img src={q.explanationImage} className="w-full" alt="Logical Visualization" />
            </div>
          )}
          <SmartRationale text={q.explanationText || q.explanation || q.rationale} />
        </div>
      </div>
    </motion.div>
  );
}


function PerfBadge({ label, val, color }) {
  return (
    <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center min-w-[70px]">
      {" "}
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
        {label}
      </span>{" "}
      <span
        className={`font-black text-sm ${color}`}
      >
        {val}
      </span>{" "}
    </div>
  );
}
