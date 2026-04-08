import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { studentApi, adminApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { DashboardResponse, RadarEntry, Module, Course, Chapter } from '../types';

type NavLevel = 'module' | 'course' | 'chapter';

export default function Dashboard() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [navLevel, setNavLevel] = useState<NavLevel>('module');
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard'], queryFn: () => studentApi.dashboard(),
  });
  
  const { data: modulesData } = useQuery({
    queryKey: ['modules'], queryFn: () => adminApi.modules.list(),
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses', selectedModule?.id], enabled: !!selectedModule,
    queryFn: () => adminApi.courses.list(selectedModule!.id),
  });

  const { data: chaptersData } = useQuery({
    queryKey: ['chapters', selectedCourse?.id], enabled: !!selectedCourse,
    queryFn: () => adminApi.chapters.list(selectedCourse!.id),
  });

  const dashboard: DashboardResponse | null = dashData?.data ?? null;
  const modules: Module[] = modulesData?.data ?? [];
  const courses: Course[] = coursesData?.data ?? [];
  const chapters: Chapter[] = chaptersData?.data ?? [];

  const startLesson = (chapter: Chapter) => {
    navigate(`/lesson/${chapter.id}`, { state: { chapter } });
  };

  if (isLoading) return (
    <div className="min-h-screen hero-bg flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen hero-bg">
      <div className="max-w-7xl mx-auto p-6 animate-fade-in">
        {/* Welcome banner */}
        <div className="glass p-6 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Hello, <span className="gradient-text">{user?.full_name || user?.email?.split('@')[0]}</span> 👋
            </h1>
            <p className="text-slate-400 mt-1">Ready for your NEA Level 5 success?</p>
          </div>
          <div className="flex gap-3">
            {isAdmin && <button onClick={() => navigate('/admin')} className="btn-ghost text-sm">⚙️ Admin</button>}
            <button onClick={() => navigate('/leaderboard')} className="btn-ghost text-sm">🏆 Leaderboard</button>
            <button onClick={logout} className="btn-ghost text-sm text-red-400">Sign Out</button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Last Percent', value: dashboard?.last_quiz_score != null ? `${dashboard.last_quiz_score.toFixed(1)}%` : '—', icon: '📊', color: 'text-brand-400' },
            { label: 'Total Mock Tests', value: dashboard?.total_quizzes ?? 0, icon: '📝', color: 'text-green-400' },
            { label: 'Mastery Rate', value: dashboard?.chapter_mastery.length ? `${(dashboard.chapter_mastery.reduce((a, b) => a + b.score_percent, 0) / dashboard.chapter_mastery.length).toFixed(1)}%` : '0%', icon: '🚀', color: 'text-purple-400' },
            { label: 'Next Task', value: dashboard?.next_chapter ? '▶ Ready' : 'Done!', icon: '🏁', color: 'text-yellow-400' },
          ].map((stat) => (
            <div key={stat.label} className="glass p-5 text-center">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Navigation Area */}
          <div className="glass p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {navLevel !== 'module' && (
                  <button onClick={() => {
                    if (navLevel === 'chapter') { setNavLevel('course'); setSelectedCourse(null); }
                    else { setNavLevel('module'); setSelectedModule(null); }
                  }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-700 hover:bg-brand-500/20 text-white transition-all">←</button>
                )}
                <h2 className="text-xl font-bold text-white capitalize">
                  {navLevel === 'module' ? 'Select Module' : navLevel === 'course' ? selectedModule?.title : selectedCourse?.title}
                </h2>
              </div>
              <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                Level: {navLevel}
              </div>
            </div>

            {/* Modules Grid */}
            {navLevel === 'module' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {modules.map(m => (
                  <div key={m.id} onClick={() => { setSelectedModule(m); setNavLevel('course'); }}
                    className="p-6 rounded-2xl border border-slate-800 bg-surface-800 hover:border-brand-500/50 hover:bg-brand-500/5 cursor-pointer transition-all group">
                    <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">📂</div>
                    <div className="font-bold text-white text-lg">{m.title}</div>
                    <div className="text-sm text-slate-500 mt-1">Explore all categories in this module</div>
                  </div>
                ))}
              </div>
            )}

            {/* Courses List */}
            {navLevel === 'course' && (
              <div className="space-y-3">
                {courses.map(c => (
                  <div key={c.id} onClick={() => { setSelectedCourse(c); setNavLevel('chapter'); }}
                    className="flex items-center justify-between p-5 rounded-xl border border-slate-800 bg-surface-800 hover:border-brand-500/50 cursor-pointer transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-xl">📚</div>
                      <div className="font-semibold text-white">{c.title}</div>
                    </div>
                    <div className="text-brand-400 text-sm">Explore →</div>
                  </div>
                ))}
                {courses.length === 0 && <div className="text-center py-12 text-slate-500">No courses in this module yet.</div>}
              </div>
            )}

            {/* Chapters List */}
            {navLevel === 'chapter' && (
              <div className="space-y-3">
                {chapters.map(chap => (
                  <div key={chap.id} onClick={() => startLesson(chap)}
                    className="flex items-center justify-between p-5 rounded-xl border border-slate-800 bg-surface-800 hover:border-brand-500/50 cursor-pointer transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-xl">📖</div>
                      <div>
                        <div className="font-semibold text-white">{chap.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {chap.pdf_url && <span className="badge badge-brand text-[10px]">PDF</span>}
                          {chap.quiz_id && <span className="badge badge-warn text-[10px]">QUIZ</span>}
                        </div>
                      </div>
                    </div>
                    <button className="btn-brand px-4 py-2 text-xs">Start Lesson</button>
                  </div>
                ))}
                {chapters.length === 0 && <div className="text-center py-12 text-slate-500">No chapters in this course yet.</div>}
              </div>
            )}
          </div>

          {/* Sidebar: Analytics & Mastery */}
          <div className="space-y-4">
            {/* Next Chapter Card */}
            {dashboard?.next_chapter && (
              <div className="glass p-5 border-l-4 border-brand-500">
                <div className="text-xs font-bold text-brand-400 uppercase mb-3">Continue Where You Left Off</div>
                <div className="mb-4">
                  <div className="font-bold text-white text-lg">{dashboard.next_chapter.title}</div>
                  <div className="text-xs text-slate-500 mt-1">Recommended next lesson</div>
                </div>
                <button onClick={() => startLesson(dashboard!.next_chapter!)} className="btn-brand w-full py-3">▶ Resume Content</button>
              </div>
            )}

            {/* Mastery Progress */}
            <div className="glass p-5">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Chapter Mastery</h3>
              <div className="space-y-4">
                {(dashboard?.chapter_mastery ?? []).slice(0, 5).map(m => (
                  <div key={m.chapter_id}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">{m.chapter_title}</span>
                      <span className="font-bold text-brand-400">{m.score_percent.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-brand-500 h-full transition-all duration-1000" style={{ width: `${m.score_percent}%` }} />
                    </div>
                  </div>
                ))}
                {(dashboard?.chapter_mastery ?? []).length === 0 && <p className="text-xs text-slate-500 text-center py-4 italic">No quiz data yet — start your first chapter!</p>}
              </div>
            </div>
            
            {/* Leaderboard Fast-track */}
            <div className="glass p-5 bg-gradient-to-br from-brand-500/5 to-transparent border border-brand-500/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Grid Elite</h3>
                <span className="text-xl">🏆</span>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">Top students this week are averaging 85% accuracy. Join them on the leaderboard.</p>
              <button onClick={() => navigate('/leaderboard')} className="btn-ghost w-full py-2 text-xs border border-brand-500/20">View Rankings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
