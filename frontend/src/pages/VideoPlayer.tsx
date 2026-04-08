import React, { useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { useQuery } from '@tanstack/react-query';
import { videoApi, adminApi } from '../lib/api';
import type { Module, VideoProgressOut } from '../types';

const PROGRESS_UPDATE_INTERVAL = 5000; // ms
const COMPLETION_THRESHOLD = 90;

export default function VideoPlayer() {
  const location = useLocation();
  const navigate = useNavigate();
  const moduleId = (location.state as { moduleId?: number })?.moduleId;

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastSentRef = useRef<number>(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: moduleData } = useQuery({
    queryKey: ['module', moduleId], enabled: !!moduleId,
    queryFn: async () => {
      const res = await adminApi.modules.list();
      return (res.data as Module[]).find((m: Module) => m.id === moduleId) ?? null;
    },
  });

  const { data: progData, refetch: refetchProgress } = useQuery({
    queryKey: ['videoProgress', moduleId], enabled: !!moduleId,
    queryFn: () => videoApi.getProgress(moduleId!),
  });

  const module = moduleData ?? null;
  const progress: VideoProgressOut | null = progData?.data ?? null;

  // ── HLS setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!module?.content_url || !videoRef.current) return;
    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({ startLevel: -1 });
      hls.loadSource(module.content_url);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = module.content_url;
    }

    // Resume from last position
    if (progress?.last_position_seconds && video) {
      video.currentTime = progress.last_position_seconds;
    }

    return () => { hlsRef.current?.destroy(); };
  }, [module?.content_url]);

  // ── Progress tracking ─────────────────────────────────────────────────
  const sendProgress = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !moduleId) return;
    const pct = video.duration > 0 ? (video.currentTime / video.duration) * 100 : 0;
    const pos = Math.floor(video.currentTime);
    if (Math.abs(pct - lastSentRef.current) < 1) return; // skip tiny changes
    lastSentRef.current = pct;
    await videoApi.updateProgress(moduleId, pct, pos);
    refetchProgress();
  }, [moduleId, refetchProgress]);

  useEffect(() => {
    progressTimerRef.current = setInterval(sendProgress, PROGRESS_UPDATE_INTERVAL);
    return () => clearInterval(progressTimerRef.current!);
  }, [sendProgress]);

  if (!moduleId) { navigate('/dashboard'); return null; }

  const pct = progress?.watch_percent ?? 0;
  const isCompleted = progress?.is_completed ?? false;

  return (
    <div className="min-h-screen hero-bg p-6 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
          <button onClick={() => navigate('/dashboard')} className="hover:text-white transition-colors">Dashboard</button>
          <span>/</span>
          <span className="text-white">{module?.title ?? 'Loading…'}</span>
          {isCompleted && <span className="badge badge-success ml-2">✓ Completed</span>}
        </div>

        {/* Video */}
        <div className="glass overflow-hidden mb-6" style={{ borderRadius: 20 }}>
          <div className="relative bg-black" style={{ paddingTop: '56.25%' }}>
            {module?.content_url ? (
              <video ref={videoRef} controls className="absolute inset-0 w-full h-full" onEnded={sendProgress} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <div className="text-5xl mb-3">📺</div>
                  <p>No video URL configured for this module</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="glass p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Watch Progress</span>
            <span className={`text-sm font-bold ${pct >= COMPLETION_THRESHOLD ? 'text-green-400' : 'text-brand-400'}`}>{pct.toFixed(1)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= COMPLETION_THRESHOLD ? 'linear-gradient(90deg,#10b981,#34d399)' : undefined }} />
          </div>
          {!isCompleted && (
            <p className="text-xs text-slate-500 mt-2">Watch {COMPLETION_THRESHOLD}% to mark as complete. Currently at {pct.toFixed(1)}%.</p>
          )}
          {isCompleted && (
            <p className="text-xs text-green-400 mt-2">✅ Lesson complete — this module is checked off your learning path!</p>
          )}
        </div>

        {/* Module info */}
        {module && (
          <div className="glass p-5">
            <h1 className="text-xl font-bold text-white mb-1">{module.title}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="badge badge-brand capitalize">{module.module_type}</span>
              {module.duration_seconds && <span>⏱ {Math.round(module.duration_seconds / 60)} min</span>}
              <span>Module ID: {module.id}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
