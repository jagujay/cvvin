# Placeholder for analysis endpoints
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def placeholder():
    return {"message": "Analysis endpoints coming soon"}


