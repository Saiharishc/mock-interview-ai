import os

import pytest

# Set required env vars before importing anything that triggers Settings init
os.environ.setdefault("MASTER_KEY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
os.environ.setdefault("JWT_SECRET", "test-secret")

from app.services.crypto import decrypt, encrypt, mask  # noqa: E402


def test_round_trip():
    plain = "sk-test-key-value-1234"
    assert decrypt(encrypt(plain)) == plain


def test_mask():
    assert mask("sk-abc123def456") == "sk-a...f456"


def test_mask_short():
    assert mask("abc") == "****"
