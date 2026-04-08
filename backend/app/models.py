from typing import List, Optional
from datetime import datetime
from sqlmodel import Field, Relationship, SQLModel


# ─────────────────────────────────────────────
# USER & AUTH
# ─────────────────────────────────────────────
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    is_admin: bool = Field(default=False)
    is_approved: bool = Field(default=False)
    full_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    quiz_sessions: List["QuizSession"] = Relationship(back_populates="user")
    video_progress: List["VideoProgress"] = Relationship(back_populates="user")
    analytics: List["Analytics"] = Relationship(back_populates="user")
    access: List["UserCourseAccess"] = Relationship(back_populates="user")


class RefreshToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(unique=True, index=True)
    user_id: int = Field(foreign_key="user.id")
    expires_at: datetime
    is_revoked: bool = Field(default=False)


# ─────────────────────────────────────────────
# ACCESS CONTROL
# ─────────────────────────────────────────────
class UserCourseAccess(SQLModel, table=True):
    user_id: int = Field(foreign_key="user.id", primary_key=True)
    module_id: int = Field(foreign_key="module.id", primary_key=True)

    user: User = Relationship(back_populates="access")
    module: "Module" = Relationship(back_populates="access")


# ─────────────────────────────────────────────
# LMS HIERARCHY (Module -> Course -> Chapter)
# ─────────────────────────────────────────────
class Module(SQLModel, table=True):
    """The top level (e.g., Electrical Engineering)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    courses: List["Course"] = Relationship(back_populates="module")
    access: List[UserCourseAccess] = Relationship(back_populates="module")


class Course(SQLModel, table=True):
    """The mid level (e.g., Level 5 Supervisor Prep)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    module_id: int = Field(foreign_key="module.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    module: Module = Relationship(back_populates="courses")
    chapters: List["Chapter"] = Relationship(back_populates="course")


class Chapter(SQLModel, table=True):
    """The bottom level (e.g., Power Systems) - contains PDF or Quiz"""
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    course_id: int = Field(foreign_key="course.id")
    
    # Content types
    pdf_url: Optional[str] = None
    quiz_id: Optional[int] = None  # Self-referencing ID or external quiz ID
    is_weekly_test: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    course: Course = Relationship(back_populates="chapters")
    questions: List["Question"] = Relationship(back_populates="chapter")


# ─────────────────────────────────────────────
# QUESTION BANK
# ─────────────────────────────────────────────
class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    chapter_id: int = Field(foreign_key="chapter.id")
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_index: int          # 0=A, 1=B, 2=C, 3=D
    explanation: Optional[str] = None
    marks: float = Field(default=1.0)
    negative_marks: float = Field(default=0.2)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    chapter: Chapter = Relationship(back_populates="questions")
    attempts: List["QuizAttempt"] = Relationship(back_populates="question")


# ─────────────────────────────────────────────
# QUIZ ENGINE
# ─────────────────────────────────────────────
class QuizSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    chapter_id: int = Field(foreign_key="chapter.id")
    started_at: datetime = Field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = None
    is_completed: bool = Field(default=False)
    # Scoring formula: (correct × marks) - (wrong × 0.2)
    raw_score: Optional[float] = None
    total_marks: Optional[float] = None
    time_limit_seconds: int = Field(default=900)  # 15 min default

    user: User = Relationship(back_populates="quiz_sessions")
    attempts: List["QuizAttempt"] = Relationship(back_populates="session")


class QuizAttempt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="quizsession.id")
    question_id: int = Field(foreign_key="question.id")
    selected_index: Optional[int] = None   # None = unanswered
    is_flagged: bool = Field(default=False)
    is_correct: Optional[bool] = None
    answered_at: Optional[datetime] = None

    session: QuizSession = Relationship(back_populates="attempts")
    question: Question = Relationship(back_populates="attempts")


# ─────────────────────────────────────────────
# ANALYTICS & VIDEO (Legacy/Placeholder)
# ─────────────────────────────────────────────
class Analytics(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    chapter_id: int = Field(foreign_key="chapter.id")
    session_id: int = Field(foreign_key="quizsession.id")
    correct_count: int = Field(default=0)
    wrong_count: int = Field(default=0)
    unanswered_count: int = Field(default=0)
    score: float = Field(default=0.0)
    recorded_at: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="analytics")


class VideoProgress(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    chapter_id: int = Field(foreign_key="chapter.id")
    watch_percent: float = Field(default=0.0)   # 0.0 – 100.0
    is_completed: bool = Field(default=False)
    last_position_seconds: int = Field(default=0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="video_progress")

