"use client";

import React, { useState, useMemo } from "react";

export default function GrantDropdown({ courses, enrolledIds, onGrant }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = courses.map((c) => c.category).filter(Boolean);
    return Array.from(new Set(cats)).sort();
  }, [courses]);

  // Filter available (not enrolled) courses by search + category
  const filtered = useMemo(() => {
    return courses.filter(
      (c) =>
        !enrolledIds.includes(c.id) &&
        c.title.toLowerCase().includes(search.toLowerCase()) &&
        (!filterCategory || c.category === filterCategory)
    );
  }, [courses, enrolledIds, search, filterCategory]);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm"
      >
        ➕ Grant Access
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setIsOpen(false); setSearch(""); setFilterCategory(""); }}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-50 p-4 space-y-3">
            {/* Category filter */}
            {categories.length > 0 && (
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">
                  Filter by Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search */}
            <input
              autoFocus
              type="text"
              placeholder="Search course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />

            {/* Course list */}
            <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onGrant(c.id);
                    setIsOpen(false);
                    setSearch("");
                    setFilterCategory("");
                  }}
                  className="w-full text-left p-3 hover:bg-blue-50 rounded-xl group transition-all"
                >
                  <div className="text-[11px] font-black text-slate-800 group-hover:text-blue-600 truncate">
                    {c.title}
                  </div>
                  {c.category && (
                    <div className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">
                      {c.category}
                    </div>
                  )}
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    Click to grant license
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-4 text-center text-slate-400 font-bold italic text-[10px]">
                  No available courses.
                </div>
              )}
            </div>

            {/* Result count */}
            <div className="text-[9px] font-bold text-slate-400 text-right tracking-widest uppercase pt-1 border-t border-slate-50">
              {filtered.length} course{filtered.length !== 1 ? "s" : ""} available
            </div>
          </div>
        </>
      )}
    </div>
  );
}
