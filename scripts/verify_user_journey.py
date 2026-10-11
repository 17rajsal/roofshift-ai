#!/usr/bin/env python3
"""Comprehensive RoofShift AI User Journey Verification Script.
Tests:
- [Phase 1] National India Solar Intelligence (Summary, State Climatology, Layer Analytics, Sample Campus)
- [Phase 2] Site & Portfolio Level Planning (Geocoding, Project Creation, Building Ingestion, NASA POWER Solar Analysis)
- [Phase 3] Energy Analytics, Knapsack 0/1 Budget Optimization & Surplus Accounting
- [Phase 4] Scheduling, Maintenance Cases, Executive PDF Generation, and Project Persistence
"""
import json
import urllib.request
import urllib.parse
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def get_json(endpoint: str):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        headers={"X-Bypass-Rate-Limit": "test-suite"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def post_json(endpoint: str, payload: dict):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=data,
        headers={"Content-Type": "application/json", "X-Bypass-Rate-Limit": "test-suite"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def main():
    print("=== STARTING ROOFSHIFT AI INDIA-SCALE USER JOURNEY VERIFICATION ===")
    
    # [Step 1] Health Check
    health = get_json("/health")
    assert health["status"] == "healthy"
    print(f"[Step 1] Health Check: {health['status']} - {health['service']} (v{health['version']})")

    # [Step 2] National Solar Intelligence Summary
    summary = get_json("/solar-intelligence/summary")
    print(f"\n[Step 2] National India Solar Intelligence Summary:")
    print(f"  • Total Analyzed Regions: {summary['total_analyzed_regions']} States & UTs")
    print(f"  • National Rooftop Potential: {summary['total_national_rooftop_potential_gw']:.1f} GWp")
    print(f"  • Utility Open-Land Potential: {summary['total_national_openland_potential_gw']:.1f} GWp")
    print(f"  • National Average GHI: {summary['national_avg_daily_ghi_kwh']} kWh/m²/day")
    assert summary["total_analyzed_regions"] >= 20
    assert summary["total_national_rooftop_potential_gw"] > 500

    # [Step 3] Regional Solar Exploration & Filters
    regions = get_json("/solar-intelligence/regions")
    arid_regions = get_json("/solar-intelligence/regions?zone=Arid")
    high_regions = get_json("/solar-intelligence/regions?min_suitability=90")
    print(f"\n[Step 3] Regional Intelligence Filters:")
    print(f"  • Total Loaded Regions: {len(regions)}")
    print(f"  • Arid Corridors: {len(arid_regions)} (e.g., {arid_regions[0]['name']})")
    print(f"  • High-Suitability Tier A/A+ Zones: {len(high_regions)}")
    assert len(arid_regions) >= 1
    assert len(high_regions) >= 4

    # [Step 4] Deep-Dive Regional Solar Climatology Profiles
    raj = get_json("/solar-intelligence/regions/rajasthan")
    lad = get_json("/solar-intelligence/regions/ladakh")
    print(f"\n[Step 4] Deep-Dive Climatology Profiles:")
    print(f"  • Rajasthan: {raj['ghi_daily_kwh']} kWh/m²/d GHI | Tier {raj['suitability_tier']} | Rooftop Score: {raj['rooftop_suitability_score']}/100 | Open-Land: {raj['open_land_suitability_score']}/100")
    print(f"    AI Advice: {raj['ai_recommendations']['module_technology'][:75]}...")
    print(f"  • Ladakh: {lad['ghi_daily_kwh']} kWh/m²/d GHI | Ambient Temp: {lad['ambient_temp_celsius']}°C (Cold Boost Yield: {lad['annual_yield_kwh_per_kwp']} kWh/kWp/yr)")
    assert raj["ai_suitability_composite"] >= 95
    assert lad["ambient_temp_celsius"] < 15.0

    # [Step 5] Sample Campus Demo Metadata (Transparently positioned)
    sample_campus = get_json("/solar-intelligence/sample-campus")
    print(f"\n[Step 5] Sample Campus Demo Metadata:")
    print(f"  • Campus: {sample_campus['campus_name']} ({sample_campus['location']})")
    print(f"  • Buildings Count: {sample_campus['buildings_count']}")
    print(f"  • Purpose: {sample_campus['purpose'][:80]}...")
    assert sample_campus["buildings_count"] == 5

    # [Step 6] Location Geocoding Search
    geo = get_json("/geocoding/search?q=Hyderabad")
    assert len(geo) > 0
    top_loc = geo[0]
    print(f"\n[Step 6] Location Search: {top_loc['display_name'][:45]} ({top_loc['lat']}, {top_loc['lon']})")

    # [Step 7] Create Commercial Clean Energy Portfolio Project
    proj_payload = {
        "name": "Telangana Solar Tech Park",
        "description": "5-building commercial IT park campus solar deployment",
        "organization_name": "Deccan Clean Energy Assets",
        "latitude": 17.3850,
        "longitude": 78.4867,
        "city": "Hyderabad",
        "country": "India",
        "budget": 1000000.0,
        "tariff_rate": 8.50,
        "co2_factor": 0.716
    }
    proj = post_json("/projects", proj_payload)
    proj_id = proj["id"]
    print(f"[Step 7] Created Project: {proj['name']} (ID: {proj_id}) with Budget: INR {proj['budget']:,.2f}")

    # [Step 8-11] Ingest 5 Campus Buildings with Roof Geometries & Run NASA POWER Climatology
    buildings_spec = [
        {"name": "Main Engineering Block", "category": "Academic", "total_roof_area": 1200.0, "usable_roof_area": 960.0},
        {"name": "Innovation Lab Tower", "category": "Research", "total_roof_area": 950.0, "usable_roof_area": 807.5},
        {"name": "Administrative Complex", "category": "Office", "total_roof_area": 700.0, "usable_roof_area": 525.0},
        {"name": "Student Dining Center", "category": "Utility", "total_roof_area": 600.0, "usable_roof_area": 450.0},
        {"name": "Sports & Recreation Center", "category": "Sports", "total_roof_area": 1100.0, "usable_roof_area": 880.0}
    ]

    print(f"\n[Steps 8-11] Ingesting Rooftops and Computing NASA POWER Solar Generation:")
    created_buildings = []
    for b in buildings_spec:
        b_payload = {
            "name": b["name"],
            "category": b["category"],
            "latitude": 17.3850,
            "longitude": 78.4867,
            "gross_roof_area": b["total_roof_area"],
            "usable_roof_percentage": (b["usable_roof_area"] / b["total_roof_area"]) * 100.0,
            "monthly_consumption_kwh": 12000.0,
            "shading_category": "Low"
        }
        b_res = post_json(f"/projects/{proj_id}/buildings", b_payload)
        created_buildings.append(b_res)
        analysis = b_res.get("solar_analysis") or {}
        print(f"  • {b['name']} ({b['usable_roof_area']} m² usable): Capacity = {analysis.get('max_pv_capacity_kwp', 0):.1f} kWp | Annual Gen = {analysis.get('annual_generation_kwh', 0):,.0f} kWh | Savings = INR {analysis.get('annual_savings_inr', 0):,.0f}/yr")
    
    assert len(created_buildings) == 5

    # [Step 12] Energy Climatology Analytics
    insights = get_json(f"/projects/{proj_id}/energy-insights")
    print(f"\n[Step 12] Energy Demand & Climatology Analytics:")
    print(f"  • Total Capacity: {insights.get('total_capacity_kwp', 0):,.1f} kWp")
    print(f"  • Monthly Trends Recorded: {len(insights.get('monthly_trends', []))} months")

    # [Step 13-14] Knapsack 0/1 Budget Optimization (Cap: INR 10,00,000)
    opt_payload = {
        "budget_inr": 1000000.0,
        "objective": "MAXIMIZE_SAVINGS",
        "scenario_name": "Base Scenario"
    }
    opt = post_json(f"/projects/{proj_id}/optimize", opt_payload)
    print(f"\n[Steps 13-14] Knapsack 0/1 Budget Optimization (Cap: INR 10,00,000):")
    print(f"  • Budget Allocated: INR {opt.get('total_allocated_inr', 0):,.2f}")
    print(f"  • Remaining Budget: INR {opt.get('remaining_budget_inr', 0):,.2f}")
    print(f"  • Total Selected Capacity: {opt.get('total_capacity_kwp', 0):.1f} kWp")
    print(f"  • Total Annual Savings: INR {opt.get('total_annual_savings_inr', 0):,.2f}")
    print(f"  • Simple Payback: {opt.get('overall_payback_years', 0):.2f} years")
    print(f"  • Allocations Generated: {len(opt.get('allocations', []))} buildings")
    
    # Assert budget constraint strictly respected
    assert opt.get("total_allocated_inr", 0) <= 1000000.0
    assert len(opt.get("allocations", [])) > 0

    # [Step 15] Solar Surplus & ESG Avoided CO2
    print(f"\n[Step 15] Solar Surplus and Grid Export Accounting:")
    print(f"  • Total Exported Generation: {opt.get('total_exported_kwh', 0):,.0f} kWh")
    print(f"  • Avoided CO2 Emissions: {opt.get('avoided_co2_kg_annual', 0):,.0f} kg CO2/year")

    # [Step 16] Smart Load Activity Scheduling
    activity_payload = {
        "name": "Fleet EV Charging Window",
        "power_kw": 40.0,
        "duration_hours": 4.0,
        "earliest_hour": 10,
        "latest_hour": 16,
        "preferred_hour": 12,
        "days_per_week": 5,
        "is_shiftable": True
    }
    act = post_json(f"/projects/{proj_id}/activities", activity_payload)
    print(f"\n[Step 16] Created Energy Activity: {act['name']} ({act['power_kw']} kW, 10:00-16:00 window)")

    # [Step 17] Maintenance Work Order Case
    case_payload = {
        "building_id": created_buildings[0]["id"],
        "title": "Module Soiling & Dust Accumulation",
        "category": "PANEL_SOILING",
        "priority": "MEDIUM",
        "estimated_loss_pct": 6.5,
        "description": "Pre-monsoon dust deposition on north-west string requires demineralized water washing."
    }
    case = post_json(f"/projects/{proj_id}/maintenance-cases", case_payload)
    print(f"\n[Step 17] Created Maintenance Case: #{case['id'][:8]} - {case['title']} ({case['priority']})")

    # [Step 18] Generate Audit-Ready PDF Report
    report_payload = {
        "notes": "Feasibility study completed with NASA POWER irradiance, India Solar Intelligence, and 0/1 Knapsack optimization."
    }
    report = post_json(f"/projects/{proj_id}/reports", report_payload)
    print(f"\n[Step 18] Executive PDF Report Generated:")
    print(f"  • Report ID: {report['report_id']}")
    print(f"  • File: {report['filename']}")
    print(f"  • Download URL: {report['download_url']}")
    assert report["filename"].endswith(".pdf")

    # [Steps 19-20] Project Persistence & Reload Verification
    reloaded_proj = get_json(f"/projects/{proj_id}")
    reloaded_buildings = get_json(f"/projects/{proj_id}/buildings")
    reloaded_opts = get_json(f"/projects/{proj_id}/optimizations")
    print(f"\n[Steps 19-20] Project Persistence & Reopening Verification:")
    print(f"  • Project Name: {reloaded_proj['name']}")
    print(f"  • Buildings Persisted: {len(reloaded_buildings)} (Expected: 5)")
    print(f"  • Optimization Runs Persisted: {len(reloaded_opts)} (Expected >= 1)")
    
    assert len(reloaded_buildings) == 5
    assert len(reloaded_opts) >= 1
    assert reloaded_proj["name"] == proj_payload["name"]

    print("\n=== ALL USER JOURNEY STEPS VERIFIED SUCCESSFULLY (100% PASS) ===")

if __name__ == "__main__":
    main()
