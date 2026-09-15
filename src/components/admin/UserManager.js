'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from '../../utils/firebase';
import { useAuth } from '@/context/AuthContext';
import LeadProfileModal from './LeadProfileModal';

/**
 * LeadManager (v3) — Full student CRM with:
 * - Multi-filter: Online/Offline, Course, Search (debounced)
 * - Server-side pagination (handles 10k+ users without lag)
 * - Click-to-drill-down: Performance Fingerprint modal
 * - WhatsApp quick-action
 */
export default function UserManager() {
  const { user: authUser } = useAuth();

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTimer = useRef(null);

  // Data state
  const [leads, setLeads] = useState([]);
  const [courses, setCourses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [selectedUid, setSelectedUid] = useState(null);

  // Load course list for filter dropdown
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/admin/content?type=courses', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setCourses(await res.json());
      } catch (e) { console.error(e); }
    };
    if (authUser) loadCourses();
  }, [authUser]);

  // Debounce search input
  const handleSearchInput = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  // Load leads with current filters
  const loadLeads = useCallback(async (page = 1) => {
    if (!authUser) return;
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const params = new URLSearchParams({ page });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (courseFilter) params.set('courseId', courseFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/leads?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setPagination({ page: data.pagination.page, total: data.pagination.total, totalPages: data.pagination.totalPages });
      }
    } catch (e) { console.error('[LeadManager] Load error:', e); }
    finally { setLoading(false); }
  }, [authUser, statusFilter, courseFilter, search]);

  useEffect(() => { loadLeads(1); }, [loadLeads]);

  const formatTime = (iso) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    const diffMin = (Date.now() - d) / 60000;
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${Math.round(diffMin)}m ago`;
    if (diffMin < 1440) return `${Math.round(diffMin / 60)}h ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const getWaLink = (lead) => {
    if (!lead?.phone) return null;
    const cc = (lead.countryCode || '+977').replace('+', '');
    const phone = lead.phone.replace(/\D/g, '');
    return `https://wa.me/${cc}${phone}`;
  };

  const handleGrantAccess = async (uid, courseId) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch('/api/admin/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: uid, courseId, action: 'grant' }),
      });
      loadLeads(pagination.page);
    } catch (e) { alert('Grant failed: ' + e.message); }
  };

  return (
    <div className="lm-root">
      {/* Header */}
      <div className="lm-header">
        <div>
          <h2 className="lm-title">Student Fleet</h2>
          <p className="lm-subtitle">Managing {pagination.total.toLocaleString()} registered students</p>
        </div>
        <button onClick={() => loadLeads(pagination.page)} className="lm-refresh-btn">
          ↻ Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="lm-filters">
        {/* Status filter */}
        <div className="lm-filter-group">
          {[
            { key: 'all', label: '👥 All' },
            { key: 'online', label: '🟢 Online' },
            { key: 'offline', label: '⚫ Offline' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`lm-filter-btn ${statusFilter === f.key ? 'active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Course filter */}
        <select
          value={courseFilter}
          onChange={e => setCourseFilter(e.target.value)}
          className="lm-select"
        >
          <option value="">All Courses</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        {/* Search */}
        <div className="lm-search-wrapper">
          <span className="lm-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search name or email..."
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
            className="lm-search"
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); setSearch(''); }} className="lm-search-clear">✕</button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="lm-loading">
          <div className="lm-spinner" />
          <span>Loading student data...</span>
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <>
          <div className="lm-grid">
            {leads.length === 0 && (
              <div className="lm-empty">
                <p>No students match your filters.</p>
              </div>
            )}
            {leads.map(lead => {
              const waLink = getWaLink(lead);
              return (
                <div
                  key={lead.userId}
                  className={`lm-card ${lead.isOnline ? 'online' : ''}`}
                  onClick={() => setSelectedUid(lead.userId)}
                >
                  {/* Online indicator */}
                  <div className="lm-card-top">
                    <div className="lm-avatar">
                      {lead.photoURL
                        ? <img src={lead.photoURL} alt="" className="lm-avatar-img" />
                        : <span>{(lead.displayName || lead.email || 'U').charAt(0).toUpperCase()}</span>
                      }
                      {lead.isOnline && <div className="lm-online-dot" />}
                    </div>
                    <div className="lm-card-info">
                      <h4 className="lm-card-name">{lead.displayName || 'Unnamed Student'}</h4>
                      {lead.fbDisplayName && lead.fbDisplayName !== lead.displayName && (
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest -mt-1">
                          Original: {lead.fbDisplayName}
                        </p>
                      )}
                      <p className="lm-card-email">{lead.email || `#${lead.userId?.slice(-6)}`}</p>
                      {lead.phone && (
                        <p className="lm-card-phone">
                          {lead.countryCode || '+977'} {lead.phone}
                        </p>
                      )}
                    </div>
                    <div className={`lm-status-pill ${lead.isOnline ? 'online' : 'offline'}`}>
                      {lead.isOnline ? '🟢 Online' : '⚫ Offline'}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="lm-card-stats">
                    <div className="lm-stat">
                      <span className="lm-stat-val">{lead.totalAttempts}</span>
                      <span className="lm-stat-lbl">Attempts</span>
                    </div>
                    <div className="lm-stat">
                      <span className="lm-stat-val">{lead.avgScore != null ? `${lead.avgScore}%` : '—'}</span>
                      <span className="lm-stat-lbl">Avg Score</span>
                    </div>
                    <div className="lm-stat">
                      <span className="lm-stat-val">{(lead.enrolledCourseIds || []).length}</span>
                      <span className="lm-stat-lbl">Courses</span>
                    </div>
                    <div className="lm-stat">
                      <span className="lm-stat-val">{formatTime(lead.last_active_at)}</span>
                      <span className="lm-stat-lbl">Last Seen</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="lm-card-actions" onClick={e => e.stopPropagation()}>
                    {waLink ? (
                      <a href={waLink} target="_blank" rel="noopener noreferrer" className="lm-btn-wa">
                        💬 WhatsApp
                      </a>
                    ) : (
                      <span className="lm-no-phone">No phone</span>
                    )}
                    <button
                      onClick={() => setSelectedUid(lead.userId)}
                      className="lm-btn-profile"
                    >
                      View Profile →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="lm-pagination">
              <button
                onClick={() => loadLeads(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="lm-page-btn"
              >
                ← Prev
              </button>
              <span className="lm-page-info">
                Page {pagination.page} of {pagination.totalPages}
                <span className="lm-page-total"> ({pagination.total.toLocaleString()} total)</span>
              </span>
              <button
                onClick={() => loadLeads(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="lm-page-btn"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Performance Fingerprint Modal */}
      {selectedUid && (
        <LeadProfileModal
          uid={selectedUid}
          onClose={() => setSelectedUid(null)}
        />
      )}

      <style jsx>{`
        .lm-root { padding: 1.5rem; max-width: 100%; }
        .lm-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; }
        .lm-title { font-size: 2rem; font-weight: 900; color: #0f172a; letter-spacing: -0.04em; margin: 0; }
        .lm-subtitle { font-size: 0.65rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 0; }
        .lm-refresh-btn { padding: 0.6rem 1.25rem; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.7rem; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s; }
        .lm-refresh-btn:hover { background: #e2e8f0; color: #334155; }
        .lm-filters { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.5rem; align-items: center; }
        .lm-filter-group { display: flex; background: #f1f5f9; border-radius: 0.75rem; padding: 0.2rem; gap: 0.1rem; }
        .lm-filter-btn { padding: 0.45rem 0.85rem; border: none; background: transparent; font-size: 0.65rem; font-weight: 700; color: #64748b; cursor: pointer; border-radius: 0.6rem; transition: all 0.2s; white-space: nowrap; }
        .lm-filter-btn.active { background: white; color: #1e3a8a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .lm-select { padding: 0.55rem 1rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.7rem; font-weight: 700; color: #334155; background: white; cursor: pointer; outline: none; }
        .lm-select:focus { border-color: #1e3a8a; box-shadow: 0 0 0 2px rgba(30,58,138,0.1); }
        .lm-search-wrapper { position: relative; flex: 1; min-width: 200px; }
        .lm-search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); font-size: 0.8rem; }
        .lm-search { width: 100%; padding: 0.55rem 2.5rem 0.55rem 2.25rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.7rem; font-weight: 600; color: #334155; background: white; outline: none; box-sizing: border-box; }
        .lm-search:focus { border-color: #1e3a8a; box-shadow: 0 0 0 2px rgba(30,58,138,0.1); }
        .lm-search-clear { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 0.7rem; color: #94a3b8; cursor: pointer; }
        .lm-loading { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 4rem; color: #94a3b8; font-size: 0.8rem; font-weight: 600; }
        .lm-spinner { width: 1.5rem; height: 1.5rem; border: 2px solid #e2e8f0; border-top-color: #1e3a8a; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .lm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .lm-empty { grid-column: 1 / -1; padding: 4rem; text-align: center; color: #94a3b8; font-size: 0.85rem; font-weight: 600; }
        .lm-card { background: white; border: 1px solid #e2e8f0; border-radius: 1.5rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; cursor: pointer; transition: all 0.2s; }
        .lm-card:hover { border-color: #bfdbfe; box-shadow: 0 8px 25px rgba(30,58,138,0.08); transform: translateY(-2px); }
        .lm-card.online { border-color: rgba(16, 185, 129, 0.3); }
        .lm-card-top { display: flex; align-items: flex-start; gap: 0.75rem; }
        .lm-avatar { position: relative; width: 2.75rem; height: 2.75rem; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 900; color: #1e3a8a; flex-shrink: 0; overflow: hidden; }
        .lm-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .lm-online-dot { position: absolute; bottom: 1px; right: 1px; width: 10px; height: 10px; background: #10b981; border: 2px solid white; border-radius: 50%; }
        .lm-card-info { flex: 1; min-width: 0; }
        .lm-card-name { font-size: 0.875rem; font-weight: 800; color: #0f172a; margin: 0 0 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lm-card-email { font-size: 0.65rem; color: #94a3b8; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lm-card-phone { font-size: 0.65rem; color: #64748b; margin: 0.15rem 0 0; font-weight: 600; }
        .lm-status-pill { font-size: 0.55rem; font-weight: 900; padding: 0.25rem 0.6rem; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
        .lm-status-pill.online { background: #dcfce7; color: #15803d; }
        .lm-status-pill.offline { background: #f1f5f9; color: #64748b; }
        .lm-card-stats { display: grid; grid-template-columns: repeat(4, 1fr); background: #f8fafc; border-radius: 0.75rem; padding: 0.75rem 0.5rem; }
        .lm-stat { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; }
        .lm-stat-val { font-size: 0.8rem; font-weight: 900; color: #1e293b; text-align: center; }
        .lm-stat-lbl { font-size: 0.5rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; text-align: center; }
        .lm-card-actions { display: flex; gap: 0.5rem; }
        .lm-btn-wa { flex: 1; padding: 0.6rem; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; border-radius: 0.75rem; font-size: 0.65rem; font-weight: 800; text-align: center; text-decoration: none; transition: all 0.2s; }
        .lm-btn-wa:hover { background: #dcfce7; }
        .lm-btn-profile { flex: 1; padding: 0.6rem; background: #eff6ff; color: #1e3a8a; border: 1px solid #bfdbfe; border-radius: 0.75rem; font-size: 0.65rem; font-weight: 800; cursor: pointer; transition: all 0.2s; }
        .lm-btn-profile:hover { background: #dbeafe; }
        .lm-no-phone { flex: 1; padding: 0.6rem; font-size: 0.6rem; color: #cbd5e1; font-style: italic; text-align: center; }
        .lm-pagination { display: flex; align-items: center; justify-content: center; gap: 1.5rem; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #f1f5f9; }
        .lm-page-btn { padding: 0.6rem 1.25rem; background: white; border: 1px solid #e2e8f0; border-radius: 0.75rem; font-size: 0.7rem; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s; }
        .lm-page-btn:hover:not(:disabled) { border-color: #1e3a8a; color: #1e3a8a; }
        .lm-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .lm-page-info { font-size: 0.75rem; font-weight: 700; color: #334155; }
        .lm-page-total { color: #94a3b8; }
      `}</style>

      {selectedUid && (
        <LeadProfileModal
          uid={selectedUid}
          onClose={() => setSelectedUid(null)}
        />
      )}
    </div>
  );
}
