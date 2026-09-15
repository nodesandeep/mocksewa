"use client";

import React, { useState, useEffect } from "react";

import { db } from "../../utils/firebase";

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  deleteDoc,
  doc,
} from "firebase/firestore";

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);

  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "siteNotifications"),
      orderBy("timestamp", "desc"),
      limit(10),
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
      );

      setLoading(false);
    });

    return unsub;
  }, []);

  const handleSendNotification = async (e) => {
    e.preventDefault();

    const title = e.target.title.value;

    const body = e.target.body.value;

    const type = e.target.type.value;

    // info, success, warning, danger
    if (!title || !body) return;

    setIsSending(true);

    try {
      await addDoc(collection(db, "siteNotifications"), {
        title,
        body,
        type,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week default
      });

      e.target.reset();

      alert("Broadcast sent successfully!");
    } catch (err) {
      alert("Error:" + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Delete this notification?")) {
      await deleteDoc(doc(db, "siteNotifications", id));
    }
  };

  if (loading)
    return (
      <div className="p-8 animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">
        Loading sync bridge...
      </div>
    );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
      {" "}
      <div className="space-y-8">
        {" "}
        <header>
          {" "}
          <h3 className="text-3xl font-black text-slate-800 tracking-tighter">
            Broadcast Center
          </h3>{" "}
          <p className="text-sm font-bold text-slate-400">
            Push real-time alerts to all logged-in students.
          </p>{" "}
        </header>{" "}
        <form
          onSubmit={handleSendNotification}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6"
        >
          {" "}
          <div className="space-y-1">
            {" "}
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Alert Theme
            </label>{" "}
            <select
              name="type"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500"
            >
              {" "}
              <option value="info">💡 Information (Blue)</option>{" "}
              <option value="success">✅ Announcement (Emerald)</option>{" "}
              <option value="warning">⚠️ Urgent Notice (Amber)</option>{" "}
              <option value="danger">🚨 Critical/Exam Update (Red)</option>{" "}
            </select>{" "}
          </div>{" "}
          <div className="space-y-1">
            {" "}
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Notification Title
            </label>{" "}
            <input
              name="title"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500"
              placeholder="e.g. NEA Mock Test #4 is Live!"
              required
            />{" "}
          </div>{" "}
          <div className="space-y-1">
            {" "}
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Message Body
            </label>{" "}
            <textarea
              name="body"
              rows="4"
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500"
              placeholder="Details about this update..."
              required
            ></textarea>{" "}
          </div>{" "}
          <button
            type="submit"
            disabled={isSending}
            className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]"
          >
            {" "}
            {isSending ? "📡 Broadcasting..." : "🚀 Release to Platform"}
          </button>{" "}
        </form>{" "}
      </div>{" "}
      <div className="space-y-8">
        {" "}
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Recent Broadcast History
        </h4>{" "}
        <div className="space-y-4">
          {" "}
          {notifications.map((nf) => (
            <div
              key={nf.id}
              className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex justify-between items-start group"
            >
              {" "}
              <div className="space-y-2">
                {" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <span
                    className={`w-2 h-2 rounded-full ${nf.type === "danger" ? "bg-rose-500" : nf.type === "warning" ? "bg-amber-500" : nf.type === "success" ? "bg-emerald-500" : "bg-blue-500"}`}
                  ></span>{" "}
                  <h5 className="font-bold text-slate-900">{nf.title}</h5>{" "}
                </div>{" "}
                <p className="text-xs text-slate-500 leading-relaxed italic pr-4">
                  {nf.body}
                </p>{" "}
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                  {new Date(nf.timestamp).toLocaleString()}
                </p>{" "}
              </div>{" "}
              <button
                onClick={() => handleDelete(nf.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
              >
                🗑️
              </button>{" "}
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="text-center p-20 text-slate-300 font-bold italic border-2 border-dashed border-slate-100 rounded-[3rem]">
              No sent notifications discovered.
            </div>
          )}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
