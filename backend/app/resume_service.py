from pathlib import Path
from datetime import datetime
from sqlmodel import Session, select
from app.models import Resume
import PyPDF2
import io


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes."""
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")


def save_resume(session: Session, pdf_bytes: bytes, filename: str) -> Resume:
    """Save or replace resume in database."""
    # Extract text
    extracted_text = extract_text_from_pdf(pdf_bytes)
    
    # Save file
    upload_dir = Path("uploads")
    upload_dir.mkdir(exist_ok=True)
    file_path = upload_dir / filename
    file_path.write_bytes(pdf_bytes)
    
    # Delete old resume if exists
    old_resume = session.exec(select(Resume)).first()
    if old_resume:
        old_file = Path(old_resume.file_path)
        if old_file.exists():
            old_file.unlink()
        session.delete(old_resume)
        session.commit()
    
    # Create new resume record
    resume = Resume(
        file_path=str(file_path),
        extracted_text=extracted_text,
        updated_at=datetime.utcnow()
    )
    session.add(resume)
    session.commit()
    session.refresh(resume)
    return resume


def get_resume(session: Session) -> Resume | None:
    """Get the current resume."""
    return session.exec(select(Resume)).first()
