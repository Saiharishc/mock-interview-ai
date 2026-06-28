from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from app.auth.deps import get_current_user
from app.db import get_session
from app.models.answer import Answer
from app.models.question import Question
from app.models.session import Session as InterviewSession
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
def get_analytics(user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    sessions = db.exec(
        select(InterviewSession)
        .where(InterviewSession.user_id == user.id, InterviewSession.status == "completed")
        .order_by(InterviewSession.ended_at)
    ).all()

    # Score trend over time
    score_trend = [
        {"date": s.ended_at.strftime("%Y-%m-%d") if s.ended_at else s.created_at.strftime("%Y-%m-%d"),
         "score": s.overall_score, "role": s.role}
        for s in sessions if s.overall_score is not None
    ]

    # Aggregate topic scores across all sessions
    topic_totals: dict[str, list[float]] = {}
    for s in sessions:
        if s.summary and "topic_scores" in s.summary:
            for topic, score in s.summary["topic_scores"].items():
                topic_totals.setdefault(topic, []).append(score)
    avg_topic_scores = {t: round(sum(v) / len(v), 1) for t, v in topic_totals.items()}

    # Sessions per week (rolling last 12 weeks)
    sessions_count = len(sessions)
    avg_score = (
        round(sum(s.overall_score for s in sessions if s.overall_score) / max(1, len([s for s in sessions if s.overall_score])), 1)
        if sessions else 0.0
    )

    return {
        "total_sessions": sessions_count,
        "avg_score": avg_score,
        "score_trend": score_trend,
        "avg_topic_scores": avg_topic_scores,
    }
