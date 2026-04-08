import React, { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leaderboardApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { LeaderboardEntry } from '../types';

const WS_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + '/leaderboard/ws';

const RANK_BADGES: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function Leaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  // ── WebSocket live feed ────────────────────────────────────────────────
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setWsStatus('live');
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'leaderboard_update') setEntries(msg.data);
        } catch {}
      };
      ws.onclose = () => {
        setWsStatus('offline');
        setTimeout(connect, 3000); // auto-reconnect
      };
      ws.onerror = () => { ws.close(); };
    };
    connect();
    return () => { wsRef.current?.close(); };
  }, []);

  // ── REST fallback (initial load) ──────────────────────────────────────
  const { data: restData } = useQuery({
    queryKey: ['leaderboard'], queryFn: () => leaderboardApi.top(),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (entries.length === 0 && restData?.data) setEntries(restData.data);
  }, [restData, entries.length]);

  const myRank = entries.find(e => e.user_id === user?.id)?.rank;

  return (
    <div className="min-h-screen hero-bg p-6 animate-fade-in">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold gradient-text">🏆 Leaderboard</h1>
            <p className="text-slate-400 text-sm mt-1">Nepal's top exam performers — updated in real-time</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: wsStatus === 'live' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                       color: wsStatus === 'live' ? '#10b981' : '#9ca3af', border: `1px solid ${wsStatus === 'live' ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}` }}>
              <div className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'live' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              {wsStatus === 'live' ? 'Live' : wsStatus === 'connecting' ? 'Connecting…' : 'Offline'}
            </div>
            <button onClick={() => navigate('/dashboard')} className="btn-ghost text-sm">← Dashboard</button>
          </div>
        </div>

        {/* My rank banner */}
        {myRank && (
          <div className="glass p-4 mb-6 flex items-center gap-4" style={{ background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)' }}>
            <div className="text-3xl">{RANK_BADGES[myRank] || `#${myRank}`}</div>
            <div>
              <p className="text-white font-semibold">Your rank: <span className="gradient-text">#{myRank}</span></p>
              <p className="text-slate-400 text-sm">Keep practicing to climb higher!</p>
            </div>
          </div>
        )}

        {/* Top 3 podium */}
        {entries.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-8">
            {[entries[1], entries[0], entries[2]].map((e, podiumIdx) => {
              const heights = ['h-28', 'h-36', 'h-24'];
              const bgColors = ['bg-slate-600', 'bg-yellow-500', 'bg-amber-700'];
              return (
                <div key={e.user_id} className="flex flex-col items-center">
                  <div className="text-2xl mb-1">{RANK_BADGES[e.rank]}</div>
                  <div className="text-sm font-semibold text-white mb-2 max-w-[80px] text-center truncate">{e.full_name}</div>
                  <div className="text-xs text-slate-400 mb-2">{e.score.toFixed(1)} pts</div>
                  <div className={`w-20 ${heights[podiumIdx]} ${bgColors[podiumIdx]} rounded-t-xl flex items-start justify-center pt-2`}>
                    <span className="text-white font-bold text-lg">#{e.rank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full Table */}
        <div className="glass overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold text-white">Full Rankings</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {entries.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-slate-500">No quiz data yet — be the first to score!</p>
              </div>
            ) : (
              entries.map((entry) => {
                const isMe = entry.user_id === user?.id;
                return (
                  <div key={entry.user_id}
                    className={`flex items-center gap-4 px-5 py-4 transition-all ${isMe ? 'bg-brand-500/10' : 'hover:bg-surface-700'}`}
                    style={{ background: isMe ? 'rgba(99,102,241,0.08)' : '' }}>
                    {/* Rank */}
                    <div className="w-10 text-center">
                      {RANK_BADGES[entry.rank] ? (
                        <span className="text-xl">{RANK_BADGES[entry.rank]}</span>
                      ) : (
                        <span className="text-slate-400 font-mono font-semibold">#{entry.rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: isMe ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'var(--surface-2)' }}>
                      {entry.full_name[0].toUpperCase()}
                    </div>

                    {/* Name */}
                    <div className="flex-1">
                      <div className={`font-medium ${isMe ? 'text-brand-400' : 'text-white'}`}>
                        {entry.full_name} {isMe && <span className="badge badge-brand text-xs ml-1">You</span>}
                      </div>
                      <div className="text-xs text-slate-500">{entry.quiz_count} quiz{entry.quiz_count !== 1 ? 'zes' : ''} taken</div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <div className={`text-lg font-bold ${entry.rank === 1 ? 'text-yellow-400' : entry.rank <= 3 ? 'text-brand-400' : 'text-white'}`}>
                        {entry.score.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">total pts</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
