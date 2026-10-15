'use client';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { 
  BookOpen, Lock, ArrowRight, ChevronLeft, ChevronRight, 
  Award, Clock, Highlighter, Bookmark, Check, Sparkles,
  HelpCircle, ShieldCheck, CheckCircle2, Share2
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
        setHighlightNotice('Point saved to your Revision Cheat-Sheet!');
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
      <div className="p-12 md:p-16 text-center bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-400 border border-slate-200 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Chapter Locked</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            You must achieve at least <strong className="text-slate-800">{passingThreshold}%</strong> on the previous chapter practice test to unlock these study notes and questions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header Info Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white border-b border-blue-100/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-[11px] font-black rounded-full uppercase tracking-wider mb-2.5 shadow-2xs">
            <BookOpen className="w-3.5 h-3.5" /> High-Yield Study Notes
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug">
            {title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-slate-600">
          <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-slate-700">
            <Clock className="w-3.5 h-3.5 text-blue-600" /> {estimatedMinutes} Min Read
          </span>
          {isPassed ? (
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Mastered
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Pass: {passingThreshold}%
            </span>
          )}
        </div>
      </div>

      {/* Main Markdown Content Area with Optimal Line Length */}
      <div 
        onMouseUp={handleMouseUp}
        className="p-6 md:p-10 lg:p-12 relative"
      >
        {/* Floating Quick Highlight Bookmark Toolbar */}
        {selectedText && (
          <div className="sticky top-20 z-30 p-3 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-slate-700 animate-in fade-in zoom-in-95 duration-200 mb-4 max-w-xl mx-auto">
            <div className="flex items-center gap-2 text-xs font-medium truncate">
              <Highlighter className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="italic truncate text-slate-300">"{selectedText}"</span>
            </div>
            <button
              onClick={handleSaveHighlight}
              disabled={savingHighlight}
              className="px-4 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <Bookmark className="w-3.5 h-3.5 fill-slate-950" />
              <span>{savingHighlight ? 'Saving...' : 'Bookmark Point'}</span>
            </button>
          </div>
        )}

        {highlightNotice && (
          <div className="mb-6 p-3.5 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center gap-2 max-w-3xl mx-auto animate-in fade-in duration-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{highlightNotice}</span>
          </div>
        )}

        {/* Prose Container with Controlled Optimal Reading Width (max-w-prose / max-w-3xl) */}
        <div className="max-w-3xl mx-auto prose prose-slate prose-headings:font-black prose-headings:text-slate-900 prose-headings:tracking-tight prose-p:text-slate-700 prose-p:leading-[1.8] prose-p:text-base prose-li:text-slate-700 prose-li:leading-relaxed prose-strong:text-slate-900 prose-strong:font-black">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-8 mb-4 pb-2 border-b border-slate-100" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-8 mb-3" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-lg md:text-xl font-bold text-slate-900 mt-6 mb-2" {...props} />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote 
                  className="my-6 p-4 md:p-5 bg-gradient-to-r from-blue-50/80 to-indigo-50/30 border-l-4 border-blue-600 rounded-r-2xl text-slate-800 font-medium not-italic shadow-2xs leading-relaxed" 
                  {...props} 
                />
              ),
              img: ({ node, ...props }) => (
                <img
                  {...props}
                  className="rounded-2xl border border-slate-200 shadow-md my-6 max-h-[450px] object-contain mx-auto"
                  loading="lazy"
                  alt={props.alt || "Study note illustration"}
                />
              ),
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-6 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm" {...props} />
                </div>
              ),
              th: ({ node, ...props }) => (
                <th className="bg-slate-100/90 px-4 py-3 font-extrabold text-slate-900 text-xs uppercase tracking-wider" {...props} />
              ),
              td: ({ node, ...props }) => (
                <td className="px-4 py-3 border-t border-slate-100 text-slate-700 text-sm leading-normal hover:bg-slate-50/50 transition-colors" {...props} />
              ),
              code: ({ node, inline, className, children, ...props }) => {
                if (inline) {
                  return (
                    <code className="px-1.5 py-0.5 rounded-md bg-slate-100 text-blue-700 font-mono text-xs font-semibold border border-slate-200/60" {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {content || '*No content available for this chapter yet.*'}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer Call-to-Action & Sequential Chapter Navigation */}
      <div className="p-6 md:p-8 bg-slate-50/90 border-t border-slate-200/90 space-y-6">
        
        {/* Quiz Prompt Bar */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-700">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Milestone Verification
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Score at least <strong className="text-slate-900 font-black">{passingThreshold}%</strong> on the chapter practice quiz to unlock the next chapter in your roadmap.
            </p>
          </div>

          {hasQuiz && onStartQuiz && (
            <button
              onClick={onStartQuiz}
              className="w-full md:w-auto px-7 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-black rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap"
            >
              <span>Take Chapter Test</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Previous & Next Sequential Navigation Tiles */}
        {(prevChapter || nextChapter) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {prevChapter ? (
              <button
                onClick={() => onSelectChapter && onSelectChapter(prevChapter)}
                className="p-4 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-2xl text-left transition-all group shadow-2xs hover:shadow-xs hover:border-slate-300 cursor-pointer"
                title={`Previous: ${prevChapter.title}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                  <span>Previous Chapter</span>
                </div>
                <p className="font-bold text-xs md:text-sm text-slate-800 truncate mt-1">
                  {prevChapter.title}
                </p>
              </button>
            ) : <div className="hidden sm:block" />}

            {nextChapter && (
              <button
                onClick={() => onSelectChapter && onSelectChapter(nextChapter)}
                disabled={nextChapter.status === 'LOCKED'}
                className={`p-4 rounded-2xl text-right transition-all group ${
                  nextChapter.status === 'LOCKED'
                    ? 'bg-slate-50 border border-slate-200/80 opacity-70 cursor-not-allowed'
                    : 'bg-white hover:bg-blue-50/30 border border-blue-200 hover:border-blue-400 shadow-2xs hover:shadow-xs cursor-pointer'
                }`}
                title={nextChapter.status === 'LOCKED' ? 'Pass chapter test to unlock next chapter' : `Next: ${nextChapter.title}`}
              >
                <div className="flex items-center justify-end gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors">
                  <span>Next Chapter</span>
                  {nextChapter.status === 'LOCKED' ? (
                    <Lock className="w-3 h-3 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 text-blue-600" />
                  )}
                </div>
                <p className="font-bold text-xs md:text-sm text-slate-800 truncate mt-1">
                  {nextChapter.title}
                </p>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
