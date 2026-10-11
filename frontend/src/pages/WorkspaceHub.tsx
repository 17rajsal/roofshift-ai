import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Compass,
  SlidersHorizontal,
  Activity,
  FileCheck2,
  Building,
  Plus,
  UploadCloud,
  MapPin,
  ArrowRight,
  TrendingUp,
  Sun,
  SunMedium,
  Zap,
  ShieldCheck,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  CheckCircle2,
  Leaf,
  Globe,
  Mountain,
  School,
  Thermometer,
  Wind,
  CloudSun,
  Building2,
  AlertCircle
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import {
  Building as BuildingModel,
  IndiaSolarRegion,
  IndiaNationalSolarSummary,
  OsmBuildingItem,
  EnvironmentalProfileResponse,
  OsmBuildingsResponse,
  OpenAreaScreeningResponse
} from '../types/models';
import { formatINR, formatNumber, formatArea, formatCO2 } from '../utils/formatters';
import { BulkImportModal } from '../components/buildings/BulkImportModal';
import { NewProjectModal } from '../components/layout/NewProjectModal';
import { IndiaSolarMap } from '../components/map/IndiaSolarMap';

export const WorkspaceHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    activeProject,
    projects,
    setActiveProject,
    refreshProjects,
    loadDemoProject,
    createProject
  } = useProject();

  // Mode: 'india_map' (default flagship) vs 'site_planner' (portfolio/building level)
  const modeParam = searchParams.get('mode');
  const [workspaceMode, setWorkspaceMode] = useState<'india_map' | 'site_planner'>(
    modeParam === 'site' ? 'site_planner' : 'india_map'
  );
  const [pendingProjectParams, setPendingProjectParams] = useState<{
    city: string;
    lat: number;
    lng: number;
    mappedBuildings?: OsmBuildingItem[];
  } | null>(null);

  useEffect(() => {
    if (modeParam === 'site') {
      setWorkspaceMode('site_planner');
    } else if (modeParam === 'india') {
      setWorkspaceMode('india_map');
    }
  }, [modeParam]);

  const handleSwitchMode = (mode: 'india_map' | 'site_planner') => {
    setWorkspaceMode(mode);
    setSearchParams(mode === 'site_planner' ? { mode: 'site' } : { mode: 'india' });
  };

  const [buildings, setBuildings] = useState<BuildingModel[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalculateMessage, setRecalculateMessage] = useState<string | null>(null);
  const [nationalSummary, setNationalSummary] = useState<IndiaNationalSolarSummary | null>(null);

  const SUGGESTED_LOCATIONS = [
    { name: 'Delhi', state: 'NCT', lat: 28.6139, lng: 77.2090 },
    { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
    { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
    { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
    { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
    { name: 'Leh', state: 'Ladakh', lat: 34.1526, lng: 77.5771 },
  ];

  const [selectedLocation, setSelectedLocation] = useState<{
    city: string;
    lat: number;
    lng: number;
    profile?: EnvironmentalProfileResponse | null;
    osm?: OsmBuildingsResponse | null;
    screening?: OpenAreaScreeningResponse | null;
    loading: boolean;
    error?: string | null;
  } | null>(null);
  const [searchLocationQuery, setSearchLocationQuery] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [isAnalyzingLocation, setIsAnalyzingLocation] = useState(false);

  const fetchLocationData = async (cityName: string, lat: number, lng: number) => {
    setSelectedLocation({
      city: cityName,
      lat,
      lng,
      loading: true,
    });

    try {
      const [profileRes, osmRes, screeningRes] = await Promise.all([
        api.getEnvironmentalProfile(lat, lng),
        api.getOsmBuildings(lat, lng, 300).catch(() => null),
        api.getOpenAreaScreening(lat, lng).catch(() => null),
      ]);

      setSelectedLocation({
        city: cityName || profileRes?.nearest_region?.name || 'Selected Location',
        lat,
        lng,
        profile: profileRes,
        osm: osmRes,
        screening: screeningRes,
        loading: false,
      });
    } catch (err: any) {
      setSelectedLocation({
        city: cityName,
        lat,
        lng,
        loading: false,
        error: err.message || 'Failed to retrieve environmental data for this location.',
      });
    }
  };

  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchLocationQuery.trim()) return;
    try {
      setSearchingLocation(true);
      const results = await api.searchLocation(searchLocationQuery.trim());
      if (results && results.length > 0) {
        const top = results[0];
        const cityName = top.display_name.split(',')[0].trim();
        await fetchLocationData(cityName, top.lat, top.lon);
      }
    } catch (err) {
      console.warn('Geocoding search failed:', err);
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleSelectSuggestion = (city: string, lat: number, lng: number) => {
    setSearchLocationQuery(city);
    fetchLocationData(city, lat, lng);
  };

  const handleMapCoordinateClick = (coord: { lat: number; lng: number }) => {
    fetchLocationData(`Coordinates (${coord.lat.toFixed(2)}, ${coord.lng.toFixed(2)})`, coord.lat, coord.lng);
  };

  const handleMapRegionClick = (reg: IndiaSolarRegion) => {
    fetchLocationData(reg.name, reg.coordinates.lat, reg.coordinates.lng);
  };

  const handleAnalyzeLocation = async () => {
    if (!selectedLocation || !selectedLocation.profile) return;
    try {
      setIsAnalyzingLocation(true);
      const created = await createProject({
        name: `${selectedLocation.city} Solar Project`,
        organization_name: `${selectedLocation.city} Clean Energy Campus`,
        city: selectedLocation.city,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        budget: 1500000,
        tariff_rate: 8.5,
        export_tariff: 3.5,
        co2_factor: 0.716,
      });

      if (selectedLocation.osm?.buildings && selectedLocation.osm.buildings.length > 0) {
        for (const b of selectedLocation.osm.buildings.slice(0, 25)) {
          try {
            await api.createBuilding(created.id, {
              name: b.name || `Building ${b.id}`,
              category: b.category || 'Commercial',
              latitude: b.latitude,
              longitude: b.longitude,
              gross_roof_area: b.gross_roof_area,
              usable_roof_percentage: Math.round((b.usable_roof_area / b.gross_roof_area) * 100),
              monthly_consumption_kwh: Math.round((b.annual_generation_kwh / 12) * 1.2),
              daytime_consumption_pct: 65,
              shading_category: 'Minimal',
              cost_per_kwp: 48000,
              roof_polygon: b.polygon_coordinates,
            });
          } catch (e) {
            console.warn('Failed to add building to project:', e);
          }
        }
      }

      setActiveProject(created);
      navigate('/workspace/explore');
    } catch (err: any) {
      console.error('Failed to analyze location:', err);
    } finally {
      setIsAnalyzingLocation(false);
    }
  };

  const calculatedLocationMetrics = useMemo(() => {
    if (!selectedLocation?.profile) return null;
    const prof = selectedLocation.profile;
    const osm = selectedLocation.osm;
    const screening = selectedLocation.screening;

    const ghi = prof.solar_irradiance.ghi_daily_kwh;
    const dni = prof.solar_irradiance.dni_daily_kwh;
    const dhi = prof.solar_irradiance.dhi_daily_kwh;
    const yieldKwh = prof.solar_irradiance.annual_yield_kwh_per_kwp;
    const prPct = (prof.solar_irradiance.performance_ratio * 100).toFixed(1);

    const temp = prof.meteorological_conditions.ambient_temperature_celsius;
    const wind = prof.meteorological_conditions.wind_speed_ms;
    const cloud = prof.meteorological_conditions.cloud_cover_pct;
    const coolingGain = (wind * 0.3).toFixed(1);
    const thermalDerate = ((1 - prof.solar_irradiance.thermal_derate_factor) * 100).toFixed(1);

    const buildingsCount = osm?.building_count ?? 0;
    const usableRoofArea = osm?.buildings
      ? osm.buildings.reduce((sum, b) => sum + (b.usable_roof_area || 0), 0)
      : 0;

    const estimatedArrayKwp = usableRoofArea > 0 ? Math.max(25, Math.round(usableRoofArea / 8.5)) : 50;
    const annualGenKwh = Math.round(estimatedArrayKwp * yieldKwh);
    const commercialTariffInr = 8.5;
    const annualSavingsInr = Math.round(annualGenKwh * commercialTariffInr);
    const estCapexInr = estimatedArrayKwp * 48000;
    const paybackYears = (estCapexInr / (annualSavingsInr || 1)).toFixed(1);
    const co2AvoidedKg = Math.round(annualGenKwh * 0.716);

    const slopePct = screening?.screening_metrics?.estimated_terrain_slope_pct ?? 1.8;
    const slopeClass = screening?.screening_metrics?.slope_suitability ?? 'Optimal';
    const landClass = screening?.screening_metrics?.indicative_land_class ?? 'Flat / Industrial Plain';

    const evidenceSummary = `${selectedLocation.city} exhibits ${ghi >= 5.5 ? 'superior' : 'strong'} solar potential with ${ghi} kWh/m²/day daily irradiance and estimated specific yield of ${yieldKwh} kWh/kWp/yr. Ambient temperatures of ${temp}°C combined with ${wind} m/s wind provide +${coolingGain}% convective cooling, while ${cloud}% cloud cover minimizes seasonal loss. ${buildingsCount > 0 ? `${buildingsCount} building footprints mapped in OSM (${formatArea(usableRoofArea)} usable area) offer immediate rooftop array deployment.` : 'Terrain screening indicates flat slope favorable for ground or industrial rooftop arrays.'}`;

    return {
      ghi,
      dni,
      dhi,
      yieldKwh,
      prPct,
      temp,
      wind,
      cloud,
      coolingGain,
      thermalDerate,
      buildingsCount,
      usableRoofArea,
      estimatedArrayKwp,
      annualGenKwh,
      annualSavingsInr,
      estCapexInr,
      paybackYears,
      co2AvoidedKg,
      slopePct,
      slopeClass,
      landClass,
      evidenceSummary,
    };
  }, [selectedLocation]);

  // Fetch National India Solar Summary for real-time dynamic dashboard telemetry
  useEffect(() => {
    let cancelled = false;
    api.getIndiaSolarSummary()
      .then((data) => {
        if (!cancelled) setNationalSummary(data);
      })
      .catch((err) => console.error('Failed to load national solar summary:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch buildings for active project
  useEffect(() => {
    if (!activeProject) return;
    let cancelled = false;

    const fetchBuildings = async () => {
      try {
        setLoadingBuildings(true);
        const data = await api.getBuildings(activeProject.id, { limit: 100 });
        if (!cancelled) {
          setBuildings(data);
        }
      } catch (err) {
        console.error('Failed to load portfolio buildings:', err);
      } finally {
        if (!cancelled) setLoadingBuildings(false);
      }
    };

    fetchBuildings();
    return () => {
      cancelled = true;
    };
  }, [activeProject?.id]);

  // Recalculate metrics for entire portfolio
  const handleRecalculate = async () => {
    if (!activeProject) return;
    try {
      setRecalculating(true);
      setRecalculateMessage(null);
      const res = await api.recalculateProjectBuildings(activeProject.id);
      setRecalculateMessage(`Recalculated ${res.recalculated} buildings across portfolio.`);
      await refreshProjects();
      const updated = await api.getBuildings(activeProject.id, { limit: 100 });
      setBuildings(updated);
    } catch (err: any) {
      setRecalculateMessage(`Recalculation error: ${err.message || 'Failed'}`);
    } finally {
      setRecalculating(false);
    }
  };

  // Compute portfolio aggregated stats
  const stats = useMemo(() => {
    const totalBuildings = buildings.length;
    let totalUsableArea = 0;
    let totalCapacity = 0;
    let totalAnnualGen = 0;
    let totalAnnualSavings = 0;
    let totalAvoidedCo2 = 0;

    buildings.forEach((b) => {
      totalUsableArea += b.usable_roof_area || 0;
      if (b.solar_analysis) {
        totalCapacity += b.solar_analysis.max_pv_capacity_kwp || 0;
        totalAnnualGen += b.solar_analysis.annual_generation_kwh || 0;
        totalAnnualSavings += b.solar_analysis.annual_savings_inr || 0;
        totalAvoidedCo2 += b.solar_analysis.avoided_co2_kg_annual || 0;
      }
    });

    return {
      totalBuildings,
      totalUsableArea,
      totalCapacity,
      totalAnnualGen,
      totalAnnualSavings,
      totalAvoidedCo2,
    };
  }, [buildings]);

  // Filtered building list for preview table
  const filteredBuildings = useMemo(() => {
    return buildings.filter((b) => {
      const matchSearch =
        !searchQuery ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.category && b.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCategory = categoryFilter === 'all' || b.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [buildings, searchQuery, categoryFilter]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    buildings.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [buildings]);

  // Handle drill down from India map into site planning
  const handleDrillDownFromIndiaMap = (region: IndiaSolarRegion) => {
    handleSwitchMode('site_planner');
  };

  // Handle opening sample campus demo on-demand
  const handleOpenSampleCampusDemo = async () => {
    const demo = projects.find((p) => p.is_demo === 'true');
    if (!demo) {
      await loadDemoProject();
    } else {
      setActiveProject(demo);
    }
    handleSwitchMode('site_planner');
  };

  // Handle starting project from arbitrary clicked/searched coordinate
  const handleStartProjectAtCoordinate = (params: {
    city: string;
    lat: number;
    lng: number;
    mappedBuildings?: OsmBuildingItem[];
  }) => {
    setPendingProjectParams(params);
    setIsNewProjectModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* 1. Header Banner & Workspace Hero */}
      <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#FF6B16] bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-[#FF6B16]" />
                India Solar Intelligence
              </span>
              <span className="text-xs text-slate-400 font-medium">•</span>
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {workspaceMode === 'india_map'
                  ? 'All-India National Coverage (36 States & UTs)'
                  : `${activeProject?.city || 'Campus'}, ${activeProject?.organization_name || 'Commercial'}`}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              {workspaceMode === 'india_map'
                ? "Explore India's Solar Potential"
                : 'Site & Portfolio Solar Planner'}
            </h1>

            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              {workspaceMode === 'india_map'
                ? 'Analyze real locations using solar resource data, environmental conditions and intelligent energy planning tools.'
                : 'Design, optimize, and monitor commercial rooftop solar portfolios at any scale — from single campuses to 500+ building industrial parks.'}
            </p>
          </div>

          {/* Primary View Switcher & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {/* View Mode Toggle Pill */}
            <div className="flex p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80">
              <button
                onClick={() => handleSwitchMode('india_map')}
                className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  workspaceMode === 'india_map'
                    ? 'bg-[#FF6B16] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>India Solar Map</span>
              </button>

              <button
                onClick={() => handleSwitchMode('site_planner')}
                className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  workspaceMode === 'site_planner'
                    ? 'bg-[#FF6B16] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Site Planner</span>
              </button>
            </div>

            {/* Quick Actions depending on mode */}
            {workspaceMode === 'india_map' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenSampleCampusDemo}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200 text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Inspect 5-building sample campus reference portfolio"
                >
                  <School className="w-3.5 h-3.5 text-[#FF6B16]" />
                  <span>Explore Sample Portfolio (Optional Demo)</span>
                </button>

                <button
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#FF6B16] hover:bg-[#EA580C] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Project</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setIsBulkImportOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
                  <span>Import</span>
                </button>

                <button
                  onClick={() => navigate('/workspace/explore')}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-[#FF6B16]" />
                  <span>GIS Map</span>
                </button>

                <button
                  onClick={handleRecalculate}
                  disabled={recalculating}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  title="Recalculate solar climatology for all buildings"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${recalculating ? 'animate-spin' : ''}`} />
                  <span>{recalculating ? 'Syncing…' : 'Recalculate'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {recalculateMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{recalculateMessage}</span>
          </div>
        )}
      </div>

      {/* 2. MODE A: INDIA SOLAR INTELLIGENCE (Flagship Default) */}
      {workspaceMode === 'india_map' ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* TWO PRIMARY USER JOURNEYS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pathway A: Plan a New Solar Installation */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-orange-50/90 via-white to-amber-50/50 border border-orange-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-orange-500/10 text-[#FF6B16] border border-orange-500/20">
                    Pathway A • Planning &amp; Feasibility
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#FF6B16] flex items-center justify-center">
                    <Compass className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-black text-[#0B1739]">Plan a New Solar Installation</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Explore solar resources, analyze rooftop polygons, screen open land, forecast generation, and solve knapsack budget allocation for single buildings or multi-site portfolios.
                </p>
              </div>
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const searchInput = document.getElementById('workspace-location-search');
                    if (searchInput) {
                      searchInput.focus();
                      searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-[#FF6B16] hover:bg-[#EA580C] text-white font-bold text-xs shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Start Solar Planning</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-slate-400 font-medium">Search or select a city below</span>
              </div>
            </div>

            {/* Pathway B: Manage an Existing Solar System */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 border border-emerald-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                    Pathway B • Operations &amp; Diagnostics
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-black text-[#0B1739]">Manage an Existing Solar System</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ingest actual inverter telemetry, evaluate empirical Performance Ratio (PR), inspect panel thermal hotspots, and track preventive work orders.
                </p>
              </div>
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate('/workspace/monitor')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Manage Existing Solar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-slate-400 font-medium">Telemetry, thermography &amp; tickets</span>
              </div>
            </div>
          </div>

          {/* A. PROMINENT SEARCH BAR & NEUTRAL SUGGESTIONS */}
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#FF6B16]" />
                  <span>Analyze Any Location in India</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Search a city, address, landmark, or coordinates to retrieve real-time satellite climatology and rooftop footprints.
                </p>
              </div>
              <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>NASA POWER 20-Yr & OpenStreetMap Active</span>
              </div>
            </div>

            <form onSubmit={handleSearchLocation} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="workspace-location-search"
                  type="text"
                  value={searchLocationQuery}
                  onChange={(e) => setSearchLocationQuery(e.target.value)}
                  placeholder="Search a city, address, landmark or coordinates... (e.g. Jaipur, Connaught Place, 26.91, 75.78)"
                  className="w-full pl-11 pr-24 py-3 text-xs sm:text-sm rounded-2xl bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200/80 focus:border-[#FF6B16] text-[#0F172A] placeholder:text-slate-400 focus:outline-hidden transition-all shadow-2xs"
                />
                {searchLocationQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchLocationQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={searchingLocation}
                className="px-5 py-3 rounded-2xl bg-[#FF6B16] hover:bg-[#EA580C] text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {searchingLocation ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>{searchingLocation ? 'Searching…' : 'Inspect'}</span>
              </button>
            </form>

            {/* Neutral Suggestion Chips */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Suggestions:</span>
              {SUGGESTED_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => handleSelectSuggestion(loc.name, loc.lat, loc.lng)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedLocation?.city === loc.name
                      ? 'bg-orange-500/15 border-orange-500/40 text-[#FF6B16] font-bold shadow-xs'
                      : 'bg-slate-100/90 hover:bg-orange-50 hover:border-orange-300 hover:text-[#FF6B16] border-slate-200/80 text-slate-700'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-[#FF6B16]" />
                  <span>{loc.name}</span>
                  <span className="text-[10px] text-slate-400">({loc.state})</span>
                </button>
              ))}
            </div>
          </div>

          {/* B. SELECTED LOCATION INTELLIGENCE OR WELCOME GUIDANCE */}
          {selectedLocation ? (
            <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 shadow-md space-y-5 animate-in fade-in duration-200">
              {/* Location Title Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-orange-500/10 text-[#FF6B16] border border-orange-500/20">
                      Active Location
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {selectedLocation.lat.toFixed(4)}° N, {selectedLocation.lng.toFixed(4)}° E
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#FF6B16]" />
                    <span>{selectedLocation.city}</span>
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedLocation(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all cursor-pointer w-fit"
                >
                  Clear Selection
                </button>
              </div>

              {selectedLocation.loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-3 border-orange-500/30 border-t-[#FF6B16] animate-spin" />
                  <p className="text-xs font-bold text-slate-700">Connecting to NASA POWER Climatology & OpenStreetMap Overpass…</p>
                  <p className="text-[11px] text-slate-400">Retrieving solar radiation grids, meteorological telemetry, and building footprints</p>
                </div>
              ) : selectedLocation.error ? (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Could not retrieve complete satellite telemetry</span>
                  </div>
                  <p>{selectedLocation.error}</p>
                </div>
              ) : calculatedLocationMetrics ? (
                <>
                  {/* 4 PRIMARY RESULT CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Card 1: Solar Resource */}
                    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          1. Solar Resource
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-orange-500/10 text-[#FF6B16] flex items-center justify-center">
                          <SunMedium className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-extrabold text-[#0F172A]">
                        {calculatedLocationMetrics.ghi} <span className="text-xs font-semibold text-slate-500">kWh/m²/day</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600 space-y-0.5">
                        <div>DNI: {calculatedLocationMetrics.dni} • DHI: {calculatedLocationMetrics.dhi}</div>
                        <div className="font-semibold text-emerald-700">Specific Yield: ~{calculatedLocationMetrics.yieldKwh} kWh/kWp/yr</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-medium">
                        NASA POWER 20-Yr Baseline (PR {calculatedLocationMetrics.prPct}%)
                      </div>
                    </div>

                    {/* Card 2: Weather Impact */}
                    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          2. Weather Impact
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                          <Thermometer className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-extrabold text-[#0F172A]">
                        {calculatedLocationMetrics.temp}°C <span className="text-xs font-semibold text-slate-500">ambient</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600 space-y-0.5">
                        <div>Wind: {calculatedLocationMetrics.wind} m/s (+{calculatedLocationMetrics.coolingGain}% cooling)</div>
                        <div>Cloud Cover: {calculatedLocationMetrics.cloud}%</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-medium">
                        Open-Meteo & IMD Climatological Normal
                      </div>
                    </div>

                    {/* Card 3: Site Opportunity */}
                    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          3. Site Opportunity
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                          <Building2 className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-extrabold text-[#0F172A]">
                        {calculatedLocationMetrics.buildingsCount} <span className="text-xs font-semibold text-slate-500">mapped roofs</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600 space-y-0.5">
                        <div>Usable Roof: {calculatedLocationMetrics.usableRoofArea > 0 ? formatArea(calculatedLocationMetrics.usableRoofArea) : 'Survey needed'}</div>
                        <div>Terrain Slope: {calculatedLocationMetrics.slopePct}% ({calculatedLocationMetrics.slopeClass})</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-medium">
                        OpenStreetMap & SRTM Topography
                      </div>
                    </div>

                    {/* Card 4: Potential Generation */}
                    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          4. Potential Generation
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                          <Zap className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl font-extrabold text-emerald-600">
                        {formatNumber(calculatedLocationMetrics.annualGenKwh)} <span className="text-xs font-semibold text-slate-500">kWh/yr</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600 space-y-0.5">
                        <div className="font-bold text-slate-900">{formatINR(calculatedLocationMetrics.annualSavingsInr)} / yr savings</div>
                        <div>Est. Payback: ~{calculatedLocationMetrics.paybackYears} Years (at {calculatedLocationMetrics.estimatedArrayKwp} kWp)</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-medium">
                        CEA Factor • Avoids {formatCO2(calculatedLocationMetrics.co2AvoidedKg)} CO₂
                      </div>
                    </div>
                  </div>

                  {/* PLAIN-ENGLISH EVIDENCE SUMMARY */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50/80 via-white to-amber-50/70 border border-orange-200/80 flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF6B16] shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1">
                        Why this area may be suitable
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {calculatedLocationMetrics.evidenceSummary}
                      </p>
                    </div>
                  </div>

                  {/* MAIN CTA ACTION BAR */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        onClick={handleAnalyzeLocation}
                        disabled={isAnalyzingLocation}
                        className="px-6 py-3 rounded-2xl bg-[#FF6B16] hover:bg-[#EA580C] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isAnalyzingLocation ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4" />
                        )}
                        <span>{isAnalyzingLocation ? 'Ingesting Location to Workspace…' : 'Analyze This Location →'}</span>
                      </button>

                      <button
                        onClick={() => {
                          handleStartProjectAtCoordinate({
                            city: selectedLocation.city,
                            lat: selectedLocation.lat,
                            lng: selectedLocation.lng,
                            mappedBuildings: selectedLocation.osm?.buildings
                          });
                        }}
                        className="px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                        <span>Custom Project Settings</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 font-medium">
                      One-click: Ingests {calculatedLocationMetrics.buildingsCount} mapped roofs into your active portfolio
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="p-5 rounded-3xl bg-slate-50/90 border border-slate-200/80 flex items-center gap-3 text-xs text-slate-600">
              <div className="p-2.5 rounded-2xl bg-white text-[#FF6B16] border border-slate-200/80 shrink-0 shadow-2xs">
                <SunMedium className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-extrabold text-slate-800 text-sm">
                  Ready to analyze solar feasibility
                </div>
                <p className="text-slate-500 text-xs mt-0.5">
                  Select any location on the map, choose a city above, or enter coordinates to inspect real-time solar irradiance, weather conditions, rooftop density, and generation potential.
                </p>
              </div>
            </div>
          )}

          {/* C. FLAGSHIP COMPONENT: The Interactive India Solar Map */}
          <div>
            <IndiaSolarMap
              selectedCoordinate={selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : null}
              onSelectCoordinate={handleMapCoordinateClick}
              onSelectRegion={handleMapRegionClick}
              onDrillDownToSite={handleDrillDownFromIndiaMap}
              onOpenSampleCampus={handleOpenSampleCampusDemo}
              onStartProjectAtCoordinate={handleStartProjectAtCoordinate}
            />
          </div>

          {/* D. 4 National Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  National Solar Resource
                </span>
                <div className="w-7 h-7 rounded-xl bg-orange-500/10 text-[#FF6B16] flex items-center justify-center">
                  <SunMedium className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A]">
                {nationalSummary ? nationalSummary.national_avg_daily_ghi_kwh : '5.01'} <span className="text-sm font-semibold text-slate-500">kWh/m²/day</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="text-emerald-600 font-bold">NASA POWER Baseline</span>
                <span>(20-yr mean)</span>
              </div>
            </div>

            <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total National Solar Potential
                </span>
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Sun className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A]">
                {nationalSummary?.national_solar_radiation_potential_gw ? nationalSummary.national_solar_radiation_potential_gw.toFixed(2) : '748.98'} <span className="text-sm font-semibold text-slate-500">GWp</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="text-amber-600 font-bold">MNRE / NISE 2014</span>
                <span>(3% wasteland assessment)</span>
              </div>
            </div>

            <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Commercial Rooftop Potential
                </span>
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                Not yet estimated
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="text-emerald-700 font-bold">Site Survey Required</span>
                <span>(MNRE baseline pending)</span>
              </div>
            </div>

            <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Analyzed Indian Regions
                </span>
                <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A]">
                {nationalSummary ? nationalSummary.total_analyzed_regions : 36} <span className="text-sm font-semibold text-slate-500">States & UTs</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="text-emerald-600 font-bold">100% Geospatial Coverage</span>
              </div>
            </div>
          </div>

          {/* E. Featured High-Opportunity Solar Corridors Grid */}
          <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF6B16]" />
                  Featured High-Opportunity Solar Corridors
                </h3>
                <p className="text-xs text-slate-500">
                  Prime strategic zones with verified irradiance, favorable terrain, and high return on capital
                </p>
              </div>

              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Click corridor to inspect real profile
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div
                onClick={() => handleSelectSuggestion('Jaipur', 26.9124, 75.7873)}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50/60 border border-slate-200/80 hover:border-orange-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-sm text-[#0F172A]">Rajasthan</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-[#FF6B16]">
                    Tier A+
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-700">Thar Desert Corridor</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  5.86 kWh/m²/d • Yield: 1,680 kWh/kWp
                </div>
              </div>

              <div
                onClick={() => handleSelectSuggestion('Ahmedabad', 23.0225, 72.5714)}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50/60 border border-slate-200/80 hover:border-orange-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-sm text-[#0F172A]">Gujarat</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-[#FF6B16]">
                    Tier A+
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-700">Kutch & C&I Hub</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  5.72 kWh/m²/d • High Industrial Tariff
                </div>
              </div>

              <div
                onClick={() => handleSelectSuggestion('Leh', 34.1526, 77.5771)}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50/60 border border-slate-200/80 hover:border-orange-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-sm text-[#0F172A]">Ladakh</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-[#FF6B16]">
                    Tier A+
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-700">Cold High-Altitude Desert</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  5.85 kWh/m²/d • +8.5% Cold PV Boost
                </div>
              </div>

              <div
                onClick={() => handleSelectSuggestion('Bengaluru', 12.9716, 77.5946)}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50/60 border border-slate-200/80 hover:border-orange-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-sm text-[#0F172A]">Karnataka</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Tier A
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-700">Pavagada & Tech SEZ</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  5.38 kWh/m²/d • Prime Rooftop Hub
                </div>
              </div>

              <div
                onClick={() => handleSelectSuggestion('Mumbai', 19.0760, 72.8777)}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50/60 border border-slate-200/80 hover:border-orange-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-extrabold text-sm text-[#0F172A]">Maharashtra</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    Tier A
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-700">National C&I Epicenter</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  5.25 kWh/m²/d • Major Industrial Power Corridor
                </div>
              </div>
            </div>
          </div>



          {/* Educational Multi-Scale Roadmap & Sample Demo Banner */}
          <div className="bg-gradient-to-r from-orange-50/90 via-amber-50/80 to-blue-50/80 border border-orange-200/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-[#FF6B16]" />
                <h4 className="font-extrabold text-base text-[#0F172A]">
                  Multi-Scale Solar Engineering Architecture
                </h4>
              </div>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                RoofShift AI bridges nationwide macro-scale solar prospecting down to micro-scale building rooftops.
                Want to test building-level 3D shading polygons, 0/1 Knapsack Capex budget allocation, or inverter degradation?
                Explore our sample institutional campus portfolio (BITS Pilani, 5 buildings).
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] font-bold text-slate-500">
                <span>🇮🇳 National Map</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span>🏛️ State / Corridor</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span>🏙️ City / District</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span>📐 Campus Site</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[#FF6B16]">🏢 Rooftop & Knapsack DP</span>
              </div>
            </div>

            <button
              onClick={handleOpenSampleCampusDemo}
              className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
            >
              <span>Explore Sample Campus Demo</span>
              <ArrowRight className="w-4 h-4 text-[#FF6B16]" />
            </button>
          </div>
        </div>
      ) : (
        /* 3. MODE B: SITE & PORTFOLIO PLANNER (Detailed Building Analysis) */
        <div className="space-y-6 animate-in fade-in duration-300">
          {!activeProject ? (
            <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-8 sm:p-12 text-center shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-[#FF6B16] flex items-center justify-center mx-auto mb-2">
                <Building className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-[#0F172A]">No Active Site Project Selected</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                RoofShift AI operates in nationwide intelligence mode by default. Inspect any location on the India Solar Map, start a new project with real satellite data, or load the Sample Campus Demo.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => handleSwitchMode('india_map')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#FF6B16] text-white text-xs font-bold shadow-md hover:bg-[#EA580C] transition-all cursor-pointer"
                >
                  <Globe className="w-4 h-4" />
                  <span>Open India Solar Map</span>
                </button>
                <button
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-slate-200 text-[#0F172A] text-xs font-bold hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#FF6B16]" />
                  <span>Create New Project</span>
                </button>
                <button
                  onClick={handleOpenSampleCampusDemo}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-xs transition-all cursor-pointer"
                >
                  <School className="w-4 h-4 text-[#FF6B16]" />
                  <span>Load Sample Campus Demo</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Back to National Map Banner */}
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-blue-900 font-medium">
              <Globe className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Viewing Site-Level Engineering Portfolio (
                <strong>{activeProject?.name || 'Institutional Campus'}</strong>). Looking for national regional solar opportunity?
              </span>
            </div>

            <button
              onClick={() => handleSwitchMode('india_map')}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs shrink-0 cursor-pointer shadow-2xs transition-all"
            >
              Return to India Solar Map
            </button>
          </div>

          {/* Key Portfolio Metrics Row (5 Compact White Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Buildings
                </span>
                <div className="w-7 h-7 rounded-xl bg-orange-500/10 text-[#FF6B16] flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A]">
                {stats.totalBuildings}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="text-emerald-600 font-bold">100% Analyzed</span>
                <span>in current portfolio</span>
              </div>
            </div>

            <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Usable Roof Area
                </span>
                <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A]">
                {formatArea(stats.totalUsableArea)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span>Obstacle-free rooftop surface</span>
              </div>
            </div>

            <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Solar Capacity
                </span>
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <SunMedium className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A]">
                {formatNumber(stats.totalCapacity, 1)} <span className="text-sm font-bold text-slate-500">kWp</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span>Peak PV generation capacity</span>
              </div>
            </div>

            <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Annual Generation
                </span>
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A]">
                {stats.totalAnnualGen > 1000000
                  ? `${(stats.totalAnnualGen / 1000000).toFixed(2)} GWh`
                  : `${formatNumber(stats.totalAnnualGen / 1000, 1)} MWh`}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span>NASA POWER multi-year solar yield</span>
              </div>
            </div>

            <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Est. Annual Savings
                </span>
                <div className="w-7 h-7 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-emerald-600">
                {formatINR(stats.totalAnnualSavings)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                <span>Avoids {formatNumber(stats.totalAvoidedCo2 / 1000, 1)} tons CO₂/yr</span>
              </div>
            </div>
          </div>

          {/* 4 Workflow Section Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Explore & Analyze */}
            <div
              onClick={() => navigate('/workspace/explore')}
              className="group relative bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl hover:border-orange-300 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#FF6B16] border border-orange-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Compass className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    Section 1
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] group-hover:text-[#FF6B16] transition-colors">
                  Explore & Analyze
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  GIS satellite mapping, obstacle-free polygon calculation, solar irradiance modeling, and infrared drone thermal hotspot detection.
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    GIS Polygon Mapping
                  </span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    NASA Climatology
                  </span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    Thermal Hotspots
                  </span>
                  <span className="text-[10px] font-semibold bg-orange-50 text-[#FF6B16] px-2.5 py-1 rounded-lg font-bold">
                    500+ Roof Scale
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {stats.totalBuildings} Rooftops Mapped
                </span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF6B16] group-hover:translate-x-1 transition-transform">
                  <span>Explore Rooftops</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Card 2: Plan & Optimize */}
            <div
              onClick={() => navigate('/workspace/plan')}
              className="group relative bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <SlidersHorizontal className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    Section 2
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] group-hover:text-blue-600 transition-colors">
                  Plan & Optimize
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  Knapsack DP algorithm for Capex budget allocation, hourly load profile analysis, surplus generation detection, and smart battery dispatch.
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    Knapsack 0/1 DP
                  </span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    Surplus-to-Load
                  </span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    Budget Optimizer
                  </span>
                  <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg font-bold">
                    Hourly Profiles
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {formatNumber(stats.totalCapacity, 1)} kWp Peak Potential
                </span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                  <span>Optimize Budget</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Card 3: Monitor & Maintain */}
            <div
              onClick={() => navigate('/workspace/monitor')}
              className="group relative bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Activity className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    Section 3
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] group-hover:text-emerald-600 transition-colors">
                  Monitor & Maintain
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  Real-time telemetry, inverter degradation tracking, thermal hotspot alerts, and preventive maintenance work orders.
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    Inverter Telemetry
                  </span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    Degradation Curves
                  </span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    Work Orders
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Preventive Maintenance Fleet
                </span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                  <span>Monitor Health</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Card 4: Insights & Reports */}
            <div
              onClick={() => navigate('/workspace/insights')}
              className="group relative bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl hover:border-violet-300 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 border border-violet-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                    Section 4
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] group-hover:text-violet-600 transition-colors">
                  Insights & Reports
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  Audit-ready PDF generation, S3 export, financial payback summaries, and ESG carbon offset attestations.
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    Audit-Ready PDF
                  </span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    ESG Carbon Offsets
                  </span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    Executive Dossiers
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {formatINR(stats.totalAnnualSavings)} / yr
                </span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 group-hover:translate-x-1 transition-transform">
                  <span>Generate Report</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* 5. Building Inventory Table */}
          <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  Portfolio Buildings ({filteredBuildings.length} of {buildings.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Individual building solar models, obstacle buffers, and Capex specifications
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search buildings…"
                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] placeholder:text-slate-400 focus:outline-hidden focus:border-[#FF6B16]"
                  />
                </div>

                {categories.length > 0 && (
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-hidden"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => setIsBulkImportOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                  <span>Import More</span>
                </button>
              </div>
            </div>

            {loadingBuildings ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                Loading buildings…
              </div>
            ) : filteredBuildings.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                No buildings match the current search filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pl-2">Building</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3 text-right">Roof Area</th>
                      <th className="pb-3 text-right">PV Capacity</th>
                      <th className="pb-3 text-right">Annual Yield</th>
                      <th className="pb-3 text-right">Annual Savings</th>
                      <th className="pb-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBuildings.slice(0, 50).map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 pl-2 font-bold text-[#0F172A] flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{b.name}</span>
                        </td>
                        <td className="py-3 text-slate-500">{b.category || 'Standard'}</td>
                        <td className="py-3 text-right font-medium text-slate-700">
                          {formatArea(b.usable_roof_area || 0)}
                        </td>
                        <td className="py-3 text-right font-bold text-slate-900">
                          {formatNumber(b.solar_analysis?.max_pv_capacity_kwp || 0, 1)} kWp
                        </td>
                        <td className="py-3 text-right text-slate-600">
                          {formatNumber((b.solar_analysis?.annual_generation_kwh || 0) / 1000, 1)} MWh
                        </td>
                        <td className="py-3 text-right font-semibold text-emerald-600">
                          {formatINR(b.solar_analysis?.annual_savings_inr || 0)}
                        </td>
                        <td className="py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" />
                            Analyzed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
            </>
          )}
        </div>
      )}

      {/* Global Modals */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImportSuccess={async () => {
          await refreshProjects();
          if (activeProject) {
            const updated = await api.getBuildings(activeProject.id, { limit: 100 });
            setBuildings(updated);
          }
        }}
      />

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => {
          setIsNewProjectModalOpen(false);
          setPendingProjectParams(null);
        }}
        initialCity={pendingProjectParams?.city}
        initialLat={pendingProjectParams?.lat}
        initialLon={pendingProjectParams?.lng}
        mappedOsmBuildings={pendingProjectParams?.mappedBuildings}
      />
    </div>
  );
};
