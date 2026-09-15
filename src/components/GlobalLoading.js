"use client";
import { motion } from "framer-motion";
import BrandName from "./BrandName";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-slate-950">
      <div className="relative flex flex-col items-center">
        {/* Pulsing Logo Container */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [1, 0.8, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="flex items-center justify-center w-24 h-24 bg-brand-navy rounded-3xl shadow-2xl ring-4 ring-brand-navy/10 mb-8"
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M24 4L4 16L24 28L44 16L24 4Z" fill="white" />
            <path
              d="M8 20V32L24 44L40 32V20L24 32L8 20Z"
              fill="white"
              opacity="0.7"
            />
          </svg>
        </motion.div>

        {/* Text and Message */}
        <div className="text-center space-y-3">
          <BrandName className="text-3xl font-black" />
          <div className="flex flex-col items-center gap-2">
            <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">
              Securing your session...
            </p>
            {/* Dynamic Loading Bar */}
            <div className="w-32 h-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-full h-full bg-blue-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Blur Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}
