from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class Session(SQLModel, table=True):
    __tablename__ = "interview_session"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    role: str
    jd_text: str | None = None
    difficulty: str  # easy | medium | hard
    interview_type: str  # technical | behavioral | system_design | coding | mixed
    topics: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    num_questions: int = 5
    duration_min: int = 30
    mode: str = "practice"  # practice | exam
    status: str = "configured"  # configured | active | completed | cancelled
    started_at: datetime | None = None
    ended_at: datetime | None = None
    overall_score: float | None = None
    resume_id: int | None = Field(default=None, foreign_key="resume.id")
    summary: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
