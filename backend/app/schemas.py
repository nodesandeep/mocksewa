from typing import List, Optional
from pydantic import BaseModel, EmailStr


# ─── Auth ─────────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_admin: bool
    is_approved: bool

    class Config:
        from_attributes = True


# ─── Hierarchy ────────────────────────────────────────────────────────────
class UserCourseAccessCreate(BaseModel):
    user_id: int
    module_id: int


class UserCourseAccessOut(BaseModel):
    user_id: int
    module_id: int

    class Config:
        from_attributes = True


class ModuleCreate(BaseModel):
    title: str


class ModuleOut(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True


class CourseCreate(BaseModel):
    title: str
    module_id: int


class CourseOut(BaseModel):
    id: int
    title: str
    module_id: int

    class Config:
        from_attributes = True


class ChapterCreate(BaseModel):
    title: str
    course_id: int
    pdf_url: Optional[str] = None
    quiz_id: Optional[int] = None
    is_weekly_test: bool = False


class ChapterOut(BaseModel):
    id: int
    title: str
    course_id: int
    pdf_url: Optional[str]
    quiz_id: Optional[int]
    is_weekly_test: bool

    class Config:
        from_attributes = True


# ─── Questions ───────────────────────────────────────────────────────────
class QuestionOut(BaseModel):
    id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    marks: float
    negative_marks: float

    class Config:
        from_attributes = True


class QuestionWithAnswer(QuestionOut):
    correct_index: int
    explanation: Optional[str]


# ─── CSV Upload ───────────────────────────────────────────────────────────
class CSVRowError(BaseModel):
    row: int
    messages: List[str]


class DryRunReport(BaseModel):
    total_rows: int
    valid_rows: int
    errors: List[CSVRowError]


class DryRunResponse(BaseModel):
    status: str
    data: DryRunReport


# ─── Quiz Engine ──────────────────────────────────────────────────────────
class QuizStartRequest(BaseModel):
    chapter_id: int


class QuizStartResponse(BaseModel):
    session_id: int
    questions: List[QuestionOut]
    time_limit_seconds: int


class AnswerSubmit(BaseModel):
    question_id: int
    selected_index: Optional[int] = None  # None = skip
    is_flagged: bool = False


class QuizSubmitRequest(BaseModel):
    session_id: int
    answers: List[AnswerSubmit]


class QuizScoreBreakdown(BaseModel):
    total_questions: int
    correct: int
    wrong: int
    unanswered: int
    raw_score: float
    total_marks: float
    percentage: float


class QuizResult(BaseModel):
    session_id: int
    score_breakdown: QuizScoreBreakdown
    leaderboard_rank: Optional[int] = None
    questions_with_answers: Optional[List[QuestionWithAnswer]] = None


# ─── Video ────────────────────────────────────────────────────────────────
class VideoProgressUpdate(BaseModel):
    chapter_id: int
    watch_percent: float
    last_position_seconds: int


class VideoProgressOut(BaseModel):
    chapter_id: int
    watch_percent: float
    is_completed: bool
    last_position_seconds: int

    class Config:
        from_attributes = True


# ─── Dashboard / Analytics ────────────────────────────────────────────────
class ChapterStatus(BaseModel):
    chapter_id: int
    chapter_title: str
    score_percent: float
    attempts: int


class DashboardResponse(BaseModel):
    user: UserOut
    next_chapter: Optional[ChapterOut]
    last_quiz_score: Optional[float]
    total_quizzes: int
    chapter_mastery: List[ChapterStatus]



# ─── Leaderboard ─────────────────────────────────────────────────────────
class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    full_name: str
    score: float
    quiz_count: int
