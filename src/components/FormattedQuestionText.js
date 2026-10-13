'use client';

import React from 'react';

/**
 * Parses match-the-following questions (जोडा मिलाउनुहोस्) from unformatted strings or multi-line text.
 * Common in Loksewa, NEA, PSC, TSC, and engineering licensure exams.
 */
function parseMatchQuestion(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const text = rawText.trim();

  // Candidate section delimiters
  const g1Regex = /(?:समूह\s*['"‘“]?[I1१कA]['"’”]?|Group\s*['"‘“]?[I1A]['"’”]?|List\s*['"‘“]?[I1A]['"’”]?|Column\s*['"‘“]?[I1A]['"’”]?|स्तम्भ\s*['"‘“]?[I1१कA]['"’”]?)/gi;
  const g2Regex = /(?:समूह\s*['"‘“]?[II2२खB]['"’”]?|Group\s*['"‘“]?[II2B]['"’”]?|List\s*['"‘“]?[II2B]['"’”]?|Column\s*['"‘“]?[II2B]['"’”]?|स्तम्भ\s*['"‘“]?[II2२खB]['"’”]?)/gi;

  const g1Matches = Array.from(text.matchAll(g1Regex));
  const g2Matches = Array.from(text.matchAll(g2Regex));

  if (g1Matches.length === 0 || g2Matches.length === 0) return null;

  // Find the valid delimiter pair where Group 1 precedes Group 2 with content in between
  let bestG1 = null;
  let bestG2 = null;

  for (let i = g1Matches.length - 1; i >= 0; i--) {
    const candidateG1 = g1Matches[i];
    for (let j = g2Matches.length - 1; j >= 0; j--) {
      const candidateG2 = g2Matches[j];
      if (candidateG1.index < candidateG2.index) {
        const between = text.substring(candidateG1.index, candidateG2.index);
        // Exclude trivial mentions inside the intro prompt like "समूह I र समूह II बीच"
        if (between.length > 15 && !between.match(/^समूह\s*[^\s]+\s*र\s*$/)) {
          bestG1 = candidateG1;
          bestG2 = candidateG2;
          break;
        }
      }
    }
    if (bestG1) break;
  }

  if (!bestG1 || !bestG2) return null;

  const intro = text.substring(0, bestG1.index).trim();
  const g1Raw = text.substring(bestG1.index, bestG2.index).trim();
  const rest = text.substring(bestG2.index).trim();

  // Outro prompt (e.g. "कोडबाट सही विकल्प रोज्नुहोस्:", "माथिका आधारमा...")
  const outroRegex = /(?:(?:\n|^)\s*(?:माथिका|उपर्युक्त|Based on|Choose the correct code)|कोडबाट सही विकल्प)/i;
  const outroMatch = rest.match(outroRegex);

  let g2Raw = rest;
  let outro = '';
  if (outroMatch && outroMatch.index > 30) {
    g2Raw = rest.substring(0, outroMatch.index).trim();
    outro = rest.substring(outroMatch.index).trim();
  }

  function parseItems(block) {
    const markerRegex = /(?:(?<=\s|^)(?:[क-ङa-dA-D1-9१-९]|(?:i{1,3}|iv|v|vi))\s*[\.\:\-\)]|\((?:[क-ङa-dA-D1-9१-९]|(?:i{1,3}|iv|v|vi))\))/g;
    const matches = Array.from(block.matchAll(markerRegex));

    if (matches.length === 0) {
      return { title: block.replace(/[:\-]\s*$/, '').trim(), items: [] };
    }

    const title = block.substring(0, matches[0].index).replace(/[:\-]\s*$/, '').trim();
    const items = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = (i + 1 < matches.length) ? matches[i + 1].index : block.length;
      const rawItem = block.substring(start, end).trim();

      // Separate label badge (क., 1.) from label text
      const splitMatch = rawItem.match(/^((?:\([क-ङa-dA-D1-9१-९i-v]+\)|[क-ङa-dA-D1-9१-९i-v]+[\.\:\-\)]))\s*(.*)$/);
      if (splitMatch) {
        items.push({
          badge: splitMatch[1],
          text: splitMatch[2]
        });
      } else {
        items.push({
          badge: '',
          text: rawItem
        });
      }
    }
    return { title, items };
  }

  const group1 = parseItems(g1Raw);
  const group2 = parseItems(g2Raw);

  if (group1.items.length < 2 && group2.items.length < 2) {
    return null;
  }

  return {
    isMatch: true,
    intro,
    group1,
    group2,
    outro
  };
}

/**
 * Checks and parses Markdown tables inside question strings.
 */
function parseMarkdownTable(text) {
  if (!text || !text.includes('|')) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const tableLines = lines.filter(l => l.startsWith('|') && l.endsWith('|'));
  if (tableLines.length < 2) return null;

  const headerLine = tableLines[0];
  const separatorLine = tableLines[1];
  if (!separatorLine.includes('-')) return null;

  const parseCells = line => line.slice(1, -1).split('|').map(c => c.trim());
  const headers = parseCells(headerLine);
  const rows = tableLines.slice(2).map(parseCells);

  const nonTableText = lines.filter(l => !(l.startsWith('|') && l.endsWith('|'))).join('\n');

  return { headers, rows, nonTableText };
}

/**
 * FormattedQuestionText component:
 * Seamlessly upgrades questions with modern 2-column match layouts, markdown tables,
 * and clean multi-line typography.
 */
export default function FormattedQuestionText({ text, className = "", size = "base" }) {
  if (!text) return null;

  // 1. Try Match-the-Following Smart Parser
  const matchData = parseMatchQuestion(text);
  if (matchData) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Intro Question Prompt */}
        {matchData.intro && (
          <p className="font-bold text-slate-900 leading-relaxed font-nepali text-base md:text-lg">
            {matchData.intro}
          </p>
        )}

        {/* Responsive Dual Column Comparison Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-3">
          {/* Group 1 / Column A */}
          <div className="bg-gradient-to-b from-blue-50/80 to-blue-50/30 rounded-2xl p-4 border border-blue-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-blue-200/80">
                <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                  I
                </span>
                <h4 className="font-black text-xs uppercase tracking-wider text-blue-900 font-nepali">
                  {matchData.group1.title || "समूह I (Group I)"}
                </h4>
              </div>
              <ul className="space-y-2">
                {matchData.group1.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 p-2 rounded-xl bg-white/90 border border-blue-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                  >
                    {item.badge && (
                      <span className="shrink-0 min-w-[24px] h-6 px-1.5 rounded-lg bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center font-nepali">
                        {item.badge}
                      </span>
                    )}
                    <span className="font-bold text-slate-800 text-sm leading-snug font-nepali pt-0.5">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Group 2 / Column B */}
          <div className="bg-gradient-to-b from-emerald-50/80 to-emerald-50/30 rounded-2xl p-4 border border-emerald-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-emerald-200/80">
                <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                  II
                </span>
                <h4 className="font-black text-xs uppercase tracking-wider text-emerald-900 font-nepali">
                  {matchData.group2.title || "समूह II (Group II)"}
                </h4>
              </div>
              <ul className="space-y-2">
                {matchData.group2.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 p-2 rounded-xl bg-white/90 border border-emerald-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                  >
                    {item.badge && (
                      <span className="shrink-0 min-w-[24px] h-6 px-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center font-nepali">
                        {item.badge}
                      </span>
                    )}
                    <span className="font-bold text-slate-800 text-sm leading-snug font-nepali pt-0.5">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Optional Outro Prompt */}
        {matchData.outro && (
          <p className="font-bold text-slate-800 leading-relaxed font-nepali text-sm md:text-base pt-1">
            {matchData.outro}
          </p>
        )}
      </div>
    );
  }

  // 2. Try Markdown Table Parser
  const tableData = parseMarkdownTable(text);
  if (tableData) {
    return (
      <div className={`space-y-3 ${className}`}>
        {tableData.nonTableText && (
          <p className="font-bold text-slate-900 leading-relaxed font-nepali text-base md:text-lg whitespace-pre-line">
            {tableData.nonTableText}
          </p>
        )}
        <div className="overflow-x-auto my-3 rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-sm font-nepali">
            <thead className="bg-slate-100 text-slate-900 font-black border-b border-slate-200">
              <tr>
                {tableData.headers.map((h, i) => (
                  <th key={i} className="py-3 px-4 uppercase text-xs tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {tableData.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/60 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-3 px-4 font-semibold text-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 3. Standard Question (Preserve line breaks, enhance readability with whitespace-pre-line)
  return (
    <div
      className={`font-bold text-slate-900 tracking-tight leading-relaxed font-nepali whitespace-pre-line ${
        size === "lg" ? "text-lg md:text-2xl" : size === "sm" ? "text-sm md:text-base" : "text-base md:text-xl"
      } ${className}`}
    >
      {text}
    </div>
  );
}
