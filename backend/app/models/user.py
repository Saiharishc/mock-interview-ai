from datetime import datetime

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    google_sub: str = Field(unique=True, index=True)
    email: str = Field(index=True)
    name: str
    picture: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
