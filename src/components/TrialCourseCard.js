'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * TrialCourseCard — High-conversion free trial card with exam pattern visualizer.
 * Shows locked premium sets as a visual hook to drive "Buy Premium" conversions.
 */
export default function TrialCourseCard({ trial, onBuyPremium, onStartTrial }) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const {
    trialQuizId,
    parentCourseId,
    courseTitle,
    courseDescription,
    basePrice,
    discountedPrice,
    trialSetTitle,
    totalSets,
    timeLimit,
  } = trial;

  const lockedSets = Math.max(0, (totalSets || 1) - 1);
  const displayPrice = discountedPrice > 0 && discountedPrice < basePrice ? discountedPrice : basePrice;

  const handleStartTrial = () => {
    if (onStartTrial) {
      onStartTrial(trialQuizId);
      return;
    }
    router.push(`/student/quiz/${trialQuizId}?trial=1&courseId=${parentCourseId}`);
  };

  // Generate placeholder "exam set" rows for visual pattern
  const mockSetRows = Array.from({ length: Math.min(lockedSets, 8) }, (_, i) => ({
    num: i + 2,
    label: `Set ${i + 2}`,
    locked: true,
  }));

  return (
    <div
      className="trial-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated top glow bar */}
      <div className="trial-glow-bar" />

      {/* Header */}
      <div className="trial-header">
        <div className="trial-badge">
          <span className="trial-badge-dot" />
          FREE TRIAL
        </div>
        <div className="trial-price-tag">
          Rs. {displayPrice.toLocaleString()}
          <span className="trial-price-label">/premium</span>
        </div>
      </div>

      {/* Course title */}
      <div className="trial-title-block">
        <h3 className="trial-course-title">{courseTitle}</h3>
        <p className="trial-course-desc">{courseDescription || 'Start your exam preparation today.'}</p>
      </div>

      {/* Exam Pattern Visualizer */}
      <div className="trial-exam-pattern">
        <div className="trial-pattern-label">
          <span>📋 EXAM PATTERN</span>
          <span className="trial-pattern-count">{totalSets} Sets Total</span>
        </div>

        {/* Trial set — unlocked */}
        <div className="trial-set-row trial-set-unlocked">
          <div className="trial-set-icon">▶</div>
          <div className="trial-set-info">
            <span className="trial-set-title">{trialSetTitle || 'Set 1 — Free Trial'}</span>
            <span className="trial-set-meta">{timeLimit || 45} min · Unlocked</span>
          </div>
          <div className="trial-set-badge free">FREE</div>
        </div>

        {/* Locked premium sets */}
        <div className="trial-locked-container">
          {mockSetRows.map(row => (
            <div key={row.num} className="trial-set-row trial-set-locked">
              <div className="trial-set-icon locked">🔒</div>
              <div className="trial-set-info">
                <span className="trial-set-title blurred">████████████ Set {row.num}</span>
                <span className="trial-set-meta blurred">─── min · Premium</span>
              </div>
              <div className="trial-set-badge locked">LOCKED</div>
            </div>
          ))}
          {lockedSets > 8 && (
            <div className="trial-more-sets">
              +{lockedSets - 8} more sets in Premium →
            </div>
          )}
        </div>
      </div>

      {/* Social proof */}
      <div className="trial-social-proof">
        <div className="trial-proof-dot" />
        <span>500+ students enrolled · NEC License Exam</span>
      </div>

      {/* CTA Buttons */}
      <div className="trial-cta-group">
        <button
          onClick={() => onBuyPremium && onBuyPremium(trial)}
          className="trial-btn-premium"
        >
          <span className="trial-btn-icon">🚀</span>
          Unlock {lockedSets}+ Premium Sets
          {displayPrice > 0 && <span className="trial-btn-price">Rs. {displayPrice.toLocaleString()}</span>}
        </button>
        <button
          onClick={handleStartTrial}
          className="trial-btn-free"
        >
          Start Free Trial →
        </button>
      </div>

      <style jsx>{`
        .trial-card {
          position: relative;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 2rem;
          padding: 2rem;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          cursor: default;
        }
        .trial-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(59, 130, 246, 0.15);
        }
        .trial-glow-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #10b981, #3b82f6);
          background-size: 200% 100%;
          animation: shimmer 2s infinite linear;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .trial-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }
        .trial-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.85rem;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          border-radius: 999px;
          font-size: 0.6rem;
          font-weight: 900;
          color: #10b981;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .trial-badge-dot {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .trial-price-tag {
          font-size: 0.75rem;
          font-weight: 900;
          color: #f59e0b;
        }
        .trial-price-label {
          font-size: 0.55rem;
          color: #64748b;
          margin-left: 0.25rem;
          font-weight: 600;
        }
        .trial-title-block {
          margin-bottom: 1.5rem;
        }
        .trial-course-title {
          font-size: 1.25rem;
          font-weight: 900;
          color: #f8fafc;
          line-height: 1.2;
          margin-bottom: 0.5rem;
        }
        .trial-course-desc {
          font-size: 0.7rem;
          color: #94a3b8;
          line-height: 1.6;
        }
        .trial-exam-pattern {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(30, 58, 138, 0.4);
          border-radius: 1.25rem;
          padding: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .trial-pattern-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.6rem;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 0.75rem;
        }
        .trial-pattern-count {
          color: #3b82f6;
        }
        .trial-set-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 0.75rem;
          border-radius: 0.75rem;
          margin-bottom: 0.4rem;
        }
        .trial-set-unlocked {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .trial-set-locked {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(30, 41, 59, 0.6);
        }
        .trial-set-icon {
          font-size: 0.75rem;
          color: #10b981;
          width: 1.25rem;
          text-align: center;
          flex-shrink: 0;
        }
        .trial-set-icon.locked {
          color: #334155;
          font-size: 0.65rem;
        }
        .trial-set-info {
          flex: 1;
          min-width: 0;
        }
        .trial-set-title {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          color: #cbd5e1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .trial-set-title.blurred {
          color: #334155;
          filter: blur(3px);
          user-select: none;
        }
        .trial-set-meta {
          display: block;
          font-size: 0.6rem;
          color: #475569;
          font-weight: 600;
        }
        .trial-set-meta.blurred {
          color: #1e293b;
          filter: blur(2px);
          user-select: none;
        }
        .trial-set-badge {
          font-size: 0.55rem;
          font-weight: 900;
          padding: 0.2rem 0.5rem;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          flex-shrink: 0;
        }
        .trial-set-badge.free {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }
        .trial-set-badge.locked {
          background: rgba(30, 41, 59, 0.8);
          color: #475569;
          border: 1px solid rgba(51, 65, 85, 0.6);
        }
        .trial-locked-container {
          position: relative;
        }
        .trial-locked-container::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(transparent, rgba(15, 23, 42, 0.9));
          pointer-events: none;
          border-radius: 0 0 0.5rem 0.5rem;
        }
        .trial-more-sets {
          font-size: 0.6rem;
          font-weight: 900;
          color: #3b82f6;
          text-align: center;
          padding: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .trial-social-proof {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.6rem;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 1.25rem;
        }
        .trial-proof-dot {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .trial-cta-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .trial-btn-premium {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #1d4ed8 100%);
          color: white;
          font-weight: 900;
          font-size: 0.75rem;
          border-radius: 1rem;
          border: none;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.4);
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .trial-btn-premium::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%);
        }
        .trial-btn-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 35px rgba(37, 99, 235, 0.5);
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #2563eb 100%);
        }
        .trial-btn-premium:active {
          transform: translateY(0);
        }
        .trial-btn-icon {
          font-size: 1rem;
        }
        .trial-btn-price {
          font-size: 0.65rem;
          padding: 0.15rem 0.5rem;
          background: rgba(255,255,255,0.15);
          border-radius: 999px;
          margin-left: 0.25rem;
        }
        .trial-btn-free {
          padding: 0.75rem;
          background: transparent;
          color: #64748b;
          font-weight: 700;
          font-size: 0.7rem;
          border-radius: 1rem;
          border: 1px solid rgba(51, 65, 85, 0.6);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .trial-btn-free:hover {
          background: rgba(30, 41, 59, 0.8);
          color: #94a3b8;
          border-color: rgba(51, 65, 85, 0.9);
        }
      `}</style>
    </div>
  );
}
