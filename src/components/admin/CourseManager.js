"use client";

import React, { useEffect, useState } from "react";

import { db, auth } from "../../utils/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";

export default function CourseManager() {
  const { user: authUser } = useAuth();
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);

  const [editingCourse, setEditingCourse] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");
  const [isCreatingBundle, setIsCreatingBundle] = useState(false);

  const [newBundle, setNewBundle] = useState({
    title: "",
    description: "",
    basePrice: 0,
    discountedPrice: 0,
    includedCourseIds: [],
  });

  const loadCourses = async () => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('No token');
      const res = await fetch('/api/admin/content?type=courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCourses(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [authUser]);

  const togglePublish = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === "active" || currentStatus === undefined ? "draft" : "active";
      const token = await auth.currentUser?.getIdToken();
      
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          type: 'course',
          action: 'save',
          data: { id, status: newStatus }
        })
      });

      if (!res.ok) throw new Error("Status sync failed");
      await loadCourses();
      alert("Status updated!");
    } catch (err) {
      alert("Error toggling status: " + err.message);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm("CRITICAL: Are you sure you want to delete this course? This action cannot be undone.")) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type: 'course', action: 'delete', data: { id } })
      });

      if (!res.ok) throw new Error("Delete failed");
      await loadCourses();
      alert("Course purged successfully.");
    } catch (err) {
      alert("Purge failed: " + err.message);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingCourse) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          type: 'course',
          action: 'save',
          data: editingCourse
        })
      });

      if (!res.ok) throw new Error("Update failed");
      setEditingCourse(null);
      await loadCourses();
      alert("Course updated!");
    } catch (err) {
      alert("Error saving: " + err.message);
    }
  };

  const saveNewBundle = async (e) => {
    e.preventDefault();
    try {
      const token = await auth.currentUser?.getIdToken();
      const id = `course_${Date.now()}`;
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          type: 'course',
          action: 'save',
          data: { ...newBundle, id, isBundle: true }
        })
      });

      if (!res.ok) throw new Error("Bundle creation failed");
      setIsCreatingBundle(false);
      setNewBundle({ title: "", description: "", basePrice: 0, discountedPrice: 0, includedCourseIds: [] });
      await loadCourses();
      alert("Mega Pass Bundle created successfully!");
    } catch (err) {
      alert("Error creating bundle: " + err.message);
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
  };

  const categories = ["All", ...new Set(courses.map(c => c.category || "General").filter(Boolean))];

  const filteredCourses = courses
    .filter(c => filterCategory === "All" || (c.category || "General") === filterCategory)
    .sort((a, b) => a.title.localeCompare(b.title));

  const bundles = filteredCourses.filter((c) => c.isBundle);
  const regularCourses = filteredCourses.filter((c) => !c.isBundle);

  if (loading)
    return (
      <div className="p-8 animate-pulse text-slate-400">
        Syncing course directory...
      </div>
    );

  return (
    <div className="space-y-12">
      {" "}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-3xl font-black text-slate-800 tracking-tight italic">
            Course Manager
          </h3>
          <p className="text-sm font-bold text-slate-400 font-mono uppercase tracking-widest text-[10px]">
            Global visibility and metadata control center.
          </p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex-1 md:w-64">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Filter by Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                filterCategory === cat
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
          </div>
          <button
            onClick={() => setIsCreatingBundle(true)}
            className="px-8 py-4 bg-amber-500 text-white font-black rounded-2xl shadow-xl shadow-amber-100 hover:scale-105 transition-all flex items-center gap-3 border-b-4 border-amber-700"
          >
            <span className="text-xl">+</span> CREATE MEGA PASS
          </button>
        </div>
      </header>
      {/* SECTION: MEGA PASSES */}{" "}
      <div className="space-y-6">
        {" "}
        <div className="flex items-center gap-3">
          {" "}
          <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>{" "}
          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
            Active Mega Passes
          </h4>{" "}
        </div>{" "}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {" "}
          {bundles.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEdit={handleEdit}
              onToggle={togglePublish}
              onDelete={handleDeleteCourse}
              isBundle
            />
          ))}{" "}
          {bundles.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 font-bold italic">
              No specialized bundles found.
            </div>
          )}{" "}
        </div>{" "}
      </div>{" "}
      {/* SECTION: REGULAR COURSES */}{" "}
      <div className="space-y-6">
        {" "}
        <div className="flex items-center gap-3">
          {" "}
          <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>{" "}
          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
            Individual Mock Tests
          </h4>{" "}
        </div>{" "}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {" "}
          {regularCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEdit={handleEdit}
              onToggle={togglePublish}
              onDelete={handleDeleteCourse}
            />
          ))}{" "}
        </div>{" "}
      </div>{" "}
      {/* MODAL: BUNDLE CREATOR */}{" "}
      {isCreatingBundle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          {" "}
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 space-y-8 shadow-2xl relative overflow-hidden border border-amber-500/20">
            {" "}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-orange-600"></div>{" "}
            <header className="space-y-2">
              {" "}
              <h4 className="text-3xl font-black text-slate-900 tracking-tighter italic">
                Stitch New Mega Pass
              </h4>{" "}
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Select multiple mock tests to package into one license.
              </p>{" "}
            </header>{" "}
            <form
              onSubmit={saveNewBundle}
              className="space-y-6 max-h-[70vh] overflow-y-auto px-2 custom-scrollbar"
            >
              {" "}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {" "}
                <div className="space-y-1">
                  {" "}
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Bundle Identity
                  </label>{" "}
                  <input
                    value={newBundle.title}
                    onChange={(e) =>
                      setNewBundle({
                        ...newBundle,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g. Master Engineering Pass"
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-amber-500 font-bold shadow-sm"
                    required
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Bundle Description
                  </label>{" "}
                  <input
                    value={newBundle.description}
                    onChange={(e) =>
                      setNewBundle({
                        ...newBundle,
                        description: e.target.value,
                      })
                    }
                    placeholder="Why should they buy this?"
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-amber-500 font-bold shadow-sm"
                  />{" "}
                </div>{" "}
              </div>{" "}
              <div className="grid grid-cols-2 gap-6">
                {" "}
                <div className="space-y-1">
                  {" "}
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Base Value (Rs)
                  </label>{" "}
                  <input
                    type="number"
                    value={newBundle.basePrice}
                    onChange={(e) =>
                      setNewBundle({
                        ...newBundle,
                        basePrice: e.target.value,
                      })
                    }
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Selling Price (Rs)
                  </label>{" "}
                  <input
                    type="number"
                    value={newBundle.discountedPrice}
                    onChange={(e) =>
                      setNewBundle({
                        ...newBundle,
                        discountedPrice: e.target.value,
                      })
                    }
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />{" "}
                </div>{" "}
              </div>{" "}
              <div className="space-y-4">
                {" "}
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                  Select Included Courseware
                </label>{" "}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {" "}
                  {regularCourses.map((c) => {
                    const isSelected = newBundle.includedCourseIds.includes(
                      c.id,
                    );

                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          const news = isSelected
                            ? newBundle.includedCourseIds.filter(
                                (id) => id !== c.id,
                              )
                            : [...newBundle.includedCourseIds, c.id];

                          setNewBundle({
                            ...newBundle,
                            includedCourseIds: news,
                          });
                        }}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${isSelected ? "border-amber-500 bg-amber-50 " : "border-slate-100 hover:border-slate-200"}`}
                      >
                        {" "}
                        <span
                          className={`text-xs font-bold ${isSelected ? "text-amber-700 " : "text-slate-500 "}`}
                        >
                          {c.title}
                        </span>{" "}
                        <div
                          className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${isSelected ? "bg-amber-500 border-amber-500" : "border-slate-200 "}`}
                        >
                          {" "}
                          {isSelected && (
                            <span className="text-white text-[10px]">✓</span>
                          )}{" "}
                        </div>{" "}
                      </div>
                    );
                  })}{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex gap-4 pt-4 sticky bottom-0 bg-white py-4 mt-4 border-t border-slate-100">
                {" "}
                <button
                  type="submit"
                  className="flex-1 py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-500/20 hover:bg-amber-700 transition-all"
                >
                  Establish Mega Pass
                </button>{" "}
                <button
                  type="button"
                  onClick={() => setIsCreatingBundle(false)}
                  className="px-10 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Abort
                </button>{" "}
              </div>{" "}
            </form>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {editingCourse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {" "}
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 space-y-8 shadow-2xl animate-in zoom-in duration-300">
            {" "}
            <h4 className="text-2xl font-black text-slate-900">
              Edit Course Metadata
            </h4>{" "}
            <form onSubmit={saveEdit} className="space-y-6">
              {" "}
              <div className="space-y-1">
                {" "}
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Course Title
                </label>{" "}
                <input
                  value={editingCourse.title}
                  onChange={(e) =>
                    setEditingCourse({
                      ...editingCourse,
                      title: e.target.value,
                    })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  required
                />{" "}
              </div>{" "}
              <div className="space-y-1">
                {" "}
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Category (e.g. MBBS, Engineering)
                </label>{" "}
                <input
                  value={editingCourse.category || ""}
                  onChange={(e) =>
                    setEditingCourse({
                      ...editingCourse,
                      category: e.target.value,
                    })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  placeholder="e.g. Medical"
                />{" "}
              </div>{" "}
              <div className="space-y-1">
                {" "}
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Description
                </label>{" "}
                <textarea
                  value={editingCourse.description}
                  onChange={(e) =>
                    setEditingCourse({
                      ...editingCourse,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold min-h-[100px]"
                />{" "}
              </div>{" "}
              <div className="grid grid-cols-2 gap-4">
                {" "}
                <div className="space-y-1">
                  {" "}
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Submission Limit (Attempts)
                  </label>{" "}
                  <input
                    type="number"
                    value={editingCourse.attemptLimit || 2}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        attemptLimit: Number(e.target.value),
                      })
                    }
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Access Type
                  </label>{" "}
                  <select
                    value={editingCourse.isPremium ?? true}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        isPremium: e.target.value === "true",
                      })
                    }
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  >
                    {" "}
                    <option value="true">Premium Course</option>{" "}
                    <option value="false">Free Course</option>{" "}
                  </select>{" "}
                </div>{" "}
              </div>{" "}
              <div className="grid grid-cols-3 gap-4">
                {" "}
                <div className="space-y-1">
                  {" "}
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Time Limit (Mins)
                  </label>{" "}
                  <input
                    type="number"
                    value={editingCourse.durationMinutes || ""}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        durationMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    placeholder="e.g. 45"
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Questions
                  </label>{" "}
                  <input
                    type="number"
                    value={editingCourse.questionLimit || ""}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        questionLimit: Number(e.target.value),
                      })
                    }
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    placeholder="e.g. 50"
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-600">
                    Full Marks
                  </label>{" "}
                  <input
                    type="number"
                    value={editingCourse.fullMarks || ""}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        fullMarks: Number(e.target.value),
                      })
                    }
                    className="w-full p-4 bg-emerald-50 border border-emerald-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-black text-emerald-700"
                    placeholder="e.g. 100"
                  />{" "}
                </div>{" "}
              </div>{" "}
              <div className="grid grid-cols-2 gap-4">
                {" "}
                <div className="space-y-1">
                  {" "}
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Base Price (Rs)
                  </label>{" "}
                  <input
                    type="number"
                    value={editingCourse.basePrice || ""}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        basePrice: Number(e.target.value),
                      })
                    }
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Discount Price (Rs)
                  </label>{" "}
                  <input
                    type="number"
                    value={editingCourse.discountedPrice || ""}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        discountedPrice: Number(e.target.value),
                      })
                    }
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold"
                  />{" "}
                </div>{" "}
              </div>{" "}
              <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
                {" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <input
                    type="checkbox"
                    checked={editingCourse.isBundle || false}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        isBundle: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded-lg border-blue-300 text-blue-600 focus:ring-blue-500"
                  />{" "}
                  <span className="text-xs font-black text-blue-900 uppercase tracking-widest">
                    Bundle Package (Multi-Course)
                  </span>{" "}
                </div>{" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <input
                    type="checkbox"
                    checked={editingCourse.showTrial ?? true}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        showTrial: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded-lg border-blue-300 text-blue-600 focus:ring-blue-500"
                  />{" "}
                  <span className="text-xs font-black text-blue-900 uppercase tracking-widest">
                    Show Trial Version
                  </span>{" "}
                </div>{" "}
                {editingCourse.isBundle && (
                  <div className="space-y-1">
                    {" "}
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Included Course IDs (Comma Separated)
                    </label>{" "}
                    <input
                      value={editingCourse.includedCourseIds || ""}
                      onChange={(e) =>
                        setEditingCourse({
                          ...editingCourse,
                          includedCourseIds: e.target.value,
                        })
                      }
                      placeholder="e.g. courseId1, courseId2"
                      className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
                    />{" "}
                  </div>
                )}{" "}
              </div>{" "}
              <div className="flex flex-col gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                {" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <input
                    type="checkbox"
                    checked={editingCourse.isDiscounted || false}
                    onChange={(e) =>
                      setEditingCourse({
                        ...editingCourse,
                        isDiscounted: e.target.checked,
                      })
                    }
                    className="w-5 h-5 accent-emerald-600"
                  />{" "}
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Enable Sale Discount
                  </span>{" "}
                </div>{" "}
                {editingCourse.isDiscounted && (
                  <div className="space-y-1">
                    {" "}
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Flash Sale End (Optional ISO Date)
                    </label>{" "}
                    <input
                      type="datetime-local"
                      value={
                        editingCourse.flashSaleEndTime
                          ? new Date(editingCourse.flashSaleEndTime)
                              .toISOString()
                              .slice(0, 16)
                          : ""
                      }
                      onChange={(e) =>
                        setEditingCourse({
                          ...editingCourse,
                          flashSaleEndTime: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        })
                      }
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-xs"
                    />{" "}
                  </div>
                )}{" "}
              </div>{" "}
              <div className="flex gap-4 pt-4">
                {" "}
                <button
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700"
                >
                  Update Repository
                </button>{" "}
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-6 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 :bg-slate-700"
                >
                  Cancel
                </button>{" "}
              </div>{" "}
            </form>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}

function CourseCard({ course, onEdit, onToggle, onDelete, isBundle }) {
  return (
    <div
      className={`bg-white rounded-[2.5rem] border ${isBundle ? "border-amber-500/30 bg-gradient-to-br from-white to-amber-50/10 " : "border-slate-200 "}p-8 shadow-sm flex flex-col justify-between hover:shadow-2xl transition-all group relative overflow-hidden`}
    >
      {" "}
      {isBundle && (
        <div className="absolute -top-4 -right-4 text-6xl opacity-10 rotate-12 group-hover:rotate-0 transition-all">
          💎
        </div>
      )}{" "}
      <div className="space-y-4 relative z-10">
        {" "}
        <div className="flex justify-between items-start">
          {" "}
          <div
            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${course.status !== "draft" ? "bg-emerald-100 text-emerald-700 " : "bg-rose-100 text-rose-700 "}`}
          >
            {" "}
            {course.status !== "draft" ? "Published" : "Unpublished"}{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <button
              onClick={() => onDelete(course.id)}
              className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
              title="Delete Course Permanently"
            >
              {" "}
              🗑️{" "}
            </button>{" "}
            <div className="text-2xl transition-transform group-hover:scale-110">
              {isBundle ? "👑" : "📚"}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div>
          {" "}
          <h4
            className={`text-xl font-black tracking-tight ${isBundle ? "text-amber-600 " : "text-slate-900 "}`}
          >
            {course.title}
          </h4>{" "}
          <p className="text-xs text-slate-500 font-bold italic mt-2 line-clamp-2 leading-relaxed">
            "{course.description || "Automated question repository."}"
          </p>{" "}
          <div className="mt-6 flex flex-col gap-2">
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Rate:
              </span>{" "}
              {course.isDiscounted ? (
                <span className="text-[12px] font-black text-emerald-500">
                  Rs. {course.discountedPrice}{" "}
                  <span className="text-slate-400 line-through text-[9px] font-bold ml-1">
                    Rs. {course.basePrice}
                  </span>
                </span>
              ) : (
                <span className="text-[12px] font-black text-slate-800 italic">
                  Rs. {course.basePrice || "0"}
                </span>
              )}{" "}
            </div>{" "}
            {isBundle && (
              <div className="flex items-center gap-2">
                {" "}
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                  Contains:
                </span>{" "}
                <span className="text-[10px] font-bold text-slate-600 font-mono">
                  {(course.includedCourseIds || "").split(",").length}
                  Modules
                </span>{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex gap-3 pt-8 relative z-10">
        {" "}
        <button
          onClick={() => onToggle(course.id, course.status)}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg ${course.status !== "draft" ? "bg-slate-900 text-white hover:bg-rose-600" : "bg-blue-600 text-white hover:bg-blue-700"}`}
        >
          {" "}
          {course.status !== "draft" ? "Unpublish" : "Go Live"}{" "}
        </button>{" "}
        <button
          onClick={() => onEdit(course)}
          className={`px-6 py-4 rounded-2xl transition-all border-2 ${isBundle ? "border-amber-500/20 bg-amber-50 text-amber-500 hover:bg-amber-100" : "bg-slate-50 text-slate-400 border-slate-100 hover:text-blue-500"}`}
        >
          {" "}
          ✏️{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
}
