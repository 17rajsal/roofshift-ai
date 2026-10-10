import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SolarMap } from '../components/map/SolarMap';
import { BuildingEditorModal } from '../components/buildings/BuildingEditorModal';
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

  // Filter and display states
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [metricMode, setMetricMode] = useState<MetricVisualizationMode>('suitability');
  const [tileLayerMode, setTileLayerMode] = useState<'satellite' | 'street' | 'light'>('street');
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

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60">
              <Sun className="w-4 h-4 text-amber-600" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Campus GIS Solar Explorer & Heat Map
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Geospatial rooftop boundary digitization, solar irradiance profiling, and thermal suitability heat mapping.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddBuildingClick}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rooftop</span>
          </button>
          <button
            onClick={() => navigate('/optimize')}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <span>Proceed to Optimizer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Portfolio Summary Metric Cards Above Map */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Portfolio Roofs</span>
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
            {portfolioStats.totalBuildings} <span className="text-xs font-normal text-slate-500">Buildings</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            {activeProject?.name || 'Active Campus'}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Avg. Solar Score</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums flex items-baseline gap-1">
            <span>{portfolioStats.avgScore}</span>
            <span className="text-xs font-normal text-slate-500">/ 100</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
            {portfolioStats.avgScore >= 75 ? 'Optimal Solar Resource' : 'Moderate Shading Profile'}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Prime Candidates</span>
            <Flame className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-emerald-700 mt-1 tabular-nums">
            {portfolioStats.highPotentialCount}{' '}
            <span className="text-xs font-normal text-slate-500">
              of {portfolioStats.totalBuildings}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Score &ge; 70 pts (Low shade)
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Est. Solar Yield</span>
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
            {formatEnergy(portfolioStats.totalEstimatedGenKwh)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Annual Clean Energy
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Total Usable Area</span>
            <Layers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
            {formatArea(portfolioStats.totalUsableArea)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Digitized Solar Surface
          </div>
        </div>
      </div>

      {/* 3. Filter & Heat Map Visualization Controls Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left Filters: Category & Potential */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Filters:</span>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:outline-none focus:border-slate-400"
          >
            <option value="All">All Categories ({buildings.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat} ({buildings.filter((b) => b.category === cat).length})
              </option>
            ))}
          </select>

          {/* Potential Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:outline-none focus:border-slate-400"
          >
            <option value="All">All Potential Tiers</option>
            <option value="Excellent">Excellent (&ge;85 pts)</option>
            <option value="Good">Good (70-84 pts)</option>
            <option value="Moderate">Moderate (50-69 pts)</option>
            <option value="Low">Low (&lt;50 pts)</option>
          </select>
        </div>

        {/* Right Controls: Metric Mode & Display Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
            <span className="text-[11px] text-slate-500 font-medium">Color Metric:</span>
            <select
              value={metricMode}
              onChange={(e) => setMetricMode(e.target.value as MetricVisualizationMode)}
              className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="suitability">Solar Suitability Score</option>
              <option value="generation">Annual Generation (kWh)</option>
              <option value="yield">Specific Yield (kWh/kWp)</option>
              <option value="savings">Annual Savings (₹)</option>
              <option value="co2">CO₂ Avoided (tCO₂)</option>
            </select>
          </div>

          {/* Quick Display Toggles */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setShowHeatLayer(!showHeatLayer)}
              title="Toggle Heat Glow Layer"
              className={`px-2 py-1 text-[11px] rounded font-semibold flex items-center gap-1 transition-colors ${
                showHeatLayer ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span className="hidden sm:inline">Heat</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPolygons(!showPolygons)}
              title="Toggle Rooftop Polygons"
              className={`px-2 py-1 text-[11px] rounded font-semibold flex items-center gap-1 transition-colors ${
                showPolygons ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span className="hidden sm:inline">Roofs</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBadges(!showBadges)}
              title="Toggle Centroid Score Badges"
              className={`px-2 py-1 text-[11px] rounded font-semibold flex items-center gap-1 transition-colors ${
                showBadges ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">Badges</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Workspace Layout: Map + Inspection Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Leaflet Solar Map Component */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-1.5 shadow-xs">
          <SolarMap
            buildings={buildings}
            selectedBuildingId={selectedBuilding?.id}
            onSelectBuilding={(b) => setSelectedBuilding(b)}
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

        {/* Right Col: Selected Building Details Drawer + Catalog */}
        <div className="space-y-4">
          {selectedBuilding && selectedMetrics ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              {/* Header with Title and Quick Actions */}
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

              {/* Visual Solar Suitability Score Gauge */}
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

                {/* Score Progress Bar */}
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
                  <span className="text-slate-500 block text-[10px]">Monthly Demand</span>
                  <strong className="text-slate-900 text-xs tabular-nums">
                    {formatEnergy(selectedBuilding.monthly_consumption_kwh)}
                  </strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Daytime Share</span>
                  <strong className="text-slate-900 text-xs tabular-nums">
                    {selectedBuilding.daytime_consumption_pct}% load
                  </strong>
                </div>
              </div>

              {/* Detailed Solar & Financial Yield Box */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between text-xs text-slate-800 font-semibold border-b border-slate-200/60 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    Solar Climatology Estimates
                  </span>
                  <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.2 rounded text-slate-600 font-mono">
                    NASA POWER
                  </span>
                </div>

                <div className="space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Eligible PV Capacity:</span>
                    <strong className="text-slate-900 tabular-nums">
                      {formatPower(selectedMetrics.estimatedCapacityKwp)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Annual Solar Generation:</span>
                    <strong className="text-slate-900 tabular-nums">
                      {formatEnergy(selectedMetrics.estimatedAnnualGenKwh)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Specific Solar Yield:</span>
                    <strong className="tabular-nums text-slate-900">
                      {selectedMetrics.specificYieldKwhPerKwp} kWh/kWp/yr
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Net Annual Bill Savings:</span>
                    <strong className="text-emerald-700 font-semibold tabular-nums">
                      {formatINR(selectedMetrics.estimatedAnnualSavingsInr)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Simple Capital Payback:</span>
                    <strong className="tabular-nums text-slate-900">
                      {selectedMetrics.paybackYears ? `${selectedMetrics.paybackYears} Years` : '—'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Avoided Grid Emissions:</span>
                    <strong className="tabular-nums text-slate-800">
                      {formatCO2(selectedMetrics.avoidedCo2KgAnnual)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 space-y-2">
                <button
                  onClick={() => navigate('/optimize')}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>Include in Knapsack Optimizer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleEditBuilding(selectedBuilding)}
                    className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md text-xs transition-colors"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => navigate('/buildings')}
                    className="py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md text-xs transition-colors flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <span>Facility Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 shadow-xs">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="font-semibold text-xs text-slate-700 mb-1">No Rooftop Selected</h3>
              <p className="text-[11px] text-slate-500 mb-3">
                Click any building polygon or score badge on the map to inspect solar heat and generation metrics.
              </p>
              <button
                onClick={handleAddBuildingClick}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Rooftop
              </button>
            </div>
          )}

          {/* Portfolio Catalog List with Score Pills */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Portfolio Catalog ({buildings.length})
              </h4>
              <span className="text-[10px] text-slate-400">Ranked by potential</span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {analyzedBuildings
                .sort((a, b) => b.metrics.score - a.metrics.score)
                .map(({ building: b, metrics }) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBuilding(b)}
                    className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      selectedBuilding?.id === b.id
                        ? 'bg-slate-100 border-slate-300 text-slate-900 font-medium'
                        : 'bg-slate-50/60 border-slate-200/60 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs text-slate-800 font-semibold truncate">{b.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {formatArea(b.usable_roof_area)} • {b.shading_category} shade
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
                        style={{
                          backgroundColor: `${metrics.colorHex}15`,
                          color: metrics.colorHex,
                        }}
                      >
                        {metrics.score}
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                ))}
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
    </div>
  );
};
