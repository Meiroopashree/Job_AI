from typing import Optional

from fastapi import APIRouter, HTTPException

from app.services.seed_service import seed_demo

router = APIRouter(prefix="/seed", tags=["Seed"])


@router.post("/demo")
def create_demo(confirm: Optional[bool] = None):
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Pass confirm=true to create the demo account and sample resumes.",
        )
    return seed_demo()