from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import shutil
import os

from app.db.database import SessionLocal
from app.models.profile_model import Profile
from app.models.ats_model import ATSResult
from app.models.user_model import User
from app.auth.jwt_handler import get_current_user
from app.services.resume_parser import extract_resume_text
from app.ai.mistral_extractor import extract_resume_data
from app.services.experience_calc import calculate_experience
from app.services.profile_service import save_profile
from app.services.ats_service import check_ats_score, generate_ats_resume

router = APIRouter(prefix="/ats", tags=["ATS"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_profile_or_404(profile_id: int, user_id: int, db: Session):
    profile = db.query(Profile).filter(
        Profile.id == profile_id,
        Profile.user_id == user_id,
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


def profile_to_dict(profile: Profile):
    return {
        "personal_info": profile.personal_info,
        "links": profile.links,
        "profile_summary": profile.profile_summary,
        "skills": profile.skills or [],
        "languages": profile.languages or [],
        "certifications": profile.certifications or [],
        "achievements": profile.achievements or [],
        "experience": profile.experience or [],
        "education": profile.education or [],
        "courses": profile.courses or [],
        "years_of_experience": profile.years_of_experience,
        "experience_summary": profile.experience_summary,
    }


@router.post("/check/{profile_id}")
def check_resume_ats(
    profile_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_profile_or_404(profile_id, user.id, db)
    profile_data = profile_to_dict(profile)

    result = check_ats_score(profile_data)

    ats_entry = ATSResult(
        profile_id=profile_id,
        user_id=user.id,
        score=result.get("overall_score"),
        breakdown=result.get("breakdown"),
        explanation=result.get("explanation"),
        suggestions=result.get("suggestions"),
    )
    db.add(ats_entry)
    db.commit()
    db.refresh(ats_entry)

    return {
        "ats_id": ats_entry.id,
        "profile_id": profile_id,
        "overall_score": result.get("overall_score"),
        "breakdown": result.get("breakdown"),
        "explanation": result.get("explanation"),
        "suggestions": result.get("suggestions"),
    }


@router.post("/check-upload")
async def check_resume_ats_upload(
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

        profile_data = {
            "personal_info": profile.personal_info,
            "links": profile.links,
            "profile_summary": profile.profile_summary,
            "skills": profile.skills or [],
            "languages": profile.languages or [],
            "certifications": profile.certifications or [],
            "achievements": profile.achievements or [],
            "experience": profile.experience or [],
            "education": profile.education or [],
            "courses": profile.courses or [],
            "years_of_experience": profile.years_of_experience,
            "experience_summary": profile.experience_summary,
        }

        result = check_ats_score(profile_data)

        ats_entry = ATSResult(
            profile_id=profile.id,
            user_id=user.id,
            score=result.get("overall_score"),
            breakdown=result.get("breakdown"),
            explanation=result.get("explanation"),
            suggestions=result.get("suggestions"),
        )
        db.add(ats_entry)
        db.commit()
        db.refresh(ats_entry)
    finally:
        db.close()

    return {
        "ats_id": ats_entry.id,
        "profile_id": profile.id,
        "overall_score": result.get("overall_score"),
        "breakdown": result.get("breakdown"),
        "explanation": result.get("explanation"),
        "suggestions": result.get("suggestions"),
    }


@router.post("/generate/{profile_id}")
def generate_ats_friendly_resume(
    profile_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_profile_or_404(profile_id, user.id, db)
    profile_data = profile_to_dict(profile)

    prev_ats = db.query(ATSResult).filter(
        ATSResult.profile_id == profile_id,
        ATSResult.user_id == user.id,
    ).order_by(ATSResult.id.desc()).first()

    suggestions = prev_ats.suggestions if prev_ats and prev_ats.suggestions else None

    try:
        ats_result = generate_ats_resume(profile_data, suggestions)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {str(e)}")

    ats_resume_data = ats_result.get("ats_resume_data", {})

    resume_score = None
    if ats_resume_data and isinstance(ats_resume_data, dict):
        try:
            score_result = check_ats_score(ats_resume_data)
            resume_score = score_result.get("overall_score")
        except Exception as e:
            print(f"Warning: failed to score generated resume: {e}")

    original_score = prev_ats.score if prev_ats and prev_ats.score is not None else None

    if prev_ats:
        prev_ats.ats_resume_data = ats_resume_data
        prev_ats.ats_resume_score = resume_score
        db.commit()
        db.refresh(prev_ats)
        ats_entry = prev_ats
    else:
        ats_entry = ATSResult(
            profile_id=profile_id,
            user_id=user.id,
            score=original_score,
            ats_resume_data=ats_resume_data,
            ats_resume_score=resume_score,
        )
        db.add(ats_entry)
        db.commit()
        db.refresh(ats_entry)

    return {
        "ats_id": ats_entry.id,
        "profile_id": profile_id,
        "ats_resume_data": ats_resume_data,
        "original_score": original_score,
        "ats_resume_score": resume_score,
    }


@router.get("/score/{profile_id}")
def get_ats_score(
    profile_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_profile_or_404(profile_id, user.id, db)

    ats_entry = db.query(ATSResult).filter(
        ATSResult.profile_id == profile_id,
        ATSResult.user_id == user.id,
    ).order_by(ATSResult.id.desc()).first()

    if not ats_entry:
        raise HTTPException(
            status_code=404,
            detail="No ATS check found for this profile. Run /ats/check/{profile_id} first.",
        )

    return {
        "ats_id": ats_entry.id,
        "profile_id": profile_id,
        "overall_score": ats_entry.score,
        "breakdown": ats_entry.breakdown,
        "explanation": ats_entry.explanation,
        "suggestions": ats_entry.suggestions,
        "ats_resume_data": ats_entry.ats_resume_data,
        "ats_resume_score": ats_entry.ats_resume_score,
        "created_at": str(ats_entry.created_at) if ats_entry.created_at else None,
    }
