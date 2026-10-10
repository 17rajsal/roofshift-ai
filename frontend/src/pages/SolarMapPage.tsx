import React, { useState, useEffect } from 'react';
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
} from '../utils/formatters';
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
} from 'lucide-react';

export const SolarMapPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject, refreshProjects } = useProject();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorTargetBuilding, setEditorTargetBuilding] = useState<Building | null>(null);
  const [newBuildingCoords, setNewBuildingCoords] = useState<[number, number]>([28.6139, 77.2090]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRoofOutline, setNewRoofOutline] = useState<[number, number][] | undefined>();
  const [newRoofArea, setNewRoofArea] = useState<number | undefined>();

  const fetchBuildings = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      setError(null);
      const list = await api.getBuildings(activeProject.id);
      setBuildings(list);
      setSelectedBuilding(current => list.find(b => b.id === current?.id) || list[0] || null);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">{error}</div>}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-700" />
            <span>Interactive Campus GIS Solar Explorer</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Geospatial rooftop digitization, surface area estimation, and micro-climate shading obstruction derating.
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

      {/* Main Grid: Map & Building Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Map */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-1 shadow-xs">
          <SolarMap
            buildings={buildings}
            selectedBuildingId={selectedBuilding?.id}
            onSelectBuilding={(b) => setSelectedBuilding(b)}
            onAddBuildingAtCoord={handleMapClick}
            onAddRoofOutline={(points, area) => {
              handleMapClick(points.reduce((sum, point) => sum + point[0], 0) / points.length, points.reduce((sum, point) => sum + point[1], 0) / points.length);
              setNewRoofOutline(points);
              setNewRoofArea(area);
            }}
            defaultCenter={activeProject ? [activeProject.latitude, activeProject.longitude] : [28.6139, 77.2090]}
          />
        </div>

        {/* Right Col: Selected Building Details Drawer */}
        <div className="space-y-4">
          {selectedBuilding ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {selectedBuilding.category}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        selectedBuilding.shading_category === 'High'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : selectedBuilding.shading_category === 'Medium'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {selectedBuilding.shading_category} Shading
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1.5">{selectedBuilding.name}</h3>
                  <div className="text-xs text-slate-500">{selectedBuilding.address || 'Campus Facility'}</div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicateBuilding(selectedBuilding)}
                    title="Duplicate building"
                    className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteBuilding(selectedBuilding)}
                    title="Delete building"
                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Roof Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Gross Footprint</span>
                  <strong className="text-slate-900 text-xs tabular-nums">{formatArea(selectedBuilding.gross_roof_area)}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Usable ({selectedBuilding.usable_roof_percentage}%)</span>
                  <strong className="text-slate-900 text-xs tabular-nums">{formatArea(selectedBuilding.usable_roof_area)}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Monthly Demand</span>
                  <strong className="text-slate-900 text-xs tabular-nums">{formatEnergy(selectedBuilding.monthly_consumption_kwh)}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-500 block text-[10px]">Daytime Share</span>
                  <strong className="text-slate-900 text-xs tabular-nums">{selectedBuilding.daytime_consumption_pct}% load</strong>
                </div>
              </div>

              {/* Solar Calculations */}
              {selectedBuilding.solar_analysis && (
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between text-xs text-slate-800 font-semibold border-b border-slate-200/60 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      Solar Climatology Yield
                    </span>
                    <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.2 rounded text-slate-600 font-mono">
                      NASA POWER
                    </span>
                  </div>

                  <div className="space-y-1 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Max PV Capacity:</span>
                      <strong className="text-slate-900 tabular-nums">{formatPower(selectedBuilding.solar_analysis.max_pv_capacity_kwp)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Annual Generation:</span>
                      <strong className="text-slate-900 tabular-nums">{formatEnergy(selectedBuilding.solar_analysis.annual_generation_kwh)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Specific Yield:</span>
                      <strong className="tabular-nums">{selectedBuilding.solar_analysis.specific_yield_kwh_per_kwp} kWh/kWp/yr</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Annual Savings:</span>
                      <strong className="text-emerald-700 tabular-nums">{formatINR(selectedBuilding.solar_analysis.annual_savings_inr)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Simple Payback:</span>
                      <strong className="tabular-nums">
                        {selectedBuilding.solar_analysis.simple_payback_years
                          ? `${selectedBuilding.solar_analysis.simple_payback_years} Years`
                          : '—'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-1 flex items-center gap-2">
                <button
                  onClick={() => handleEditBuilding(selectedBuilding)}
                  className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md text-xs transition-colors"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => navigate('/buildings')}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md text-xs transition-colors flex items-center justify-center gap-1 shadow-2xs"
                >
                  <span>Facility Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 shadow-xs">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="font-semibold text-xs text-slate-700 mb-1">No Rooftop Selected</h3>
              <p className="text-[11px] text-slate-500 mb-3">
                Click any building polygon on the map or select from the list below to inspect solar generation metrics.
              </p>
              <button
                onClick={handleAddBuildingClick}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Rooftop
              </button>
            </div>
          )}

          {/* Quick List of All Buildings */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Portfolio Catalog ({buildings.length})
            </h4>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {buildings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBuilding(b)}
                  className={`p-2 rounded-md border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                    selectedBuilding?.id === b.id
                      ? 'bg-slate-100 border-slate-300 text-slate-900 font-medium'
                      : 'bg-slate-50/60 border-slate-200/60 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <div>
                    <div className="text-xs text-slate-800">{b.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {formatArea(b.usable_roof_area)} • {b.shading_category} shade
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Editor Modal */}
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
