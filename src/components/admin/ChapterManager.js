'use client';
import React, { useState, useEffect } from 'react';
import { auth } from '@/utils/firebase';
import MarkdownNotesViewer from '@/components/MarkdownNotesViewer';
import Papa from 'papaparse';
import { 
  BookOpen, Plus, Trash2, Edit3, Save, X, 
  CheckCircle2, Compass, Layers, Eye, Code, HelpCircle, Upload, FileText, ExternalLink
} from 'lucide-react';

export default function ChapterManager() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // CSV Question Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTargetChapter, setImportTargetChapter] = useState(null);
  const [importing, setImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [importLog, setImportLog] = useState('');
  const [editorTab, setEditorTab] = useState('write'); // 'write' | 'preview'
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    sequenceOrder: 1,
    passingThreshold: 60,
    estimatedReadMinutes: 8,
    quizQuestionCount: 15,
    quizId: '',
    readingMaterial: '',
    summaryPoints: ''
  });

  // Load Courses
  useEffect(() => {
    async function loadCourses() {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/admin/content?type=courses', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
          if (data.length > 0) {
            setSelectedCourseId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch courses:', err);
      }
    }
    loadCourses();
  }, []);

  // Load Chapters & Quizzes when Course changes
  useEffect(() => {
    if (!selectedCourseId) return;

    async function loadCourseContent() {
      setLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const [chapRes, quizRes] = await Promise.all([
          fetch(`/api/admin/content?type=chapters&courseId=${selectedCourseId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }),
          fetch(`/api/admin/content?type=quizzes&courseId=${selectedCourseId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
        ]);

        if (chapRes.ok) {
          const chapData = await chapRes.json();
          setChapters(chapData);
        }
        if (quizRes.ok) {
          const quizData = await quizRes.json();
          setQuizzes(quizData);
        }
      } catch (err) {
        console.error('Error fetching course chapters:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCourseContent();
  }, [selectedCourseId]);

  const handleOpenAdd = () => {
    setFormData({
      id: '',
      title: '',
      sequenceOrder: chapters.length + 1,
      passingThreshold: 60,
      estimatedReadMinutes: 8,
      quizQuestionCount: 15,
      quizId: '',
      readingMaterial: '# New Chapter Title\n\nWrite your rich notes here using markdown...\n\n### Key Concepts:\n- Point 1\n- Point 2\n\n$$V = I \\times R$$',
      summaryPoints: ''
    });
    setEditorTab('write');
    setIsEditing(true);
  };

  const handleOpenEdit = (chap) => {
    setFormData({
      id: chap.id,
      title: chap.title || '',
      sequenceOrder: chap.sequenceOrder || 1,
      passingThreshold: chap.passingThreshold || 60,
      estimatedReadMinutes: chap.estimatedReadMinutes || 8,
      quizQuestionCount: chap.quizQuestionCount || 15,
      quizId: chap.quizId || '',
      readingMaterial: chap.readingMaterial || '',
      summaryPoints: chap.summaryPoints || ''
    });
    setEditorTab('write');
    setIsEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return alert('Chapter title is required');

    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type: 'chapter',
          action: 'save',
          data: {
            ...formData,
            courseId: selectedCourseId
          }
        })
      });

      if (res.ok) {
        setIsEditing(false);
        // Refresh list
        const refresh = await fetch(`/api/admin/content?type=chapters&courseId=${selectedCourseId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const updated = await refresh.json();
        setChapters(updated);
      } else {
        alert('Failed to save chapter.');
      }
    } catch (err) {
      console.error('Error saving chapter:', err);
      alert('Network error saving chapter.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (chapterId) => {
    if (!confirm('Are you sure you want to delete this chapter? This will remove all associated user reading progress.')) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type: 'chapter',
          action: 'delete',
          data: { id: chapterId }
        })
      });

      if (res.ok) {
        setChapters(prev => prev.filter(c => c.id !== chapterId));
      }
    } catch (err) {
      console.error('Error deleting chapter:', err);
    }
  };

  const handleOpenImport = (chap) => {
    setImportTargetChapter(chap);
    setParsedRows([]);
    setImportLog('');
    setShowImportModal(true);
  };

  const handleFileParse = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        const valid = [];

        rows.forEach((r) => {
          const qText = r.Question || r.question || r.questionText || r['Question Text'];
          const optA = r['Option A'] || r.A || r.optA || r.optionA;
          const optB = r['Option B'] || r.B || r.optB || r.optionB;
          const optC = r['Option C'] || r.C || r.optC || r.optionC;
          const optD = r['Option D'] || r.D || r.optD || r.optionD;
          const correctRaw = (r.Correct || r.correct || r.Answer || r.answer || 'A').toString().trim().toUpperCase();
          const rationale = r.Rationale || r.rationale || r.Explanation || r.explanation || '';

          if (qText && optA && optB) {
            const letterToIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, '1': 0, '2': 1, '3': 2, '4': 3 };
            const correctIndex = letterToIdx[correctRaw] !== undefined ? letterToIdx[correctRaw] : 0;

            valid.push({
              questionText: qText,
              options: [optA, optB, optC || '', optD || ''].filter(Boolean),
              correctOptionIndex: correctIndex,
              explanationText: rationale,
              topic: r.Section || r.Topic || importTargetChapter?.title || 'Chapter Practice'
            });
          }
        });

        setParsedRows(valid);
        setImportLog(`Parsed ${valid.length} valid questions from CSV.`);
      },
      error: (err) => {
        alert('CSV Parse Error: ' + err.message);
      }
    });
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return alert('No valid questions to import');
    if (!importTargetChapter) return;

    setImporting(true);
    try {
      const token = await auth.currentUser?.getIdToken();

      let targetQuizId = importTargetChapter.quizId;

      if (!targetQuizId) {
        const createQuizRes = await fetch('/api/admin/content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            type: 'quiz',
            action: 'save',
            data: {
              title: `${importTargetChapter.title} - Practice Quiz`,
              courseId: selectedCourseId,
              subjectId: importTargetChapter.subjectId || '',
              chapterId: importTargetChapter.id,
              quizType: 'CHAPTER_TEST',
              timeLimit: 20,
              enabled: true
            }
          })
        });
        const quizCreated = await createQuizRes.json();
        targetQuizId = quizCreated.id;

        await fetch('/api/admin/content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            type: 'chapter',
            action: 'save',
            data: {
              ...importTargetChapter,
              quizId: targetQuizId
            }
          })
        });
      }

      const questionsWithTarget = parsedRows.map(q => ({
        ...q,
        quizId: targetQuizId,
        courseId: selectedCourseId,
        subjectId: importTargetChapter.subjectId || ''
      }));

      const uploadRes = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type: 'questions_bulk',
          action: 'save',
          data: { questions: questionsWithTarget }
        })
      });

      if (uploadRes.ok) {
        alert(`Successfully imported ${parsedRows.length} questions to ${importTargetChapter.title}!`);
        setShowImportModal(false);

        const refresh = await fetch(`/api/admin/content?type=chapters&courseId=${selectedCourseId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const updated = await refresh.json();
        setChapters(updated);
      } else {
        alert('Upload failed.');
      }
    } catch (e) {
      console.error('Import error:', e);
      alert('Error importing questions: ' + e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Course Selector */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest mb-1">
            <Compass className="w-4 h-4" /> CloudFactory LMS Engine
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Chapter Notes & Sequential Mastery
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage rich reading notes, set passing thresholds, and connect chapter practice quizzes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {selectedCourseId && (
            <div className="flex items-center gap-2">
              <a
                href={`/courses/${selectedCourseId}/learn`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Preview Duolingo-style Roadmap as Student"
              >
                <Compass className="w-3.5 h-3.5" /> Roadmap View <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={`/courses/${selectedCourseId}/notes`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Preview Master Handbook Notes"
              >
                <BookOpen className="w-3.5 h-3.5" /> Master Notes <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Chapter
          </button>
        </div>
      </div>

      {/* Chapters Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-sm uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" /> Chapters on Path ({chapters.length})
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Sequential Lock: Pass required to unlock next
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold">Loading chapters...</div>
        ) : chapters.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-medium space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <p>No chapters created for this course yet.</p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              Create Chapter 1
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Chapter Title</th>
                  <th className="py-3 px-4">Threshold</th>
                  <th className="py-3 px-4">Read Time</th>
                  <th className="py-3 px-4">Linked Quiz</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {chapters.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {c.sequenceOrder}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {c.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md border border-emerald-200">
                        {c.passingThreshold || 60}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {c.estimatedReadMinutes || 8} mins
                    </td>
                    <td className="py-3.5 px-4">
                      {c.quizTitle ? (
                        <span className="font-bold text-blue-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {c.quizTitle}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None linked</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenImport(c)}
                          className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          title="Import Questions CSV to Chapter Quiz"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 hover:bg-slate-100 text-blue-600 rounded-lg transition-colors cursor-pointer"
                          title="Edit Chapter Notes"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                          title="Delete Chapter"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chapter Edit / Create Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {formData.id ? 'Edit Chapter & Notes' : 'Create New Chapter'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Markdown notes support $\LaTeX$ math formulas, tables, and images.
                </p>
              </div>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Chapter Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Chapter 1: Constitution & Fundamental Rights"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sequence Order</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.sequenceOrder}
                    onChange={(e) => setFormData({ ...formData, sequenceOrder: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Passing Threshold (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.passingThreshold}
                    onChange={(e) => setFormData({ ...formData, passingThreshold: parseInt(e.target.value) || 60 })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Est. Read Time (Min)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.estimatedReadMinutes}
                    onChange={(e) => setFormData({ ...formData, estimatedReadMinutes: parseInt(e.target.value) || 8 })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Link Practice Quiz</label>
                  <select
                    value={formData.quizId}
                    onChange={(e) => setFormData({ ...formData, quizId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- Select Quiz --</option>
                    {quizzes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Editor Tabs */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Chapter Reading Material (Markdown + KaTeX)
                  </label>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setEditorTab('write')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        editorTab === 'write' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" /> Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab('preview')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        editorTab === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" /> Live Preview
                    </button>
                  </div>
                </div>

                {editorTab === 'write' ? (
                  <textarea
                    rows={12}
                    value={formData.readingMaterial}
                    onChange={(e) => setFormData({ ...formData, readingMaterial: e.target.value })}
                    placeholder="# Heading&#10;&#10;Write note content here..."
                    className="w-full font-mono text-xs p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  />
                ) : (
                  <div className="border border-slate-200 rounded-2xl p-4 max-h-[350px] overflow-y-auto bg-slate-50/50">
                    <MarkdownNotesViewer
                      content={formData.readingMaterial}
                      title={formData.title || 'Untitled Chapter'}
                      estimatedMinutes={formData.estimatedReadMinutes}
                      passingThreshold={formData.passingThreshold}
                      hasQuiz={false}
                      isUnlocked={true}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Chapter'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Question Importer Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 text-xs font-black text-emerald-600 uppercase tracking-widest mb-0.5">
                  <Upload className="w-3.5 h-3.5" /> Direct Bank Importer
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Import CSV Questions
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Target Chapter: <strong className="text-slate-800">{importTargetChapter?.title}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  Choose a CSV file from <span className="font-mono text-blue-600">D:\mymocksewa dd</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Auto-detects: Question, Option A-D, Correct, and Rationale columns.
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileParse}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer pt-2"
                />
              </div>

              {importLog && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importLog}</span>
                </div>
              )}

              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Preview Sample Question (1 of {parsedRows.length})
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <p className="font-bold text-slate-900">{parsedRows[0].questionText}</p>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                      {parsedRows[0].options.map((opt, i) => (
                        <div key={i} className={i === parsedRows[0].correctOptionIndex ? "font-bold text-emerald-600" : ""}>
                          {String.fromCharCode(65 + i)}: {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={importing || parsedRows.length === 0}
                className="px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{importing ? 'Importing...' : `Import ${parsedRows.length} Questions`}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
