'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/utils/firebase';
import Logo from '@/components/Logo';
import BrandName from '@/components/BrandName';
import { 
  CheckCircle2, XCircle, ArrowRight, ArrowLeft, 
  HelpCircle, Sparkles, BookOpen, RefreshCw, Award, AlertCircle
} from 'lucide-react';
import FormattedQuestionText from '@/components/FormattedQuestionText';

export default function ChapterPracticePage() {
  const { courseId, chapterId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  // Quiz progress state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  useEffect(() => {
    async function loadPractice() {
      setLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`/api/courses/${courseId}/practice?chapterId=${chapterId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success) {
          setChapter(data.chapter);
          setQuestions(data.questions);
        }
      } catch (err) {
        console.error('Failed to load chapter practice:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPractice();
  }, [courseId, chapterId]);

  const handleSelectOption = (optIdx) => {
    if (isAnswered) return; // Prevent changing after revealing answer

    setSelectedOption(optIdx);
    setIsAnswered(true);

    const currentQ = questions[currentIndex];
    const isCorrect = optIdx === currentQ.correctOptionIndex;

    setUserAnswers(prev => [
      ...prev,
      {
        questionId: currentQ.id,
        selectedOption: optIdx,
        isCorrect
      }
    ]);
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // Quiz complete: calculate score and evaluate threshold
      setQuizFinished(true);
      await submitChapterResult();
    }
  };

  const submitChapterResult = async () => {
    setSavingProgress(true);
    try {
      const correctCount = userAnswers.filter(a => a.isCorrect).length;
      const scorePercent = (correctCount / questions.length) * 100;
      const isPassed = scorePercent >= (chapter?.passingThreshold || 60);

      const token = await auth.currentUser?.getIdToken();
      if (token && isPassed) {
        await fetch(`/api/courses/${courseId}/progression`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            chapterId,
            readingSeconds: 120
          })
        });
      }
    } catch (e) {
      console.error('Failed to submit progression update:', e);
    } finally {
      setSavingProgress(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setUserAnswers([]);
    setQuizFinished(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-white text-xs font-bold tracking-widest uppercase">Preparing Practice Questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-xl font-black text-slate-900">No Questions Yet</h3>
          <p className="text-xs text-slate-500">
            Practice questions have not been added to this chapter yet. You can read the notes in the meantime.
          </p>
          <Link
            href={`/courses/${courseId}/learn`}
            className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider"
          >
            Back to Notes
          </Link>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const correctCount = userAnswers.filter(a => a.isCorrect).length;
  const scorePercent = Math.round((correctCount / questions.length) * 100);
  const isPassed = scorePercent >= (chapter?.passingThreshold || 60);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link 
            href={`/courses/${courseId}/learn`}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Chapter Notes
          </Link>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>Chapter Practice</span>
            <span>•</span>
            <span className="text-blue-600 font-black">
              Q {currentIndex + 1} of {questions.length}
            </span>
          </div>
        </div>
      </nav>

      {/* Main Practice Container */}
      <main className="max-w-3xl w-full mx-auto px-4 md:px-6 py-8 flex-1 flex flex-col justify-center">
        {!quizFinished ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-10 space-y-8">
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Question {currentIndex + 1}
              </div>
              <FormattedQuestionText text={currentQ.questionText} size="lg" />
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrectOption = idx === currentQ.correctOptionIndex;

                let btnStyle = "bg-white border-slate-200 hover:border-blue-400 hover:bg-slate-50/50";
                let badgeStyle = "bg-slate-100 text-slate-600";

                if (isAnswered) {
                  if (isCorrectOption) {
                    btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20";
                    badgeStyle = "bg-emerald-600 text-white";
                  } else if (isSelected) {
                    btnStyle = "bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20";
                    badgeStyle = "bg-rose-600 text-white";
                  } else {
                    btnStyle = "opacity-50 border-slate-200 bg-slate-50";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={isAnswered}
                    className={`w-full text-left p-4 md:p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer ${btnStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${badgeStyle}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-bold text-sm md:text-base leading-relaxed">
                        {option}
                      </span>
                    </div>

                    {isAnswered && isCorrectOption && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    {isAnswered && isSelected && !isCorrectOption && (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Instant Rationale & Explanation Banner (Revealed on Answer) */}
            {isAnswered && (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-600">
                    <Sparkles className="w-4 h-4" /> Concept Rationale
                  </div>
                  <Link
                    href={`/courses/${courseId}/learn`}
                    className="text-[11px] font-bold text-slate-500 hover:text-blue-600 underline flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Review in Note
                  </Link>
                </div>
                <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-medium">
                  {currentQ.explanationText}
                </p>
              </div>
            )}

            {/* Footer Next Question Button */}
            {isAnswered && (
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleNext}
                  className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'View Results'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Quiz Results & Mastery Card */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 md:p-12 text-center space-y-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-lg ${
              isPassed ? 'bg-emerald-100 text-emerald-600 shadow-emerald-500/20' : 'bg-rose-100 text-rose-600 shadow-rose-500/20'
            }`}>
              {isPassed ? <Award className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
            </div>

            <div className="space-y-2">
              <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {isPassed ? 'Chapter Mastered' : 'Threshold Not Met'}
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900">
                You Scored {scorePercent}%
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                {isPassed 
                  ? `Congratulations! You answered ${correctCount} of ${questions.length} correctly and met the ${chapter?.passingThreshold}% requirement. The next chapter has been unlocked.`
                  : `You needed at least ${chapter?.passingThreshold}% to unlock the next chapter. Review the chapter notes and try again.`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={handleRestart}
                className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Retake Practice
              </button>
              <Link
                href={`/courses/${courseId}/learn`}
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all"
              >
                <span>Back to Learning Path</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-slate-400 font-medium border-t border-slate-100 bg-white">
        MyMockSewa • Instant Feedback Learning Engine
      </footer>
    </div>
  );
}
