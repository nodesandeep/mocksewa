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
import BrandName from '@/components/BrandName';
import { 
  BookOpen, Printer, ArrowLeft, Clock, 
  List, Layers, ExternalLink, Bookmark, CheckCircle2
} from 'lucide-react';

export default function MasterNotesPage() {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [totalMinutes, setTotalMinutes] = useState(0);

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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-white text-xs font-bold tracking-widest uppercase">Compiling Master Notes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navbar (Hidden on Print) */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-4 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href={`/courses/${courseId}/learn`}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
              title="Back to Guided Path"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                Master Syllabus Handbook
              </span>
              <h1 className="text-base font-black text-slate-900 leading-tight">
                {course?.title || 'Master Notes'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/courses/${courseId}/learn`}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <Layers className="w-3.5 h-3.5" /> Guided Path
            </Link>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-10 space-y-12">
        
        {/* Cover / Document Header */}
        <header className="p-8 md:p-12 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6 text-center print:border-none print:shadow-none print:p-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-[11px] font-black uppercase tracking-wider rounded-full border border-blue-200">
            <BookOpen className="w-3.5 h-3.5" /> Official Comprehensive Notes
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            {course?.title}
          </h1>

          <p className="text-sm md:text-base text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            {course?.description || 'Complete syllabus study handbook and theoretical review compiled for competitive exams in Nepal.'}
          </p>

          <div className="flex items-center justify-center gap-6 text-xs font-bold text-slate-600 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" /> {chapters.length} Chapters
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" /> ~{totalMinutes} Mins Read Time
            </span>
            <span>•</span>
            <span className="text-emerald-600 font-black">
              ✓ Printable PDF Edition
            </span>
          </div>
        </header>

        {/* Table of Contents (Hidden on Print) */}
        {chapters.length > 0 && (
          <section className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 print:hidden">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <List className="w-4 h-4 text-blue-600" /> Table of Contents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {chapters.map((chap, idx) => (
                <a
                  key={chap.id}
                  href={`#chap-${chap.id}`}
                  className="p-3 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl transition-all flex items-center gap-3 text-xs font-bold text-slate-800"
                >
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                    {idx + 1}
                  </span>
                  <span className="truncate">{chap.title}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Master Subject Notes (if any exist) */}
        {subjects.some(s => s.fullNotesMarkdown) && (
          <section className="space-y-6">
            {subjects.filter(s => s.fullNotesMarkdown).map(sub => (
              <div key={sub.id} className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-6">
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
        <div className="space-y-12">
          {chapters.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">No notes available for this syllabus yet.</p>
            </div>
          ) : (
            chapters.map((chap, idx) => (
              <article 
                key={chap.id} 
                id={`chap-${chap.id}`}
                className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0 print:break-before-page"
              >
                {/* Chapter Heading Bar */}
                <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Chapter {idx + 1}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                      {chap.title}
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 font-bold bg-slate-50 px-3 py-1 rounded-xl border border-slate-100 print:hidden">
                    ⏱️ {chap.estimatedReadMinutes || 8} min read
                  </span>
                </div>

                {/* Chapter Markdown Content */}
                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-table:border prose-table:border-slate-200 font-sans">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      img: ({ node, ...props }) => (
                        <img
                          {...props}
                          className="rounded-2xl border border-slate-200 shadow-md my-6 max-h-[400px] object-contain mx-auto"
                          loading="lazy"
                          alt={props.alt || "Note diagram"}
                        />
                      ),
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-6">
                          <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-xl" {...props} />
                        </div>
                      )
                    }}
                  >
                    {chap.readingMaterial || '*No text provided for this chapter.*'}
                  </ReactMarkdown>
                </div>
              </article>
            ))
          )}
        </div>

      </div>

      {/* Footer */}
      <footer className="py-10 text-center text-xs text-slate-400 font-medium border-t border-slate-200 bg-white print:hidden">
        MyMockSewa • Comprehensive Study Handbook • Copyright &copy; 2026
      </footer>
    </div>
  );
}
