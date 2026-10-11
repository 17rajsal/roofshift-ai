import io
import json
import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.models.project import Project
from app.models.building import Building
from app.models.solar import SolarAnalysis

client = TestClient(app)


def test_bulk_import_csv_5_buildings():
    """Verify importing a portfolio with 5 buildings via CSV, computing solar potential."""
    db_session = SessionLocal()
    try:
        project = Project(
            name="Small Campus Portfolio",
            organization_name="University Campus",
            city="Hyderabad",
            latitude=17.5449,
            longitude=78.5718,
            budget=5000000.0,
            tariff_rate=8.5,
            export_tariff=3.5,
        )
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        project_id = project.id
    finally:
        db_session.close()

    csv_data = (
        "name,latitude,longitude,gross_roof_area,usable_roof_percentage,category,monthly_consumption_kwh,tariff_inr\n"
        "Admin Block,17.5450,78.5720,2000,80,academic,25000,8.5\n"
        "Library Building,17.5452,78.5725,1800,85,academic,20000,8.5\n"
        "Science Block,17.5455,78.5730,3000,75,laboratory,35000,8.5\n"
        "Dining Hall,17.5445,78.5715,1500,70,assembly,18000,8.5\n"
        "Hostel 1,17.5440,78.5710,2500,80,residential,22000,8.5\n"
    )

    response = client.post(
        f"/api/v1/projects/{project_id}/buildings/bulk-import",
        files={"file": ("buildings.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["total_processed"] == 5
    assert data["imported"] == 5
    assert data["failed"] == 0
    assert data["total_buildings_in_project"] == 5
    assert data["total_usable_area_sqm"] > 0
    assert data["total_potential_kwp"] > 0
    assert data["total_annual_generation_kwh"] > 0


def test_bulk_import_geojson_polygons():
    """Verify importing buildings via GeoJSON FeatureCollection with polygon coordinates."""
    db_session = SessionLocal()
    try:
        project = Project(
            name="GeoJSON Test Campus",
            organization_name="Tech Park",
            city="Hyderabad",
            latitude=17.5449,
            longitude=78.5718,
            budget=10000000.0,
            tariff_rate=9.0,
        )
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        project_id = project.id
    finally:
        db_session.close()

    geojson_data = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [78.5710, 17.5440],
                            [78.5720, 17.5440],
                            [78.5720, 17.5450],
                            [78.5710, 17.5450],
                            [78.5710, 17.5440],
                        ]
                    ],
                },
                "properties": {
                    "name": "Tower Alpha",
                    "category": "commercial",
                    "gross_roof_area": 3500.0,
                    "usable_roof_percentage": 85.0,
                    "monthly_consumption_kwh": 40000.0,
                },
            },
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [78.5730, 17.5460],
                },
                "properties": {
                    "name": "Tower Beta",
                    "category": "commercial",
                    "gross_roof_area": 2800.0,
                    "usable_roof_percentage": 80.0,
                    "monthly_consumption_kwh": 32000.0,
                },
            },
        ],
    }

    response = client.post(
        f"/api/v1/projects/{project_id}/buildings/bulk-import",
        json=geojson_data,
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["imported"] == 2
    assert data["failed"] == 0
    assert data["total_buildings_in_project"] == 2


def test_portfolio_pagination_and_search():
    """Verify paginated listing with limits and offset, along with search filtering."""
    db_session = SessionLocal()
    try:
        project = Project(
            name="Paginated Portfolio",
            organization_name="Large Enterprise",
            city="Hyderabad",
            latitude=17.5449,
            longitude=78.5718,
        )
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        project_id = project.id

        # Insert 60 buildings
        buildings = []
        for i in range(60):
            b = Building(
                project_id=project_id,
                name=f"Warehouse Section {i:02d}",
                category="industrial" if i % 2 == 0 else "commercial",
                latitude=17.5449 + (i * 0.0001),
                longitude=78.5718 + (i * 0.0001),
                gross_roof_area=1500.0,
                usable_roof_percentage=80.0,
                monthly_consumption_kwh=10000.0,
            )
            buildings.append(b)
        db_session.add_all(buildings)
        db_session.commit()
    finally:
        db_session.close()

    # Page 1: limit=50, offset=0
    resp1 = client.get(f"/api/v1/projects/{project_id}/buildings?limit=50&offset=0")
    assert resp1.status_code == 200
    page1 = resp1.json()
    assert len(page1) == 50

    # Page 2: limit=50, offset=50
    resp2 = client.get(f"/api/v1/projects/{project_id}/buildings?limit=50&offset=50")
    assert resp2.status_code == 200
    page2 = resp2.json()
    assert len(page2) == 10

    # Search filter
    resp3 = client.get(f"/api/v1/projects/{project_id}/buildings?search=Section 05")
    assert resp3.status_code == 200
    found = resp3.json()
    assert len(found) == 1
    assert found[0]["name"] == "Warehouse Section 05"

    # Category filter
    resp4 = client.get(f"/api/v1/projects/{project_id}/buildings?category=industrial&limit=100")
    assert resp4.status_code == 200
    ind = resp4.json()
    assert len(ind) == 30


def test_scalability_500_buildings_batch_recalculation():
    """Verify that a 500-building portfolio handles batch recalculation without timing out."""
    db_session = SessionLocal()
    try:
        project = Project(
            name="Mega Solar Industrial Park",
            organization_name="Industrial Consortium",
            city="Hyderabad",
            latitude=17.5449,
            longitude=78.5718,
            budget=50000000.0,
        )
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        project_id = project.id

        # Insert 500 buildings in batch
        buildings = [
            Building(
                project_id=project_id,
                name=f"Plant Unit {i:03d}",
                category="industrial",
                latitude=17.5449 + ((i % 25) * 0.0002),
                longitude=78.5718 + ((i // 25) * 0.0002),
                gross_roof_area=2000.0 + (i * 5),
                usable_roof_percentage=80.0,
                monthly_consumption_kwh=15000.0,
            )
            for i in range(500)
        ]
        db_session.add_all(buildings)
        db_session.commit()
    finally:
        db_session.close()

    start_time = time.perf_counter()
    # Trigger batch recalculation
    resp = client.post(f"/api/v1/projects/{project_id}/recalculate")
    elapsed = time.perf_counter() - start_time

    assert resp.status_code == 200, resp.text
    result = resp.json()
    assert result["total_buildings"] == 500
    assert result["recalculated"] == 500
    assert result["failed"] == 0
    assert result["total_potential_kwp"] > 0
    assert result["total_annual_generation_kwh"] > 0

    # Ensure batch recalculation completed in under 10 seconds
    assert elapsed < 10.0, f"Recalculation took too long: {elapsed:.2f}s"


def test_bulk_import_error_resilience():
    """Verify that malformed rows are gracefully logged as errors without aborting valid rows."""
    db_session = SessionLocal()
    try:
        project = Project(
            name="Resilience Test Campus",
            organization_name="Testing",
            city="Hyderabad",
            latitude=17.5449,
            longitude=78.5718,
        )
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        project_id = project.id
    finally:
        db_session.close()

    # Row 1 is valid, Row 2 has missing name, Row 3 has negative area, Row 4 is valid
    csv_data = (
        "name,latitude,longitude,gross_roof_area,usable_roof_percentage\n"
        "Valid Roof 1,17.5450,78.5720,2000,80\n"
        ",17.5452,78.5725,1800,80\n"
        "Negative Area Roof,17.5455,78.5730,-500,80\n"
        "Valid Roof 2,17.5440,78.5710,3000,75\n"
    )

    response = client.post(
        f"/api/v1/projects/{project_id}/buildings/bulk-import",
        files={"file": ("test.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_processed"] == 4
    assert data["imported"] == 2
    assert data["failed"] == 2
    assert len(data["errors"]) == 2
