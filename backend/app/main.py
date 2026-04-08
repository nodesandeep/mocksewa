from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import create_db_and_tables
from .api import admin, auth, leaderboard, quiz, student, video


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title="MockSewa API",
    version="2.0.0",
    description="High-performance exam platform — Antigravity Architecture",
    lifespan=lifespan,
)

# ─── CORS ─────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open gate for Vercel/Railway Production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(quiz.router)
app.include_router(student.router)
app.include_router(video.router)
app.include_router(leaderboard.router)


@app.get("/", tags=["Health"])
def root():
    return {
        "service": "MockSewa API",
        "version": "2.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
