'use client';
import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { 
  BookOpen, Lock, ArrowRight, ChevronLeft, ChevronRight, 
  Award, Clock, Highlighter, Bookmark, Check, Sparkles,
  HelpCircle, ShieldCheck, CheckCircle2, Share2, Layers,
  Compass, Layout, RotateCcw, Target, CheckSquare, Sparkle
} from 'lucide-react';
import { auth } from '@/utils/firebase';

export function formatNotesMarkdown(raw) {
  if (!raw) return '';
  let text = raw;

  // Normalize Windows CRLF to LF
  text = text.replace(/\r\n/g, '\n');

  // Convert legacy ☆ ☆ to clean markdown bullet with star
  text = text.replace(/☆\s*☆\s*/g, '\n- ⭐ ');
  text = text.replace(/☆\s*➤\s*/g, '\n  - ➤ ');
  text = text.replace(/(?<![-*]\s*)➤\s*/g, '\n  - ➤ ');

  // Convert any callout blocks (with or without bold asterisks, with or without blockquotes) into standard blockquotes
  const blocks = text.split(/\n\s*\n/);
  text = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';

    const isMnemonic = /(?:^|\n)\s*(?:>\s*)?\*{0,2}(?:सूत्र|सुत्र)/i.test(trimmed);
    const isExamAlert = /(?:^|\n)\s*(?:>\s*)?\*{0,2}[⚠⚠️]?\s*स्मरण रहोस्/i.test(trimmed);
    const isClarification = /(?:^|\n)\s*(?:>\s*)?\*{0,2}स्रोत विमति/i.test(trimmed);
    const isDeepDive = /(?:^|\n)\s*(?:>\s*)?\*{0,2}गहन सन्दर्भ/i.test(trimmed);
    const isPastAnalysis = /(?:^|\n)\s*(?:>\s*)?\*{0,2}विगत परीक्षा/i.test(trimmed);

    if (isMnemonic || isExamAlert || isClarification || isDeepDive || isPastAnalysis) {
      const lines = trimmed.split('\n').map(l => {
        const cleanL = l.replace(/^>\s*/, '').trim();
        return cleanL ? `> ${cleanL}` : '>';
      }).join('\n');
      return lines;
    }

    return block;
  }).filter(Boolean).join('\n\n');

  // Strip duplicate heading hashes like "## ## " or "### ### "
  text = text.replace(/^(#{1,6})\s*(?:#{1,6}\s*)+/gm, '$1 ');

  // Format Topic headers if written as: "### Topic 1: [Title]" on a single line
  text = text.replace(/###[^\S\r\n]*Topic[^\S\r\n]*(\d+)[^\S\r\n]*:[^\S\r\n]*(?:##\s*)?([^\r\n]+)/gi, '\n\n### TOPIC $1\n\n## $2\n\n');

  // Also support bare "TOPIC 1" on its own line
  text = text.replace(/(?:^|\n)(?:###\s*)?TOPIC\s*(\d+)\s*\n/gi, '\n\n### TOPIC $1\n\n');

  // Clean any accidental leftover "## ## "
  text = text.replace(/(?:^|\n)##\s+##\s+/g, '\n\n## ');

  // Ensure consecutive list items don't merge: convert single linebreaks into double or break
  text = text.replace(/\n(- [^\n]+)/g, '\n\n$1');

  return text;
}

export function parseTopicsAndSlides(raw) {
  if (!raw) return [];
  const text = formatNotesMarkdown(raw);

  // Pattern matches "### TOPIC 1", "TOPIC 1", "## Topic 1" etc.
  const topicHeadingRegex = /(?:^|\n)(?:###\s*TOPIC\s*(\d+)|##\s*Topic\s*(\d+)|(?:\*\*TOPIC\s*(\d+)\*\*)|(?:^|\n)TOPIC\s*(\d+)\b)/gi;
  const matches = [...text.matchAll(topicHeadingRegex)];

  if (matches.length > 0) {
    const topics = [];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const topicNum = parseInt(match[1] || match[2] || match[3] || match[4] || (i + 1), 10);
      const startIndex = match.index + match[0].length;
      const endIndex = (i < matches.length - 1) ? matches[i + 1].index : text.length;
      const chunk = text.slice(startIndex, endIndex).trim();

      // Extract topic title from first ## heading or first line
      let topicTitle = `Topic ${topicNum}`;
      const titleMatch = chunk.match(/^##\s*([^\n]+)/);
      if (titleMatch) {
        topicTitle = titleMatch[1].trim();
      }

      // Clean the title from the chunk to avoid duplicate display in slide card
      const contentWithoutH2 = titleMatch ? chunk.replace(/^##\s*[^\n]+\n*/, '').trim() : chunk;

      // Break chunk into slides:
      // Priority 1: explicitly separated by `---`
      let rawSlides = contentWithoutH2.split(/\n\s*---\s*\n/).map(s => s.trim()).filter(Boolean);

      // Priority 2: If only 1 slide was found and chunk is long, break by subheadings `#### `
      if (rawSlides.length === 1 && contentWithoutH2.length > 1500) {
        const subSections = contentWithoutH2.split(/\n(?=####\s+)/).map(s => s.trim()).filter(Boolean);
        if (subSections.length > 1) {
          rawSlides = subSections;
        }
      }

      // Priority 3: If still 1 slide and very lengthy (> 2500 chars), split by callouts or logical groups
      if (rawSlides.length === 1 && contentWithoutH2.length > 2500) {
        const parts = contentWithoutH2.split(/\n(?=>\s*[💡⚠️📌📖🎯])/).map(s => s.trim()).filter(Boolean);
        if (parts.length > 1) {
          rawSlides = parts;
        }
      }

      const slides = (rawSlides.length > 0 ? rawSlides : [contentWithoutH2]).map((s, idx) => ({
        slideIndex: idx,
        content: s
      }));

      topics.push({
        id: `topic-${topicNum}`,
        number: topicNum,
        title: topicTitle,
        slides
      });
    }
    return topics;
  }

  // Fallback: check if there are multiple ## headings
  const h2Matches = [...text.matchAll(/(?:^|\n)##\s+([^\n]+)/g)];
  if (h2Matches.length > 1) {
    const topics = [];
    for (let i = 0; i < h2Matches.length; i++) {
      const match = h2Matches[i];
      const startIndex = match.index;
      const endIndex = (i < h2Matches.length - 1) ? h2Matches[i + 1].index : text.length;
      const chunk = text.slice(startIndex, endIndex).trim();
      const contentWithoutH2 = chunk.replace(/^##\s*[^\n]+\n*/, '').trim();
      const rawSlides = contentWithoutH2.split(/\n\s*---\s*\n/).map(s => s.trim()).filter(Boolean);
      topics.push({
        id: `topic-${i + 1}`,
        number: i + 1,
        title: match[1].trim(),
        slides: (rawSlides.length > 0 ? rawSlides : [contentWithoutH2]).map((s, sIdx) => ({
          slideIndex: sIdx,
          content: s
        }))
      });
    }
    return topics;
  }

  // Single Topic Fallback
  const rawSlides = text.split(/\n\s*---\s*\n/).map(s => s.trim()).filter(Boolean);
  return [
    {
      id: 'topic-1',
      number: 1,
      title: 'Curriculum Study Notes',
      slides: (rawSlides.length > 0 ? rawSlides : [text]).map((s, sIdx) => ({
        slideIndex: sIdx,
        content: s
      }))
    }
  ];
}

function extractTextFromReactNode(node) {
  if (!node) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromReactNode).join(' ');
  if (node.props?.children) return extractTextFromReactNode(node.props.children);
  return '';
}

function renderCalloutCard(type, children) {
  switch (type) {
    case 'mnemonic':
      return (
        <div className="my-5 p-4 md:p-5 bg-gradient-to-r from-purple-50/90 to-indigo-50/40 border-l-4 border-purple-600 rounded-r-2xl shadow-xs space-y-1.5 border border-purple-200/80">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-purple-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-2xs">
            💡 सूत्र (Mnemonic)
          </div>
          <div className="text-purple-950 font-bold text-sm leading-relaxed">{children}</div>
        </div>
      );
    case 'examAlert':
      return (
        <div className="my-5 p-4 md:p-5 bg-gradient-to-r from-amber-50/90 to-yellow-50/40 border-l-4 border-amber-500 rounded-r-2xl shadow-xs space-y-1.5 border border-amber-200/80">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-2xs">
            ⚠️ स्मरण रहोस् (Exam Alert)
          </div>
          <div className="text-amber-950 font-bold text-sm leading-relaxed">{children}</div>
        </div>
      );
    case 'clarification':
      return (
        <div className="my-5 p-4 md:p-5 bg-gradient-to-r from-rose-50/90 to-red-50/30 border-l-4 border-rose-500 rounded-r-2xl shadow-xs space-y-1.5 border border-rose-200/80">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-2xs">
            📌 स्रोत विमति / स्पष्टीकरण
          </div>
          <div className="text-rose-950 font-medium text-sm leading-relaxed">{children}</div>
        </div>
      );
    case 'deepDive':
      return (
        <div className="my-5 p-4 md:p-5 bg-slate-50 border-l-4 border-slate-600 rounded-r-2xl shadow-xs space-y-1.5 border border-slate-200">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-700 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-2xs">
            📖 गहन सन्दर्भ तथा विषयवस्तु विस्तार
          </div>
          <div className="text-slate-800 font-medium text-sm leading-relaxed">{children}</div>
        </div>
      );
    case 'pastAnalysis':
      return (
        <div className="my-5 p-4 md:p-5 bg-gradient-to-r from-indigo-50/80 to-blue-50/30 border-l-4 border-indigo-600 rounded-r-2xl shadow-xs space-y-1.5 border border-indigo-200/80">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow-2xs">
            🎯 विगत परीक्षा प्रश्न विश्लेषण
          </div>
          <div className="text-indigo-950 font-medium text-sm leading-relaxed">{children}</div>
        </div>
      );
    default:
      return null;
  }
}

function MarkdownProse({ markdownText }) {
  return (
    <div className="max-w-3xl mx-auto prose prose-slate font-sans antialiased text-slate-800 prose-headings:font-black prose-headings:text-slate-900 prose-headings:tracking-tight prose-p:text-slate-700 prose-p:leading-[1.85] prose-p:text-base prose-li:text-slate-700 prose-li:leading-[1.75] prose-strong:text-slate-900 prose-strong:font-black">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-7 mb-4 pb-2 border-b border-slate-200" {...props} />
          ),
          h2: ({ node, children, ...props }) => {
            let cleanChildren = children;
            if (typeof children === 'string') {
              cleanChildren = children.replace(/^#+\s*/, '');
            } else if (Array.isArray(children) && typeof children[0] === 'string') {
              cleanChildren = [children[0].replace(/^#+\s*/, ''), ...children.slice(1)];
            }
            return (
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-7 mb-3 flex items-center gap-2" {...props}>
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
              <h3 className="text-lg md:text-xl font-bold text-slate-900 mt-6 mb-2" {...props}>
                {cleanChildren}
              </h3>
            );
          },
          h4: ({ node, ...props }) => (
            <h4 className="text-base font-black text-slate-800 mt-5 mb-2 uppercase tracking-wide flex items-center gap-2" {...props} />
          ),
          p: ({ node, children, ...props }) => {
            const rawText = extractTextFromReactNode(children);
            if (rawText.includes('सूत्र') || rawText.includes('सुत्र')) return renderCalloutCard('mnemonic', children);
            if (rawText.includes('स्मरण रहोस्') || rawText.includes('Exam Alert')) return renderCalloutCard('examAlert', children);
            if (rawText.includes('स्रोत विमति') || rawText.includes('स्पष्टीकरण')) return renderCalloutCard('clarification', children);
            if (rawText.includes('गहन सन्दर्भ') || rawText.includes('विषयवस्तु विस्तार')) return renderCalloutCard('deepDive', children);
            if (rawText.includes('विगत परीक्षा') || rawText.includes('प्रश्न विश्लेषण')) return renderCalloutCard('pastAnalysis', children);

            return <p className="my-3 text-slate-700 leading-[1.85] text-base md:text-[16px] font-normal" {...props}>{children}</p>;
          },
          li: ({ node, children, ...props }) => (
            <li className="my-2 text-slate-800 text-sm md:text-base leading-[1.75] list-none pl-0 flex items-start gap-2.5" {...props}>
              <span className="flex-1">{children}</span>
            </li>
          ),
          blockquote: ({ node, children, ...props }) => {
            const rawText = extractTextFromReactNode(children);

            if (rawText.includes('सूत्र') || rawText.includes('सुत्र')) return renderCalloutCard('mnemonic', children);
            if (rawText.includes('स्मरण रहोस्') || rawText.includes('Exam Alert')) return renderCalloutCard('examAlert', children);
            if (rawText.includes('स्रोत विमति') || rawText.includes('स्पष्टीकरण')) return renderCalloutCard('clarification', children);
            if (rawText.includes('गहन सन्दर्भ') || rawText.includes('विषयवस्तु विस्तार')) return renderCalloutCard('deepDive', children);
            if (rawText.includes('विगत परीक्षा') || rawText.includes('प्रश्न विश्लेषण')) return renderCalloutCard('pastAnalysis', children);
            if (rawText.includes('Correct Answer') || rawText.includes('सही उत्तर')) {
              return (
                <div className="my-4 p-3.5 bg-emerald-50 border-l-4 border-emerald-600 rounded-r-xl shadow-2xs border border-emerald-200">
                  <div className="text-emerald-900 font-black text-sm leading-relaxed">{children}</div>
                </div>
              );
            }

            return (
              <blockquote 
                className="my-6 p-4 md:p-5 bg-gradient-to-r from-blue-50/80 to-indigo-50/30 border-l-4 border-blue-600 rounded-r-2xl text-slate-800 font-medium not-italic shadow-2xs leading-relaxed" 
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          img: ({ node, ...props }) => (
            <img
              {...props}
              className="rounded-2xl border border-slate-200 shadow-md my-6 max-h-[450px] object-contain mx-auto"
              loading="lazy"
              alt={props.alt || "Study note illustration"}
            />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6 rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="bg-slate-100/90 px-4 py-3 font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-3 border-t border-slate-100 text-slate-800 text-sm leading-normal hover:bg-slate-50/50 transition-colors font-medium" {...props} />
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
        {markdownText || '*No content available for this section.*'}
      </ReactMarkdown>
    </div>
  );
}

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

  // Topic & Slide deck states
  const topics = useMemo(() => parseTopicsAndSlides(content), [content]);
  const [viewMode, setViewMode] = useState('slides'); // 'slides' | 'continuous'
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [completedTopicIds, setCompletedTopicIds] = useState([]);
  const [resumedNotice, setResumedNotice] = useState('');

  // Total slides count across topics
  const totalSlidesInChapter = useMemo(() => {
    return topics.reduce((acc, t) => acc + (t.slides?.length || 1), 0);
  }, [topics]);

  // Restore saved position on chapter change
  useEffect(() => {
    if (!courseId || !chapterId) return;
    try {
      const posKey = `mymocksewa_pos_${courseId}_${chapterId}`;
      const saved = localStorage.getItem(posKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.topicIdx === 'number' && topics[parsed.topicIdx]) {
          setCurrentTopicIdx(parsed.topicIdx);
          const t = topics[parsed.topicIdx];
          const sIdx = (parsed.slideIdx && parsed.slideIdx < t.slides.length) ? parsed.slideIdx : 0;
          setCurrentSlideIdx(sIdx);
          setResumedNotice(`Resumed at Topic ${t.number}: Slide ${sIdx + 1}`);
          setTimeout(() => setResumedNotice(''), 4500);
        }
      }
      const doneKey = `mymocksewa_done_topics_${courseId}_${chapterId}`;
      const doneSaved = localStorage.getItem(doneKey);
      if (doneSaved) {
        setCompletedTopicIds(JSON.parse(doneSaved) || []);
      }
    } catch (e) {
      console.warn('Could not read saved reading position:', e);
    }
  }, [courseId, chapterId, topics]);

  const savePosition = (tIdx, sIdx) => {
    try {
      const posKey = `mymocksewa_pos_${courseId}_${chapterId}`;
      localStorage.setItem(posKey, JSON.stringify({ topicIdx: tIdx, slideIdx: sIdx }));
    } catch (e) {}
  };

  const markTopicComplete = (topicId) => {
    if (!completedTopicIds.includes(topicId)) {
      const updated = [...completedTopicIds, topicId];
      setCompletedTopicIds(updated);
      try {
        const doneKey = `mymocksewa_done_topics_${courseId}_${chapterId}`;
        localStorage.setItem(doneKey, JSON.stringify(updated));
      } catch (e) {}
    }
  };

  const currentTopic = topics[currentTopicIdx] || topics[0] || { number: 1, title: 'Study Notes', slides: [{ content: '' }] };
  const currentSlide = currentTopic.slides[currentSlideIdx] || currentTopic.slides[0] || { content: '' };
  const isLastSlideOfTopic = currentSlideIdx === currentTopic.slides.length - 1;
  const isLastTopicOfChapter = currentTopicIdx === topics.length - 1;

  const handleNextSlide = () => {
    if (currentSlideIdx < currentTopic.slides.length - 1) {
      const nextSlide = currentSlideIdx + 1;
      setCurrentSlideIdx(nextSlide);
      savePosition(currentTopicIdx, nextSlide);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else {
      // Mark current topic complete
      markTopicComplete(currentTopic.id);
      if (!isLastTopicOfChapter) {
        const nextTopic = currentTopicIdx + 1;
        setCurrentTopicIdx(nextTopic);
        setCurrentSlideIdx(0);
        savePosition(nextTopic, 0);
        window.scrollTo({ top: 120, behavior: 'smooth' });
      }
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIdx > 0) {
      const prevSlide = currentSlideIdx - 1;
      setCurrentSlideIdx(prevSlide);
      savePosition(currentTopicIdx, prevSlide);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else if (currentTopicIdx > 0) {
      const prevTopic = currentTopicIdx - 1;
      const prevTopicSlides = topics[prevTopic]?.slides?.length || 1;
      setCurrentTopicIdx(prevTopic);
      setCurrentSlideIdx(prevTopicSlides - 1);
      savePosition(prevTopic, prevTopicSlides - 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  // Keyboard navigation for slides
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (viewMode !== 'slides') return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowRight') {
        handleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        handlePrevSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentTopicIdx, currentSlideIdx, topics]);

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

        {/* Untimed & Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-slate-600">
          <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-slate-700 font-bold" title="Untimed self-paced study">
            <Clock className="w-3.5 h-3.5 text-blue-600" /> Self-Paced (Untimed)
          </span>

          <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-slate-700">
            <Layers className="w-3.5 h-3.5 text-indigo-600" /> {topics.length} Topics · {totalSlidesInChapter} Slides
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

      {/* Mode Switcher & Resume Bar */}
      <div className="px-6 md:px-8 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Interactive Slide Deck vs Continuous Handbook */}
        <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setViewMode('slides')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'slides' ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Interactive Slide Deck</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('continuous')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'continuous' ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Full Handbook View</span>
          </button>
        </div>

        {/* Right: Topic Dropdown Selector (if in slide mode) */}
        {viewMode === 'slides' && topics.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hidden sm:inline">Jump to:</span>
            <select
              value={currentTopicIdx}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                setCurrentTopicIdx(idx);
                setCurrentSlideIdx(0);
                savePosition(idx, 0);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {topics.map((t, idx) => (
                <option key={t.id} value={idx}>
                  Topic {t.number}: {t.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Resume Notice Pill */}
      {resumedNotice && (
        <div className="mx-6 md:mx-8 mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-600 shrink-0" />
            <span>📌 {resumedNotice}</span>
          </div>
          <button
            onClick={() => {
              setCurrentTopicIdx(0);
              setCurrentSlideIdx(0);
              savePosition(0, 0);
              setResumedNotice('');
            }}
            className="text-[11px] underline text-blue-700 hover:text-blue-900 cursor-pointer"
          >
            Start from beginning
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div 
        onMouseUp={handleMouseUp}
        className="p-6 md:p-10 lg:p-12 relative"
      >
        {/* Floating Highlight Bookmark Toolbar */}
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

        {viewMode === 'slides' ? (
          /* ============================================================== */
          /* 🎞️ SLIDE DECK MODE (Bite-Sized, Step-by-Step Topic Learning) */
          /* ============================================================== */
          <div className="space-y-6 max-w-3xl mx-auto">
            
            {/* Topic Ribbon & Slide Dots */}
            <div className="p-4 md:p-5 bg-gradient-to-r from-blue-50/70 to-indigo-50/30 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                    Topic {currentTopic.number} of {topics.length}
                  </span>
                  {completedTopicIds.includes(currentTopic.id) && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Topic Completed
                    </span>
                  )}
                </div>
                <h3 className="text-base md:text-xl font-black text-slate-900 truncate">
                  {currentTopic.title}
                </h3>
              </div>

              {/* Slide Progress Dots */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                {currentTopic.slides.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCurrentSlideIdx(idx);
                      savePosition(currentTopicIdx, idx);
                    }}
                    title={`Jump to Slide ${idx + 1}`}
                    className={`h-2.5 rounded-full transition-all cursor-pointer ${
                      idx === currentSlideIdx 
                        ? 'w-7 bg-blue-600 ring-2 ring-blue-200' 
                        : idx < currentSlideIdx 
                          ? 'w-2.5 bg-blue-300 hover:bg-blue-400' 
                          : 'w-2.5 bg-slate-200 hover:bg-slate-300'
                    }`}
                  />
                ))}
                <span className="text-xs font-black text-slate-400 ml-2">
                  {currentSlideIdx + 1} / {currentTopic.slides.length}
                </span>
              </div>
            </div>

            {/* Slide Content Card */}
            <div className="bg-white rounded-3xl p-6 md:p-10 border border-slate-200/90 shadow-xs min-h-[350px]">
              <MarkdownProse markdownText={currentSlide.content} />
            </div>

            {/* Checkpoint Banner when on final slide of this topic */}
            {isLastSlideOfTopic && (
              <div className="p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl text-white shadow-xl shadow-blue-600/15 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                    <Target className="w-6 h-6 text-yellow-300" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                      Topic Milestone
                    </span>
                    <h4 className="text-lg md:text-xl font-black">
                      Topic {currentTopic.number} Study Slides Completed!
                    </h4>
                    <p className="text-xs md:text-sm text-blue-100 leading-relaxed font-medium">
                      Lock in your knowledge with untimed practice before proceeding to the next concept.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-3">
                  {hasQuiz && onStartQuiz && (
                    <button
                      type="button"
                      onClick={onStartQuiz}
                      className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-yellow-400/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Target className="w-4 h-4 fill-slate-950" />
                      <span>Take Topic Recall Practice</span>
                    </button>
                  )}

                  {!isLastTopicOfChapter ? (
                    <button
                      type="button"
                      onClick={() => {
                        markTopicComplete(currentTopic.id);
                        const nextT = currentTopicIdx + 1;
                        setCurrentTopicIdx(nextT);
                        setCurrentSlideIdx(0);
                        savePosition(nextT, 0);
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }}
                      className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <span>Proceed to Topic {topics[currentTopicIdx + 1].number}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/30 text-emerald-100 rounded-xl text-xs font-black uppercase tracking-wider border border-emerald-400/40">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>All Topics In This Chapter Finished!</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Slide Navigation Controls */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handlePrevSlide}
                disabled={currentTopicIdx === 0 && currentSlideIdx === 0}
                className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  currentTopicIdx === 0 && currentSlideIdx === 0
                    ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                    : 'text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs active:scale-95'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Slide</span>
              </button>

              <div className="text-[11px] font-bold text-slate-400 hidden sm:block">
                Use <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">→</kbd> arrow keys to navigate
              </div>

              <button
                type="button"
                onClick={handleNextSlide}
                disabled={isLastTopicOfChapter && isLastSlideOfTopic}
                className={`px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                  isLastTopicOfChapter && isLastSlideOfTopic
                    ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                    : 'text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95'
                }`}
              >
                <span>{isLastSlideOfTopic ? (isLastTopicOfChapter ? 'Complete' : 'Next Topic') : 'Next Slide'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        ) : (
          /* ============================================================== */
          /* 📄 FULL CONTINUOUS HANDBOOK MODE */
          /* ============================================================== */
          <MarkdownProse markdownText={formatNotesMarkdown(content)} />
        )}

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
              <span>Take Chapter Practice Test</span>
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
