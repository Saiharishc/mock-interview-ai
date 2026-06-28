from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth.deps import get_current_user
from app.db import get_session
from app.llm.client import FREE_MODELS, ProviderCall, ping
from app.models.api_key import ApiKey
from app.models.user import User
from app.services.crypto import decrypt, encrypt, mask

router = APIRouter(prefix="/settings", tags=["settings"])

SUPPORTED_PROVIDERS = ["openai", "anthropic", "gemini", "azure", "groq", "ollama"]


class ApiKeyCreate(BaseModel):
    provider: str
    api_key: str
    model: str
    label: str | None = None


class ApiKeyOut(BaseModel):
    id: int
    provider: str
    model: str
    label: str | None
    masked_key: str


class TestProviderRequest(BaseModel):
    provider: str
    model: str
    api_key: str | None = None  # if omitted, look up stored key for this provider


def _to_out(row: ApiKey) -> ApiKeyOut:
    return ApiKeyOut(
        id=row.id,
        provider=row.provider,
        model=row.model,
        label=row.label,
        masked_key=mask(decrypt(row.encrypted_key)),
    )


@router.get("/providers")
def list_providers() -> dict:
    return {"providers": SUPPORTED_PROVIDERS, "free_models": FREE_MODELS}


@router.get("/api-keys", response_model=list[ApiKeyOut])
def list_keys(user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    rows = db.exec(select(ApiKey).where(ApiKey.user_id == user.id)).all()
    return [_to_out(r) for r in rows]


@router.post("/api-keys", response_model=ApiKeyOut)
def create_key(
    payload: ApiKeyCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if payload.provider not in SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=400, detail="Unsupported provider")
    row = ApiKey(
        user_id=user.id,
        provider=payload.provider,
        encrypted_key=encrypt(payload.api_key),
        model=payload.model,
        label=payload.label,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/api-keys/{key_id}")
def delete_key(
    key_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    row = db.get(ApiKey, key_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.post("/test-provider")
def test_provider(
    payload: TestProviderRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    api_key = payload.api_key
    if api_key is None and payload.provider != "ollama":
        row = db.exec(
            select(ApiKey).where(
                ApiKey.user_id == user.id, ApiKey.provider == payload.provider
            )
        ).first()
        if row is None:
            raise HTTPException(status_code=400, detail="No stored key for that provider")
        api_key = decrypt(row.encrypted_key)
    return ping(ProviderCall(provider=payload.provider, model=payload.model, api_key=api_key))


def resolve_provider_call(
    db: Session, user_id: int, provider: str | None = None, model: str | None = None
) -> ProviderCall:
    """Pick a usable ProviderCall for this user. Used by interview orchestrator."""
    query = select(ApiKey).where(ApiKey.user_id == user_id)
    if provider:
        query = query.where(ApiKey.provider == provider)
    row = db.exec(query).first()
    if row is None:
        raise HTTPException(status_code=400, detail="No API key configured. Add one in Settings.")
    return ProviderCall(
        provider=row.provider,
        model=model or row.model,
        api_key=decrypt(row.encrypted_key),
    )
