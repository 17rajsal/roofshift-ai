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
import { Building as BuildingModel, IndiaSolarRegion, IndiaNationalSolarSummary } from '../types/models';
import { formatINR, formatNumber, formatArea } from '../utils/formatters';
import { BulkImportModal } from '../components/buildings/BulkImportModal';
import { NewProjectModal } from '../components/layout/NewProjectModal';
import { IndiaSolarMap } from '../components/map/IndiaSolarMap';

export const WorkspaceHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProject, projects, setActiveProject, refreshProjects } = useProject();

  // Mode: 'india_map' (default flagship) vs 'site_planner' (portfolio/building level)
  const modeParam = searchParams.get('mode');
  const [workspaceMode, setWorkspaceMode] = useState<'india_map' | 'site_planner'>(
    modeParam === 'site' ? 'site_planner' : 'india_map'
  );

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

  // Handle opening sample campus demo
  const handleOpenSampleCampusDemo = () => {
    handleSwitchMode('site_planner');
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
                India Solar Intelligence v8.2
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
                ? 'India Solar Intelligence Workspace'
                : 'Site & Portfolio Solar Planner'}
            </h1>

            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              {workspaceMode === 'india_map'
                ? 'AI-powered nationwide solar opportunity mapping, environmental intelligence, and investment suitability across all 36 Indian States and Union Territories.'
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
                  title="Inspect 5-building BITS Pilani sample portfolio"
                >
                  <School className="w-3.5 h-3.5 text-[#FF6B16]" />
                  <span>Sample Campus Demo</span>
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
          {/* 4 National Summary Metric Cards */}
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
                  C&I Rooftop Potential
                </span>
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A]">
                {nationalSummary ? Math.round(nationalSummary.total_national_rooftop_potential_gw) : 748} <span className="text-sm font-semibold text-slate-500">GWp</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span>Commercial & industrial roofs</span>
              </div>
            </div>

            <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Utility Open-Land Potential
                </span>
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Mountain className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#0F172A]">
                {nationalSummary ? Math.round(nationalSummary.total_national_openland_potential_gw) : 1240} <span className="text-sm font-semibold text-slate-500">GWp</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span>Arid & barren land suitable zones</span>
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

          {/* FLAGSHIP COMPONENT: The Interactive India Solar Map */}
          <div>
            <IndiaSolarMap
              onDrillDownToSite={handleDrillDownFromIndiaMap}
              onOpenSampleCampus={handleOpenSampleCampusDemo}
            />
          </div>

          {/* Featured High-Opportunity Solar Corridors Grid */}
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
                Click map marker to inspect full profile
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div
                onClick={() => setSearchQuery('Rajasthan')}
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
                onClick={() => setSearchQuery('Gujarat')}
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
                onClick={() => setSearchQuery('Ladakh')}
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
                onClick={() => setSearchQuery('Karnataka')}
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
                onClick={() => setSearchQuery('Maharashtra')}
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
                  5.25 kWh/m²/d • 58 GWp Rooftop Potential
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
        onClose={() => setIsNewProjectModalOpen(false)}
      />
    </div>
  );
};
