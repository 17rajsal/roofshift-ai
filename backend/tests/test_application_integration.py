"""Transport and persistence checks; no engine implementation is changed here."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.services.storage.s3_adapter import storage_adapter


@pytest.fixture
def application_client(tmp_path, monkeypatch):
    database = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(database)
    sessions = sessionmaker(bind=database)

    def isolated_db():
        with sessions() as session:
            yield session

    async def local_solar_stub(*args, **kwargs):
        return None

    monkeypatch.setattr('app.api.v1.buildings.calculate_building_solar_potential', local_solar_stub)
    monkeypatch.setattr(settings, 'REPORTS_DIR', str(tmp_path))
    monkeypatch.setattr(storage_adapter, 'save_report_file', lambda path, name: (path, 'local', False))
    monkeypatch.setattr(storage_adapter, 'is_s3_active', lambda: False)
    previous = dict(app.dependency_overrides)
    app.dependency_overrides[get_db] = isolated_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)
        database.dispose()


def project(client):
    response = client.post('/api/v1/projects', json={
        'name': 'Review <Campus> & Trust', 'organization_name': 'A&B <Institute>',
        'city': 'New Delhi', 'latitude': 28.614, 'longitude': 77.209,
        'budget': 1000000, 'tariff_rate': 8.5, 'export_tariff': 3.5,
    })
    assert response.status_code == 201
    return response.json()['id']


def test_roof_outline_persists_and_project_copy_keeps_geometry(application_client):
    client = application_client
    project_id = project(client)
    outline = [[28.614, 77.209], [28.6142, 77.209], [28.6142, 77.2094], [28.614, 77.2094]]
    created = client.post(f'/api/v1/projects/{project_id}/buildings', json={
        'name': 'Library', 'latitude': 28.6141, 'longitude': 77.2092,
        'gross_roof_area': 800.25, 'roof_polygon': outline,
        'obstacles_notes': 'Water tank on east corner', 'monthly_consumption_kwh': 2000,
        'max_eligible_kwp': 20,
    })
    assert created.status_code == 201
    building_id = created.json()['id']
    loaded = client.get(f'/api/v1/buildings/{building_id}').json()
    assert loaded['roof_polygon'] == outline
    assert loaded['gross_roof_area'] == 800.25
    copied = client.post(f'/api/v1/projects/{project_id}/duplicate')
    assert copied.status_code == 200
    roofs = client.get(f"/api/v1/projects/{copied.json()['id']}/buildings").json()
    assert len(roofs) == 1
    assert roofs[0]['roof_polygon'] == outline
    assert roofs[0]['obstacles_notes'] == loaded['obstacles_notes']
    assert roofs[0]['max_eligible_kwp'] == 20


def test_reports_accept_text_notes_and_never_overwrite_a_previous_file(application_client):
    client = application_client
    project_id = project(client)
    first = client.post(f'/api/v1/projects/{project_id}/reports', json={'notes': 'Review <roof> & budget.\nSecond line.'})
    assert first.status_code == 201
    first_pdf = client.get(first.json()['download_url']).content
    assert first_pdf.startswith(b'%PDF-')
    second = client.post(f'/api/v1/projects/{project_id}/reports', json={'notes': 'Different review context.'})
    assert second.status_code == 201
    assert first.json()['filename'] != second.json()['filename']
    assert client.get(first.json()['download_url']).content == first_pdf
    assert len(client.get(f'/api/v1/projects/{project_id}/reports').json()) == 2
    oversized = client.post(f'/api/v1/projects/{project_id}/reports', json={'notes': 'x' * 2001})
    assert oversized.status_code == 422
