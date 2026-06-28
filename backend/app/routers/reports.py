from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlmodel import Session

from app.auth.deps import get_current_user
from app.db import get_session
from app.interview.reporter import build_report
from app.models.session import Session as InterviewSession
from app.models.user import User
from app.routers.settings import resolve_provider_call
from app.services.pdf import render_pdf

router = APIRouter(prefix="/sessions", tags=["reports"])


@router.get("/{session_id}/report")
def get_report(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    s = db.get(InterviewSession, session_id)
    if s is None or s.user_id != user.id:
        raise HTTPException(404, "Not found")
    if s.summary is None:
        raise HTTPException(404, "Report not ready yet")
    return s.summary


@router.post("/{session_id}/report/generate")
def generate_report(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    s = db.get(InterviewSession, session_id)
    if s is None or s.user_id != user.id:
        raise HTTPException(404, "Not found")
    call = resolve_provider_call(db, user.id)
    report = build_report(db, call, s)
    return report.model_dump()


@router.get("/{session_id}/report.pdf")
def download_pdf(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    s = db.get(InterviewSession, session_id)
    if s is None or s.user_id != user.id:
        raise HTTPException(404, "Not found")
    if s.summary is None:
        raise HTTPException(404, "Report not ready yet")
    pdf_bytes = render_pdf(s, user)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{session_id}.pdf"'},
    )
