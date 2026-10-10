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


def test_panel_inspection_upload_and_defect_summary(application_client):
    client = application_client
    project_id = project(client)
    created = client.post(f'/api/v1/projects/{project_id}/buildings', json={
        'name': 'Science Wing', 'latitude': 28.6141, 'longitude': 77.2092,
        'gross_roof_area': 500, 'monthly_consumption_kwh': 1200
    })
    assert created.status_code == 201
    b_id = created.json()['id']

    # Upload hotspot inspection image
    img_content = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xFF\xDB\x00C\x00" + (b"\x80" * 200)
    res = client.post(
        f'/api/v1/buildings/{b_id}/panel-inspection',
        files={'file': ('thermal_hotspot_cell3.jpg', img_content, 'image/jpeg')}
    )
    assert res.status_code == 200
    data = res.json()
    assert data['defect_type'] == 'HOTSPOT'
    assert data['severity'] == 'HIGH'
    assert data['confidence_score'] >= 0.8
    assert data['temperature_delta_c'] > 10.0

    # Retrieve history
    history = client.get(f'/api/v1/buildings/{b_id}/panel-inspections')
    assert history.status_code == 200
    assert len(history.json()) == 1

    # Project summary
    summary = client.get(f'/api/v1/projects/{project_id}/defect-summary')
    assert summary.status_code == 200
    s_data = summary.json()
    assert s_data['total_inspections'] == 1
    assert s_data['defects_detected'] == 1
    assert s_data['critical_alerts'] == 1


def test_inverter_monitoring_upload_and_pr_analysis(application_client):
    client = application_client
    project_id = project(client)
    csv_content = (
        "timestamp,inverter_generation_kwh\n"
        "2026-10-01T10:00:00Z,45.2\n"
        "2026-10-01T11:00:00Z,58.4\n"
        "2026-10-01T12:00:00Z,62.1\n"
        "2026-10-01T13:00:00Z,61.0\n"
        "2026-10-01T14:00:00Z,52.3\n"
    )
    res = client.post(
        f'/api/v1/projects/{project_id}/monitoring-upload',
        files={'file': ('solar_inverter_oct.csv', csv_content.encode('utf-8'), 'text/csv')}
    )
    assert res.status_code == 200
    data = res.json()
    assert data['record_count'] == 5
    assert data['total_measured_generation_kwh'] == pytest.approx(279.0, abs=1.0)
    assert 'PR' in data['diagnostic_summary'] or 'Performance' in data['diagnostic_summary']

    logs = client.get(f'/api/v1/projects/{project_id}/monitoring-logs')
    assert logs.status_code == 200
    assert len(logs.json()) == 1


def test_maintenance_cases_full_lifecycle(application_client):
    client = application_client
    project_id = project(client)

    # 1. Create case
    created = client.post(f'/api/v1/projects/{project_id}/maintenance-cases', json={
        'title': 'Heavy dust on North Arrays',
        'description': 'Monsoon dust layer causing 8% output dip',
        'category': 'PANEL_SOILING',
        'priority': 'HIGH',
        'estimated_loss_kwh_per_day': 14.5,
        'assigned_to': 'Campus Maintenance Team A'
    })
    assert created.status_code == 200
    case_id = created.json()['id']
    assert created.json()['status'] == 'OPEN'

    # 2. List cases
    cases = client.get(f'/api/v1/projects/{project_id}/maintenance-cases?status=OPEN')
    assert cases.status_code == 200
    assert len(cases.json()) == 1

    # 3. Update case status to RESOLVED
    updated = client.patch(f'/api/v1/maintenance-cases/{case_id}', json={'status': 'RESOLVED'})
    assert updated.status_code == 200
    assert updated.json()['status'] == 'RESOLVED'
    assert updated.json()['resolved_at'] is not None

    # 4. Delete case
    deleted = client.delete(f'/api/v1/maintenance-cases/{case_id}')
    assert deleted.status_code == 200
    assert len(client.get(f'/api/v1/projects/{project_id}/maintenance-cases').json()) == 0
