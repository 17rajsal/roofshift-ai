import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  SunMedium,
  Thermometer,
  Wind,
  CloudSun,
  Building2,
  Compass,
  Mountain,
  ShieldCheck,
  Plus,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';
import {
  EnvironmentalProfileResponse,
  OsmBuildingsResponse,
  OpenAreaScreeningResponse,
  OsmBuildingItem
} from '../../types/models';
import { formatNumber, formatINR } from '../../utils/formatters';

interface CoordinateInspectionDrawerProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onStartProject: (params: {
    city: string;
    lat: number;
    lng: number;
    mappedBuildings?: OsmBuildingItem[];
  }) => void;
}

export const CoordinateInspectionDrawer: React.FC<CoordinateInspectionDrawerProps> = ({
  lat,
  lng,
  onClose,
  onStartProject
}) => {
  const [activeTab, setActiveTab] = useState<'solar' | 'buildings' | 'openland'>('solar');
  const [profile, setProfile] = useState<EnvironmentalProfileResponse | null>(null);
  const [osmData, setOsmData] = useState<OsmBuildingsResponse | null>(null);
  const [screening, setScreening] = useState<OpenAreaScreeningResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCoordinateData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [profileRes, osmRes, screeningRes] = await Promise.all([
          api.getEnvironmentalProfile(lat, lng),
          api.getOsmBuildings(lat, lng, 300),
          api.getOpenAreaScreening(lat, lng)
        ]);

        if (!cancelled) {
          setProfile(profileRes);
          setOsmData(osmRes);
          setScreening(screeningRes);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load coordinate intelligence:', err);
          setError(err.message || 'Unable to retrieve environmental profile for this coordinate.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCoordinateData();
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  const nearestCity = profile?.nearest_region?.name || 'Selected Coordinate';

  return (
    <div className="absolute top-3 right-3 bottom-3 z-1000 w-96 max-w-[calc(100vw-1.5rem)] bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-white/60">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-600 bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full w-fit mb-1.5">
            <MapPin className="w-3 h-3" />
            <span>{nearestCity} Region</span>
          </div>
          <h3 className="text-sm font-extrabold text-[#0F172A] tracking-tight">
            Coordinate Solar Intelligence
          </h3>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
            {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close coordinate inspection panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-100 px-3 pt-2 gap-1 bg-slate-50/70 text-xs font-bold">
        <button
          onClick={() => setActiveTab('solar')}
          className={`flex-1 py-2 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'solar'
              ? 'border-[#FF6B16] text-[#FF6B16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <SunMedium className="w-3.5 h-3.5" />
          <span>Solar & Sun</span>
        </button>

        <button
          onClick={() => setActiveTab('buildings')}
          className={`flex-1 py-2 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'buildings'
              ? 'border-[#FF6B16] text-[#FF6B16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>OSM Roofs ({osmData?.building_count ?? '…'})</span>
        </button>

        <button
          onClick={() => setActiveTab('openland')}
          className={`flex-1 py-2 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'openland'
              ? 'border-[#FF6B16] text-[#FF6B16]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mountain className="w-3.5 h-3.5" />
          <span>Open Land</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
            <p className="text-xs font-semibold text-slate-600">Retrieving NASA POWER & Open-Meteo data…</p>
            <p className="text-[10px] text-slate-400 max-w-xs">Connecting to satellite irradiance grids and OSM footprint servers</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Inspection Error</span>
            </div>
            <p className="text-[11px] leading-relaxed">{error}</p>
          </div>
        ) : profile ? (
          <>
            {/* TAB 1: SOLAR & SUN EPHEMERIS */}
            {activeTab === 'solar' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* AI Suitability Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-white border border-orange-500/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Coordinate Solar Suitability
                    </span>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-orange-600 text-white">
                      Tier {profile.ai_suitability.tier}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#0F172A]">
                      {profile.ai_suitability.rooftop_suitability_score}
                    </span>
                    <span className="text-slate-400 font-semibold">/ 100</span>
                    <span className="text-[11px] text-emerald-600 font-bold ml-auto">
                      PR ~ {(profile.solar_irradiance.performance_ratio * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    NASA POWER 20-Year Baseline • Est. Yield {profile.solar_irradiance.annual_yield_kwh_per_kwp} kWh/kWp/yr
                  </p>
                </div>

                {/* Irradiance Metrics Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <div className="text-[10px] text-slate-400 font-semibold">GHI (Global)</div>
                    <div className="text-sm font-extrabold text-[#0F172A] mt-0.5">
                      {profile.solar_irradiance.ghi_daily_kwh}
                    </div>
                    <div className="text-[9px] text-slate-500">kWh/m²/day</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <div className="text-[10px] text-slate-400 font-semibold">DNI (Direct)</div>
                    <div className="text-sm font-extrabold text-[#0F172A] mt-0.5">
                      {profile.solar_irradiance.dni_daily_kwh}
                    </div>
                    <div className="text-[9px] text-slate-500">kWh/m²/day</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <div className="text-[10px] text-slate-400 font-semibold">DHI (Diffuse)</div>
                    <div className="text-sm font-extrabold text-[#0F172A] mt-0.5">
                      {profile.solar_irradiance.dhi_daily_kwh}
                    </div>
                    <div className="text-[9px] text-slate-500">kWh/m²/day</div>
                  </div>
                </div>

                {/* Meteorological Parameters */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                      Meteorological Conditions
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {profile.meteorological_conditions.weather_source.split('(')[0]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-500">Ambient Temp:</span>
                      <span className="font-bold text-slate-800">
                        {profile.meteorological_conditions.ambient_temperature_celsius}°C
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-500">Wind (10m):</span>
                      <span className="font-bold text-slate-800">
                        {profile.meteorological_conditions.wind_speed_ms} m/s
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-500">Rel. Humidity:</span>
                      <span className="font-bold text-slate-800">
                        {profile.meteorological_conditions.relative_humidity_pct}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                      <span className="text-slate-500">Cloud Cover:</span>
                      <span className="font-bold text-slate-800">
                        {profile.meteorological_conditions.cloud_cover_pct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sun Position & Ephemeris */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-blue-500" />
                      Deterministic Sun Position
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">NOAA / Spencer</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500">Solar Elevation:</span>{' '}
                      <span className="font-bold text-slate-800">{profile.sun_ephemeris.solar_elevation_deg}°</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Solar Azimuth:</span>{' '}
                      <span className="font-bold text-slate-800">{profile.sun_ephemeris.solar_azimuth_deg}°</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Sunrise:</span>{' '}
                      <span className="font-bold text-slate-800">{profile.sun_ephemeris.sunrise_time}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Sunset:</span>{' '}
                      <span className="font-bold text-slate-800">{profile.sun_ephemeris.sunset_time}</span>
                    </div>
                  </div>
                </div>

                {/* Shading Limitation Notice */}
                <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Shading Assessment Status</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-amber-800">
                    {profile.shading_disclaimer}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: OPENSTREETMAP BUILDING FOOTPRINTS */}
            {activeTab === 'buildings' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {osmData?.status === 'success' && osmData.building_count > 0 ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{osmData.building_count} Mapped Buildings Found</span>
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          OSM Overpass
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-emerald-700">Usable Roof Area:</span>
                          <div className="font-extrabold text-sm text-emerald-950">
                            {formatNumber(osmData.total_usable_roof_area_sqm || 0)} m²
                          </div>
                        </div>
                        <div>
                          <span className="text-emerald-700">PV Capacity:</span>
                          <div className="font-extrabold text-sm text-emerald-950">
                            {osmData.total_pv_capacity_kwp} kWp
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="font-bold text-slate-700 text-[11px]">Mapped Rooftops (Radius 300m):</div>
                      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                        {osmData.buildings.slice(0, 10).map((b) => (
                          <div
                            key={b.id}
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 transition-all flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-slate-800 truncate max-w-[170px]">{b.name}</div>
                              <div className="text-[10px] text-slate-500">
                                {b.usable_roof_area} m² usable • {b.max_pv_capacity_kwp} kWp
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-extrabold text-[#FF6B16] text-[11px]">
                                {formatNumber(b.annual_generation_kwh)} kWh/yr
                              </div>
                              <div className="text-[9px] text-slate-400">{b.category}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        onStartProject({
                          city: nearestCity,
                          lat,
                          lng,
                          mappedBuildings: osmData.buildings
                        })
                      }
                      className="w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Create Project with {osmData.building_count} Mapped Roofs</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-slate-200/70 text-slate-500 flex items-center justify-center mx-auto">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-800 text-xs">
                        No Mapped Footprints in OpenStreetMap
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        This location does not currently have building polygons mapped in OSM.
                        You can create a project at these coordinates and draw custom roof boundaries
                        or upload your own GeoJSON/CSV building coordinates.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        onStartProject({
                          city: nearestCity,
                          lat,
                          lng
                        })
                      }
                      className="w-full py-2.5 px-4 rounded-2xl bg-[#FF6B16] hover:bg-[#EA580C] text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Project at these Coordinates</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: OPEN-AREA / UTILITY SCREENING */}
            {activeTab === 'openland' && screening && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Open-Area Solar Screening</span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Tier {screening.suitability_tier}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-xl bg-white/80 border border-white">
                      <span className="text-slate-400">Terrain Slope:</span>
                      <div className="font-bold text-slate-800">
                        {screening.screening_metrics.estimated_terrain_slope_pct}% ({screening.screening_metrics.slope_suitability})
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white/80 border border-white">
                      <span className="text-slate-400">Land Class:</span>
                      <div className="font-bold text-slate-800">
                        {screening.screening_metrics.indicative_land_class}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Regulatory Disclaimer */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Regulatory & Grid Feasibility Disclaimer</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-600">
                    {screening.regulatory_and_grid_disclaimer}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Footer Action */}
      <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between gap-2">
        <button
          onClick={() =>
            onStartProject({
              city: nearestCity,
              lat,
              lng,
              mappedBuildings: osmData?.buildings
            })
          }
          className="flex-1 py-2.5 px-3 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#FF6B16]" />
          <span>Start Project at Coordinates</span>
        </button>
      </div>
    </div>
  );
};
