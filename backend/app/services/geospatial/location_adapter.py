import logging
import httpx
from typing import List, Dict, Any
from app.core.config import settings
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

logger = logging.getLogger(__name__)

class LocationProviderAdapter:
    """
    Geocoding provider abstraction:
    Prioritizes Amazon Location Service when configured and authorized.
    Maintains clean fallback to OpenStreetMap Nominatim and local Indian gazetteer.
    """
    def __init__(self):
        self.location_client = None
        self._initialize_client()

    def _initialize_client(self):
        if settings.AWS_ENABLED and settings.GEOCODING_PROVIDER == "amazon_location":
            try:
                import boto3
                self.location_client = boto3.client(
                    "location",
                    region_name=settings.AWS_REGION
                )
                logger.info(f"Initialized Amazon Location Service with index '{settings.AMAZON_LOCATION_INDEX_NAME}'")
            except Exception as e:
                logger.warning(f"Could not initialize Amazon Location Service: {str(e)}. Using OSM fallback.")
                self.location_client = None

    def is_amazon_location_active(self) -> bool:
        return self.location_client is not None

    async def search_places(self, query: str) -> List[Dict[str, Any]]:
        """
        Searches Indian locations.
        1. Checks Amazon Location Service if active.
        2. Checks instant local Indian gazetteer.
        3. Queries OpenStreetMap Nominatim.
        """
        # 1. Amazon Location Service
        if self.is_amazon_location_active():
            try:
                response = self.location_client.search_place_index_for_text(
                    IndexName=settings.AMAZON_LOCATION_INDEX_NAME,
                    Text=query,
                    FilterCountries=["IND"],
                    MaxResults=5
                )
                results = []
                for entry in response.get("Results", []):
                    place = entry.get("Place", {})
                    geom = place.get("Geometry", {}).get("Point", [])
                    if len(geom) >= 2:
                        results.append({
                            "display_name": place.get("Label", query),
                            "lat": float(geom[1]),
                            "lon": float(geom[0]),
                            "source": "Amazon Location Service (AWS)"
                        })
                if results:
                    return results
            except Exception as e:
                logger.warning(f"Amazon Location query failed: {str(e)}. Falling back to OSM.")

        # 2. Local Indian Gazetteer
        q_lower = query.strip().lower()
        for key, loc in KNOWN_INDIAN_LOCATIONS.items():
            if key in q_lower:
                return [{
                    "display_name": loc["name"],
                    "lat": loc["lat"],
                    "lon": loc["lon"],
                    "source": "Local Indian Geospatial Gazetteer"
                }]

        # 3. OpenStreetMap Nominatim Fallback
        url = f"https://nominatim.openstreetmap.org/search?q={query}&countrycodes=in&format=json&limit=5"
        headers = {"User-Agent": "RoofShift-AI/2.0 (environmental-hacks-2026)"}
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    if data:
                        return [{
                            "display_name": item.get("display_name"),
                            "lat": float(item.get("lat")),
                            "lon": float(item.get("lon")),
                            "source": "OpenStreetMap Nominatim"
                        } for item in data]
        except Exception as e:
            logger.warning(f"OSM Nominatim search fallback failed: {str(e)}")

        # 4. Default Reference Coordinates
        return [{
            "display_name": f"{query} (Reference Grid, New Delhi Region)",
            "lat": 28.6139,
            "lon": 77.2090,
            "source": "Default Indian Reference Coordinates"
        }]

location_adapter = LocationProviderAdapter()
