from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session
from typing import Optional
from app.db import init_db, get_session
from app.resume_service import save_resume, get_resume
from app.jd_service import process_jd_text, process_jd_image
from app.ai_service import analyze_resume_jd
from app.jd_validator import validate_jd_text

app = FastAPI(title="Resume Analyzer API")

# CORS middleware for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/resume/status")
def get_resume_status(session: Session = Depends(get_session)):
    """Get resume status (exists, filename, and updated_at)."""
    resume = get_resume(session)
    if resume:
        # Extract filename from file_path
        from pathlib import Path
        filename = Path(resume.file_path).name
        return {
            "exists": True,
            "filename": filename,
            "updated_at": resume.updated_at.isoformat()
        }
    return {
        "exists": False
    }


@app.post("/resume/upload")
def upload_resume(
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """Upload or replace resume PDF."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        pdf_bytes = file.file.read()
        if len(pdf_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Validate file size (1 MB = 1048576 bytes)
        MAX_FILE_SIZE = 1 * 1024 * 1024  # 1 MB
        if len(pdf_bytes) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Resume file size must be less than 1 MB.")
        
        resume = save_resume(session, pdf_bytes, file.filename)
        return {
            "message": "Resume uploaded successfully",
            "filename": file.filename,
            "updated_at": resume.updated_at.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload resume: {str(e)}")


@app.post("/analyze-jd")
async def analyze_jd(
    jd_text: Optional[str] = Form(None),
    jd_image: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session)
):
    """Analyze job description against resume."""
    # Get resume
    resume = get_resume(session)
    if not resume:
        raise HTTPException(status_code=400, detail="No resume uploaded. Please upload a resume first.")
    
    # Process JD input
    if jd_image and jd_image.filename:
        try:
            image_bytes = await jd_image.read()
            jd_text_processed = process_jd_image(image_bytes)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")
    elif jd_text:
        jd_text_processed = process_jd_text(jd_text)
    else:
        raise HTTPException(status_code=400, detail="Either jd_text or jd_image must be provided")
    
    if not jd_text_processed or not jd_text_processed.strip():
        raise HTTPException(status_code=400, detail="Job description text is empty")
    
    # Validate JD before analysis
    is_valid, error_message = validate_jd_text(jd_text_processed)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Analyze with AI
    try:
        result = analyze_resume_jd(resume.extracted_text, jd_text_processed)
        return result
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")
