import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SolarMap } from '../components/map/SolarMap';
import { BuildingEditorModal } from '../components/buildings/BuildingEditorModal';
import { ThermalInspectionViewerModal } from '../components/map/ThermalInspectionViewerModal';
import { ThermalUploadModal } from '../components/map/ThermalUploadModal';
import { Building } from '../types/models';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import {
  formatArea,
  formatEnergy,
  formatINR,
  formatPower,
  formatPct,
  formatCO2,
} from '../utils/formatters';
import {
  computeBuildingSolarMetrics,
  MetricVisualizationMode,
} from '../utils/solarSuitability';
import {
  ThermalMode,
  ThermalDataProvenance,
  PanelGroupThermalData,
  ThermalDataset,
  SAMPLE_DELHI_CAMPUS_THERMAL_DATASET,
  computeThermalFleetSummary,
  computeTemperatureHistogram,
  getDiagnosticStatusBadge,
  ELECTRICAL_SAFETY_NOTICE,
} from '../utils/thermalIntelligence';
import {
  MapPin,
  Building2,
  Plus,
  ArrowRight,
  Sun,
  Zap,
  TrendingUp,
  AlertTriangle,
  Info,
  ChevronRight,
  Trash2,
  Copy,
  Layers,
  Flame,
  Sparkles,
  SlidersHorizontal,
  FileText,
  CheckCircle2,
  BarChart3,
  Leaf,
  ShieldCheck,
  Camera,
  Upload,
  Clock,
  History,
  Wrench,
} from 'lucide-react';

export const SolarMapPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject, refreshProjects } = useProject();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorTargetBuilding, setEditorTargetBuilding] = useState<Building | null>(null);
  const [newBuildingCoords, setNewBuildingCoords] = useState<[number, number]>([28.6139, 77.209]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRoofOutline, setNewRoofOutline] = useState<[number, number][] | undefined>();
  const [newRoofArea, setNewRoofArea] = useState<number | undefined>();

  // Thermal Intelligence State
  const [thermalMode, setThermalMode] = useState<ThermalMode>('thermal');
  const [thermalDataset, setThermalDataset] = useState<ThermalDataset>(SAMPLE_DELHI_CAMPUS_THERMAL_DATASET);
  const [selectedPanelGroup, setSelectedPanelGroup] = useState<PanelGroupThermalData | null>(null);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [maintenanceSuccessMsg, setMaintenanceSuccessMsg] = useState<string | null>(null);

  // Filter and display states
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [metricMode, setMetricMode] = useState<MetricVisualizationMode>('suitability');
  const [tileLayerMode, setTileLayerMode] = useState<'satellite' | 'street' | 'light'>('satellite');
  const [showHeatLayer, setShowHeatLayer] = useState<boolean>(true);
  const [showPolygons, setShowPolygons] = useState<boolean>(true);
  const [showBadges, setShowBadges] = useState<boolean>(true);

  const fetchBuildings = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      setError(null);
      const list = await api.getBuildings(activeProject.id);
      setBuildings(list);
      setSelectedBuilding((current) => list.find((b) => b.id === current?.id) || list[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load buildings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, [activeProject?.id]);

  const handleMapClick = (lat: number, lng: number) => {
    setNewBuildingCoords([lat, lng]);
    setNewRoofOutline(undefined);
    setNewRoofArea(undefined);
    setEditorTargetBuilding(null);
    setIsEditorOpen(true);
  };

  const handleAddBuildingClick = () => {
    setNewRoofOutline(undefined);
    setNewRoofArea(undefined);
    if (activeProject) {
      setNewBuildingCoords([activeProject.latitude, activeProject.longitude]);
    }
    setEditorTargetBuilding(null);
    setIsEditorOpen(true);
  };

  const handleEditBuilding = (b: Building) => {
    setEditorTargetBuilding(b);
    setIsEditorOpen(true);
  };

  const handleDeleteBuilding = async (b: Building) => {
    if (!window.confirm(`Are you sure you want to remove ${b.name}?`)) return;
    try {
      await api.deleteBuilding(b.id);
      if (selectedBuilding?.id === b.id) setSelectedBuilding(null);
      await fetchBuildings();
      await refreshProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the building.');
    }
  };

  const handleDuplicateBuilding = async (b: Building) => {
    try {
      await api.duplicateBuilding(b.id);
      await fetchBuildings();
      await refreshProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not duplicate the building.');
    }
  };

  const handleSavedBuilding = (saved: Building) => {
    setSelectedBuilding(saved);
    fetchBuildings();
    void refreshProjects();
  };

  // Pre-calculated metrics for all buildings
  const analyzedBuildings = useMemo(() => {
    return buildings.map((b) => {
      const metrics = computeBuildingSolarMetrics(
        b,
        activeProject?.tariff_rate || 8.5,
        activeProject?.co2_factor || 0.716
      );
      return { building: b, metrics };
    });
  }, [buildings, activeProject]);

  // Aggregate Portfolio Statistics for Metric Summary Cards
  const portfolioStats = useMemo(() => {
    if (analyzedBuildings.length === 0) {
      return {
        totalBuildings: 0,
        avgScore: 0,
        highPotentialCount: 0,
        totalUsableArea: 0,
        totalEstimatedGenKwh: 0,
        totalEstimatedSavings: 0,
      };
    }

    const totalBuildings = analyzedBuildings.length;
    const avgScore =
      Math.round(
        (analyzedBuildings.reduce((sum, item) => sum + item.metrics.score, 0) / totalBuildings) * 10
      ) / 10;
    const highPotentialCount = analyzedBuildings.filter((item) => item.metrics.score >= 75).length;
    const totalUsableArea = analyzedBuildings.reduce(
      (sum, item) => sum + (item.building.usable_roof_area || 0),
      0
    );
    const totalEstimatedGenKwh = analyzedBuildings.reduce(
      (sum, item) => sum + item.metrics.estimatedAnnualGenKwh,
      0
    );
    const totalEstimatedSavings = analyzedBuildings.reduce(
      (sum, item) => sum + item.metrics.estimatedAnnualSavingsInr,
      0
    );

    return {
      totalBuildings,
      avgScore,
      highPotentialCount,
      totalUsableArea,
      totalEstimatedGenKwh,
      totalEstimatedSavings,
    };
  }, [analyzedBuildings]);

  // Thermal Fleet Summary & Temperature Histogram
  const thermalFleetSummary = useMemo(() => {
    return computeThermalFleetSummary(thermalDataset);
  }, [thermalDataset]);

  const temperatureHistogram = useMemo(() => {
    return computeTemperatureHistogram(thermalDataset.panelGroups);
  }, [thermalDataset]);

  // Selected building computed metrics
  const selectedMetrics = useMemo(() => {
    if (!selectedBuilding) return null;
    return computeBuildingSolarMetrics(
      selectedBuilding,
      activeProject?.tariff_rate || 8.5,
      activeProject?.co2_factor || 0.716
    );
  }, [selectedBuilding, activeProject]);

  // Available unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    buildings.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [buildings]);

  // Handler for creating maintenance case from thermal hotspot
  const handleCreateThermalMaintenance = async (group: PanelGroupThermalData) => {
    if (!activeProject) return;
    try {
      const res = await api.createThermalMaintenanceTicket(activeProject.id, {
        panel_id: group.stringIdentifier,
        surface_temp_c: group.surfaceTempC || 42.0,
        delta_temp_c: group.deltaTempC,
        suspected_cause: group.suspectedCause,
        priority: group.priority,
        notes: `Created from Solar Thermal Intelligence workspace for ${group.name}`,
      });
      setMaintenanceSuccessMsg(
        `Created Maintenance Work Order #${res.maintenance_case_id.slice(0, 8)} (${res.title})`
      );
      setTimeout(() => setMaintenanceSuccessMsg(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not create maintenance ticket.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {error && (
        <div role="alert" className="rounded-2xl border border-red-200/80 bg-red-50/80 backdrop-blur-md p-4 text-xs text-red-900 flex items-center gap-2.5 shadow-md">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {maintenanceSuccessMsg && (
        <div className="rounded-2xl border border-emerald-300/80 bg-emerald-50/80 backdrop-blur-md p-4 text-xs text-emerald-950 flex items-center gap-2.5 shadow-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{maintenanceSuccessMsg}</span>
        </div>
      )}

      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-orange-500/15 text-[#FF6B16] border border-orange-500/20">
              <Flame className="w-5 h-5 text-[#FF6B16]" />
            </span>
            <h2 className="text-lg font-bold text-[#0B1739]">
              Solar Thermal Intelligence &amp; Hotspot Analysis
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20">
              {thermalDataset.provenance === 'SAMPLE' ? 'Sample Demo Mode' : thermalDataset.provenance}
            </span>
          </div>
          <p className="text-xs text-[#61708A] mt-1.5 leading-relaxed">
            Explore rooftop solar installations, visualize surface thermal conditions, detect potential hotspots, and prioritize maintenance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="glass-button-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-[#61708A]" />
            <span>Upload Readings</span>
          </button>

          <button
            onClick={() => setIsViewerModalOpen(true)}
            className="glass-button-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Camera className="w-3.5 h-3.5 text-[#FF6B16]" />
            <span>Thermal Viewer</span>
          </button>

          <button
            onClick={() => navigate('/optimize')}
            className="glass-button-primary px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <span>Run Optimizer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Top 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
          <div className="flex items-center justify-between text-[#61708A] text-[11px] font-semibold">
            <span>Monitored Roofs</span>
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#0B1739] mt-2 tabular-nums">
            {thermalFleetSummary.buildingsMonitored}{' '}
            <span className="text-xs font-normal text-[#61708A]">Facilities</span>
          </div>
          <div className="text-[10px] text-[#61708A] mt-0.5 truncate font-medium">
            {activeProject?.name || 'Active Campus'}
          </div>
        </div>

        <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
          <div className="flex items-center justify-between text-[#61708A] text-[11px] font-semibold">
            <span>Strings Monitored</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#0B1739] mt-2 tabular-nums flex items-baseline gap-1">
            <span>{thermalFleetSummary.panelGroupsCount}</span>
            <span className="text-xs font-normal text-[#61708A]">
              ({thermalFleetSummary.totalPanelsCount} mods)
            </span>
          </div>
          <div className="text-[10px] text-[#61708A] mt-0.5 font-medium">18 Modules / String</div>
        </div>

        <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
          <div className="flex items-center justify-between text-[#61708A] text-[11px] font-semibold">
            <span>Fleet Mean Temp</span>
            <div className="w-6 h-6 rounded-lg bg-orange-500/10 text-[#FF6B16] flex items-center justify-center">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#0B1739] mt-2 tabular-nums flex items-baseline gap-1">
            <span>{thermalFleetSummary.fleetAvgTempC.toFixed(1)}°C</span>
            <span className="text-xs font-normal text-[#61708A]">
              (Max {thermalFleetSummary.fleetMaxTempC.toFixed(1)}°)
            </span>
          </div>
          <div className="text-[10px] text-[#61708A] mt-0.5 font-medium">Baseline: 42.0°C NOCT</div>
        </div>

        <div className="glass-panel glass-panel-hover p-4 rounded-2xl border-rose-300/40">
          <div className="flex items-center justify-between text-[#61708A] text-[11px] font-semibold">
            <span>Thermal Hotspots</span>
            <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-rose-600 mt-2 tabular-nums">
            {thermalFleetSummary.anomaliesCount}{' '}
            <span className="text-xs font-normal text-[#61708A]">
              ({thermalFleetSummary.criticalCount} Critical)
            </span>
          </div>
          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
            ΔT &ge; 5°C above baseline
          </div>
        </div>

        <div className="glass-panel glass-panel-hover p-4 rounded-2xl col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[#61708A] text-[11px] font-semibold">
            <span>Thermal Power Loss</span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#0B1739] mt-2 tabular-nums">
            {thermalFleetSummary.fleetPowerLossPct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#61708A] mt-0.5 font-medium">
            -0.4%/°C Derating
          </div>
        </div>
      </div>

      {/* 3. Filter Controls Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-[#0B1739] text-xs font-bold mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF6B16]" />
            <span>Filters:</span>
          </div>

          {/* Facility Selector */}
          <select
            value={selectedBuilding?.id || 'all'}
            onChange={(e) => {
              if (e.target.value === 'all') {
                setSelectedBuilding(null);
                setSelectedPanelGroup(null);
              } else {
                const b = buildings.find((x) => x.id === e.target.value);
                if (b) {
                  setSelectedBuilding(b);
                  setSelectedPanelGroup(null);
                }
              }
            }}
            className="glass-input px-3 py-1.5 rounded-xl text-[#0B1739] text-xs font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">All Campus Facilities ({buildings.length})</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.category})
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="glass-input px-3 py-1.5 rounded-xl text-[#0B1739] text-xs font-medium focus:outline-none cursor-pointer"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat} ({buildings.filter((b) => b.category === cat).length})
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setCategoryFilter('All');
              setTierFilter('All');
              setSelectedBuilding(null);
              setSelectedPanelGroup(null);
            }}
            className="text-[11px] text-[#61708A] hover:text-[#0B1739] underline underline-offset-2 ml-1 cursor-pointer font-medium"
          >
            Reset Filters
          </button>
        </div>

        {/* Provenance Indicator */}
        <div className="flex items-center gap-2.5 text-[#61708A] text-[11px] font-medium">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#FF6B16]" />
            <span>Observation: Latest (Calibrated)</span>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-[#0B1739] font-mono font-semibold">
            Irradiance: {SAMPLE_DELHI_CAMPUS_THERMAL_DATASET.irradianceWm2} W/m²
          </span>
        </div>
      </div>

      {/* 4. Main Workspace Layout: 65% Interactive Map + 35% Inspection Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Leaflet Solar Map Component */}
        <div className="lg:col-span-2 glass-panel bg-[#0B1739]/90 backdrop-blur-md rounded-3xl border border-white/20 p-2 shadow-2xl overflow-hidden">
          <SolarMap
            buildings={buildings}
            selectedBuildingId={selectedBuilding?.id}
            onSelectBuilding={(b) => {
              setSelectedBuilding(b);
              setSelectedPanelGroup(null);
            }}
            onAddBuildingAtCoord={handleMapClick}
            onAddRoofOutline={(points, area) => {
              handleMapClick(
                points.reduce((sum, point) => sum + point[0], 0) / points.length,
                points.reduce((sum, point) => sum + point[1], 0) / points.length
              );
              setNewRoofOutline(points);
              setNewRoofArea(area);
            }}
            defaultCenter={activeProject ? [activeProject.latitude, activeProject.longitude] : [28.6139, 77.209]}
            metricMode={metricMode}
            onMetricModeChange={setMetricMode}
            thermalMode={thermalMode}
            onThermalModeChange={setThermalMode}
            panelGroups={thermalDataset.panelGroups}
            selectedPanelGroupId={selectedPanelGroup?.id}
            onSelectPanelGroup={(group) => {
              setSelectedPanelGroup(group);
              const b = buildings.find((x) => x.id === group.buildingId || x.name === group.buildingName);
              if (b) setSelectedBuilding(b);
            }}
            minTempC={thermalDataset.minTempC}
            maxTempC={thermalDataset.maxTempC}
            provenance={thermalDataset.provenance}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            tierFilter={tierFilter}
            onTierFilterChange={setTierFilter}
            tileLayerMode={tileLayerMode}
            onTileLayerModeChange={setTileLayerMode}
            showHeatLayer={showHeatLayer}
            onToggleHeatLayer={setShowHeatLayer}
            showPolygons={showPolygons}
            onTogglePolygons={setShowPolygons}
            showBadges={showBadges}
            onToggleBadges={setShowBadges}
          />
        </div>

        {/* Right Col: Inspection Details Drawer */}
        <div className="space-y-4">
          {/* A. If a specific panel group / string is selected -> Hotspot Inspection Drawer */}
          {selectedPanelGroup ? (
            <div className="glass-panel rounded-3xl p-5 shadow-xl space-y-4 animate-in fade-in">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/40 pb-3">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold bg-white/70 text-[#0B1739] px-2 py-0.5 rounded-lg border border-white/80">
                      String {selectedPanelGroup.stringIdentifier}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${
                        getDiagnosticStatusBadge(selectedPanelGroup.diagnosticStatus).badgeClass
                      }`}
                    >
                      {getDiagnosticStatusBadge(selectedPanelGroup.diagnosticStatus).label}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0B1739] mt-1.5">
                    {selectedPanelGroup.name}
                  </h3>
                  <div className="text-xs text-[#61708A]">{selectedPanelGroup.buildingName}</div>
                </div>

                <button
                  onClick={() => setSelectedPanelGroup(null)}
                  className="glass-button-secondary text-xs px-2.5 py-1 rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Thermal Temperature Readouts Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-orange-500/10 p-3.5 rounded-2xl border border-orange-500/20">
                  <span className="text-[#FF6B16] block text-[10px] font-bold uppercase tracking-wider">Surface Temp</span>
                  <strong className="text-[#0B1739] text-base font-mono tabular-nums">
                    {selectedPanelGroup.surfaceTempC !== null
                      ? `${selectedPanelGroup.surfaceTempC.toFixed(1)}°C`
                      : 'N/A'}
                  </strong>
                </div>

                <div
                  className={`p-3.5 rounded-2xl border ${
                    selectedPanelGroup.deltaTempC >= 15
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-950'
                      : 'glass-surface-secondary text-[#0B1739]'
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#61708A]">Baseline Difference (ΔT)</span>
                  <strong className="text-base font-mono tabular-nums">
                    {selectedPanelGroup.deltaTempC >= 0
                      ? `+${selectedPanelGroup.deltaTempC.toFixed(1)}°C`
                      : `${selectedPanelGroup.deltaTempC.toFixed(1)}°C`}
                  </strong>
                </div>

                <div className="glass-surface-secondary p-3 rounded-xl border border-white/60">
                  <span className="text-[#61708A] block text-[10px] font-medium">Nominal Baseline</span>
                  <strong className="text-[#0B1739] text-xs font-mono">
                    {selectedPanelGroup.baselineTempC.toFixed(1)}°C
                  </strong>
                </div>

                <div className="glass-surface-secondary p-3 rounded-xl border border-white/60">
                  <span className="text-[#61708A] block text-[10px] font-medium">Ambient Air</span>
                  <strong className="text-[#0B1739] text-xs font-mono">
                    {selectedPanelGroup.ambientTempC.toFixed(1)}°C
                  </strong>
                </div>
              </div>

              {/* Diagnostics & Suspected Defect */}
              <div className="p-4 glass-surface-secondary border border-white/70 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-white/50 pb-2">
                  <span className="font-bold text-[#0B1739] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Deterministic Diagnostic Finding</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#61708A] font-semibold">
                    Conf: {Math.round(selectedPanelGroup.confidenceScore * 100)}%
                  </span>
                </div>

                <p className="text-[#0B1739] leading-relaxed text-[11px]">
                  <strong>Suspected Factor:</strong> {selectedPanelGroup.suspectedCause}
                </p>

                {selectedPanelGroup.estimatedPowerLossPct > 0 && (
                  <div className="flex items-center justify-between text-rose-600 font-bold pt-1.5 border-t border-white/40">
                    <span>Est. String Generation Loss:</span>
                    <span className="tabular-nums">-{selectedPanelGroup.estimatedPowerLossPct.toFixed(1)}%</span>
                  </div>
                )}
              </div>

              {/* Recommended Field Action */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs space-y-1">
                <span className="font-bold text-amber-950 block flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-amber-600" />
                  <span>Evidence-Based Recommendation</span>
                </span>
                <p className="text-amber-900 text-[11px] leading-snug">
                  {selectedPanelGroup.recommendedAction}
                </p>
              </div>

              {/* Electrical Safety Notice */}
              <div className="rounded-2xl bg-[#0B1739] p-3.5 text-[10px] text-slate-300 leading-tight border border-white/10 shadow-lg">
                <strong className="text-amber-400 block mb-0.5 font-bold">Electrical Safety Advisory:</strong>
                {ELECTRICAL_SAFETY_NOTICE}
              </div>

              {/* Actions */}
              <div className="pt-1 space-y-2">
                <button
                  onClick={() => handleCreateThermalMaintenance(selectedPanelGroup)}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Create Maintenance Ticket</span>
                </button>

                <button
                  onClick={() => setIsViewerModalOpen(true)}
                  className="w-full py-2 glass-button-secondary font-semibold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-[#FF6B16]" />
                  <span>Inspect in Infrared Viewer</span>
                </button>
              </div>
            </div>
          ) : selectedBuilding && selectedMetrics ? (
            /* B. If a building is selected -> Building Climatology & Suitability Card */
            <div className="glass-panel rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-start justify-between border-b border-white/40 pb-3">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold bg-white/70 text-[#0B1739] px-2 py-0.5 rounded-lg border border-white/80">
                      {selectedBuilding.category}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${
                        selectedMetrics.badgeBg
                      } ${selectedMetrics.badgeText} ${selectedMetrics.badgeBorder}`}
                    >
                      {selectedMetrics.tier} Potential ({selectedMetrics.score}/100)
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0B1739] mt-1.5">{selectedBuilding.name}</h3>
                  <div className="text-xs text-[#61708A]">{selectedBuilding.address || 'Campus Facility'}</div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicateBuilding(selectedBuilding)}
                    title="Duplicate building"
                    className="p-1.5 text-[#61708A] hover:text-[#0B1739] rounded-lg hover:bg-white/50 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteBuilding(selectedBuilding)}
                    title="Delete building"
                    className="p-1.5 text-[#61708A] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Solar Suitability Score Gauge */}
              <div
                className="p-4 rounded-2xl border space-y-2.5 backdrop-blur-sm"
                style={{
                  backgroundColor: `${selectedMetrics.colorHex}10`,
                  borderColor: `${selectedMetrics.colorHex}35`,
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0B1739] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: selectedMetrics.colorHex }} />
                    Solar Suitability Score
                  </span>
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-lg shadow-2xs"
                    style={{
                      backgroundColor: selectedMetrics.colorHex,
                      color: '#ffffff',
                    }}
                  >
                    {selectedMetrics.score} / 100
                  </span>
                </div>

                <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 shadow-xs"
                    style={{
                      width: `${selectedMetrics.score}%`,
                      backgroundColor: selectedMetrics.colorHex,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#61708A] pt-0.5">
                  <span className="font-semibold text-[#0B1739]">{selectedMetrics.tierLabel}</span>
                  <span>{selectedMetrics.shadingLossPct}% shading loss</span>
                </div>
              </div>

              {/* Physical Roof Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="glass-surface-secondary p-3 rounded-xl border border-white/60">
                  <span className="text-[#61708A] block text-[10px] font-medium">Gross Footprint</span>
                  <strong className="text-[#0B1739] text-xs tabular-nums font-bold">
                    {formatArea(selectedBuilding.gross_roof_area)}
                  </strong>
                </div>
                <div className="glass-surface-secondary p-3 rounded-xl border border-white/60">
                  <span className="text-[#61708A] block text-[10px] font-medium">
                    Usable ({selectedBuilding.usable_roof_percentage}%)
                  </span>
                  <strong className="text-[#0B1739] text-xs tabular-nums font-bold">
                    {formatArea(selectedBuilding.usable_roof_area)}
                  </strong>
                </div>
                <div className="glass-surface-secondary p-3 rounded-xl border border-white/60">
                  <span className="text-[#61708A] block text-[10px] font-medium">Eligible Capacity</span>
                  <strong className="text-[#0B1739] text-xs tabular-nums font-bold">
                    {formatPower(selectedMetrics.estimatedCapacityKwp)}
                  </strong>
                </div>
                <div className="glass-surface-secondary p-3 rounded-xl border border-white/60">
                  <span className="text-[#61708A] block text-[10px] font-medium">Annual Generation</span>
                  <strong className="text-[#0B1739] text-xs tabular-nums font-bold">
                    {formatEnergy(selectedMetrics.estimatedAnnualGenKwh)}
                  </strong>
                </div>
              </div>

              {/* Strings on this Building */}
              <div>
                <span className="text-[11px] font-bold text-[#0B1739] block mb-2 uppercase tracking-wider">
                  Panel Strings on this Rooftop
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {thermalDataset.panelGroups
                    .filter((pg) => pg.buildingId === selectedBuilding.id || pg.buildingName === selectedBuilding.name)
                    .map((pg) => {
                      const badge = getDiagnosticStatusBadge(pg.diagnosticStatus);
                      return (
                        <div
                          key={pg.id}
                          onClick={() => setSelectedPanelGroup(pg)}
                          className="p-2 rounded-xl border border-white/70 glass-surface-secondary hover:bg-white/80 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: badge.fillColor }} />
                            <span className="font-semibold text-[#0B1739] truncate">{pg.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-[#0B1739] font-medium">{pg.surfaceTempC?.toFixed(1)}°C</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${badge.badgeClass}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 space-y-2">
                <button
                  onClick={() => navigate('/optimize')}
                  className="w-full py-2.5 glass-button-primary font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <span>Include in Knapsack Optimizer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleEditBuilding(selectedBuilding)}
                  className="w-full py-2 glass-button-secondary font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          ) : (
            /* C. Default State: No Selection */
            <div className="glass-panel rounded-3xl p-8 text-center text-[#61708A] shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/15 text-[#FF6B16] flex items-center justify-center mx-auto mb-3">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xs text-[#0B1739] mb-1">Select a Panel String or Facility</h3>
              <p className="text-[11px] text-[#61708A] mb-4 leading-relaxed">
                Click any solar panel polygon on the map to inspect module temperatures, baseline deviations, and diagnostics.
              </p>
              <button
                onClick={handleAddBuildingClick}
                className="glass-button-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" /> Add Facility
              </button>
            </div>
          )}

          {/* Quick Hotspot Alerts List */}
          <div className="glass-panel rounded-3xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-[11px] font-bold text-[#0B1739] uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#FF6B16]" />
                <span>Flagged Hotspots ({thermalFleetSummary.anomaliesCount})</span>
              </h4>
              <span className="text-[10px] text-[#61708A] font-semibold">ΔT &ge; 5°C</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {thermalDataset.panelGroups
                .filter((pg) => pg.diagnosticStatus !== 'NORMAL')
                .sort((a, b) => b.deltaTempC - a.deltaTempC)
                .map((pg) => {
                  return (
                    <div
                      key={pg.id}
                      onClick={() => setSelectedPanelGroup(pg)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        selectedPanelGroup?.id === pg.id
                          ? 'bg-orange-500/15 border-orange-500/40 font-semibold'
                          : 'glass-surface-secondary border-white/60 hover:bg-white/70'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs text-[#0B1739] font-semibold truncate">{pg.name}</div>
                        <div className="text-[10px] text-[#61708A] truncate">{pg.suspectedCause}</div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold text-rose-600">
                          +{pg.deltaTempC.toFixed(1)}°C
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#61708A]" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Lower Analytics Panels (Below the Map) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* A. Temperature Distribution Histogram */}
        <div className="glass-panel p-5 rounded-3xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#0B1739] flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-[#FF6B16]" />
              <span>Surface Temperature Distribution</span>
            </h4>
            <span className="text-[10px] text-[#61708A] font-semibold">Fleet Modules</span>
          </div>

          <div className="space-y-2.5 pt-1 text-xs">
            {temperatureHistogram.map((bin) => {
              const pct =
                thermalFleetSummary.panelGroupsCount > 0
                  ? Math.round((bin.count / thermalFleetSummary.panelGroupsCount) * 100)
                  : 0;
              return (
                <div key={bin.range} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-[#0B1739]">{bin.range}</span>
                    <span className="text-[#61708A] font-mono">
                      {bin.count} strings ({pct}%) · {bin.status}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 shadow-2xs"
                      style={{ width: `${pct}%`, backgroundColor: bin.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* B. Before & After Maintenance Case Study Comparison */}
        <div className="glass-panel p-5 rounded-3xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#0B1739] flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-600" />
              <span>Before &amp; After Maintenance Scan</span>
            </h4>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20">
              Resolved Case
            </span>
          </div>

          <p className="text-[11px] text-[#61708A] leading-snug font-medium">
            Academic Block — String A-07 (Bypass Diode Replacement &amp; Array Wash)
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25">
              <span className="text-[10px] font-bold text-rose-700 block">Pre-Service (Alert)</span>
              <div className="text-base font-mono font-bold text-rose-950 mt-0.5">67.5°C</div>
              <div className="text-[10px] text-rose-700 mt-1">ΔT +25.5°C · Loss -18.5%</div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
              <span className="text-[10px] font-bold text-emerald-700 block">Post-Service</span>
              <div className="text-base font-mono font-bold text-emerald-950 mt-0.5">42.8°C</div>
              <div className="text-[10px] text-emerald-700 mt-1">ΔT +0.8°C · Nominal</div>
            </div>
          </div>

          <div className="rounded-xl glass-surface-secondary p-3 text-[10px] text-[#61708A] border border-white/60 leading-relaxed">
            <strong className="text-[#0B1739]">Maintenance Impact:</strong> +18.5% string generation restored. Module backsheet hotspot temperature normalized below STC thermal runaway threshold.
          </div>
        </div>

        {/* C. Maintenance Priority Action Queue */}
        <div className="glass-panel p-5 rounded-3xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#0B1739] flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-rose-500" />
              <span>Prioritized Service Queue</span>
            </h4>
            <span className="text-[10px] text-[#61708A] font-semibold">By Severity</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
              <div>
                <strong className="text-rose-950 text-xs block font-bold">String A-07 · Academic Block</strong>
                <span className="text-[10px] text-rose-700">Critical Diode Check (ΔT +25.5°C)</span>
              </div>
              <button
                onClick={() => {
                  const target = thermalDataset.panelGroups.find((pg) => pg.stringIdentifier === 'A-07');
                  if (target) handleCreateThermalMaintenance(target);
                }}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-xs"
              >
                Log Ticket
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div>
                <strong className="text-amber-950 text-xs block font-bold">String L-02 · Library</strong>
                <span className="text-[10px] text-amber-700">Targeted Soiling Clean (ΔT +14.2°C)</span>
              </div>
              <button
                onClick={() => {
                  const target = thermalDataset.panelGroups.find((pg) => pg.stringIdentifier === 'L-02');
                  if (target) handleCreateThermalMaintenance(target);
                }}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-xs"
              >
                Log Ticket
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between">
              <div>
                <strong className="text-yellow-950 text-xs block font-bold">String A-03 · Academic Block</strong>
                <span className="text-[10px] text-yellow-700">Scheduled Wash (ΔT +7.5°C)</span>
              </div>
              <button
                onClick={() => {
                  const target = thermalDataset.panelGroups.find((pg) => pg.stringIdentifier === 'A-03');
                  if (target) handleCreateThermalMaintenance(target);
                }}
                className="px-2.5 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-xs"
              >
                Log Ticket
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Modal for Adding / Editing Rooftop Boundaries */}
      {isEditorOpen && activeProject && (
        <BuildingEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          building={editorTargetBuilding}
          projectId={activeProject.id}
          defaultCoordinates={newBuildingCoords}
          defaultRoofPolygon={newRoofOutline}
          defaultRoofArea={newRoofArea}
          onSaved={handleSavedBuilding}
        />
      )}

      {/* Thermal Inspection Image Viewer Modal */}
      <ThermalInspectionViewerModal
        isOpen={isViewerModalOpen}
        onClose={() => setIsViewerModalOpen(false)}
        moduleTitle={selectedPanelGroup?.name || 'Academic Block — String A-07 Hotspot Inspection'}
      />

      {/* Thermal CSV Upload Modal */}
      {activeProject && (
        <ThermalUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          projectId={activeProject.id}
          onSuccess={(obs) => {
            alert(`Successfully ingested ${obs.length} thermal readings.`);
          }}
        />
      )}
    </div>
  );
};
