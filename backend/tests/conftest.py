"""All backend tests use disposable storage and deterministic external data."""
import os
import tempfile
from pathlib import Path

_runtime = Path(tempfile.mkdtemp(prefix="roofshift-engine-tests-"))
os.environ["DATABASE_URL"] = "sqlite:///" + (_runtime / "tests.db").as_posix()
os.environ["REPORTS_DIR"] = str(_runtime / "reports")
os.environ["UPLOADS_DIR"] = str(_runtime / "uploads")
os.environ["AWS_ENABLED"] = "false"

import httpx
import pytest


@pytest.fixture(autouse=True)
def deterministic_nasa(monkeypatch):
    original = httpx.AsyncClient.get

    async def get(client, url, *args, **kwargs):
        if "power.larc.nasa.gov" in str(url):
            from app.services.energy.balance import MONTH_KEYS
            return httpx.Response(200, request=httpx.Request("GET", url), json={
                "properties": {"parameter": {"ALLSKY_SFC_SW_DWN": {m: 5.0 for m in MONTH_KEYS}}}
            })
        return await original(client, url, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "get", get)


@pytest.fixture
def engine_db():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    from app.core.database import Base
    import app.models
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def engine_building(engine_db):
    from app.models.project import Project
    from app.models.building import Building
    p = Project(name="Engine Fixture", organization_name="Isolated tests", latitude=28, longitude=77,
                budget=100000, tariff_rate=8, export_tariff=3, co2_factor=0.716)
    engine_db.add(p)
    engine_db.flush()
    b = Building(project_id=p.id, name="Fixture roof", latitude=28, longitude=77, gross_roof_area=100,
                 usable_roof_percentage=80, monthly_consumption_kwh=300, daytime_consumption_pct=65,
                 shading_category="Custom", custom_shading_loss=0, cost_per_kwp=50000, fixed_cost=1000)
    engine_db.add(b)
    engine_db.commit()
    return p, b
