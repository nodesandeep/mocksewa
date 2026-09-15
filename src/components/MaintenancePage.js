'use client';
import { useState, useEffect } from 'react';

const MaintenancePage = ({ targetDate = "2026-05-10T09:00:00" }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const difference = +new Date(targetDate) - +new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white px-4">
      {/* Visual Indicator */}
      <div className="mb-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-[2rem] animate-pulse">
        <span className="text-5xl">🛠️</span>
      </div>

      <h1 className="text-4xl md:text-6xl font-black mb-4 text-center tracking-tighter italic uppercase">
        Upgrading the <span className="text-blue-500">Exam Vault</span>
      </h1>
      
      <p className="text-slate-400 text-lg mb-12 text-center max-w-xl font-medium">
        We are optimizing the 13,000+ question bank and improving mock test stability 
        for the upcoming <b className="text-white">NEA Level 5</b> exams. We'll be back online shortly!
      </p>

      {/* Countdown Timer */}
      <div className="grid grid-cols-4 gap-4 md:gap-8 mb-12">
        {Object.entries(timeLeft).map(([label, value]) => (
          <div key={label} className="flex flex-col items-center">
            <div className="text-3xl md:text-5xl font-black bg-slate-800 p-6 rounded-[1.5rem] w-20 md:w-32 flex justify-center border border-slate-700 shadow-2xl">
              {value.toString().padStart(2, '0')}
            </div>
            <span className="text-[10px] uppercase tracking-[0.3em] mt-4 text-slate-500 font-black">
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="px-6 py-3 bg-slate-800/50 rounded-full border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
        System Status: API Bridge Online (v3.0)
      </div>
    </div>
  );
};

export default MaintenancePage;
