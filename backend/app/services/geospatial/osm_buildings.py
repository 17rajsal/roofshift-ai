"""Real OpenStreetMap (OSM) Building Footprints Service.
Fetches real mapped building footprints and polygon boundaries via Overpass API.
Calculates geodesic roof areas, usable surface area, and PV capacity.
Strictly avoids synthesizing fake buildings when data is unmapped.
"""
import math
import logging
import httpx
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
]

EARTH_RADIUS_METERS = 6378137.0


def calculate_polygon_area_sqm(coords: List[List[float]]) -> float:
    """Calculates geodesic area in square meters for a closed polygon of [lon, lat] points
    using the spherical Shoelace projection formula.
    """
    if len(coords) < 3:
        return 0.0

    # Ensure closed polygon
    pts = list(coords)
    if pts[0] != pts[-1]:
        pts.append(pts[0])

    n = len(pts)
    if n < 4:
        return 0.0

    total = 0.0
    for i in range(n - 1):
        p1 = pts[i]
        p2 = pts[i + 1]
        lon1_rad = math.radians(p1[0])
        lat1_rad = math.radians(p1[1])
        lon2_rad = math.radians(p2[0])
        lat2_rad = math.radians(p2[1])

        # Spherical trapezoidal formula
        total += (lon2_rad - lon1_rad) * (2.0 + math.sin(lat1_rad) + math.sin(lat2_rad))

    area = abs(total * (EARTH_RADIUS_METERS ** 2) / 2.0)
    # Sanity limit: single building rooftop rarely exceeds 100,000 sqm
    return round(min(area, 250000.0), 1)


async def fetch_osm_buildings(
    lat: float,
    lon: float,
    radius_m: int = 250
) -> Dict[str, Any]:
    """Queries OpenStreetMap Overpass API for real mapped building footprints.
    
    Args:
        lat: Center latitude (-90 to 90)
        lon: Center longitude (-180 to 180)
        radius_m: Search radius in meters (50m to 1000m)
        
    Returns:
        Structured dictionary of real building polygons or explicit 'empty' status.
    """
    radius = max(50, min(1000, radius_m))
    query = f"""
    [out:json][timeout:10];
    (
      way["building"](around:{radius},{lat},{lon});
      relation["building"](around:{radius},{lat},{lon});
    );
    out body;
    >;
    out skel qt;
    """

    headers = {
        "User-Agent": "RoofShift-AI/2.0 (Solar-Engineering-Platform; contact@roofshift.ai)"
    }

    raw_data = None
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(endpoint, data={"data": query}, headers=headers)
                if resp.status_code == 200:
                    raw_data = resp.json()
                    break
        except Exception as e:
            logger.warning(f"OSM Overpass endpoint {endpoint} failed: {str(e)}")
            continue

    if not raw_data or "elements" not in raw_data:
        return {
            "status": "empty",
            "building_count": 0,
            "buildings": [],
            "message": "No mapped building footprints available in OpenStreetMap for these coordinates.",
            "action_required": "Draw custom roof polygon or import GeoJSON/CSV building coordinates.",
            "source": "OpenStreetMap Overpass API",
            "coordinates": {"lat": lat, "lon": lon},
            "radius_m": radius
        }

    # Build node map: id -> (lat, lon)
    nodes: Dict[int, List[float]] = {}
    ways: List[Dict[str, Any]] = []

    for el in raw_data.get("elements", []):
        el_type = el.get("type")
        if el_type == "node":
            nodes[el["id"]] = [float(el["lon"]), float(el["lat"])]
        elif el_type == "way" and "tags" in el and "building" in el["tags"]:
            ways.append(el)

    buildings: List[Dict[str, Any]] = []
    total_gross_sqm = 0.0
    total_usable_sqm = 0.0
    total_capacity_kwp = 0.0

    for idx, way in enumerate(ways):
        node_ids = way.get("nodes", [])
        if len(node_ids) < 3:
            continue

        coords = [nodes[nid] for nid in node_ids if nid in nodes]
        if len(coords) < 3:
            continue

        # Compute geodesic area
        gross_area = calculate_polygon_area_sqm(coords)
        if gross_area < 15.0:  # Ignore tiny sheds or micro artifacts
            continue

        # Usable roof area: ~78% obstacle-free default
        usable_area = round(gross_area * 0.78, 1)
        # Solar PV capacity @ 180W/m² mono-PERC
        capacity_kwp = round(usable_area * 0.18, 2)
        # Annual generation estimate @ 1500 kWh/kWp
        annual_kwh = round(capacity_kwp * 1500.0, 1)
        annual_savings_inr = round(annual_kwh * 7.5, 0)
        avoided_co2_kg = round(annual_kwh * 0.716, 1)

        # Polygon centroid
        avg_lon = sum(c[0] for c in coords) / len(coords)
        avg_lat = sum(c[1] for c in coords) / len(coords)

        tags = way.get("tags", {})
        building_name = tags.get("name") or tags.get("addr:housename") or f"OSM Building {way.get('id', idx + 1)}"
        b_type = tags.get("building") if tags.get("building") != "yes" else "General"

        building_item = {
            "id": f"osm_{way.get('id', idx + 1)}",
            "name": building_name,
            "category": b_type.capitalize(),
            "gross_roof_area": gross_area,
            "usable_roof_area": usable_area,
            "latitude": round(avg_lat, 6),
            "longitude": round(avg_lon, 6),
            "polygon_coordinates": coords,
            "max_pv_capacity_kwp": capacity_kwp,
            "annual_generation_kwh": annual_kwh,
            "annual_savings_inr": annual_savings_inr,
            "avoided_co2_kg_annual": avoided_co2_kg,
            "shading_loss_percentage": 10.0,
            "shading_assessment_notice": (
                "Standard horizontal obstacle assumption (10% loss). "
                "Detailed 3D shading analysis requires obstacle geometry or LiDAR survey."
            ),
            "source": "OpenStreetMap Community Contributors"
        }

        buildings.append(building_item)
        total_gross_sqm += gross_area
        total_usable_sqm += usable_area
        total_capacity_kwp += capacity_kwp

    if not buildings:
        return {
            "status": "empty",
            "building_count": 0,
            "buildings": [],
            "message": "No mapped building footprints available in OpenStreetMap for these coordinates.",
            "action_required": "Draw custom roof polygon or import GeoJSON/CSV building coordinates.",
            "source": "OpenStreetMap Overpass API",
            "coordinates": {"lat": lat, "lon": lon},
            "radius_m": radius
        }

    return {
        "status": "success",
        "building_count": len(buildings),
        "buildings": buildings,
        "total_gross_roof_area_sqm": round(total_gross_sqm, 1),
        "total_usable_roof_area_sqm": round(total_usable_sqm, 1),
        "total_pv_capacity_kwp": round(total_capacity_kwp, 2),
        "coordinates": {"lat": lat, "lon": lon},
        "radius_m": radius,
        "source": "OpenStreetMap Community Contributors via Overpass API"
    }
