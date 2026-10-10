import httpx
import logging
from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any
from urllib.parse import urlencode
from app.core.config import settings
from app.services.geospatial.location_adapter import location_adapter

router = APIRouter()
logger = logging.getLogger(__name__)

# Fast offline fallback dictionary for popular Indian hubs & colleges
KNOWN_INDIAN_LOCATIONS: Dict[str, Dict[str, Any]] = {
    "delhi": {"name": "New Delhi, Delhi", "lat": 28.6139, "lon": 77.2090},
    "new delhi": {"name": "New Delhi, Delhi", "lat": 28.6139, "lon": 77.2090},
    "rohini": {"name": "Rohini, New Delhi", "lat": 28.7166, "lon": 77.1126},
    "noida": {"name": "Noida, Uttar Pradesh", "lat": 28.5355, "lon": 77.3910},
    "gurgaon": {"name": "Gurugram, Haryana", "lat": 28.4595, "lon": 77.0266},
    "gurugram": {"name": "Gurugram, Haryana", "lat": 28.4595, "lon": 77.0266},
    "mumbai": {"name": "Mumbai, Maharashtra", "lat": 19.0760, "lon": 72.8777},
    "pune": {"name": "Pune, Maharashtra", "lat": 18.5204, "lon": 73.8567},
    "bengaluru": {"name": "Bengaluru, Karnataka", "lat": 12.9716, "lon": 77.5946},
    "bangalore": {"name": "Bengaluru, Karnataka", "lat": 12.9716, "lon": 77.5946},
    "hyderabad": {"name": "Hyderabad, Telangana", "lat": 17.3850, "lon": 78.4867},
    "chennai": {"name": "Chennai, Tamil Nadu", "lat": 13.0827, "lon": 80.2707},
    "kolkata": {"name": "Kolkata, West Bengal", "lat": 22.5726, "lon": 88.3639},
    "ahmedabad": {"name": "Ahmedabad, Gujarat", "lat": 23.0225, "lon": 72.5714},
    "jaipur": {"name": "Jaipur, Rajasthan", "lat": 26.9124, "lon": 75.7873},
    "chandigarh": {"name": "Chandigarh, Punjab", "lat": 30.7333, "lon": 76.7794},
}

@router.get("/geocoding/search")
async def search_location(q: str = Query(...)):
    """
    Geocodes Indian locations using OpenStreetMap Nominatim or Amazon Location Service.
    Falls back to cached Indian administrative centers on network failure or rate limits.
    """
    clean_q = q.strip() if q else ""
    if not clean_q or len(clean_q) < 2:
        raise HTTPException(status_code=422, detail="Query cannot be blank and must contain at least 2 characters")

    # AWS Amazon Location Service if configured
    if settings.AWS_ENABLED and settings.GEOCODING_PROVIDER == "amazon_location":
        return await location_adapter.search_places(clean_q)

    # 1. Check local instant match
    for key, loc in KNOWN_INDIAN_LOCATIONS.items():
        if key in clean_q.lower():
            return [{
                "display_name": loc["name"],
                "lat": loc["lat"],
                "lon": loc["lon"],
                "source": "Local Indian Geospatial Gazetteer"
            }]

    # 2. Try OpenStreetMap Nominatim with proper URL encoding
    params = {"q": clean_q, "countrycodes": "in", "format": "json", "limit": "5"}
    encoded = urlencode(params)
    url = f"https://nominatim.openstreetmap.org/search?{encoded}"
    headers = {
        "User-Agent": "RoofShift-AI/2.0 (environmental-hacks-2026)"
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                if data and isinstance(data, list) and len(data) > 0:
                    results = []
                    for item in data:
                        try:
                            results.append({
                                "display_name": item.get("display_name"),
                                "lat": float(item["lat"]),
                                "lon": float(item["lon"]),
                                "source": "OpenStreetMap Nominatim"
                            })
                        except (ValueError, TypeError, KeyError):
                            continue
                    if results:
                        return results
    except Exception as e:
        logger.warning(f"Geocoding request failed: {str(e)}")

    # 3. Default fallback to Delhi
    return [{
        "display_name": f"{clean_q} (Approximate, New Delhi region)",
        "lat": 28.6139,
        "lon": 77.2090,
        "source": "Default Indian Reference Coordinate"
    }]
