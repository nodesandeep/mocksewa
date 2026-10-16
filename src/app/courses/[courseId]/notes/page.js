'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import Logo from '@/components/Logo';
import { formatNotesMarkdown } from '@/components/MarkdownNotesViewer';
import { 
  BookOpen, Printer, ArrowLeft, Clock, 
  List, Layers, ExternalLink, Bookmark, CheckCircle2,
  Compass, ChevronUp, Search, Sparkles, FileText
} from 'lucide-react';

export default function MasterNotesPage() {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    async function loadMasterNotes() {
      setLoading(true);
      try {
        const res = await fetch(`/api/courses/${courseId}/notes`);
        const data = await res.json();
        if (data.success) {
          setCourse(data.course);
          setChapters(data.chapters);
          setSubjects(data.subjects);
          setTotalMinutes(data.estimatedTotalMinutes);
        }
      } catch (err) {
        console.error('Failed to load master notes:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMasterNotes();
  }, [courseId]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <BookOpen className="w-6 h-6 text-blue-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-white text-xs font-black tracking-widest uppercase">Compiling Master Handbook...</p>
          <p className="text-xs text-slate-400 font-medium">Rendering KaTeX formulas, tables, and curriculum notes</p>
        </div>
      </div>
    );
  }

  const filteredChapters = chapters.filter(chap => 
    chap.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (chap.readingMaterial && chap.readingMaterial.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <style jsx global>{`
        @media print {
          @page {
            margin: 1.5cm;
          }
          body {
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Top Navbar (Hidden on Print) */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 md:px-8 py-3.5 shadow-xs print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href={`/courses/${courseId}/learn`}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all active:scale-95"
              title="Return to Guided Roadmap"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                  Master Syllabus Handbook
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 bg-slate-100 text-slate-600 rounded-md">
                  {chapters.length} Chapters
                </span>
              </div>
              <h1 className="text-sm md:text-base font-black text-slate-900 leading-tight truncate max-w-[200px] sm:max-w-md">
                {course?.title || 'Master Notes'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/courses/${courseId}/learn`}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Guided Path</span>
            </Link>

            <Link
              href={`/courses/${courseId}/cheat-sheet`}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl transition-all border border-amber-200/80 flex items-center gap-1.5 active:scale-95"
              title="View your personal highlighted points"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Cheat-Sheet</span>
            </Link>

            <button
              onClick={handlePrint}
              className="px-4.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              title="Print document or save as clean PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10">
        
        {/* Cover / Document Header */}
        <header className="p-8 md:p-12 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-6 text-center print:border-none print:shadow-none print:p-0 print:mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-black uppercase tracking-wider rounded-full border border-blue-200/80 shadow-2xs">
            <BookOpen className="w-3.5 h-3.5" /> Official Comprehensive Study Handbook
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            {course?.title}
          </h1>

          <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
            {course?.description || 'Complete syllabus study handbook, theoretical review, and formula reference compiled for competitive exams in Nepal.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-bold text-slate-600 pt-4 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" /> {chapters.length} Sequenced Chapters
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" /> ~{totalMinutes} Mins Read Time
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1 text-emerald-600 font-black">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Printable PDF Edition
            </span>
          </div>
        </header>

        {/* Table of Contents (Hidden on Print) */}
        {chapters.length > 0 && (
          <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <List className="w-4 h-4 text-blue-600" /> Table of Contents ({chapters.length} Modules)
              </h3>

              {/* Quick Search in TOC */}
              {chapters.length > 3 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter chapters or keywords..."
                    className="w-full sm:w-64 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredChapters.map((chap, idx) => (
                <a
                  key={chap.id}
                  href={`#chap-${chap.id}`}
                  className="p-3 bg-slate-50/70 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-2xl transition-all duration-200 flex items-center justify-between gap-3 group text-xs font-bold text-slate-800 shadow-2xs hover:shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 group-hover:scale-105 transition-transform">
                      {chap.sequenceOrder || idx + 1}
                    </span>
                    <span className="truncate group-hover:text-blue-900 transition-colors">{chap.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                    {chap.estimatedReadMinutes || 8}m
                  </span>
                </a>
              ))}
            </div>

            {filteredChapters.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-2">
                No chapters matching "{searchQuery}"
              </p>
            )}
          </section>
        )}

        {/* Master Subject Notes (if any exist) */}
        {subjects.some(s => s.fullNotesMarkdown) && (
          <section className="space-y-6">
            {subjects.filter(s => s.fullNotesMarkdown).map(sub => (
              <div key={sub.id} className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200/90 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
                <div className="border-b border-slate-100 pb-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">Module Overview</span>
                  <h2 className="text-2xl font-black text-slate-900 mt-1">{sub.name || sub.title}</h2>
                </div>
                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-900 prose-p:text-slate-700 leading-relaxed font-sans">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {sub.fullNotesMarkdown}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Chapters Notes Iteration */}
        <div className="space-y-10">
          {chapters.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-700 font-bold">No notes available for this syllabus yet.</p>
              <p className="text-xs text-slate-400">Chapters compiled by faculty will appear here automatically.</p>
            </div>
          ) : (
            chapters.map((chap, idx) => (
              <article 
                key={chap.id} 
                id={`chap-${chap.id}`}
                className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200/90 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0 print:break-before-page scroll-mt-20"
              >
                {/* Chapter Heading Bar */}
                <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                        Chapter {chap.sequenceOrder || idx + 1}
                      </span>
                      <span className="text-slate-300 print:hidden">•</span>
                      <span className="text-xs text-slate-400 font-medium print:hidden">
                        {chap.quizQuestionCount || 15} Practice Questions Available
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                      {chap.title}
                    </h2>
                  </div>
                  
                  <div className="flex items-center gap-2 print:hidden shrink-0">
                    <span className="text-xs text-slate-600 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" /> {chap.estimatedReadMinutes || 8} min read
                    </span>
                    <Link
                      href={`/courses/${courseId}/practice/${chap.id}`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors"
                      title="Practice this chapter test"
                    >
                      Practice Test →
                    </Link>
                  </div>
                </div>

                {/* Chapter Markdown Content with Polished Typography */}
                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-900 prose-headings:tracking-tight prose-p:text-slate-700 prose-p:leading-[1.8] prose-p:text-base prose-li:text-slate-700 prose-li:leading-relaxed prose-strong:text-slate-900 prose-strong:font-black font-sans">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-8 mb-4 pb-2 border-b border-slate-100" {...props} />
                      ),
                      h2: ({ node, children, ...props }) => {
                        let cleanChildren = children;
                        if (typeof children === 'string') {
                          cleanChildren = children.replace(/^#+\s*/, '');
                        } else if (Array.isArray(children) && typeof children[0] === 'string') {
                          cleanChildren = [children[0].replace(/^#+\s*/, ''), ...children.slice(1)];
                        }
                        return (
                          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-7 mb-3" {...props}>
                            {cleanChildren}
                          </h2>
                        );
                      },
                      h3: ({ node, children, ...props }) => {
                        const text = typeof children === 'string' ? children : Array.isArray(children) ? children.join(' ') : '';
                        if (text.startsWith('TOPIC ') || text.includes('TOPIC')) {
                          let cleanTopic = text.replace(/^#+\s*/, '');
                          return (
                            <div className="mt-8 mb-2 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-[11px] font-black uppercase tracking-widest rounded-lg border border-blue-200 shadow-2xs">
                              <span>{cleanTopic}</span>
                            </div>
                          );
                        }
                        let cleanChildren = children;
                        if (typeof children === 'string') {
                          cleanChildren = children.replace(/^#+\s*/, '');
                        }
                        return (
                          <h3 className="text-lg md:text-xl font-bold text-slate-900 mt-5 mb-2" {...props}>
                            {cleanChildren}
                          </h3>
                        );
                      },
                      blockquote: ({ node, ...props }) => (
                        <blockquote 
                          className="my-6 p-4 md:p-5 bg-gradient-to-r from-blue-50/80 to-indigo-50/30 border-l-4 border-blue-600 rounded-r-2xl text-slate-800 font-medium not-italic shadow-2xs leading-relaxed" 
                          {...props} 
                        />
                      ),
                      img: ({ node, ...props }) => (
                        <img
                          {...props}
                          className="rounded-2xl border border-slate-200 shadow-md my-6 max-h-[420px] object-contain mx-auto"
                          loading="lazy"
                          alt={props.alt || "Curriculum note diagram"}
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
                    {formatNotesMarkdown(chap.readingMaterial) || '*No text provided for this chapter.*'}
                  </ReactMarkdown>
                </div>
              </article>
            ))
          )}
        </div>

      </div>

      {/* Floating Back to Top & Quick Jump Button (Hidden on Print) */}
      {showScrollTop && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2 print:hidden animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={scrollToTop}
            className="w-12 h-12 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 rounded-full shadow-lg border border-slate-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Scroll back to top"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Footer (Hidden on Print) */}
      <footer className="py-12 text-center text-xs text-slate-400 font-medium border-t border-slate-200 bg-white print:hidden mt-12">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo compact />
          </div>
          <p>Official Curriculum Study Handbook • All Rights Reserved &copy; 2026</p>
          <div className="flex items-center gap-4 text-slate-500 font-bold">
            <Link href={`/courses/${courseId}/learn`} className="hover:text-blue-600 transition-colors">
              Guided Path
            </Link>
            <span>•</span>
            <button onClick={handlePrint} className="hover:text-blue-600 transition-colors cursor-pointer">
              Print PDF
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
