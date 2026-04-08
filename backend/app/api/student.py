"""
Student Dashboard API — Analytics, radar chart data, next lesson, weak areas.
"""
from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from ..auth import get_current_user
from ..database import get_session
from ..models import Analytics, Chapter, Course, Module, QuizSession, User, VideoProgress
from ..schemas import ChapterStatus, DashboardResponse, ModuleOut, UserOut

router = APIRouter(prefix="/student", tags=["Student"])


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # ── Last quiz score
    last_session = db.exec(
        select(QuizSession)
        .where(QuizSession.user_id == current_user.id)
        .where(QuizSession.is_completed == True)
        .order_by(QuizSession.submitted_at.desc())
    ).first()
    last_quiz_score = last_session.raw_score if last_session else None

    # ── Total quizzes completed
    all_sessions = db.exec(
        select(QuizSession)
        .where(QuizSession.user_id == current_user.id)
        .where(QuizSession.is_completed == True)
    ).all()

    # ── Next Chapter: first Chapter with no completed VideoProgress/Quiz
    completed_chapters = set(
        vp.chapter_id
        for vp in db.exec(
            select(VideoProgress)
            .where(VideoProgress.user_id == current_user.id)
            .where(VideoProgress.is_completed == True)
        ).all()
    )
    completed_quizzes = set(
        qs.chapter_id
        for qs in db.exec(
            select(QuizSession)
            .where(QuizSession.user_id == current_user.id)
            .where(QuizSession.is_completed == True)
        ).all()
    )
    all_completed = completed_chapters.union(completed_quizzes)

    next_chapter_obj = db.exec(
        select(Chapter)
        .where(Chapter.id.not_in(all_completed) if all_completed else True)
        .order_by(Chapter.id)
    ).first()

    # ── Chapter-wise mastery
    analytics_rows = db.exec(
        select(Analytics).where(Analytics.user_id == current_user.id)
    ).all()

    chapter_data: dict[int, dict] = {}
    for row in analytics_rows:
        if row.chapter_id not in chapter_data:
            chapter = db.get(Chapter, row.chapter_id)
            chapter_data[row.chapter_id] = {
                "chapter_id": row.chapter_id,
                "chapter_title": chapter.title if chapter else "Unknown",
                "total_score": 0.0,
                "total_marks": 0.0,
                "attempts": 0,
            }
        entry = chapter_data[row.chapter_id]
        entry["total_score"] += row.score
        entry["attempts"] += 1
        # Fetch total marks for this session
        session_obj = db.get(QuizSession, row.session_id)
        if session_obj and session_obj.total_marks:
            entry["total_marks"] += session_obj.total_marks

    mastery: List[ChapterStatus] = []
    for cid, data in chapter_data.items():
        pct = (
            (data["total_score"] / data["total_marks"] * 100)
            if data["total_marks"] > 0
            else 0.0
        )
        mastery.append(
            ChapterStatus(
                chapter_id=data["chapter_id"],
                chapter_title=data["chapter_title"],
                score_percent=round(pct, 2),
                attempts=data["attempts"],
            )
        )

    return DashboardResponse(
        user=UserOut.model_validate(current_user),
        next_chapter=next_chapter_obj,  # Uses automated validation
        last_quiz_score=last_quiz_score,
        total_quizzes=len(all_sessions),
        chapter_mastery=mastery,
    )


@router.get("/radar")
def radar_data(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Returns subject-wise mastery formatted for Recharts RadarChart."""
    analytics_rows = db.exec(
        select(Analytics).where(Analytics.user_id == current_user.id)
    ).all()

    chapter_data: dict[int, dict] = {}
    for row in analytics_rows:
        if row.chapter_id not in chapter_data:
            chapter = db.get(Chapter, row.chapter_id)
            chapter_data[row.chapter_id] = {
                "subject": chapter.title if chapter else "Unknown",
                "score": 0.0,
                "count": 0,
            }
        entry = chapter_data[row.chapter_id]
        entry["score"] += row.score
        entry["count"] += 1

    radar = []
    for data in chapter_data.values():
        avg = data["score"] / data["count"] if data["count"] else 0
        radar.append({"subject": data["subject"], "score": round(avg, 2), "fullMark": 100})

    return radar
