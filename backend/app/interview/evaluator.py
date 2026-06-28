from datetime import datetime

from sqlmodel import Session, select

from app.llm.client import ProviderCall, chat_json
from app.llm.prompts import evaluator_system_prompt, evaluator_user_prompt
from app.llm.schemas import EvaluationOutput
from app.models.answer import Answer
from app.models.question import Question
from app.models.session import Session as InterviewSession


def evaluate_answer(
    db: Session,
    call: ProviderCall,
    session: InterviewSession,
    question: Question,
    transcript: str,
) -> EvaluationOutput:
    messages = [
        {"role": "system", "content": evaluator_system_prompt(session.role, session.difficulty)},
        {"role": "user", "content": evaluator_user_prompt(question.text, transcript)},
    ]
    raw = chat_json(call, messages, max_tokens=900, temperature=0.2)
    result = EvaluationOutput.model_validate(raw)

    row = db.exec(select(Answer).where(Answer.question_id == question.id)).first()
    if row is None:
        row = Answer(question_id=question.id, transcript=transcript)
        db.add(row)
    row.transcript = transcript
    row.scores = result.scores.model_dump()
    row.score_10 = result.score_10
    row.feedback = result.feedback.model_dump()
    row.evaluated_at = datetime.utcnow()
    db.commit()
    return result
