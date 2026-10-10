import httpx
import logging
from fastapi import APIRouter, Query
from typing import List, Dict, Any

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
async def search_location(q: str = Query(..., min_length=2)):
    """
    Geocodes Indian locations using OpenStreetMap Nominatim.
    Falls back to cached Indian administrative centers on network failure or rate limits.
    """
    query_clean = q.strip().lower()

    # 1. Check local instant match
    for key, loc in KNOWN_INDIAN_LOCATIONS.items():
        if key in query_clean:
            return [{
                "display_name": loc["name"],
                "lat": loc["lat"],
                "lon": loc["lon"],
                "source": "Local Indian Geospatial Gazetteer"
            }]

    # 2. Try OpenStreetMap Nominatim
    url = f"https://nominatim.openstreetmap.org/search?q={q}&countrycodes=in&format=json&limit=5"
    headers = {
        "User-Agent": "RoofShift-AI-Solar-Planner/1.0 (environmental-hacks-2026)"
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                if data and len(data) > 0:
                    return [
                        {
                            "display_name": item.get("display_name"),
                            "lat": float(item.get("lat")),
                            "lon": float(item.get("lon")),
                            "source": "OpenStreetMap Nominatim"
                        }
                        for item in data
                    ]
    except Exception as e:
        logger.warning(f"Geocoding request failed: {str(e)}")

    # 3. Default fallback to Delhi
    return [{
        "display_name": f"{q} (Approximate, New Delhi region)",
        "lat": 28.6139,
        "lon": 77.2090,
        "source": "Default Indian Reference Coordinate"
    }]
