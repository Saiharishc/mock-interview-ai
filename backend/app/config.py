from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "mock-interview-ai"
    environment: str = "development"

    master_key: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expires_min: int = 60

    database_url: str = "sqlite:///./mock_interview.db"

    google_client_id: str = ""

    cors_origins: str = "http://localhost:5173"

    per_session_input_token_cap: int = 30000
    per_user_daily_call_limit: int = 500

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
