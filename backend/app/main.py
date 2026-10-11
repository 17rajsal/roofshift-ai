import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.api.v1.api import api_router
from app.seed.demo_campus import seed_demo_project_if_needed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("roofshift")

# Create tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed demonstration campus data
    db = SessionLocal()
    try:
        logger.info("Initializing RoofShift AI database and checking demo data...")
        await seed_demo_project_if_needed(db)
    except Exception as e:
        logger.error(f"Error during startup demo check: {str(e)}")
    finally:
        db.close()
    yield

from app.core.security_middleware import (
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    RequestSizeLimitMiddleware
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Explainable Solar Rooftop Planning, Knapsack Budget Optimization, and Load Shifting Platform",
    lifespan=lifespan
)

# 1. Request payload size defense (15MB upper limit)
app.add_middleware(RequestSizeLimitMiddleware, max_bytes=15 * 1024 * 1024)

# 2. Defensive HTTP security headers
app.add_middleware(SecurityHeadersMiddleware)

# 3. Tiered IP-based rate limiting
app.add_middleware(RateLimitMiddleware, enabled=True)

# 4. CORS configuration with credential safety validation
cors_allow_credentials = "*" not in settings.BACKEND_CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=cors_allow_credentials,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Welcome to RoofShift AI API",
        "documentation": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "version": settings.VERSION,
        "edition": "RoofShift AI Enterprise Edition"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
