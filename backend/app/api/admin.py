"""
Admin API — Protected by get_current_admin dependency.
Covers: Hierarchy CRUD, CSV dry-run / commit, question management.
"""
import io
from typing import List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session, select

from ..auth import get_current_admin
from ..database import get_session
from ..models import Chapter, Course, Module, Question, User, UserCourseAccess
from ..schemas import (
    ChapterCreate,
    ChapterOut,
    CourseCreate,
    CourseOut,
    CSVRowError,
    DryRunReport,
    DryRunResponse,
    ModuleCreate,
    ModuleOut,
    UserOut,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Module CRUD (Top Level) ───────────────────────────────────────────────
@router.get("/modules", response_model=List[ModuleOut])
def list_modules(
    db: Session = Depends(get_session),
    _admin: User = Depends(get_current_admin),
):
    return db.exec(select(Module)).all()


@router.post("/modules", response_model=ModuleOut, status_code=201)
def create_module(
    payload: ModuleCreate,
    db: Session = Depends(get_session),
    _admin: User = Depends(get_current_admin),
):
    module = Module(**payload.model_dump())
    db.add(module)
    db.commit()
    db.refresh(module)
    return module


@router.delete("/modules/{module_id}", status_code=204)
def delete_module(
    module_id: int,
    db: Session = Depends(get_session),
    _admin: User = Depends(get_current_admin),
):
    module = db.get(Module, module_id)
    if not module:
        raise HTTPException(404, "Module not found")
    db.delete(module)
    db.commit()


# ─── Course CRUD (Mid Level) ─────────────────────────────────────────────────
@router.get("/courses", response_model=List[CourseOut])
def list_courses(
    module_id: Optional[int] = None,
    db: Session = Depends(get_session),
    _admin: User = Depends(get_current_admin),
):
    q = select(Course)
    if module_id:
        q = q.where(Course.module_id == module_id)
    return db.exec(q).all()


@router.post("/courses", response_model=CourseOut, status_code=201)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_session),
    _admin: User = Depends(get_current_admin),
):
    course = Course(**payload.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/courses/{course_id}", status_code=204)
def delete_course(
    course_id: int,
    db: Session = Depends(get_session),
    _admin: User = Depends(get_current_admin),
):
    course = db.get(Course, course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    db.delete(course)
    db.commit()


# ─── Chapter CRUD (Bottom Level) ──────────────────────────────────────────
@router.get("/chapters", response_model=List[ChapterOut])
def list_chapters(
    course_id: Optional[int] = None,
    db: Session = Depends(get_session),
    _admin: User = Depends(get_current_admin),
):
    q = select(Chapter)
    if course_id:
        q = q.where(Chapter.course_id == course_id)
    return db.exec(q).all()


@router.post("/chapters", response_model=ChapterOut, status_code=201)
def create_chapter(
    payload: ChapterCreate,
    db: Session = Depends(get_session),
    _admin: User = Depends(get_current_admin),
):
    chapter = Chapter(**payload.model_dump())
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter


@router.delete("/chapters/{chapter_id}", status_code=204)
def delete_chapter(
    chapter_id: int,
    db: Session = Depends(get_session),
    _admin: User = Depends(get_current_admin),
):
    chapter = db.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(404, "Chapter not found")
    db.delete(chapter)
    db.commit()




# ─── CSV Upload: Dry-Run Validation ───────────────────────────────────────
REQUIRED_COLUMNS = {"question", "option_a", "option_b", "option_c", "option_d", "correct_index"}


@router.post("/questions/upload/dry-run", response_model=DryRunResponse)
async def dry_run_csv(
    chapter_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    _admin: User = Depends(get_current_admin),
):
    # Verify chapter exists
    chapter = db.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(404, f"Chapter {chapter_id} not found")

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(400, f"CSV parse error: {e}")

    # Check all required columns are present
    missing_cols = REQUIRED_COLUMNS - set(df.columns)
    if missing_cols:
        raise HTTPException(400, f"Missing columns: {missing_cols}")

    errors: List[CSVRowError] = []
    valid_rows = 0

    for index, row in df.iterrows():
        row_errors: List[str] = []

        # 1. Question length
        question_text = str(row.get("question", "")).strip()
        if not question_text or len(question_text) < 10:
            row_errors.append("Question too short or empty (min 10 chars)")

        # 2. All 4 options present and non-empty
        options = [row.get(f"option_{x}", None) for x in ["a", "b", "c", "d"]]
        if any(pd.isnull(opt) or str(opt).strip() == "" for opt in options):
            row_errors.append("One or more options are missing/empty")

        # 3. correct_index must be integer 0–3
        try:
            ci = int(row["correct_index"])
            if not (0 <= ci <= 3):
                raise ValueError
        except (ValueError, TypeError):
            row_errors.append(
                f"Invalid correct_index '{row.get('correct_index')}' — must be 0, 1, 2, or 3"
            )

        if row_errors:
            errors.append(CSVRowError(row=int(index) + 2, messages=row_errors))
        else:
            valid_rows += 1

    report = DryRunReport(total_rows=len(df), valid_rows=valid_rows, errors=errors)
    status_label = "OK — Ready to commit" if not errors else "Errors found — fix before committing"
    return DryRunResponse(status=status_label, data=report)


# ─── CSV Upload: Commit ───────────────────────────────────────────────────
@router.post("/questions/upload/commit", status_code=201)
async def commit_csv(
    chapter_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    _admin: User = Depends(get_current_admin),
):
    chapter = db.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(404, f"Chapter {chapter_id} not found")

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(400, f"CSV parse error: {e}")

    inserted = 0
    skipped = 0

    for _, row in df.iterrows():
        try:
            question = Question(
                chapter_id=chapter_id,
                question_text=str(row["question"]).strip(),
                option_a=str(row["option_a"]).strip(),
                option_b=str(row["option_b"]).strip(),
                option_c=str(row["option_c"]).strip(),
                option_d=str(row["option_d"]).strip(),
                correct_index=int(row["correct_index"]),
                explanation=str(row.get("explanation", "")).strip() or None,
                marks=float(row.get("marks", 1.0)),
                negative_marks=float(row.get("negative_marks", 0.2)),
            )
            db.add(question)
            inserted += 1
        except Exception:
            skipped += 1

    db.commit()
    return {
        "status": "committed",
        "inserted": inserted,
        "skipped": skipped,
        "chapter_id": chapter_id,
    }


# ─── Stats Overview ───────────────────────────────────────────────────────
@router.get("/stats")
def admin_stats(
    db: Session = Depends(get_session),
    _admin: User = Depends(get_current_admin),
):
    return {
        "total_modules": len(db.exec(select(Module)).all()),
        "total_courses": len(db.exec(select(Course)).all()),
        "total_chapters": len(db.exec(select(Chapter)).all()),
        "total_questions": len(db.exec(select(Question)).all()),
        "total_users": len(db.exec(select(User)).all()),
    }


# ─── Gatekeeper / User Management ─────────────────────────────────────────
@router.get("/users/pending", response_model=List[UserOut])
def get_pending_users(
    db: Session = Depends(get_session),
    _admin: User = Depends(get_current_admin),
):
    """Fetch users waiting for admin approval"""
    return db.exec(select(User).where(User.is_approved == False)).all()


@router.patch("/users/{user_id}/approve")
def approve_user(
    user_id: int,
    module_id: int,
    make_admin: bool = False,
    db: Session = Depends(get_session),
    _admin: User = Depends(get_current_admin),
):
    """Approve a user and optionally link them to a top-level module."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
        
    user.is_approved = True
    user.is_admin = make_admin
    
    # Assign to Module immediately
    access = UserCourseAccess(user_id=user_id, module_id=module_id)
    db.add(access)
    db.commit()
    
    return {"message": "User approved and assigned to module."}
