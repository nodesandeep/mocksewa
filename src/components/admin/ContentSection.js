"use client";

import React, { useEffect, useState } from "react";

import { db, auth } from "../../utils/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";

import { motion, AnimatePresence } from "framer-motion";

export default function ContentSection() {
  const { user: authUser } = useAuth();
  const [subjects, setSubjects] = useState([]);

  const [courses, setCourses] = useState([]);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);

  const [showAddCourseModal, setShowAddCourseModal] = useState(false);

  const loadData = async () => {
    if (!authUser) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No token');
      const [subRes, courseRes] = await Promise.all([
        fetch('/api/admin/content?type=subjects', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/content?type=courses', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      if (subRes.ok) {
        const data = await subRes.json();
        setSubjects(data.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || "")));
      }
      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourses(courseData.sort((a, b) => (a.title || "").localeCompare(b.title || "")));
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [authUser]);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const courseId = e.target.courseId.value;
    const icon = e.target.icon.value || "📚";
    if (!name) return alert("Subject Name is required.");

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          type: 'subject',
          action: 'save',
          data: { name, title: name, courseId, icon, active: true }
        })
      });
      if (!res.ok) throw new Error("Sync failed");
      setShowAddModal(false);
      loadData();
      alert("Subject deployed!");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    const title = e.target.title.value;
    const description = e.target.description.value;
    const category = e.target.category.value || "General";
    const basePrice = e.target.basePrice.value || 0;

    if (!title) return alert("Course Title is required.");

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          type: 'course',
          action: 'save',
          data: { title, description, category, basePrice: Number(basePrice), status: "active" }
        })
      });
      if (!res.ok) throw new Error("Sync failed");
      setShowAddCourseModal(false);
      loadData();
      alert("Course deployed!");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const toggleStatus = async (id, current) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type: 'subject', action: 'save', data: { id, active: !current } })
      });
      if (!res.ok) throw new Error("Status update failed");
      loadData();
    } catch (err) { 
      console.error(err);
      alert("Status sync failed: " + err.message);
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!confirm("Are you sure? This will delete the subject from Turso.")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type: 'subject', action: 'delete', data: { id } })
      });
      if (!res.ok) throw new Error("Delete failed");
      loadData();
      alert("Subject deleted from Turso.");
    } catch (err) { alert(err.message); }
  };
  const categories = ["All", ...new Set(courses.map(c => c.category || "General"))];
  const filteredSubjects = subjects.filter(sub => {
    if (selectedCategory === "All") return true;
    const parentCourse = courses.find(c => c.id === sub.courseId);
    const cat = parentCourse ? (parentCourse.category || "General") : "General";
    return cat === selectedCategory;
  });

  if (loading)
    return (
      <div className="p-20 flex flex-col items-center justify-center gap-4">
        {" "}
        <div className="w-12 h-12 border-4 border-t-blue-600 rounded-full animate-spin"></div>{" "}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Syncing Curriculum Lab...
        </p>{" "}
      </div>
    );

  return (
    <div className="space-y-12">
      {" "}
      <AnimatePresence mode="wait">
        {" "}
        {!selectedSubject ? (
          <motion.div
            key="list"
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -20,
            }}
            className="space-y-12"
          >
            {" "}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
              {" "}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>{" "}
              <div className="space-y-1 relative z-10">
                {" "}
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                  Course Repository
                </h3>{" "}
                <p className="text-slate-500 font-medium">
                  Manage the parent course structures for your curriculum.
                </p>{" "}
              </div>{" "}
              <button
                onClick={() => setShowAddCourseModal(true)}
                className="px-8 py-4 bg-amber-500 text-white font-black rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-amber-500/20 text-xs uppercase tracking-widest relative z-10"
              >
                {" "}
                + Initialize Course{" "}
              </button>{" "}
            </header>{" "}
            <div className="h-0.5 bg-slate-100 w-full rounded-full"></div>{" "}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
              {" "}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -mr-20 -mt-20"></div>{" "}
              <div className="space-y-1 relative z-10">
                {" "}
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                  Subject Pipeline
                </h3>{" "}
                <p className="text-slate-500 font-medium">
                  Manage the subject-wise breakdown of your courses.
                </p>{" "}
              </div>{" "}
              <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full md:w-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase tracking-widest outline-none focus:border-blue-500 w-full sm:w-auto"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-blue-500/20 text-xs uppercase tracking-widest shrink-0"
                >
                  {" "}
                  + Initialize Subject{" "}
                </button>{" "}
              </div>
            </header>{" "}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {" "}
              {filteredSubjects.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden"
                >
                  {" "}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-600/5 transition-colors"></div>{" "}
                  <div className="flex justify-between items-start relative z-10 mb-8">
                    {" "}
                    <span className="text-4xl bg-slate-50 p-4 rounded-2xl shadow-inner">
                      {sub.icon || "📚"}
                    </span>{" "}
                    <div className="flex gap-2">
                      {" "}
                      <button
                        onClick={() => toggleStatus(sub.id, sub.active)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs transition-colors ${sub.active? "bg-emerald-50 text-emerald-600 ": "bg-rose-50 text-rose-600 "}`}
                      >
                        {" "}
                        {sub.active ? "👁️" : "🚫"}
                      </button>{" "}
                      <button
                        onClick={() => handleDeleteSubject(sub.id)}
                        className="w-10 h-10 bg-slate-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                      >
                        🗑️
                      </button>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="space-y-2 relative z-10">
                    {" "}
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">
                      {" "}
                      {courses.find((c) => c.id === sub.courseId)?.title ||
                        "Global Curriculum"}
                    </p>{" "}
                    <h4 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight group-hover:text-blue-600 transition-colors">
                      {" "}
                      {sub.name || sub.title}
                    </h4>{" "}
                  </div>{" "}
                  <div className="pt-8 relative z-10">
                    {" "}
                    <button
                      onClick={() => setSelectedSubject(sub)}
                      className="w-full py-4 bg-slate-50 text-slate-900 font-black rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-slate-100 text-xs uppercase tracking-widest"
                    >
                      {" "}
                      Enter Content Lab{" "}
                    </button>{" "}
                  </div>{" "}
                </div>
              ))}
            </div>{" "}
            {showAddCourseModal && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
                {" "}
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.9,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  className="bg-white w-full max-w-md rounded-[3rem] p-12 space-y-10 shadow-3xl"
                >
                  {" "}
                  <h4 className="text-3xl font-black text-slate-900 tracking-tighter">
                    Initialize Course
                  </h4>{" "}
                  <form onSubmit={handleAddCourse} className="space-y-6">
                    {" "}
                    <div className="space-y-1">
                      {" "}
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Course Title
                      </label>{" "}
                      <input
                        name="title"
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-amber-600/10"
                        placeholder="e.g. PSC Electrical Level 4"
                        required
                      />{" "}
                    </div>{" "}
                    <div className="space-y-1">
                      {" "}
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Short Description
                      </label>{" "}
                      <textarea
                        name="description"
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-amber-600/10 h-24"
                        placeholder="Course overview..."
                      />{" "}
                    </div>{" "}
                    <div className="space-y-1">
                      {" "}
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Category (e.g. Medical, Engineering)
                      </label>{" "}
                      <input
                        name="category"
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-amber-600/10"
                        placeholder="e.g. Medical"
                      />{" "}
                    </div>{" "}
                    <div className="space-y-1">
                      {" "}
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Base Price (Rs)
                      </label>{" "}
                      <input
                        type="number"
                        name="basePrice"
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-amber-600/10"
                        defaultValue="500"
                      />{" "}
                    </div>{" "}
                    <div className="flex gap-4 pt-6">
                      {" "}
                      <button
                        type="submit"
                        className="flex-1 py-5 bg-amber-500 text-white font-black rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all text-xs uppercase tracking-widest"
                      >
                        Deploy Course
                      </button>{" "}
                      <button
                        type="button"
                        onClick={() => setShowAddCourseModal(false)}
                        className="px-8 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-rose-500 hover:text-white transition-all text-xs uppercase tracking-widest"
                      >
                        Abort
                      </button>{" "}
                    </div>{" "}
                  </form>{" "}
                </motion.div>{" "}
              </div>
            )}
            {showAddModal && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
                {" "}
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.9,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  className="bg-white w-full max-w-md rounded-[3rem] p-12 space-y-10 shadow-3xl"
                >
                  {" "}
                  <h4 className="text-3xl font-black text-slate-900 tracking-tighter">
                    Initialize Subject
                  </h4>{" "}
                  <form onSubmit={handleAddSubject} className="space-y-6">
                    {" "}
                    <div className="space-y-1">
                      {" "}
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Parent Pipeline
                      </label>{" "}
                      <select
                        name="courseId"
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-600/10"
                      >
                        {" "}
                        <option value="">-- Select Course --</option>{" "}
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>{" "}
                    </div>{" "}
                    <div className="space-y-1">
                      {" "}
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Subject Title
                      </label>{" "}
                      <input
                        name="name"
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-600/10"
                        placeholder="e.g. Electrical Laws"
                        required
                      />{" "}
                    </div>{" "}
                    <div className="space-y-1">
                      {" "}
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Visual Index (Emoji)
                      </label>{" "}
                      <input
                        name="icon"
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-600/10"
                        placeholder="e.g. ⚡"
                      />{" "}
                    </div>{" "}
                    <div className="flex gap-4 pt-6">
                      {" "}
                      <button
                        type="submit"
                        className="flex-1 py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-xs uppercase tracking-widest"
                      >
                        Deploy Subject
                      </button>{" "}
                      <button
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="px-8 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-rose-500 hover:text-white transition-all text-xs uppercase tracking-widest"
                      >
                        Abort
                      </button>{" "}
                    </div>{" "}
                  </form>{" "}
                </motion.div>{" "}
              </div>
            )}
          </motion.div>
        ) : (
          <QuestionList
            subject={selectedSubject}
            onBack={() => setSelectedSubject(null)}
          />
        )}
      </AnimatePresence>{" "}
    </div>
  );
}

function QuestionList({ subject, onBack }) {
  const [questions, setQuestions] = useState([]);

  const [quizzes, setQuizzes] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showAddQuiz, setShowAddQuiz] = useState(false);

  const loadQuizzes = async () => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/admin/content?type=quizzes&subjectId=${subject.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data.sort((a, b) => (a.title || "").localeCompare(b.title || "")));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/content?type=questions&subjectId=${subject.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setQuestions(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadQuizzes();
    loadQuestions();
  }, [subject.id]);

  const handleAddQuiz = async (e) => {
    e.preventDefault();
    const title = e.target.title.value;
    const isFreeTrial = e.target.isFreeTrial.checked;
    const globalOrder = e.target.globalOrder.value ? Number(e.target.globalOrder.value) : 999;
    if (!title) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          type: 'quiz',
          action: 'save',
          data: { title, subjectId: subject.id, courseId: subject.courseId || "", enabled: true, isFreeTrial: !!isFreeTrial, globalOrder }
        })
      });
      if (!res.ok) throw new Error("Sync failed");
      setShowAddQuiz(false);
      loadQuizzes();
      alert("Quiz created in Turso!");
    } catch (err) {
      alert(err.message);
    }
  };
  const handleDeleteQuiz = async (id) => {
    if (!confirm("CRITICAL: Delete this examination and ALL associated questions from Turso?")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type: 'quiz', action: 'delete', data: { id } })
      });
      if (!res.ok) throw new Error("Delete failed");
      loadQuizzes();
      alert("Examination purged from Turso.");
    } catch (err) {
      alert("Purge failed: " + err.message);
    }
  };
  const handleDeleteQuestion = async (id) => {
    if (!confirm("Delete question permanently from Turso?")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type: 'question', action: 'delete', data: { id } })
      });
      loadQuestions();
    } catch (err) { alert(err.message); }
  };
  return (
    <motion.div
      key="detail"
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
      className="space-y-12"
    >
      {" "}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
        {" "}
        <div className="flex items-center gap-6">
          {" "}
          <button
            onClick={onBack}
            className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-slate-200 text-slate-400 hover:text-blue-600 shadow-sm transition-all font-black text-xl"
          >
            ←
          </button>{" "}
          <div>
            {" "}
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] leading-none mb-1">
              Content Repository
            </p>{" "}
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
              {subject.name || subject.title}
            </h3>{" "}
          </div>{" "}
        </div>{" "}
        <button
          onClick={() => setShowAddQuiz(true)}
          className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:scale-105 active:scale-95 shadow-xl transition-all text-xs uppercase tracking-widest"
        >
          {" "}
          + Create Examination{" "}
        </button>{" "}
      </header>{" "}
      {showAddQuiz && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          {" "}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            className="bg-white w-full max-w-md rounded-[3rem] p-12 space-y-10 shadow-3xl"
          >
            {" "}
            <h4 className="text-2xl font-black text-slate-900 tracking-tight">
              Deploy New Quiz
            </h4>{" "}
            <form onSubmit={handleAddQuiz} className="space-y-6">
              {" "}
              <div className="space-y-1">
                {" "}
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Examination Title
                </label>{" "}
                <input
                  name="title"
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-600/10"
                  placeholder="e.g. Weekly Mock 04"
                  required
                />{" "}
              </div>{" "}
              <div className="space-y-1">
                {" "}
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Display Priority (Lower = Higher Priority)
                </label>{" "}
                <input
                  type="number"
                  name="globalOrder"
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-600/10"
                  placeholder="e.g. 1"
                  defaultValue="999"
                />{" "}
              </div>{" "}
              <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 flex items-center gap-4 group">
                {" "}
                <input
                  type="checkbox"
                  name="isFreeTrial"
                  className="w-6 h-6 rounded-lg accent-blue-600"
                />{" "}
                <span className="text-xs font-black text-blue-600 uppercase tracking-widest">
                  Public Access (Free Trial)
                </span>{" "}
              </div>{" "}
              <div className="flex gap-4 pt-4">
                {" "}
                <button
                  type="submit"
                  className="flex-1 py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-xs uppercase tracking-widest"
                >
                  Initialize Node
                </button>{" "}
                <button
                  type="button"
                  onClick={() => setShowAddQuiz(false)}
                  className="px-8 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-rose-500 hover:text-white transition-all text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>{" "}
              </div>{" "}
            </form>{" "}
          </motion.div>{" "}
        </div>
      )}
      {/* Examinations Node */}
      <section className="space-y-8">
        {" "}
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-sans">
          Active Examination Nodes
        </h5>{" "}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {" "}
          {quizzes.map((qz) => (
            <ExaminationNode
              key={qz.id}
              node={qz}
              courseId={qz.courseId || subject.courseId}
              onDelete={() => handleDeleteQuiz(qz.id)}
              onRefresh={loadQuizzes}
            />
          ))}
          {quizzes.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 border-4 border-dashed border-slate-100 rounded-[3rem] space-y-4">
              {" "}
              <div className="text-4xl grayscale opacity-20">🔧</div>{" "}
              <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">
                No active examination metrics found.
              </p>{" "}
            </div>
          )}
        </div>{" "}
      </section>{" "}
      {/* Global Bank Node */}
      <section className="space-y-8">
        {" "}
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-sans">
          Logic Core (Question Bank)
        </h5>{" "}
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
          {" "}
          <div className="overflow-x-auto">
            {" "}
            <table className="w-full text-left">
              {" "}
              <thead>
                {" "}
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">
                  {" "}
                  <th className="px-10 py-8">Sequential Index</th>{" "}
                  <th className="px-10 py-8">Question Proposition</th>{" "}
                  <th className="px-10 py-8">Verification Logic</th>{" "}
                  <th className="px-10 py-8 text-right">Moderation</th>{" "}
                </tr>{" "}
              </thead>{" "}
              <tbody className="divide-y divide-slate-100">
                {" "}
                {questions.map((q, i) => (
                  <tr
                    key={q.id}
                    className="group hover:bg-slate-50 :bg-slate-800/50 transition-colors"
                  >
                    {" "}
                    <td className="px-10 py-8 text-slate-300 font-black italic">
                      {i + 1}
                    </td>{" "}
                    <td className="px-10 py-8 font-bold text-slate-900 max-w-md">
                      {" "}
                      <p className="truncate group-hover:whitespace-normal group-hover:truncate-none transition-all font-nepali">
                        {q.questionText}
                      </p>{" "}
                    </td>{" "}
                    <td className="px-10 py-8">
                      {" "}
                      <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg uppercase tracking-widest border border-blue-100">
                        {" "}
                        Node Index: {q.correctOptionIndex}
                      </span>{" "}
                    </td>{" "}
                    <td className="px-10 py-8 text-right">
                      {" "}
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="w-10 h-10 bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all font-black"
                      >
                        🗑️
                      </button>{" "}
                    </td>{" "}
                  </tr>
                ))}
                {questions.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      className="py-32 text-center text-slate-300 font-black italic uppercase tracking-widest text-xs"
                    >
                      Propulsion Error: Question Bank Empty
                    </td>
                  </tr>
                )}
              </tbody>{" "}
            </table>{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
    </motion.div>
  );
}

function ExaminationNode({ node, courseId, onDelete, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false);

  const [tempTitle, setTempTitle] = useState(node.title);
  const [tempOrder, setTempOrder] = useState(node.globalOrder !== undefined ? node.globalOrder : 999);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTempTitle(node.title);
    setTempOrder(node.globalOrder !== undefined ? node.globalOrder : 999);
  }, [node.title, node.globalOrder]);

  const handleUpdate = async () => {
    if (!tempTitle.trim()) {
      setIsEditing(false);
      return;
    }
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          type: 'quiz',
          action: 'save',
          data: { id: node.id, title: tempTitle.trim(), globalOrder: Number(tempOrder) }
        })
      });
      if (!res.ok) throw new Error("Update failed");
      setIsEditing(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Master Sync Failure:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleUpdate();

    if (e.key === "Escape") {
      setTempTitle(node.title);
      setTempOrder(node.globalOrder !== undefined ? node.globalOrder : 999);

      setIsEditing(false);
    }
  };
  return (
    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] flex items-center justify-between group shadow-xl hover:shadow-2xl transition-all relative overflow-hidden">
      {" "}
      <div className="absolute top-0 right-0 p-8 opacity-5 select-none text-4xl">
        📝
      </div>{" "}
      <div className="flex items-center gap-5 relative z-10 flex-1 overflow-hidden">
        {" "}
        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl font-bold italic shadow-inner shrink-0">
          {" "}
          {loading ? "⏳" : node.title.charAt(0)}
        </div>{" "}
        <div className="flex-1 overflow-hidden">
          {" "}
          {isEditing ? (
            <div className="flex gap-2">
            <input
              autoFocus
              className="w-full bg-white/10 border-b-2 border-blue-500 text-white font-black py-1 outline-none px-2 rounded-t-lg transition-all uppercase tracking-tight text-lg"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <input
              type="number"
              className="w-24 bg-white/10 border-b-2 border-blue-500 text-white font-black py-1 outline-none px-2 rounded-t-lg transition-all tracking-tight text-lg"
              value={tempOrder}
              onChange={(e) => setTempOrder(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Order"
            />
            </div>
          ) : (
            <div
              onDoubleClick={() => setIsEditing(true)}
              className="cursor-pointer"
            >
              {" "}
              <div className="font-black text-lg tracking-tight leading-none mb-1 uppercase truncate group-hover:text-blue-400 transition-colors flex items-center gap-2">
                {" "}
                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-md flex-shrink-0">{node.globalOrder !== undefined ? node.globalOrder : 999}</span>
                {node.title}
              </div>{" "}
              <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest">
                {" "}
                {node.isFreeTrial ? "Open Access" : "Verified Access"}
              </div>{" "}
            </div>
          )}
        </div>{" "}
      </div>{" "}
      <div className="flex items-center gap-3 relative z-10">
        {" "}
        {isEditing ? (
          <button
            onClick={handleUpdate}
            className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xs hover:bg-blue-500 transition-all shadow-lg text-white"
          >
            {" "}
            💾{" "}
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 hover:bg-blue-600 transition-all shadow-lg"
          >
            {" "}
            ✏️{" "}
          </button>
        )}
        <button
          onClick={onDelete}
          className="w-10 h-10 bg-white/10 hover:bg-rose-500 text-white rounded-xl transition-all shrink-0 shadow-lg opacity-0 group-hover:opacity-100"
        >
          {" "}
          🗑️{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
}
