"""WebSocket endpoint for the live interview loop."""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlmodel import Session as DBSession

from app.auth.deps import get_current_user_ws
from app.config import get_settings
from app.db import engine
from app.interview.evaluator import evaluate_answer
from app.interview.orchestrator import generate_next_question
from app.interview.reporter import build_report
from app.models.session import Session as InterviewSession
from app.routers.settings import resolve_provider_call

router = APIRouter(tags=["interview"])
logger = logging.getLogger(__name__)

HEARTBEAT_SECONDS = 20


async def _send(ws: WebSocket, msg: dict) -> None:
    await ws.send_text(json.dumps(msg))


@router.websocket("/ws/interview/{session_id}")
async def interview_ws(websocket: WebSocket, session_id: int):
    await websocket.accept()

    # Authenticate via query param token
    token = websocket.query_params.get("token", "")
    with DBSession(engine) as db:
        user = get_current_user_ws(token, db)
        if user is None:
            await _send(websocket, {"type": "error", "message": "Unauthorized"})
            await websocket.close(code=4001)
            return

        session = db.get(InterviewSession, session_id)
        if session is None or session.user_id != user.id:
            await _send(websocket, {"type": "error", "message": "Session not found"})
            await websocket.close(code=4004)
            return

        if session.status == "completed":
            await _send(websocket, {"type": "error", "message": "Session already completed"})
            await websocket.close(code=4002)
            return

        settings = get_settings()
        try:
            call = resolve_provider_call(db, user.id)
        except Exception as exc:  # noqa: BLE001
            await _send(websocket, {"type": "error", "message": str(exc)})
            await websocket.close(code=4003)
            return

        # Mark session active
        if session.status == "configured":
            session.status = "active"
            session.started_at = datetime.now(timezone.utc)
            db.add(session)
            db.commit()
            db.refresh(session)

        await _send(websocket, {"type": "session_start", "session_id": session.id,
                                 "mode": session.mode, "num_questions": session.num_questions})

        last_score: float | None = None
        last_topic: str | None = None
        follow_up_recommended: bool = False
        token_count: int = 0

        try:
            while True:
                # ── Generate next question ─────────────────────────────────────
                from sqlmodel import select as _sel
                from app.models.question import Question
                asked_count = len(db.exec(_sel(Question).where(Question.session_id == session_id)).all())

                if asked_count >= session.num_questions:
                    await _send(websocket, {"type": "generating_report"})
                    report = build_report(db, call, session)
                    await _send(websocket, {"type": "complete", "report": report.model_dump()})
                    break

                q = None
                for attempt in range(3):
                    try:
                        q = generate_next_question(db, call, session, last_score, last_topic, follow_up_recommended)
                        break
                    except Exception as exc:  # noqa: BLE001
                        logger.warning("Question generation attempt %s failed: %s", attempt + 1, exc)
                        await asyncio.sleep(2)
                if q is None:
                    await _send(websocket, {"type": "error", "message": "Failed to generate question after 3 attempts. Please end and restart the interview."})
                    break

                token_count += len(q.text.split()) * 2  # rough estimate
                if token_count > settings.per_session_input_token_cap:
                    await _send(websocket, {"type": "error", "message": "Token cap reached. Ending session."})
                    break

                await _send(websocket, {
                    "type": "question",
                    "id": q.id,
                    "order": q.order,
                    "text": q.text,
                    "topic": q.topic,
                    "is_followup": q.is_followup_of is not None,
                })

                # ── Wait for answer or heartbeat ───────────────────────────────
                answer_received = False
                while not answer_received:
                    try:
                        raw = await asyncio.wait_for(websocket.receive_text(), timeout=HEARTBEAT_SECONDS)
                    except asyncio.TimeoutError:
                        # Send heartbeat ping
                        await _send(websocket, {"type": "ping"})
                        continue

                    msg = json.loads(raw)

                    if msg.get("type") == "pong":
                        continue

                    if msg.get("type") == "pause":
                        await _send(websocket, {"type": "paused"})
                        # Wait for resume
                        while True:
                            raw2 = await websocket.receive_text()
                            m2 = json.loads(raw2)
                            if m2.get("type") == "resume":
                                await _send(websocket, {"type": "resumed"})
                                break

                    if msg.get("type") == "answer":
                        transcript = (msg.get("transcript") or "").strip()
                        if not transcript:
                            await _send(websocket, {"type": "error", "message": "Empty answer"})
                            continue

                        eval_result = None
                        for attempt in range(2):
                            try:
                                eval_result = evaluate_answer(db, call, session, q, transcript)
                                break
                            except Exception as exc:  # noqa: BLE001
                                logger.exception("Evaluation attempt %s failed: %s", attempt + 1, exc)
                                if attempt == 1:
                                    await _send(websocket, {"type": "error", "message": f"Evaluation error: {exc}"})

                        last_score = eval_result.score_10 if eval_result else None
                        last_topic = q.topic
                        follow_up_recommended = eval_result.follow_up_recommended if eval_result else False

                        payload: dict = {"type": "answer_received", "question_id": q.id}
                        if session.mode == "practice" and eval_result:
                            payload["evaluation"] = {
                                "scores": eval_result.scores.model_dump(),
                                "score_10": eval_result.score_10,
                                "feedback": eval_result.feedback.model_dump(),
                            }
                        await _send(websocket, payload)
                        answer_received = True

                        # Wait for explicit next_question before generating
                        await _send(websocket, {"type": "awaiting_next"})
                        while True:
                            try:
                                raw_next = await asyncio.wait_for(websocket.receive_text(), timeout=HEARTBEAT_SECONDS)
                            except asyncio.TimeoutError:
                                await _send(websocket, {"type": "ping"})
                                continue
                            m_next = json.loads(raw_next)
                            if m_next.get("type") in ("pong", "ping"):
                                continue
                            if m_next.get("type") == "next_question":
                                break
                            if m_next.get("type") == "cancel":
                                session.status = "cancelled"
                                session.ended_at = datetime.now(timezone.utc)
                                db.add(session)
                                db.commit()
                                await _send(websocket, {"type": "cancelled"})
                                return

                    if msg.get("type") == "cancel":
                        session.status = "cancelled"
                        session.ended_at = datetime.now(timezone.utc)
                        db.add(session)
                        db.commit()
                        await _send(websocket, {"type": "cancelled"})
                        return

        except WebSocketDisconnect:
            logger.info("WS disconnected for session %s", session_id)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Unexpected WS error: %s", exc)
            try:
                await _send(websocket, {"type": "error", "message": str(exc)})
            except Exception:  # noqa: BLE001
                pass
