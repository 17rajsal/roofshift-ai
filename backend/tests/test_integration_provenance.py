"""Saved source provenance survives the application/engine integration."""
from types import SimpleNamespace

import pytest

from app.services.features.templates import project_feature_templates


@pytest.mark.parametrize("source, expected_basis", [
    ("RoofShift GHI v3 | NASA POWER Climatology (Satellite/Model)", "climatology"),
    ("RoofShift GHI v3 | Illustrative Solar Planning Defaults (Indian example profile)", "user_assumption"),
])
def test_location_template_preserves_actual_irradiation_basis(source, expected_basis):
    analysis = SimpleNamespace(annual_generation_kwh=100, annual_onsite_consumed_kwh=50,
                               installation_cost_inr=1000, max_pv_capacity_kwp=1,
                               effective_shading_loss_pct=0, ghi_annual_avg_kwh_m2_day=5,
                               irradiance_source=source)
    building = SimpleNamespace(id="roof", name="Surveyed roof", latitude=28, longitude=77,
                               gross_roof_area=10, usable_roof_percentage=80, solar_analysis=analysis)
    project = SimpleNamespace(id="project", latitude=28, longitude=77, tariff_rate=8,
                              export_tariff=3, co2_factor=.7)

    class Query:
        def __init__(self, items):
            self.items = items
        def filter(self, *args):
            return self
        def order_by(self, *args):
            return self
        def all(self):
            return self.items
        def first(self):
            return None

    class Database:
        def query(self, model):
            return Query([building] if model.__name__ == "Building" else [])

    templates = project_feature_templates(project, Database())
    candidate = templates["features"][0]["request"]["candidates"][0]
    assert candidate["data_basis"] == expected_basis
    assert candidate["irradiance_source"] == source
