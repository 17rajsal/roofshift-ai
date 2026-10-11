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
      {error && <div role="alert" className="rounded-2xl border border-red-200/80 bg-red-50/80 backdrop-blur-md p-4 text-xs text-red-800 shadow-sm">{error}</div>}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF6B16] border border-orange-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-[#0B1739] tracking-tight">
              Building Portfolio &amp; Shading Derate Catalog
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#61708A] ml-11">
            Configure rooftop dimensions, structural tilt, azimuth angles, and diurnal consumption profiles.
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => {
              setEditingBuilding(null);
              setIsEditorOpen(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/80 hover:bg-white text-[#0B1739] border border-white/80 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-md"
          >
            <Plus className="w-4 h-4 text-[#FF6B16]" />
            <span>Add Facility</span>
          </button>
          <button
            onClick={() => navigate('/optimize')}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#FF6B16] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
          >
            <span>Proceed to Solver</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Buildings Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {buildings.map((b) => {
          const isSelected = b.id === selectedBuildingId;
          const sa = b.solar_analysis;
          const isRecalculating = recalculatingId === b.id;

          return (
            <div
              key={b.id}
              onClick={() => handleSelectBuilding(b.id)}
              className={`p-6 rounded-3xl transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'glass-elevated border-[#FF6B16] ring-2 ring-[#FF6B16]/20 shadow-lg scale-[1.01]'
                  : 'glass-panel hover:border-white/90 hover:shadow-md hover:scale-[1.005]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/80 text-[#0B1739] px-2.5 py-1 rounded-lg border border-white/80 shadow-2xs">
                      {b.category}
                    </span>
                    <h3 className="font-extrabold text-base text-[#0B1739] mt-2 tracking-tight">{b.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border shadow-2xs ${
                      b.shading_category === 'High'
                        ? 'bg-red-500/10 text-red-700 border-red-500/20'
                        : b.shading_category === 'Medium'
                        ? 'bg-amber-500/10 text-amber-800 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                    }`}
                  >
                    {b.shading_category} Shade
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs py-3.5 px-3 rounded-2xl glass-surface-secondary my-3 border border-white/60">
                  <div>
                    <span className="text-[#61708A] text-[10px] font-semibold block">Usable Roof</span>
                    <strong className="text-[#0B1739] font-bold tabular-nums text-xs">{formatArea(b.usable_roof_area)}</strong>
                  </div>
                  <div>
                    <span className="text-[#61708A] text-[10px] font-semibold block">Monthly Load</span>
                    <strong className="text-[#0B1739] font-bold tabular-nums text-xs">{formatEnergy(b.monthly_consumption_kwh)}</strong>
                  </div>
                  <div>
                    <span className="text-[#61708A] text-[10px] font-semibold block">Eligible Solar</span>
                    <strong className="text-[#FF6B16] font-bold tabular-nums text-xs">{formatPower(sa?.max_pv_capacity_kwp)}</strong>
                  </div>
                  <div>
                    <span className="text-[#61708A] text-[10px] font-semibold block">Est. Annual Gen</span>
                    <strong className="text-[#0B1739] font-bold tabular-nums text-xs">{formatEnergy(sa?.annual_generation_kwh)}</strong>
                  </div>
                </div>

                {sa && (
                  <div className="text-xs text-[#61708A] flex items-center justify-between pt-1">
                    <span>Est. Savings: <strong className="text-[#16A34A] font-extrabold tabular-nums">{formatINR(sa.annual_savings_inr)}/yr</strong></span>
                    <span>Payback: <strong className="text-[#0B1739] font-bold tabular-nums">{sa.simple_payback_years ? `${sa.simple_payback_years}y` : '—'}</strong></span>
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${isSelected ? 'text-[#FF6B16]' : 'text-[#61708A]'}`}>
                  {isSelected ? '✓ Active Selection' : 'Click to View Analytics'}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => handleRecalculate(b, e)}
                    disabled={isRecalculating}
                    title="Recalculate Solar Potential"
                    className="p-2 text-[#61708A] hover:text-[#0B1739] rounded-xl hover:bg-white/80 transition-colors border border-transparent hover:border-white/80"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin text-[#FF6B16]' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingBuilding(b);
                      setIsEditorOpen(true);
                    }}
                    title="Edit Building"
                    className="p-2 text-[#61708A] hover:text-[#0B1739] rounded-xl hover:bg-white/80 transition-colors border border-transparent hover:border-white/80"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDuplicate(b, e)}
                    title="Duplicate"
                    className="p-2 text-[#61708A] hover:text-[#0B1739] rounded-xl hover:bg-white/80 transition-colors border border-transparent hover:border-white/80"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(b, e)}
                    title="Delete"
                    className="p-2 text-[#61708A] hover:text-red-600 rounded-xl hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
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
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200/50 pb-5 gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-[#0B1739] tracking-tight">
                  {selectedBuilding.name} — Solar Physics &amp; Economic Assessment
                </h3>
                <span className="text-[10px] bg-white/80 text-[#0B1739] font-mono font-bold px-2.5 py-1 rounded-lg border border-white/80 shadow-2xs">
                  {detailedAnalysis.irradiance_source}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#61708A] mt-1">
                Evaluated with {(detailedAnalysis.performance_ratio * 100).toFixed(0)}% PR, {detailedAnalysis.effective_shading_loss_pct}% shading derate factor.
              </p>
            </div>
            <div className="text-left sm:text-right bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-2xl">
              <span className="text-[11px] font-semibold text-[#61708A] block">Avoided Carbon Offset</span>
              <strong className="text-base text-[#16A34A] font-black tabular-nums">
                {formatCO2(detailedAnalysis.avoided_co2_kg_annual)}
              </strong>
            </div>
          </div>

          {/* 12-Month Solar Generation vs Consumption Chart */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#FF6B16]" />
                <span>12-Month Generation vs Consumption Profile (kWh)</span>
              </h4>
              <span className="text-xs font-bold text-[#61708A] tabular-nums">
                Peak Specific Yield: {detailedAnalysis.specific_yield_kwh_per_kwp} kWh/kWp
              </span>
            </div>

            <div className="h-72 w-full p-4 rounded-2xl glass-surface-secondary border border-white/60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={detailedAnalysis.monthly_breakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="rgba(200, 215, 235, 0.4)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#61708A' }} stroke="#CBD5E1" />
                  <YAxis tick={{ fontSize: 11, fill: '#61708A' }} stroke="#CBD5E1" />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toLocaleString()} kWh`]}
                    contentStyle={{ fontSize: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.9)', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="generation_kwh" name="Solar Output (kWh)" fill="#FF6B16" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="consumption_kwh" name="Facility Demand (kWh)" fill="#0B1739" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Engineering Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl glass-surface-secondary border border-white/60 text-xs">
            <div>
              <span className="text-[#61708A] block text-[11px] font-semibold">GHI Annual Climatology</span>
              <strong className="text-[#0B1739] text-sm font-black tabular-nums">{detailedAnalysis.ghi_annual_avg_kwh_m2_day} kWh/m²/day</strong>
            </div>
            <div>
              <span className="text-[#61708A] block text-[11px] font-semibold">On-Site Self-Consumption</span>
              <strong className="text-[#0B1739] text-sm font-black tabular-nums">{formatPct(detailedAnalysis.onsite_utilization_pct)}</strong>
            </div>
            <div>
              <span className="text-[#61708A] block text-[11px] font-semibold">Turnkey Capex Estimate</span>
              <strong className="text-[#0B1739] text-sm font-black tabular-nums">{formatINR(detailedAnalysis.installation_cost_inr)}</strong>
            </div>
            <div>
              <span className="text-[#61708A] block text-[11px] font-semibold">Annual Bill Reduction</span>
              <strong className="text-[#16A34A] text-sm font-black tabular-nums">{formatINR(detailedAnalysis.annual_savings_inr)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Part E: Next Step Navigation */}
      <div className="flex items-center justify-between p-5 rounded-3xl glass-panel">
        <div>
          <div className="text-xs font-bold text-[#0B1739]">Next Recommended Step</div>
          <div className="text-xs text-[#61708A]">Proceed to Knapsack Budget Optimization to solve for optimal capital allocation.</div>
        </div>
        <button
          onClick={() => navigate('/optimizer')}
          className="glass-button-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <span>Proceed to Budget Optimizer</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

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
