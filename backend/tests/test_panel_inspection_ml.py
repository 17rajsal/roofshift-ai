"""
Unit and Integration Tests for Real Computer Vision Solar Panel Inspection Service (MobileNetV3)
"""
import io
import os
import pytest
from PIL import Image
from starlette.testclient import TestClient

from app.main import app
from app.services.inspection.panel_analyzer import (
    analyze_solar_panel_image,
    MODEL_WEIGHTS_PATH,
    METADATA_PATH,
    _get_panel_model
)

client = TestClient(app)


def test_mobilenet_v3_artifacts_exist():
    """Verify that PyTorch weights and metadata JSON exist in artifacts directory."""
    assert os.path.exists(MODEL_WEIGHTS_PATH), f"Weights file {MODEL_WEIGHTS_PATH} must exist"
    assert os.path.exists(METADATA_PATH), f"Metadata file {METADATA_PATH} must exist"


def test_mobilenet_v3_model_loads_successfully():
    """Verify that MobileNetV3 model instantiates and loads weights correctly."""
    model, metadata, transform = _get_panel_model()
    assert model is not None, "Model must load successfully"
    assert metadata is not None, "Metadata must be loaded"
    assert metadata["model_architecture"] == "MobileNetV3_Small"
    assert metadata["evaluation_on_held_out_test_set"]["accuracy"] > 0.80
    assert metadata["evaluation_on_held_out_test_set"]["macro_f1"] > 0.80
    assert transform is not None, "Image transforms must be defined"


def test_panel_inspection_clean_module_inference():
    """Test inference on a genuine clean panel image."""
    clean_sample_path = os.path.abspath(os.path.join(
        os.path.dirname(__file__), "..", "..", "ml", "data", "panel_images", "clean", "Clean (1).jpeg"
    ))
    if os.path.exists(clean_sample_path):
        with open(clean_sample_path, "rb") as f:
            bytes_data = f.read()
        res = analyze_solar_panel_image(bytes_data, "Clean (1).jpeg")
        assert res["defect_type"] in ["NORMAL", "CLEAN"]
        assert res["confidence_score"] >= 0.65
        assert "MobileNetV3" in res["model_provenance"]
        assert res["temperature_delta_c"] <= 2.0
        assert res["estimated_power_loss_pct"] == 0.0


def test_panel_inspection_soiled_module_inference():
    """Test inference on a genuine dusty/soiled panel image."""
    soiled_sample_path = os.path.abspath(os.path.join(
        os.path.dirname(__file__), "..", "..", "ml", "data", "panel_images", "soiled", "Dust (1).jpg"
    ))
    if os.path.exists(soiled_sample_path):
        with open(soiled_sample_path, "rb") as f:
            bytes_data = f.read()
        res = analyze_solar_panel_image(bytes_data, "Dust (1).jpg")
        assert res["defect_type"] in ["SOILING", "DUST"]
        assert res["confidence_score"] >= 0.65
        assert "MobileNetV3" in res["model_provenance"]
        assert "washing cycle" in res["recommended_action"]


def test_panel_inspection_empty_bytes_raises():
    """Empty image bytes must raise ValueError."""
    with pytest.raises(ValueError):
        analyze_solar_panel_image(b"", "empty.jpg")
