"use client";

import React, { useEffect, useState } from "react";

import { db } from "../../utils/firebase";

import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

export default function MaterialsSection() {
  const [materials, setMaterials] = useState([]);

  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    // Real-time listener for materials
    const unsubMat = onSnapshot(collection(db, "studyMaterials"), (snap) => {
      setMaterials(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
      );

      setLoading(false);
    });

    // Real-time listener for subjects
    const unsubSub = onSnapshot(collection(db, "subjects"), (snap) => {
      setSubjects(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
      );
    });

    return () => {
      unsubMat();

      unsubSub();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fileUrl = e.target.fileUrl.value;

    const title = e.target.title.value;

    const subjectId = e.target.subjectId.value;

    if (!title || !subjectId || !fileUrl)
      return alert("Fill all required fields");

    setSaving(true);

    try {
      let data = {
        title,
        subjectId,
        fileUrl,
        updatedAt: new Date().toISOString(),
        type: fileUrl.includes("drive.google.com")
          ? "google_drive"
          : "external_link",
      };

      if (editingId) {
        await updateDoc(doc(db, "studyMaterials", editingId), data);

        setEditingId(null);

        alert("Resource Updated!");
      } else {
        data.createdAt = new Date().toISOString();

        await addDoc(collection(db, "studyMaterials"), data);

        alert("Resource Linked Successfully!");
      }

      e.target.reset();
    } catch (err) {
      alert("Error:" + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Permanently remove this resource pointer?")) return;

    try {
      await deleteDoc(doc(db, "studyMaterials", id));
    } catch (err) {
      alert("Delete failed:" + err.message);
    }
  };

  if (loading)
    return (
      <div className="p-8 animate-pulse text-slate-400">
        Loading study resources...
      </div>
    );

  return (
    <div className="space-y-12">
      {" "}
      <section className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
        {" "}
        <div className="space-y-2">
          {" "}
          <h4 className="text-2xl font-black text-slate-900 tracking-tight">
            {" "}
            {editingId ? "Edit Material Link" : "Link External Study Material"}
          </h4>{" "}
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Bypassing local storage for zero-cost scalability.
          </p>{" "}
        </div>{" "}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end"
        >
          {" "}
          <div className="space-y-2 lg:col-span-1">
            {" "}
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Material Title
            </label>{" "}
            <input
              name="title"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              placeholder="e.g. NEA Guide v2"
              required
              defaultValue={materials.find((m) => m.id === editingId)?.title}
            />{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Subject Link
            </label>{" "}
            <select
              name="subjectId"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              required
              defaultValue={
                materials.find((m) => m.id === editingId)?.subjectId
              }
            >
              {" "}
              <option value="">--Select Subject--</option>{" "}
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.title}
                </option>
              ))}
            </select>{" "}
          </div>{" "}
          <div className="space-y-2 lg:col-span-1">
            {" "}
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Material URL (Drive/Dropbox)
            </label>{" "}
            <input
              name="fileUrl"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
              placeholder="https://drive.google.com/..."
              required
              defaultValue={materials.find((m) => m.id === editingId)?.fileUrl}
            />{" "}
          </div>{" "}
          <div className="flex gap-2">
            {" "}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 p-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-100 font-bold"
            >
              {" "}
              {editingId
                ? saving
                  ? "Updating..."
                  : "Save Changes"
                : saving
                  ? "Processing..."
                  : "Link Resource"}
            </button>{" "}
            {editingId && (
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="p-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 :bg-slate-700 transition"
              >
                {" "}
                ✕{" "}
              </button>
            )}
          </div>{" "}
        </form>{" "}
      </section>{" "}
      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        {" "}
        <div className="overflow-x-auto">
          {" "}
          <table className="w-full text-left">
            {" "}
            <thead>
              {" "}
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                {" "}
                <th className="px-8 py-6 min-w-[200px]">
                  Material Resource
                </th>{" "}
                <th className="px-8 py-6">Linked Subject</th>{" "}
                <th className="px-8 py-6 text-right">Actions</th>{" "}
              </tr>{" "}
            </thead>{" "}
            <tbody className="divide-y divide-slate-100">
              {" "}
              {materials.map((m) => (
                <tr
                  key={m.id}
                  className={`${editingId === m.id ? "bg-blue-50/50 " : ""}hover:bg-slate-50 :bg-slate-800/50 transition-colors`}
                >
                  {" "}
                  <td className="px-8 py-6">
                    {" "}
                    <div className="flex items-center gap-4">
                      {" "}
                      <span className="text-2xl text-blue-500">
                        {m.type === "google_drive" ? "📁" : "🔗"}
                      </span>{" "}
                      <div>
                        {" "}
                        <div className="font-bold text-slate-900">
                          {m.title}
                        </div>{" "}
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                          {m.fileUrl}
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                  </td>{" "}
                  <td className="px-8 py-6">
                    {" "}
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg uppercase whitespace-nowrap">
                      {" "}
                      {subjects.find((s) => s.id === m.subjectId)?.name ||
                        subjects.find((s) => s.id === m.subjectId)?.title ||
                        "Link Broken"}
                    </span>{" "}
                  </td>{" "}
                  <td className="px-8 py-6 text-right">
                    {" "}
                    <div className="flex justify-end items-center gap-2">
                      {" "}
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-slate-400 hover:text-blue-600 :text-blue-400 transition"
                        title="Open Resource"
                      >
                        👁️
                      </a>{" "}
                      <button
                        onClick={() => setEditingId(m.id)}
                        className="p-2 text-slate-400 hover:text-amber-600 :text-amber-400 transition"
                        title="Edit Pointer"
                      >
                        {" "}
                        ✏️{" "}
                      </button>{" "}
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 :text-rose-400 transition"
                        title="Remove Link"
                      >
                        {" "}
                        🗑️{" "}
                      </button>{" "}
                    </div>{" "}
                  </td>{" "}
                </tr>
              ))}
              {materials.length === 0 && (
                <tr>
                  <td
                    colSpan="3"
                    className="p-20 text-center text-slate-400 font-bold italic"
                  >
                    No external resources linked. Paste your first Google Drive
                    link above!
                  </td>
                </tr>
              )}
            </tbody>{" "}
          </table>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
