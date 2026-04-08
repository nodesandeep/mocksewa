// ── All TypeScript interfaces for MockSewa ──────────────────────────────

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_admin: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ── Content Hierarchy ─────────────────────────────────────────────────────
export interface Module {
  id: number;
  title: string;
}

export interface Course {
  id: number;
  title: string;
  module_id: number;
}

export interface Chapter {
  id: number;
  title: string;
  course_id: number;
  pdf_url: string | null;
  quiz_id: number | null;
  is_weekly_test: boolean;
}

// ── Quiz ──────────────────────────────────────────────────────────────────
export interface Question {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
  negative_marks: number;
}

export interface QuestionWithAnswer extends Question {
  correct_index: number;
  explanation: string | null;
}

export interface QuizStartResponse {
  session_id: number;
  questions: Question[];
  time_limit_seconds: number;
}

export interface AnswerSubmit {
  question_id: number;
  selected_index: number | null;
  is_flagged: boolean;
}

export interface QuizScoreBreakdown {
  total_questions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  raw_score: number;
  total_marks: number;
  percentage: number;
}

export interface QuizResult {
  session_id: number;
  score_breakdown: QuizScoreBreakdown;
  leaderboard_rank: number | null;
  questions_with_answers?: QuestionWithAnswer[];
}

// ── Video ─────────────────────────────────────────────────────────────────
export interface VideoProgressOut {
  chapter_id: number;
  watch_percent: number;
  is_completed: boolean;
  last_position_seconds: number;
}

// ── Dashboard / Analytics ─────────────────────────────────────────────────
export interface ChapterStatus {
  chapter_id: number;
  chapter_title: string;
  score_percent: number;
  attempts: number;
}

export interface DashboardResponse {
  user: User;
  next_chapter: Chapter | null;
  last_quiz_score: number | null;
  total_quizzes: number;
  chapter_mastery: ChapterStatus[];
}

export interface RadarEntry {
  subject: string;
  score: number;
  fullMark: number;
}

// ── Leaderboard ───────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  full_name: string;
  score: number;
  quiz_count: number;
}

// ── Admin ─────────────────────────────────────────────────────────────────
export interface DryRunReport {
  total_rows: number;
  valid_rows: number;
  errors: { row: number; messages: string[] }[];
}

export interface AdminStats {
  total_courses: number;
  total_subjects: number;
  total_modules: number;
  total_questions: number;
  total_users: number;
}
