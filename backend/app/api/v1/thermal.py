import csv
import io
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.project import Project
from app.models.building import Building
from app.models.maintenance import MaintenanceCase
from app.models.inspection import PanelInspection
from app.schemas.thermal import (
    ThermalBatchIngestRequest,
    ThermalObservationAnalysis,
    ThermalSummaryResponse,
    ThermalCreateMaintenanceRequest,
    ThermalObservationItem
)

router = APIRouter()

def classify_thermal_observation(
    panel_id: str,
    surface_temp_c: float,
    baseline_temp_c: float = 42.0,
    provenance: str = "MEASURED",
    building_id: Optional[str] = None,
    notes: Optional[str] = None
) -> ThermalObservationAnalysis:
    """
    Deterministic rule-based thermal classification.
    Evaluates temperature rise (ΔT) above baseline operating temperature.
    Never invents unverified physical causes.
    """
    delta_t = round(surface_temp_c - baseline_temp_c, 1)

    if delta_t >= 20.0:
        diagnostic_status = "CRITICAL"
        severity = "CRITICAL"
        suspected_cause = (
            "Severe localized thermal hotspot. Potential bypass diode failure, "
            "severe cell reverse-bias dissipation, or critical sub-string mismatch."
        )
        confidence = 0.94
        power_loss = 18.5
        recommended_action = (
            "Isolate affected string using qualified high-voltage PPE. Inspect junction box diodes, "
            "test open-circuit Voc, and inspect module backsheet for thermal discoloration."
        )
    elif delta_t >= 10.0:
        diagnostic_status = "ELEVATED"
        severity = "HIGH"
        suspected_cause = (
            "Elevated temperature deviation. Potential localized soiling patch (avian deposits), "
            "internal cell micro-cracking, or loose DC terminal connection."
        )
        confidence = 0.90
        power_loss = 9.5
        recommended_action = (
            "Perform targeted manual cleaning with neutral surfactant. Verify string IV-curve and "
            "inspect MC4 connectors for thermal elevation with calibrated thermography."
        )
    elif delta_t >= 5.0:
        diagnostic_status = "REVIEW"
        severity = "MEDIUM"
        suspected_cause = (
            "Mild thermal elevation above nominal operating baseline. Possible uniform dust accumulation, "
            "parapet shading boundary, or minor string mismatch."
        )
        confidence = 0.85
        power_loss = 4.0
        recommended_action = (
            "Schedule upcoming routine wash cycle. Verify shade patterns during peak solar generation window."
        )
    else:
        diagnostic_status = "NORMAL"
        severity = "NONE"
        suspected_cause = "Nominal operating envelope within standard photovoltaic temperature tolerances."
        confidence = 0.98
        power_loss = 0.0
        recommended_action = "Continue standard quarterly operations and maintenance (O&M) schedule."

    return ThermalObservationAnalysis(
        id=f"th-obs-{uuid.uuid4().hex[:8]}",
        panel_id=panel_id,
        surface_temp_c=surface_temp_c,
        baseline_temp_c=baseline_temp_c,
        delta_temp_c=delta_t,
        diagnostic_status=diagnostic_status,
        severity=severity,
        suspected_cause=suspected_cause,
        confidence_score=confidence,
        estimated_power_loss_pct=power_loss,
        recommended_action=recommended_action,
        provenance=provenance,
        observed_at=datetime.utcnow(),
        building_id=building_id
    )

@router.get("/projects/{project_id}/thermal-summary", response_model=ThermalSummaryResponse)
def get_project_thermal_summary(
    project_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves thermal monitoring and hotspot diagnostic summary for an institutional solar project.
    Honors strict provenance: checks for database inspections, with fallback to illustrative baseline.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    buildings = db.query(Building).filter(Building.project_id == project_id).all()
    b_ids = [b.id for b in buildings]

    inspections = db.query(PanelInspection).filter(
        PanelInspection.building_id.in_(b_ids)
    ).all() if b_ids else []

    analyses: List[ThermalObservationAnalysis] = []

    if inspections:
        for ins in inspections:
            base_temp = 42.0
            delta = ins.temperature_delta_c if ins.temperature_delta_c is not None else 0.0
            surface_t = round(base_temp + delta, 1)

            if delta >= 15.0:
                diag = "CRITICAL"
                sev = "CRITICAL"
            elif delta >= 8.0:
                diag = "ELEVATED"
                sev = "HIGH"
            elif delta >= 4.0:
                diag = "REVIEW"
                sev = "MEDIUM"
            else:
                diag = "NORMAL"
                sev = "NONE"

            analyses.append(ThermalObservationAnalysis(
                id=ins.id,
                panel_id=f"MOD-{ins.filename[:12]}",
                surface_temp_c=surface_t,
                baseline_temp_c=base_temp,
                delta_temp_c=delta,
                diagnostic_status=diag,
                severity=sev,
                suspected_cause=f"Inspected defect: {ins.defect_type}",
                confidence_score=ins.confidence_score,
                estimated_power_loss_pct=ins.estimated_power_loss_pct,
                recommended_action=ins.recommended_action,
                provenance="MEASURED_INSPECTION",
                observed_at=ins.created_at or datetime.utcnow(),
                building_id=ins.building_id
            ))
    else:
        # Provide clean, labeled sample baseline if no uploaded inspections exist
        sample_obs = [
            ("A-01", 42.1, 42.0, "Academic Block"),
            ("A-02", 42.6, 42.0, "Academic Block"),
            ("A-03", 49.5, 42.0, "Academic Block"),
            ("A-04", 43.0, 42.0, "Academic Block"),
            ("A-07", 67.5, 42.0, "Academic Block"),
            ("L-01", 41.5, 42.0, "Library"),
            ("L-02", 56.2, 42.0, "Library"),
            ("H-01", 44.0, 42.0, "Hostel"),
            ("AUD-02", 53.6, 42.0, "Auditorium"),
        ]
        first_bld = b_ids[0] if b_ids else None
        for pid, st, bt, bname in sample_obs:
            analyses.append(classify_thermal_observation(
                panel_id=pid,
                surface_temp_c=st,
                baseline_temp_c=bt,
                provenance="SAMPLE_ILLUSTRATIVE",
                building_id=first_bld
            ))

    total = len(analyses)
    temps = [a.surface_temp_c for a in analyses]
    avg_t = round(sum(temps) / max(1, total), 1)
    max_t = max(temps) if temps else 0.0

    critical_count = sum(1 for a in analyses if a.diagnostic_status == "CRITICAL")
    elevated_count = sum(1 for a in analyses if a.diagnostic_status == "ELEVATED")
    review_count = sum(1 for a in analyses if a.diagnostic_status == "REVIEW")
    normal_count = sum(1 for a in analyses if a.diagnostic_status == "NORMAL")
    anomalies = critical_count + elevated_count + review_count

    avg_loss = round(sum(a.estimated_power_loss_pct for a in analyses) / max(1, total), 1)
    provenance = "MEASURED" if inspections else "SAMPLE_DEMO"

    return ThermalSummaryResponse(
        project_id=project_id,
        total_monitored_strings=total,
        avg_temperature_c=avg_t,
        max_temperature_c=max_t,
        anomalies_count=anomalies,
        critical_count=critical_count,
        elevated_count=elevated_count,
        review_count=review_count,
        normal_count=normal_count,
        fleet_power_loss_pct=avg_loss,
        provenance=provenance,
        methodology="Calculated relative surface temperature elevation (ΔT = T_surface - T_baseline) using nominal operating cell temperature standards.",
        observations=analyses
    )

@router.post("/projects/{project_id}/thermal-observations", response_model=List[ThermalObservationAnalysis])
def ingest_thermal_observations(
    project_id: str,
    payload: ThermalBatchIngestRequest,
    db: Session = Depends(get_db)
):
    """
    Ingests a batch of panel or string temperature observations and evaluates hotspot severity.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    results: List[ThermalObservationAnalysis] = []
    for obs in payload.observations:
        analysis = classify_thermal_observation(
            panel_id=obs.panel_id,
            surface_temp_c=obs.surface_temp_c,
            baseline_temp_c=obs.baseline_temp_c or 42.0,
            provenance=payload.provenance,
            building_id=payload.building_id,
            notes=obs.notes
        )
        results.append(analysis)

    return results

@router.post("/projects/{project_id}/thermal-upload-csv", response_model=List[ThermalObservationAnalysis])
async def upload_thermal_csv(
    project_id: str,
    file: UploadFile = File(...),
    building_id: Optional[str] = Query(None),
    baseline_temp_c: float = Query(42.0),
    db: Session = Depends(get_db)
):
    """
    Uploads and parses a CSV of panel surface temperatures.
    Expected CSV columns: panel_id, surface_temp_c (optional: baseline_temp_c, irradiance_wm2, notes).
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    raw_filename = file.filename or "thermal_observations.csv"
    if not raw_filename.lower().endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds limit of 5MB.")

    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))

    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file appears empty or unreadable.")

    # Normalize column headers
    cols = {c.strip().lower(): c for c in reader.fieldnames}
    pid_col = next((cols[k] for k in ["panel_id", "module_id", "string_id", "id", "panel"] if k in cols), None)
    temp_col = next((cols[k] for k in ["surface_temp_c", "temperature_c", "temp_c", "temperature", "temp"] if k in cols), None)

    if not pid_col or not temp_col:
        raise HTTPException(
            status_code=400,
            detail=f"Required columns missing. CSV must contain 'panel_id' and 'surface_temp_c'. Found: {list(reader.fieldnames)}"
        )

    results: List[ThermalObservationAnalysis] = []
    for row_idx, row in enumerate(reader):
        raw_pid = (row.get(pid_col) or "").strip()
        raw_temp = (row.get(temp_col) or "").strip()

        if not raw_pid or not raw_temp:
            continue

        try:
            temp_val = float(raw_temp)
            if not (-20.0 <= temp_val <= 120.0):
                continue
        except ValueError:
            continue

        analysis = classify_thermal_observation(
            panel_id=raw_pid,
            surface_temp_c=temp_val,
            baseline_temp_c=baseline_temp_c,
            provenance="MEASURED_CSV",
            building_id=building_id
        )
        results.append(analysis)

    if not results:
        raise HTTPException(status_code=400, detail="No valid temperature rows found in uploaded CSV.")

    return results

@router.post("/projects/{project_id}/thermal-maintenance-ticket")
def create_maintenance_from_thermal(
    project_id: str,
    payload: ThermalCreateMaintenanceRequest,
    db: Session = Depends(get_db)
):
    """
    Creates a maintenance case in RoofShift AI directly from an anomalous thermal inspection finding.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    title = f"Thermal Hotspot: String {payload.panel_id} (ΔT +{payload.delta_temp_c:.1f}°C)"
    description = (
        f"Automated thermal diagnostics detected elevated panel surface temperature of {payload.surface_temp_c:.1f}°C "
        f"(ΔT +{payload.delta_temp_c:.1f}°C relative to baseline).\n"
        f"Suspected Cause: {payload.suspected_cause}\n"
        f"Notes: {payload.notes or 'Initiated from Solar Thermal Intelligence workspace.'}\n\n"
        f"Safety Advisory: Do not touch live DC connections. Verify with qualified technician using lockout/tagout (LOTO)."
    )

    case_obj = MaintenanceCase(
        project_id=project_id,
        building_id=payload.building_id,
        title=title,
        description=description,
        category="ELECTRICAL_HOTSPOT",
        priority=payload.priority.upper() if payload.priority else "HIGH",
        status="OPEN",
        estimated_loss_kwh_per_day=round(payload.delta_temp_c * 0.45, 2),
        assigned_to="Solar Operations Team"
    )
    db.add(case_obj)
    db.commit()
    db.refresh(case_obj)

    return {
        "status": "SUCCESS",
        "maintenance_case_id": case_obj.id,
        "title": case_obj.title,
        "priority": case_obj.priority,
        "estimated_loss_kwh_per_day": case_obj.estimated_loss_kwh_per_day
    }
