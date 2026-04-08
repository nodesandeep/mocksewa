"""
Real-time Leaderboard via WebSockets.
Students connect and receive live rank updates after every quiz submission.
"""
import asyncio
import json
from typing import List

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlmodel import Session, func, select

from ..database import get_session, engine
from ..models import QuizSession, User
from sqlmodel import Session as SyncSession

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


# ─── Connection Manager ───────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        message = json.dumps(data)
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)
        for conn in dead:
            self.disconnect(conn)


manager = ConnectionManager()


def compute_leaderboard(limit: int = 20) -> List[dict]:
    """Compute top students by average score across all completed quiz sessions."""
    with SyncSession(engine) as db:
        # Aggregate per user: sum of scores, count of sessions
        rows = db.exec(
            select(
                QuizSession.user_id,
                func.sum(QuizSession.raw_score).label("total_score"),
                func.count(QuizSession.id).label("quiz_count"),
            )
            .where(QuizSession.is_completed == True)
            .where(QuizSession.raw_score != None)
            .group_by(QuizSession.user_id)
            .order_by(func.sum(QuizSession.raw_score).desc())
            .limit(limit)
        ).all()

        results = []
        for rank, row in enumerate(rows, start=1):
            user = db.get(User, row.user_id)
            results.append(
                {
                    "rank": rank,
                    "user_id": row.user_id,
                    "full_name": user.full_name or user.email.split("@")[0] if user else "Unknown",
                    "score": round(float(row.total_score or 0), 2),
                    "quiz_count": row.quiz_count,
                }
            )
        return results


async def broadcast_leaderboard():
    """Called after each quiz submission to push fresh rankings."""
    data = compute_leaderboard()
    await manager.broadcast({"type": "leaderboard_update", "data": data})


# ─── WebSocket Endpoint ───────────────────────────────────────────────────
@router.websocket("/ws")
async def leaderboard_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send current leaderboard immediately on connect
        current = compute_leaderboard()
        await websocket.send_text(
            json.dumps({"type": "leaderboard_update", "data": current})
        )
        # Keep connection alive — server pushes updates, client just listens
        while True:
            await asyncio.sleep(30)  # heartbeat every 30s
            await websocket.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ─── REST fallback ────────────────────────────────────────────────────────
@router.get("/top")
def get_top_leaderboard():
    return compute_leaderboard(20)
