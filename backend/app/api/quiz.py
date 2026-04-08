"""
Quiz Engine API — Start session, submit answers, score with formula:
  Score = (Correct × marks) - (Wrong × 0.2)
"""
import random
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..auth import get_current_user
from ..database import get_session
from ..models import Analytics, Question, QuizAttempt, QuizSession, User
from ..schemas import (
    AnswerSubmit,
    QuizResult,
    QuizScoreBreakdown,
    QuizStartRequest,
    QuizStartResponse,
    QuizSubmitRequest,
    QuestionOut,
)

router = APIRouter(prefix="/quiz", tags=["Quiz"])


# ─── Start a Quiz Session ─────────────────────────────────────────────────
@router.post("/start", response_model=QuizStartResponse)
def start_quiz(
    payload: QuizStartRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    questions = db.exec(
        select(Question).where(Question.chapter_id == payload.chapter_id)
    ).all()

    if not questions:
        raise HTTPException(404, "No questions found for this chapter")

    # Shuffle for each session
    shuffled = random.sample(questions, len(questions))

    session = QuizSession(
        user_id=current_user.id,
        chapter_id=payload.chapter_id,
        time_limit_seconds=900,
        total_marks=sum(q.marks for q in shuffled),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Pre-create empty attempt slots for all questions
    for q in shuffled:
        attempt = QuizAttempt(
            session_id=session.id,
            question_id=q.id,
        )
        db.add(attempt)
    db.commit()

    return QuizStartResponse(
        session_id=session.id,
        questions=[QuestionOut.model_validate(q) for q in shuffled],
        time_limit_seconds=session.time_limit_seconds,
    )


# ─── Flag a Question ─────────────────────────────────────────────────────
@router.patch("/session/{session_id}/flag/{question_id}")
def flag_question(
    session_id: int,
    question_id: int,
    flagged: bool = True,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    attempt = db.exec(
        select(QuizAttempt)
        .where(QuizAttempt.session_id == session_id)
        .where(QuizAttempt.question_id == question_id)
    ).first()
    if not attempt:
        raise HTTPException(404, "Attempt not found")
    attempt.is_flagged = flagged
    db.add(attempt)
    db.commit()
    return {"flagged": flagged}


# ─── Submit Quiz & Calculate Score ───────────────────────────────────────
@router.post("/submit", response_model=QuizResult)
def submit_quiz(
    payload: QuizSubmitRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    session = db.get(QuizSession, payload.session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(403, "Forbidden")
    if session.is_completed:
        raise HTTPException(400, "Quiz already submitted")

    answer_map: dict[int, AnswerSubmit] = {a.question_id: a for a in payload.answers}
    attempts = db.exec(
        select(QuizAttempt).where(QuizAttempt.session_id == payload.session_id)
    ).all()

    correct_count = 0
    wrong_count = 0
    unanswered_count = 0
    raw_score = 0.0

    for attempt in attempts:
        question = db.get(Question, attempt.question_id)
        submitted = answer_map.get(attempt.question_id)

        if submitted is None or submitted.selected_index is None:
            unanswered_count += 1
            attempt.selected_index = None
            attempt.is_correct = None
        elif submitted.selected_index == question.correct_index:
            correct_count += 1
            raw_score += question.marks
            attempt.selected_index = submitted.selected_index
            attempt.is_correct = True
            attempt.is_flagged = submitted.is_flagged
        else:
            wrong_count += 1
            raw_score -= 0.2
            attempt.selected_index = submitted.selected_index
            attempt.is_correct = False
            attempt.is_flagged = submitted.is_flagged

        attempt.answered_at = datetime.now(timezone.utc)
        db.add(attempt)

    # Update session
    session.is_completed = True
    session.submitted_at = datetime.now(timezone.utc)
    session.raw_score = raw_score
    db.add(session)

    # Record analytics per chapter
    analytics = Analytics(
        user_id=current_user.id,
        chapter_id=session.chapter_id,
        session_id=session.id,
        correct_count=correct_count,
        wrong_count=wrong_count,
        unanswered_count=unanswered_count,
        score=raw_score,
    )
    db.add(analytics)

    db.commit()

    percentage = (raw_score / session.total_marks * 100) if session.total_marks else 0

    return QuizResult(
        session_id=session.id,
        score_breakdown=QuizScoreBreakdown(
            total_questions=len(attempts),
            correct=correct_count,
            wrong=wrong_count,
            unanswered=unanswered_count,
            raw_score=raw_score,
            total_marks=session.total_marks or 0,
            percentage=round(percentage, 2),
        ),
    )


# ─── Get Past Sessions ────────────────────────────────────────────────────
@router.get("/history")
def quiz_history(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    sessions = db.exec(
        select(QuizSession)
        .where(QuizSession.user_id == current_user.id)
        .where(QuizSession.is_completed == True)
    ).all()
    return [
        {
            "session_id": s.id,
            "chapter_id": s.chapter_id,
            "score": s.raw_score,
            "total_marks": s.total_marks,
            "submitted_at": s.submitted_at,
        }
        for s in sessions
    ]
