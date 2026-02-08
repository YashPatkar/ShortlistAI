# ShortlistAI - Chrome Extension + Backend Tool

This is a **personal productivity tool** consisting of a Chrome extension and Python backend. It is NOT a web app UI - the Chrome extension is the primary interface, and the backend only provides APIs to support it.

## Overview

This tool helps you analyze job descriptions against your resume. You upload your resume once, and then analyze multiple job descriptions to get:
- Match score (skill overlap)
- Missing skills
- Generated email content for applications
- Destination email extraction

## Why Resume is Stored Persistently

The resume is stored persistently in the database because:
- You only need to upload it once
- You can analyze multiple job descriptions against the same resume without re-uploading
- The tool maintains a single "current" resume (uploading a new one replaces the old one)
- This makes the workflow efficient for applying to multiple jobs

## How Match Score is Calculated

The `match_score` (0-100) is calculated by the AI based on skill overlap between your resume and the job description. It is **NOT a prediction** of job success, but rather a measure of how well your resume's skills match what the job description requires.

The AI analyzes:
- Skills mentioned in both resume and JD
- Skills in JD but missing from resume
- Overall alignment of qualifications and experience

A higher score means better skill alignment, not necessarily a better chance of getting the job.

## How AI is Used

The backend uses OpenAI's API to:
1. Compare your resume text against the job description text
2. Identify skill overlaps and gaps
3. Extract or infer the destination email from the JD (if present)
4. Generate professional email subject and body for job applications
5. Determine if the resume should be attached

The AI is configured to return **strict JSON only** - no additional text, markdown, or formatting outside the JSON structure.

## Project Structure

```
ai_extension/
├── backend/          # Python FastAPI backend
│   ├── app/         # Application code
│   ├── .env         # Environment variables
│   └── README.md    # Backend-specific documentation
├── extension/       # Chrome extension
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── styles.css
└── README.md        # This file
```

## Setup

### Backend Setup

1. **Install dependencies using uv:**
```bash
cd backend
uv pip install fastapi uvicorn[standard] sqlmodel python-dotenv openai PyPDF2 pytesseract pillow
```

2. **Install Tesseract OCR (optional, only needed for image OCR):**
   - **Windows**: Download installer from https://github.com/UB-Mannheim/tesseract/wiki
   - **macOS**: `brew install tesseract`
   - **Linux**: `sudo apt-get install tesseract-ocr`
   
   Note: This is only required if you want to analyze job descriptions from images. Text input works without it.

3. **Create `.env` file and add your OpenAI API key:**
```
OPENAI_API_KEY=your_actual_api_key_here
```

4. **Run the backend:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### Chrome Extension Setup

1. **Install Node.js dependencies (for Tailwind CSS build):**
```bash
npm install
```

2. **Build the CSS:**
```bash
npm run build:css
```

   For development with auto-rebuild on file changes:
```bash
npm run watch:css
```

3. **Open Chrome and go to Extensions:**
   - Navigate to `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

4. **Enable Developer Mode:**
   - Toggle "Developer mode" in the top right

5. **Load the extension:**
   - Click "Load unpacked"
   - Select the `extension` folder from this project

6. **Configure backend URL (if needed):**
   - Click the extension icon
   - The default backend URL is `http://localhost:8000`
   - If your backend runs on a different URL, update it in the extension popup

## Usage

1. **Upload your resume:**
   - Click the extension icon
   - Click "Choose File" and select your resume PDF
   - Click "Upload Resume"

2. **Analyze a job description:**
   - Paste the JD text in the "Paste Text" tab, OR
   - Upload a JD image in the "Upload Image" tab
   - Click "Analyze"

3. **View results:**
   - Match score (0-100)
   - Missing skills list
   - Destination email (if found in JD)
   - Generated email subject and body
   - Whether to attach resume

## Technical Details

- **Backend:** FastAPI, SQLModel, SQLite
- **Package Manager:** uv (not pip)
- **Python Version:** 3.13.0
- **Extension:** Vanilla JavaScript (no frameworks)
- **Styling:** Tailwind CSS (compiled at build time, no CDN)
- **No authentication** (single-user personal tool)
- **No multi-user logic**

## Building the Extension CSS

The extension uses Tailwind CSS which must be compiled before use:

1. **Install dependencies:**
```bash
npm install
```

2. **Build CSS (production):**
```bash
npm run build:css
```

3. **Watch mode (development):**
```bash
npm run watch:css
```

The compiled CSS is output to `extension/styles.css` from the source file `extension/src/styles.css`.

## Notes

- Only ONE resume exists at any time (uploading a new one replaces the old one)
- Job descriptions are NOT stored (processed on-demand only)
- The backend must be running for the extension to work
- OCR for images is optional and requires tesseract-ocr to be installed separately
