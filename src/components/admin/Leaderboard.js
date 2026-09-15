"use client";

import React, { useEffect, useState } from "react";
import { auth } from "../../utils/firebase";
import { useAuth } from "@/context/AuthContext";

export default function Leaderboard() {
  const { user: authUser } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaders() {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();

        const res = await fetch('/api/admin/leaderboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        
        if (data.leaders) {
          setLeaders(data.leaders);
        }
      } catch (err) {
        console.error("Leaderboard Sync Error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (authUser) {
      fetchLeaders();
    } else {
      setLoading(false);
    }
  }, [authUser]);

  if (loading)
    return (
      <div className="p-8 animate-pulse text-slate-400">
        Compiling global rankings...
      </div>
    );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">
          Global Leaderboard
        </h3>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
          Student Rankings by Performance
        </p>
      </header>
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
              <th className="px-8 py-6">Rank</th>
              <th className="px-8 py-6">Student</th>
              <th className="px-8 py-6">Total Pts</th>
              <th className="px-8 py-6 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leaders.map((u, i) => (
              <tr key={u.uid} className={i < 3 ? "bg-blue-50/30" : ""}>
                <td className="px-8 py-6">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-sm ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-amber-600 text-white" : "text-slate-400"}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-8 py-6 font-bold text-slate-900">
                  {u.name || "Anonymous Student"}
                </td>
                <td className="px-8 py-6 font-black text-blue-600">
                  {(u.xp || 0).toLocaleString()}
                  <span className="text-[10px] text-slate-400 uppercase ml-1">xp</span>
                </td>
                <td className="px-8 py-6 text-right">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {u.status || 'Active'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
