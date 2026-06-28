from datetime import datetime

from sqlmodel import Field, SQLModel


class Question(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="interview_session.id", index=True)
    order: int
    text: str
    topic: str | None = None
    is_followup_of: int | None = Field(default=None, foreign_key="question.id")
    asked_at: datetime = Field(default_factory=datetime.utcnow)
