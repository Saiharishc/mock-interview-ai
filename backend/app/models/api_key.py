from datetime import datetime

from sqlmodel import Field, SQLModel


class ApiKey(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    provider: str = Field(index=True)  # openai, anthropic, gemini, azure, groq, ollama
    encrypted_key: str  # Fernet-encrypted; never returned decrypted via API
    model: str  # e.g. "gpt-4o-mini", "llama-3.3-70b-versatile"
    label: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
