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
  const { activeProject } = useProject();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorTargetBuilding, setEditorTargetBuilding] = useState<Building | null>(null);
  const [newBuildingCoords, setNewBuildingCoords] = useState<[number, number]>([28.6139, 77.2090]);
  const [loading, setLoading] = useState(false);

  const fetchBuildings = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      const list = await api.getBuildings(activeProject.id);
      setBuildings(list);
      if (list.length > 0 && !selectedBuilding) {
        setSelectedBuilding(list[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, [activeProject]);

  const handleMapClick = (lat: number, lng: number) => {
    setNewBuildingCoords([lat, lng]);
    setEditorTargetBuilding(null);
    setIsEditorOpen(true);
  };

  const handleAddBuildingClick = () => {
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateBuilding = async (b: Building) => {
    try {
      await api.duplicateBuilding(b.id);
      await fetchBuildings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavedBuilding = (saved: Building) => {
    setSelectedBuilding(saved);
    fetchBuildings();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5EAE7] shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#17231F] flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <span>Interactive Campus GIS Solar Map</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualize candidate buildings, inspect solar exposure, and identify shading obstructions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddBuildingClick}
            className="px-4 py-2 bg-[#123C32] hover:bg-[#0B251F] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Candidate Rooftop</span>
          </button>
          <button
            onClick={() => navigate('/optimize')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span>Proceed to Optimizer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Map & Building Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Map */}
        <div className="lg:col-span-2">
          <SolarMap
            buildings={buildings}
            selectedBuildingId={selectedBuilding?.id}
            onSelectBuilding={(b) => setSelectedBuilding(b)}
            onAddBuildingAtCoord={handleMapClick}
            defaultCenter={activeProject ? [activeProject.latitude, activeProject.longitude] : [28.6139, 77.2090]}
          />
        </div>

        {/* Right Col: Selected Building Details Drawer */}
        <div className="space-y-4">
          {selectedBuilding ? (
            <div className="bg-white rounded-2xl border border-[#E5EAE7] p-5 shadow-xs space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      {selectedBuilding.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        selectedBuilding.shading_category === 'High'
                          ? 'bg-red-100 text-red-800'
                          : selectedBuilding.shading_category === 'Medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {selectedBuilding.shading_category} Shading
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#123C32] mt-1">{selectedBuilding.name}</h3>
                  <div className="text-xs text-slate-500">{selectedBuilding.address || 'Campus Location'}</div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicateBuilding(selectedBuilding)}
                    title="Duplicate building"
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBuilding(selectedBuilding)}
                    title="Delete building"
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Roof Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Gross Roof Area</span>
                  <strong className="text-slate-800 text-sm">{formatArea(selectedBuilding.gross_roof_area)}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Usable Area ({selectedBuilding.usable_roof_percentage}%)</span>
                  <strong className="text-slate-800 text-sm">{formatArea(selectedBuilding.usable_roof_area)}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Monthly Demand</span>
                  <strong className="text-slate-800 text-sm">{formatEnergy(selectedBuilding.monthly_consumption_kwh)}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[11px]">Daytime Load</span>
                  <strong className="text-slate-800 text-sm">{selectedBuilding.daytime_consumption_pct}% daytime</strong>
                </div>
              </div>

              {/* Solar Calculations if Available */}
              {selectedBuilding.solar_analysis && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-emerald-900 font-bold border-b border-emerald-200/60 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-emerald-600" />
                      Calculated Solar Potential
                    </span>
                    <span className="text-[10px] bg-emerald-200/80 px-2 py-0.5 rounded text-emerald-900 font-semibold">
                      NASA POWER
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-emerald-950">
                    <div className="flex justify-between">
                      <span className="text-emerald-800">Max PV Capacity:</span>
                      <strong>{formatPower(selectedBuilding.solar_analysis.max_pv_capacity_kwp)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-800">Annual Generation:</span>
                      <strong>{formatEnergy(selectedBuilding.solar_analysis.annual_generation_kwh)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-800">Specific Yield:</span>
                      <strong>{selectedBuilding.solar_analysis.specific_yield_kwh_per_kwp} kWh/kWp/yr</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-800">Est. Annual Savings:</span>
                      <strong className="text-emerald-700">{formatINR(selectedBuilding.solar_analysis.annual_savings_inr)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-800">Capital Payback:</span>
                      <strong>
                        {selectedBuilding.solar_analysis.simple_payback_years
                          ? `${selectedBuilding.solar_analysis.simple_payback_years} Years`
                          : 'N/A'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => handleEditBuilding(selectedBuilding)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => navigate('/buildings')}
                  className="w-full py-2 bg-[#123C32] hover:bg-[#0B251F] text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                >
                  <span>Detailed View</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5EAE7] p-8 text-center text-slate-500 shadow-xs">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-sm text-slate-700 mb-1">No Rooftop Selected</h3>
              <p className="text-xs text-slate-500 mb-4">
                Click any building marker on the map to inspect its solar capacity and demand profile.
              </p>
              <button
                onClick={handleAddBuildingClick}
                className="px-4 py-2 bg-[#123C32] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Building
              </button>
            </div>
          )}

          {/* Quick List of All Buildings */}
          <div className="bg-white rounded-2xl border border-[#E5EAE7] p-4 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Portfolio Rooftops ({buildings.length})
            </h4>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {buildings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBuilding(b)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                    selectedBuilding?.id === b.id
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                      : 'bg-slate-50/70 border-slate-200/60 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div>
                    <div>{b.name}</div>
                    <div className="text-[10px] text-slate-500 font-normal">
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
          onSaved={handleSavedBuilding}
        />
      )}
    </div>
  );
};
