"use client";

import React, { useState, useEffect } from "react";

import { auth } from "../../utils/firebase";
import { useAuth } from "@/context/AuthContext";

import { motion } from "framer-motion";

export default function DashboardHome({ onNavigate }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    revenue: 0,
    activeStudents: 0,
    pendingPayments: 0,
    newLeads: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) throw new Error('No auth token');
        const res = await fetch("/api/admin/stats", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Dashboard Stats Error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading)
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        {" "}
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>{" "}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Compiling Analytics...
        </p>{" "}
      </div>
    );

  return (
    <div className="space-y-10">
      {" "}
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {" "}
        <StatCard
          label="Total Revenue"
          value={`NPR ${stats.revenue.toLocaleString()}`}
          sub="Verified earnings"
          icon="💰"
          color="blue"
        />{" "}
        <StatCard
          label="Active Examinees"
          value={stats.activeStudents}
          sub="Currently studying"
          icon="👥"
          color="emerald"
        />{" "}
        <StatCard
          label="Pending Verifications"
          value={stats.pendingPayments}
          sub="Awaiting action"
          icon="⏳"
          color="rose"
          warning={stats.pendingPayments > 0}
        />{" "}
        <StatCard
          label="New Leads"
          value={stats.newLeads}
          sub="Last 24 hours"
          icon="🚀"
          color="amber"
          onClick={() => onNavigate && onNavigate("students")}
        />{" "}
      </div>{" "}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {" "}
        {/* Quick Launch Section */}
        <section className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl group border border-slate-800">
          {" "}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-600/30 transition-colors"></div>{" "}
          <div className="relative z-10 space-y-6">
            {" "}
            <div className="inline-block px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/30">
              System Broadcast
            </div>{" "}
            <h3 className="text-3xl font-black tracking-tighter leading-tight">
              Instant Network <br />
              Notification
            </h3>{" "}
            <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-sm">
              Dispatch an urgent alert to all active student nodes across the
              platform instantly.
            </p>{" "}
            <button
              onClick={() => onNavigate && onNavigate("notifications")}
              className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-xl active:scale-95 text-xs uppercase tracking-widest cursor-pointer"
            >
              Deploy Broadcast
            </button>
          </div>
        </section>

        {/* LMS Chapter Studio Card */}
        <section className="bg-gradient-to-br from-emerald-900 to-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl group border border-emerald-800/50">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/30 transition-colors pointer-events-none"></div>
          <div className="relative z-10 space-y-6">
            <div className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-400/30">
              LMS Engine Active
            </div>
            <h3 className="text-3xl font-black tracking-tighter leading-tight">
              Sequential Gating <br />
              & Chapter Studio
            </h3>
            <p className="text-slate-300 font-medium text-sm leading-relaxed max-w-sm">
              Author rich markdown notes, configure passing thresholds, import PSC/NEC question banks, and monitor student progression.
            </p>
            <button
              onClick={() => onNavigate && onNavigate("chapters")}
              className="px-8 py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl hover:bg-emerald-400 transition-all shadow-xl active:scale-95 text-xs uppercase tracking-widest cursor-pointer"
            >
              Open Chapter Studio →
            </button>
          </div>
        </section>

        {/* System Health / Secondary Metrics */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
          <header className="flex justify-between items-center">
            <div>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                System Infrastructure
              </h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Node status monitoring
              </p>
            </div>
            <span className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse"></span>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <HealthRow label="Firebase Cloud Sync" status="Operational" />
            <HealthRow label="Turso LibSQL Edge" status="Connected (Edge)" />
            <HealthRow label="Image Storage" status="Steady" />
            <HealthRow label="eSewa API Hook" status="Listening" />
            <HealthRow label="Global Leaderboard" status="Live" />
          </div>
        </div>{" "}
      </div>{" "}
    </div>
  );
}

function StatCard({ label, value, sub, icon, color, warning, onClick }) {
  const colorMap = {
    blue: "border-blue-500 shadow-blue-500/10",
    emerald: "border-emerald-500 shadow-emerald-500/10",
    rose: "border-rose-500 shadow-rose-500/10",
    amber: "border-amber-500 shadow-amber-500/10",
  };

  return (
    <motion.div
      whileHover={{
        y: -5,
      }}
      onClick={onClick}
      className={`bg-white p-8 rounded-[2rem] border-l-4 ${colorMap[color]} shadow-lg transition-all relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
      {" "}
      <div className="absolute top-4 right-4 text-2xl opacity-20">
        {icon}
      </div>{" "}
      <div className="space-y-1 relative z-10">
        {" "}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
          {label}
        </p>{" "}
        <h4
          className={`text-3xl font-black tracking-tighter ${warning ? "text-rose-600 animate-pulse" : "text-slate-900"}`}
        >
          {value}
        </h4>{" "}
        <p className="text-[10px] font-bold text-slate-500 italic mt-2">
          {sub}
        </p>{" "}
      </div>{" "}
    </motion.div>
  );
}

function HealthRow({ label, status }) {
  return (
    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
      {" "}
      <span className="text-sm font-bold text-slate-700">{label}</span>{" "}
      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
        {status}
      </span>{" "}
    </div>
  );
}
