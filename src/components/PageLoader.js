'use client';
import React from 'react';
import Logo from './Logo';

export default function PageLoader({ className = '' }) {
  return (
    <div
      className={`fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6 ${className}`}
      role="status"
      aria-label="Loading myMOCKsewa"
    >
      <div className="flex flex-col items-center justify-center space-y-4 animate-pulse pointer-events-none select-none">
        <div className="scale-125 sm:scale-150 transform transition-transform duration-300">
          <Logo compact={false} noLink={true} />
        </div>
      </div>
    </div>
  );
}
