import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { Building, SolarAnalysisFull } from '../types/models';
import { api } from '../services/api';
import { BuildingEditorModal } from '../components/buildings/BuildingEditorModal';
import {
  formatArea,
  formatEnergy,
  formatINR,
  formatPower,
  formatPct,
  formatCO2,
} from '../utils/formatters';
import {
  Building2,
  Plus,
  Sun,
  Zap,
  DollarSign,
  TrendingUp,
  RotateCw,
  Copy,
  Trash2,
  Edit,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const BuildingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject, refreshProjects } = useProject();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [detailedAnalysis, setDetailedAnalysis] = useState<SolarAnalysisFull | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(false);
  const [recalculatingId, setRecalculatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const analysisRequest = useRef(0);

  const fetchBuildings = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      setError(null);
      const list = await api.getBuildings(activeProject.id);
      setBuildings(list);
      if (list.length > 0) {
        const targetId = list.find(building => building.id === selectedBuildingId)?.id || list[0].id;
        setSelectedBuildingId(targetId);
        loadBuildingAnalysis(targetId);
      } else {
        setSelectedBuildingId(null);
        setDetailedAnalysis(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load buildings.');
    } finally {
      setLoading(false);
    }
  };

  const loadBuildingAnalysis = async (buildingId: string) => {
    const version = ++analysisRequest.current;
    setDetailedAnalysis(null);
    try {
      const data = await api.getSolarAnalysis(buildingId);
      if (version === analysisRequest.current) setDetailedAnalysis(data);
    } catch (err) {
      if (version === analysisRequest.current) setError(err instanceof Error ? err.message : 'Could not load solar analysis.');
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, [activeProject?.id]);

  const handleSelectBuilding = (id: string) => {
    setSelectedBuildingId(id);
    loadBuildingAnalysis(id);
  };

  const handleRecalculate = async (b: Building, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setRecalculatingId(b.id);
      await api.triggerSolarAnalysis(b.id);
      await fetchBuildings();
      if (selectedBuildingId === b.id) {
        await loadBuildingAnalysis(b.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecalculatingId(null);
    }
  };

  const handleDelete = async (b: Building, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${b.name}?`)) return;
    try {
      await api.deleteBuilding(b.id);
      if (selectedBuildingId === b.id) setSelectedBuildingId(null);
      await fetchBuildings();
      await refreshProjects();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicate = async (b: Building, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.duplicateBuilding(b.id);
      await fetchBuildings();
      await refreshProjects();
    } catch (err) {
      console.error(err);
    }
  };

  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">{error}</div>}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-700" />
            <span>Building Portfolio & Shading Derate Catalog</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure rooftop dimensions, structural tilt, azimuth angles, and diurnal consumption profiles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingBuilding(null);
              setIsEditorOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Facility</span>
          </button>
          <button
            onClick={() => navigate('/optimize')}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <span>Proceed to Solver</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Buildings Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {buildings.map((b) => {
          const isSelected = b.id === selectedBuildingId;
          const sa = b.solar_analysis;
          const isRecalculating = recalculatingId === b.id;

          return (
            <div
              key={b.id}
              onClick={() => handleSelectBuilding(b.id)}
              className={`p-5 rounded-xl border transition-all cursor-pointer relative bg-white flex flex-col justify-between shadow-xs ${
                isSelected
                  ? 'border-slate-800 ring-1 ring-slate-800 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {b.category}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mt-1">{b.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      b.shading_category === 'High'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : b.shading_category === 'Medium'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {b.shading_category} Shade
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 my-2">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Usable Roof:</span>
                    <strong className="text-slate-900 tabular-nums">{formatArea(b.usable_roof_area)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Monthly Load:</span>
                    <strong className="text-slate-900 tabular-nums">{formatEnergy(b.monthly_consumption_kwh)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Eligible Solar:</span>
                    <strong className="text-slate-900 tabular-nums">{formatPower(sa?.max_pv_capacity_kwp)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Est. Annual Gen:</span>
                    <strong className="text-slate-900 tabular-nums">{formatEnergy(sa?.annual_generation_kwh)}</strong>
                  </div>
                </div>

                {sa && (
                  <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                    <span>Est. Savings: <strong className="text-emerald-700 tabular-nums">{formatINR(sa.annual_savings_inr)}/yr</strong></span>
                    <span>Payback: <strong className="tabular-nums">{sa.simple_payback_years ? `${sa.simple_payback_years}y` : '—'}</strong></span>
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  {isSelected ? 'Active Selection' : 'Click to View Analytics'}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleRecalculate(b, e)}
                    disabled={isRecalculating}
                    title="Recalculate Solar Potential"
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingBuilding(b);
                      setIsEditorOpen(true);
                    }}
                    title="Edit Building"
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDuplicate(b, e)}
                    title="Duplicate"
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(b, e)}
                    title="Delete"
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Building Deep Dive */}
      {selectedBuilding && detailedAnalysis && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {selectedBuilding.name} — Solar Physics & Economic Assessment
                </h3>
                <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded border border-slate-200">
                  {detailedAnalysis.irradiance_source}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated with {(detailedAnalysis.performance_ratio * 100).toFixed(0)}% PR, {detailedAnalysis.effective_shading_loss_pct}% shading derate factor.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Avoided Carbon Offset</span>
              <strong className="text-sm text-emerald-700 font-bold tabular-nums">
                {formatCO2(detailedAnalysis.avoided_co2_kg_annual)}
              </strong>
            </div>
          </div>

          {/* 12-Month Solar Generation vs Consumption Chart */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                12-Month Generation vs Consumption Profile (kWh)
              </h4>
              <span className="text-xs text-slate-500 tabular-nums">
                Peak Specific Yield: {detailedAnalysis.specific_yield_kwh_per_kwp} kWh/kWp
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={detailedAnalysis.monthly_breakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#CBD5E1" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} stroke="#CBD5E1" />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toLocaleString()} kWh`]}
                    contentStyle={{ fontSize: '12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="generation_kwh" name="Solar Output (kWh)" fill="#059669" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="consumption_kwh" name="Facility Demand (kWh)" fill="#475569" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Engineering Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">GHI Annual Climatology</span>
              <strong className="text-slate-900 text-xs tabular-nums">{detailedAnalysis.ghi_annual_avg_kwh_m2_day} kWh/m²/day</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">On-Site Self-Consumption</span>
              <strong className="text-slate-900 text-xs tabular-nums">{formatPct(detailedAnalysis.onsite_utilization_pct)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Turnkey Capex Estimate</span>
              <strong className="text-slate-900 text-xs tabular-nums">{formatINR(detailedAnalysis.installation_cost_inr)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Annual Bill Reduction</span>
              <strong className="text-emerald-700 text-xs tabular-nums">{formatINR(detailedAnalysis.annual_savings_inr)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && activeProject && (
        <BuildingEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          building={editingBuilding}
          projectId={activeProject.id}
          onSaved={() => {
            void refreshProjects();
            fetchBuildings();
          }}
        />
      )}
    </div>
  );
};
