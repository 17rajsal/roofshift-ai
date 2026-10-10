import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { OptimizationRunResponse, BuildingAllocationItem } from '../types/models';
import { api } from '../services/api';
import {
  formatINR,
  formatINRShort,
  formatEnergy,
  formatPower,
  formatPct,
  formatCO2,
  formatArea,
} from '../utils/formatters';
import {
  Cpu,
  Sliders,
  SlidersHorizontal,
  TrendingUp,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  DollarSign,
  Sun,
  Layers,
  ChevronRight,
  Info,
  Scale
} from 'lucide-react';

export const OptimizerPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const [budget, setBudget] = useState<number>(1000000);
  const [objective, setObjective] = useState<string>('MAXIMIZE_SAVINGS');
  const [scenarioName, setScenarioName] = useState<string>('Base Scenario');
  const [capacityStep, setCapacityStep] = useState<number>(0.5);

  const [optimizationResult, setOptimizationResult] = useState<OptimizationRunResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeProject) {
      setBudget(activeProject.budget);
      loadPreviousRuns();
    }
  }, [activeProject]);

  const loadPreviousRuns = async () => {
    if (!activeProject) return;
    try {
      const runs = await api.getOptimizationRuns(activeProject.id);
      if (runs.length > 0) {
        setOptimizationResult(runs[0]);
      } else {
        // Trigger initial run
        handleRunOptimization();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunOptimization = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.runOptimization(activeProject.id, {
        budget_inr: budget,
        objective,
        scenario_name: scenarioName,
        capacity_step_kwp: capacityStep,
      });
      setOptimizationResult(res);
    } catch (err: any) {
      setError(err.message || 'Optimization solver failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedAllocations = optimizationResult?.allocations.filter((a) => a.is_selected) || [];
  const excludedAllocations = optimizationResult?.allocations.filter((a) => !a.is_selected) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-700" />
              <span>Multiple-Choice Knapsack Budget Optimizer</span>
            </h2>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono">
              OR-Tools CP-SAT
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Solves discrete capacity allocations across institutional rooftops under strict capital budget constraints.
          </p>
        </div>

        <button
          onClick={() => navigate('/insights')}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <span>Continue to Energy Balance</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Solver Controls Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Optimization Parameters & Constraints</span>
          </h3>
          <span className="text-[11px] text-slate-400">Deterministic Integer Solver</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Budget Input & Quick Presets */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Capital Budget (INR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400">₹</span>
              <input
                type="number"
                min="50000"
                step="50000"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-1.5 text-xs font-semibold text-slate-900 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-800 focus:outline-none tabular-nums"
              />
            </div>
            {/* Presets */}
            <div className="flex gap-1 pt-0.5">
              {[500000, 1000000, 1500000, 2500000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBudget(preset)}
                  className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                    budget === preset ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {formatINRShort(preset)}
                </button>
              ))}
            </div>
          </div>

          {/* Objective Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Objective Function
            </label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-800 focus:outline-none bg-white text-slate-800 font-medium"
            >
              <option value="MAXIMIZE_SAVINGS">Maximize Annual Bill Savings (INR)</option>
              <option value="MAXIMIZE_ONSITE_UTILIZATION">Maximize Onsite Self-Consumption (kWh)</option>
              <option value="MAXIMIZE_GENERATION">Maximize Clean Generation (kWh)</option>
            </select>
            <p className="text-[10px] text-slate-400">
              Accounts for diminishing export feed-in tariffs.
            </p>
          </div>

          {/* Scenario Sensitivity */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Sensitivity Scenario
            </label>
            <select
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-800 focus:outline-none bg-white text-slate-800 font-medium"
            >
              <option value="Base Scenario">Base Scenario (PR 75%)</option>
              <option value="Conservative Scenario">Conservative (-10% yield, +10% cost)</option>
              <option value="Optimistic Scenario">Optimistic (+5% yield, -8% cost)</option>
            </select>
            <p className="text-[10px] text-slate-400">
              Stress-test financial outcomes against climate variance.
            </p>
          </div>

          {/* Discrete Capacity Step & Solve Button */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Discrete Capacity Step
            </label>
            <div className="flex gap-2">
              <select
                value={capacityStep}
                onChange={(e) => setCapacityStep(Number(e.target.value))}
                className="w-1/2 px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-800 focus:outline-none bg-white"
              >
                <option value={0.5}>0.5 kWp</option>
                <option value={1.0}>1.0 kWp</option>
                <option value={2.0}>2.0 kWp</option>
              </select>

              <button
                type="button"
                onClick={handleRunOptimization}
                disabled={loading}
                className="w-1/2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-md shadow-2xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Cpu className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Solving...' : 'Execute'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Discrete knapsack candidate stepping.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Solver Output Results */}
      {optimizationResult && (
        <div className="space-y-6">
          {/* Key Optimization Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 block">Total Capex Allocated</span>
              <strong className="text-base font-bold text-slate-900 tabular-nums">
                {formatINR(optimizationResult.total_allocated_inr)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {formatPct((optimizationResult.total_allocated_inr / optimizationResult.budget_inr) * 100)} of budget
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 block">Remaining Reserve</span>
              <strong className="text-base font-bold text-slate-700 tabular-nums">
                {formatINR(optimizationResult.remaining_budget_inr)}
              </strong>
              <div className="text-[10px] text-slate-400 mt-0.5">Capital buffer</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 block">Total Solar Capacity</span>
              <strong className="text-base font-bold text-emerald-700 tabular-nums">
                {formatPower(optimizationResult.total_capacity_kwp)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Across {selectedAllocations.length} rooftops
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 block">Annual Bill Savings</span>
              <strong className="text-base font-bold text-emerald-700 tabular-nums">
                {formatINR(optimizationResult.total_annual_savings_inr)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-0.5">Annual cash flow</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 block">Portfolio Payback</span>
              <strong className="text-base font-bold text-amber-700 tabular-nums">
                {optimizationResult.overall_payback_years ? `${optimizationResult.overall_payback_years} Years` : '—'}
              </strong>
              <div className="text-[10px] text-slate-500 mt-0.5">Capital recovery</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 block">Avoided Emissions</span>
              <strong className="text-base font-bold text-slate-900 tabular-nums">
                {formatCO2(optimizationResult.avoided_co2_kg_annual)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-0.5">CEA grid factor</div>
            </div>
          </div>

          {/* Fair Baseline Comparison Card */}
          <div className="bg-[#0F172A] text-white p-6 rounded-xl border border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  Empirical Benchmark
                </span>
                <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-slate-300" />
                  Optimized Knapsack Plan vs Naive Largest-First Baseline
                </h3>
              </div>
              <div className="bg-slate-800 px-3 py-1 rounded-md border border-slate-700 text-xs">
                <span>Optimization Gain: </span>
                <strong className="text-amber-400 font-bold tabular-nums">
                  +{optimizationResult.baseline_comparison.savings_lift_pct.toFixed(1)}% Annual Savings Lift
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-slate-400 block mb-1">Optimized Plan (Knapsack)</span>
                <div className="text-base font-bold text-white tabular-nums">
                  {formatINR(optimizationResult.total_annual_savings_inr)}
                  <span className="text-xs text-slate-400 font-normal"> / yr</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
                  Capex: {formatINR(optimizationResult.total_allocated_inr)} • {formatPower(optimizationResult.total_capacity_kwp)}
                </div>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-slate-400 block mb-1">Naive Baseline (Largest First)</span>
                <div className="text-base font-bold text-slate-300 tabular-nums">
                  {formatINR(optimizationResult.baseline_comparison.baseline_savings_inr)}
                  <span className="text-xs text-slate-400 font-normal"> / yr</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
                  Capex: {formatINR(optimizationResult.baseline_comparison.baseline_allocated_inr)} • {formatPower(optimizationResult.baseline_comparison.baseline_capacity_kwp)}
                </div>
              </div>

              <div className="bg-amber-950/30 p-4 rounded-lg border border-amber-600/30 flex flex-col justify-between">
                <div>
                  <span className="text-amber-300 block mb-1 font-semibold">Net Incremental Benefit</span>
                  <div className="text-base font-bold text-amber-400 tabular-nums">
                    +{formatINR(optimizationResult.baseline_comparison.savings_lift_inr)}
                    <span className="text-xs text-slate-400 font-normal"> / yr</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-300 leading-tight mt-1">
                  Higher cash recovery without expanding allocated capital.
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              <strong className="text-slate-300">Methodology:</strong> {optimizationResult.baseline_comparison.methodology_note}
            </div>
          </div>

          {/* Allocation Decisions & Explainable Rationale Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Rooftop Portfolio Allocations & Decision Rationales</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-normal">
                  {optimizationResult.allocations.length} total
                </span>
              </h3>
              <div className="text-xs text-slate-500">
                {selectedAllocations.length} Selected • {excludedAllocations.length} Deferred
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {optimizationResult.allocations.map((item) => {
                const isSelected = item.is_selected;

                return (
                  <div
                    key={item.building_id}
                    className={`bg-white rounded-xl border p-5 transition-all shadow-xs ${
                      isSelected
                        ? 'border-l-4 border-l-emerald-600 border-slate-200'
                        : 'border-l-4 border-l-slate-300 border-slate-200 bg-slate-50/40 opacity-90'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-white ${
                            isSelected ? 'bg-emerald-600' : 'bg-slate-400'
                          }`}
                        >
                          {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">{item.building_name}</h4>
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded">
                              {item.category}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                isSelected ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {isSelected ? 'SELECTED FOR SOLAR' : 'EXCLUDED / DEFERRED'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                            Max Roof Capacity: {formatPower(item.max_capacity_kwp)}
                          </div>
                        </div>
                      </div>

                      {/* Right KPI Summary */}
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Recommended Solar</span>
                          <strong className={`tabular-nums text-xs ${isSelected ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                            {formatPower(item.recommended_capacity_kwp)}
                            {isSelected && (
                              <span className="text-[10px] text-slate-400 font-normal ml-1">
                                ({item.capacity_utilization_pct}%)
                              </span>
                            )}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Allocated Capex</span>
                          <strong className="text-slate-900 text-xs tabular-nums">
                            {formatINR(item.estimated_cost_inr)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Annual Savings</span>
                          <strong className={`tabular-nums text-xs ${isSelected ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                            {formatINR(item.expected_annual_savings_inr)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Payback</span>
                          <strong className="text-slate-900 text-xs tabular-nums">
                            {item.payback_years ? `${item.payback_years}y` : '—'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Explainability Section */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <strong className="text-slate-900 block mb-1">
                          Explainable Solver Rationale:
                        </strong>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                          {item.decision_reasons.map((r, rIdx) => (
                            <li key={rIdx}>{r}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                        <div className="bg-slate-50 p-2 rounded-md text-slate-600 border border-slate-100">
                          <strong className="text-slate-700 block">Shade Assessment:</strong>
                          {item.shade_impact_summary}
                        </div>
                        <div className="bg-slate-50 p-2 rounded-md text-slate-600 border border-slate-100">
                          <strong className="text-slate-700 block">Demand Coincidence:</strong>
                          {item.demand_support_summary}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
