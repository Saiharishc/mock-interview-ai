from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.auth.deps import get_current_user
from app.db import get_session
from app.llm.client import chat
from app.llm.prompts import modify_answer_prompt, reference_answer_prompt
from app.models.answer import Answer
from app.models.question import Question
from app.models.session import Session as InterviewSession
from app.models.user import User
from app.routers.settings import resolve_provider_call

router = APIRouter(prefix="/sessions", tags=["sessions"])


class SessionCreate(BaseModel):
    role: str
    jd_text: str | None = None
    difficulty: str = Field(pattern="^(easy|medium|hard)$")
    interview_type: str = Field(pattern="^(technical|behavioral|system_design|coding|mixed)$")
    topics: list[str] = []
    num_questions: int = Field(ge=1, le=30, default=5)
    duration_min: int = Field(ge=5, le=180, default=30)
    mode: str = Field(pattern="^(practice|exam)$", default="practice")
    resume_id: int | None = None


class SessionOut(BaseModel):
    id: int
    role: str
    difficulty: str
    interview_type: str
    topics: list[str]
    num_questions: int
    duration_min: int
    mode: str
    status: str
    started_at: datetime | None
    ended_at: datetime | None
    overall_score: float | None
    created_at: datetime


def _to_out(s: InterviewSession) -> SessionOut:
    return SessionOut(
        id=s.id,
        role=s.role,
        difficulty=s.difficulty,
        interview_type=s.interview_type,
        topics=s.topics,
        num_questions=s.num_questions,
        duration_min=s.duration_min,
        mode=s.mode,
        status=s.status,
        started_at=s.started_at,
        ended_at=s.ended_at,
        overall_score=s.overall_score,
        created_at=s.created_at,
    )


@router.post("", response_model=SessionOut)
def create_session(
    payload: SessionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    # Cancel any stuck active/configured sessions before creating a new one
    stuck = db.exec(
        select(InterviewSession).where(
            InterviewSession.user_id == user.id,
            InterviewSession.status.in_(["active", "configured"]),
        )
    ).all()
    for s in stuck:
        s.status = "cancelled"
        db.add(s)
    if stuck:
        db.commit()

    row = InterviewSession(user_id=user.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.get("", response_model=list[SessionOut])
def list_sessions(user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    rows = db.exec(
        select(InterviewSession)
        .where(InterviewSession.user_id == user.id)
        .order_by(InterviewSession.created_at.desc())
    ).all()
    return [_to_out(r) for r in rows]


@router.get("/{session_id}/questions/{question_id}/reference-answer")
def get_reference_answer(
    session_id: int,
    question_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    s = db.get(InterviewSession, session_id)
    if s is None or s.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    q = db.get(Question, question_id)
    if q is None or q.session_id != session_id:
        raise HTTPException(status_code=404, detail="Question not found")
    call = resolve_provider_call(db, user.id)
    answer = chat(
        call,
        [{"role": "user", "content": reference_answer_prompt(s.role, s.difficulty, q.text)}],
        max_tokens=1024,
        temperature=0.3,
    )
    return {"question": q.text, "reference_answer": answer}


class ModifyAnswerRequest(BaseModel):
    answer: str


@router.post("/{session_id}/questions/{question_id}/modify-answer")
def modify_answer(
    session_id: int,
    question_id: int,
    payload: ModifyAnswerRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    s = db.get(InterviewSession, session_id)
    if s is None or s.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    q = db.get(Question, question_id)
    if q is None or q.session_id != session_id:
        raise HTTPException(status_code=404, detail="Question not found")
    if not payload.answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty")
    call = resolve_provider_call(db, user.id)
    improved = chat(
        call,
        [{"role": "user", "content": modify_answer_prompt(q.text, payload.answer)}],
        max_tokens=300,
        temperature=0.4,
    )
    return {"modified_answer": improved}


@router.get("/{session_id}")
def get_session_detail(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    s = db.get(InterviewSession, session_id)
    if s is None or s.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")

    questions = db.exec(
        select(Question).where(Question.session_id == session_id).order_by(Question.order)
    ).all()
    answers = {
        a.question_id: a
        for a in db.exec(select(Answer).where(Answer.question_id.in_([q.id for q in questions]))).all()
    } if questions else {}

    return {
        "session": _to_out(s).model_dump(),
        "transcript": [
            {
                "question": {"id": q.id, "order": q.order, "text": q.text, "topic": q.topic},
                "answer": (
                    {
                        "transcript": answers[q.id].transcript,
                        "score_10": answers[q.id].score_10,
                        "scores": answers[q.id].scores,
                        "feedback": answers[q.id].feedback,
                    }
                    if q.id in answers
                    else None
                ),
            }
            for q in questions
        ],
        "summary": s.summary,
    }
