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


DEFAULT_OSM_PLANNING_ASSUMPTIONS = {
    "usable_roof_fraction": 0.75,         # 75% obstacle clearance (HVAC, parapets, maintenance pathways)
    "power_density_kwp_per_sqm": 0.18,    # 180 W/m² (standard 550W mono-PERC @ 21.0% STC module efficiency)
    "default_annual_yield_kwh_per_kwp": 1500.0,  # Macro benchmark yield if local GHI is unspecified
    "grid_tariff_inr_per_kwh": 7.50,      # Commercial/Industrial state tariff baseline
    "default_shading_loss_pct": 10.0,     # Horizontal obstacle & row-to-row spacing loss
    "co2_emissions_factor_kg_per_kwh": 0.716  # CEA India CO2 baseline emissions factor (v19)
}


async def fetch_osm_buildings(
    lat: float,
    lon: float,
    radius_m: int = 250,
    planning_assumptions: Optional[Dict[str, float]] = None,
    location_annual_ghi: Optional[float] = None
) -> Dict[str, Any]:
    """Queries OpenStreetMap Overpass API for real mapped building footprints.
    
    Args:
        lat: Center latitude (-90 to 90)
        lon: Center longitude (-180 to 180)
        radius_m: Search radius in meters (50m to 1000m)
        planning_assumptions: Optional overrides for usable area fraction, power density, etc.
        location_annual_ghi: Optional verified NASA POWER annual daily GHI (kWh/m²/day) to compute location-specific generation
        
    Returns:
        Structured dictionary of real building polygons with transparent planning estimates.
    """
    assumptions = dict(DEFAULT_OSM_PLANNING_ASSUMPTIONS)
    if planning_assumptions:
        assumptions.update(planning_assumptions)

    usable_fraction = float(assumptions.get("usable_roof_fraction", 0.75))
    power_density = float(assumptions.get("power_density_kwp_per_sqm", 0.18))
    tariff = float(assumptions.get("grid_tariff_inr_per_kwh", 7.50))
    shading_pct = float(assumptions.get("default_shading_loss_pct", 10.0))
    co2_factor = float(assumptions.get("co2_emissions_factor_kg_per_kwh", 0.716))

    # Location-specific yield if GHI is provided; else macro benchmark
    if location_annual_ghi and location_annual_ghi > 1.0:
        # Base system PR 0.78 derated by shading loss
        effective_pr = 0.78 * (1.0 - shading_pct / 100.0)
        specific_annual_yield = round(location_annual_ghi * 365.0 * effective_pr, 1)
        yield_source = f"Location-Specific Climatology (GHI={round(location_annual_ghi, 2)} kWh/m²/d)"
    else:
        specific_annual_yield = float(assumptions.get("default_annual_yield_kwh_per_kwp", 1500.0))
        yield_source = "Macro Benchmark Planning Assumption (1,500 kWh/kWp/yr)"
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
            "radius_m": radius,
            "planning_assumptions_used": assumptions
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

        # Compute geodesic area from actual OSM geometry
        gross_area = calculate_polygon_area_sqm(coords)
        if gross_area < 15.0:  # Ignore tiny sheds or micro artifacts
            continue

        # Usable roof area based on explicit transparent planning assumption
        usable_area = round(gross_area * usable_fraction, 1)
        # Solar PV capacity based on module power density assumption
        capacity_kwp = round(usable_area * power_density, 2)
        # Annual generation using location-specific solar yield
        annual_kwh = round(capacity_kwp * specific_annual_yield, 1)
        annual_savings_inr = round(annual_kwh * tariff, 0)
        avoided_co2_kg = round(annual_kwh * co2_factor, 1)

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
            "shading_loss_percentage": shading_pct,
            "shading_assessment_notice": (
                "Standard horizontal obstacle assumption (10% loss). "
                "Detailed 3D shading analysis requires obstacle geometry or LiDAR survey."
            ),
            "footprint_geometry_source": "OpenStreetMap Overpass API (Mapped Community Polygon)",
            "planning_assumptions": {
                "usable_roof_fraction": usable_fraction,
                "power_density_kwp_per_sqm": power_density,
                "specific_annual_yield_kwh_per_kwp": specific_annual_yield,
                "yield_source": yield_source,
                "grid_tariff_inr_per_kwh": tariff,
                "shading_loss_pct": shading_pct,
                "co2_factor_kg_per_kwh": co2_factor
            },
            "disclaimer": (
                "OpenStreetMap footprint is a cadastral/structural building perimeter, NOT a certified "
                "usable rooftop. Usable area, structural roof load, orientation, and micro-shading "
                "must be verified on-site by a qualified solar installer."
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
            "radius_m": radius,
            "planning_assumptions_used": assumptions
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
