'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/utils/firebase';
import Logo from '@/components/Logo';
import BrandName from '@/components/BrandName';
import { 
  Bookmark, Trash2, ArrowLeft, Highlighter, 
  BookOpen, Sparkles, Clock, Share2
} from 'lucide-react';

export default function CheatSheetPage() {
  const { courseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState([]);

  useEffect(() => {
    async function loadHighlights() {
      setLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/student/highlights?courseId=${courseId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setHighlights(data.highlights);
        }
      } catch (err) {
        console.error('Failed to load highlights:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHighlights();
  }, [courseId]);

  const handleDelete = async (id) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/student/highlights?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setHighlights(prev => prev.filter(h => h.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete highlight:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
        <p className="text-white text-xs font-bold tracking-widest uppercase">Loading Your Cheat-Sheet...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link 
            href={`/courses/${courseId}/learn`}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Notes & Path
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-black rounded-full border border-amber-200 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-amber-600" />
              <span>{highlights.length} Saved Points</span>
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-10 space-y-8">
        <header className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-black uppercase tracking-wider rounded-full">
            <Highlighter className="w-3 h-3 text-yellow-600" /> Quick Revision Bank
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            My Revision Cheat-Sheet
          </h1>
          <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto">
            All the key definitions, constitutional articles, and formulas you bookmarked while reading.
          </p>
        </header>

        {highlights.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
            <Bookmark className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-black text-slate-800">No Highlights Saved Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              While reading any chapter note, simply highlight or select any text with your mouse and click <strong>"Bookmark Point"</strong> to save it here.
            </p>
            <Link
              href={`/courses/${courseId}/learn`}
              className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20"
            >
              Start Reading Notes
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {highlights.map((h) => (
              <div 
                key={h.id}
                className="p-5 md:p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 relative group hover:border-yellow-300 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <Highlighter className="w-3.5 h-3.5 text-yellow-500" />
                    <span>Saved Snippet</span>
                  </div>
                  <button
                    onClick={() => handleDelete(h.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove from Cheat-Sheet"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 bg-yellow-50/60 rounded-xl border border-yellow-100/80">
                  <p className="font-bold text-slate-900 text-sm md:text-base leading-relaxed font-sans">
                    "{h.highlightedText}"
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Saved on {new Date(h.createdAt).toLocaleDateString()}</span>
                  <Link
                    href={`/courses/${courseId}/learn`}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Open Chapter Note →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
