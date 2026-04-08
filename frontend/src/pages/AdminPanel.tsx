import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import type { Module, Course, Chapter, DryRunReport, AdminStats, User } from '../types';

type Tab = 'hierarchy' | 'csv' | 'gatekeeper';

export default function AdminPanel() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('hierarchy');
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [csvChapter, setCsvChapter] = useState<number | ''>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [dryRunReport, setDryRunReport] = useState<DryRunReport | null>(null);
  const [dryRunStatus, setDryRunStatus] = useState('');
  const [commitMsg, setCommitMsg] = useState('');

  const [newModule, setNewModule] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [newChapter, setNewChapter] = useState({ title: '', pdf_url: '' });

  const { data: statsData } = useQuery({ queryKey: ['adminStats'], queryFn: () => adminApi.stats() });
  const stats: AdminStats | null = statsData?.data ?? null;

  const { data: modulesData } = useQuery({ queryKey: ['adminModules'], queryFn: () => adminApi.modules.list() });
  const modules: Module[] = modulesData?.data ?? [];

  const { data: coursesData } = useQuery({
    queryKey: ['adminCourses', selectedModule], enabled: !!selectedModule,
    queryFn: () => adminApi.courses.list(selectedModule!),
  });
  const courses: Course[] = coursesData?.data ?? [];

  const { data: chaptersData } = useQuery({
    queryKey: ['adminChapters', selectedCourse], enabled: !!selectedCourse,
    queryFn: () => adminApi.chapters.list(selectedCourse!),
  });
  const chapters: Chapter[] = chaptersData?.data ?? [];

  const createModule = useMutation({ mutationFn: () => adminApi.modules.create({ title: newModule }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminModules'] }); setNewModule(''); } });
  const deleteModule = useMutation({ mutationFn: (id: number) => adminApi.modules.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminModules'] }); setSelectedModule(null); } });
  
  const createCourse = useMutation({ mutationFn: () => adminApi.courses.create({ title: newCourse, module_id: selectedModule }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminCourses', selectedModule] }); setNewCourse(''); } });
  const deleteCourse = useMutation({ mutationFn: (id: number) => adminApi.courses.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminCourses', selectedModule] }); setSelectedCourse(null); } });
  
  const createChapter = useMutation({ mutationFn: () => adminApi.chapters.create({ title: newChapter.title, course_id: selectedCourse, pdf_url: newChapter.pdf_url || null }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminChapters', selectedCourse] }); setNewChapter({ title: '', pdf_url: '' }); } });
  const deleteChapter = useMutation({ mutationFn: (id: number) => adminApi.chapters.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminChapters', selectedCourse] }); } });

  const handleDryRun = async () => {
    if (!csvFile || !csvChapter) return;
    setDryRunReport(null); setDryRunStatus('');
    const res = await adminApi.dryRun(Number(csvChapter), csvFile);
    setDryRunStatus(res.data.status);
    setDryRunReport(res.data.data);
  };

  const handleCommit = async () => {
    if (!csvFile || !csvChapter) return;
    setCommitMsg('');
    const res = await adminApi.commitCsv(Number(csvChapter), csvFile);
    setCommitMsg(`✅ Inserted: ${res.data.inserted} | Skipped: ${res.data.skipped}`);
    qc.invalidateQueries({ queryKey: ['adminStats'] });
  };

  const { data: pendingUsersData } = useQuery({ queryKey: ['adminPendingUsers'], queryFn: () => adminApi.users.pending() });
  const pendingUsers: User[] = pendingUsersData?.data ?? [];

  const approveUser = useMutation({
    mutationFn: ({ userId, moduleId, makeAdmin }: { userId: number, moduleId: number, makeAdmin: boolean }) => 
      adminApi.users.approve(userId, moduleId, makeAdmin),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminPendingUsers'] });
      qc.invalidateQueries({ queryKey: ['adminStats'] });
    }
  });

  return (
    <div className="min-h-screen hero-bg p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-1">Admin Command Center</h1>
          <p className="text-slate-400">Standardized 3-Tier Hierarchy: Module → Course → Chapter</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Modules', value: stats.total_modules, icon: '📂' },
              { label: 'Courses', value: stats.total_courses, icon: '📚' },
              { label: 'Chapters', value: stats.total_chapters, icon: '📖' },
              { label: 'Questions', value: stats.total_questions, icon: '❓' },
              { label: 'Users', value: stats.total_users, icon: '👥' },
            ].map((s) => (
              <div key={s.label} className="glass p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['hierarchy', 'csv', 'gatekeeper'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} id={`admin-tab-${t}`}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 capitalize ${tab === t ? 'btn-brand' : 'btn-ghost'}`}>
              {t === 'hierarchy' ? '🗂 Content Hierarchy' : t === 'csv' ? '📤 CSV Import' : '🛡️ Gatekeeper'}
            </button>
          ))}
        </div>

        {/* ── Hierarchy Tab ── */}
        {tab === 'hierarchy' && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Modules (Top) */}
            <div className="glass p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">📂 <span>Modules (Top)</span></h2>
              <div className="flex gap-2 mb-4">
                <input value={newModule} onChange={e => setNewModule(e.target.value)} className="input-field text-sm" placeholder="New module title (e.g. NEA)…" />
                <button onClick={() => createModule.mutate()} disabled={!newModule} className="btn-brand px-3 py-2 text-sm">+</button>
              </div>
              <div className="space-y-2">
                {modules.map(m => (
                  <div key={m.id} onClick={() => { setSelectedModule(m.id); setSelectedCourse(null); }}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedModule === m.id ? 'bg-brand-500/20 border border-brand-500/40' : 'hover:bg-surface-700'}`}
                    style={{ background: selectedModule === m.id ? '' : 'var(--surface-2)' }}>
                    <span className="text-sm font-medium">{m.title}</span>
                    <button onClick={e => { e.stopPropagation(); deleteModule.mutate(m.id); }} className="text-red-400 hover:text-red-300 text-xs px-2">✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Courses (Mid) */}
            <div className="glass p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">📚 <span>Courses (Mid)</span></h2>
              {!selectedModule ? <p className="text-slate-500 text-sm">← Select a module</p> : (
                <>
                  <div className="flex gap-2 mb-4">
                    <input value={newCourse} onChange={e => setNewCourse(e.target.value)} className="input-field text-sm" placeholder="New course (e.g. Level 5)…" />
                    <button onClick={() => createCourse.mutate()} disabled={!newCourse} className="btn-brand px-3 py-2 text-sm">+</button>
                  </div>
                  <div className="space-y-2">
                    {courses.map(c => (
                      <div key={c.id} onClick={() => setSelectedCourse(c.id)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedCourse === c.id ? 'bg-brand-500/20 border border-brand-500/40' : ''}`}
                        style={{ background: selectedCourse === c.id ? '' : 'var(--surface-2)' }}>
                        <span className="text-sm font-medium">{c.title}</span>
                        <button onClick={e => { e.stopPropagation(); deleteCourse.mutate(c.id); }} className="text-red-400 text-xs px-2">✕</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Chapters (Bottom) */}
            <div className="glass p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">📖 <span>Chapters (Bottom)</span></h2>
              {!selectedCourse ? <p className="text-slate-500 text-sm">← Select a course</p> : (
                <>
                  <div className="space-y-2 mb-4">
                    <input value={newChapter.title} onChange={e => setNewChapter(c => ({ ...c, title: e.target.value }))} className="input-field text-sm" placeholder="Chapter title…" />
                    <input value={newChapter.pdf_url} onChange={e => setNewChapter(c => ({ ...c, pdf_url: e.target.value }))} className="input-field text-sm" placeholder="PDF URL (optional)…" />
                    <button onClick={() => createChapter.mutate()} disabled={!newChapter.title} className="btn-brand w-full text-sm py-2">Add Chapter</button>
                  </div>
                  <div className="space-y-2">
                    {chapters.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                        <div>
                          <span className="text-sm font-medium">{c.title}</span>
                          {c.pdf_url && <span className="ml-2 badge badge-brand text-[10px]">PDF</span>}
                          <div className="text-xs text-slate-500 mt-0.5">ID: {c.id}</div>
                        </div>
                        <button onClick={() => deleteChapter.mutate(c.id)} className="text-red-400 text-xs px-2">✕</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── CSV Import Tab ── */}
        {tab === 'csv' && (
          <div className="max-w-2xl glass p-8">
            <h2 className="text-xl font-semibold mb-6 text-white">Targeted Question Ingestion</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Target Chapter ID</label>
                <input id="csv-chapter-id" type="number" value={csvChapter} onChange={e => setCsvChapter(e.target.value ? Number(e.target.value) : '')}
                  className="input-field" placeholder="Enter bottom-level chapter ID…" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Upload CSV File</label>
                <div className="border-2 border-dashed rounded-xl p-6 text-center transition-all bg-surface-800" style={{ borderColor: 'var(--border)' }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) setCsvFile(e.dataTransfer.files[0]); }}>
                  <div className="text-3xl mb-2">📄</div>
                  {csvFile ? <p className="text-green-400 font-medium">{csvFile.name}</p> : <p className="text-slate-400 text-sm">Drag & drop or <label className="text-brand-400 cursor-pointer underline">browse<input type="file" accept=".csv" className="hidden" onChange={e => setCsvFile(e.target.files?.[0] ?? null)} /></label></p>}
                </div>
              </div>

              <div className="flex gap-3">
                <button id="csv-dry-run" onClick={handleDryRun} disabled={!csvFile || !csvChapter} className="btn-brand flex-1 py-3">🔍 Dry Run Validation</button>
                <button id="csv-commit" onClick={handleCommit} disabled={!csvFile || !csvChapter || (dryRunReport ? dryRunReport.errors.length > 0 : true)} className="btn-ghost flex-1 py-3">✅ Commit to DB</button>
              </div>

              {commitMsg && <div className="px-4 py-3 rounded-xl text-sm text-green-400 bg-green-500/10 border border-green-500/20">{commitMsg}</div>}

              {dryRunReport && (
                <div className="rounded-xl overflow-hidden border border-slate-700">
                  <div className={`px-5 py-3 font-semibold text-sm ${dryRunReport.errors.length === 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                    {dryRunStatus} — {dryRunReport.valid_rows}/{dryRunReport.total_rows} rows valid
                  </div>
                  {dryRunReport.errors.length > 0 && (
                    <div className="p-4 space-y-2 max-h-64 overflow-y-auto bg-surface-900">
                      {dryRunReport.errors.map((err) => (
                        <div key={err.row} className="text-sm">
                          <span className="font-mono text-yellow-400">Row {err.row}:</span>
                          <span className="text-slate-400 ml-2">{err.messages.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-slate-500 px-1 border-l-2 border-brand-500 pl-3">
                <strong className="text-slate-400">CSV Requirements:</strong> question, option_a, option_b, option_c, option_d, correct_index (0–3), explanation, marks, negative_marks.
              </div>
            </div>
          </div>
        )}

        {/* ── Gatekeeper Tab ── */}
        {tab === 'gatekeeper' && (
          <div className="max-w-4xl glass p-8">
            <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">🛡️ Pending Approvals</h2>
            {pendingUsers.length === 0 ? (
              <div className="text-center py-12 bg-surface-800 rounded-2xl border border-white/5">
                <div className="text-4xl mb-4">✅</div>
                <p className="text-slate-400">No pending users. All caught up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map(user => (
                  <div key={user.id} className="bg-surface-800 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-white text-lg">{user.full_name || 'No Name Provided'}</h3>
                      <p className="text-slate-400 text-sm">{user.email}</p>
                      <div className="mt-2 text-xs font-mono text-brand-400">User ID: {user.id}</div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-3 items-end md:items-center">
                      <select 
                        id={`module-select-${user.id}`}
                        className="input-field text-sm md:w-48"
                        defaultValue=""
                      >
                        <option value="" disabled>Select Module to Assign...</option>
                        {modules.map(m => (
                          <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                      </select>
                      
                      <button 
                        onClick={() => {
                          const selectEl = document.getElementById(`module-select-${user.id}`) as HTMLSelectElement;
                          const moduleId = Number(selectEl.value);
                          if (!moduleId) {
                            alert("Please select a module first.");
                            return;
                          }
                          approveUser.mutate({ userId: user.id, moduleId, makeAdmin: false });
                        }}
                        className="btn-brand py-2 px-6"
                      >
                        Approve & Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
