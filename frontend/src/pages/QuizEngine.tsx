import { useParams, useNavigate } from 'react-router-dom';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { quizApi } from '../lib/api';
import type { Question, AnswerSubmit, QuizResult, QuizStartResponse } from '../types';

type Phase = 'loading' | 'quiz' | 'result';

const OPTIONS = ['A', 'B', 'C', 'D'] as const;
const OPTION_KEYS = ['option_a', 'option_b', 'option_c', 'option_d'] as const;

export default function QuizEngine() {
  const { chapterId: chapterIdStr } = useParams<{ chapterId: string }>();
  const chapterId = chapterIdStr ? parseInt(chapterIdStr) : null;
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<QuizStartResponse | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<number, AnswerSubmit>>(new Map());
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(900);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSolutions, setShowSolutions] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Start session ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!chapterId) { navigate('/dashboard'); return; }
    quizApi.start(chapterId).then(res => {
      const data: QuizStartResponse = res.data;
      setSession(data);
      setTimeLeft(data.time_limit_seconds);
      setPhase('quiz');
    }).catch(() => navigate('/dashboard'));
  }, [chapterId, navigate]);

  // ── Countdown timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'quiz') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Answer / flag ──────────────────────────────────────────────────────
  const selectAnswer = (questionId: number, idx: number) => {
    setAnswers(prev => new Map(prev).set(questionId, {
      question_id: questionId, selected_index: idx, is_flagged: flagged.has(questionId),
    }));
  };

  const toggleFlag = useCallback((questionId: number) => {
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!session || submitting) return;
    clearInterval(timerRef.current!);
    setSubmitting(true);
    try {
      const answerList = session.questions.map(q => ({
        question_id: q.id,
        selected_index: answers.get(q.id)?.selected_index ?? null,
        is_flagged: flagged.has(q.id),
      }));
      const res = await quizApi.submit(session.session_id, answerList);
      setResult(res.data);
      setPhase('result');
    } finally { setSubmitting(false); }
  }, [session, answers, flagged, submitting]);

  // ── Keyboard shortcut ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'quiz' || !session) return;
    const handler = (e: KeyboardEvent) => {
      const q = session.questions[currentIdx];
      if (['1','2','3','4'].includes(e.key)) selectAnswer(q.id, parseInt(e.key) - 1);
      if (e.key === 'f' || e.key === 'F') toggleFlag(q.id);
      if (e.key === 'ArrowRight' && currentIdx < session.questions.length - 1) setCurrentIdx(i => i + 1);
      if (e.key === 'ArrowLeft' && currentIdx > 0) setCurrentIdx(i => i - 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, session, currentIdx, toggleFlag]);

  // ──────────────────────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div className="min-h-screen hero-bg flex items-center justify-center">
      <div className="text-center animate-pulse">
        <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading quiz…</p>
      </div>
    </div>
  );

  // ── Result Screen ──────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const bd = result.score_breakdown;
    const pieData = [
      { name: 'Correct', value: bd.correct, color: '#10b981' },
      { name: 'Wrong', value: bd.wrong, color: '#ef4444' },
      { name: 'Skipped', value: bd.unanswered, color: '#6b7280' },
    ].filter(d => d.value > 0);

    return (
      <div className="min-h-screen hero-bg p-6 animate-fade-in overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {!showSolutions ? (
            <>
              <div className="glass p-8 text-center mb-6">
                <div className="text-6xl mb-3">{bd.percentage >= 60 ? '🎉' : bd.percentage >= 40 ? '📊' : '💪'}</div>
                <h1 className="text-3xl font-bold gradient-text mb-1">Assessment Complete</h1>
                <p className="text-slate-400">Chapter Mock Test Results</p>
                <div className="mt-6 text-6xl font-black text-white">{bd.percentage.toFixed(1)}%</div>
                <div className="mt-2 text-slate-400">Total Marks: <span className="text-brand-400 font-semibold">{bd.raw_score.toFixed(2)}</span> / {bd.total_marks}</div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="glass p-6">
                  <h2 className="text-lg font-semibold mb-4 text-white">Score Breakdown</h2>
                  <div className="space-y-3">
                    {[
                      { label: 'Correct Answers', value: bd.correct, color: 'text-green-400', bg: 'rgba(16,185,129,0.05)' },
                      { label: 'Wrong (Negative Marking)', value: bd.wrong, color: 'text-red-400', bg: 'rgba(239,68,68,0.05)' },
                      { label: 'Unanswered Questions', value: bd.unanswered, color: 'text-gray-400', bg: 'rgba(107,114,128,0.05)' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/5" style={{ background: row.bg }}>
                        <span className="text-slate-300 text-sm">{row.label}</span>
                        <span className={`font-bold ${row.color}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass p-6 flex flex-col items-center justify-center text-center">
                  <h2 className="text-lg font-semibold mb-4 text-white self-start">Accuracy</h2>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={4} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => setShowSolutions(true)} className="btn-brand flex-1 py-4 text-lg font-bold">
                  🔍 Review Detailed Solutions
                </button>
                <button onClick={() => navigate('/dashboard')} className="btn-ghost flex-1 py-4 text-lg font-bold">
                   🏠 Back to Dashboard
                </button>
              </div>
            </>
          ) : (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-8 sticky top-0 py-4 bg-surface-900/80 backdrop-blur-md z-10 border-b border-white/5">
                <button onClick={() => setShowSolutions(false)} className="text-brand-400 font-bold hover:underline flex items-center gap-2">
                  ← Back to Summary
                </button>
                <h2 className="text-2xl font-black text-white">Solution Review</h2>
                <button onClick={() => navigate('/dashboard')} className="btn-ghost px-4 py-1 text-xs">Exit</button>
              </div>

              <div className="space-y-6 pb-12">
                {result.questions_with_answers?.map((q, i) => {
                  const studentAnswerIdx = answers.get(q.id)?.selected_index;
                  const isCorrect = studentAnswerIdx === q.correct_index;
                  
                  return (
                    <div key={q.id} className={`glass p-6 overflow-hidden border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                      <div className="flex items-start gap-4 mb-4">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-800 flex items-center justify-center text-sm font-bold text-slate-400">
                          {i + 1}
                        </span>
                        <p className="text-white text-lg font-medium">{q.question_text}</p>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 mb-6 ml-12">
                        {OPTION_KEYS.map((key, optIdx) => {
                          const isOptionCorrect = optIdx === q.correct_index;
                          const isOptionSelected = optIdx === studentAnswerIdx;
                          
                          let borderClass = 'border-white/5';
                          let bgClass = 'bg-surface-800/50';
                          if (isOptionCorrect) { borderClass = 'border-green-500/50'; bgClass = 'bg-green-500/10 text-green-400'; }
                          if (isOptionSelected && !isCorrect) { borderClass = 'border-red-500/50'; bgClass = 'bg-red-500/10 text-red-400'; }

                          return (
                            <div key={optIdx} className={`p-4 rounded-xl border ${borderClass} ${bgClass} flex items-center gap-3 text-sm`}>
                              <span className="font-bold opacity-50">{OPTIONS[optIdx]}</span>
                              {(q as any)[key]}
                              {isOptionCorrect && <span className="ml-auto text-green-400">✓</span>}
                              {isOptionSelected && !isCorrect && <span className="ml-auto text-red-100 font-bold">Your Choice</span>}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="ml-12 p-5 rounded-2xl bg-brand-500/5 border border-brand-500/10">
                          <div className="flex items-center gap-2 text-brand-400 mb-2">
                             <span className="text-xl">💡</span>
                             <span className="font-bold text-xs uppercase tracking-widest text-white">Logic Explained</span>
                          </div>
                          <p className="text-slate-300 text-sm leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Quiz Screen ────────────────────────────────────────────────────────
  if (!session) return null;
  const q = session.questions[currentIdx];
  const selectedIdx = answers.get(q.id)?.selected_index;
  const isFlagged = flagged.has(q.id);
  const answered = answers.size;
  const isWarning = timeLeft < 120;

  return (
    <div className="min-h-screen hero-bg flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Left: Question Panel ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Question {currentIdx + 1} / {session.questions.length}</div>
          <div className={`font-mono text-2xl font-black px-6 py-2 rounded-2xl ${isWarning ? 'timer-warning' : 'text-white bg-surface-800'} border border-white/5`}>
            ⏱ {formatTime(timeLeft)}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs font-bold text-white bg-green-500/20 px-3 py-1 rounded-full">{answered} Answered</div>
          </div>
        </div>

        <div className="w-full bg-surface-800 rounded-full h-1.5 mb-8">
          <div className="bg-brand-500 h-full transition-all duration-300" style={{ width: `${((currentIdx + 1) / session.questions.length) * 100}%` }} />
        </div>

        <div className="glass p-8 mb-6 flex-1 flex flex-col justify-center border-none shadow-2xl">
          <div className="flex items-start justify-between gap-6 mb-10">
            <h2 className="text-2xl font-bold text-white leading-tight">{q.question_text}</h2>
            <button onClick={() => toggleFlag(q.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all ${isFlagged ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-surface-700 text-slate-400 hover:text-white'}`}>
              {isFlagged ? '🚩 FLAGGED' : '⚑ FLAG'}
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {OPTION_KEYS.map((key, idx) => (
              <button key={idx} 
                onClick={() => selectAnswer(q.id, idx)}
                className={`flex items-center p-5 rounded-2xl border-2 transition-all text-left font-medium ${selectedIdx === idx ? 'border-brand-500 bg-brand-500/10 text-white' : 'border-white/5 bg-surface-800/50 text-slate-300 hover:border-white/20'}`}>
                <span className="w-10 h-10 rounded-xl bg-surface-900 flex items-center justify-center mr-4 text-xs font-black text-brand-400">
                  {OPTIONS[idx]}
                </span>
                {(q as any)[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto py-4">
          <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0} className="px-8 py-3 rounded-xl font-bold text-slate-400 hover:text-white transition-all disabled:opacity-0">
            ← Previous
          </button>
          
          <div className="hidden sm:flex gap-1">
             {session.questions.map((_, i) => (
               <div key={i} onClick={() => setCurrentIdx(i)} className={`w-2 h-2 rounded-full cursor-pointer transition-all ${i === currentIdx ? 'bg-brand-500 w-6' : answers.has(session.questions[i].id) ? 'bg-green-500/40' : 'bg-surface-700'}`} />
             ))}
          </div>

          {currentIdx < session.questions.length - 1
            ? <button onClick={() => setCurrentIdx(i => i + 1)} className="btn-brand px-12 py-3">Next Step →</button>
            : <button onClick={handleSubmit} disabled={submitting} className="btn-brand bg-green-500 shadow-xl shadow-green-500/20 px-12 py-3 font-black">
                {submitting ? 'VALIDATING...' : 'SUBMIT TEST'}
              </button>
          }
        </div>
      </div>
    </div>
  );
}
