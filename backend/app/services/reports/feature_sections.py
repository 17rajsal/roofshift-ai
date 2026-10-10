"""Render stored calculations; the presentation layer performs no feature calculations."""
from html import escape
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

FEATURE_TITLES = {
    "solar-location-finder": "Solar Location Finder",
    "solar-prediction": "Solar Prediction",
    "panel-fault-detection": "Panel Fault Detection",
    "performance-monitoring": "Performance Monitoring",
    "demand-analysis": "Electricity Demand Analysis",
    "cost-savings": "Cost & Savings Calculator",
    "environmental-impact": "Environmental Impact Calculator",
    "maintenance-recommendations": "Maintenance Recommendations",
}


def _label(key):
    value = str(key).replace("_", " ").replace("kwh", "kWh").replace("kwp", "kWp").replace("inr", "INR").replace("co2", "CO2")
    return value[:1].upper() + value[1:]


def _text(value):
    if value is None:
        return "Not available"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, float):
        return f"{value:,.4f}".rstrip("0").rstrip(".")
    return str(value).replace("₹", "INR ")


def _rows(value, prefix=""):
    """Bound report size while keeping complete inputs/results in assessment history."""
    if isinstance(value, dict):
        for key, child in value.items():
            if key == "contract_version":
                continue
            yield from _rows(child, f"{prefix} / {_label(key)}" if prefix else _label(key))
    elif isinstance(value, list):
        for index, child in enumerate(value[:12]):
            yield from _rows(child, f"{prefix} {index + 1}")
        if len(value) > 12:
            yield prefix, f"First 12 of {len(value)} items shown; complete result retained in assessment history."
    else:
        yield prefix, _text(value)


def append_feature_sections(story, assessments, style_heading, style_body, style_caption, include_scenarios=True):
    story.append(Paragraph("7. Expanded Solar Assessments", style_heading))
    story.append(Paragraph("Calculated results below are snapshots from this project's saved feature assessments. Missing telemetry or calculations are recorded as unavailable. Dates identify assessment execution; they are not continuous monitoring timestamps.", style_body))
    latest = {}
    for item in assessments:
        latest.setdefault(item.feature_key, item)
    for key, title in FEATURE_TITLES.items():
        if key == "cost-savings" and not include_scenarios:
            continue
        story.append(Paragraph(escape(title), style_heading))
        item = latest.get(key)
        if item is None:
            story.append(Paragraph("No saved assessment. Run this feature with project data before using its results in a decision.", style_body))
            continue
        story.append(Paragraph(f"Assessment executed: {item.created_at.isoformat()} UTC | Reference: {escape(item.id)}", style_caption))
        rows = list(_rows(item.result_json))
        shown = rows[:120]
        table = Table([[Paragraph(escape(name), style_body), Paragraph(escape(value).replace("\n", "<br/>"), style_body)] for name, value in shown], colWidths=[220, 284], hAlign="LEFT")
        table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#F6F8F7")]),
            ("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.HexColor("#DCE7E1")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(table)
        if len(rows) > 120:
            story.append(Paragraph(f"Showing 120 of {len(rows)} detail rows. Complete results and supplied assumptions remain in assessment history.", style_caption))
        story.append(Spacer(1, 8))
