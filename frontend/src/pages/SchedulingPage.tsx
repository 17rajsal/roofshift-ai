import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { EnergyActivity, SchedulingOptimizationResponse } from '../types/models';
import { api } from '../services/api';
import {
  formatEnergy,
  formatINR,
  formatPower,
  formatCO2,
} from '../utils/formatters';
import {
  Clock,
  Plus,
  Zap,
  TrendingUp,
  ArrowRight,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const SchedulingPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const [activities, setActivities] = useState<EnergyActivity[]>([]);
  const [scheduleResult, setScheduleResult] = useState<SchedulingOptimizationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // New activity form states
  const [newName, setNewName] = useState('');
  const [newPower, setNewPower] = useState(15);
  const [newDuration, setNewDuration] = useState(3);
  const [newEarliest, setNewEarliest] = useState(9);
  const [newLatest, setNewLatest] = useState(17);
  const [newPreferred, setNewPreferred] = useState(18);
  const [newDays, setNewDays] = useState(6);

  useEffect(() => {
    if (activeProject) {
      loadData();
    }
  }, [activeProject]);

  const loadData = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      const actList = await api.getActivities(activeProject.id);
      setActivities(actList);

      const res = await api.optimizeSchedule(activeProject.id);
      setScheduleResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newName.trim()) return;

    try {
      await api.createActivity(activeProject.id, {
        name: newName,
        power_kw: newPower,
        duration_hours: newDuration,
        earliest_hour: newEarliest,
        latest_hour: newLatest,
        preferred_hour: newPreferred,
        days_per_week: newDays,
        is_shiftable: true,
      });

      setNewName('');
      setIsAdding(false);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      await api.deleteActivity(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-orange-500/15 text-[#FF6B16] border border-orange-500/20">
              <Clock className="w-4 h-4 text-[#FF6B16]" />
            </span>
            <h2 className="text-lg font-bold text-[#0B1739] tracking-tight flex items-center gap-2">
              <span>Smart Electricity Load Shifting</span>
            </h2>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-amber-500/15 text-amber-800 border-amber-500/25">
              Demand Flexibility
            </span>
          </div>
          <p className="text-xs text-[#61708A] mt-1.5 leading-relaxed">
            Dispatch flexible campus electrical loads into solar generation windows to minimize grid imports and eliminate curtailment.
          </p>
        </div>

        <button
          onClick={() => navigate('/recommendations')}
          className="glass-button-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <span>View Optimization Actions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quantified Gain Highlights */}
      {scheduleResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
            <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Additional Solar Absorbed</span>
            <div className="text-2xl font-bold text-[#0B1739] tabular-nums font-mono mt-1">
              {formatEnergy(scheduleResult.annual_solar_absorption_gain_kwh)}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
              <span>+{scheduleResult.daily_solar_absorption_gain_kwh} kWh/day self-consumed</span>
            </div>
          </div>

          <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
            <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Annual Financial Gain</span>
            <div className="text-2xl font-bold text-emerald-600 tabular-nums font-mono mt-1">
              {formatINR(scheduleResult.annual_financial_gain_inr)}
            </div>
            <div className="text-[11px] text-[#61708A] mt-1 font-medium">Avoided peak grid purchases</div>
          </div>

          <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
            <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Emissions Reduction</span>
            <div className="text-2xl font-bold text-[#0B1739] tabular-nums font-mono mt-1">
              {formatCO2(scheduleResult.co2_reduction_gain_kg)}
            </div>
            <div className="text-[11px] text-[#61708A] mt-1 font-medium">Annual avoided carbon offset</div>
          </div>

          <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
            <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Daily Surplus Curtailed</span>
            <div className="text-2xl font-bold text-[#FF6B16] tabular-nums font-mono mt-1">
              {scheduleResult.daily_surplus_before_kwh} &rarr; {scheduleResult.daily_surplus_after_kwh} <span className="text-xs font-normal text-[#61708A] font-sans">kWh</span>
            </div>
            <div className="text-[11px] text-[#61708A] mt-1 font-medium">Reduced unused solar feed-in</div>
          </div>
        </div>
      )}

      {/* Diurnal Load Curve Before vs After Shifting */}
      {scheduleResult && (
        <div className="glass-panel rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/40 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0B1739] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Diurnal Load Profile: Baseline vs. Optimized Load (kW)</span>
              </h3>
              <p className="text-xs text-[#61708A] mt-0.5">
                Dispatch aligns flexible campus equipment under the midday solar production bell curve.
              </p>
            </div>
            <span className="text-xs glass-surface-secondary text-[#0B1739] font-bold px-3 py-1 rounded-xl border border-white/60">
              Peak Coincidence Optimization
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scheduleResult.hourly_comparison} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(24, 45, 80, 0.06)" vertical={false} />
                <XAxis dataKey="time_label" tick={{ fontSize: 10, fill: '#61708A' }} stroke="rgba(24, 45, 80, 0.2)" interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#61708A' }} stroke="rgba(24, 45, 80, 0.2)" label={{ value: 'kW', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#61708A' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} kW`]}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', color: '#0B1739', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.8)', fontSize: '11px', boxShadow: '0 8px 24px rgba(24,45,80,0.1)' }}
                  itemStyle={{ color: '#0B1739' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="solar_generation_kw"
                  name="Solar Generation (kW)"
                  stroke="#16A34A"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="baseline_load_kw"
                  name="Baseline Load (kW)"
                  stroke="#61708A"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="shifted_load_kw"
                  name="Optimized Load (kW)"
                  stroke="#FF6B16"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Shiftable Activities List & Add Activity Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Shift Recommendations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0B1739]">
                Shiftable Asset Recommendations ({scheduleResult?.recommendations.length || 0})
              </h3>
              <p className="text-xs text-[#61708A]">Dispatch instructions ranked by solar absorption potential</p>
            </div>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="glass-button-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Flexible Load</span>
            </button>
          </div>

          {/* Add form */}
          {isAdding && (
            <form onSubmit={handleAddActivity} className="glass-panel p-6 rounded-3xl border border-white/80 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/40 pb-2.5">
                <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">
                  Register Campus Load Asset
                </h4>
                <span className="text-[11px] text-[#61708A]">Flexible equipment dispatch</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block text-[#0B1739] font-bold mb-1">Equipment Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. EV Fleet Charging, Borewell Pump"
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-[#0B1739] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#0B1739] font-bold mb-1">Power Draw (kW) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={newPower}
                    onChange={(e) => setNewPower(Number(e.target.value))}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-[#0B1739] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#0B1739] font-bold mb-1">Duration (Hours) *</label>
                  <input
                    type="number"
                    min="0.5"
                    max="12"
                    step="0.5"
                    required
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-[#0B1739] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#0B1739] font-bold mb-1">Current Preferred Hour (0-23)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={newPreferred}
                    onChange={(e) => setNewPreferred(Number(e.target.value))}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-[#0B1739] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#0B1739] font-bold mb-1">Operating Days / Week</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={newDays}
                    onChange={(e) => setNewDays(Number(e.target.value))}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-[#0B1739] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/40">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="glass-button-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button-primary px-4 py-2 text-xs font-bold shadow-md cursor-pointer"
                >
                  Save &amp; Reschedule
                </button>
              </div>
            </form>
          )}

          {/* Cards */}
          <div className="space-y-3.5">
            {scheduleResult?.recommendations.map((rec) => (
              <div key={rec.activity_id} className="glass-panel rounded-2xl p-5 shadow-md space-y-3.5">
                <div className="flex items-start justify-between border-b border-white/40 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-[#0B1739]">{rec.activity_name}</h4>
                      <span className="text-[10px] font-mono font-bold bg-white/70 text-[#0B1739] px-2.5 py-0.5 rounded-lg border border-white/80">
                        {rec.power_kw} kW • {rec.duration_hours}h
                      </span>
                    </div>
                    <div className="text-xs text-[#61708A] mt-0.5 font-medium">{rec.building_name}</div>
                  </div>

                  <button
                    onClick={() => handleDeleteActivity(rec.activity_id)}
                    title="Remove activity"
                    className="p-1.5 text-[#61708A] hover:text-rose-600 rounded-xl hover:bg-rose-50/60 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Timing Shift Comparison */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 glass-surface-secondary rounded-2xl border border-white/60">
                    <span className="text-[#61708A] text-[10px] block font-bold uppercase tracking-wider">Current Baseline Window</span>
                    <strong className="text-[#0B1739] text-sm font-mono mt-0.5 block">{rec.original_window}</strong>
                    <div className="text-[10px] text-[#61708A] mt-0.5 font-medium">Off-peak / unoptimized slot</div>
                  </div>

                  <div className="p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/25">
                    <span className="text-emerald-800 text-[10px] block font-bold uppercase tracking-wider">Recommended Solar Window</span>
                    <strong className="text-emerald-950 text-sm font-mono mt-0.5 block">{rec.recommended_window}</strong>
                    <div className="text-[10px] text-emerald-700 mt-0.5 font-medium">Coincides with peak surplus generation</div>
                  </div>
                </div>

                <div className="text-xs text-[#61708A] glass-surface-secondary p-3.5 rounded-2xl border border-white/60 space-y-1">
                  <p className="font-medium text-[#0B1739]">{rec.reason}</p>
                  {rec.practical_notes && (
                    <p className="text-[11px] text-[#61708A] italic">{rec.practical_notes}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/40">
                  <span className="text-[#61708A]">
                    Additional Absorbed: <strong className="text-[#0B1739] font-mono">+{rec.additional_solar_absorbed_kwh} kWh/session</strong>
                  </span>
                  <span className="text-[#61708A]">
                    Annual Savings: <strong className="text-emerald-600 font-mono font-bold">{formatINR(rec.estimated_annual_savings_inr)}/yr</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Practical Implementation Guidelines */}
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl p-6 shadow-xl space-y-3.5">
            <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#FF6B16]" />
              <span>Load Shifting Protocol</span>
            </h4>

            <div className="space-y-3 text-xs text-[#61708A] leading-relaxed">
              <div className="p-3.5 glass-surface-secondary rounded-2xl border border-white/60">
                <strong className="text-[#0B1739] block mb-0.5 font-bold">Electric Vehicle Fleets:</strong>
                Program charging controllers to activate automatically between 10:30 AM and 02:30 PM while campus transport is docked.
              </div>
              <div className="p-3.5 glass-surface-secondary rounded-2xl border border-white/60">
                <strong className="text-[#0B1739] block mb-0.5 font-bold">Water Distribution Pumps:</strong>
                Fill overhead campus reservoirs during peak solar hours instead of early dawn or night tariffs.
              </div>
              <div className="p-3.5 glass-surface-secondary rounded-2xl border border-white/60">
                <strong className="text-[#0B1739] block mb-0.5 font-bold">HVAC Chiller Pre-Cooling:</strong>
                Sub-cool central academic wings by 1–2°C during high solar irradiance to float through 03:00–06:00 PM peak tariff windows.
              </div>
            </div>
          </div>

          <div className="p-4.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs text-amber-950 flex items-start gap-3 shadow-xs">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold text-amber-950">Operational Engineering Note:</strong>
              <p className="text-[11px] leading-relaxed text-amber-900">
                {scheduleResult?.disclaimer}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Part E: Next Step Navigation */}
      <div className="flex items-center justify-between p-5 rounded-3xl glass-panel">
        <div>
          <div className="text-xs font-bold text-[#0B1739]">Next Recommended Step</div>
          <div className="text-xs text-[#61708A]">Review deterministic decision intelligence and phased rollout advisory.</div>
        </div>
        <button
          onClick={() => navigate('/recommendations')}
          className="glass-button-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <span>View Optimization Recommendations</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
