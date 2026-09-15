"use client";

import React, { useState, useEffect } from "react";

import { useAuth } from "@/context/AuthContext";

import DashboardHome from "./admin/DashboardHome";

import UserManager from "./admin/UserManager";

import ContentSection from "./admin/ContentSection";

import MaterialsSection from "./admin/MaterialsSection";

import CourseAccess from "./admin/CourseAccess";

import Finance from "./admin/Finance";

import Leaderboard from "./admin/Leaderboard";

import PowerTools from "./admin/PowerTools";

import CourseManager from "./admin/CourseManager";

import NotificationCenter from "./admin/NotificationCenter";

import ReportsManager from "./admin/ReportsManager";

import TrialManager from "./admin/TrialManager";
import ChapterManager from "./admin/ChapterManager";

import BrandName from "./BrandName";

import { motion, AnimatePresence } from "framer-motion";

export default function AdminDashboard() {
  const { user, logout, darkMode, toggleDarkMode, mounted } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuGroups = [
    {
      title: "Insights",
      items: [
        {
          id: "overview",
          label: "Overview",
          icon: "📊",
        },
        {
          id: "leaderboard",
          label: "Global Ranking",
          icon: "🏆",
        },
      ],
    },
    {
      title: "Content Lab",
      items: [
        {
          id: "courses",
          label: "Course Gallery",
          icon: "📁",
        },
        {
          id: "questions",
          label: "Curriculum Builder",
          icon: "📝",
        },
        {
          id: "trials",
          label: "Trial Manager",
          icon: "🎮",
        },
        {
          id: "reports",
          label: "Accuracy Triage",
          icon: "🛡️",
        },
        {
          id: "materials",
          label: "Resource Library",
          icon: "📚",
        },
        {
          id: "chapters",
          label: "Chapter Notes (LMS)",
          icon: "📖",
        },
      ],
    },
    {
      title: "Operations",
      items: [
        {
          id: "finance",
          label: "Payment Queue",
          icon: "💰",
        },
        {
          id: "access",
          label: "Access Grant",
          icon: "🔑",
        },
        {
          id: "students",
          label: "Lead Center",
          icon: "👥",
        },
      ],
    },
    {
      title: "Infrastructure",
      items: [
        {
          id: "notifications",
          label: "Broadcaster",
          icon: "📣",
        },
        {
          id: "power",
          label: "Power Tools",
          icon: "⚡",
        },
      ],
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <DashboardHome onNavigate={(tab) => setActiveTab(tab)} />;

      case "students":
        return <UserManager />;

      case "questions":
        return <ContentSection />;

      case "courses":
        return <CourseManager />;

      case "materials":
        return <MaterialsSection />;

      case "chapters":
        return <ChapterManager />;

      case "access":
        return <CourseAccess />;

      case "trials":
        return <TrialManager />;

      case "power":
        return <PowerTools />;

      case "finance":
        return <Finance />;

      case "leaderboard":
        return <Leaderboard />;

      case "notifications":
        return <NotificationCenter />;

      case "reports":
        return <ReportsManager />;

      default:
        return <DashboardHome />;
    }
  };
  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background transition-colors duration-500">
      {" "}
      {/* Mobile Header */}{" "}
      <div className="lg:hidden flex items-center justify-between p-4 bg-surface border-b border-border sticky top-0 z-50">
        {" "}
        <div className="flex items-center gap-3">
          {" "}
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
            🚀
          </div>{" "}
          <BrandName className="text-xl" light={true} />{" "}
        </div>{" "}
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="p-2 text-textPrimary"
        >
          {" "}
          {isSidebarOpen ? "✕" : "☰"}{" "}
        </button>{" "}
      </div>{" "}
      {/* Sidebar */}{" "}
      <aside
        className={` fixed inset-y-0 left-0 z-50 w-72 bg-surface text-textSecondary p-6 flex flex-col transition-transform duration-500 lg:sticky lg:h-screen lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {" "}
        <div className="hidden lg:flex items-center gap-3 mb-10 px-2">
          {" "}
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl shadow-xl shadow-blue-900/40">
            🚀
          </div>{" "}
          <h1 className="text-2xl font-black tracking-tighter text-textPrimary">
            {" "}
            <BrandName className="text-2xl" light={true} />{" "}
            <span className="text-blue-500 text-[10px] uppercase tracking-widest ml-1 block opacity-50">
              Command Node
            </span>{" "}
          </h1>{" "}
        </div>{" "}
        <nav className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
          {" "}
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              {" "}
              <h3 className="px-4 text-[9px] font-black uppercase tracking-[0.3em] text-textSecondary mb-3">
                {group.title}
              </h3>{" "}
              <div className="space-y-1">
                {" "}
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);

                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-4 transition-all group ${activeTab === item.id ? "bg-brand text-white shadow-lg shadow-blue-900/20" : "hover:bg-white/5 hover:text-slate-200"}`}
                  >
                    {" "}
                    <span
                      className={`text-lg transition-transform group-hover:scale-110 ${activeTab === item.id ? "opacity-100" : "opacity-40"}`}
                    >
                      {" "}
                      {item.icon}{" "}
                    </span>{" "}
                    <span className="text-xs font-bold tracking-tight">
                      {item.label}
                    </span>{" "}
                    {activeTab === item.id && (
                      <motion.div
                        layoutId="activeInd"
                        className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-glow"
                      />
                    )}{" "}
                  </button>
                ))}{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </nav>{" "}
        <div className="mt-auto space-y-6">
          {" "}
          <div className="p-5 bg-background/40 rounded-3xl border border-border/30 space-y-4">
            {" "}
            <div className="flex justify-between items-center">
              {" "}
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                System Health
              </p>{" "}
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-glow"></span>{" "}
            </div>{" "}
            <div className="space-y-2">
              {" "}
              <div className="flex justify-between text-[10px]">
                {" "}
                <span className="font-bold text-slate-500">Nodes</span>{" "}
                <span className="font-black text-slate-300">
                  Operational
                </span>{" "}
              </div>{" "}
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                {" "}
                <motion.div
                  initial={{
                    width: 0,
                  }}
                  animate={{
                    width: "94%",
                  }}
                  className="bg-blue-600 h-full"
                />{" "}
              </div>{" "}
              <div className="flex justify-between text-[10px]">
                {" "}
                <span className="font-bold text-slate-500">Uptime</span>{" "}
                <span className="font-black text-slate-300">99.98%</span>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <div className="p-5 bg-slate-800/20 rounded-3xl border border-border/50">
            {" "}
            <div className="flex items-center gap-3 mb-4">
              {" "}
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black italic text-textPrimary">
                {" "}
                {user?.name?.charAt(0)}{" "}
              </div>{" "}
              <div className="flex-1 min-w-0">
                {" "}
                <p className="text-[10px] font-black text-textSecondary uppercase tracking-widest leading-none mb-1">
                  Authenticated as
                </p>{" "}
                <p className="text-xs font-bold text-slate-200 truncate">
                  {user?.name}
                </p>{" "}
              </div>{" "}
            </div>{" "}
            <div className="grid grid-cols-2 gap-2">
              {" "}
              <button
                onClick={toggleDarkMode}
                className="p-2.5 bg-slate-800/50 rounded-xl text-center hover:bg-slate-800 transition-colors"
              >
                {" "}
                {darkMode ? "☀️" : "🌙"}{" "}
              </button>{" "}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-2.5 bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-500 hover:text-textPrimary transition-all"
              >
                {" "}
                Exit{" "}
              </button>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </aside>{" "}
      {/* Main Content */}{" "}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {" "}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 lg:py-12">
          {" "}
          <AnimatePresence mode="wait">
            {" "}
            <motion.div
              key={activeTab}
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -10,
              }}
              transition={{
                duration: 0.3,
              }}
              className="space-y-8"
            >
              {" "}
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all">
                {" "}
                <div className="space-y-1">
                  {" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>{" "}
                    <h2 className="text-[10px] font-black text-textSecondary uppercase tracking-[0.3em]">
                      Operational Node: {activeTab}
                    </h2>{" "}
                  </div>{" "}
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
                    {" "}
                    {menuGroups
                      .flatMap((g) => g.items)
                      .find((i) => i.id === activeTab)?.label || activeTab}{" "}
                  </h3>{" "}
                </div>{" "}
                <div className="flex items-center gap-4 w-full md:w-auto">
                  {" "}
                  <div className="flex-1 md:w-48 h-12 bg-background rounded-2xl border border-slate-100 flex items-center px-4 gap-3">
                    {" "}
                    <span className="text-textSecondary">🔍</span>{" "}
                    <input
                      type="text"
                      placeholder="Global Search..."
                      className="bg-transparent border-none outline-none text-xs font-bold w-full"
                    />{" "}
                  </div>{" "}
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-textPrimary italic shadow-lg shadow-blue-500/20">
                    {" "}
                    {user?.name?.charAt(0)}{" "}
                  </div>{" "}
                </div>{" "}
              </header>{" "}
              <div className="min-h-[60vh]"> {renderContent()}</div>{" "}
            </motion.div>{" "}
          </AnimatePresence>{" "}
        </div>{" "}
      </main>{" "}
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
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 tracking-tight">
                Confirm Sign Out
              </h3>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                Are you sure you want to end your active session? Any unsaved progress will be lost.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-8">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-600 dark:text-slate-300 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all cursor-pointer border border-slate-200/40 dark:border-slate-700"
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
