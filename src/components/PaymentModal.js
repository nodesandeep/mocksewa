"use client";
import React, { useState } from "react";

export default function PaymentModal({ isOpen, onClose, course }) {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const esewaId = "9865018024";

  // Strict price fallback to Rs. 500 if missing or undefined
  const rawPrice = course?.discountedPrice || course?.basePrice;
  const coursePrice = rawPrice && rawPrice > 0 ? rawPrice : 500;

  const whatsappUrl = `https://wa.me/9779865018024?text=${encodeURIComponent(
    `Namaste myMockSewa! I have just paid Rs. ${coursePrice} for the "${course?.title}" course. Please verify my screenshot.`,
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(esewaId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl relative animate-in zoom-in duration-300 border border-slate-200 dark:border-slate-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 transition-all z-10 font-bold"
        >
          ✕
        </button>

        {/* FOMO Badge */}
        <div className="bg-brand-crimson text-white py-2 px-4 text-center text-[10px] font-black uppercase tracking-[0.15em] animate-pulse">
          ⚡ LIMITED TIME OFFER: Enroll Now to Secure Today's Price!
        </div>

        <div className="p-8 space-y-6">
          <header className="text-center space-y-2">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
              Unlock {course?.title}
            </h3>
            <div className="text-3xl font-black text-brand-navy dark:text-blue-500 italic">
              Rs. {coursePrice.toLocaleString()}
            </div>
          </header>

          {/* QR Code Section */}
          <div className="flex flex-col items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
            <div className="bg-white p-4 rounded-3xl shadow-lg">
              <img
                src="https://i.ibb.co/mC4G6wYw/esewa-qr.png"
                alt="eSewa QR Code"
                className="w-48 h-48 object-contain"
              />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Scan & Pay via eSewa
              </p>
              <div
                onClick={handleCopy}
                className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-all group"
              >
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  ID: {esewaId}
                </span>
                <span className="text-sm group-hover:scale-110 transition-transform">
                  {copied ? "✅" : "📋"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-5 bg-[#25D366] text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:brightness-110 transition-all text-xs uppercase tracking-widest shadow-xl shadow-green-900/20"
            >
              <span className="text-lg">💬</span>
              <span>Send Payment Screenshot</span>
            </a>
            <button
              onClick={onClose}
              className="w-full py-4 text-slate-400 dark:text-slate-500 font-black hover:text-slate-600 transition-all text-[10px] uppercase tracking-widest"
            >
              Cancel Transaction
            </button>
          </div>
        </div>

        <div className="px-8 pb-8 text-center">
          <p className="text-[9px] text-slate-400 font-bold leading-relaxed px-4">
            Access is granted instantly after screenshot verification via our
            Admin Command Center.
          </p>
        </div>
      </div>
    </div>
  );
}
