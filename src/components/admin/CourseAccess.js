"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

import { db, auth } from "../../utils/firebase";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import * as XLSX from "xlsx";

import GrantDropdown from "./GrantDropdown";

export default function CourseAccess() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState([]);

  const [courses, setCourses] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCourseId, setFilterCourseId] = useState("");

  const [loading, setLoading] = useState(true);

  // Users from Firestore (they're still stored there)
  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({
            uid: d.id,
            ...d.data(),
          }))
          .filter((u) => u.role === "student");
        list.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
        setUsers(list);
      },
      (err) => {
        console.error("CourseAccess users snapshot error:", err);
      }
    );
    return () => unsubUsers();
  }, []);

  // Courses from Turso API (not Firestore — migrated)
  useEffect(() => {
    const loadCourses = async () => {
      if (!authUser) return;
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('No token');
        const res = await fetch('/api/admin/content?type=courses', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
        }
      } catch (err) {
        console.error("CourseAccess courses fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
  }, [authUser]);

  const [userStatuses, setUserStatuses] = useState({});

  useEffect(() => {
    const loadStatuses = async () => {
      if (!authUser) return;
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const statusMap = {};
          data.forEach(s => { statusMap[s.userId] = s.status; });
          setUserStatuses(statusMap);
        }
      } catch (err) {
        console.error("Status fetch error:", err);
      }
    };
    loadStatuses();
  }, [authUser]);

  // Extract unique course categories dynamically
  const categories = React.useMemo(() => {
    const list = courses.map(c => c.category).filter(Boolean);
    return Array.from(new Set(list));
  }, [courses]);

  // Dynamically filter course dropdown options based on category choice
  const filteredCoursesDropdown = React.useMemo(() => {
    if (!filterCategory) return courses;
    return courses.filter(c => c.category === filterCategory);
  }, [courses, filterCategory]);

  const toggleAccess = async (uid, courseId, hasAccess) => {
    if (hasAccess) {
      const student = users.find(u => u.uid === uid);
      const course = courses.find(c => c.id === courseId);
      const studentName = student?.name || "Student";
      const courseTitle = course?.title || "Course";
      
      const confirmRevoke = confirm(
        `⚠️ WARNING: Revoking Access\n\nAre you sure you want to REVOKE access to "${courseTitle}" for "${studentName}"?\n\nThis will instantly block the student from accessing any lectures, mock exams, or materials for this course.`
      );
      if (!confirmRevoke) return;
    }
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: uid,
          courseId: courseId,
          action: hasAccess ? 'revoke' : 'grant'
        })
      });

      if (!res.ok) throw new Error("Enrollment sync failed");

      // Update local state to reflect change immediately
      setUsers(prev => prev.map(u => {
        if (u.uid === uid) {
          const current = u.enrolledCourses || [];
          return {
            ...u,
            enrolledCourses: hasAccess 
              ? current.filter(id => id !== courseId)
              : [...current, courseId]
          };
        }
        return u;
      }));

    } catch (err) {
      alert("Access update failed: " + err.message);
    }
  };

  const toggleBlockStatus = async (uid, currentStatus) => {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    if (!confirm(`CRITICAL: Are you sure you want to ${newStatus === 'blocked' ? 'BLOCK' : 'UNBLOCK'} this account? ${newStatus === 'blocked' ? 'This will prevent the student from logging in.' : ''}`)) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          uid,
          status: newStatus,
          action: 'updateStatus'
        })
      });

      if (!res.ok) throw new Error("Status update failed");

      setUserStatuses(prev => ({ ...prev, [uid]: newStatus }));
      alert(`User ${newStatus === 'blocked' ? 'blocked' : 'activated'} successfully.`);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const downloadStudentReport = () => {
    // Sheet 1: User Licenses Overview
    const userOverviewData = users.map((u) => ({
      "Student Name": u.name || "Student",
      "Email Address": u.email || "N/A",
      "Phone": u.phone || "N/A",
      "Account Status": userStatuses[u.uid] || "active",
      "Access Count": (u.enrolledCourses || []).length,
      "Enrolled Courses": (u.enrolledCourses || [])
        .map((cid) => courses.find((c) => c.id === cid)?.title || cid)
        .join(", "),
      "Last Active Date": u.lastLogin
        ? new Date(u.lastLogin).toLocaleDateString()
        : "N/A",
    }));

    // Sheet 2: Course Registry & Pricing
    const courseRegistryData = courses.map((c) => {
      const activeEnrollments = users.filter((u) => 
        (u.enrolledCourses || []).includes(c.id)
      ).length;

      return {
        "Course ID": c.id,
        "Course Title": c.title,
        "Category": c.category || "N/A",
        "Set Count": c.setsCount || 0,
        "Base Price (NPR)": c.price || 0,
        "Discounted Price (NPR)": c.discountPrice || 0,
        "Active Enrollments": activeEnrollments,
        "Estimated Revenue (NPR)": activeEnrollments * (c.discountPrice || c.price || 0),
      };
    });

    // Sheet 3: Granular Access Ledger
    const accessLedgerData = [];
    users.forEach((u) => {
      (u.enrolledCourses || []).forEach((cid) => {
        const course = courses.find((c) => c.id === cid);
        accessLedgerData.push({
          "Student Email": u.email || "N/A",
          "Student Name": u.name || "Student",
          "Account Status": userStatuses[u.uid] || "active",
          "Enrolled Course ID": cid,
          "Enrolled Course Title": course?.title || "Unknown Course",
          "Course Category": course?.category || "N/A",
          "Enrolled Price (NPR)": course?.discountPrice || course?.price || 0,
          "Granted On": u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "N/A",
        });
      });
    });

    if (accessLedgerData.length === 0) {
      accessLedgerData.push({
        "Student Email": "N/A",
        "Student Name": "N/A",
        "Account Status": "N/A",
        "Enrolled Course ID": "N/A",
        "Enrolled Course Title": "No Active Grants",
        "Course Category": "N/A",
        "Enrolled Price (NPR)": 0,
        "Granted On": "N/A",
      });
    }

    const workbook = XLSX.utils.book_new();

    const wsOverview = XLSX.utils.json_to_sheet(userOverviewData);
    XLSX.utils.book_append_sheet(workbook, wsOverview, "User Licenses Overview");

    const wsCourses = XLSX.utils.json_to_sheet(courseRegistryData);
    XLSX.utils.book_append_sheet(workbook, wsCourses, "Course Registry & Pricing");

    const wsLedger = XLSX.utils.json_to_sheet(accessLedgerData);
    XLSX.utils.book_append_sheet(workbook, wsLedger, "Granular Access Ledger");

    XLSX.writeFile(
      workbook,
      `myMockSewa_Detailed_Access_Report_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // Filter student list reactively based on search query, selected category, or course ID
  const filteredUsers = React.useMemo(() => {
    return users.filter((u) => {
      // 1. Search filter match
      const matchesSearch = 
        !searchTerm ||
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Course ID filter match
      if (filterCourseId) {
        return (u.enrolledCourses || []).includes(filterCourseId);
      }

      // 3. Category filter match (student has active access to at least one course under category)
      if (filterCategory) {
        const categoryCourseIds = courses
          .filter(c => c.category === filterCategory)
          .map(c => c.id);
        return (u.enrolledCourses || []).some(cid => categoryCourseIds.includes(cid));
      }

      return true;
    });
  }, [users, searchTerm, filterCourseId, filterCategory, courses]);

  if (loading)
    return (
      <div className="p-8 animate-pulse text-slate-400 font-bold uppercase tracking-widest text-[10px]">
        Mapping Access Matrix...
      </div>
    );

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">
            Access Command Center
          </h3>
          <p className="text-sm font-bold text-slate-400">
            Manual enrollment overrides and course licensing control.
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <button
            onClick={downloadStudentReport}
            className="px-6 py-4 bg-emerald-600/10 text-emerald-600 font-black rounded-2xl text-[10px] uppercase tracking-widest border border-emerald-600/20 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
          >
            📥 Export Excel Report
          </button>
        </div>
      </header>

      {/* Control Header Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-200/60 shadow-sm">
        {/* Search Input */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Search Candidate</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search Name or Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm text-sm"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Category Filter</label>
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setFilterCourseId(""); // reset course filter when category changes
            }}
            className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm text-sm text-slate-700 cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Course Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Course Filter</label>
          <select
            value={filterCourseId}
            onChange={(e) => setFilterCourseId(e.target.value)}
            className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm text-sm text-slate-700 cursor-pointer"
          >
            <option value="">All Courses</option>
            {filteredCoursesDropdown.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  <th className="px-10 py-8">Identity & Bio</th>
                  <th className="px-10 py-8">Active Permissions</th>
                  <th className="px-10 py-8 text-right">
                    Licensing & Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 transition-all">
                {filteredUsers.map((u) => (
                  <tr
                    key={u.uid}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white transition-all italic ${userStatuses[u.uid] === 'blocked' ? 'bg-rose-500' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-600'}`}>
                          {u.name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-base">
                            {u.name || "Student"}
                            {userStatuses[u.uid] === 'blocked' && (
                              <span className="ml-2 px-2 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-black uppercase rounded-md">Blocked</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex flex-wrap gap-2">
                        {(u.enrolledCourses || []).length > 0 ? (
                          u.enrolledCourses.map((cid) => {
                            const course = courses.find((c) => c.id === cid);
                            if (!course) return null;
                            return (
                              <div
                                key={cid}
                                className="group/chip flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded-lg uppercase tracking-widest border border-blue-200 transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                              >
                                {course.title}
                                <button
                                  onClick={() => toggleAccess(u.uid, cid, true)}
                                  className="w-4 h-4 rounded-md bg-white/20 hover:bg-rose-600 hover:text-white flex items-center justify-center text-[10px] font-black transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">
                            <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                            No active licenses
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => toggleBlockStatus(u.uid, userStatuses[u.uid] || 'active')}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                            userStatuses[u.uid] === 'blocked' 
                              ? 'bg-rose-600 text-white border-rose-700 shadow-lg shadow-rose-200' 
                              : 'bg-white text-slate-400 border-slate-200 hover:border-rose-500 hover:text-rose-500 shadow-sm'
                          }`}
                        >
                          {userStatuses[u.uid] === 'blocked' ? '🚫 Unblock' : '🔒 Block'}
                        </button>
                        <GrantDropdown
                          courses={courses}
                          enrolledIds={u.enrolledCourses || []}
                          onGrant={(cid) => toggleAccess(u.uid, cid, false)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-10 py-20 text-center text-slate-400 font-bold italic"
                    >
                      No students matching the search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
