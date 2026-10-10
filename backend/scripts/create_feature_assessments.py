"""Optional explicit additive migration for deployments managing DDL separately.

Run from repository root with PYTHONPATH=backend:
    python backend/scripts/create_feature_assessments.py
Normal application startup creates this table through existing create_all.
Existing tables and records are neither altered nor copied.
"""
from app.core.database import engine
from app.models.feature import FeatureAssessment

if __name__ == "__main__":
    FeatureAssessment.__table__.create(bind=engine, checkfirst=True)
    print("feature_assessments table is available; existing project data preserved.")
