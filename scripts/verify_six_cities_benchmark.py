"""Verification benchmark script for 6 Indian cities plus out-of-bounds test.
Queries:
1. /api/v1/geospatial/environmental-profile
2. /api/v1/geospatial/buildings
3. Out-of-bounds latitude/longitude validation
Logs all measurements, units, resolution, provider status, and data quality notes.
"""
import urllib.request
import urllib.error
import json
import time

CITIES = [
    {"name": "Delhi (NCT)", "lat": 28.6139, "lng": 77.2090},
    {"name": "Jaipur (Rajasthan)", "lat": 26.9124, "lng": 75.7873},
    {"name": "Mumbai (Maharashtra)", "lat": 19.0760, "lng": 72.8777},
    {"name": "Bengaluru (Karnataka)", "lat": 12.9716, "lng": 77.5946},
    {"name": "Chennai (Tamil Nadu)", "lat": 13.0827, "lng": 80.2707},
    {"name": "Leh (Ladakh)", "lat": 34.1526, "lng": 77.5771},
]

BASE_URL = "http://127.0.0.1:8000/api/v1/geospatial"

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "RoofShift-Verification/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8")), resp.status

def run_benchmarks():
    print("=" * 80)
    print("ROOFSHIFT AI — 6 INDIAN CITIES REAL GEOSPATIAL & ENVIRONMENTAL VERIFICATION")
    print("=" * 80)

    results = []

    for city in CITIES:
        name = city["name"]
        lat = city["lat"]
        lng = city["lng"]
        print(f"\nEvaluating: {name} ({lat}°N, {lng}°E)...")

        # 1. Environmental Profile
        env_url = f"{BASE_URL}/environmental-profile?lat={lat}&lng={lng}"
        t0 = time.time()
        env_data, env_status = fetch_json(env_url)
        env_time = time.time() - t0

        solar = env_data["solar_irradiance"]
        weather = env_data["meteorological_conditions"]
        sun = env_data["sun_ephemeris"]
        suit = env_data["ai_suitability"]

        print(f"  [Environmental Profile] Status: {env_status} ({env_time:.2f}s)")
        print(f"    • Solar Source: {solar['source']} ({solar['source_label']})")
        print(f"    • GHI: {solar['ghi_daily_kwh']} kWh/m²/day | DNI: {solar['dni_daily_kwh']} | DHI: {solar['dhi_daily_kwh']}")
        print(f"    • Annual Yield: {solar['annual_yield_kwh_per_kwp']} kWh/kWp/yr | PR: {(solar['performance_ratio']*100):.1f}%")
        print(f"    • Ambient Temp: {weather['ambient_temperature_celsius']}°C | Wind: {weather['wind_speed_ms']} m/s | Cloud: {weather['cloud_cover_pct']}%")
        print(f"    • Weather Provider: {weather['weather_source']} (Fallback: {weather['is_climatological_fallback']})")
        print(f"    • Sun Ephemeris: Elev={sun['solar_elevation_deg']}° | Azim={sun['solar_azimuth_deg']}° | DayLen={sun['day_length_hours']}h")
        print(f"    • Shading Disclaimer: {sun['shading_limitation_notice']}")
        print(f"    • Suitability: Tier {suit['tier']} (Rooftop Score: {suit['rooftop_suitability_score']}/100)")

        # 2. OSM Buildings Query
        bldg_url = f"{BASE_URL}/buildings?lat={lat}&lng={lng}&radius_m=250"
        t0 = time.time()
        bldg_data, bldg_status = fetch_json(bldg_url)
        bldg_time = time.time() - t0

        print(f"  [OSM Building Footprints] Status: {bldg_status} ({bldg_time:.2f}s)")
        print(f"    • Mapped Buildings Count: {bldg_data['building_count']}")
        print(f"    • Query Status: {bldg_data['status']} | Source: {bldg_data['source']}")
        if bldg_data['building_count'] > 0:
            print(f"    • Total Usable Roof Area: {bldg_data.get('total_usable_roof_area_sqm', 0):.1f} m²")
            print(f"    • Potential PV Capacity: {bldg_data.get('total_pv_capacity_kwp', 0):.1f} kWp")
            sample_b = bldg_data['buildings'][0]
            print(f"    • Sample Footprint: '{sample_b['name']}' ({sample_b['gross_roof_area']:.1f} m² gross)")
        else:
            print(f"    • Notice: {bldg_data.get('message', 'No footprints in radius')}")

        results.append({
            "city": name,
            "lat": lat,
            "lng": lng,
            "ghi": solar['ghi_daily_kwh'],
            "dni": solar['dni_daily_kwh'],
            "temp": weather['ambient_temperature_celsius'],
            "wind": weather['wind_speed_ms'],
            "buildings": bldg_data['building_count'],
            "suitability_tier": suit['tier'],
            "yield": solar['annual_yield_kwh_per_kwp']
        })

    # 3. Out of Bounds Lat/Lng Validation
    print("\n" + "=" * 80)
    print("TESTING OUT-OF-BOUNDS COORDINATES (VALIDATION ERROR HANDLING)...")
    oob_url = f"{BASE_URL}/environmental-profile?lat=95.0&lng=77.0"
    try:
        fetch_json(oob_url)
        print("ERROR: Out of bounds latitude was unexpectedly accepted!")
        assert False, "Should have returned 422"
    except urllib.error.HTTPError as e:
        print(f"  Expected HTTP {e.code} received for lat=95.0 (> 90.0): {e.reason}")
        assert e.code == 422, f"Expected 422, got {e.code}"

    oob_lng_url = f"{BASE_URL}/environmental-profile?lat=28.0&lng=195.0"
    try:
        fetch_json(oob_lng_url)
        print("ERROR: Out of bounds longitude was unexpectedly accepted!")
        assert False, "Should have returned 422"
    except urllib.error.HTTPError as e:
        print(f"  Expected HTTP {e.code} received for lng=195.0 (> 180.0): {e.reason}")
        assert e.code == 422, f"Expected 422, got {e.code}"

    print("\n" + "=" * 80)
    print("ALL 6 CITIES AND VALIDATION TESTS PASSED PERFECTLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_benchmarks()
