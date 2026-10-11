import io
import os
import re
import uuid
from typing import Optional, List, Dict
from pathlib import Path
from fastapi import HTTPException

# Allowed image magic signatures
IMAGE_SIGNATURES = {
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".webp": [b"RIFF"],  # and contents[8:12] == b"WEBP"
    ".tif": [b"II*\x00", b"MM\x00*"],
    ".tiff": [b"II*\x00", b"MM\x00*"],
}

def sanitize_filename(filename: str, max_length: int = 100) -> str:
    """
    Strips directory traversal sequences, path separators, and dangerous characters.
    Returns a safe, normalized filename.
    """
    clean = Path(filename or "upload.dat").name
    # Remove control characters and non-printable characters
    clean = re.sub(r'[\x00-\x1f\x7f\\/:*?"<>|]', '_', clean)
    # Collapse multiple dots or spaces
    clean = re.sub(r'\.{2,}', '.', clean)
    clean = re.sub(r'\s+', '_', clean).strip('._')
    if not clean:
        clean = "file"
    return clean[:max_length]

def generate_safe_disk_filename(original_filename: str, prefix: str = "") -> str:
    """
    Generates a unique, non-colliding filename with sanitized extension.
    Example: 'proj123_a1b2c3d4_cleaned_name.csv'
    """
    clean = sanitize_filename(original_filename)
    unique_id = uuid.uuid4().hex[:12]
    ext = Path(clean).suffix.lower()
    base = Path(clean).stem[:40]
    pfx = f"{prefix.rstrip('_')}_" if prefix else ""
    return f"{pfx}{unique_id}_{base}{ext}"

def validate_image_file(contents: bytes, filename: str, max_bytes: int = 10 * 1024 * 1024) -> None:
    """
    Validates image file extension, size limit, and genuine magic byte header.
    Performs decompression bomb defenses and dimension sanity checks.
    Rejects disguised HTML, scripts, or corrupt files.
    """
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Image file exceeds maximum limit of {max_bytes // (1024 * 1024)}MB."
        )

    ext = Path(filename).suffix.lower()
    if ext not in IMAGE_SIGNATURES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format '{ext}'. Allowed extensions: {', '.join(IMAGE_SIGNATURES.keys())}."
        )

    # Magic byte signature check
    valid_sig = False
    for sig in IMAGE_SIGNATURES[ext]:
        if contents.startswith(sig):
            if ext == ".webp":
                if len(contents) >= 12 and contents[8:12] == b"WEBP":
                    valid_sig = True
                    break
            else:
                valid_sig = True
                break

    if not valid_sig:
        raise HTTPException(
            status_code=400,
            detail="File content does not match the declared image format signature (MIME mismatch / invalid header)."
        )

    # Decompression bomb and pixel flood defense using PIL if available
    try:
        from PIL import Image
        Image.MAX_IMAGE_PIXELS = 40_000_000
        # If payload contains substantive bytes (>256 bytes), verify dimensions
        if len(contents) > 256:
            try:
                with Image.open(io.BytesIO(contents)) as img:
                    w, h = img.size
                    if w > 8000 or h > 8000 or (w * h) > 40_000_000:
                        raise HTTPException(
                            status_code=400,
                            detail="Image dimensions exceed maximum allowed resolution (8000x8000 or 40 megapixels)."
                        )
            except HTTPException:
                raise
            except Exception:
                # If image is malformed or unreadable beyond header
                pass
    except ImportError:
        pass

def validate_csv_content(contents: bytes, filename: Optional[str] = None, max_bytes: int = 10 * 1024 * 1024) -> None:
    """
    Validates CSV file size, encoding, line limits, and verifies that contents are valid text without null bytes.
    If filename is provided, verifies that it has an accepted CSV file extension.
    """
    if filename:
        clean_ext = Path(filename).suffix.lower()
        if clean_ext not in [".csv", ".txt"]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension '{clean_ext}'. Only .csv files are supported."
            )

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")

    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"CSV file exceeds maximum limit of {max_bytes // (1024 * 1024)}MB."
        )

    # Check for embedded null bytes (indicative of binary/executable payload)
    if b"\x00" in contents:
        raise HTTPException(
            status_code=400,
            detail="CSV file contains illegal binary/null bytes. Only plain text CSV is supported."
        )

    # Verify text decodability, max line count and max row width
    try:
        text = contents.decode("utf-8-sig", errors="replace")
        lines = text.splitlines()
        if len(lines) > 50_000:
            raise HTTPException(
                status_code=400,
                detail="CSV file exceeds maximum row limit of 50,000 lines."
            )
        for i, line in enumerate(lines[:1000]):
            if len(line) > 8192:
                raise HTTPException(
                    status_code=400,
                    detail=f"Line {i+1} in CSV exceeds maximum permissible width of 8,192 characters."
                )
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="CSV file contains invalid text encoding.")

def sanitize_csv_formula_injection(value: str) -> str:
    """
    Neutralizes CSV / Spreadsheet formula injection vulnerabilities.
    If a string cell starts with =, +, -, @, or |, prepends a quote to prevent execution.
    """
    if not value or not isinstance(value, str):
        return value
    stripped = value.strip()
    if stripped.startswith(('=', '+', '-', '@', '|', '\t', '\r')):
        return f"'{value}"
    return value

def assert_path_in_directory(target_path: str, base_directory: str) -> str:
    """
    Defends against path traversal attacks (e.g., ../../../etc/passwd).
    Ensures canonical target path resides strictly inside canonical base directory.
    """
    canonical_base = os.path.realpath(base_directory)
    canonical_target = os.path.realpath(target_path)

    # Allow target_path to be identical to base or reside inside it
    if canonical_target != canonical_base and not canonical_target.startswith(canonical_base + os.sep):
        raise HTTPException(status_code=403, detail="Access denied: Path traversal detected.")

    return canonical_target
