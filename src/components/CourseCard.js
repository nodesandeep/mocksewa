"use client";

import React, { useState, useEffect } from "react";

import Link from "next/link";

import { useAuth } from "@/context/AuthContext";

import { db } from "@/utils/firebase";

import { collection, query, where, getDocs, limit } from "firebase/firestore";

export default function CourseCard({ course, onLaunch, onUnlock, providedEnrolled }) {
  const { user } = useAuth();

  const [isHovered, setIsHovered] = useState(false);

  const [subjects, setSubjects] = useState([]);

  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const isPremium = course.isPremium !== undefined
    ? Boolean(course.isPremium)
    : Number(course.basePrice) > 0;

  const isEnrolled = providedEnrolled !== undefined 
    ? providedEnrolled 
    : (!isPremium || user?.enrolledCourses?.includes(course.id));

  const displayPrice = course.isDiscounted
    ? course.discountedPrice || course.basePrice
    : course.basePrice || 0;

  // Time Difference logic
  // for "Last Updated"
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return "Recently";

    try {
      const date = new Date(timestamp);

      const now = new Date();

      const diffMs = now - date;

      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";

      if (diffDays === 1) return "Yesterday";

      if (diffDays < 7)
        return `${diffDays}days ago`;

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "Recently";
    }
  };
  useEffect(() => {
    if (isHovered && subjects.length === 0 && !loadingSubjects) {
      const fetchSubjects = async () => {
        setLoadingSubjects(true);
        try {
          const res = await fetch(`/api/admin/content?type=subjects&courseId=${course.id}`);
          if (res.ok) {
            const data = await res.json();
            setSubjects(data.map(s => s.title));
          }
        } catch (err) {
          console.error("Hover fetch error:", err);
        } finally {
          setLoadingSubjects(false);
        }
      };
      fetchSubjects();
    }
  }, [isHovered, course.id]);

  const handleUnlockClick = (e) => {
    if (!user) return;

    // Link will take care of login
if (onUnlock) onUnlock(course);
  };
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group bg-white rounded-3xl border border-slate-200 p-6 flex flex-col h-full hover:shadow-xl hover:shadow-brand-navy/5 hover:-translate-y-1.5 transition-all duration-500 overflow-hidden relative"
    >
      {" "}
      {/* Last Updated Badge */}
      <div className="absolute top-4 left-6 z-10">
        {" "}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/90 backdrop-blur rounded-lg border border-slate-100 shadow-sm">
          {" "}
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>{" "}
          <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
            {" "}
            Updated {getRelativeTime(course.lastUpdated)}
          </span>{" "}
        </div>{" "}
      </div>{" "}
      <div className="absolute top-0 right-0 p-4 flex gap-2">
        {" "}
        <span
          className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${course.isPremium === false? "bg-emerald-100 text-emerald-700": "bg-rose-100 text-rose-700"}`}
        >
          {" "}
          {course.isPremium === false ? "FREE" : "PREMIUM"}
        </span>{" "}
        <span
          className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${course.isDiscounted? "bg-brand-crimson/10 text-brand-crimson": "bg-slate-100 text-slate-500"}`}
        >
          {" "}
          {course.isDiscounted ? "Special" : "Standard"}
        </span>{" "}
      </div>{" "}
      <div className="w-14 h-14 bg-slate-50 text-brand-navy rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:bg-brand-navy group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100">
        {" "}
        {course.category === "engineering"
          ? "⚙️"
          : course.category === "medical"
            ? "⚕️"
            : "📚"}
      </div>{" "}
      <div className="relative flex-1">
        {" "}
        {/* Syllabus Hover Overlay */}
        <div
          className={`absolute inset-0 bg-white/95 backdrop-blur-sm z-20 transition-all duration-500 flex flex-col justify-center ${isHovered && subjects.length > 0? "opacity-100 translate-y-0": "opacity-0 translate-y-4 pointer-events-none"}`}
        >
          {" "}
          <p className="text-[8px] font-black text-brand-navy uppercase tracking-[0.2em] mb-3">
            Live Syllabus Preview
          </p>{" "}
          <div className="space-y-2">
            {" "}
            {subjects.map((sub, i) => (
              <div key={i} className="flex items-center gap-2">
                {" "}
                <span className="text-emerald-500 text-[10px]">✓</span>{" "}
                <span className="text-[10px] font-bold text-slate-700">
                  {sub}
                </span>{" "}
              </div>
            ))}
            <div className="text-[10px] font-bold text-slate-400 italic pt-1">
              + Detailed Module Review
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <h3 className="text-xl font-black text-slate-900 mb-2 line-clamp-2">
          {course.title}
        </h3>{" "}
        <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6 line-clamp-3">
          {" "}
          {course.description ||
            "Master your professional license with our comprehensive mock exam ecosystem and detailed 💡 hint review."}
        </p>{" "}
      </div>{" "}
      <div className="pt-6 border-t border-slate-50 flex items-center justify-between mt-auto">
        {" "}
        <div className="space-y-0.5">
          {" "}
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Pricing
          </div>{" "}
          <div className="text-lg font-black text-slate-900">
            {" "}
            Rs. {displayPrice.toLocaleString()}
          </div>{" "}
        </div>{" "}
        {!user ? (
          <Link
            href="/login"
            className="px-6 py-3 bg-brand-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-brand-navy/20"
          >
            {" "}
            Login to Enroll{" "}
          </Link>
        ) : isEnrolled ? (
          <div className="flex items-center gap-2">
            <Link
              href={`/courses/${course.id}/learn`}
              className="px-4 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-blue-200"
              title="Read Chapter Notes & Take Practice Tests"
            >
              📖 Notes & Path
            </Link>
            {onLaunch ? (
              <button
                onClick={() => onLaunch(course, true)}
                className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
              >
                Mock Test →
              </button>
            ) : (
              <Link
                href="/student"
                className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
              >
                Go to Hub
              </Link>
            )}
          </div>
        ) : (
          <button
            onClick={handleUnlockClick}
            className="px-6 py-3 bg-brand-crimson text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-800 transition-all shadow-lg shadow-brand-crimson/20"
          >
            {" "}
            Unlock Course{" "}
          </button>
        )}
      </div>{" "}
    </div>
  );
}
