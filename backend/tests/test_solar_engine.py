import pytest
from app.services.solar.solar_engine import get_effective_shading_loss

def test_effective_shading_loss():
    assert get_effective_shading_loss("Low") == 5.0
    assert get_effective_shading_loss("Medium") == 15.0
    assert get_effective_shading_loss("High") == 30.0
    assert get_effective_shading_loss("Custom", 22.5) == 22.5
    assert get_effective_shading_loss("Unknown") == 5.0

def test_usable_roof_capacity():
    gross_area = 500.0
    usable_pct = 70.0
    area_per_kwp = 8.0

    usable_area = gross_area * (usable_pct / 100.0)
    assert usable_area == 350.0

    capacity_kwp = usable_area / area_per_kwp
    assert capacity_kwp == 43.75

def test_avoided_co2_calculation():
    annual_gen_kwh = 50000.0
    cea_factor = 0.716
    avoided_co2_kg = annual_gen_kwh * cea_factor
    assert avoided_co2_kg == 35800.0
