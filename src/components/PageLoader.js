'use client';
import React from 'react';
import Logo from './Logo';

export default function PageLoader({ className = '' }) {
  return (
    <div className={`min-h-screen bg-white flex flex-col items-center justify-center p-6 ${className}`}>
      <div className="animate-pulse flex flex-col items-center justify-center pointer-events-none select-none">
        <Logo compact={false} noLink={true} className="scale-125 sm:scale-150" />
      </div>
    </div>
  );
}
