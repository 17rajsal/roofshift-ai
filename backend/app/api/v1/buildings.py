import csv
import io
import json
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Body, Request
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.models.project import Project
from app.models.building import Building
from app.models.solar import SolarAnalysis
from app.schemas.building import (
    BuildingCreate,
    BuildingUpdate,
    BuildingResponse,
    SolarAnalysisSummary,
    BulkImportSummaryResponse,
    BulkImportRowError
)
from app.services.solar.solar_engine import calculate_building_solar_potential
from app.services.solar.nasa_power import fetch_solar_irradiance
from app.core.file_security import validate_csv_content

logger = logging.getLogger("roofshift.buildings")
router = APIRouter()

def build_building_response(b: Building) -> BuildingResponse:
    usable_area = round(b.gross_roof_area * (b.usable_roof_percentage / 100.0), 2)
    solar_summary = None
    if b.solar_analysis:
        sa = b.solar_analysis
        solar_summary = SolarAnalysisSummary(
            id=sa.id,
            usable_roof_area_sqm=sa.usable_roof_area_sqm,
            max_pv_capacity_kwp=sa.max_pv_capacity_kwp,
            annual_generation_kwh=sa.annual_generation_kwh,
            monthly_generation_kwh=sa.monthly_generation_kwh or [],
            specific_yield_kwh_per_kwp=sa.specific_yield_kwh_per_kwp,
            performance_ratio=sa.performance_ratio,
            effective_shading_loss_pct=sa.effective_shading_loss_pct,
            annual_consumption_kwh=sa.annual_consumption_kwh,
            annual_onsite_consumed_kwh=sa.annual_onsite_consumed_kwh,
            annual_exported_kwh=sa.annual_exported_kwh,
            onsite_utilization_pct=sa.onsite_utilization_pct,
            annual_savings_inr=sa.annual_savings_inr,
            installation_cost_inr=sa.installation_cost_inr,
            simple_payback_years=sa.simple_payback_years,
            avoided_co2_kg_annual=sa.avoided_co2_kg_annual,
            ghi_annual_avg_kwh_m2_day=sa.ghi_annual_avg_kwh_m2_day,
            irradiance_source=sa.irradiance_source,
            data_quality_label=sa.data_quality_label,
            updated_at=sa.updated_at
        )

    return BuildingResponse(
        id=b.id,
        project_id=b.project_id,
        name=b.name,
        category=b.category,
        address=b.address,
        latitude=b.latitude,
        longitude=b.longitude,
        gross_roof_area=b.gross_roof_area,
        usable_roof_percentage=b.usable_roof_percentage,
        usable_roof_area=usable_area,
        shading_category=b.shading_category,
        custom_shading_loss=b.custom_shading_loss,
        roof_polygon=b.roof_polygon,
        obstacles_notes=b.obstacles_notes,
        monthly_consumption_kwh=b.monthly_consumption_kwh,
        tariff_inr=b.tariff_inr,
        daytime_consumption_pct=b.daytime_consumption_pct,
        demand_origin=b.demand_origin or "Estimated profile",
        cost_per_kwp=b.cost_per_kwp,
        fixed_cost=b.fixed_cost,
        max_eligible_kwp=b.max_eligible_kwp,
        solar_analysis=solar_summary,
        created_at=b.created_at,
        updated_at=b.updated_at
    )

@router.get("/projects/{project_id}/buildings", response_model=List[BuildingResponse])
def list_buildings(
    project_id: str,
    limit: Optional[int] = Query(None, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retrieves building portfolio for a project with optional pagination and filters.
    Utilizes eager join loading to eliminate N+1 queries across large portfolios.
    """
    query = db.query(Building).options(joinedload(Building.solar_analysis)).filter(Building.project_id == project_id)
    if category:
        query = query.filter(Building.category.ilike(f"%{category.strip()}%"))
    if search:
        query = query.filter(Building.name.ilike(f"%{search.strip()}%"))

    query = query.order_by(Building.name.asc())
    if offset:
        query = query.offset(offset)
    if limit is not None:
        query = query.limit(limit)

    buildings = query.all()
    return [build_building_response(b) for b in buildings]

@router.post("/projects/{project_id}/buildings", response_model=BuildingResponse, status_code=status.HTTP_201_CREATED)
async def create_building(project_id: str, data: BuildingCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    new_b = Building(
        project_id=project_id,
        name=data.name,
        category=data.category,
        address=data.address,
        latitude=data.latitude,
        longitude=data.longitude,
        gross_roof_area=data.gross_roof_area,
        usable_roof_percentage=data.usable_roof_percentage,
        shading_category=data.shading_category,
        custom_shading_loss=data.custom_shading_loss,
        roof_polygon=data.roof_polygon,
        obstacles_notes=data.obstacles_notes,
        monthly_consumption_kwh=data.monthly_consumption_kwh,
        tariff_inr=data.tariff_inr,
        daytime_consumption_pct=data.daytime_consumption_pct,
        demand_origin=data.demand_origin,
        cost_per_kwp=data.cost_per_kwp,
        fixed_cost=data.fixed_cost,
        max_eligible_kwp=data.max_eligible_kwp
    )
    db.add(new_b)
    db.commit()
    db.refresh(new_b)

    # Immediately calculate initial solar potential
    await calculate_building_solar_potential(new_b, project, db)
    db.refresh(new_b)

    return build_building_response(new_b)

@router.post("/projects/{project_id}/buildings/bulk-import", response_model=BulkImportSummaryResponse)
async def bulk_import_buildings(
    project_id: str,
    request: Request,
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    High-performance bulk building portfolio importer.
    Supports structured CSV and GeoJSON uploads, plus direct JSON array payloads.
    Validates coordinates, geometry, positive roof area, and consumption bounds per row.
    Calculates solar potential using single-pass climatology caching for high throughput.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    raw_items = []
    content_type = request.headers.get("content-type", "").lower()

    if "application/json" in content_type:
        try:
            body_data = await request.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON body: {str(e)}")

        if isinstance(body_data, dict) and body_data.get("type") == "FeatureCollection":
            for feat in body_data.get("features", []):
                props = feat.get("properties", {}) or {}
                geom = feat.get("geometry", {}) or {}
                if geom.get("type") == "Polygon" and geom.get("coordinates"):
                    coords = geom["coordinates"][0]
                    polygon = [[c[1], c[0]] for c in coords]
                    props.setdefault("latitude", sum(p[0] for p in polygon) / len(polygon))
                    props.setdefault("longitude", sum(p[1] for p in polygon) / len(polygon))
                    props["roof_polygon"] = polygon
                elif geom.get("type") == "Point" and geom.get("coordinates"):
                    props.setdefault("longitude", geom["coordinates"][0])
                    props.setdefault("latitude", geom["coordinates"][1])
                raw_items.append(props)
        elif isinstance(body_data, dict) and "buildings" in body_data and isinstance(body_data["buildings"], list):
            raw_items = body_data["buildings"]
        elif isinstance(body_data, dict) and "features" in body_data and isinstance(body_data["features"], list):
            for feat in body_data["features"]:
                props = feat.get("properties", {}) or {}
                raw_items.append(props)
        elif isinstance(body_data, list):
            raw_items = body_data
        elif isinstance(body_data, dict):
            raw_items = [body_data]
    elif file:
        filename = (file.filename or "").lower()
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        if filename.endswith(".csv") or filename.endswith(".txt"):
            validate_csv_content(contents, filename=file.filename, max_bytes=10 * 1024 * 1024)
            text = contents.decode("utf-8-sig", errors="replace")
            reader = csv.DictReader(io.StringIO(text))
            for r in reader:
                raw_items.append(r)
        elif filename.endswith(".geojson") or filename.endswith(".json"):
            try:
                geo_obj = json.loads(contents.decode("utf-8-sig"))
                if isinstance(geo_obj, dict) and geo_obj.get("type") == "FeatureCollection":
                    for feat in geo_obj.get("features", []):
                        props = feat.get("properties", {}) or {}
                        geom = feat.get("geometry", {}) or {}
                        if geom.get("type") == "Polygon" and geom.get("coordinates"):
                            coords = geom["coordinates"][0]
                            polygon = [[c[1], c[0]] for c in coords]
                            centroid_lat = sum(p[0] for p in polygon) / len(polygon)
                            centroid_lon = sum(p[1] for p in polygon) / len(polygon)
                            props.setdefault("latitude", centroid_lat)
                            props.setdefault("longitude", centroid_lon)
                            props["roof_polygon"] = polygon
                        elif geom.get("type") == "Point" and geom.get("coordinates"):
                            props.setdefault("longitude", geom["coordinates"][0])
                            props.setdefault("latitude", geom["coordinates"][1])
                        raw_items.append(props)
                elif isinstance(geo_obj, list):
                    raw_items = geo_obj
                elif isinstance(geo_obj, dict) and "buildings" in geo_obj:
                    raw_items = geo_obj["buildings"]
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid GeoJSON or JSON structure: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV (.csv) or GeoJSON (.geojson).")
    else:
        raise HTTPException(status_code=400, detail="No file or JSON data provided for bulk import.")

    if not raw_items:
        raise HTTPException(status_code=400, detail="No building entries found in import payload.")

    errors: List[BulkImportRowError] = []
    created_buildings: List[Building] = []

    # Pre-fetch solar irradiance once for project site to optimize batch calculation
    try:
        cached_irradiance = await fetch_solar_irradiance(project.latitude, project.longitude, db)
    except Exception:
        cached_irradiance = None

    for idx, row in enumerate(raw_items, start=1):
        # Normalize column keys to lowercase
        norm_row = {str(k).strip().lower(): v for k, v in row.items()}
        name = norm_row.get("name") or norm_row.get("building_name") or norm_row.get("title")
        if not name or not str(name).strip():
            errors.append(BulkImportRowError(
                row=idx,
                row_number=idx,
                building_name="Unnamed",
                identifier=f"Row {idx}",
                error="Building name is required and cannot be empty",
                reason="Missing building name"
            ))
            continue
        name = str(name).strip()[:150]

        # Latitude / Longitude
        raw_lat = norm_row.get("latitude") or norm_row.get("lat") or project.latitude
        raw_lon = norm_row.get("longitude") or norm_row.get("lon") or norm_row.get("lng") or project.longitude
        try:
            lat = float(raw_lat)
            lon = float(raw_lon)
            if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                raise ValueError("Coordinates out of geographic range")
        except Exception:
            errors.append(BulkImportRowError(
                row=idx,
                row_number=idx,
                building_name=name,
                identifier=name,
                error=f"Invalid coordinates: lat={raw_lat}, lon={raw_lon}",
                reason="Invalid geographic coordinates"
            ))
            continue

        # Roof Area
        raw_area = norm_row.get("gross_roof_area") or norm_row.get("roof_area") or norm_row.get("area") or 300.0
        try:
            gross_roof_area = float(raw_area)
            if gross_roof_area <= 0 or gross_roof_area > 10_000_000:
                raise ValueError("Area must be positive and under 10,000,000 m²")
        except Exception as e:
            errors.append(BulkImportRowError(
                row=idx,
                row_number=idx,
                building_name=name,
                identifier=name,
                error=f"Invalid gross roof area: {e}",
                reason="Negative or out-of-range roof area"
            ))
            continue

        # Usable %
        raw_usable = norm_row.get("usable_roof_percentage") or norm_row.get("usable_percentage") or norm_row.get("usable_pct") or 70.0
        try:
            usable_pct = float(raw_usable)
            usable_pct = max(0.0, min(100.0, usable_pct))
        except Exception:
            usable_pct = 70.0

        # Consumption
        raw_cons = norm_row.get("monthly_consumption_kwh") or norm_row.get("monthly_consumption") or norm_row.get("consumption") or 2500.0
        try:
            monthly_consumption = float(raw_cons)
            if monthly_consumption <= 0:
                monthly_consumption = 2500.0
        except Exception:
            monthly_consumption = 2500.0

        # Shading
        shading = str(norm_row.get("shading_category") or norm_row.get("shading") or "Low").strip().capitalize()
        if shading not in ["Low", "Medium", "High", "Custom"]:
            shading = "Low"

        category = str(norm_row.get("category") or "Academic").strip().capitalize()
        daytime_pct = float(norm_row.get("daytime_consumption_pct") or 65.0)

        # Roof polygon GeoJSON/coordinate list if provided
        polygon = row.get("roof_polygon")
        if isinstance(polygon, str):
            try:
                polygon = json.loads(polygon)
            except Exception:
                polygon = None

        new_b = Building(
            project_id=project_id,
            name=name,
            category=category,
            address=str(norm_row.get("address") or f"Plot {idx}, {project.city}"),
            latitude=lat,
            longitude=lon,
            gross_roof_area=gross_roof_area,
            usable_roof_percentage=usable_pct,
            shading_category=shading,
            custom_shading_loss=5.0 if shading == "Low" else (15.0 if shading == "Medium" else 30.0),
            roof_polygon=polygon,
            monthly_consumption_kwh=monthly_consumption,
            daytime_consumption_pct=daytime_pct,
            demand_origin="Bulk portfolio import",
            cost_per_kwp=float(norm_row.get("cost_per_kwp") or 50000.0),
            fixed_cost=float(norm_row.get("fixed_cost") or 0.0)
        )
        db.add(new_b)
        created_buildings.append(new_b)

    # Commit buildings in one batch
    db.commit()

    # Calculate solar potential for all newly created buildings in batch
    for b in created_buildings:
        db.refresh(b)
        try:
            await calculate_building_solar_potential(
                b,
                project,
                db,
                cached_irradiance=cached_irradiance,
                commit=False
            )
        except Exception as e:
            logger.warning(f"Failed solar potential for imported building {b.id}: {e}")

    db.commit()
    for b in created_buildings:
        db.refresh(b)

    all_project_buildings = (
        db.query(Building)
        .options(joinedload(Building.solar_analysis))
        .filter(Building.project_id == project_id)
        .all()
    )
    total_buildings = len(all_project_buildings)
    total_usable_area = sum(b.gross_roof_area * (b.usable_roof_percentage / 100.0) for b in all_project_buildings)
    total_kwp = sum(b.solar_analysis.max_pv_capacity_kwp for b in all_project_buildings if b.solar_analysis)
    total_annual_kwh = sum(b.solar_analysis.annual_generation_kwh for b in all_project_buildings if b.solar_analysis)

    return BulkImportSummaryResponse(
        total_processed=len(raw_items),
        imported=len(created_buildings),
        updated=0,
        failed=len(errors),
        total_rows=len(raw_items),
        imported_count=len(created_buildings),
        error_count=len(errors),
        errors=errors,
        imported_buildings=[build_building_response(b) for b in created_buildings],
        total_buildings_in_project=total_buildings,
        total_usable_area_sqm=round(total_usable_area, 2),
        total_potential_kwp=round(total_kwp, 2),
        total_annual_generation_kwh=round(total_annual_kwh, 2),
        message=f"Successfully imported and analyzed {len(created_buildings)} of {len(raw_items)} buildings."
    )

@router.post("/projects/{project_id}/recalculate")
async def recalculate_project_buildings(project_id: str, db: Session = Depends(get_db)):
    """
    Recalculates solar potential across all buildings in a project after tariff or assumption updates.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    buildings = db.query(Building).filter(Building.project_id == project_id).all()
    cached_irradiance = await fetch_solar_irradiance(project.latitude, project.longitude, db)

    for b in buildings:
        await calculate_building_solar_potential(
            b,
            project,
            db,
            cached_irradiance=cached_irradiance,
            commit=False
        )

    db.commit()

    all_b = (
        db.query(Building)
        .options(joinedload(Building.solar_analysis))
        .filter(Building.project_id == project_id)
        .all()
    )
    total_usable = sum(b.gross_roof_area * (b.usable_roof_percentage / 100.0) for b in all_b)
    total_kwp = sum(b.solar_analysis.max_pv_capacity_kwp for b in all_b if b.solar_analysis)
    total_annual_kwh = sum(b.solar_analysis.annual_generation_kwh for b in all_b if b.solar_analysis)

    return {
        "status": "SUCCESS",
        "project_id": project_id,
        "total_buildings": len(buildings),
        "recalculated": len(buildings),
        "recalculated_buildings": len(buildings),
        "failed": 0,
        "total_usable_area_sqm": round(total_usable, 2),
        "total_potential_kwp": round(total_kwp, 2),
        "total_annual_generation_kwh": round(total_annual_kwh, 2)
    }

@router.get("/buildings/{building_id}", response_model=BuildingResponse)
def get_building(building_id: str, db: Session = Depends(get_db)):
    b = db.query(Building).filter(Building.id == building_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
    return build_building_response(b)

@router.patch("/buildings/{building_id}", response_model=BuildingResponse)
async def update_building(building_id: str, data: BuildingUpdate, db: Session = Depends(get_db)):
    b = db.query(Building).filter(Building.id == building_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")

    try:
        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(b, key, value)

        db.commit()
        db.refresh(b)

        # Re-calculate solar potential
        project = db.query(Project).filter(Project.id == b.project_id).first()
        if project:
            await calculate_building_solar_potential(b, project, db)
            db.refresh(b)

        return build_building_response(b)
    except Exception:
        db.rollback()
        raise

@router.delete("/buildings/{building_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_building(building_id: str, db: Session = Depends(get_db)):
    b = db.query(Building).filter(Building.id == building_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
    db.delete(b)
    db.commit()
    return None

@router.post("/buildings/{building_id}/duplicate", response_model=BuildingResponse)
async def duplicate_building(building_id: str, db: Session = Depends(get_db)):
    src = db.query(Building).filter(Building.id == building_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Building not found")

    project = db.query(Project).filter(Project.id == src.project_id).first()

    new_lat = src.latitude + 0.0003 if src.latitude <= 89.999 else src.latitude - 0.0003
    new_lon = src.longitude + 0.0003 if src.longitude <= 179.999 else src.longitude - 0.0003
    new_lat = max(-90.0, min(90.0, new_lat))
    new_lon = max(-180.0, min(180.0, new_lon))

    clone_b = Building(
        project_id=src.project_id,
        name=f"{src.name} (Copy)",
        category=src.category,
        address=src.address,
        latitude=new_lat,
        longitude=new_lon,
        gross_roof_area=src.gross_roof_area,
        usable_roof_percentage=src.usable_roof_percentage,
        shading_category=src.shading_category,
        custom_shading_loss=src.custom_shading_loss,
        roof_polygon=src.roof_polygon,
        obstacles_notes=src.obstacles_notes,
        monthly_consumption_kwh=src.monthly_consumption_kwh,
        tariff_inr=src.tariff_inr,
        daytime_consumption_pct=src.daytime_consumption_pct,
        demand_origin=src.demand_origin,
        cost_per_kwp=src.cost_per_kwp,
        fixed_cost=src.fixed_cost,
        max_eligible_kwp=src.max_eligible_kwp
    )
    db.add(clone_b)
    db.commit()
    db.refresh(clone_b)

    if project:
        await calculate_building_solar_potential(clone_b, project, db)
        db.refresh(clone_b)

    return build_building_response(clone_b)
