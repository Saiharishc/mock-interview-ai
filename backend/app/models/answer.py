from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class Answer(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    question_id: int = Field(foreign_key="question.id", index=True, unique=True)
    transcript: str
    scores: dict[str, float] | None = Field(default=None, sa_column=Column(JSON))
    # scores keys: relevance, accuracy, clarity, confidence, completeness  (each 0..10)
    score_10: float | None = None
    feedback: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    # feedback keys: good, missing, better_answer, best_practices
    evaluated_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
