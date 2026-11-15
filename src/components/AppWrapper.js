'use client';
import { useState, useEffect } from 'react';
import MaintenancePage from './MaintenancePage';
import PageLoader from './PageLoader';

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
    return <PageLoader />;
  }

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}
