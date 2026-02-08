# Resume Analyzer Backend

This is the backend API for the Chrome extension resume analyzer tool. It is not a web app UI - it only provides APIs for the Chrome extension.

## Overview

The backend stores a single resume persistently (only one resume exists at any time). When a new resume is uploaded, it replaces the previous one. The resume text is extracted from the PDF and stored in the database.

## How It Works

### Resume Storage
- Only ONE resume exists at any time
- Uploading a new resume replaces the old one
- Resume PDF is stored on disk, extracted text is stored in SQLite database
- This allows the tool to analyze multiple job descriptions against the same resume without re-uploading

### Match Score Calculation
The `match_score` (0-100) is calculated by the AI based on skill overlap between the resume and job description. It is NOT a prediction of job success, but rather a measure of how well the resume's skills match what the job description requires. The AI analyzes:
- Skills mentioned in both resume and JD
- Skills in JD but missing from resume
- Overall alignment of qualifications

### AI Processing
The backend uses OpenAI's API to analyze the resume against the job description. The AI:
1. Compares skills and qualifications
2. Identifies missing skills
3. Extracts or infers destination email from JD
4. Generates professional email subject and body
5. Determines if resume should be attached

The AI is configured to return strict JSON only, with no additional text or markdown formatting.

## Setup

### Prerequisites
- Python 3.13.0
- uv package manager

### Installation

1. Install dependencies using uv:
```bash
uv pip install fastapi uvicorn sqlmodel python-dotenv openai PyPDF2 pytesseract pillow
```

2. Install Tesseract OCR (required for image OCR):
   - **Windows**: Download installer from https://github.com/UB-Mannheim/tesseract/wiki
   - **macOS**: `brew install tesseract`
   - **Linux**: `sudo apt-get install tesseract-ocr` (or equivalent for your distro)
   
   Note: OCR is optional - if you only use text input for job descriptions, you can skip this step.

3. Create `.env` file and add your OpenAI API key:
```
OPENAI_API_KEY=your_actual_api_key_here
```

### Running the Backend

Start the FastAPI server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### API Endpoints

- `GET /health` - Health check
- `POST /resume/upload` - Upload or replace resume PDF
- `POST /analyze-jd` - Analyze job description (requires resume to be uploaded first)

## Database

SQLite database file: `resume.db` (created automatically)

## Notes

- No authentication required (single-user personal tool)
- Resume is stored persistently until replaced
- Job descriptions are NOT stored (processed on-demand only)
