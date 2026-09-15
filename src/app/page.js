'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { reviews } from '@/data/reviews';

export default function LandingPage() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const mockRadarData = [
    { subject: 'Power Systems', A: 85 },
    { subject: 'Machines', A: 40 },
    { subject: 'Electronics', A: 90 },
    { subject: 'Math', A: 25 },
    { subject: 'GK', A: 60 }
  ];

  const popularExams = [
    { id: 'nea', title: 'NEA Preparation', icon: '⚡', category: 'Energy' },
    { id: 'nec', title: 'NEC License', icon: '🏗️', category: 'Engineering' },
    { id: 'nmc', title: 'NMC License', icon: '⚕️', category: 'Medical' },
    { id: 'psc', title: 'Loksewa (PSC)', icon: '🏛️', category: 'Government' },
    { id: 'tsc', title: 'TSC Prep', icon: '🏫', category: 'Teaching' },
    { id: 'banking', title: 'Bank Exams', icon: '💰', category: 'Banking' },
    { id: 'civil', title: 'Civil Eng', icon: '📐', category: 'Engineering' },
    { id: 'computer', title: 'Computer Op', icon: '💻', category: 'Technical' },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How to prepare for Loksewa exams in Nepal?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Preparing for Loksewa (PSC) requires a disciplined approach, consistent practice of past MCQs, and real-time mock tests like those provided by MyMockSewa."
        }
      },
      {
        "@type": "Question",
        "name": "What is the syllabus for NEA level 5 electrical mock tests?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The NEA level 5 syllabus covers core engineering subjects including Power Systems, Electrical Machines, and national energy regulations. MyMockSewa offers complete preparation modules for these."
        }
      },
      {
        "@type": "Question",
        "name": "How to pass the NEC engineering license exam in Nepal?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Passing the NEC civil or electrical license exam requires precision and accuracy. Regular mock tests with expert hints, as available on MyMockSewa, will help you master the required concepts."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-600/10 transition-colors duration-300">
      
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
      {/* 🚀 FLOATING WHATSAPP BUTTON */}
      <motion.a 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        href="https://wa.me/9779865018024?text=Namaste! I am interested in MyMockSewa exam preparation."
        target="_blank"
        className="fixed bottom-8 right-8 z-[70] w-16 h-16 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-[0_20px_50px_rgba(37,211,102,0.3)] group overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current relative z-10">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.588-5.946 0-6.556 5.332-11.891 11.891-11.891 3.181 0 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.402 0 6.556-5.332 11.891-11.891 11.891-2.01 0-3.991-.51-5.747-1.474l-6.049 1.595zm11.834-21.391c-5.268 0-9.557 4.288-9.557 9.557 0 1.919.573 3.711 1.564 5.211l.103.157-1.04 3.8-3.885-1.02.152.09c1.441.855 3.1 1.304 4.889 1.304 5.267 0 9.557-4.287 9.557-9.557 0-2.545-1-4.937-2.816-6.756-1.817-1.817-4.21-2.816-6.787-2.816zm5.251 7.182c-.288-.144-1.702-.84-1.965-.936-.264-.096-.456-.144-.648.144-.192.288-.744.936-.912 1.128-.168.192-.336.216-.624.072-.288-.144-1.215-.448-2.315-1.43-.856-.764-1.433-1.708-1.601-1.992-.168-.288-.018-.444.126-.587.13-.13.288-.336.432-.504.144-.168.192-.288.288-.48.096-.192.048-.36-.024-.504-.072-.144-.648-1.56-.888-2.136-.234-.564-.468-.487-.648-.497l-.552-.01c-.192 0-.504.072-.768.36-.264.288-1.008.984-1.008 2.399 0 1.416 1.032 2.784 1.176 2.976.144.192 2.031 3.102 4.921 4.353.687.297 1.224.474 1.642.607.69.219 1.319.19 1.815.115.553-.083 1.702-.696 1.944-1.368.242-.672.242-1.248.168-1.368-.072-.12-.264-.192-.552-.336z"/>
        </svg>
      </motion.a>

      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white py-3 shadow-md border-b border-slate-100' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Logo />

          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <Link href="#exams" className="hover:text-blue-600 transition-colors">Exams</Link>
            <Link href="#pass" className="hover:text-blue-600 transition-colors">Mastery Pass</Link>
            <Link href="#analytics" className="hover:text-blue-600 transition-colors">Analytics</Link>
            <Link href="#download" className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors">
              <span className="text-base">📱</span> Get App
            </Link>
            <Link href="#contact" className="hover:text-blue-600 transition-colors">Support</Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
               <Link href="/student" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-sm">
                 Dashboard
               </Link>
            ) : (
               <>
                 <Link href="/login" className="hidden sm:block text-sm font-bold text-slate-600 hover:text-blue-600">Login</Link>
                 <Link href="/login" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all text-sm">
                   Join for Free
                 </Link>
               </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* 🚀 TESTBOOK STYLE HERO */}
        <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-gradient-to-b from-blue-50/50 to-white">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 text-center lg:text-left">
              <motion.div 
                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                 className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-blue-100 text-blue-600 rounded-full text-xs font-bold shadow-sm"
              >
                🏆 Nepal's #1 Exam Preparation App
              </motion.div>
              
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
                 Crack Your Dream Exam with <br/> <span className="text-blue-600">Nepal's Best Mock Tests.</span>
              </h1>
              
              <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                 Trusted by 10,000+ aspirants for NEA, PSC, NEC, and NMC. Get real-time rankings and detailed 💡 hints.
              </p>

              {/* SEARCH BAR */}
              <div className="relative max-w-lg mx-auto lg:mx-0">
                <input 
                  type="text" 
                  placeholder="Search for your exam (e.g. NEA Level 5)"
                  className="w-full h-16 pl-14 pr-32 bg-white border-2 border-slate-100 rounded-2xl shadow-xl shadow-blue-900/5 focus:border-blue-600 outline-none font-medium transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
                <button className="absolute right-3 top-1/2 -translate-y-1/2 h-10 px-6 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all">
                  Search
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
                 <span>Popular:</span>
                 <span className="text-slate-600 cursor-pointer hover:text-blue-600">NEA Level 5</span>
                 <span className="text-slate-600 cursor-pointer hover:text-blue-600">NEC License</span>
                 <span className="text-slate-600 cursor-pointer hover:text-blue-600">PSC Admin</span>
              </div>
            </div>

            <div className="hidden lg:block relative">
               <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 relative z-10">
                  <div className="flex items-center justify-between mb-8">
                     <h4 className="font-black text-xl text-slate-900 italic">Live Excellence Radar</h4>
                     <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase">Live Analytics</span>
                  </div>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={mockRadarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="You" dataKey="A" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.6} dot />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -z-10 animate-pulse"></div>
               <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -z-10 animate-pulse"></div>
            </div>
          </div>
        </header>

        {/* 📊 STATS STRIP */}
        <section className="bg-blue-600 py-10 text-white">
           <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { val: "10k+", label: "Total Users" },
                { val: "500+", label: "Mock Tests" },
                { val: "95%", label: "Selection Rate" },
                { val: "24/7", label: "Expert Support" }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-3xl font-black tracking-tight">{stat.val}</p>
                  <p className="text-xs font-bold text-blue-100 uppercase tracking-widest mt-1 opacity-70">{stat.label}</p>
                </div>
              ))}
           </div>
        </section>

        {/* 📱 APP DOWNLOAD BANNER */}
        <section id="download" className="py-20 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 overflow-hidden relative">
          {/* Animated background blobs */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay:'1s'}} />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Text */}
              <div className="space-y-8 text-white text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur border border-white/20 rounded-full text-xs font-black uppercase tracking-widest">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  Now Available as Android App
                </div>
                <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
                  Take Your Exams <br />
                  <span className="text-blue-200">Anywhere, Anytime.</span>
                </h2>
                <p className="text-blue-100 font-medium text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                  Install the myMockSewa app directly on your Android phone. No Play Store needed — one tap download, full native experience.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  {/* Primary download button */}
                  <a
                    href="/mymocksewa.apk"
                    download
                    id="download-apk-btn"
                    className="group flex items-center gap-4 px-8 py-5 bg-white text-blue-700 rounded-2xl font-black shadow-2xl shadow-blue-900/30 hover:scale-105 transition-all duration-200 text-sm"
                  >
                    <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center group-hover:bg-blue-600/20 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 mb-0.5">Download Free APK</p>
                      <p className="text-base font-black text-slate-900">Android App</p>
                    </div>
                  </a>

                  {/* Web app shortcut */}
                  <a
                    href="/student"
                    className="flex items-center gap-4 px-8 py-5 bg-white/10 backdrop-blur border border-white/30 text-white rounded-2xl font-black hover:bg-white/20 transition-all duration-200 text-sm"
                  >
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-200 mb-0.5">Use in Browser</p>
                      <p className="text-base font-black">Web Version</p>
                    </div>
                  </a>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-start text-[10px] font-black uppercase tracking-widest text-blue-200">
                  <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> 100% Free Download</span>
                  <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> No Registration Needed</span>
                  <span className="flex items-center gap-1.5"><span className="text-emerald-400">✓</span> Android 8.0+</span>
                </div>
              </div>

              {/* Right: Install Steps */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[2.5rem] p-8 lg:p-10 space-y-6">
                <h3 className="text-white font-black text-lg uppercase tracking-widest text-center">How to Install</h3>
                <div className="space-y-4">
                  {[
                    { step: '01', icon: '⬇️', title: 'Download APK', desc: 'Tap the Download button above to get the myMockSewa.apk file.' },
                    { step: '02', icon: '⚙️', title: 'Allow Unknown Sources', desc: 'Go to Settings → Security → Enable "Install unknown apps" for your browser.' },
                    { step: '03', icon: '📦', title: 'Open & Install', desc: 'Open the downloaded APK file and tap Install.' },
                    { step: '04', icon: '🚀', title: 'Launch & Learn', desc: 'Open myMockSewa from your home screen and start practicing!' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-500/30 border border-blue-300/30 rounded-2xl flex items-center justify-center text-xs font-black text-white shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-white font-black text-sm">{item.title}</p>
                        <p className="text-blue-200 text-xs font-medium mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-white/10 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-300">
                    Built with TWA · Powered by mymocksewa.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 🏛️ POPULAR EXAMS GRID */}
        <section id="exams" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Popular Exams</h2>
                <p className="text-slate-500 font-medium max-w-xl">Comprehensive test series designed by subject matter experts to help you ace your exams.</p>
              </div>
              <Link href="/login" className="text-blue-600 font-bold hover:underline mb-2">View All 50+ Exams →</Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
               {popularExams.map((exam) => (
                 <Link 
                   href="/login" 
                   key={exam.id}
                   className="group p-8 bg-slate-50 border border-slate-100 rounded-3xl text-center hover:bg-white hover:shadow-xl hover:border-blue-600/20 transition-all duration-300"
                 >
                   <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{exam.icon}</div>
                   <h4 className="font-black text-sm text-slate-900 mb-1">{exam.title}</h4>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{exam.category}</p>
                 </Link>
               ))}
            </div>
          </div>
        </section>

        {/* 💡 SMART LEARNING STUDIO HIGHLIGHT */}
        <section className="py-24 bg-white overflow-hidden border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="relative">
                <div className="aspect-square bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] shadow-2xl overflow-hidden p-8 flex flex-col justify-center text-white">
                  <div className="space-y-6">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">💡</div>
                    <h3 className="text-3xl font-black italic">The Smart Learning Studio</h3>
                    <p className="text-blue-100 font-medium text-lg leading-relaxed">
                      Every question is a lesson. Our proprietary Rationale Engine breaks down complex concepts into logical segments: 
                      <span className="block mt-4 text-white font-black">Core Concepts • Option Analysis • Logic & Reasoning • Mastery Notes</span>
                    </p>
                    <div className="pt-6">
                       <span className="px-6 py-3 bg-white text-blue-600 rounded-xl font-black text-xs uppercase tracking-widest">Experience Mastery</span>
                    </div>
                  </div>
                </div>
                {/* Decorative blobs */}
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl -z-10"></div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl -z-10"></div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                    Don't Just Practice. <br/> <span className="text-blue-600">Master Every Concept.</span>
                  </h2>
                  <p className="text-slate-500 font-medium text-lg">
                    Most platforms just give you the answer. MyMockSewa gives you the logic. Our Smart Rationale system is designed to mimic a personal tutor for every MCQ.
                  </p>
                </div>

                <div className="space-y-6">
                  {[
                    { t: "Structured Explanations", d: "Segmented breakdowns that help you understand the 'Why' before the 'What'." },
                    { t: "National Peer Analytics", d: "See how you compare against thousands of aspirants across Nepal in real-time." },
                    { t: "Error Identification", d: "AI-driven insights that pinpoint exactly where your logic failed." }
                  ].map((f, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-1">✓</div>
                      <div>
                        <h4 className="font-black text-slate-900">{f.t}</h4>
                        <p className="text-slate-500 text-sm font-medium">{f.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 🎓 NEXT-GEN LMS INNOVATION SHOWCASE */}
        <section className="py-24 bg-gradient-to-b from-white via-blue-50/40 to-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-black uppercase tracking-wider">
                ⚡ Beyond Standard Mock Tests
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                An End-to-End Learning System <br />
                <span className="text-blue-600">Built for Exam Success.</span>
              </h2>
              <p className="text-slate-600 text-base md:text-lg font-medium">
                Traditional mock exams only test what you already know. MyMockSewa guides you from fundamental theory to licensed mastery with sequential progression.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Feature 1 */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 flex flex-col justify-between group hover:-translate-y-2 hover:border-blue-300 transition-all duration-300">
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    🗺️
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Sequential Roadmaps
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Duolingo-style visual learning paths. Read syllabus notes, take instant chapter quizzes, and pass with 60%+ to unlock next stages.
                  </p>
                </div>
                <div className="pt-6 border-t border-slate-100 flex items-center text-xs font-black uppercase tracking-wider text-emerald-600">
                  Read → Test → Unlock
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 flex flex-col justify-between group hover:-translate-y-2 hover:border-blue-300 transition-all duration-300">
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    🧠
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Smart Mistakes Drill
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Automated spaced repetition notebook. Focus your precious study hours exclusively on the tricky questions you previously missed.
                  </p>
                </div>
                <div className="pt-6 border-t border-slate-100 flex items-center text-xs font-black uppercase tracking-wider text-rose-600">
                  Spaced Repetition
                </div>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 flex flex-col justify-between group hover:-translate-y-2 hover:border-blue-300 transition-all duration-300">
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    📑
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    In-Note Highlighting
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Select text, legal acts, or equations in chapter notes and bookmark them straight into your personal Revision Cheat-Sheet with one tap.
                  </p>
                </div>
                <div className="pt-6 border-t border-slate-100 flex items-center text-xs font-black uppercase tracking-wider text-sky-600">
                  Personal Cheat-Sheet
                </div>
              </div>

              {/* Feature 4 */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-blue-900/5 flex flex-col justify-between group hover:-translate-y-2 hover:border-blue-300 transition-all duration-300">
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    📐
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Math & Nepali Notes
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Full KaTeX mathematical LaTeX rendering, engineering circuit diagrams, and seamless Nepali Unicode formatting for civil & Loksewa laws.
                  </p>
                </div>
                <div className="pt-6 border-t border-slate-100 flex items-center text-xs font-black uppercase tracking-wider text-purple-600">
                  Math / LaTeX / Unicode
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 💳 MYMOCKSEWA PASS (PRICING) */}
        <section id="pass" className="py-24 bg-slate-50 relative overflow-hidden">
           <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-5 gap-12 items-center relative z-10">
              <div className="lg:col-span-3 space-y-8">
                 <h2 className="text-5xl font-black text-slate-900 tracking-tight leading-none">
                    One Pass for <br/> <span className="text-blue-600">All Your Mock Tests.</span>
                 </h2>
                 <p className="text-lg text-slate-600 font-medium leading-relaxed">
                    Unlock unlimited access to every exam track on MyMockSewa with our Premium Mastery Pass. Join the elite top 1% candidates with expert 💡 hints and analytics.
                 </p>
                 <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      'Unlimited Mock Sessions',
                      'Deep AI Performance Insights',
                      'Strategic Mistake Bank',
                      'National Peer Ranking',
                      'Verified Expert 💡 Hints',
                      '24/7 Priority Support'
                    ].map((feat, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">✓</span>
                        {feat}
                      </div>
                    ))}
                 </div>
              </div>

              <div className="lg:col-span-2">
                 <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-blue-100 relative overflow-hidden text-center space-y-8">
                    <div className="absolute top-0 right-0 px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-3xl">Most Popular</div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-black text-slate-900 italic">Premium Mastery</h3>
                       <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Full Platform Access</p>
                    </div>
                    <div className="flex items-baseline justify-center gap-2">
                       <span className="text-5xl font-black text-slate-900">Rs. 999</span>
                       <span className="text-slate-400 font-bold">/ Course</span>
                    </div>
                    <Link href="/login" className="block w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:scale-[1.02] transition-all">
                       Buy Now
                    </Link>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">100% Satisfaction Guaranteed</p>
                 </div>
              </div>
           </div>
           {/* Decorative elements */}
           <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-200/20 rounded-full blur-[100px]"></div>
           <div className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-200/20 rounded-full blur-[100px]"></div>
        </section>

        {/* 🔄 SLIDING TESTIMONIALS */}
        <section className="py-24 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 text-center space-y-4 mb-16">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Candidate Success Stories</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Real results from real aspirants across Nepal</p>
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex overflow-hidden relative">
              <motion.div 
                animate={{ x: [0, -5000] }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="flex gap-6 whitespace-nowrap"
              >
                {[...reviews, ...reviews].map((rev, i) => (
                  <div key={i} className="inline-block w-[350px] bg-slate-50 p-8 rounded-3xl border border-slate-100 italic shrink-0">
                    <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-normal line-clamp-3">"{rev.text}"</p>
                    <div className="flex items-center gap-4 mt-6 not-italic">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-black">{rev.name.charAt(0)}</div>
                      <div>
                        <p className="font-black text-slate-900 text-xs">{rev.name}</p>
                        <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">{rev.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* 🔍 SEO KNOWLEDGE CONTENT */}
        <section className="py-24 bg-white border-t border-slate-100">
            <div className="max-w-5xl mx-auto px-6 space-y-16">
               <div className="text-center space-y-6">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Why MyMockSewa is Essential for Your Success</h2>
                  <div className="w-20 h-1.5 bg-blue-600 mx-auto rounded-full"></div>
               </div>
               
               <div className="grid md:grid-cols-2 gap-12 text-slate-600 text-sm font-medium leading-relaxed">
                  <div className="space-y-6">
                    <h3 className="text-xl font-black text-slate-900 italic underline decoration-blue-600/10 decoration-8 underline-offset-4">PSC (Loksewa) Preparation Nepal</h3>
                    <p>Preparing for the <strong>Public Service Commission (PSC)</strong> or Loksewa exams in Nepal requires a disciplined approach. Our <em>Loksewa Mock Test</em> series mirrors the official patterns for Admin, Technical, and Education services. We provide high-yield MCQs for General Knowledge (GK) and IQ sections that are critical for passing the first phase of Kharidar, Nayab Subba, and Section Officer exams.</p>
                    <h3 className="text-xl font-black text-slate-900 italic underline decoration-blue-600/10 decoration-8 underline-offset-4">NEA Mock Test & Result Analysis</h3>
                    <p>The <strong>Nepal Electricity Authority (NEA)</strong> exams for Level 3, 4, 5, and 7 demand specialized technical knowledge. Our NEA-specific modules focus on Power Systems, Electrical Machines, and Nepal's energy regulations, ensuring you are ready for the CBT and written examinations.</p>
                    <h3 className="text-xl font-black text-slate-900 italic underline decoration-blue-600/10 decoration-8 underline-offset-4">TSC Preparation & Teaching License</h3>
                    <p>Get ready for the <strong>Teachers Service Commission (TSC)</strong> exams with our specialized teaching modules. We cover the full syllabus for Primary, Lower Secondary, and Secondary levels, including pedagogy and general education requirements.</p>
                  </div>
                  <div className="space-y-6">
                    <h3 className="text-xl font-black text-slate-900 italic underline decoration-blue-600/10 decoration-8 underline-offset-4">NEC & NMC Licensing Excellence</h3>
                    <p>Whether you are an engineer appearing for the <strong>Nepal Engineering Council (NEC)</strong> license or a doctor prepping for the <strong>Nepal Medical Council (NMC)</strong> examination, accuracy is everything. Our platform uses a proprietary <em>Excellence Radar</em> to map your clinical and technical proficiency nodes.</p>
                    <h3 className="text-xl font-black text-slate-900 italic underline decoration-blue-600/10 decoration-8 underline-offset-4">Computer Operator & IT Exams</h3>
                    <p>Master the <strong>Computer Operator</strong> and Assistant Computer Operator exams for government services. Our practice sets include deep dives into Windows, Office, Databases, and Hardware concepts specifically tailored for Nepali PSC standards.</p>
                    <h3 className="text-xl font-black text-slate-900 italic underline decoration-blue-600/10 decoration-8 underline-offset-4">Scientific 💡 Hint System</h3>
                    <p>Don't just memorize—understand. Every question in our bank comes with a detailed 💡 hint segment verified by subject matter experts. This ensures that you learn the 'Why' behind every correct answer, mimicking the pedagogical approach of top global test prep sites like Testbook. Our new <strong>Smart Learning Studio</strong> takes this further with structured rationales.</p>
                  </div>
               </div>

               <div className="p-12 bg-slate-50 rounded-[3rem] border border-slate-100 text-center space-y-6">
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight">Ready to Secure Your Selection?</h4>
                  <p className="text-slate-500 font-medium max-w-xl mx-auto">Join thousands of successful candidates today. Create your free account and start your journey to success.</p>
                  <Link href="/login" className="inline-block px-12 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:scale-105 transition-all">
                    Get Started for Free
                  </Link>
               </div>
            </div>
        </section>

      </main>

      {/* Footer */}
      <footer id="contact" className="bg-slate-950 pt-24 pb-12 text-white">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-20 border-b border-slate-900 pb-20 relative z-10">
          <div className="space-y-8">
             <Logo light={true} className="scale-125 origin-left" />
             <p className="text-slate-500 text-xs leading-relaxed text-left font-medium">
                Nepal's premier examination simulation ecosystem. Engineering, Medical, and Civil Service specializations. Engineered for Success.
             </p>
          </div>
          <div>
            <h4 className="font-black text-[9px] uppercase tracking-[0.3em] mb-8 text-slate-600">Company</h4>
            <ul className="space-y-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.1em]">
              <li><Link href="#" className="hover:text-blue-400 transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Refund Policy</Link></li>
              <li><Link href="#" className="hover:text-blue-400 transition-colors">Terms of Use</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-[9px] uppercase tracking-[0.3em] mb-8 text-slate-600">Popular Tracks</h4>
            <ul className="space-y-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.1em]">
              <li><Link href="/login" className="hover:text-blue-400 transition-colors">NEA Level 5 Electrical</Link></li>
              <li><Link href="/login" className="hover:text-blue-400 transition-colors">NEC Civil License</Link></li>
              <li><Link href="/login" className="hover:text-blue-400 transition-colors">NMC Medical License</Link></li>
              <li><Link href="/login" className="hover:text-blue-400 transition-colors">Loksewa General Admin</Link></li>
            </ul>
          </div>
          <div className="p-8 bg-blue-600/5 border border-blue-600/20 rounded-[2.5rem] space-y-4">
            <h4 className="font-black text-[9px] uppercase tracking-[0.3em] text-blue-400">Support Hub</h4>
            <ul className="space-y-4 text-slate-200 text-xs font-bold leading-none">
              <li>Kathmandu, Nepal</li>
              <li>mymocksewa@gmail.com</li>
              <li className="text-blue-400 mt-2 font-black text-sm tracking-tight">+977-9865018024</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-800 text-[9px] font-black tracking-[0.5em] uppercase">
           <p>&copy; {new Date().getFullYear()} MYMOCKSEWA. ALL RIGHTS RESERVED.</p>
           <div className="flex gap-6">
             <Link href="#" className="hover:text-slate-400 transition-colors">Facebook</Link>
             <Link href="#" className="hover:text-slate-400 transition-colors">Twitter</Link>
             <Link href="#" className="hover:text-slate-400 transition-colors">Instagram</Link>
           </div>
        </div>
      </footer>
    </div>
  );
}
