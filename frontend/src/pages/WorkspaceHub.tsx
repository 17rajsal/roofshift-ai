import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Leaf
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { Building as BuildingModel } from '../types/models';
import { formatINR, formatNumber, formatArea } from '../utils/formatters';
import { BulkImportModal } from '../components/buildings/BulkImportModal';
import { NewProjectModal } from '../components/layout/NewProjectModal';

export const WorkspaceHub: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject, projects, setActiveProject, refreshProjects } = useProject();

  const [buildings, setBuildings] = useState<BuildingModel[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalculateMessage, setRecalculateMessage] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* 1. Header Banner & Workspace Hero */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#FF6B16] bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full">
                SaaS Solar Platform v8.0
              </span>
              <span className="text-xs text-slate-400 font-medium">•</span>
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {activeProject?.city || 'Campus'}, {activeProject?.organization_name || 'Commercial'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Solar Intelligence Workspace
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Design, optimize, and monitor commercial rooftop solar portfolios at any scale — from single campuses to 500+ building industrial parks.
            </p>
          </div>

          {/* 4 Quick Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#FF6B16] hover:bg-[#EA580C] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>

            <button
              onClick={() => navigate('/workspace/explore')}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#FF6B16]" />
              <span>Explore Location</span>
            </button>

            <button
              onClick={() => setIsBulkImportOpen(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-blue-500" />
              <span>Import Buildings</span>
            </button>

            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Batch recalculate solar climatology for all buildings"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-600 ${recalculating ? 'animate-spin' : ''}`} />
              <span>{recalculating ? 'Recalculating…' : 'Recalculate'}</span>
            </button>
          </div>
        </div>

        {recalculateMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{recalculateMessage}</span>
          </div>
        )}
      </div>

      {/* 2. Key Metrics Row (5 Compact White Glassmorphism Cards) */}
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

      {/* 3. Four Large Workflow Section Cards */}
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
                Battery Dispatch
              </span>
              <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg font-bold">
                Max NPV Allocation
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Budget: {formatINR(activeProject?.budget || 0)}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
              <span>Optimize Portfolio</span>
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
              Real-time generation telemetry, string inverter monitoring, fault classification, panel soiling/degradation tracking, and maintenance tickets.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                String Inverters
              </span>
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                Fault Diagnostics
              </span>
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                Thermal Degradation
              </span>
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg font-bold">
                Real-Time Telemetry
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              System Health: 98.4%
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
              <span>View Monitoring</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Card 4: Insights & Reports */}
        <div
          onClick={() => navigate('/workspace/insights')}
          className="group relative bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                Section 4
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] group-hover:text-purple-600 transition-colors">
              Insights & Reports
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Financial payback analysis, greenhouse gas carbon reduction, multi-scenario budget comparisons, and multi-page professional PDF generation.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                Executive PDF
              </span>
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                Carbon Offset
              </span>
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                12 Capabilities
              </span>
              <span className="text-[10px] font-semibold bg-purple-50 text-purple-600 px-2.5 py-1 rounded-lg font-bold">
                Bankable Feasibility
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Payback: ~3.8 Years
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform">
              <span>Generate Reports</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Building Portfolio Preview Table (Supports Large Portfolios) */}
      <div className="bg-white/85 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <span>Campus Building Portfolio</span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {buildings.length} total
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rooftop geometry, usable surface area, and computed solar yields
            </p>
          </div>

          {/* Table Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search rooftops…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B16]/20 w-44"
              />
            </div>

            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setIsBulkImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#FF6B16] bg-orange-50 hover:bg-orange-100 rounded-xl border border-orange-200 transition-colors cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Bulk Import</span>
            </button>
          </div>
        </div>

        {/* Table / List */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Building Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Gross Area</th>
                <th className="py-3 px-3 text-right">Usable Area</th>
                <th className="py-3 px-3 text-right">PV Capacity</th>
                <th className="py-3 px-3 text-right">Annual Yield</th>
                <th className="py-3 px-3 text-right">Annual Savings</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingBuildings ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading portfolio buildings…
                  </td>
                </tr>
              ) : filteredBuildings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No buildings found. Click "Import Buildings" or "Create Project" to add rooftops.
                  </td>
                </tr>
              ) : (
                filteredBuildings.slice(0, 15).map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => navigate('/workspace/explore')}
                    className="hover:bg-orange-50/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-semibold text-[#0F172A] flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-orange-500/10 text-[#FF6B16] flex items-center justify-center shrink-0">
                        <Building className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate max-w-[200px]">{b.name}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 capitalize">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                        {b.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600 font-mono">
                      {formatArea(b.gross_roof_area)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-900 font-semibold font-mono">
                      {formatArea(b.usable_roof_area)}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-600 font-bold font-mono">
                      {b.solar_analysis?.max_pv_capacity_kwp
                        ? `${formatNumber(b.solar_analysis.max_pv_capacity_kwp, 1)} kWp`
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-medium font-mono">
                      {b.solar_analysis?.annual_generation_kwh
                        ? `${formatNumber(b.solar_analysis.annual_generation_kwh, 0)} kWh`
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600 font-bold font-mono">
                      {b.solar_analysis?.annual_savings_inr
                        ? formatINR(b.solar_analysis.annual_savings_inr)
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Ready
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredBuildings.length > 15 && (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 px-2">
            <span>Showing top 15 of {filteredBuildings.length} rooftops</span>
            <button
              onClick={() => navigate('/workspace/explore')}
              className="text-[#FF6B16] hover:text-[#EA580C] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>View all {filteredBuildings.length} in Rooftop Explorer</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Bulk Building Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImportSuccess={async () => {
          if (activeProject) {
            const data = await api.getBuildings(activeProject.id, { limit: 100 });
            setBuildings(data);
          }
        }}
      />

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
      />
    </div>
  );
};
export default WorkspaceHub;
