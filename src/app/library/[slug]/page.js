import React from 'react';
import Link from 'next/link';

export async function generateStaticParams() {
  return [
    { slug: 'psc-nepal-guide' },
    { slug: 'nmc-license-2026' },
    { slug: 'engineering-license-nepal' },
  ];
}

export default async function LibraryPage({ params }) {
  const { slug } = await params;

  
  // Simulated Content mapping for the roadmap requirements
  const syllabusData = {
    'psc-nepal-guide': {
      title: 'PSC Civil Service Mastery Guide',
      subtitle: 'Complete Syllabus for Loksewa Kharidar, Na.Su, and Section Officer',
      content: 'The Public Service Commission (PSC) examination is the gateway to permanent civil service positions in Nepal. Our comprehensive guide covers General Knowledge (GK), Intelligence Quotients (IQ), and technical subjects.',
      sections: [
        { name: 'GK & Current Affairs', details: 'Geography of Nepal, History, Constitution, and International Relations.' },
        { name: 'Technical Depth', details: 'Focused MCQs for Engineering, Medical, and Administrative clusters.' },
        { name: 'Exam Strategy', details: 'How to handle negative marking and time management in CBT.' }
      ],
      color: 'blue'
    },
    'nmc-license-2026': {
      title: 'NMC License Excellence 2026',
      subtitle: 'Medical License Exam Preparation Framework',
      content: 'Prepare for the Nepal Medical Council (NMC) license exam with our high-yield question clusters and clinical 💡 hint bank.',
      sections: [
        { name: 'Basic Sciences', details: 'Anatomy, Physiology, Biochemistry, and Pathology.' },
        { name: 'Clinical Medicine', details: 'Medicine, Surgery, OBG, and Pediatrics.' },
        { name: 'Ethics & Jurisprudence', details: 'Medical laws and professional conduct in Nepal.' }
      ],
      color: 'rose'
    },
    'engineering-license-nepal': {
      title: 'NEC Engineering License Syllabus',
      subtitle: 'Nepal Engineering Council Standardized Guide',
      content: 'Critical syllabus overview for Civil, Electrical, and Computer Engineering license aspirants.',
      sections: [
        { name: 'Core Engineering', details: 'Structural analysis, Circuit theory, and Algorithms.' },
        { name: 'Professional Practice', details: 'Engineering ethics, project management, and contract laws.' },
        { name: 'Past Paper Analysis', details: 'Trend analysis of technical questions from the last 5 years.' }
      ],
      color: 'emerald'
    }
  };

  const data = syllabusData[slug] || {
    title: 'Syllabus & Career Library',
    subtitle: 'Exploring the future of careers in Nepal.',
    content: 'Our library is currently being updated with the latest syllabus from PSC, NEA, and NMC. Check back soon for deeper insights.',
    sections: [],
    color: 'slate'
  };

  return (
    <div className={`min-h-screen bg-slate-50 transition-colors duration-500`}>
      {/* Premium Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-900/40">🎓</div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter group-hover:text-blue-600 transition-colors">myMockSewa <span className="text-blue-400">Library</span></h1>
          </Link>
          <div className="flex items-center gap-4">
             <Link href="/login" className="px-6 py-3 bg-slate-900 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg">Start Practice</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-20 px-6 space-y-16">
        {/* Hero Section */}
        <header className="space-y-6 text-center">
           <div className={`inline-block px-4 py-1.5 bg-${data.color}-50 dark:bg-${data.color}-900/20 text-${data.color}-600 dark:text-${data.color}-400 text-[10px] font-black uppercase tracking-widest rounded-full`}>
             Syllabus Blueprint
           </div>
           <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
             {data.title}
           </h1>
           <p className="text-xl md:text-2xl font-bold text-slate-500 dark:text-slate-400 italic">
             "{data.subtitle}"
           </p>
        </header>

        {/* Content Section */}
        <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-10">
           <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
             {data.content}
           </p>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.sections.map((sec, idx) => (
                <div key={idx} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-3 group hover:shadow-xl transition-all">
                  <div className="text-2xl">⚡</div>
                  <h4 className="font-black text-slate-900 dark:text-white text-lg">{sec.name}</h4>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-500 italic">{sec.details}</p>
                </div>
              ))}
           </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-12 rounded-[3rem] text-center text-white space-y-8 shadow-2xl shadow-blue-500/30">
           <h3 className="text-3xl font-black tracking-tight italic">"The best way to predict the future is to create it."</h3>
           <p className="text-blue-100 font-bold max-w-xl mx-auto">Access 10,000+ PSC and Engineering questions specialized for this syllabus.</p>
           <Link href="/register" className="inline-block px-10 py-5 bg-white text-blue-600 font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs">
             Join myMockSewa Today
           </Link>
        </div>
      </main>

      <footer className="py-20 text-center space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">myMockSewa • 2026 Platform</p>
        <p className="text-[9px] text-slate-500 italic">"Engineering reliable careers since day one."</p>
      </footer>
    </div>
  );
}
