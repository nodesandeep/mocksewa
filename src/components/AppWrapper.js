'use client';
import { useState, useEffect } from 'react';
import MaintenancePage from './MaintenancePage';

export default function AppWrapper({ children }) {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/app-status');
        const data = await res.json();
        setIsMaintenance(data.maintenance);
      } catch (error) {
        console.error('Failed to check maintenance status:', error);
      } finally {
        setIsLoading(false);
      }
    }
    checkStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}
