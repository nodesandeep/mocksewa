"use client";
import React from "react";

export default function RestrictedAccessModal({
  isOpen,
  onClose,
  courseTitle,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8 space-y-6 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 transition-all font-bold"
        >
          ✕
        </button>

        <div className="text-center space-y-6 pt-4">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl flex items-center justify-center text-4xl mx-auto border border-rose-100 dark:border-rose-800">
            🔒
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Access Restricted
            </h3>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px] mx-auto">
              Examinations for{" "}
              <span className="text-brand-navy dark:text-blue-400 font-black">
                {courseTitle}
              </span>{" "}
              require an active enrollment license.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full py-5 bg-brand-navy text-white font-black rounded-2xl shadow-xl shadow-brand-navy/20 hover:-translate-y-1 transition-all uppercase tracking-widest text-xs"
          >
            Unlock Full Access
          </button>
          <button
            onClick={onClose}
            className="w-full py-4 text-slate-400 dark:text-slate-500 font-black hover:text-slate-600 transition-all text-[10px] uppercase tracking-widest"
          >
            Continue Exploring
          </button>
        </div>
      </div>
    </div>
  );
}
