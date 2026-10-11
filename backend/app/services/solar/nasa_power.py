"""NASA POWER climatology with validated values and truthful cache provenance."""
import math
import logging
import httpx
from datetime import datetime, timedelta
from typing import Dict, Tuple
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.solar_cache import SolarDataCache
from app.services.energy.balance import finite, DAYS_IN_MONTH, MONTH_KEYS

logger = logging.getLogger(__name__)
# Retained application example values. They are planning defaults, not a
# verified NISE/IMD dataset and must not be presented as satellite observations.
DEFAULT_INDIA_MONTHLY_GHI = {
    'JAN': 4.35, 'FEB': 5.12, 'MAR': 5.88, 'APR': 6.42,
    'MAY': 6.65, 'JUN': 5.75, 'JUL': 4.82, 'AUG': 4.58,
    'SEP': 5.10, 'OCT': 5.25, 'NOV': 4.72, 'DEC': 4.15,
}
DEFAULT_ANNUAL_GHI = sum(DEFAULT_INDIA_MONTHLY_GHI[m] * d for m, d in zip(MONTH_KEYS, DAYS_IN_MONTH)) / 365
CACHE_SOURCE_PREFIX = 'RoofShift GHI v3 | '


def _valid(value):
    try:
        number = float(value)
        return number if math.isfinite(number) and 0 <= number <= 15 else None
    except (ValueError, TypeError):
        return None


def _annual(monthly):
    return sum(monthly[m] * days for m, days in zip(MONTH_KEYS, DAYS_IN_MONTH)) / 365


class InsufficientSolarDataError(ValueError):
    """Raised when authentic satellite solar data cannot be retrieved and illustrative fallback is disallowed."""
    pass


def _label(source):
    if 'Composite' in source:
        return 'Mixed NASA POWER model and illustrative fallback; not measured ground site data'
    if 'Illustrative' in source:
        return 'Illustrative planning fallback (Developer defaults); not location-verified satellite observations. Do not use for financial signoff.'
    return 'NASA POWER 20-Yr satellite/model climatology; not measured ground site data'


async def fetch_solar_irradiance(
    lat: float,
    lon: float,
    db: Session,
    allow_illustrative: bool = True
) -> Tuple[Dict[str, float], float, str, str]:
    finite(lat, 'latitude', -90, 90)
    finite(lon, 'longitude', -180, 180)
    # Query and cache the same coordinate precision. No 0.1-degree ambiguity.
    grid_lat, grid_lon = round(lat, 4), round(lon, 4)
    cached = db.query(SolarDataCache).filter(SolarDataCache.grid_lat == grid_lat, SolarDataCache.grid_lon == grid_lon).order_by(SolarDataCache.fetched_at.desc()).first()
    if cached and cached.source and cached.source.startswith(CACHE_SOURCE_PREFIX):
        monthly = cached.ghi_monthly
        if isinstance(monthly, dict) and all(m in monthly and _valid(monthly[m]) is not None for m in MONTH_KEYS):
            is_fallback = 'Illustrative' in cached.source or 'Composite' in cached.source
            if is_fallback and not allow_illustrative:
                pass  # Do not return cached illustrative data if strictly disallowed
            else:
                ttl = timedelta(hours=1) if is_fallback else timedelta(days=30)
                if cached.fetched_at and datetime.utcnow() - cached.fetched_at <= ttl:
                    values = {m: float(monthly[m]) for m in MONTH_KEYS}
                    return values, _annual(values), cached.source, _label(cached.source) + ' (cached)'
    observed = {}
    try:
        async with httpx.AsyncClient(timeout=settings.NASA_REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.get(settings.NASA_POWER_BASE_URL, params={
                'parameters': 'ALLSKY_SFC_SW_DWN', 'community': 'RE',
                'longitude': grid_lon, 'latitude': grid_lat, 'format': 'JSON',
            })
            response.raise_for_status()
            data = response.json().get('properties', {}).get('parameter', {}).get('ALLSKY_SFC_SW_DWN', {})
            if isinstance(data, dict):
                observed = {m: value for m in MONTH_KEYS if (value := _valid(data.get(m))) is not None}
    except (httpx.HTTPError, ValueError, TypeError, AttributeError) as exc:
        logger.warning('NASA POWER unavailable: %s; fallback requested=%s', type(exc).__name__, allow_illustrative)
        if not allow_illustrative:
            raise InsufficientSolarDataError(
                f"Authentic satellite irradiance observations could not be retrieved from NASA POWER for coordinates "
                f"({grid_lat}, {grid_lon}), and unverified illustrative fallback is disallowed."
            ) from exc

    if not observed and not allow_illustrative:
        raise InsufficientSolarDataError(
            f"No verified solar irradiance records returned by NASA POWER for coordinates ({grid_lat}, {grid_lon})."
        )

    monthly = {m: observed.get(m, DEFAULT_INDIA_MONTHLY_GHI[m]) for m in MONTH_KEYS}
    if len(observed) == 12:
        source = CACHE_SOURCE_PREFIX + 'NASA POWER Climatology (Satellite/Model)'
    elif observed:
        source = CACHE_SOURCE_PREFIX + f'Composite NASA POWER ({len(observed)}/12 months) + illustrative fallback'
    else:
        source = CACHE_SOURCE_PREFIX + 'Illustrative Solar Planning Defaults (Indian example profile)'
    if cached:
        cached.ghi_monthly, cached.ghi_annual, cached.source, cached.fetched_at = monthly, _annual(monthly), source, datetime.utcnow()
    else:
        db.add(SolarDataCache(grid_lat=grid_lat, grid_lon=grid_lon, ghi_monthly=monthly, ghi_annual=_annual(monthly), source=source))
    db.commit()
    return monthly, _annual(monthly), source, _label(source)
