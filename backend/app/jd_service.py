from typing import Optional
import io
import os
import platform
from pathlib import Path
from PIL import Image

try:
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False


def _find_tesseract_windows() -> str | None:
    """Find tesseract.exe on Windows in common installation locations."""
    if platform.system() != 'Windows':
        return None
    
    common_paths = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
        r'C:\Users\{}\AppData\Local\Tesseract-OCR\tesseract.exe'.format(os.getenv('USERNAME', '')),
    ]
    
    for path in common_paths:
        if Path(path).exists():
            return path
    
    return None


def _configure_tesseract_path():
    """Configure pytesseract to use tesseract if not in PATH."""
    if not OCR_AVAILABLE:
        return
    
    # Only configure if tesseract is not already found
    try:
        pytesseract.get_tesseract_version()
        return  # Already working
    except Exception:
        pass
    
    # Try to find and configure tesseract path
    if platform.system() == 'Windows':
        tesseract_path = _find_tesseract_windows()
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path


def _check_tesseract_available() -> bool:
    """Check if tesseract binary is available."""
    if not OCR_AVAILABLE:
        return False
    
    # Try to configure path first
    _configure_tesseract_path()
    
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def extract_text_from_image(image_bytes: bytes) -> str:
    """Extract text from image using OCR (optional, minimal)."""
    if not OCR_AVAILABLE:
        raise ValueError("OCR not available. Please install pytesseract: pip install pytesseract")
    
    # Configure tesseract path before checking
    _configure_tesseract_path()
    
    if not _check_tesseract_available():
        error_msg = (
            "Tesseract OCR is not installed or not found. "
            "Please install tesseract-ocr:\n"
            "- Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki\n"
            "- macOS: brew install tesseract\n"
            "- Linux: sudo apt-get install tesseract-ocr\n\n"
        )
        
        if platform.system() == 'Windows':
            error_msg += (
                "If you've already installed Tesseract on Windows:\n"
                "1. Make sure it's installed to: C:\\Program Files\\Tesseract-OCR\\\n"
                "2. OR add Tesseract installation folder to your system PATH\n"
                "3. OR set TESSERACT_CMD environment variable to tesseract.exe path"
            )
        
        raise ValueError(error_msg)
    
    try:
        image = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        error_msg = str(e)
        if "tesseract" in error_msg.lower() or "not found" in error_msg.lower() or "tesseract_cmd" in error_msg.lower():
            msg = (
                "Tesseract OCR is not installed or not found. "
                "Please install tesseract-ocr:\n"
                "- Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki\n"
                "- macOS: brew install tesseract\n"
                "- Linux: sudo apt-get install tesseract-ocr"
            )
            
            if platform.system() == 'Windows':
                msg += (
                    "\n\nIf already installed on Windows:\n"
                    "1. Check if installed at: C:\\Program Files\\Tesseract-OCR\\\n"
                    "2. Add Tesseract folder to system PATH\n"
                    "3. Restart the backend server after adding to PATH"
                )
            
            raise ValueError(msg)
        raise ValueError(f"Failed to extract text from image: {error_msg}")


def process_jd_text(jd_text: str) -> str:
    """Process and clean JD text."""
    return jd_text.strip()


def process_jd_image(image_bytes: bytes) -> str:
    """Process JD image and extract text."""
    return extract_text_from_image(image_bytes)
