import os

os.environ.setdefault("MASTER_KEY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
os.environ.setdefault("JWT_SECRET", "super-secret-for-tests")

from app.auth.jwt import decode_token, issue_token  # noqa: E402


def test_issue_and_decode():
    token = issue_token(user_id=42, email="test@example.com")
    payload = decode_token(token)
    assert payload["sub"] == "42"
    assert payload["email"] == "test@example.com"


def test_invalid_token():
    import pytest

    with pytest.raises(ValueError):
        decode_token("not.a.real.token")
