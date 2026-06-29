from sqlmodel import Session, select

from app.llm.client import ProviderCall, chat_json
from app.llm.prompts import reporter_system_prompt
from app.llm.schemas import ReportOutput
from app.models.answer import Answer
from app.models.question import Question
from app.models.session import Session as InterviewSession


def build_report(db: Session, call: ProviderCall, session: InterviewSession) -> ReportOutput:
    questions = db.exec(
        select(Question).where(Question.session_id == session.id).order_by(Question.order)
    ).all()
    answers = {
        a.question_id: a
        for a in db.exec(
            select(Answer).where(Answer.question_id.in_([q.id for q in questions]))
        ).all()
    }

    transcript_block = "\n\n".join(
        f"Q{q.order}: {q.text}\nA: {answers[q.id].transcript if q.id in answers else '(no answer)'}\nScore: {answers[q.id].score_10 if q.id in answers else 'N/A'}/10"
        for q in questions
    )

    messages = [
        {"role": "system", "content": reporter_system_prompt(session.role)},
        {"role": "user", "content": f"Interview transcript:\n\n{transcript_block}\n\nGenerate the report JSON."},
    ]
    raw = chat_json(call, messages, max_tokens=4096, temperature=0.2)
    report = ReportOutput.model_validate(raw)

    # Persist into session
    session.overall_score = report.overall_score
    session.summary = report.model_dump()
    session.status = "completed"
    db.add(session)
    db.commit()
    return report
