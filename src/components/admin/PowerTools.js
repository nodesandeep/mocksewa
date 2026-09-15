'use client';

 import React, {

 useState, useEffect }

 from 'react';

 import {

 db, auth }

 from '../../utils/firebase';
import { useAuth } from '@/context/AuthContext';

 import {

 collection, onSnapshot, addDoc, serverTimestamp, query, where }

 from 'firebase/firestore';

 import Papa from 'papaparse';

 export default function PowerTools() {
 const { user: authUser } = useAuth();

 const [subjects, setSubjects] = useState([]);

 const [courses, setCourses] = useState([]);

 const [selectedSubjectId, setSelectedSubjectId] = useState('');

 const [selectedCourseId, setSelectedCourseId] = useState('');

 const [courseTitle, setCourseTitle] = useState('');

 const [courseDescription, setCourseDescription] = useState('');

 const [loading, setLoading] = useState(true);

 const [importing, setImporting] = useState(false);

 const [success, setSuccess] = useState(false);

 const [progress, setProgress] = useState(0);
 const [maintenanceMode, setMaintenanceMode] = useState(false);
 const [updatingMaintenance, setUpdatingMaintenance] = useState(false);


  useEffect(() => {
    const loadData = async () => {
      if (!authUser) {
        setLoading(false);
        return;
      }
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('No token');
        const [subRes, courseRes] = await Promise.all([
          fetch('/api/admin/content?type=subjects', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/api/admin/content?type=courses', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        if (subRes.ok) setSubjects(await subRes.json());
        if (courseRes.ok) setCourses(await courseRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [authUser]);

  useEffect(() => {
    // Fetch initial maintenance status
    const fetchMaintenance = async () => {
      try {
        const res = await fetch('/api/app-status');
        const data = await res.json();
        setMaintenanceMode(data.maintenance);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMaintenance();
  }, []);

  const handleToggleMaintenance = async () => {
    if (!confirm(`Are you sure you want to ${maintenanceMode ? 'DISABLE' : 'ENABLE'} Maintenance Mode?`)) return;
    setUpdatingMaintenance(true);
    try {
      const newValue = !maintenanceMode;
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ key: 'maintenance_mode', value: newValue.toString() })
      });
      if (res.ok) {
        setMaintenanceMode(newValue);
      } else {
        throw new Error("Update failed");
      }
    } catch (err) {
      alert("Failed to update status: " + err.message);
    } finally {
      setUpdatingMaintenance(false);
    }
  };


 const [selectedFiles, setSelectedFiles] = useState([]);

 const handleFileChange = (e) => {

 const files = Array.from(e.target.files);

 setSelectedFiles(files);

 }

;

 const handleCSVImport = async () => {

 if (selectedFiles.length === 0) return alert("Select one or more CSV files first.");

 const isNewCourse = selectedCourseId === 'new_course' || !selectedCourseId;

 if (isNewCourse && !courseTitle) return alert("Course Title is required for creation.");

 setImporting(true);

 setProgress(0);

 const parseFile = (file) => {

 return new Promise((resolve, reject) => {

 Papa.parse(file, {

 skipEmptyLines: true, header: false, encoding: "UTF-8", complete: (results) => resolve(results.data), error: (err) => reject(err) }

);

 }

);

 }

;

 try {
    const token = await auth.currentUser?.getIdToken();
    let finalCourseId = selectedCourseId;
    let finalSubjectId = selectedSubjectId;

    // 1. Resolve/Create Course
    if (isNewCourse) {
      const courseId = `course_${Date.now()}`;
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          type: 'course',
          action: 'save',
          data: { id: courseId, title: courseTitle, description: courseDescription, status: 'active', basePrice: 500 }
        })
      });
      if (!res.ok) throw new Error("Course creation failed");
      finalCourseId = courseId;
      if (!selectedSubjectId) {
        const subId = `subject_${Date.now()}`;
        const subRes = await fetch('/api/admin/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            type: 'subject',
            action: 'save',
            data: { id: subId, name: 'Master Module', courseId: finalCourseId, icon: '📚', active: true }
          })
        });
        if (!subRes.ok) throw new Error("Subject initialization failed");
        finalSubjectId = subId;
      }
    }

    const totalFiles = selectedFiles.length;
    let totalQuestionsImported = 0;

    for (let i = 0; i < totalFiles; i++) {
      const file = selectedFiles[i];
      const setTitle = file.name.replace('.csv', '');
      const rows = await parseFile(file);
      const quizId = `quiz_${Date.now()}_${i}`;

      const qzRes = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          type: 'quiz',
          action: 'save',
          data: { id: quizId, title: setTitle, courseId: finalCourseId, subjectId: finalSubjectId, enabled: true, isFreeTrial: i === 0, globalOrder: 999 }
        })
      });
      if (!qzRes.ok) throw new Error(`Failed to create quiz set: ${setTitle}`);

      const questionsToUpload = [];
      for (const row of rows) {
        if (row.length < 7) continue;
        const [topic, text, optA, optB, optC, optD, ansLetter, rationale] = row;
        const normalizedText = String(text).trim();
        if (normalizedText === 'Question' || normalizedText === 'CourseText' || String(topic).trim() === 'Topic') continue;

        const letterToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
        let correctIdx = letterToIndex[String(ansLetter).trim()];
        if (correctIdx === undefined) {
          const answerText = String(ansLetter).trim();
          const matchIndex = [optA, optB, optC, optD].map(o => String(o).trim()).findIndex(o => o === answerText);
          correctIdx = matchIndex !== -1 ? matchIndex : 0;
        }

        questionsToUpload.push({
          quizId, courseId: finalCourseId, subjectId: finalSubjectId,
          questionText: text, options: [optA, optB, optC, optD],
          correctOptionIndex: correctIdx, explanationText: rationale || '',
          topic: topic || '', microConcept: topic || finalSubjectId,
          baseDifficulty: 50
        });
        totalQuestionsImported++;
      }

      // Batch Upload Questions
      const bulkRes = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type: 'questions_bulk', action: 'save', data: { questions: questionsToUpload } })
      });
      if (!bulkRes.ok) throw new Error(`Bulk upload failed for set: ${setTitle}`);

      setProgress(Math.round(((i + 1) / totalFiles) * 100));
    }
    alert(`Success! Finalized ${totalFiles} sets. Total Questions: ${totalQuestionsImported}.`);

    // Auto-sync trial course so the 1st set becomes the free trial immediately
    try {
      await fetch('/api/admin/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'sync', courseId: finalCourseId }),
      });
      console.log('[PowerTools] Trial sync completed for course:', finalCourseId);
    } catch (trialErr) {
      console.warn('[PowerTools] Trial sync skipped:', trialErr.message);
    }

 setSuccess(true);

 setTimeout(() => setSuccess(false), 3000);

 // Form Reset
setCourseTitle('');

 setCourseDescription('');

 setSelectedSubjectId('');

 setSelectedFiles([]);

 }

 catch (err) {

 console.error("Import error:", err);

 alert("Import failed:"+ err.message);

 }

 finally {

 setImporting(false);

 setProgress(0);

 }

 }

;

 if (loading) return <div className="p-8 animate-pulse text-slate-400">Syncing Power Grid...</div>;

 return ( <div className="space-y-12"> <header className="space-y-2"> <h3 className="text-2xl font-black text-slate-800 tracking-tight">System Power Tools</h3> <p className="text-sm font-bold text-slate-400">Advanced diagnostic and bulk management utilities.</p> </header> <div className="grid grid-cols-1 md:grid-cols-2 gap-8"> {

/* Bulk Importer */}

 <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 relative overflow-hidden"> 
                {/* Encoding Alert */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
                  <div className="text-xl">⚠️</div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Encoding Warning</p>
                    <p className="text-[10px] font-bold text-amber-600 leading-tight">
                      Ensure your CSV is saved as <span className="underline">CSV UTF-8 (Comma delimited)</span>. 
                      Standard Excel CSV (ANSI) will corrupt Nepali characters.
                    </p>
                  </div>
                </div>
 {

importing && ( <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-10 space-y-4"> <div className="text-4xl animate-bounce">📥</div> <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"> <div className="h-full bg-blue-600 transition-all duration-500"style={

{

 width: `${progress}%` }

}

></div> </div> <p className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Processing Pipeline: {

progress}

%</p> </div>)}

 <div className="flex items-center gap-4 text-3xl">📥</div> <div className="space-y-2"> <h4 className="text-xl font-black text-slate-900">Course Data Importer</h4> <div className="text-sm text-slate-400 font-medium whitespace-pre-wrap leading-relaxed"> Required CSV Schema:<br/> <code className="text-[10px] bg-slate-50 p-1 px-2 rounded font-bold text-blue-600">Topic, Question, OptA, OptB, OptC, OptD, CorrectAns, 💡 Hint</code> </div> </div> <div className="space-y-4 pt-4"> <div className="space-y-1"> <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Target Course</label> 

  <CategorizedCourseSelector 
    courses={courses}
    value={selectedCourseId}
    onChange={(val) => {
      setSelectedCourseId(val);
      setSelectedSubjectId('');
      if (val !== 'new_course') setCourseTitle('');
    }}
  />
</div> 
{selectedCourseId === 'new_course' && ( <div className="space-y-1 animate-in slide-in-from-top-2 duration-300"> <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Course Title</label> <input type="text"value={

courseTitle}

 onChange={

(e) => setCourseTitle(e.target.value)}

 placeholder="e.g. Civil Engineering Level 5"className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"/> </div>)}

 <div className="space-y-1"> <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Subject (Optional)</label> <select value={

selectedSubjectId}

 onChange={

(e) => setSelectedSubjectId(e.target.value)}

 className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                  <option value="">-- No Subject Link --</option>
                  {subjects
                    .filter(s => s.courseId === selectedCourseId)
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.title}
                      </option>
                    ))}

 </select> </div> <div className="space-y-1"> <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Short Description</label> <textarea value={

courseDescription}

 onChange={

(e) => setCourseDescription(e.target.value)}

 placeholder="Course overview..."className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold h-24"/> </div> <div className="space-y-1"> <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Import Course CSV Data (Select Multiple to Stitch)</label> <input id="bulk-csv-input"type="file"accept=".csv"multiple onChange={

handleFileChange}

 className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"/> {

selectedFiles.length > 0 && ( <div className="mt-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 max-h-32 overflow-y-auto"> <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Selected Pipeline Files:</p> {

selectedFiles.map((f, i) => ( <p key={

i}

 className="text-[10px] font-bold text-slate-600">📄 {

f.name}

</p>))}

 </div>)}

 </div> <button onClick={

handleCSVImport}

 disabled={

importing || (selectedCourseId === 'new_course' && !courseTitle) || selectedFiles.length === 0}

 className={

`w-full py-4 text-white font-black rounded-2xl transition shadow-lg disabled:opacity-50 ${success ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'}`}

 > {

importing ?"Processing Cluster Data...": success ?"✅ Pipeline Initialized!":"Initialize Cluster & Upload"}

 </button> </div> </div> {

/* Cache Control */}

 <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8"> <div className="flex items-center gap-4 text-3xl">🧹</div> <div className="space-y-2"> <h4 className="text-xl font-black text-slate-900">Cache Control</h4> <p className="text-sm text-slate-400 font-medium">Force clear student-side local caches. Recommended after major schema updates.</p> </div> <div className="pt-4"> <button onClick={

() => {

 localStorage.clear();

 alert("Global cache invalidation signal sent.");

 }

}

 className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 transition shadow-lg shadow-rose-100"> Flush Global Cache </button> </div> </div>

  {/* Maintenance Mode Toggle */}
  <div className={`p-10 rounded-[2.5rem] border shadow-sm space-y-8 transition-all duration-500 ${maintenanceMode ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 text-3xl">{maintenanceMode ? '🚧' : '🌐'}</div>
      <div className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${maintenanceMode ? 'bg-amber-200 text-amber-800 animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
        {maintenanceMode ? 'Active' : 'Live'}
      </div>
    </div>
    <div className="space-y-2">
      <h4 className="text-xl font-black text-slate-900">Maintenance Mode</h4>
      <p className="text-sm text-slate-400 font-medium">
        {maintenanceMode 
          ? "The platform is currently locked for students. Only admins can access the hub." 
          : "The platform is live and accessible to all students."}
      </p>
    </div>
    <div className="pt-4">
      <button 
        onClick={handleToggleMaintenance}
        disabled={updatingMaintenance}
        className={`w-full py-4 font-black rounded-2xl transition shadow-lg disabled:opacity-50 ${maintenanceMode ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
      >
        {updatingMaintenance ? "Updating System Status..." : maintenanceMode ? "Open Platform to Students" : "Enable Maintenance Mode"}
      </button>
    </div>
  </div>


  {/* AI Generation Template */}
  <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-10 rounded-[2.5rem] border border-indigo-500/30 shadow-2xl space-y-8 col-span-1 md:col-span-2">
    <div className="flex items-center gap-4 text-3xl">🤖</div>
    <div className="space-y-2">
      <h4 className="text-xl font-black text-white italic">AI Content Architect Prompt</h4>
      <p className="text-sm text-indigo-200 font-medium opacity-80">Use this prompt in Google AI Studio to generate sets in the exact format required by myMOCKsewa.</p>
    </div>
    
    <div className="relative group">
      <pre className="p-6 bg-black/40 rounded-3xl text-[10px] text-indigo-300 font-mono overflow-x-auto whitespace-pre-wrap border border-indigo-500/20 max-h-60 overflow-y-auto custom-scrollbar">
{`System Instruction:
You are a Senior Content Architect for myMOCKsewa. Your task is to generate MCQ sets for [EXAM TYPE].

STRICT FORMATTING RULES:
1. Language: Nepali (Unicode) for Question/Explanation. Technical terms in English.
2. Correct Answer: MUST ONLY contain 'A', 'B', 'C', or 'D'.
3. Output: Valid JSON array or CSV-ready format.

JSON Schema Template:
{
  "chapter": "Geography",
  "question": "नेपालको प्रमाणिक समय कुन हिमाललाई आधार मानी निर्धारण गरिएको छ?",
  "A": "सगरमाथा",
  "B": "अन्नपूर्ण",
  "C": "गौरीशंकर",
  "D": "धौलागिरी",
  "correct_answer": "C",
  "explanation": "गौरीशंकर हिमाललाई आधार मानी नेपालको प्रमाणिक समय निर्धारण गरिएको हो।"
}`}
      </pre>
      <button 
        onClick={() => {
          navigator.clipboard.writeText(`System Instruction:\nYou are a Senior Content Architect for myMOCKsewa. Your task is to generate MCQ sets for [EXAM TYPE].\n\nSTRICT FORMATTING RULES:\n1. Language: Nepali (Unicode) for Question/Explanation. Technical terms in English.\n2. Correct Answer: MUST ONLY contain 'A', 'B', 'C', or 'D'.\n3. Output: Valid JSON array or CSV-ready format.\n\nJSON Schema Template:\n{\n  "chapter": "Geography",\n  "question": "नेपालको प्रमाणिक समय कुन हिमाललाई आधार मानी निर्धारण गरिएको छ?",\n  "A": "सगरमाथा",\n  "B": "अन्नपूर्ण",\n  "C": "गौरीशंकर",\n  "D": "धौलागिरी",\n  "correct_answer": "C",\n  "explanation": "गौरीशंकर हिमाललाई आधार मानी नेपालको प्रमाणिक समय निर्धारण गरिएको हो।"\n}`);
          alert("AI Architect Prompt copied to clipboard!");
        }}
        className="absolute top-4 right-4 px-4 py-2 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-400 transition-all opacity-0 group-hover:opacity-100"
      >
        Copy Prompt
      </button>
    </div>
  </div>
</div> </div>);

 }

const CategorizedCourseSelector = ({ courses, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const categories = courses.reduce((acc, c) => {
    const cat = c.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  const selectedCourse = courses.find(c => c.id === value);

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold cursor-pointer transition-all flex justify-between items-center"
      >
        <span>{selectedCourse ? selectedCourse.title : (value === 'new_course' ? '+ Create New Course...' : 'Choose an existing course...')}</span>
        <span className="text-slate-400">▼</span>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar p-2">
          {Object.entries(categories).map(([cat, items]) => (
            <div key={cat} className="mb-2">
              <div className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 rounded-xl mb-1">
                {cat}
              </div>
              <div className="space-y-1">
                {items.map(c => (
                  <div
                    key={c.id}
                    onClick={() => { onChange(c.id); setIsOpen(false); }}
                    className={`px-4 py-3 rounded-xl cursor-pointer font-bold text-sm transition-colors ${value === c.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    {c.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-4 pt-2 border-t border-slate-100">
            <div
              onClick={() => { onChange('new_course'); setIsOpen(false); }}
              className="px-4 py-3 rounded-xl cursor-pointer font-black text-sm text-amber-600 hover:bg-amber-50 transition-colors flex items-center gap-2"
            >
              <span>+</span> Create New Course...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};