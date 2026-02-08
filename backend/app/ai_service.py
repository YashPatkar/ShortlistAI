import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def analyze_resume_jd(resume_text: str, jd_text: str) -> dict:
    """Analyze resume against job description using AI."""
    if not os.getenv("OPENAI_API_KEY"):
        raise ValueError("OPENAI_API_KEY not found in environment variables")
    
    prompt = f"""Analyze the following resume against the job description.

Resume:
{resume_text}

Job Description:
{jd_text}

IMPORTANT: Determine the contact method from the job description:
- EMAIL: Use if JD explicitly mentions an email address OR phrases like "email your resume to", "send your CV to", "apply via email"
- DM: Use if JD mentions "DM", "message", "reach out", "comment", "connect on LinkedIn", OR if it's a social media post without an email address
- BOTH: Use if JD mentions BOTH an email address AND DM/message options (e.g., "email us at X or DM us")

Return ONLY a valid JSON object with no additional text, comments, or markdown formatting.

IF contact_mode is "email", use this structure:
{{
  "match_score": <number between 0 and 100>,
  "missing_skills": [<array of skill strings>],
  "contact_mode": "email",
  "destination_email": "<extracted email address>",
  "email_subject": "<subject line string>",
  "email_body": "<email body text>",
  "warnings": [<optional array of warning strings>]
}}

IF contact_mode is "dm", use this structure:
{{
  "match_score": <number between 0 and 100>,
  "missing_skills": [<array of skill strings>],
  "contact_mode": "dm",
  "dm_message": "<short professional DM message, 2-4 lines max>",
  "warnings": [<optional array of warning strings>]
}}

IF contact_mode is "both", use this structure:
{{
  "match_score": <number between 0 and 100>,
  "missing_skills": [<array of skill strings>],
  "contact_mode": "both",
  "destination_email": "<extracted email address>",
  "email_subject": "<subject line string>",
  "email_body": "<email body text>",
  "dm_message": "<short professional DM message, 2-4 lines max>",
  "warnings": [<optional array of warning strings>]
}}

Rules:
- match_score: Calculate based on skill overlap between resume and JD (0-100)
- missing_skills: List skills mentioned in JD but not found in resume
- contact_mode: MUST be "email", "dm", or "both" based on JD content
- For email mode: destination_email must be an actual email address found in JD (do NOT guess or use "Not specified")
- For email mode: Generate professional email_subject and email_body
- For dm mode: Generate a short, direct, polite DM message (2-4 lines) that mentions the role, key skill fit, and ends with a call to action
- warnings: OPTIONAL array of warning strings. Add warnings if:
  * Location mismatch: Job location (city/region) is mentioned in JD AND candidate location is found in resume AND they are different AND JD is NOT explicitly marked as "Remote" or "Work from home"
    - Warning format: "Job location is [JD location], while your resume location is [resume location]." or "This role appears to be location-specific."
  * Seniority mismatch: JD requires SENIOR level (detect indicators: "Senior", "5+ years", "7+ years", "8+ years", "Lead", "Staff", "Principal", "Senior Engineer", "Senior Developer", etc.) AND resume reflects junior–mid level (based on years of experience, role titles like "Junior", "Associate", "Entry-level", or less than 5 years total experience)
    - Warning format: "This role is marked as Senior (requires [X] years experience), while your resume reflects a junior–mid level profile." or similar factual, neutral statement
    - Do NOT add this warning if resume shows senior-level experience or if JD is not clearly senior-level
  * If no mismatches, warnings array can be empty or omitted

Return ONLY the JSON object, nothing else."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that returns only valid JSON. Never include markdown code blocks or any text outside the JSON object."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.startswith("```"):
            result_text = result_text[3:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]
        result_text = result_text.strip()
        
        result = json.loads(result_text)
        
        # Validate common required keys
        if "match_score" not in result:
            raise ValueError("Missing required key: match_score")
        if "missing_skills" not in result:
            raise ValueError("Missing required key: missing_skills")
        if "contact_mode" not in result:
            raise ValueError("Missing required key: contact_mode")
        
        # Validate types
        if not isinstance(result["match_score"], (int, float)) or not (0 <= result["match_score"] <= 100):
            raise ValueError("match_score must be a number between 0 and 100")
        if not isinstance(result["missing_skills"], list):
            raise ValueError("missing_skills must be an array")
        if result["contact_mode"] not in ["email", "dm", "both"]:
            raise ValueError("contact_mode must be 'email', 'dm', or 'both'")
        
        # Validate mode-specific keys
        if result["contact_mode"] == "email":
            required_email_keys = ["destination_email", "email_subject", "email_body"]
            for key in required_email_keys:
                if key not in result:
                    raise ValueError(f"Missing required key for email mode: {key}")
                if not isinstance(result[key], str):
                    raise ValueError(f"{key} must be a string")
        elif result["contact_mode"] == "dm":
            if "dm_message" not in result:
                raise ValueError("Missing required key for dm mode: dm_message")
            if not isinstance(result["dm_message"], str):
                raise ValueError("dm_message must be a string")
        elif result["contact_mode"] == "both":
            required_both_keys = ["destination_email", "email_subject", "email_body", "dm_message"]
            for key in required_both_keys:
                if key not in result:
                    raise ValueError(f"Missing required key for both mode: {key}")
                if not isinstance(result[key], str):
                    raise ValueError(f"{key} must be a string")
        
        # Validate optional warnings field
        if "warnings" in result:
            if not isinstance(result["warnings"], list):
                raise ValueError("warnings must be an array")
            for warning in result["warnings"]:
                if not isinstance(warning, str):
                    raise ValueError("Each warning must be a string")
        else:
            # Initialize empty warnings if not present
            result["warnings"] = []
        
        return result
        
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise ValueError(f"AI service error: {str(e)}")
