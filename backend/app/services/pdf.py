from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from app.models.session import Session as InterviewSession
from app.models.user import User

_TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
_jinja = Environment(loader=FileSystemLoader(str(_TEMPLATE_DIR)), autoescape=True)


def render_pdf(session: InterviewSession, user: User) -> bytes:
    try:
        from weasyprint import HTML  # noqa: PLC0415 — lazy import; requires GTK system libs
    except OSError as exc:
        raise RuntimeError(
            "PDF generation requires GTK/Pango libraries. "
            "See https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows"
        ) from exc
    summary = session.summary or {}
    template = _jinja.get_template("report.html.j2")

    # Build transcript list from summary if available
    transcript = summary.get("transcript", [])

    html_str = template.render(
        session=session,
        user=user,
        summary=summary,
        transcript=transcript,
        now=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
    )
    return HTML(string=html_str).write_pdf()
