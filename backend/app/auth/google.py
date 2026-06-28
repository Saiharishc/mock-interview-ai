from dataclasses import dataclass

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.config import get_settings


@dataclass
class GoogleProfile:
    sub: str
    email: str
    name: str
    picture: str | None


def verify_google_id_token(token: str) -> GoogleProfile:
    settings = get_settings()
    if not settings.google_client_id:
        raise ValueError("GOOGLE_CLIENT_ID not configured")

    info = id_token.verify_oauth2_token(
        token,
        google_requests.Request(),
        settings.google_client_id,
    )

    if info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError("Invalid token issuer")

    return GoogleProfile(
        sub=info["sub"],
        email=info["email"],
        name=info.get("name", info["email"]),
        picture=info.get("picture"),
    )
