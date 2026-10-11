"""
Automated Security Hardening & Penetration Defense Test Suite.
Verifies production defenses across HTTP headers, rate limiting, request size limits,
magic-byte validation, CSV formula injection sanitization, path traversal defenses,
and demo asset immutability.
"""
import io
import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException
from app.main import app
from app.core.config import settings
from app.core.file_security import (
    validate_image_file,
    validate_csv_content,
    sanitize_csv_formula_injection,
    assert_path_in_directory,
    sanitize_filename,
    generate_safe_disk_filename
)
from app.core.security_middleware import rate_limiter

client = TestClient(app)

def test_security_headers_present():
    """Verify security headers are injected into HTTP responses."""
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    headers = resp.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "SAMEORIGIN"
    assert "1; mode=block" in headers.get("X-XSS-Protection", "")
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "default-src 'self'" in headers.get("Content-Security-Policy", "")
    assert "camera=()" in headers.get("Permissions-Policy", "")

def test_rate_limiter_sliding_window_defense():
    """Verify rate limiter blocks bursts from external IPs and returns HTTP 429."""
    simulated_ip = "198.51.100.99"
    # Geocoding tier limit is 60 req/min
    rate_limiter.clear()

    # Exhaust limit
    for _ in range(60):
        resp = client.get(
            "/api/v1/geocoding/search?q=Delhi",
            headers={"X-Forwarded-For": simulated_ip}
        )
        assert resp.status_code == 200

    # 61st request must trigger HTTP 429
    blocked = client.get(
        "/api/v1/geocoding/search?q=Delhi",
        headers={"X-Forwarded-For": simulated_ip}
    )
    assert blocked.status_code == 429
    data = blocked.json()
    assert data["error_code"] == "RATE_LIMIT_EXCEEDED"
    assert "Retry-After" in blocked.headers

    # Verify test-suite bypass header allows request through even when exhausted
    bypassed = client.get(
        "/api/v1/geocoding/search?q=Delhi",
        headers={
            "X-Forwarded-For": simulated_ip,
            "X-Bypass-Rate-Limit": "test-suite"
        }
    )
    assert bypassed.status_code == 200

    rate_limiter.clear()

def test_request_size_limit_middleware_413():
    """Verify that requests with oversized Content-Length are rejected with HTTP 413."""
    oversized_headers = {
        "Content-Length": str(20 * 1024 * 1024),  # 20MB > 15MB limit
        "Content-Type": "application/json"
    }
    resp = client.post("/api/v1/projects", headers=oversized_headers, json={"name": "test"})
    assert resp.status_code == 413
    assert "exceeds maximum allowed size" in resp.json()["detail"]

def test_image_upload_magic_byte_validation():
    """Verify image validator rejects disguised payloads and accepts valid headers."""
    # 1. HTML script disguised as .jpg
    fake_jpg = b"<html><script>alert(1)</script></html>"
    with pytest.raises(HTTPException) as exc_info:
        validate_image_file(fake_jpg, "exploit.jpg")
    assert exc_info.value.status_code == 400
    assert "MIME mismatch" in exc_info.value.detail or "signature" in exc_info.value.detail

    # 2. Executable disguised as .png
    fake_png = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00"
    with pytest.raises(HTTPException) as exc_info:
        validate_image_file(fake_png, "exploit.png")
    assert exc_info.value.status_code == 400

    # 3. Valid JPEG header
    valid_jpg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 50
    # Should not raise
    validate_image_file(valid_jpg, "valid_drone_shot.jpg")

    # 4. Valid PNG header
    valid_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 50
    # Should not raise
    validate_image_file(valid_png, "valid_drone_shot.png")

def test_csv_validation_and_formula_injection_neutralization():
    """Verify CSV validation catches null bytes and neutralizes formula injection."""
    # 1. Null byte binary payload
    null_byte_csv = b"timestamp,power_kw\n2026-01-01,10.5\n\x00malicious"
    with pytest.raises(HTTPException) as exc_info:
        validate_csv_content(null_byte_csv, "readings.csv")
    assert exc_info.value.status_code == 400
    assert "illegal binary/null bytes" in exc_info.value.detail

    # 2. Formula injection strings
    test_cases = [
        ("=cmd|'/C calc'!A0", "'=cmd|'/C calc'!A0"),
        ("+1+2", "'+1+2"),
        ("-SUM(A1:A10)", "'-SUM(A1:A10)"),
        ("@DDE(\"server\",\"topic\",\"item\")", "'@DDE(\"server\",\"topic\",\"item\")"),
        ("|pipe_command", "'|pipe_command"),
        ("NORMAL_STRING_123", "NORMAL_STRING_123")
    ]
    for raw, expected in test_cases:
        assert sanitize_csv_formula_injection(raw) == expected

def test_path_traversal_prevention():
    """Verify assert_path_in_directory prevents canonical traversal attacks."""
    from pathlib import Path
    base_dir = Path(settings.REPORTS_DIR).resolve()
    base_dir.mkdir(parents=True, exist_ok=True)

    safe_target = base_dir / "report_123.pdf"
    # Should not raise
    assert_path_in_directory(safe_target, base_dir)

    # Traversal target outside base_dir
    traversal_target = (base_dir / ".." / "system32" / "cmd.exe").resolve()
    with pytest.raises(HTTPException) as exc_info:
        assert_path_in_directory(traversal_target, base_dir)
    assert exc_info.value.status_code == 403

def test_filename_sanitization_and_unique_disk_names():
    """Verify filenames strip path separators and produce collision-resistant disk paths."""
    dangerous_name = "../../etc/passwd\x00.csv"
    sanitized = sanitize_filename(dangerous_name)
    assert "/" not in sanitized
    assert "\\" not in sanitized
    assert ".." not in sanitized

    disk_name = generate_safe_disk_filename(dangerous_name, prefix="telemetry")
    assert disk_name.startswith("telemetry_")
    assert disk_name.endswith(".csv")

def test_geocoding_input_validation():
    """Verify geocoding input constraints and character bounds."""
    # Under 2 characters
    short_resp = client.get("/api/v1/geocoding/search?q=a")
    assert short_resp.status_code == 422

    # Over 100 characters
    long_resp = client.get(f"/api/v1/geocoding/search?q={'a'*105}")
    assert long_resp.status_code == 422

def test_protected_demo_campus_cannot_be_deleted():
    """Verify demo project cannot be deleted via API."""
    # Create or fetch demo project
    list_resp = client.get("/api/v1/projects")
    assert list_resp.status_code == 200
    projects = list_resp.json()
    
    demo_p = next((p for p in projects if p.get("is_demo") == "true" or p.get("name") == "IIT Delhi Hauz Khas Campus"), None)
    if not demo_p:
        seed_resp = client.post("/api/v1/projects/seed-demo")
        demo_p = seed_resp.json()

    del_resp = client.delete(f"/api/v1/projects/{demo_p['id']}")
    assert del_resp.status_code == 403
    assert "Protected institutional demo campus cannot be deleted" in del_resp.json()["detail"]
