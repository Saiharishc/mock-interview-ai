from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session, select

from app.auth.deps import get_current_user
from app.db import get_session
from app.models.resume import Resume
from app.models.user import User
from app.services.resume_parser import extract_text

router = APIRouter(prefix="/resumes", tags=["resumes"])

MAX_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("")
async def upload_resume(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 5 MB)")
    try:
        text = extract_text(file.filename or "resume", content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    row = Resume(user_id=user.id, filename=file.filename or "resume", extracted_text=text)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "filename": row.filename, "chars": len(row.extracted_text)}


@router.get("")
def list_resumes(user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    rows = db.exec(select(Resume).where(Resume.user_id == user.id)).all()
    return [{"id": r.id, "filename": r.filename, "uploaded_at": r.uploaded_at} for r in rows]
