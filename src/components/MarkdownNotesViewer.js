'use client';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { 
  BookOpen, Lock, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, 
  Award, Clock, Highlighter, Bookmark, Check, Sparkles 
} from 'lucide-react';
import { auth } from '@/utils/firebase';

export default function MarkdownNotesViewer({
  content = '',
  title = '',
  chapterId = '',
  courseId = '',
  estimatedMinutes = 8,
  passingThreshold = 60,
  hasQuiz = false,
  isUnlocked = true,
  isPassed = false,
  onStartQuiz,
  prevChapter = null,
  nextChapter = null,
  onSelectChapter = null
}) {
  const [selectedText, setSelectedText] = useState('');
  const [highlightNotice, setHighlightNotice] = useState('');
  const [savingHighlight, setSavingHighlight] = useState(false);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';
    if (text.length > 3 && text.length < 500) {
      setSelectedText(text);
    } else {
      setSelectedText('');
    }
  };

  const handleSaveHighlight = async () => {
    if (!selectedText || !chapterId) return;
    setSavingHighlight(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert('Please login to save highlights to your personal Cheat-Sheet.');
        return;
      }

      const res = await fetch('/api/student/highlights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId,
          chapterId,
          highlightedText: selectedText,
          color: 'yellow'
        })
      });

      if (res.ok) {
        setHighlightNotice('Saved to your Revision Cheat-Sheet!');
        setSelectedText('');
        setTimeout(() => setHighlightNotice(''), 3000);
      }
    } catch (e) {
      console.error('Highlight save error:', e);
    } finally {
      setSavingHighlight(false);
    }
  };
  if (!isUnlocked) {
    return (
      <div className="p-12 text-center bg-slate-100 rounded-3xl border border-slate-200 space-y-4">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-500">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-black text-slate-800">Chapter Locked</h3>
        <p className="text-slate-600 max-w-md mx-auto text-sm">
          You must pass the previous chapter test with at least {passingThreshold}% to unlock these notes and practice questions.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Info */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-xs font-black rounded-full uppercase tracking-wider mb-2">
            <BookOpen className="w-3.5 h-3.5" /> Study Notes
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
          <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <Clock className="w-4 h-4 text-blue-600" /> {estimatedMinutes} Min Read
          </span>
          {isPassed && (
            <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-sm">
              <Award className="w-4 h-4 text-emerald-600" /> Mastered
            </span>
          )}
        </div>
      </div>

      {/* Main Markdown Body with Selection Listener */}
      <div 
        onMouseUp={handleMouseUp}
        className="p-6 md:p-10 relative prose prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-slate-900 prose-table:border prose-table:border-slate-200"
      >
        {/* Floating Quick Highlight Toolbar */}
        {selectedText && (
          <div className="sticky top-20 z-30 p-3 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-xs font-bold truncate max-w-[280px]">
              <Highlighter className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="italic truncate text-slate-300">"{selectedText}"</span>
            </div>
            <button
              onClick={handleSaveHighlight}
              disabled={savingHighlight}
              className="px-4 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{savingHighlight ? 'Saving...' : 'Bookmark Point'}</span>
            </button>
          </div>
        )}

        {highlightNotice && (
          <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-amber-600" />
            <span>{highlightNotice}</span>
          </div>
        )}

        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            img: ({ node, ...props }) => (
              <img
                {...props}
                className="rounded-2xl border border-slate-200 shadow-md my-6 max-h-[450px] object-contain mx-auto"
                loading="lazy"
                alt={props.alt || "Study note illustration"}
              />
            ),
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-6">
                <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-xl" {...props} />
              </div>
            ),
            th: ({ node, ...props }) => (
              <th className="bg-slate-100 px-4 py-2 font-bold text-slate-800 text-left text-sm" {...props} />
            ),
            td: ({ node, ...props }) => (
              <td className="px-4 py-2 border-t border-slate-100 text-sm text-slate-700" {...props} />
            )
          }}
        >
          {content || '*No content available for this chapter yet.*'}
        </ReactMarkdown>
      </div>

      {/* Footer Call-to-Action & Sequential Chapter Navigation */}
      <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
            Mastery Requirement: Score at least <strong className="text-slate-900">{passingThreshold}%</strong> on the chapter quiz to unlock the next chapter.
          </div>

          {hasQuiz && onStartQuiz && (
            <button
              onClick={onStartQuiz}
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all text-sm uppercase tracking-wider cursor-pointer"
            >
              <span>Take Chapter Test</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Previous & Next Chapter Switcher */}
        {(prevChapter || nextChapter) && (
          <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between gap-3 text-xs">
            {prevChapter ? (
              <button
                onClick={() => onSelectChapter && onSelectChapter(prevChapter)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer max-w-[48%] truncate"
                title={`Previous: ${prevChapter.title}`}
              >
                <ChevronLeft className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="truncate">Prev: {prevChapter.title}</span>
              </button>
            ) : <div />}

            {nextChapter && (
              <button
                onClick={() => onSelectChapter && onSelectChapter(nextChapter)}
                disabled={nextChapter.status === 'LOCKED'}
                className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer max-w-[48%] truncate ${
                  nextChapter.status === 'LOCKED'
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                }`}
                title={nextChapter.status === 'LOCKED' ? 'Complete chapter test to unlock' : `Next: ${nextChapter.title}`}
              >
                <span className="truncate">Next: {nextChapter.title}</span>
                {nextChapter.status === 'LOCKED' ? (
                  <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 shrink-0 text-blue-600" />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
