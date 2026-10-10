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
    <div className="space-y-5 max-w-7xl mx-auto">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {maintenanceSuccessMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-900 flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{maintenanceSuccessMsg}</span>
        </div>
      )}

      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200/60">
              <Flame className="w-5 h-5 text-orange-500" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Solar Thermal Intelligence &amp; Hotspot Analysis
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {thermalDataset.provenance === 'SAMPLE' ? 'Sample Demo Mode' : thermalDataset.provenance}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Explore rooftop solar installations, visualize surface thermal conditions, detect potential hotspots, and prioritize maintenance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Upload Readings</span>
          </button>

          <button
            onClick={() => setIsViewerModalOpen(true)}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Camera className="w-3.5 h-3.5 text-orange-400" />
            <span>Thermal Viewer</span>
          </button>

          <button
            onClick={() => navigate('/optimize')}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <span>Optimizer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Top 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Monitored Roofs</span>
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
            {thermalFleetSummary.buildingsMonitored}{' '}
            <span className="text-xs font-normal text-slate-500">Facilities</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            {activeProject?.name || 'Active Campus'}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Strings Monitored</span>
            <Layers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums flex items-baseline gap-1">
            <span>{thermalFleetSummary.panelGroupsCount}</span>
            <span className="text-xs font-normal text-slate-500">
              ({thermalFleetSummary.totalPanelsCount} modules)
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">18 Modules / String</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Fleet Mean Temp</span>
            <Flame className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums flex items-baseline gap-1">
            <span>{thermalFleetSummary.fleetAvgTempC.toFixed(1)}°C</span>
            <span className="text-xs font-normal text-slate-500">
              (Max {thermalFleetSummary.fleetMaxTempC.toFixed(1)}°C)
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Baseline: 42.0°C NOCT</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Thermal Hotspots</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-lg font-bold text-rose-600 mt-1 tabular-nums">
            {thermalFleetSummary.anomaliesCount}{' '}
            <span className="text-xs font-normal text-slate-500">
              ({thermalFleetSummary.criticalCount} Critical)
            </span>
          </div>
          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
            ΔT &ge; 5°C above baseline
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Thermal Power Loss</span>
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
            {thermalFleetSummary.fleetPowerLossPct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            -0.4%/°C Si Temp Derating
          </div>
        </div>
      </div>

      {/* 3. Filter Controls Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
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
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:outline-none focus:border-slate-400"
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
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:outline-none focus:border-slate-400"
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
            className="text-[11px] text-slate-500 hover:text-slate-800 underline underline-offset-2 ml-1"
          >
            Reset Filters
          </button>
        </div>

        {/* Provenance Indicator */}
        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Observation: Latest (Calibrated)</span>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600 font-mono">
            Irradiance: {SAMPLE_DELHI_CAMPUS_THERMAL_DATASET.irradianceWm2} W/m²
          </span>
        </div>
      </div>

      {/* 4. Main Workspace Layout: 65% Interactive Map + 35% Inspection Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Leaflet Solar Map Component */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-1.5 shadow-md">
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
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 animate-in fade-in">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      String {selectedPanelGroup.stringIdentifier}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        getDiagnosticStatusBadge(selectedPanelGroup.diagnosticStatus).badgeClass
                      }`}
                    >
                      {getDiagnosticStatusBadge(selectedPanelGroup.diagnosticStatus).label}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                    {selectedPanelGroup.name}
                  </h3>
                  <div className="text-xs text-slate-500">{selectedPanelGroup.buildingName}</div>
                </div>

                <button
                  onClick={() => setSelectedPanelGroup(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded bg-slate-50 border border-slate-200"
                >
                  Close
                </button>
              </div>

              {/* Thermal Temperature Readouts Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-orange-50/70 p-3 rounded-xl border border-orange-200/80">
                  <span className="text-orange-700 block text-[10px] font-semibold">Surface Temp</span>
                  <strong className="text-orange-950 text-base font-mono tabular-nums">
                    {selectedPanelGroup.surfaceTempC !== null
                      ? `${selectedPanelGroup.surfaceTempC.toFixed(1)}°C`
                      : 'N/A'}
                  </strong>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    selectedPanelGroup.deltaTempC >= 15
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="block text-[10px] font-semibold">Baseline Difference (ΔT)</span>
                  <strong className="text-base font-mono tabular-nums">
                    {selectedPanelGroup.deltaTempC >= 0
                      ? `+${selectedPanelGroup.deltaTempC.toFixed(1)}°C`
                      : `${selectedPanelGroup.deltaTempC.toFixed(1)}°C`}
                  </strong>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Nominal Baseline</span>
                  <strong className="text-slate-800 text-xs font-mono">
                    {selectedPanelGroup.baselineTempC.toFixed(1)}°C
                  </strong>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Ambient Air</span>
                  <strong className="text-slate-800 text-xs font-mono">
                    {selectedPanelGroup.ambientTempC.toFixed(1)}°C
                  </strong>
                </div>
              </div>

              {/* Diagnostics & Suspected Defect */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Deterministic Diagnostic Finding</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Conf: {Math.round(selectedPanelGroup.confidenceScore * 100)}%
                  </span>
                </div>

                <p className="text-slate-700 leading-relaxed text-[11px]">
                  <strong>Suspected Factor:</strong> {selectedPanelGroup.suspectedCause}
                </p>

                {selectedPanelGroup.estimatedPowerLossPct > 0 && (
                  <div className="flex items-center justify-between text-rose-700 font-semibold pt-1 border-t border-slate-200/40">
                    <span>Est. String Generation Loss:</span>
                    <span className="tabular-nums">-{selectedPanelGroup.estimatedPowerLossPct.toFixed(1)}%</span>
                  </div>
                )}
              </div>

              {/* Recommended Field Action */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-900 block flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-amber-700" />
                  <span>Evidence-Based Recommendation</span>
                </span>
                <p className="text-amber-800 text-[11px] leading-snug">
                  {selectedPanelGroup.recommendedAction}
                </p>
              </div>

              {/* Electrical Safety Notice */}
              <div className="rounded-xl bg-slate-900 p-3 text-[10px] text-slate-300 leading-tight border border-slate-800">
                <strong className="text-amber-400 block mb-0.5">Electrical Safety Advisory:</strong>
                {ELECTRICAL_SAFETY_NOTICE}
              </div>

              {/* Actions */}
              <div className="pt-1 space-y-2">
                <button
                  onClick={() => handleCreateThermalMaintenance(selectedPanelGroup)}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Create Maintenance Ticket</span>
                </button>

                <button
                  onClick={() => setIsViewerModalOpen(true)}
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 border border-slate-200"
                >
                  <Camera className="w-3.5 h-3.5 text-orange-600" />
                  <span>Inspect in Infrared Viewer</span>
                </button>
              </div>
            </div>
          ) : selectedBuilding && selectedMetrics ? (
            /* B. If a building is selected -> Building Climatology & Suitability Card */
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {selectedBuilding.category}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        selectedMetrics.badgeBg
                      } ${selectedMetrics.badgeText} ${selectedMetrics.badgeBorder}`}
                    >
                      {selectedMetrics.tier} Potential ({selectedMetrics.score}/100)
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1.5">{selectedBuilding.name}</h3>
                  <div className="text-xs text-slate-500">{selectedBuilding.address || 'Campus Facility'}</div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicateBuilding(selectedBuilding)}
                    title="Duplicate building"
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteBuilding(selectedBuilding)}
                    title="Delete building"
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Solar Suitability Score Gauge */}
              <div
                className="p-3.5 rounded-xl border space-y-2"
                style={{
                  backgroundColor: `${selectedMetrics.colorHex}08`,
                  borderColor: `${selectedMetrics.colorHex}35`,
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: selectedMetrics.colorHex }} />
                    Solar Suitability Score
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: selectedMetrics.colorHex,
                      color: '#ffffff',
                    }}
                  >
                    {selectedMetrics.score} / 100
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${selectedMetrics.score}%`,
                      backgroundColor: selectedMetrics.colorHex,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span className="font-medium text-slate-700">{selectedMetrics.tierLabel}</span>
                  <span>{selectedMetrics.shadingLossPct}% shading loss</span>
                </div>
              </div>

              {/* Physical Roof Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Gross Footprint</span>
                  <strong className="text-slate-900 text-xs tabular-nums">
                    {formatArea(selectedBuilding.gross_roof_area)}
                  </strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">
                    Usable ({selectedBuilding.usable_roof_percentage}%)
                  </span>
                  <strong className="text-slate-900 text-xs tabular-nums">
                    {formatArea(selectedBuilding.usable_roof_area)}
                  </strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Eligible Capacity</span>
                  <strong className="text-slate-900 text-xs tabular-nums">
                    {formatPower(selectedMetrics.estimatedCapacityKwp)}
                  </strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Annual Generation</span>
                  <strong className="text-slate-900 text-xs tabular-nums">
                    {formatEnergy(selectedMetrics.estimatedAnnualGenKwh)}
                  </strong>
                </div>
              </div>

              {/* Strings on this Building */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                  Panel Strings on this Rooftop
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {thermalDataset.panelGroups
                    .filter((pg) => pg.buildingId === selectedBuilding.id || pg.buildingName === selectedBuilding.name)
                    .map((pg) => {
                      const badge = getDiagnosticStatusBadge(pg.diagnosticStatus);
                      return (
                        <div
                          key={pg.id}
                          onClick={() => setSelectedPanelGroup(pg)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: badge.fillColor }} />
                            <span className="font-semibold text-slate-800 truncate">{pg.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-slate-700">{pg.surfaceTempC?.toFixed(1)}°C</span>
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
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>Include in Knapsack Optimizer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleEditBuilding(selectedBuilding)}
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          ) : (
            /* C. Default State: No Selection */
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 shadow-xs">
              <Flame className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <h3 className="font-semibold text-xs text-slate-800 mb-1">Select a Panel String or Facility</h3>
              <p className="text-[11px] text-slate-500 mb-3">
                Click any solar panel polygon on the map to inspect module temperatures, baseline deviations, and diagnostics.
              </p>
              <button
                onClick={handleAddBuildingClick}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Facility
              </button>
            </div>
          )}

          {/* Quick Hotspot Alerts List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>Flagged Hotspots ({thermalFleetSummary.anomaliesCount})</span>
              </h4>
              <span className="text-[10px] text-slate-400">ΔT &ge; 5°C</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {thermalDataset.panelGroups
                .filter((pg) => pg.diagnosticStatus !== 'NORMAL')
                .sort((a, b) => b.deltaTempC - a.deltaTempC)
                .map((pg) => {
                  const badge = getDiagnosticStatusBadge(pg.diagnosticStatus);
                  return (
                    <div
                      key={pg.id}
                      onClick={() => setSelectedPanelGroup(pg)}
                      className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        selectedPanelGroup?.id === pg.id
                          ? 'bg-orange-50 border-orange-300 font-semibold'
                          : 'bg-slate-50/70 border-slate-200/60 hover:bg-slate-100'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs text-slate-800 font-semibold truncate">{pg.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{pg.suspectedCause}</div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold text-rose-600">
                          +{pg.deltaTempC.toFixed(1)}°C
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span>Surface Temperature Distribution</span>
            </h4>
            <span className="text-[10px] text-slate-400">Fleet Modules</span>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            {temperatureHistogram.map((bin) => {
              const pct =
                thermalFleetSummary.panelGroupsCount > 0
                  ? Math.round((bin.count / thermalFleetSummary.panelGroupsCount) * 100)
                  : 0;
              return (
                <div key={bin.range} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-700">{bin.range}</span>
                    <span className="text-slate-500 font-mono">
                      {bin.count} strings ({pct}%) · {bin.status}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: bin.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* B. Before & After Maintenance Case Study Comparison */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-600" />
              <span>Before &amp; After Maintenance Scan</span>
            </h4>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold border border-emerald-200">
              Resolved Case
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-snug">
            Academic Block — String A-07 (Bypass Diode Replacement &amp; Array Wash)
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-[10px] font-bold text-rose-700 block">Pre-Service (Alert)</span>
              <div className="text-base font-mono font-bold text-rose-900 mt-0.5">67.5°C</div>
              <div className="text-[10px] text-rose-700 mt-1">ΔT +25.5°C · Loss -18.5%</div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-700 block">Post-Service</span>
              <div className="text-base font-mono font-bold text-emerald-900 mt-0.5">42.8°C</div>
              <div className="text-[10px] text-emerald-700 mt-1">ΔT +0.8°C · Nominal</div>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-2.5 text-[10px] text-slate-600 border border-slate-100">
            <strong>Maintenance Impact:</strong> +18.5% string generation restored. Module backsheet hotspot temperature normalized below STC thermal runaway threshold.
          </div>
        </div>

        {/* C. Maintenance Priority Action Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-rose-500" />
              <span>Prioritized Service Queue</span>
            </h4>
            <span className="text-[10px] text-slate-400">By Severity</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-200 flex items-center justify-between">
              <div>
                <strong className="text-rose-900 text-xs block">String A-07 · Academic Block</strong>
                <span className="text-[10px] text-rose-700">Critical Diode Check (ΔT +25.5°C)</span>
              </div>
              <button
                onClick={() => {
                  const target = thermalDataset.panelGroups.find((pg) => pg.stringIdentifier === 'A-07');
                  if (target) handleCreateThermalMaintenance(target);
                }}
                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-semibold transition-colors"
              >
                Log Ticket
              </button>
            </div>

            <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-200 flex items-center justify-between">
              <div>
                <strong className="text-amber-900 text-xs block">String L-02 · Library</strong>
                <span className="text-[10px] text-amber-700">Targeted Soiling Clean (ΔT +14.2°C)</span>
              </div>
              <button
                onClick={() => {
                  const target = thermalDataset.panelGroups.find((pg) => pg.stringIdentifier === 'L-02');
                  if (target) handleCreateThermalMaintenance(target);
                }}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-semibold transition-colors"
              >
                Log Ticket
              </button>
            </div>

            <div className="p-2 rounded-lg bg-yellow-50/60 border border-yellow-200 flex items-center justify-between">
              <div>
                <strong className="text-yellow-900 text-xs block">String A-03 · Academic Block</strong>
                <span className="text-[10px] text-yellow-700">Scheduled Wash (ΔT +7.5°C)</span>
              </div>
              <button
                onClick={() => {
                  const target = thermalDataset.panelGroups.find((pg) => pg.stringIdentifier === 'A-03');
                  if (target) handleCreateThermalMaintenance(target);
                }}
                className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-[10px] font-semibold transition-colors"
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
