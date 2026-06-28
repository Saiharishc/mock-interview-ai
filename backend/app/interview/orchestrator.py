"""Turn-loop logic: decide what question to ask next."""
from __future__ import annotations

from sqlmodel import Session, select

from app.llm.client import ProviderCall, chat_json
from app.llm.prompts import interviewer_system_prompt, next_question_user_prompt
from app.llm.schemas import QuestionOutput
from app.models.question import Question
from app.models.resume import Resume
from app.models.session import Session as InterviewSession


def _resume_text(db: Session, session: InterviewSession) -> str | None:
    if session.resume_id is None:
        return None
    row = db.get(Resume, session.resume_id)
    return row.extracted_text if row else None


def _asked_questions(db: Session, session_id: int) -> list[Question]:
    return db.exec(
        select(Question).where(Question.session_id == session_id).order_by(Question.order)
    ).all()


def generate_next_question(
    db: Session,
    call: ProviderCall,
    session: InterviewSession,
    last_score: float | None = None,
    last_topic: str | None = None,
    follow_up_recommended: bool = False,
) -> Question:
    asked = _asked_questions(db, session.id)
    asked_texts = [q.text for q in asked]
    resume_text = _resume_text(db, session)

    system = interviewer_system_prompt(session, resume_text)
    user = next_question_user_prompt(asked_texts, last_score, last_topic, follow_up_recommended)

    raw = chat_json(call, [{"role": "system", "content": system}, {"role": "user", "content": user}],
                    max_tokens=300, temperature=0.8)
    out = QuestionOutput.model_validate(raw)

    # Deduplicate: if text is too similar to an already-asked question, retry once
    if any(out.text.strip().lower() == q.lower() for q in asked_texts):
        raw = chat_json(call, [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
            {"role": "assistant", "content": str(raw)},
            {"role": "user", "content": "That question was already asked. Ask a completely different one."},
        ], max_tokens=300, temperature=0.9)
        out = QuestionOutput.model_validate(raw)

    q = Question(
        session_id=session.id,
        order=len(asked) + 1,
        text=out.text,
        topic=out.topic,
        is_followup_of=asked[-1].id if (out.is_followup and asked) else None,
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return q
