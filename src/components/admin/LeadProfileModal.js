'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { auth } from '../../utils/firebase';

/**
 * LeadProfileModal — Full "Performance Fingerprint" for a single student.
 * Shows attempt history, topic mastery bar chart, weak areas, session info.
 */
export default function LeadProfileModal({ uid, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/leads?uid=${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error('[LeadProfileModal] Error:', e);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const formatDuration = (mins) => {
    if (!mins || mins === 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatTime = (iso) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getWaLink = (profile) => {
    if (!profile?.phone) return null;
    const cc = (profile.countryCode || '+977').replace('+', '');
    const phone = profile.phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Namaste ${profile.displayName || 'Student'}! आफ्नो myMockSewa परीक्षा तयारी कस्तो छ? 📚`);
    return `https://wa.me/${cc}${phone}?text=${msg}`;
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            {loading ? (
              <div className="modal-avatar-skeleton" />
            ) : (
              <div className="modal-avatar">
                {data?.profile?.photoURL
                  ? <img src={data.profile.photoURL} alt="" className="modal-avatar-img" />
                  : <span>{(data?.profile?.displayName || 'U').charAt(0).toUpperCase()}</span>
                }
              </div>
            )}
            <div>
              <h2 className="modal-user-name">{data?.profile?.displayName || 'Unknown Student'}</h2>
              <p className="modal-user-email">{data?.profile?.email || uid}</p>
              {data?.profile?.isOnline && (
                <span className="modal-online-badge">● Online Now</span>
              )}
            </div>
          </div>
          <div className="modal-header-right">
            {data?.profile?.phone && (
              <a
                href={getWaLink(data.profile)}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-wa-btn"
              >
                📱 WhatsApp
                <span className="modal-wa-num">{data.profile.countryCode} {data.profile.phone}</span>
              </a>
            )}
            <button onClick={onClose} className="modal-close-btn">✕</button>
          </div>
        </div>

        {/* Stats bar */}
        {!loading && data && (
          <div className="modal-stats-bar">
            {[
              { label: 'Total Attempts', value: data.stats.totalAttempts, color: '#3b82f6' },
              { label: 'Avg Score', value: data.stats.avgScore ? `${data.stats.avgScore}%` : 'N/A', color: '#10b981' },
              { label: 'Weak Topics', value: data.stats.weakTopicCount, color: '#f59e0b' },
              { label: 'Session Time', value: formatDuration(data.profile.total_session_mins), color: '#8b5cf6' },
              { label: 'Last Seen', value: formatTime(data.profile.last_active_at), color: '#64748b' },
            ].map(stat => (
              <div key={stat.label} className="modal-stat">
                <span className="modal-stat-value" style={{ color: stat.color }}>{stat.value}</span>
                <span className="modal-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="modal-tabs">
          {['overview', 'attempts', 'topics', 'weak-areas'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`modal-tab ${activeTab === tab ? 'active' : ''}`}
            >
              {tab === 'overview' && '📊'} {tab === 'attempts' && '📝'} {tab === 'topics' && '🎯'} {tab === 'weak-areas' && '⚠️'}
              {tab.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="modal-content">
          {loading && (
            <div className="modal-loading">
              <div className="modal-spinner" />
              <p>Loading Performance Data...</p>
            </div>
          )}

          {!loading && data && activeTab === 'overview' && (
            <div className="tab-overview">
              <div className="overview-grid">
                <div className="overview-card">
                  <h4>Enrolled Courses</h4>
                  {data.enrolledCourses.length === 0
                    ? <p className="empty-state">No course enrollment yet</p>
                    : data.enrolledCourses.map(c => (
                        <div key={c.courseId} className="enrolled-course-row">
                          <span>📚</span>
                          <span>{c.courseTitle || c.courseId}</span>
                          <span className="enrolled-date">{formatTime(c.grantedAt)}</span>
                        </div>
                      ))
                  }
                </div>
                <div className="overview-card">
                  <h4>Recent Activity</h4>
                  {data.attempts.slice(0, 5).map(a => (
                    <div key={a.id} className="attempt-mini-row">
                      <div>
                        <p className="attempt-mini-title">{a.quizTitle || a.quizId}</p>
                        <p className="attempt-mini-meta">{formatTime(a.timestamp)}</p>
                      </div>
                      <div className={`attempt-score-badge ${a.accuracy >= 60 ? 'good' : 'poor'}`}>
                        {a.accuracy}%
                      </div>
                    </div>
                  ))}
                  {data.attempts.length === 0 && <p className="empty-state">No attempts yet</p>}
                </div>
              </div>
            </div>
          )}

          {!loading && data && activeTab === 'attempts' && (
            <div className="tab-attempts">
              {data.attempts.length === 0 && <p className="empty-state-center">No quiz attempts recorded yet.</p>}
              {data.attempts.map((a, idx) => (
                <div key={a.id || idx} className="attempt-row">
                  <div className="attempt-num">#{data.attempts.length - idx}</div>
                  <div className="attempt-info">
                    <p className="attempt-title">{a.quizTitle || 'Quiz Set'}</p>
                    <p className="attempt-course">{a.courseTitle || ''}</p>
                    <p className="attempt-time">{formatTime(a.timestamp)}</p>
                  </div>
                  <div className="attempt-metrics">
                    <div className={`attempt-score ${a.accuracy >= 60 ? 'good' : a.accuracy >= 40 ? 'avg' : 'poor'}`}>
                      {a.accuracy}%
                    </div>
                    <div className="attempt-detail">{a.correctCount}/{a.totalQ} correct</div>
                    {a.timeTaken > 0 && <div className="attempt-detail">{Math.round(a.timeTaken / 60)}m taken</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && data && activeTab === 'topics' && (
            <div className="tab-topics">
              <p className="tab-subtitle">Topic-wise performance across all attempted sets</p>
              {data.topicMastery.length === 0 && <p className="empty-state-center">No topic data yet — student needs to attempt sets first.</p>}
              {data.topicMastery.map((t, i) => (
                <div key={t.topic || i} className="topic-row">
                  <div className="topic-name">{t.topic || 'General'}</div>
                  <div className="topic-bar-track">
                    <div
                      className={`topic-bar-fill ${t.accuracy >= 70 ? 'strong' : t.accuracy >= 40 ? 'average' : 'weak'}`}
                      style={{ width: `${Math.max(2, t.accuracy)}%` }}
                    />
                  </div>
                  <div className={`topic-accuracy ${t.accuracy >= 70 ? 'strong' : t.accuracy >= 40 ? 'average' : 'weak'}`}>
                    {t.accuracy}%
                  </div>
                  <div className="topic-attempts">{t.timesAttempted}x</div>
                </div>
              ))}
            </div>
          )}

          {!loading && data && activeTab === 'weak-areas' && (
            <div className="tab-weak">
              {data.weakAreas.length === 0 ? (
                <div className="weak-empty">
                  <div className="weak-empty-icon">🎉</div>
                  <p>No weak areas detected — student is performing above 40% in all topics!</p>
                </div>
              ) : (
                <>
                  <div className="weak-header">
                    <span className="weak-count">{data.weakAreas.length} Weak Topics</span>
                    <span className="weak-desc">Below 40% accuracy — needs focused study</span>
                  </div>
                  {data.weakAreas.map((t, i) => (
                    <div key={t.topic || i} className="weak-topic-card">
                      <div className="weak-topic-alert">⚠️</div>
                      <div className="weak-topic-body">
                        <p className="weak-topic-name">{t.topic || 'General Topic'}</p>
                        <p className="weak-topic-stats">{t.timesAttempted} attempts · {t.accuracy}% accuracy</p>
                      </div>
                      <div className="weak-topic-score">{t.accuracy}%</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0 0 0 0;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-panel {
          background: #f8fafc;
          width: 100%;
          max-width: 860px;
          max-height: 92vh;
          border-radius: 2rem 2rem 0 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 -25px 60px rgba(0,0,0,0.4);
        }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.75rem 2rem 1.25rem;
          background: #1e3a8a;
          color: white;
        }
        .modal-header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .modal-avatar {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 900;
          color: white;
          flex-shrink: 0;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.3);
        }
        .modal-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .modal-avatar-skeleton {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .modal-user-name { font-size: 1.25rem; font-weight: 900; margin: 0 0 0.2rem; }
        .modal-user-email { font-size: 0.7rem; color: rgba(255,255,255,0.6); margin: 0; }
        .modal-online-badge {
          display: inline-block;
          margin-top: 0.3rem;
          font-size: 0.6rem;
          font-weight: 900;
          color: #10b981;
          background: rgba(16, 185, 129, 0.15);
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }
        .modal-header-right { display: flex; align-items: flex-start; gap: 0.75rem; }
        .modal-wa-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.6rem 1rem;
          background: #10b981;
          color: white;
          border-radius: 0.75rem;
          font-size: 0.7rem;
          font-weight: 900;
          text-decoration: none;
          transition: background 0.2s;
        }
        .modal-wa-btn:hover { background: #059669; }
        .modal-wa-num { font-size: 0.55rem; font-weight: 600; opacity: 0.8; }
        .modal-close-btn {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s;
        }
        .modal-close-btn:hover { background: rgba(255,255,255,0.2); }
        .modal-stats-bar {
          display: flex;
          gap: 0;
          background: #1e293b;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          overflow-x: auto;
        }
        .modal-stat {
          flex: 1;
          min-width: 5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.75rem 0.5rem;
          border-right: 1px solid rgba(255,255,255,0.05);
        }
        .modal-stat:last-child { border-right: none; }
        .modal-stat-value { font-size: 1rem; font-weight: 900; }
        .modal-stat-label { font-size: 0.55rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.1rem; text-align: center; }
        .modal-tabs {
          display: flex;
          gap: 0;
          background: white;
          border-bottom: 2px solid #f1f5f9;
          overflow-x: auto;
        }
        .modal-tab {
          padding: 0.75rem 1.25rem;
          font-size: 0.7rem;
          font-weight: 700;
          color: #94a3b8;
          border: none;
          background: transparent;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .modal-tab.active { color: #1e3a8a; border-bottom-color: #1e3a8a; }
        .modal-tab:hover:not(.active) { color: #475569; }
        .modal-content { flex: 1; overflow-y: auto; padding: 1.5rem 2rem; background: #f8fafc; }
        .modal-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: #94a3b8;
          gap: 1rem;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .modal-spinner {
          width: 2rem;
          height: 2rem;
          border: 3px solid #e2e8f0;
          border-top-color: #1e3a8a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .overview-card {
          background: white;
          border-radius: 1rem;
          padding: 1.25rem;
          border: 1px solid #e2e8f0;
        }
        .overview-card h4 { font-size: 0.7rem; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 0.75rem; }
        .enrolled-course-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; font-size: 0.75rem; font-weight: 600; color: #334155; border-bottom: 1px solid #f1f5f9; }
        .enrolled-date { font-size: 0.6rem; color: #94a3b8; margin-left: auto; }
        .attempt-mini-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
        .attempt-mini-title { font-size: 0.72rem; font-weight: 700; color: #334155; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
        .attempt-mini-meta { font-size: 0.6rem; color: #94a3b8; margin: 0; }
        .attempt-score-badge { padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.65rem; font-weight: 900; }
        .attempt-score-badge.good { background: #dcfce7; color: #15803d; }
        .attempt-score-badge.poor { background: #fee2e2; color: #dc2626; }
        .empty-state { font-size: 0.72rem; color: #94a3b8; font-style: italic; padding: 0.5rem 0; }
        .empty-state-center { text-align: center; font-size: 0.8rem; color: #94a3b8; padding: 3rem; font-style: italic; }
        .attempt-row { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: white; border-radius: 1rem; margin-bottom: 0.5rem; border: 1px solid #f1f5f9; }
        .attempt-num { font-size: 0.65rem; font-weight: 900; color: #cbd5e1; min-width: 2rem; }
        .attempt-info { flex: 1; }
        .attempt-title { font-size: 0.8rem; font-weight: 700; color: #1e293b; margin: 0 0 0.2rem; }
        .attempt-course { font-size: 0.65rem; color: #64748b; margin: 0 0 0.2rem; }
        .attempt-time { font-size: 0.6rem; color: #94a3b8; margin: 0; }
        .attempt-metrics { text-align: right; }
        .attempt-score { font-size: 1.1rem; font-weight: 900; }
        .attempt-score.good { color: #10b981; }
        .attempt-score.avg { color: #f59e0b; }
        .attempt-score.poor { color: #ef4444; }
        .attempt-detail { font-size: 0.6rem; color: #94a3b8; font-weight: 600; }
        .tab-subtitle { font-size: 0.7rem; color: #94a3b8; margin-bottom: 1rem; font-weight: 600; }
        .topic-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem; }
        .topic-name { font-size: 0.72rem; font-weight: 700; color: #334155; min-width: 130px; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .topic-bar-track { flex: 1; height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
        .topic-bar-fill { height: 100%; border-radius: 999px; transition: width 0.5s ease; }
        .topic-bar-fill.strong { background: #10b981; }
        .topic-bar-fill.average { background: #f59e0b; }
        .topic-bar-fill.weak { background: #ef4444; }
        .topic-accuracy { font-size: 0.7rem; font-weight: 900; min-width: 3rem; text-align: right; }
        .topic-accuracy.strong { color: #10b981; }
        .topic-accuracy.average { color: #f59e0b; }
        .topic-accuracy.weak { color: #ef4444; }
        .topic-attempts { font-size: 0.6rem; color: #94a3b8; font-weight: 700; min-width: 2rem; text-align: right; }
        .weak-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding: 0.75rem 1rem; background: #fef3c7; border: 1px solid #fde68a; border-radius: 0.75rem; }
        .weak-count { font-size: 0.8rem; font-weight: 900; color: #92400e; }
        .weak-desc { font-size: 0.65rem; color: #78350f; font-weight: 600; }
        .weak-topic-card { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: white; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; border-radius: 0.75rem; margin-bottom: 0.5rem; }
        .weak-topic-alert { font-size: 1.2rem; }
        .weak-topic-body { flex: 1; }
        .weak-topic-name { font-size: 0.8rem; font-weight: 800; color: #1e293b; margin: 0 0 0.2rem; }
        .weak-topic-stats { font-size: 0.65rem; color: #94a3b8; margin: 0; font-weight: 600; }
        .weak-topic-score { font-size: 1.25rem; font-weight: 900; color: #ef4444; }
        .weak-empty { text-align: center; padding: 3rem; }
        .weak-empty-icon { font-size: 3rem; margin-bottom: 1rem; }
        .weak-empty p { font-size: 0.85rem; color: #64748b; font-weight: 600; }
        @media (max-width: 640px) {
          .overview-grid { grid-template-columns: 1fr; }
          .modal-panel { max-height: 95vh; }
          .modal-header { padding: 1.25rem; }
          .modal-wa-btn .modal-wa-num { display: none; }
        }
      `}</style>
    </div>
  );
}
