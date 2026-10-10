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
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5EAE7] shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#17231F] flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <span>Smart Electricity Load Shifting</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Shift flexible campus electrical equipment into peak solar daylight hours to maximize self-consumption.
          </p>
        </div>

        <button
          onClick={() => navigate('/recommendations')}
          className="px-4 py-2 bg-[#123C32] hover:bg-[#0B251F] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <span>View Smart Recommendations</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quantified Gain Highlights */}
      {scheduleResult && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E5EAE7] shadow-xs">
            <span className="text-xs text-slate-500 block">Additional Solar Absorbed</span>
            <strong className="text-xl font-extrabold text-[#123C32]">
              {formatEnergy(scheduleResult.annual_solar_absorption_gain_kwh)}
            </strong>
            <div className="text-[11px] text-emerald-700 mt-1 font-semibold">
              +{scheduleResult.daily_solar_absorption_gain_kwh} kWh / day displaced
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5EAE7] shadow-xs">
            <span className="text-xs text-slate-500 block">Annual Financial Benefit</span>
            <strong className="text-xl font-extrabold text-emerald-700">
              {formatINR(scheduleResult.annual_financial_gain_inr)}
            </strong>
            <div className="text-[11px] text-slate-500 mt-1">Displaces peak grid purchases</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5EAE7] shadow-xs">
            <span className="text-xs text-slate-500 block">Emissions Reduction</span>
            <strong className="text-xl font-extrabold text-emerald-700">
              {formatCO2(scheduleResult.co2_reduction_gain_kg)}
            </strong>
            <div className="text-[11px] text-slate-500 mt-1">Annual avoided carbon</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E5EAE7] shadow-xs">
            <span className="text-xs text-slate-500 block">Surplus Reduction</span>
            <strong className="text-xl font-extrabold text-amber-600">
              {scheduleResult.daily_surplus_before_kwh} &rarr; {scheduleResult.daily_surplus_after_kwh} kWh
            </strong>
            <div className="text-[11px] text-slate-500 mt-1">Daily unused solar surplus curtailed</div>
          </div>
        </div>
      )}

      {/* Diurnal Load Curve Before vs After Shifting */}
      {scheduleResult && (
        <div className="bg-white rounded-2xl border border-[#E5EAE7] p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#123C32] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Diurnal Load Profile: Before vs After Smart Load Shifting (kW)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Notice the electrical demand peak moving directly under the midday solar production bell curve.
              </p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2.5 py-1 rounded-md border border-emerald-200">
              Peak Coincidence Optimization
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scheduleResult.hourly_comparison} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time_label" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: 'kW', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${val} kW`]}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="solar_generation_kw"
                  name="Solar Generation (kW)"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="baseline_load_kw"
                  name="Baseline Load (Before)"
                  stroke="#94A3B8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="shifted_load_kw"
                  name="Optimized Load (After Shifting)"
                  stroke="#123C32"
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
            <h3 className="text-sm font-bold text-[#17231F]">
              Shiftable Activity Recommendations ({scheduleResult?.recommendations.length || 0})
            </h3>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-1.5 bg-[#123C32] text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Shiftable Load</span>
            </button>
          </div>

          {/* Add form */}
          {isAdding && (
            <form onSubmit={handleAddActivity} className="bg-white p-5 rounded-2xl border border-emerald-300 shadow-md space-y-4">
              <h4 className="text-xs font-bold text-[#123C32] uppercase tracking-wider">
                Register Shiftable Campus Equipment
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Equipment Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. EV Fleet Charging, Borewell Pump"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Power Draw (kW) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={newPower}
                    onChange={(e) => setNewPower(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Duration (Hours) *</label>
                  <input
                    type="number"
                    min="0.5"
                    max="12"
                    step="0.5"
                    required
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Current Preferred Hour (0-23)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={newPreferred}
                    onChange={(e) => setNewPreferred(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Operating Days / Week</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={newDays}
                    onChange={(e) => setNewDays(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  Save & Reschedule
                </button>
              </div>
            </form>
          )}

          {/* Cards */}
          <div className="space-y-3">
            {scheduleResult?.recommendations.map((rec) => (
              <div key={rec.activity_id} className="bg-white rounded-2xl border border-[#E5EAE7] p-5 shadow-xs space-y-3">
                <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#123C32]">{rec.activity_name}</h4>
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        {rec.power_kw} kW • {rec.duration_hours}h
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{rec.building_name}</div>
                  </div>

                  <button
                    onClick={() => handleDeleteActivity(rec.activity_id)}
                    title="Remove activity"
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Timing Shift Comparison */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[11px] block">Current Baseline Timing:</span>
                    <strong className="text-slate-700 text-sm">{rec.original_window}</strong>
                    <div className="text-[10px] text-slate-400 mt-0.5">Off-peak / evening operating slot</div>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/60">
                    <span className="text-emerald-800 text-[11px] block font-semibold">Recommended Solar Timing:</span>
                    <strong className="text-emerald-950 text-sm font-bold">{rec.recommended_window}</strong>
                    <div className="text-[10px] text-emerald-700 mt-0.5 font-medium">Coincides with peak surplus</div>
                  </div>
                </div>

                <div className="text-xs text-slate-700 bg-slate-50/60 p-3 rounded-xl border border-slate-100 space-y-1">
                  <p>{rec.reason}</p>
                  <p className="text-[11px] text-slate-500 italic">{rec.practical_notes}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold pt-1">
                  <span>Additional Solar Absorbed: <strong>+{rec.additional_solar_absorbed_kwh} kWh/session</strong></span>
                  <span>Est. Annual Savings: <strong>{formatINR(rec.estimated_annual_savings_inr)}/yr</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Practical Implementation Guidelines */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5EAE7] p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-[#123C32] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" />
              Load Shifting Best Practices
            </h4>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <strong className="text-slate-800 block mb-0.5">Electric Vehicle Fleets:</strong>
                Program chargers to activate automatically between 10:30 AM and 02:30 PM when campus buses/cars are parked.
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <strong className="text-slate-800 block mb-0.5">Water Reservoir Pumps:</strong>
                Fill overhead campus tanks during solar peak rather than early dawn or late evening.
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <strong className="text-slate-800 block mb-0.5">HVAC Chiller Pre-Cooling:</strong>
                Sub-cool academic facilities by 1–2°C during high solar midday to coast through 03:00–06:00 PM peak tariff hours.
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200/70 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong>Operational Advisory:</strong>
              <p className="text-[11px] leading-relaxed">
                {scheduleResult?.disclaimer}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
