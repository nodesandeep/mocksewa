"use client";

import React, { useState, useEffect } from "react";
import { auth } from "../../utils/firebase";
import { Loader2, ShieldCheck, PlayCircle, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function TrialManager() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [trialAssignments, setTrialAssignments] = useState({});

  const loadCourses = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content?type=courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTrialAssignments = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content?type=courses', { // Courses have showTrial
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // We also need the trial_courses table mapping
      // For now we'll assume the quizzes endpoint might give us isFreeTrial status
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const fetchQuizzesForCourse = async (courseId) => {
    setLoadingQuizzes(true);
    setSelectedCourseId(courseId);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/content?type=quizzes&courseId=${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const setTrialQuiz = async (courseId, quizId) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          type: 'quiz',
          action: 'save',
          data: { 
            id: quizId, 
            isFreeTrial: true, 
            courseId: courseId 
          }
        })
      });

      if (!res.ok) throw new Error("Assignment failed");
      
      alert("Trial assignment synchronized!");
      fetchQuizzesForCourse(courseId); // Refresh to show checkmark
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const toggleCourseTrialVisibility = async (course) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const newShowTrial = course.showTrial ? 0 : 1;
      
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          type: 'course',
          action: 'save',
          data: { 
            ...course,
            showTrial: newShowTrial 
          }
        })
      });

      if (!res.ok) throw new Error("Toggle failed");
      
      loadCourses(); // Refresh
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center text-slate-400 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      <p className="font-black uppercase tracking-widest text-[10px]">Synchronizing Trial Registry...</p>
    </div>
  );

  return (
    <div className="space-y-12">
      <header>
        <h3 className="text-3xl font-black text-slate-800 tracking-tight italic">Trial Manager</h3>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest text-[10px]">Configure public access entry points and freemium content hooks.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Course List */}
        <div className="lg:col-span-1 space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-blue-600" />
            Select Course to Configure
          </h4>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {courses.map(course => (
              <div 
                key={course.id}
                onClick={() => fetchQuizzesForCourse(course.id)}
                className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col gap-3 ${selectedCourseId === course.id ? 'border-blue-600 bg-blue-50 shadow-xl shadow-blue-100' : 'border-slate-100 bg-white hover:border-slate-200'}`}
              >
                <div className="flex justify-between items-start">
                  <h5 className={`font-black text-sm tracking-tight ${selectedCourseId === course.id ? 'text-blue-900' : 'text-slate-800'}`}>
                    {course.title}
                  </h5>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleCourseTrialVisibility(course); }}
                    className={`transition-all ${course.showTrial ? 'text-emerald-500' : 'text-slate-300'}`}
                  >
                    {course.showTrial ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md ${course.showTrial ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {course.showTrial ? 'Trial Active' : 'Trial Hidden'}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 italic">{course.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Set Selection */}
        <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-200 p-10 shadow-sm min-h-[500px]">
          {selectedCourseId ? (
            <div className="space-y-8">
              <header className="flex justify-between items-center">
                <div>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">Available Quiz Sets</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Which set should represent the Trial Version?</p>
                </div>
                {loadingQuizzes && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizzes.map(quiz => (
                  <div 
                    key={quiz.id}
                    onClick={() => setTrialQuiz(selectedCourseId, quiz.id)}
                    className={`p-6 rounded-[1.5rem] border-2 cursor-pointer transition-all flex items-center justify-between group ${quiz.isFreeTrial ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'}`}
                  >
                    <div>
                      <div className="font-black text-slate-800 text-sm">{quiz.title}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">Order: {quiz.globalOrder || 'N/A'}</div>
                    </div>
                    {quiz.isFreeTrial ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-blue-600 flex items-center justify-center transition-all">
                        <div className="w-2 h-2 rounded-full bg-blue-600 opacity-0 group-hover:opacity-100" />
                      </div>
                    )}
                  </div>
                ))}
                {quizzes.length === 0 && !loadingQuizzes && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-300 italic font-bold">
                    No quiz sets found for this course.
                  </div>
                )}
              </div>

              {!loadingQuizzes && quizzes.some(q => q.isFreeTrial) && (
                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4 items-start">
                  <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
                  <div>
                    <h5 className="text-xs font-black text-blue-900 uppercase tracking-widest">Logic Verified</h5>
                    <p className="text-[10px] text-blue-700 font-bold leading-relaxed mt-1">
                      Setting a set as "Trial" automatically links it in the `trial_courses` registry. Only one set per course can be the primary trial entry point.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 grayscale">
              <PlayCircle className="w-16 h-16 text-slate-400" />
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900">Pipeline Idle</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select a course from the left to configure trial hooks.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
