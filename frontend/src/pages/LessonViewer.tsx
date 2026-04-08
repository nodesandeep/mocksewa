import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Chapter } from '../types';

export default function LessonViewer() {
  const { chapterId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Chapter can be passed via state for instant load, or we could fetch it
  const chapter: Chapter | null = location.state?.chapter ?? null;

  if (!chapter) {
    return (
      <div className="min-h-screen hero-bg flex items-center justify-center p-6">
        <div className="glass p-8 text-center max-w-md">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-white mb-2">Lesson Not Found</h2>
          <p className="text-slate-400 mb-6">We couldn't find the details for Chapter ID: {chapterId}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-brand px-6 py-2">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const startQuiz = () => {
    navigate(`/quiz/${chapter.id}`);
  };

  return (
    <div className="min-h-screen hero-bg flex flex-col">
      {/* Navigation Header */}
      <div className="p-4 border-b border-white/5 bg-surface-900/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-800 hover:bg-surface-700 text-white transition-all">←</button>
          <div>
            <h1 className="text-lg font-bold text-white">{chapter.title}</h1>
            <div className="text-xs text-brand-400 font-medium uppercase tracking-widest">NEA Level 5 Mastery</div>
          </div>
        </div>
        <button onClick={startQuiz} className="btn-brand px-6 py-2 text-sm shadow-lg shadow-brand-500/20">
          📝 Start Chapter Mock Test
        </button>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center">
        <div className="max-w-5xl w-full flex-1 flex flex-col gap-6">
          {/* Content Viewer */}
          {chapter.pdf_url ? (
            <div className="flex-1 glass overflow-hidden flex flex-col min-h-[600px] border-none shadow-2xl">
              <div className="p-3 bg-surface-800 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">PDF Document</span>
                <a href={chapter.pdf_url} target="_blank" rel="noreferrer" className="text-xs text-brand-400 hover:underline">Open in New Tab ↗</a>
              </div>
              <iframe 
                src={`${chapter.pdf_url}#toolbar=0`}
                className="w-full flex-1 bg-white"
                title="Chapter Content"
              />
            </div>
          ) : (
            <div className="flex-1 glass flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center text-4xl mb-6">📖</div>
              <h2 className="text-2xl font-bold text-white mb-2">No PDF Content</h2>
              <p className="text-slate-400 max-w-sm mb-8">This chapter doesn't have a PDF guide. You can head straight into the mock test to assess your knowledge.</p>
              <button onClick={startQuiz} className="btn-brand px-10 py-4 text-lg font-bold">
                Take Mock Test Now
              </button>
            </div>
          )}

          {/* Quick Tips Footer */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-surface-800/50 border border-white/5">
              <div className="text-brand-400 text-lg mb-1">⏱️</div>
              <div className="text-xs font-bold text-white mb-1">Timing</div>
              <p className="text-[10px] text-slate-500">Most chapter tests have a 15-minute limit. Prepare accordingly.</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-800/50 border border-white/5">
              <div className="text-red-400 text-lg mb-1">❌</div>
              <div className="text-xs font-bold text-white mb-1">Marking</div>
              <p className="text-[10px] text-slate-500">Standard negative marking of 20% applies to wrong answers.</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-800/50 border border-white/5">
              <div className="text-green-400 text-lg mb-1">✨</div>
              <div className="text-xs font-bold text-white mb-1">Explanations</div>
              <p className="text-[10px] text-slate-500">Review detailed explanations after finishing your test.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
