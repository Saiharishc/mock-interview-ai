from datetime import datetime

from sqlmodel import Field, SQLModel


class Resume(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    filename: str
    extracted_text: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
