import os
import re
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def validate_jd_text(jd_text: str) -> tuple[bool, str]:
    """
    Validate if text appears to be a valid job description.
    Returns (is_valid, error_message)
    """
    if not jd_text or not jd_text.strip():
        return False, "Job description text is empty"
    
    text = jd_text.strip()
    
    # Basic heuristics first (fast, cheap)
    text_lower = text.lower()
    
    # Check for job-related keywords
    job_keywords = [
        'responsibilities', 'requirements', 'qualifications', 'experience',
        'skills', 'role', 'position', 'candidate', 'applicant', 'job',
        'work', 'team', 'company', 'years', 'degree', 'bachelor', 'master',
        'develop', 'design', 'manage', 'lead', 'create', 'implement'
    ]
    
    keyword_count = sum(1 for keyword in job_keywords if keyword in text_lower)
    
    # Check for UI/navigation text (invalid indicators)
    ui_indicators = [
        'menu', 'navigation', 'sidebar', 'click here', 'sign in', 'sign up',
        'cookie', 'privacy policy', 'terms of service', 'chat', 'new chat',
        'settings', 'profile', 'logout', 'home', 'back', 'next', 'previous'
    ]
    
    ui_count = sum(1 for indicator in ui_indicators if indicator in text_lower)
    
    # Check length (too short is suspicious)
    word_count = len(text.split())
    
    # Heuristic: if has job keywords and reasonable length, likely valid
    # If has many UI indicators, likely invalid
    if ui_count >= 3 and keyword_count < 2:
        return False, "This does not appear to be a valid job description. Please paste or upload a proper JD."
    
    if word_count < 20:
        return False, "This does not appear to be a valid job description. Please paste or upload a proper JD."
    
    if keyword_count < 2 and word_count < 50:
        return False, "This does not appear to be a valid job description. Please paste or upload a proper JD."
    
    # If heuristics pass, do a lightweight LLM check
    try:
        if not os.getenv("OPENAI_API_KEY"):
            # If no API key, trust heuristics
            return True, ""
        
        prompt = f"""Is the following text a valid job description? Answer only "yes" or "no".

Text:
{text[:1000]}

A valid job description should:
- Describe a job role or position
- List responsibilities or requirements
- Mention skills, experience, or qualifications
- Be about employment/work

Invalid examples:
- UI elements, navigation menus
- Random unrelated content
- Very short text without job context

Answer:"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a classifier. Answer only 'yes' or 'no'."},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
            max_tokens=5
        )
        
        answer = response.choices[0].message.content.strip().lower()
        
        if answer.startswith('yes'):
            return True, ""
        else:
            return False, "This does not appear to be a valid job description. Please paste or upload a proper JD."
            
    except Exception as e:
        # If LLM check fails, trust heuristics
        # Log error but don't block (heuristics already passed)
        return True, ""
