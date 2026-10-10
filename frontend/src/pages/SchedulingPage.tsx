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
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Smart Electricity Load Shifting</span>
            </h2>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-200/60">
              Demand Flexibility
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch flexible campus electrical loads into solar generation windows to minimize grid imports and eliminate curtailment.
          </p>
        </div>

        <button
          onClick={() => navigate('/recommendations')}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors"
        >
          <span>View Optimization Actions</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Quantified Gain Highlights */}
      {scheduleResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Additional Solar Absorbed</span>
            <div className="text-2xl font-semibold text-slate-900 tabular-nums font-mono mt-1">
              {formatEnergy(scheduleResult.annual_solar_absorption_gain_kwh)}
            </div>
            <div className="text-[11px] text-emerald-700 mt-1 font-medium flex items-center gap-1">
              <span>+{scheduleResult.daily_solar_absorption_gain_kwh} kWh/day self-consumed</span>
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Annual Financial Gain</span>
            <div className="text-2xl font-semibold text-emerald-700 tabular-nums font-mono mt-1">
              {formatINR(scheduleResult.annual_financial_gain_inr)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Avoided peak grid purchases</div>
          </div>

          <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Emissions Reduction</span>
            <div className="text-2xl font-semibold text-slate-900 tabular-nums font-mono mt-1">
              {formatCO2(scheduleResult.co2_reduction_gain_kg)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Annual avoided carbon offset</div>
          </div>

          <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Daily Surplus Curtailed</span>
            <div className="text-2xl font-semibold text-amber-700 tabular-nums font-mono mt-1">
              {scheduleResult.daily_surplus_before_kwh} &rarr; {scheduleResult.daily_surplus_after_kwh} <span className="text-xs font-normal text-slate-500 font-sans">kWh</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Reduced unused solar feed-in</div>
          </div>
        </div>
      )}

      {/* Diurnal Load Curve Before vs After Shifting */}
      {scheduleResult && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Diurnal Load Profile: Baseline vs. Optimized Load (kW)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dispatch aligns flexible campus equipment under the midday solar production bell curve.
              </p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded border border-slate-200">
              Peak Coincidence Optimization
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scheduleResult.hourly_comparison} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="time_label" tick={{ fontSize: 10, fill: '#64748B' }} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} label={{ value: 'kW', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} kW`]}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#F8FAFC', borderRadius: '6px', border: 'none', fontSize: '11px' }}
                  itemStyle={{ color: '#F8FAFC' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="solar_generation_kw"
                  name="Solar Generation (kW)"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="baseline_load_kw"
                  name="Baseline Load (kW)"
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="shifted_load_kw"
                  name="Optimized Load (kW)"
                  stroke="#0F172A"
                  strokeWidth={2}
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
              <h3 className="text-sm font-semibold text-slate-900">
                Shiftable Asset Recommendations ({scheduleResult?.recommendations.length || 0})
              </h3>
              <p className="text-xs text-slate-500">Dispatch instructions ranked by solar absorption potential</p>
            </div>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              <span>Register Flexible Load</span>
            </button>
          </div>

          {/* Add form */}
          {isAdding && (
            <form onSubmit={handleAddActivity} className="bg-white p-5 rounded-lg border border-slate-300 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Register Campus Load Asset
                </h4>
                <span className="text-[11px] text-slate-500">Flexible equipment dispatch</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Equipment Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. EV Fleet Charging, Borewell Pump"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Power Draw (kW) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={newPower}
                    onChange={(e) => setNewPower(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Duration (Hours) *</label>
                  <input
                    type="number"
                    min="0.5"
                    max="12"
                    step="0.5"
                    required
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Current Preferred Hour (0-23)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={newPreferred}
                    onChange={(e) => setNewPreferred(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Operating Days / Week</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={newDays}
                    onChange={(e) => setNewDays(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-2xs transition-colors"
                >
                  Save & Reschedule
                </button>
              </div>
            </form>
          )}

          {/* Cards */}
          <div className="space-y-3">
            {scheduleResult?.recommendations.map((rec) => (
              <div key={rec.activity_id} className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
                <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-slate-900">{rec.activity_name}</h4>
                      <span className="text-[10px] font-mono font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        {rec.power_kw} kW • {rec.duration_hours}h
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{rec.building_name}</div>
                  </div>

                  <button
                    onClick={() => handleDeleteActivity(rec.activity_id)}
                    title="Remove activity"
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Timing Shift Comparison */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <span className="text-slate-500 text-[11px] block font-medium uppercase tracking-wider">Current Baseline Window</span>
                    <strong className="text-slate-700 text-sm font-mono mt-0.5 block">{rec.original_window}</strong>
                    <div className="text-[10px] text-slate-400 mt-0.5">Off-peak / unoptimized slot</div>
                  </div>

                  <div className="p-3 bg-emerald-50/50 rounded border border-emerald-200/60">
                    <span className="text-emerald-800 text-[11px] block font-medium uppercase tracking-wider">Recommended Solar Window</span>
                    <strong className="text-emerald-900 text-sm font-mono mt-0.5 block">{rec.recommended_window}</strong>
                    <div className="text-[10px] text-emerald-700 mt-0.5">Coincides with peak surplus generation</div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded border border-slate-150 space-y-1">
                  <p className="font-normal">{rec.reason}</p>
                  {rec.practical_notes && (
                    <p className="text-[11px] text-slate-500 italic">{rec.practical_notes}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-600">
                    Additional Absorbed: <strong className="text-slate-900 font-mono">+{rec.additional_solar_absorbed_kwh} kWh/session</strong>
                  </span>
                  <span className="text-slate-600">
                    Annual Savings: <strong className="text-emerald-700 font-mono">{formatINR(rec.estimated_annual_savings_inr)}/yr</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Practical Implementation Guidelines */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              Load Shifting Protocol
            </h4>

            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <strong className="text-slate-900 block mb-0.5 font-medium">Electric Vehicle Fleets:</strong>
                Program charging controllers to activate automatically between 10:30 AM and 02:30 PM while campus transport is docked.
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <strong className="text-slate-900 block mb-0.5 font-medium">Water Distribution Pumps:</strong>
                Fill overhead campus reservoirs during peak solar hours instead of early dawn or night tariffs.
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <strong className="text-slate-900 block mb-0.5 font-medium">HVAC Chiller Pre-Cooling:</strong>
                Sub-cool central academic wings by 1–2°C during high solar irradiance to float through 03:00–06:00 PM peak tariff windows.
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50/70 border border-amber-200/60 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold text-amber-950">Operational Engineering Note:</strong>
              <p className="text-[11px] leading-relaxed text-amber-900">
                {scheduleResult?.disclaimer}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
