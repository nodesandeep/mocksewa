'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { auth } from '@/utils/firebase';
import MarkdownNotesViewer, { parseTopicsAndSlides } from '@/components/MarkdownNotesViewer';
import { parseOfflineHtmlFile } from '@/utils/htmlToNotesMarkdown';
import Papa from 'papaparse';
import { 
  BookOpen, Plus, Trash2, Edit3, Save, X, 
  CheckCircle2, Compass, Layers, Eye, Code, HelpCircle, Upload, FileText, ExternalLink,
  ChevronUp, ChevronDown, ListOrdered, Sparkles, AlertTriangle, FileSpreadsheet, Download, Check
} from 'lucide-react';

export default function ChapterManager() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [chapters, setChapters] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // CSV Question Import State (Table Modal)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTargetChapter, setImportTargetChapter] = useState(null);
  const [importing, setImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [importLog, setImportLog] = useState('');

  // Modal In-Place CSV Questions & Topic Alignment State
  const [modalCsvQuestions, setModalCsvQuestions] = useState([]);
  const [modalCsvStats, setModalCsvStats] = useState(null);
  const [csvNotice, setCsvNotice] = useState('');
  const [showQuizSelector, setShowQuizSelector] = useState(false);
  const modalCsvFileRef = useRef(null);

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

  // Offline HTML & MD File Import State
  const fileInputRef = useRef(null);
  const [importNotice, setImportNotice] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleFileImport = (file) => {
    if (!file) return;
    const fileName = file.name;
    const ext = fileName.split('.').pop().toLowerCase();

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawText = e.target.result;
      if (ext === 'html' || ext === 'htm') {
        const { title, markdown } = parseOfflineHtmlFile(rawText, fileName);
        setFormData(prev => ({
          ...prev,
          title: (!prev.title || prev.title.trim() === '' || prev.title.startsWith('New Chapter')) && title 
            ? title 
            : (title || prev.title),
          readingMaterial: markdown
        }));
        setImportNotice(`Loaded offline HTML: "${fileName}" (Title & notes populated!)`);
        setTimeout(() => setImportNotice(''), 6000);
      } else if (ext === 'md' || ext === 'txt') {
        const titleMatch = rawText.match(/^#\s+([^\n]+)/m);
        const detectedTitle = titleMatch ? titleMatch[1].trim() : fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setFormData(prev => ({
          ...prev,
          title: (!prev.title || prev.title.trim() === '' || prev.title.startsWith('New Chapter')) && detectedTitle 
            ? detectedTitle 
            : (detectedTitle || prev.title),
          readingMaterial: rawText
        }));
        setImportNotice(`Loaded note file: "${fileName}" (Title & notes populated!)`);
        setTimeout(() => setImportNotice(''), 6000);
      } else {
        alert('Please choose an offline HTML file (.html, .htm) or Markdown file (.md, .txt).');
      }
    };
    reader.onerror = () => {
      alert('Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  // Derive Note Topics from Markdown Reading Material
  const noteTopics = useMemo(() => {
    return parseTopicsAndSlides(formData.readingMaterial || '');
  }, [formData.readingMaterial]);

  // Align CSV Questions with Detected Topics
  const alignmentChips = useMemo(() => {
    if (modalCsvQuestions.length === 0 && noteTopics.length === 0) return [];

    if (noteTopics.length > 0) {
      return noteTopics.map((nt, idx) => {
        const topicNum = nt.number || (idx + 1);
        const titleLower = (nt.title || '').toLowerCase().trim();

        const count = modalCsvQuestions.filter(q => {
          const qTopic = (q.topic || '').toLowerCase().trim();
          if (!qTopic) return false;
          if (
            qTopic === String(topicNum) ||
            qTopic === `topic ${topicNum}` ||
            qTopic === `topic${topicNum}` ||
            qTopic.startsWith(`topic ${topicNum}:`) ||
            qTopic.startsWith(`topic ${topicNum} -`) ||
            qTopic.startsWith(`${topicNum}.`)
          ) return true;
          if (titleLower.length > 3 && (qTopic.includes(titleLower) || titleLower.includes(qTopic))) return true;
          return false;
        }).length;

        return {
          label: `Topic ${topicNum}: ${nt.title?.slice(0, 26)}${nt.title?.length > 26 ? '...' : ''}`,
          count
        };
      });
    }

    if (modalCsvStats?.topicBreakdown?.length > 0) {
      return modalCsvStats.topicBreakdown.map(tb => ({
        label: tb.topic?.slice(0, 28) + (tb.topic?.length > 28 ? '...' : ''),
        count: tb.count
      }));
    }

    return [];
  }, [modalCsvQuestions, noteTopics, modalCsvStats]);

  const handleModalCsvParse = (file) => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        const valid = [];
        const topicCounts = {};

        rows.forEach((r) => {
          const qText = (r.Question || r.question || r.questionText || r['Question Text'] || r.qText || '').toString().trim();
          const optA = (r['Option A'] || r.A || r.optA || r.optionA || r['Option 1'] || r.OptionA || '').toString().trim();
          const optB = (r['Option B'] || r.B || r.optB || r.optionB || r['Option 2'] || r.OptionB || '').toString().trim();
          const optC = (r['Option C'] || r.C || r.optC || r.optionC || r['Option 3'] || r.OptionC || '').toString().trim();
          const optD = (r['Option D'] || r.D || r.optD || r.optionD || r['Option 4'] || r.OptionD || '').toString().trim();

          const rawAnswer = (r['Correct Answer'] || r.Correct || r.correct || r.Answer || r.answer || r.correctOptionIndex || 'A').toString().trim();
          const rationale = (r.Rationale || r.rationale || r.Explanation || r.explanation || '').toString().trim();
          const topicRaw = (r.Topic || r.topic || r.Section || r.section || r.Chapter || r.chapter || formData.title || 'Chapter Practice').toString().trim();

          if (qText && optA && optB) {
            const letterToIdx = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, '1': 0, '2': 1, '3': 2, '4': 3 };
            let correctIndex = letterToIdx[rawAnswer.toUpperCase()];
            if (correctIndex === undefined) {
              const opts = [optA, optB, optC, optD];
              const matchIdx = opts.findIndex(o => o.toLowerCase() === rawAnswer.toLowerCase());
              correctIndex = matchIdx !== -1 ? matchIdx : 0;
            }

            const cleanOptions = [optA, optB, optC || '', optD || ''].filter(Boolean);
            valid.push({
              questionText: qText,
              options: cleanOptions,
              correctOptionIndex: correctIndex,
              explanationText: rationale,
              topic: topicRaw
            });

            topicCounts[topicRaw] = (topicCounts[topicRaw] || 0) + 1;
          }
        });

        if (valid.length === 0) {
          alert('Could not find valid questions. Ensure CSV has Question, Option A, Option B, and Correct Answer columns.');
          return;
        }

        const breakdown = Object.entries(topicCounts).map(([topic, count]) => ({ topic, count }));
        setModalCsvQuestions(valid);
        setModalCsvStats({
          totalCount: valid.length,
          topicsCount: breakdown.length,
          topicBreakdown: breakdown,
          fileName: file.name
        });
        setFormData(prev => ({
          ...prev,
          quizQuestionCount: valid.length
        }));
        setCsvNotice(`✓ Parsed ${valid.length} questions from ${file.name} across ${breakdown.length} topic sections.`);
      },
      error: (err) => {
        alert('CSV Parse Error: ' + err.message);
      }
    });
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(
      "Topic,Question,Option A,Option B,Option C,Option D,Correct Answer,Explanation\n" +
      "Topic 1: Geography,What is the total area of Nepal?,147181 sq km,147516 sq km,147211 sq km,146000 sq km,147516 sq km,As per updated map including Limpiyadhura.\n" +
      "Topic 2: Hydrology,Which is the longest river of Nepal?,Koshi,Gandaki,Karnali,Mahakali,Karnali,Karnali river is the longest river in Nepal with 507 km length.\n"
    );
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "mocksewa_chapter_practice_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const refreshContent = async (courseId = selectedCourseId) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const [chapRes, quizRes] = await Promise.all([
        fetch(`/api/admin/content?type=chapters&courseId=${courseId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        fetch(`/api/admin/content?type=quizzes&courseId=${courseId}`, {
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
  };

  // Load Chapters & Quizzes when Course changes
  useEffect(() => {
    if (!selectedCourseId) return;
    refreshContent(selectedCourseId);
  }, [selectedCourseId]);

  const handleOpenAdd = () => {
    setImportNotice('');
    setCsvNotice('');
    setModalCsvQuestions([]);
    setModalCsvStats(null);
    setShowQuizSelector(false);
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
    setImportNotice('');
    setCsvNotice('');
    setModalCsvQuestions([]);
    setModalCsvStats(null);
    setShowQuizSelector(false);
    setFormData({
      id: chap.id,
      title: chap.title || '',
      sequenceOrder: chap.sequenceOrder || 1,
      passingThreshold: chap.passingThreshold || 60,
      estimatedReadMinutes: chap.estimatedReadMinutes || 8,
      quizQuestionCount: chap.quizQuestionCount || 15,
      quizId: chap.linkedQuizId || chap.quizId || '',
      readingMaterial: chap.readingMaterial || '',
      summaryPoints: chap.summaryPoints || ''
    });
    setEditorTab('write');
    setIsEditing(true);
  };

  const handleMoveOrder = async (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === chapters.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentChapter = chapters[index];
    const targetChapter = chapters[targetIndex];

    const currentOrder = currentChapter.sequenceOrder;
    const targetOrder = targetChapter.sequenceOrder;

    const newCurrentOrder = targetOrder === currentOrder 
      ? (direction === 'up' ? currentOrder - 1 : currentOrder + 1) 
      : targetOrder;
    const newTargetOrder = currentOrder;

    const newChapters = [...chapters];
    newChapters[index] = { ...currentChapter, sequenceOrder: newCurrentOrder };
    newChapters[targetIndex] = { ...targetChapter, sequenceOrder: newTargetOrder };
    newChapters.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    setChapters(newChapters);

    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type: 'chapter',
          action: 'reorder',
          data: {
            orders: [
              { id: currentChapter.id, sequenceOrder: newCurrentOrder },
              { id: targetChapter.id, sequenceOrder: newTargetOrder }
            ]
          }
        })
      });
      refreshContent();
    } catch (err) {
      console.error('Error reordering chapters:', err);
      refreshContent();
    }
  };

  const handleAutoSequenceAll = async () => {
    if (!confirm(`Re-sequence all ${chapters.length} chapters sequentially (1, 2, 3...)?`)) return;
    const updatedOrders = chapters.map((c, i) => ({ id: c.id, sequenceOrder: i + 1 }));
    setChapters(prev => prev.map((c, i) => ({ ...c, sequenceOrder: i + 1 })));

    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type: 'chapter',
          action: 'reorder',
          data: { orders: updatedOrders }
        })
      });
      refreshContent();
    } catch (err) {
      console.error('Error auto-sequencing:', err);
    }
  };

  const handleQuickCreateQuiz = async (chap) => {
    const quizTitle = `${chap.title} - Chapter Practice`;
    if (!confirm(`Create a dedicated practice quiz for:\n"${chap.title}"\nand link it automatically?`)) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type: 'quiz',
          action: 'save',
          data: {
            title: quizTitle,
            courseId: selectedCourseId,
            chapterId: chap.id,
            quizType: 'CHAPTER_TEST',
            timeLimit: 20,
            enabled: true
          }
        })
      });

      if (res.ok) {
        refreshContent();
      } else {
        alert('Failed to auto-create quiz.');
      }
    } catch (err) {
      console.error('Failed to quick create quiz:', err);
      alert('Error: ' + err.message);
    }
  };

  const insertTemplate = (templateType) => {
    let snippet = '';
    switch (templateType) {
      case 'loksewa':
        snippet = `\n\n## 📌 High-Yield Loksewa Concepts\n\n> 💡 **Core Constitutional / Statutory Provision:**\n> Important clause and year to memorize for objective exam questions.\n\n### ⚖️ Provisions & Authorities Table:\n| Subject / Cluster | Authority | Constitutional Basis | Validity / Term |\n|---|---|---|---|\n| Public Service Commission | President of Nepal | Article 242 | 6 Years |\n| Election Commission | Constitutional Council | Article 245 | 6 Years |\n`;
        break;
      case 'formula':
        snippet = `\n\n### 📐 Essential Mathematical / Physical Formula\n\n$$P = \\frac{F}{A} \\quad \\text{where } P = \\text{Pressure } (\\text{N/m}^2), \\, F = \\text{Force } (\\text{N}), \\, A = \\text{Area } (\\text{m}^2)$$\n\n$$\\text{Work Done} (W) = F \\cdot d \\cdot \\cos(\\theta)$$\n`;
        break;
      case 'match':
        snippet = `\n\n### 🔗 Match-the-Following Pairs (Standard Loksewa Format)\n\n**Match Group I with Group II:**\n\n**Group I:**\n- a) Mount Everest Elevation\n- b) Kanchenjunga Elevation\n- c) Lhotse Elevation\n\n**Group II:**\n- 1) 8,848.86 m\n- 2) 8,586 m\n- 3) 8,516 m\n`;
        break;
      case 'callout':
        snippet = `\n\n> 🎯 **Past Exam Trend & Trap:**\n> *Repeated in 2079 & 2081 exams.* Pay special attention to exception clauses and date of enactment.\n`;
        break;
      case 'topic':
        snippet = `\n\n---\n\n### TOPIC \n\n## [विषय / Topic Title Here]\n\n- ⭐ Key Fact or Definition 1\n- ⭐ Key Fact or Statistical Detail 2\n\n> 💡 **सूत्र:** Mnemonic or memory aid\n`;
        break;
      case 'slide':
        snippet = `\n\n---\n\n#### [Slide Sub-Section Title]\n\n- ⭐ Sub-concept point 1\n- ⭐ Comparative data point 2\n`;
        break;
      case 'summary':
        snippet = `\n\n### ⚡ Rapid-Recall Key Takeaways\n- [ ] **Point 1:** Core definitions and constitutional scope.\n- [ ] **Point 2:** Disciplinary and administrative actions under regulations.\n- [ ] **Point 3:** Mandatory quotas and reservations percentages.\n`;
        break;
      default:
        break;
    }
    setFormData(prev => ({
      ...prev,
      readingMaterial: (prev.readingMaterial ? prev.readingMaterial + snippet : snippet.trimStart())
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return alert('Chapter title is required');

    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();

      let targetQuizId = formData.quizId;

      // If CSV questions were uploaded in this modal, make sure a quiz exists to receive them
      if (modalCsvQuestions.length > 0 && !targetQuizId) {
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
              title: `${formData.title} - Chapter Practice`,
              courseId: selectedCourseId,
              subjectId: formData.subjectId || '',
              quizType: 'CHAPTER_TEST',
              timeLimit: 20,
              enabled: true
            }
          })
        });
        if (createQuizRes.ok) {
          const quizCreated = await createQuizRes.json();
          targetQuizId = quizCreated.id;
        }
      }

      const chapterDataToSave = {
        ...formData,
        quizId: targetQuizId || formData.quizId,
        quizQuestionCount: modalCsvQuestions.length > 0 ? modalCsvQuestions.length : (formData.quizQuestionCount || 15),
        courseId: selectedCourseId
      };

      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type: 'chapter',
          action: 'save',
          data: chapterDataToSave
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save chapter.');
      }

      const savedData = await res.json();
      const finalChapterId = formData.id || savedData.id;

      // If CSV questions were uploaded, link quiz and bulk insert questions
      if (modalCsvQuestions.length > 0 && targetQuizId) {
        // Link quiz to chapter
        await fetch('/api/admin/content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            type: 'quiz',
            action: 'save',
            data: {
              id: targetQuizId,
              chapterId: finalChapterId,
              title: `${formData.title} - Chapter Practice`,
              courseId: selectedCourseId
            }
          })
        });

        // Bulk insert questions
        const questionsWithTarget = modalCsvQuestions.map(q => ({
          ...q,
          quizId: targetQuizId,
          courseId: selectedCourseId,
          chapterId: finalChapterId,
          subjectId: formData.subjectId || ''
        }));

        await fetch('/api/admin/content', {
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
      }

      setIsEditing(false);
      const importedCount = modalCsvQuestions.length;
      setModalCsvQuestions([]);
      setModalCsvStats(null);
      setCsvNotice('');

      // Refresh list
      const [chapRes, quizRes] = await Promise.all([
        fetch(`/api/admin/content?type=chapters&courseId=${selectedCourseId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        fetch(`/api/admin/content?type=quizzes&courseId=${selectedCourseId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      ]);
      if (chapRes.ok) setChapters(await chapRes.json());
      if (quizRes.ok) setQuizzes(await quizRes.json());

      if (importedCount > 0) {
        alert(`Successfully saved Chapter & imported ${importedCount} practice questions aligned with topics!`);
      }
    } catch (err) {
      console.error('Error saving chapter:', err);
      alert('Network error saving chapter: ' + err.message);
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

          {chapters.length > 1 && (
            <button
              onClick={handleAutoSequenceAll}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold border border-slate-200/90 shadow-2xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Renumber all chapters sequentially (1, 2, 3...) based on current order"
            >
              <ListOrdered className="w-3.5 h-3.5 text-blue-600" /> Auto-Sequence
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              handleOpenAdd();
              setTimeout(() => fileInputRef.current?.click(), 150);
            }}
            className="px-4 py-2.5 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-blue-200/90 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            title="Import offline HTML or Markdown note file into a new chapter"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" /> Upload Offline Note
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
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
            Sequential Lock: Pass required to unlock next chapter
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold">Loading chapters...</div>
        ) : chapters.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-medium space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <p>No chapters created for this course yet.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Create Chapter 1
              </button>
              <button
                type="button"
                onClick={() => {
                  handleOpenAdd();
                  setTimeout(() => fileInputRef.current?.click(), 150);
                }}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Offline File
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-100 font-black text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Chapter Title</th>
                  <th className="py-3 px-4">Threshold</th>
                  <th className="py-3 px-4">Pacing</th>
                  <th className="py-3 px-4">Linked Quiz & Questions</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {chapters.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveOrder(idx, 'up')}
                            className={`p-1 rounded-md border transition-all ${
                              idx === 0 
                                ? 'text-slate-300 border-transparent cursor-not-allowed' 
                                : 'text-slate-600 border-slate-200/80 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 cursor-pointer active:scale-90 shadow-2xs'
                            }`}
                            title="Move Chapter Up in sequence"
                            aria-label="Move Chapter Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === chapters.length - 1}
                            onClick={() => handleMoveOrder(idx, 'down')}
                            className={`p-1 rounded-md border transition-all ${
                              idx === chapters.length - 1 
                                ? 'text-slate-300 border-transparent cursor-not-allowed' 
                                : 'text-slate-600 border-slate-200/80 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 cursor-pointer active:scale-90 shadow-2xs'
                            }`}
                            title="Move Chapter Down in sequence"
                            aria-label="Move Chapter Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-xs border border-blue-200/80 shadow-2xs">
                          {c.sequenceOrder}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {c.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200/80 shadow-2xs">
                        {c.passingThreshold || 60}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200/80 text-[11px] shadow-2xs">
                        Self-Paced
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.quizTitle ? (
                        <div className="space-y-1.5">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[200px]">{c.quizTitle}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.questionCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200/80 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {c.questionCount} Questions Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 bg-amber-50 text-amber-800 rounded-full border border-amber-200/80 shadow-2xs">
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> 0 Questions (Empty)
                              </span>
                            )}
                            <button
                              onClick={() => handleOpenImport(c)}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                              title="Import CSV Questions into this quiz"
                            >
                              + Import CSV
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="text-slate-400 text-[11px] font-medium block">No quiz linked</span>
                          <button
                            onClick={() => handleQuickCreateQuiz(c)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold border border-blue-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                            title="1-Click Create & Link Quiz"
                          >
                            <Plus className="w-3 h-3" /> Quick-Create Quiz
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenImport(c)}
                          className="p-1.5 hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                          title="Import Questions CSV to Chapter Quiz"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 hover:bg-blue-50 text-blue-700 hover:text-blue-800 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                          title="Edit Chapter Notes"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-200"
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
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Study Pacing</label>
                  <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Self-Paced (Untimed Slides)</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Practice Quiz & Questions (.csv)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowQuizSelector(!showQuizSelector)}
                      className="text-[10px] font-black text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      {showQuizSelector ? '← Upload CSV' : 'Select Quiz'}
                    </button>
                  </div>

                  {!showQuizSelector ? (
                    <button
                      type="button"
                      onClick={() => modalCsvFileRef.current?.click()}
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs active:scale-98 ${
                        modalCsvQuestions.length > 0 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                          : formData.quizId
                            ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileSpreadsheet className={`w-3.5 h-3.5 shrink-0 ${modalCsvQuestions.length > 0 ? 'text-emerald-600' : 'text-blue-600'}`} />
                        <span className="truncate">
                          {modalCsvQuestions.length > 0 
                            ? `✓ ${modalCsvQuestions.length} Qs from CSV` 
                            : formData.quizId 
                              ? (quizzes.find(q => q.id === formData.quizId)?.title || 'Linked Quiz') 
                              : 'Upload Questions CSV'}
                        </span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs shrink-0">
                        {modalCsvQuestions.length > 0 ? 'Ready' : 'Choose CSV'}
                      </span>
                    </button>
                  ) : (
                    <select
                      value={formData.quizId}
                      onChange={(e) => setFormData({ ...formData, quizId: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">-- Select Quiz --</option>
                      {quizzes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title} ({q.questionCount || 0} Qs)
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    ref={modalCsvFileRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleModalCsvParse(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </div>
              </div>

              {/* 📥 Dual Uploader Banners (Notes & Practice Questions) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Offline HTML & MD Notes */}
                <div className="p-4 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white rounded-2xl border border-blue-200/90 flex flex-col justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">1. Offline Notes (.html / .md)</span>
                        <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[9px] font-black rounded uppercase tracking-wider">Auto-Parser</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                        Exported from VidyaPDF or myMOCKsewa. Auto-extracts Chapter Title, Topics, and Slides.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-blue-100/60">
                    <span className="text-[10px] font-bold text-slate-500">
                      {noteTopics.length > 0 ? `${noteTopics.length} Topics Detected` : 'No file uploaded yet'}
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-white hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-xl border border-blue-200 shadow-2xs text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Choose Notes</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".html,.htm,.md,.txt"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleFileImport(e.target.files[0]);
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Card 2: Chapter Questions CSV */}
                <div className="p-4 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white rounded-2xl border border-emerald-200/90 flex flex-col justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">2. Practice Questions (.csv)</span>
                        <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded uppercase tracking-wider">Topic Aligner</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
                        CSV questions with Question, Options A-D, Correct, and Topic to align with notes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-100/60">
                    <button
                      type="button"
                      onClick={handleDownloadSampleCsv}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 underline cursor-pointer"
                      title="Download sample CSV template"
                    >
                      <Download className="w-3 h-3" /> Sample CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => modalCsvFileRef.current?.click()}
                      className="px-3.5 py-1.5 bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold rounded-xl border border-emerald-200 shadow-2xs text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 🎯 Curriculum & Practice Questions Topic Alignment Banner */}
              {(modalCsvQuestions.length > 0 || noteTopics.length > 0) && (
                <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-800/50 shadow-md space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                        ✓
                      </div>
                      <span className="text-xs font-black tracking-wide">
                        Curriculum Topics & Questions Alignment Matrix
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-200 rounded-full border border-blue-400/30">
                        {noteTopics.length} Note Topics
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="px-2.5 py-0.5 bg-emerald-500/30 text-emerald-200 rounded-full border border-emerald-400/30">
                        {modalCsvQuestions.length > 0 
                          ? `${modalCsvQuestions.length} Questions Loaded` 
                          : `${formData.quizQuestionCount || 0} Questions Current`}
                      </span>
                    </div>
                  </div>

                  {/* Alignment Pills */}
                  {alignmentChips.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {alignmentChips.map((chip, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-semibold backdrop-blur-xs transition-colors"
                        >
                          <span className="text-slate-200">{chip.label}</span>
                          <span className={`px-2 py-0.2 rounded-md text-[10px] font-black ${
                            chip.count > 0 
                              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/30' 
                              : 'bg-slate-700/50 text-slate-400'
                          }`}>
                            {chip.count > 0 ? `${chip.count} Qs` : '0 Qs'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Upload both notes (.html / .md) and practice questions (.csv) to see automatic topic-by-topic question alignment.
                    </p>
                  )}
                </div>
              )}

              {/* Import Notification Banner */}
              {importNotice && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-300">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{importNotice}</span>
                </div>
              )}

              {/* CSV Notification Banner */}
              {csvNotice && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{csvNotice}</span>
                </div>
              )}

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
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-100/90 rounded-2xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-0.5 flex items-center gap-1.5 pl-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Insert Template:
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer text-xs active:scale-95"
                        title="Upload offline HTML or Markdown note file"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-600" /> Upload HTML / .MD
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTemplate('topic')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer text-xs active:scale-95"
                        title="Insert a new Topic slide block with title and star points"
                      >
                        <Layers className="w-3.5 h-3.5 text-white" /> + New Topic
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTemplate('slide')}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer text-xs active:scale-95"
                        title="Split topic into next bite-sized slide with ---"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> + Slide Break (---)
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTemplate('loksewa')}
                        className="px-3 py-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold rounded-xl border border-slate-200/90 hover:border-blue-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer text-xs active:scale-95"
                        title="Insert Constitutional & Statutory provisions comparison table"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600" /> + Loksewa Section
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTemplate('formula')}
                        className="px-3 py-1.5 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-bold rounded-xl border border-slate-200/90 hover:border-purple-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer text-xs active:scale-95"
                        title="Insert LaTeX mathematical and physical formulas"
                      >
                        <Code className="w-3.5 h-3.5 text-purple-600" /> + KaTeX Formula
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTemplate('match')}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold rounded-xl border border-slate-200/90 hover:border-emerald-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer text-xs active:scale-95"
                        title="Insert Loksewa Match-the-Following Group I and Group II format"
                      >
                        <Layers className="w-3.5 h-3.5 text-emerald-600" /> + Match Pairs
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTemplate('callout')}
                        className="px-3 py-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 font-bold rounded-xl border border-slate-200/90 hover:border-amber-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer text-xs active:scale-95"
                        title="Insert High-Yield past exam trend and trap callout box"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> + High-Yield Tip
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTemplate('summary')}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-bold rounded-xl border border-slate-200/90 hover:border-slate-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer text-xs active:scale-95"
                        title="Insert Rapid-Recall checklist key points"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" /> + Key Points
                      </button>
                    </div>

                    <textarea
                      rows={12}
                      value={formData.readingMaterial}
                      onChange={(e) => setFormData({ ...formData, readingMaterial: e.target.value })}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(true);
                      }}
                      onDragLeave={() => setIsDraggingFile(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(false);
                        if (e.dataTransfer.files?.[0]) {
                          handleFileImport(e.dataTransfer.files[0]);
                        }
                      }}
                      placeholder="# Heading&#10;&#10;Write note content here, or drag & drop an offline .html / .md file..."
                      className={`w-full font-mono text-xs p-4 bg-slate-50 border rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed transition-all ${
                        isDraggingFile ? 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-100' : 'border-slate-200'
                      }`}
                    />
                  </div>
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
                  <span>{saving ? 'Saving...' : (modalCsvQuestions.length > 0 ? `Save Chapter & Import ${modalCsvQuestions.length} Qs` : 'Save Chapter & Notes')}</span>
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
