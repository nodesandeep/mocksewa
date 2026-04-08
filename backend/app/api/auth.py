"""
Auth API — Register, Login, Refresh, Logout.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from ..auth import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    revoke_refresh_token,
    store_refresh_token,
    validate_refresh_token,
    verify_password,
)
from ..database import get_session
from ..models import User
from ..schemas import RefreshRequest, TokenResponse, UserOut, UserRegister

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserRegister, db: Session = Depends(get_session)):
    existing = db.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(400, "Email already registered")
    is_first_user = db.exec(select(User)).first() is None

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        is_admin=is_first_user,
        is_approved=is_first_user,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_session),
):
    user = db.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")

    if not user.is_approved:
        raise HTTPException(403, "ACCOUNT_PENDING_APPROVAL")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    store_refresh_token(user.id, refresh_token, db)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh_tokens(payload: RefreshRequest, db: Session = Depends(get_session)):
    user = validate_refresh_token(payload.refresh_token, db)
    revoke_refresh_token(payload.refresh_token, db)  # Rotate: invalidate old
    new_access = create_access_token({"sub": str(user.id)})
    new_refresh = create_refresh_token({"sub": str(user.id)})
    store_refresh_token(user.id, new_refresh, db)
    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


@router.post("/logout", status_code=204)
def logout(payload: RefreshRequest, db: Session = Depends(get_session)):
    revoke_refresh_token(payload.refresh_token, db)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
