'use client';

import React, { useEffect, useState } from 'react';
import { db, auth } from '../../utils/firebase';
import { useAuth } from '@/context/AuthContext';
import { collection, doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot, query, where } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export default function Finance() {
  const { user: authUser } = useAuth();
  const [stats, setStats] = useState({
    activeSubscribers: 0,
    totalRevenue: 0,
    coursePerformance: [],
    enrollmentLedger: []
  });

  const [pendingPayments, setPendingPayments] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState({ esewaQrUrl: '' });
  const [loading, setLoading] = useState(true);
  const [qrInput, setQrInput] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchFinanceData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();

      // 1. Aggregate Stats from SQL Bridge
      const statsRes = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      setStats({
        activeSubscribers: statsData.activeStudents || 0,
        totalRevenue: statsData.revenue || 0,
        coursePerformance: statsData.coursePerformance || [],
        enrollmentLedger: [] 
      });

      // 2. Pending Payments from SQL
      const paymentsRes = await fetch('/api/admin/payments?status=pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const paymentsData = await paymentsRes.json();
      setPendingPayments(paymentsData.payments || []);

      // 3. QR Config (Still Firestore for now, low volume)
      const configSnap = await getDoc(doc(db, 'settings', 'paymentConfig'));
      if (configSnap.exists()) {
        const cfg = configSnap.data();
        setPaymentConfig(cfg);
        setQrInput(cfg.esewaQrUrl || '');
      }
    } catch (err) {
      console.error("Finance Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authUser) {
      fetchFinanceData();
    } else {
      setLoading(false);
    }
  }, [authUser]);

  const handleVerifyGrant = async (payment) => {
    if (!confirm(`Grant access to ${payment.userName} for ${payment.courseTitle}?`)) return;
    setActionLoading(payment.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentId: payment.id,
          status: 'approved',
          userId: payment.userId,
          courseId: payment.courseId
        })
      });

      if (!res.ok) throw new Error("Update failed");
      
      alert("Access Granted!");
      fetchFinanceData(); // Refresh
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (payment) => {
    if (!confirm(`Reject payment from ${payment.userName}?`)) return;
    setActionLoading(payment.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentId: payment.id,
          status: 'rejected'
        })
      });

      if (!res.ok) throw new Error("Rejection failed");
      
      alert("Payment Rejected");
      fetchFinanceData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };


  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(stats.enrollmentLedger);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Finance Ledger");
    XLSX.utils.writeFile(wb, `Finance_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 space-y-12 pb-32 font-sans selection:bg-blue-100 selection:text-blue-600">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter text-slate-900 leading-[0.8] mb-2">Finance</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em]">Treasury & Enrollment Pipeline</p>
          </div>
          <button onClick={exportToExcel} className="px-8 py-4 bg-white border-2 border-slate-900 text-slate-900 font-black rounded-2xl hover:bg-slate-900 hover:text-white transition-all transform hover:-translate-y-1 active:translate-y-0 text-xs uppercase tracking-widest flex items-center gap-3">
            <span>Export Ledger</span>
            <span className="text-lg opacity-40">↓</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FinanceCard label="Gross Revenue" val={`Rs. ${stats.totalRevenue.toLocaleString()}`} sub="Lifetime earnings" theme="bg-blue-600 text-white" icon="৳" />
          <FinanceCard label="Active Subs" val={stats.activeSubscribers} sub="Paying students" theme="bg-emerald-500 text-white" icon="👥" />
          <FinanceCard label="Queue" val={pendingPayments.length} sub="Pending verification" theme="bg-amber-400 text-slate-900" icon="⏳" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="p-10 bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                Verification Queue
              </h3>
              {pendingPayments.length === 0 ? (
                <div className="py-20 text-center space-y-4 opacity-30">
                  <span className="text-4xl">🍃</span>
                  <p className="font-bold text-xs uppercase tracking-widest">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingPayments.map(p => (
                    <div key={p.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-6 w-full">
                        <div className="w-16 h-16 bg-white rounded-2xl border-2 border-slate-200 p-1 flex-shrink-0">
                          <img src={p.screenshotUrl} alt="Esewa Screenshot" className="w-full h-full object-cover rounded-xl cursor-zoom-in" onClick={() => window.open(p.screenshotUrl)} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-black text-slate-900 leading-tight">{p.userName}</h4>
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{p.courseTitle}</p>
                          <p className="text-[10px] font-medium text-slate-400">ID: {p.transactionId || 'Manual'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <button disabled={actionLoading === p.id} onClick={() => handleVerifyGrant(p)} className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors disabled:opacity-50">
                          {actionLoading === p.id ? '...' : 'Approve'}
                        </button>
                        <button onClick={() => handleReject(p.id)} className="flex-1 md:flex-none px-6 py-3 bg-white text-rose-500 border border-rose-100 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-colors">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-10 bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Performance by Course</h3>
              <div className="space-y-6">
                {stats.coursePerformance.map((course, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="font-bold text-slate-800 text-xs">{course.title}</span>
                      <span className="font-black text-slate-900 text-xs">Rs. {course.revenue.toLocaleString()}</span>
                    </div>
                    <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${(course.revenue / stats.totalRevenue) * 100 || 0}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl text-white">
              <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6">Merchant Config</h5>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await setDoc(doc(db, 'settings', 'paymentConfig'), { esewaQrUrl: qrInput }, { merge: true });
                  setPaymentConfig({ esewaQrUrl: qrInput });
                  alert("Merchant Config Updated.");
                } catch (err) {
                  alert(err.message);
                }
              }} className="space-y-4">
                <input
                  type="url"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 font-bold text-xs"
                  placeholder="Merchant QR API/URL..."
                />
                <button className="w-full py-4 bg-blue-600 text-white font-black rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all">
                  Update merchant
                </button>
              </form>
            </div>

            <div className="p-8 bg-white rounded-[2.5rem] border border-slate-200">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Financial Status</h5>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-slate-50 pb-4">
                  <span className="text-xs font-bold text-slate-500">Gross Total</span>
                  <span className="text-xl font-black text-slate-900">Rs. {stats.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-slate-500">Active Pipeline</span>
                  <span className="text-lg font-black text-emerald-600">{stats.activeSubscribers} Subs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceCard({ label, val, sub, theme, icon }) {
  return (
    <div className={`p-8 rounded-[2.5rem] shadow-xl space-y-4 relative overflow-hidden group transition-all hover:scale-[1.02] ${theme}`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{label}</p>
          <h4 className="text-3xl font-black tracking-tighter leading-none">{val}</h4>
        </div>
        <div className="text-2xl opacity-40 group-hover:scale-110 transition-transform">{icon}</div>
      </div>
      <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">{sub}</p>
    </div>
  );
}