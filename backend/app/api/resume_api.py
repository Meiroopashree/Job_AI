from fastapi import APIRouter, UploadFile, File, Depends
import shutil
import os

from app.services.experience_calc import calculate_experience
from app.services.resume_parser import extract_resume_text
from app.ai.mistral_extractor import extract_resume_data
from app.db.database import SessionLocal
from app.services.profile_service import save_profile
from app.models.user_model import User
from app.auth.jwt_handler import get_current_user

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    file_path = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    resume_text = extract_resume_text(file_path)

    if not resume_text or len(resume_text.strip()) < 20:
        try:
            from pdf2image import convert_from_path
            import pytesseract

            images = convert_from_path(file_path)
            resume_text = ""
            for img in images:
                resume_text += pytesseract.image_to_string(img)
        except Exception as e:
            print("OCR failed:", e)
            return {
                "error": "Resume text extraction failed",
                "reason": "PDF is scanned/image-based and OCR failed",
                "file": file.filename,
            }

    if not resume_text or len(resume_text.strip()) < 20:
        return {
            "error": "Resume text still empty after OCR",
            "file": file.filename,
        }

    extracted_data = extract_resume_data(resume_text)

    if (
        not extracted_data.get("skills")
        and not extracted_data.get("experience")
        and not extracted_data.get("education")
    ):
        return {
            "error": "AI returned empty structured data",
            "reason": "Resume may be low quality or parsing failed",
        }

    exp_result = calculate_experience(extracted_data.get("experience", []))
    extracted_data["years_of_experience"] = exp_result["decimal_years"]
    extracted_data["experience_summary"] = {
        "years": exp_result["years"],
        "months": exp_result["months"],
        "total_months": exp_result["total_months"],
    }

    db = SessionLocal()
    try:
        extracted_data["user_id"] = user.id
        extracted_data["file_name"] = file.filename
        profile = save_profile(db, extracted_data)
    finally:
        db.close()

    return {
        "message": "Resume uploaded successfully",
        "profile_id": profile.id,
        "data": extracted_data,
    }
