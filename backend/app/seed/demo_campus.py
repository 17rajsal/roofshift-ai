from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.building import Building
from app.models.scheduling import EnergyActivity
from app.services.solar.solar_engine import calculate_building_solar_potential
from app.services.optimization.optimizer_service import run_project_optimization
from app.schemas.optimization import OptimizeRequest
import logging

logger = logging.getLogger(__name__)

DEMO_PROJECT_NAME = "Delhi College Campus (Demo)"

async def seed_demo_project_if_needed(db: Session) -> Project:
    """
    Seeds the realistic Delhi College Campus demonstration project if it does not already exist.
    Runs real solar analysis and budget optimization dynamically.
    """
    existing = db.query(Project).filter(Project.is_demo == "true").first()
    if existing:
        return existing

    # Create Demo Project
    demo_project = Project(
        name=DEMO_PROJECT_NAME,
        organization_name="Delhi Technical Institute",
        city="New Delhi",
        latitude=28.6139,
        longitude=77.2090,
        budget=1500000.0, # ₹15,00,000 (15 Lakh)
        tariff_rate=8.5,  # INR 8.5/kWh
        export_tariff=3.5,# INR 3.5/kWh
        co2_factor=0.716, # kg CO2/kWh
        is_demo="true"
    )
    db.add(demo_project)
    db.commit()
    db.refresh(demo_project)

    # 5 Candidate Buildings from Section 16
    buildings_data = [
        {
            "name": "Academic Block",
            "category": "Academic",
            "address": "North Campus Quadrangle",
            "latitude": 28.6142,
            "longitude": 28.6142 and 77.2095,
            "gross_roof_area": 450.0,
            "usable_roof_percentage": 75.0,
            "shading_category": "Low",
            "custom_shading_loss": 5.0,
            "monthly_consumption_kwh": 2400.0,
            "daytime_consumption_pct": 75.0,
            "cost_per_kwp": 50000.0,
            "fixed_cost": 0.0
        },
        {
            "name": "Library",
            "category": "Academic",
            "address": "Central Knowledge Wing",
            "latitude": 28.6148,
            "longitude": 77.2088,
            "gross_roof_area": 300.0,
            "usable_roof_percentage": 70.0,
            "shading_category": "Low",
            "custom_shading_loss": 5.0,
            "monthly_consumption_kwh": 1100.0,
            "daytime_consumption_pct": 80.0,
            "cost_per_kwp": 50000.0,
            "fixed_cost": 0.0
        },
        {
            "name": "Hostel",
            "category": "Residential",
            "address": "Student Living Complex",
            "latitude": 28.6132,
            "longitude": 77.2082,
            "gross_roof_area": 600.0,
            "usable_roof_percentage": 65.0,
            "shading_category": "Medium",
            "custom_shading_loss": 15.0,
            "monthly_consumption_kwh": 4200.0,
            "daytime_consumption_pct": 50.0,
            "cost_per_kwp": 50000.0,
            "fixed_cost": 0.0
        },
        {
            "name": "Auditorium",
            "category": "Utility",
            "address": "Cultural Complex",
            "latitude": 28.6155,
            "longitude": 77.2078,
            "gross_roof_area": 520.0,
            "usable_roof_percentage": 60.0,
            "shading_category": "High",
            "custom_shading_loss": 30.0,
            "monthly_consumption_kwh": 900.0,
            "daytime_consumption_pct": 35.0,
            "cost_per_kwp": 52000.0,
            "fixed_cost": 0.0
        },
        {
            "name": "Admin Block",
            "category": "Administrative",
            "address": "Chancellor Secretariat",
            "latitude": 28.6136,
            "longitude": 77.2105,
            "gross_roof_area": 250.0,
            "usable_roof_percentage": 70.0,
            "shading_category": "Medium",
            "custom_shading_loss": 15.0,
            "monthly_consumption_kwh": 1500.0,
            "daytime_consumption_pct": 75.0,
            "cost_per_kwp": 50000.0,
            "fixed_cost": 0.0
        }
    ]

    building_instances = []
    for b_data in buildings_data:
        b = Building(
            project_id=demo_project.id,
            name=b_data["name"],
            category=b_data["category"],
            address=b_data["address"],
            latitude=b_data["latitude"],
            longitude=b_data["longitude"],
            gross_roof_area=b_data["gross_roof_area"],
            usable_roof_percentage=b_data["usable_roof_percentage"],
            shading_category=b_data["shading_category"],
            custom_shading_loss=b_data["custom_shading_loss"],
            monthly_consumption_kwh=b_data["monthly_consumption_kwh"],
            daytime_consumption_pct=b_data["daytime_consumption_pct"],
            cost_per_kwp=b_data["cost_per_kwp"],
            fixed_cost=b_data["fixed_cost"],
            demand_origin="Institutional monthly meter ledger"
        )
        db.add(b)
        building_instances.append(b)

    db.commit()

    # Seed flexible campus activities
    activities_data = [
        {
            "name": "Campus Electric Bus & EV Charging Station",
            "power_kw": 18.0,
            "duration_hours": 3.0,
            "earliest_hour": 9,
            "latest_hour": 17,
            "preferred_hour": 18,
            "days_per_week": 6,
            "is_shiftable": True
        },
        {
            "name": "Central Overhead Water Tank Lift Pumps",
            "power_kw": 22.0,
            "duration_hours": 2.5,
            "earliest_hour": 8,
            "latest_hour": 16,
            "preferred_hour": 6,
            "days_per_week": 7,
            "is_shiftable": True
        }
    ]

    for a_data in activities_data:
        act = EnergyActivity(
            project_id=demo_project.id,
            building_id=building_instances[0].id,
            name=a_data["name"],
            power_kw=a_data["power_kw"],
            duration_hours=a_data["duration_hours"],
            earliest_hour=a_data["earliest_hour"],
            latest_hour=a_data["latest_hour"],
            preferred_hour=a_data["preferred_hour"],
            days_per_week=a_data["days_per_week"],
            is_shiftable=a_data["is_shiftable"]
        )
        db.add(act)

    db.commit()

    # Run actual solar calculations and budget optimization
    for b in building_instances:
        db.refresh(b)
        await calculate_building_solar_potential(b, demo_project, db)

    # Run real optimization run for ₹10 Lakhs
    opt_req = OptimizeRequest(
        budget_inr=1500000.0,
        objective="MAXIMIZE_SAVINGS",
        scenario_name="Base Scenario",
        capacity_step_kwp=0.5
    )
    await run_project_optimization(demo_project.id, opt_req, db)

    logger.info(f"Demo project '{DEMO_PROJECT_NAME}' successfully seeded and computed dynamically.")
    return demo_project
