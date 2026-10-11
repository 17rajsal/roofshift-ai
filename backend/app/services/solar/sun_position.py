"""Deterministic Solar Position and Sun Ephemeris Service.
Calculates solar elevation, zenith, azimuth, sunrise, sunset, and day length
using standard Spencer, Michalsky, and NOAA solar position equations.
Does not require external C/Fortran libraries.
"""
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional


def calculate_sun_position(
    lat: float,
    lng: float,
    dt: Optional[datetime] = None,
    tz_offset_hours: float = 5.5  # Default: Indian Standard Time (UTC+5:30)
) -> Dict[str, Any]:
    """Calculates comprehensive solar position and day ephemeris for given coordinates.
    
    Args:
        lat: Latitude in decimal degrees (-90 to 90)
        lng: Longitude in decimal degrees (-180 to 180)
        dt: Observation timestamp (defaults to current UTC)
        tz_offset_hours: Timezone offset in hours from UTC (5.5 for IST)
        
    Returns:
        Dict containing elevation, zenith, azimuth, sunrise, sunset, day length,
        solar noon elevation, and explicit shading limitations disclaimer.
    """
    if dt is None:
        dt = datetime.now(timezone.utc)
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)

    # 1. Day of Year (1 - 366)
    day_of_year = dt.timetuple().tm_yday
    hour = dt.hour
    minute = dt.minute
    second = dt.second

    # Fractional year in radians
    gamma = 2.0 * math.pi / 365.0 * (day_of_year - 1 + (hour - 12.0) / 24.0)

    # 2. Equation of Time (EoT) in minutes
    eqtime = 229.18 * (
        0.000075
        + 0.001868 * math.cos(gamma)
        - 0.032077 * math.sin(gamma)
        - 0.014615 * math.cos(2.0 * gamma)
        - 0.040849 * math.sin(2.0 * gamma)
    )

    # 3. Solar Declination Angle (delta) in radians and degrees
    decl_rad = (
        0.006918
        - 0.399912 * math.cos(gamma)
        + 0.070257 * math.sin(gamma)
        - 0.006758 * math.cos(2.0 * gamma)
        + 0.000907 * math.sin(2.0 * gamma)
        - 0.002697 * math.cos(3.0 * gamma)
        + 0.001480 * math.sin(3.0 * gamma)
    )
    decl_deg = math.degrees(decl_rad)

    # 4. True Solar Time (TST) in minutes
    # Time offset = eqtime + 4 * longitude - 60 * timezone_offset
    time_offset = eqtime + 4.0 * lng - 60.0 * tz_offset_hours
    utc_minutes = hour * 60.0 + minute + second / 60.0
    lst_minutes = (utc_minutes + tz_offset_hours * 60.0) % 1440.0
    tst_minutes = (lst_minutes + time_offset) % 1440.0

    # 5. Solar Hour Angle (H) in degrees and radians
    hour_angle_deg = (tst_minutes / 4.0) - 180.0
    hour_angle_rad = math.radians(hour_angle_deg)

    # 6. Latitude in radians
    lat_rad = math.radians(lat)

    # 7. Solar Zenith Angle (theta_z)
    cos_zenith = (
        math.sin(lat_rad) * math.sin(decl_rad)
        + math.cos(lat_rad) * math.cos(decl_rad) * math.cos(hour_angle_rad)
    )
    # Clamp for numerical stability
    cos_zenith = max(-1.0, min(1.0, cos_zenith))
    zenith_rad = math.acos(cos_zenith)
    zenith_deg = math.degrees(zenith_rad)

    # Solar Elevation Angle (alpha)
    elevation_deg = 90.0 - zenith_deg

    # 8. Solar Azimuth Angle (phi)
    # Measured clockwise from North (0° = North, 90° = East, 180° = South, 270° = West)
    sin_zenith = math.sin(zenith_rad)
    if abs(sin_zenith) > 1e-6:
        cos_azimuth = (
            math.sin(lat_rad) * math.cos(zenith_rad) - math.sin(decl_rad)
        ) / (math.cos(lat_rad) * sin_zenith)
        cos_azimuth = max(-1.0, min(1.0, cos_azimuth))
        azimuth_deg = 180.0 - math.degrees(math.acos(cos_azimuth))
        if hour_angle_deg > 0:
            azimuth_deg = 360.0 - azimuth_deg
    else:
        azimuth_deg = 180.0

    # 9. Sunrise, Sunset, and Day Length
    # Hour angle at horizon (zenith = 90.833° accounting for atmospheric refraction and solar disk radius)
    cos_h0 = (
        math.cos(math.radians(90.833)) - math.sin(lat_rad) * math.sin(decl_rad)
    ) / (math.cos(lat_rad) * math.cos(decl_rad))

    sunrise_time_str = "06:00"
    sunset_time_str = "18:00"
    day_length_hours = 12.0

    if cos_h0 >= 1.0:
        # Polar night (sun never rises)
        day_length_hours = 0.0
        sunrise_time_str = "None (Polar Night)"
        sunset_time_str = "None (Polar Night)"
    elif cos_h0 <= -1.0:
        # Midnight sun (sun never sets)
        day_length_hours = 24.0
        sunrise_time_str = "None (Polar Day)"
        sunset_time_str = "None (Polar Day)"
    else:
        h0_deg = math.degrees(math.acos(cos_h0))
        day_length_hours = round(2.0 * h0_deg / 15.0, 2)

        # Solar noon in Local Standard Time (minutes from midnight)
        solar_noon_lst = (720.0 - time_offset) % 1440.0
        sunrise_lst = (solar_noon_lst - h0_deg * 4.0) % 1440.0
        sunset_lst = (solar_noon_lst + h0_deg * 4.0) % 1440.0

        sr_h = int(sunrise_lst // 60)
        sr_m = int(sunrise_lst % 60)
        ss_h = int(sunset_lst // 60)
        ss_m = int(sunset_lst % 60)
        sunrise_time_str = f"{sr_h:02d}:{sr_m:02d} IST"
        sunset_time_str = f"{ss_h:02d}:{ss_m:02d} IST"

    # 10. Solar Noon Elevation Angle
    noon_elevation_deg = round(90.0 - abs(lat - decl_deg), 2)

    return {
        "solar_elevation_deg": round(elevation_deg, 2),
        "solar_zenith_deg": round(zenith_deg, 2),
        "solar_azimuth_deg": round(azimuth_deg, 2),
        "solar_noon_elevation_deg": noon_elevation_deg,
        "solar_declination_deg": round(decl_deg, 2),
        "equation_of_time_minutes": round(eqtime, 2),
        "sunrise_time": sunrise_time_str,
        "sunset_time": sunset_time_str,
        "day_length_hours": day_length_hours,
        "calculation_method": "Deterministic Spencer & Michalsky NOAA Solar Ephemeris",
        "shading_assessment_status": "unavailable",
        "shading_limitation_notice": (
            "Detailed 3D shading assessment unavailable — additional site geometry, "
            "LiDAR point clouds, or 3D obstacle models required. Default losses use standard "
            "terrain/obstacle category guidelines."
        )
    }
