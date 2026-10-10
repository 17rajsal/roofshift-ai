import React, { useState, useEffect } from 'react';
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
  const { activeProject } = useProject();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [detailedAnalysis, setDetailedAnalysis] = useState<SolarAnalysisFull | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(false);
  const [recalculatingId, setRecalculatingId] = useState<string | null>(null);

  const fetchBuildings = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      const list = await api.getBuildings(activeProject.id);
      setBuildings(list);
      if (list.length > 0) {
        const targetId = selectedBuildingId || list[0].id;
        setSelectedBuildingId(targetId);
        loadBuildingAnalysis(targetId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBuildingAnalysis = async (buildingId: string) => {
    try {
      const data = await api.getSolarAnalysis(buildingId);
      setDetailedAnalysis(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, [activeProject]);

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
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicate = async (b: Building, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.duplicateBuilding(b.id);
      await fetchBuildings();
    } catch (err) {
      console.error(err);
    }
  };

  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5EAE7] shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#17231F] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <span>Candidate Building Profiles & Demand</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure rooftop dimensions, shading derates, and electricity demand for each facility.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingBuilding(null);
              setIsEditorOpen(true);
            }}
            className="px-4 py-2 bg-[#123C32] hover:bg-[#0B251F] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rooftop</span>
          </button>
          <button
            onClick={() => navigate('/optimize')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span>Run Budget Solver</span>
            <ArrowRight className="w-4 h-4" />
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
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative bg-white flex flex-col justify-between shadow-xs ${
                isSelected
                  ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                  : 'border-[#E5EAE7] hover:border-emerald-400/50 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {b.category}
                    </span>
                    <h3 className="font-bold text-base text-[#123C32] mt-1">{b.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      b.shading_category === 'High'
                        ? 'bg-red-100 text-red-800'
                        : b.shading_category === 'Medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {b.shading_category} Shade
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 my-2">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Usable Roof:</span>
                    <strong className="text-slate-800">{formatArea(b.usable_roof_area)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Monthly Load:</span>
                    <strong className="text-slate-800">{formatEnergy(b.monthly_consumption_kwh)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Eligible Solar:</span>
                    <strong className="text-emerald-700">{formatPower(sa?.max_pv_capacity_kwp)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Est. Annual Gen:</span>
                    <strong className="text-emerald-700">{formatEnergy(sa?.annual_generation_kwh)}</strong>
                  </div>
                </div>

                {sa && (
                  <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                    <span>Est. Savings: <strong className="text-emerald-800">{formatINR(sa.annual_savings_inr)}/yr</strong></span>
                    <span>Payback: <strong>{sa.simple_payback_years ? `${sa.simple_payback_years}y` : '—'}</strong></span>
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  {isSelected ? 'Currently Selected' : 'Click to View Analytics'}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => handleRecalculate(b, e)}
                    disabled={isRecalculating}
                    title="Recalculate Solar Potential"
                    className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-md hover:bg-emerald-50 transition-colors"
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
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDuplicate(b, e)}
                    title="Duplicate"
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(b, e)}
                    title="Delete"
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
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
        <div className="bg-white rounded-2xl border border-[#E5EAE7] p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#123C32]">
                  {selectedBuilding.name} — Solar Physics & Economic Assessment
                </h3>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                  {detailedAnalysis.irradiance_source}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated with {detailedAnalysis.performance_ratio * 100}% PR, {detailedAnalysis.effective_shading_loss_pct}% shading derate factor.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Avoided Carbon Offset</span>
              <strong className="text-sm text-emerald-700 font-bold">
                {formatCO2(detailedAnalysis.avoided_co2_kg_annual)}
              </strong>
            </div>
          </div>

          {/* 12-Month Solar Generation vs Consumption Chart */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-[#123C32] uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                12-Month Generation vs Consumption Profile (kWh)
              </h4>
              <span className="text-xs text-slate-500">
                Peak Yield: {detailedAnalysis.specific_yield_kwh_per_kwp} kWh/kWp
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={detailedAnalysis.monthly_breakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toLocaleString()} kWh`]}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="generation_kwh" name="Solar Generation (kWh)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="consumption_kwh" name="Building Load (kWh)" fill="#64748B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Engineering Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-500 block">GHI Annual Climatology</span>
              <strong className="text-slate-800 text-sm">{detailedAnalysis.ghi_annual_avg_kwh_m2_day} kWh/m²/day</strong>
            </div>
            <div>
              <span className="text-slate-500 block">On-Site Utilization</span>
              <strong className="text-slate-800 text-sm">{formatPct(detailedAnalysis.onsite_utilization_pct)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Turnkey Capex Estimate</span>
              <strong className="text-slate-800 text-sm">{formatINR(detailedAnalysis.installation_cost_inr)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Annual Bill Reduction</span>
              <strong className="text-emerald-700 text-sm">{formatINR(detailedAnalysis.annual_savings_inr)}</strong>
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
            fetchBuildings();
          }}
        />
      )}
    </div>
  );
};
