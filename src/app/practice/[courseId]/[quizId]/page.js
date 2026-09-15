import { adminDb } from "@/utils/firebase-admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import SEOPreviewInteractive from "@/components/SEOPreviewInteractive";

export async function generateStaticParams() {
  try {
    // QUOTA BYPASS: Temporarily returning minimal paths
    return [
      { courseId: "unassigned", quizId: "preview" }
    ];
  } catch (err) {
    console.error("Static generation fetch failed:", err);
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { courseId, quizId } = await params;
  
  const qzSnap = await adminDb.collection("quizzes").doc(quizId).get();
  if (!qzSnap.exists) return { title: "Set Not Found | MyMockSewa" };
  
  const quiz = qzSnap.data();
  const crsSnap = await adminDb.collection("courses").doc(courseId).get();
  const course = crsSnap.exists ? crsSnap.data() : { title: "Exam Preparation" };

  return {
    title: `${quiz.title} Mock Test - Practice for ${course.title} | MyMockSewa`,
    description: `Practice ${quiz.title} for ${course.title}. Professional mock exam preview with real NEA/PSC questions. Join 5,000+ candidates today.`,
  };
}

export default async function SecureQuizPreviewPage({ params }) {
  const { courseId, quizId } = await params;

  // 🛡️ Data Fetching (Server-Side)
  const qzSnap = await adminDb.collection("quizzes").doc(quizId).get();
  if (!qzSnap.exists) notFound();
  const quiz = qzSnap.data();
  
  const qSnap = await adminDb.collection("questions")
    .where("quizId", "==", quizId)
    .limit(3)
    .get();

  // 🛡️ SECURITY: Explicitly strip sensitive data before it reaches the client
  const previewQuestions = qSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      questionText: data.questionText,
      options: data.options || [],
      // EXPLICITLY OMIT: correctOptionIndex, explanationText, rationale
    };
  });

  const crsSnap = await adminDb.collection("courses").doc(courseId).get();
  const course = crsSnap.exists ? crsSnap.data() : null;

  // 🛡️ Phase 3: Masked JSON-LD (No correct answers revealed to crawlers/scrapers)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    "name": quiz.title,
    "hasPart": previewQuestions.map((q, index) => ({
      "@type": "Question",
      "name": `Question ${index + 1}`,
      "eduQuestionType": "Multiple choice",
      "text": q.questionText,
      "suggestedAnswer": q.options.map((opt, optIndex) => ({
        "@type": "Answer",
        "position": optIndex,
        "text": opt
        // EXPLICITLY OMIT: isCorrect
      }))
      // EXPLICITLY OMIT: acceptedAnswer
    })),
    "educationalAudience": {
      "@type": "EducationalAudience",
      "educationalRole": "student",
      "audienceType": "Nepalese Civil Service & Engineering Aspirants"
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
          <Logo />
          <Link 
            href={`/login?redirect=/practice/${courseId}/${quizId}`}
            className="px-6 py-2.5 bg-[#1E3A8A] text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg"
          >
            Aspirant Login
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <span>{course?.title || "Curriculum"}</span>
          <span>/</span>
          <span className="text-slate-900">{quiz.title}</span>
        </div>

        <header className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#1E3A8A] leading-tight">
            {quiz.title} <span className="text-[#C41E24]">Mock Test</span>
          </h1>
          <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span className="px-4 py-2 bg-white border border-slate-200 rounded-full flex items-center gap-2">📊 {quiz.questionCount || 50} Qs</span>
            <span className="px-4 py-2 bg-white border border-slate-200 rounded-full flex items-center gap-2">⏱️ {quiz.durationMinutes || 45} Mins</span>
            <span className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center gap-2">✓ Verified Official Syllabus</span>
          </div>
        </header>

        {/* 🛡️ Secure Interactive Questions */}
        <section className="space-y-10">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">
              Curriculum Discovery (3 Preview Questions)
            </h2>
          </div>

          <SEOPreviewInteractive 
            questions={previewQuestions} 
            totalQuestions={quiz.questionCount || 50}
            courseId={courseId}
            quizId={quizId}
          />
        </section>

        {/* Strategic SEO Content */}
        <section className="pt-20 border-t border-slate-200 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-black text-[#1E3A8A]">Scientifically Modeled Exams</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Our mock tests for {course?.title} are modeled after real PSC and NEA examination patterns. 
                We use an AI-driven Excellence Radar to track your proficiency across different subjects.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-black text-[#1E3A8A]">National Leaderboard</h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Compete with thousands of aspirants across Nepal. See where you stand in real-time 
                compared to the competition.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12 text-center space-y-4">
        <Logo compact={true} />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
          Empowering the next generation of Nepali professionals.
        </p>
      </footer>
    </div>
  );
}
