"use client";

import React, { useState, useEffect } from "react";
import { db } from "../../utils/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

export default function ReportsManager() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isFixing, setIsFixing] = useState(false);
  const [activeReportId, setActiveReportId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setReports(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const groupedReports = reports.reduce((acc, report) => {
    if (report.status === "resolved") return acc;
    if (!acc[report.questionId]) {
      acc[report.questionId] = {
        questionId: report.questionId,
        questionText: report.questionText,
        quizTitle: report.quizTitle,
        reports: [],
        latestTimestamp: report.timestamp,
      };
    }
    acc[report.questionId].reports.push(report);
    return acc;
  }, {});

  const triageList = Object.values(groupedReports).sort(
    (a, b) => b.reports.length - a.reports.length,
  );

  const handleQuickFix = async (questionId, reportId) => {
    setActiveReportId(reportId);
    try {
      const qDoc = await getDoc(doc(db, "questions", questionId));
      if (qDoc.exists()) {
        setEditingQuestion({
          id: qDoc.id,
          ...qDoc.data(),
        });
        setIsFixing(true);
      } else {
        alert("Question document not found. It might have been deleted.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveFix = async () => {
    if (!editingQuestion) return;
    try {
      await updateDoc(doc(db, "questions", editingQuestion.id), {
        questionText: editingQuestion.questionText,
        options: editingQuestion.options,
        correctOptionIndex: editingQuestion.correctOptionIndex,
        explanationText:
          editingQuestion.explanationText || editingQuestion.explanation || "",
      });

      const reportsToResolve = triageList.find(
        (t) => t.questionId === editingQuestion.id,
      ).reports;
      await Promise.all(
        reportsToResolve.map((r) =>
          updateDoc(doc(db, "reports", r.id), {
            status: "resolved",
            resolvedAt: new Date().toISOString(),
          }),
        ),
      );

      alert("Curriculum synchronized. Reports resolved.");
      setIsFixing(false);
      setEditingQuestion(null);
    } catch (err) {
      console.error(err);
      alert("Synchronization failure.");
    }
  };

  if (loading)
    return (
      <div className="p-12 animate-pulse text-slate-500 font-black uppercase tracking-widest text-[10px]">
        Synchronizing Feedback Node...
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h4 className="text-2xl font-black text-slate-900 tracking-tighter italic">
              Accuracy Triage
            </h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Moderating {triageList.length} unique contention points
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
              {reports.filter((r) => r.status === "resolved").length} Resolved
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                <th className="px-10 py-6">Incident Content</th>
                <th className="px-10 py-6">Volume</th>
                <th className="px-10 py-6">Latest Feedback</th>
                <th className="px-10 py-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {triageList.map((item) => (
                <tr
                  key={item.questionId}
                  className="hover:bg-slate-50/50 transition-all group"
                >
                  <td className="px-10 py-8 max-w-md">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2">
                      {item.quizTitle}
                    </p>
                    <p className="text-sm font-bold text-slate-900 line-clamp-2 italic leading-relaxed">
                      "{item.questionText}"
                    </p>
                  </td>
                  <td className="px-10 py-8">
                    <span
                      className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${item.reports.length >= 5 ? "bg-rose-100 text-rose-600 " : item.reports.length >= 2 ? "bg-amber-100 text-amber-600 " : "bg-slate-100 text-slate-500 "}`}
                    >
                      {item.reports.length} Reports
                    </span>
                  </td>
                  <td className="px-10 py-8 max-w-sm">
                    <div className="space-y-2">
                      {item.reports.slice(0, 1).map((r, i) => (
                        <div key={i} className="text-xs text-slate-500 italic">
                          "{r.feedback}"
                          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                            — {r.userName}
                          </p>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button
                      onClick={() =>
                        handleQuickFix(item.questionId, item.reports[0].id)
                      }
                      className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/10 active:scale-95"
                    >
                      Quick Fix →
                    </button>
                  </td>
                </tr>
              ))}
              {triageList.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-10 py-20 text-center">
                    <p className="text-4xl mb-4">✅</p>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      No active contention points. Curriculum is stable.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isFixing && editingQuestion && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFixing(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl h-full bg-white shadow-2xl overflow-hidden border-l border-slate-200 flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic whitespace-nowrap">
                    Content Resolution
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Master Curriculum Override
                  </p>
                </div>
                <button
                  onClick={() => setIsFixing(false)}
                  className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Question Text
                  </label>
                  <textarea
                    value={editingQuestion.questionText}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        questionText: e.target.value,
                      })
                    }
                    className="w-full h-32 bg-slate-50 rounded-3xl p-6 border-2 border-transparent focus:border-blue-600 outline-none text-sm font-bold transition-all resize-none"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Options Configuration
                  </label>
                  {editingQuestion.options.map((opt, i) => (
                    <div key={i} className="flex gap-4 items-center">
                      <button
                        onClick={() =>
                          setEditingQuestion({
                            ...editingQuestion,
                            correctOptionIndex: i,
                          })
                        }
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${editingQuestion.correctOptionIndex === i ? "bg-emerald-600 text-white shadow-lg" : "bg-slate-100 text-slate-400"}`}
                      >
                        {String.fromCharCode(65 + i)}
                      </button>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...editingQuestion.options];
                          newOpts[i] = e.target.value;
                          setEditingQuestion({
                            ...editingQuestion,
                            options: newOpts,
                          });
                        }}
                        className={`flex-1 h-14 bg-slate-50 rounded-2xl px-6 border-2 transition-all outline-none font-medium ${editingQuestion.correctOptionIndex === i ? "border-emerald-600/30" : "border-transparent"}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    💡 Hint / Explanation
                  </label>
                  <textarea
                    value={
                      editingQuestion.explanationText ||
                      editingQuestion.explanation ||
                      ""
                    }
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        explanationText: e.target.value,
                      })
                    }
                    className="w-full h-32 bg-slate-50 rounded-3xl p-6 border-2 border-transparent focus:border-blue-600 outline-none text-sm font-medium transition-all resize-none"
                  />
                </div>
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={saveFix}
                  className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95 transform"
                >
                  Resolve Reports & Sync Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
