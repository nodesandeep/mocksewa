"""
Video Progress API — Track watch percentage; auto-complete at 90%.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..auth import get_current_user
from ..database import get_session
from ..models import Chapter, User, VideoProgress
from ..schemas import VideoProgressOut, VideoProgressUpdate

router = APIRouter(prefix="/video", tags=["Video"])

COMPLETION_THRESHOLD = 90.0  # percent


@router.post("/progress", response_model=VideoProgressOut)
def update_progress(
    payload: VideoProgressUpdate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    chapter = db.get(Chapter, payload.chapter_id)
    if not chapter:
        raise HTTPException(404, "Chapter not found")

    existing = db.exec(
        select(VideoProgress)
        .where(VideoProgress.user_id == current_user.id)
        .where(VideoProgress.chapter_id == payload.chapter_id)
    ).first()

    if existing:
        existing.watch_percent = max(existing.watch_percent, payload.watch_percent)
        existing.last_position_seconds = payload.last_position_seconds
        existing.updated_at = datetime.now(timezone.utc)
        if existing.watch_percent >= COMPLETION_THRESHOLD:
            existing.is_completed = True
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        is_complete = payload.watch_percent >= COMPLETION_THRESHOLD
        progress = VideoProgress(
            user_id=current_user.id,
            chapter_id=payload.chapter_id,
            watch_percent=payload.watch_percent,
            last_position_seconds=payload.last_position_seconds,
            is_completed=is_complete,
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
        return progress


@router.get("/progress/{chapter_id}", response_model=VideoProgressOut)
def get_progress(
    chapter_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    progress = db.exec(
        select(VideoProgress)
        .where(VideoProgress.user_id == current_user.id)
        .where(VideoProgress.chapter_id == chapter_id)
    ).first()

    if not progress:
        return VideoProgressOut(
            chapter_id=chapter_id,
            watch_percent=0.0,
            is_completed=False,
            last_position_seconds=0,
        )
    return progress


@router.get("/completed")
def completed_chapters(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rows = db.exec(
        select(VideoProgress)
        .where(VideoProgress.user_id == current_user.id)
        .where(VideoProgress.is_completed == True)
    ).all()
    return [r.chapter_id for r in rows]
