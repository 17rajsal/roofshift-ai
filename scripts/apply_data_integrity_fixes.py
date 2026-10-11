"""Script to apply real data integrity fixes to backend/app/services/solar/india_solar_intelligence.py
Removes unsupported 748 GW rooftop and 1,240 GW open-land attributions.
Updates each state with official NISE 2014 3% wasteland potential.
Sets rooftop potential to None ("Not yet estimated by official government survey").
Adds engineering_suitability_index alias and updated provenance notes.
"""
import re
from pathlib import Path

FILE_PATH = Path("backend/app/services/solar/india_solar_intelligence.py")

NISE_2014_POTENTIAL_GW = {
    "rajasthan": 142.31,
    "gujarat": 35.77,
    "ladakh": None,  # Combined with J&K in NISE 2014 assessment
    "karnataka": 24.70,
    "maharashtra": 64.32,
    "tamil_nadu": 17.67,
    "madhya_pradesh": 61.66,
    "telangana": 20.41,
    "andhra_pradesh": 38.44,
    "delhi_ncr": 2.05,
    "uttar_pradesh": 22.83,
    "haryana": 4.56,
    "punjab": 2.81,
    "kerala": 6.11,
    "odisha": 25.78,
    "west_bengal": 6.26,
    "bihar": 11.20,
    "jharkhand": 18.18,
    "chhattisgarh": 18.27,
    "himachal_pradesh": 33.84,
    "uttarakhand": 16.80,
    "goa": 0.88,
    "assam": 13.76,
    "arunachal_pradesh": 8.65,
    "manipur": 10.63,
    "meghalaya": 5.86,
    "mizoram": 9.09,
    "nagaland": 7.29,
    "sikkim": 4.94,
    "tripura": 2.08,
    "jammu_kashmir": 111.05,
    "chandigarh": 0.06,
    "dadra_nagar_haveli_daman_diu": None,
    "puducherry": 0.58,
    "andaman_nicobar": None,
    "lakshadweep": None,
}

content = FILE_PATH.read_text(encoding="utf-8")

# Let's inspect each region block
# Region blocks are dictionaries in INDIA_REGIONS_DATABASE
# Each begins with `    {\n        "id": "...",` and ends with `    },`
for reg_id, nise_gw in NISE_2014_POTENTIAL_GW.items():
    # Find the region entry
    id_pattern = rf'(\s+"id":\s*"{reg_id}",.*?)("ai_suitability_composite":\s*(\d+),)'
    match = re.search(id_pattern, content, flags=re.DOTALL)
    if not match:
        print(f"ERROR: Region {reg_id} not found!")
        continue

    score = match.group(3)
    # Check if engineering_suitability_index already in there
    if f'"engineering_suitability_index": {score}' not in match.group(0):
        replacement = f'{match.group(1)}"ai_suitability_composite": {score},\n        "engineering_suitability_index": {score},'
        content = content[:match.start()] + replacement + content[match.end():]

# Now replace "estimated_rooftop_potential_gw": ... and "estimated_openland_potential_gw": ...
# in each region
for reg_id, nise_gw in NISE_2014_POTENTIAL_GW.items():
    # Find region block starting at "id": "reg_id" up to the next region or end
    pattern = rf'("id":\s*"{reg_id}".*?)("estimated_rooftop_potential_gw":\s*[\d\.]+,?\s*"estimated_openland_potential_gw":\s*[\d\.]+,?)'
    match = re.search(pattern, content, flags=re.DOTALL)
    if not match:
        print(f"WARN: Could not find potential lines for {reg_id}")
        continue

    gw_str = f"{nise_gw}" if nise_gw is not None else "None"
    status_str = f'"MNRE / NISE (2014) 3% wasteland assessment"' if nise_gw is not None else '"Not officially quantified in NISE 2014 assessment"'
    if reg_id == "ladakh":
        status_str = '"Assessed under undivided Jammu & Kashmir (111.05 GW) in NISE 2014 study"'

    replacement_block = (
        f'"estimated_solar_radiation_potential_gw": {gw_str},\n'
        f'        "solar_potential_basis": {status_str},\n'
        f'        "estimated_rooftop_potential_gw": None,\n'
        f'        "rooftop_potential_status": "Not yet estimated by official government survey",\n'
        f'        "estimated_openland_potential_gw": None,'
    )
    content = content[:match.start(2)] + replacement_block + content[match.end(2):]

print("Regions updated. Now updating compute_national_summary() and get_scoring_methodology()...")

# Update compute_national_summary
old_summary_pattern = r'def compute_national_summary\(\) -> Dict\[str, Any\]:.*?(?=def get_all_regions)'
new_summary = '''def compute_national_summary() -> Dict[str, Any]:
    """Compute aggregate national solar potential and climatological averages across all 36 States & UTs.
    Accurately attributes 748.98 GWp to NISE 2014 3% wasteland assessment and clarifies rooftop potential status.
    """
    avg_ghi = round(sum(r["ghi_daily_kwh"] for r in INDIA_REGIONS_DATABASE) / len(INDIA_REGIONS_DATABASE), 2)
    avg_dni = round(sum(r["dni_daily_kwh"] for r in INDIA_REGIONS_DATABASE) / len(INDIA_REGIONS_DATABASE), 2)
    avg_temp = round(sum(r["ambient_temp_celsius"] for r in INDIA_REGIONS_DATABASE) / len(INDIA_REGIONS_DATABASE), 1)

    # Top opportunity regions by composite engineering suitability
    top_regions = sorted(INDIA_REGIONS_DATABASE, key=lambda x: x["ai_suitability_composite"], reverse=True)[:5]

    return {
        "total_analyzed_regions": len(INDIA_REGIONS_DATABASE),
        "national_solar_radiation_potential_gw": 748.98,
        "national_solar_radiation_potential_basis": "NISE (2014) assessment assuming 3% uncultivated wasteland area (MNRE, https://mnre.gov.in/en/solar-overview/)",
        "national_rooftop_potential_gw": None,
        "national_rooftop_potential_status": "Not yet estimated by official government survey (academic literature ranges 118–637 GW)",
        # Legacy fields provided as None to prevent breaking changes while eliminating unsupported figures
        "total_national_rooftop_potential_gw": None,
        "total_national_openland_potential_gw": None,
        "national_avg_daily_ghi_kwh": avg_ghi,
        "national_avg_daily_dni_kwh": avg_dni,
        "national_avg_ambient_temp_c": avg_temp,
        "top_opportunity_regions": [
            {
                "id": r["id"],
                "name": r["name"],
                "score": r["ai_suitability_composite"],
                "engineering_suitability_index": r.get("engineering_suitability_index", r["ai_suitability_composite"]),
                "tier": r["suitability_tier"],
                "zone_classification": r["zone_classification"],
                "ghi_daily_kwh": r["ghi_daily_kwh"],
                "rooftop_score": r["rooftop_suitability_score"],
                "openland_score": r["open_land_suitability_score"],
                "assessed_solar_radiation_potential_gw": r.get("estimated_solar_radiation_potential_gw")
            }
            for r in top_regions
        ],
        "provenance_summary": {
            "satellite_climatology": "NASA POWER 20-Year Long-Term Global Irradiance Baseline (0.5° × 0.5° resolution)",
            "temperature_meteorology": "IMD (India Meteorological Department) Long-Term Weather Normals",
            "capacity_potential": "MNRE / NISE (2014) National Solar Radiation Potential Assessment (3% Wasteland Coverage, 748.98 GWp national baseline, https://mnre.gov.in/en/solar-overview/)",
            "rooftop_potential_note": "Rooftop solar potential is not yet officially estimated state-by-state by MNRE; site surveys and local DISCOM interconnection rules apply.",
            "modeling_engine": "RoofShift AI Multi-Criteria Decision Analysis (MCDA) Engineering Climatology Engine (v8.2)"
        }
    }


'''

content = re.sub(old_summary_pattern, new_summary, content, flags=re.DOTALL)

# Update scoring methodology
old_methodology_pattern = r'def get_scoring_methodology\(\) -> Dict\[str, Any\]:.*?(?=\Z)'
new_methodology = '''def get_scoring_methodology() -> Dict[str, Any]:
    """Return explicit mathematical scoring methodology, input weights, geographic resolution,
    and engineering limitations for Engineering Solar Suitability scoring.
    Clarifies deterministic MCDA vs machine learning energy forecasting.
    """
    return {
        "engine_version": "RoofShift AI Engineering Suitability Index v8.2",
        "methodology_type": "Deterministic Multi-Criteria Decision Analysis (MCDA), not trained AI prediction. Uses physics-based formulas weighting NASA POWER irradiance, IMD climatology, temperature derating, and wind cooling.",
        "ml_scope_clarification": "XGBoost machine learning is strictly utilized for time-series hourly solar power generation forecasting based on historical generation and weather data. Geographic macro-suitability is a deterministic engineering index.",
        "geographic_resolution": {
            "macro_regional_layer": "0.5° × 0.5° spatial grid (~55 km × 55 km cell resolution at equator)",
            "micro_site_layer": "Sub-meter 3D polygonal boundary with localized ray-traced shading"
        },
        "rooftop_scoring_model": {
            "description": "Evaluates commercial, industrial, institutional, and residential rooftop PV feasibility",
            "formula": "S_rooftop = clamp(w_ghi*norm(GHI) + w_urban*UrbanDensity + w_temp*TempFactor + w_wind*WindFactor - w_cloud*CloudFactor, 0, 100)",
            "inputs_and_weights": [
                {"parameter": "Global Horizontal Irradiance (GHI)", "weight": 0.35, "source": "NASA POWER 20-Yr Climatology"},
                {"parameter": "Urban C&I Power Demand & Building Density", "weight": 0.30, "source": "State Industrial & Census Baselines"},
                {"parameter": "Ambient Temperature Derate Factor (-0.38%/°C above 25°C)", "weight": 0.15, "source": "IMD 30-Yr Climatological Normals"},
                {"parameter": "Convective Wind Cooling Benefit (+0.3%/m/s)", "weight": 0.10, "source": "IMD / MERRA-2 10m Wind Baseline"},
                {"parameter": "Monsoon Cloud Attenuation Penalty", "weight": 0.10, "source": "IMD & INSAT-3D Monsoon Cloud Normal"}
            ]
        },
        "open_land_scoring_model": {
            "description": "Evaluates utility-scale ground-mounted solar park and single-axis tracker suitability",
            "formula": "S_openland = clamp(w_dni*norm(DNI) + w_land*WastelandAvail + w_grid*GridReadiness + w_temp*TempFactor - w_slope*SlopeFriction, 0, 100)",
            "inputs_and_weights": [
                {"parameter": "Direct Normal Irradiance (DNI for Tracking)", "weight": 0.35, "source": "NASA POWER 20-Yr Climatology"},
                {"parameter": "Non-Agricultural Barren/Wasteland Availability", "weight": 0.30, "source": "NRSC Wasteland Atlas & MNRE NISE 2014"},
                {"parameter": "ISTS / State Grid Substation Proximity & Bay Capacity", "weight": 0.20, "source": "CEA National Grid Interconnect Baseline"},
                {"parameter": "Ambient Temperature Derate Factor", "weight": 0.10, "source": "IMD 30-Yr Climatological Normals"},
                {"parameter": "Topographic Slope & Terrain Roughness Penalty", "weight": 0.05, "source": "SRTM Digital Elevation Model (DEM)"}
            ]
        },
        "composite_scoring": {
            "formula": "S_composite = round(0.50 * S_rooftop + 0.50 * S_openland)",
            "tier_thresholds": {
                "A+": "Score >= 93 (Prime National Solar Hotspot)",
                "A": "88 <= Score < 93 (High-Yield Solar Corridor)",
                "B+": "82 <= Score < 88 (Strong Commercial Feasibility)",
                "B": "75 <= Score < 82 (Moderate Feasibility / High Energy Tariff)",
                "C+": "70 <= Score < 75 (Distributed Microgrid Opportunity)",
                "C": "Score < 70 (Terrain-Constrained Alpine Frontier)"
            }
        },
        "limitations": [
            "Macro regional scores indicate state-level climatological baselines and do not substitute for localized shadow raytracing.",
            "Grid interconnect readiness is subject to local DISCOM substation bay capacity and evacuation approvals.",
            "Wasteland availability estimates exclude designated eco-sensitive zones, wildlife sanctuaries, and reserve forest lands.",
            "3D shading analysis is unavailable at regional scale and requires site-specific LiDAR or obstacle elevation geometry.",
            "Legal land classification, revenue land alienation, and forest clearance require on-ground physical due diligence."
        ]
    }
'''

content = re.sub(old_methodology_pattern, new_methodology, content, flags=re.DOTALL)

FILE_PATH.write_text(content, encoding="utf-8")
print("SUCCESS: backend/app/services/solar/india_solar_intelligence.py updated.")
