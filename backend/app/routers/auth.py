from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth.deps import get_current_user
from app.auth.google import verify_google_id_token
from app.auth.jwt import issue_token
from app.db import get_session
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleLoginRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class MeResponse(BaseModel):
    id: int
    email: str
    name: str
    picture: str | None = None


@router.post("/google", response_model=TokenResponse)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_session)) -> TokenResponse:
    try:
        profile = verify_google_id_token(payload.id_token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {exc}") from exc

    user = db.exec(select(User).where(User.google_sub == profile.sub)).first()
    if user is None:
        user = User(
            google_sub=profile.sub,
            email=profile.email,
            name=profile.name,
            picture=profile.picture,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = issue_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "email": user.email, "name": user.name, "picture": user.picture},
    )


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(id=user.id, email=user.email, name=user.name, picture=user.picture)
