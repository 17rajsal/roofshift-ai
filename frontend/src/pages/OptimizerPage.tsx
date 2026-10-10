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
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5EAE7] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#17231F] flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-600" />
              <span>Multiple-Choice Knapsack Budget Optimizer</span>
            </h2>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">
              OR Solver
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Determines the globally optimal rooftop capacity allocation under capital expenditure constraints.
          </p>
        </div>

        <button
          onClick={() => navigate('/insights')}
          className="px-4 py-2 bg-[#123C32] hover:bg-[#0B251F] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <span>Continue to Surplus Insights</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Solver Controls Panel */}
      <div className="bg-white rounded-2xl border border-[#E5EAE7] p-6 shadow-xs space-y-6">
        <h3 className="text-xs font-bold text-[#123C32] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Sliders className="w-4 h-4 text-emerald-600" />
          Optimization Parameters & Constraints
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Budget Input & Quick Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Available Budget (₹ INR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="50000"
                step="50000"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 text-sm font-bold text-[#123C32] border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            {/* Presets */}
            <div className="flex gap-1.5 pt-1">
              {[500000, 1000000, 1500000, 2500000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBudget(preset)}
                  className={`text-[10px] px-2 py-1 rounded font-semibold transition-colors ${
                    budget === preset ? 'bg-[#123C32] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {formatINRShort(preset)}
                </button>
              ))}
            </div>
          </div>

          {/* Objective Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Optimization Objective
            </label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
            >
              <option value="MAXIMIZE_SAVINGS">Maximize Annual Bill Savings (INR)</option>
              <option value="MAXIMIZE_ONSITE_UTILIZATION">Maximize Onsite Solar Self-Consumption (kWh)</option>
              <option value="MAXIMIZE_GENERATION">Maximize Clean Energy Generation (kWh)</option>
            </select>
            <p className="text-[10px] text-slate-400">
              Accounts for diminishing returns when generation exceeds daytime loads.
            </p>
          </div>

          {/* Scenario Sensitivity */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Sensitivity Scenario
            </label>
            <select
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
            >
              <option value="Base Scenario">Base Scenario (Standard PR 75%)</option>
              <option value="Conservative Scenario">Conservative Scenario (-10% yield, +10% capex)</option>
              <option value="Optimistic Scenario">Optimistic Scenario (+5% yield, -8% capex)</option>
            </select>
            <p className="text-[10px] text-slate-400">
              Stress-test financial returns against climate and price variations.
            </p>
          </div>

          {/* Discrete Capacity Step & Solve Button */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Installation Increments
            </label>
            <div className="flex gap-2">
              <select
                value={capacityStep}
                onChange={(e) => setCapacityStep(Number(e.target.value))}
                className="w-1/2 px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value={0.5}>0.5 kWp</option>
                <option value={1.0}>1.0 kWp</option>
                <option value={2.0}>2.0 kWp</option>
              </select>

              <button
                type="button"
                onClick={handleRunOptimization}
                disabled={loading}
                className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Cpu className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Solving...' : 'Solve'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-right">
              Discrete knapsack resolution
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Solver Output Results */}
      {optimizationResult && (
        <div className="space-y-6">
          {/* Key Optimization Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-[#E5EAE7] shadow-xs">
              <span className="text-[11px] text-slate-500 block">Total Capex Allocated</span>
              <strong className="text-base font-extrabold text-[#123C32]">
                {formatINR(optimizationResult.total_allocated_inr)}
              </strong>
              <div className="text-[10px] text-emerald-600 mt-0.5">
                {formatPct((optimizationResult.total_allocated_inr / optimizationResult.budget_inr) * 100)} of budget
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5EAE7] shadow-xs">
              <span className="text-[11px] text-slate-500 block">Remaining Buffer</span>
              <strong className="text-base font-extrabold text-slate-700">
                {formatINR(optimizationResult.remaining_budget_inr)}
              </strong>
              <div className="text-[10px] text-slate-400 mt-0.5">Contingency reserve</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5EAE7] shadow-xs">
              <span className="text-[11px] text-slate-500 block">Total Solar Capacity</span>
              <strong className="text-base font-extrabold text-emerald-700">
                {formatPower(optimizationResult.total_capacity_kwp)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Across {selectedAllocations.length} rooftops
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5EAE7] shadow-xs">
              <span className="text-[11px] text-slate-500 block">Annual Bill Savings</span>
              <strong className="text-base font-extrabold text-emerald-700">
                {formatINR(optimizationResult.total_annual_savings_inr)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-0.5">Per operating year</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5EAE7] shadow-xs">
              <span className="text-[11px] text-slate-500 block">Portfolio Payback</span>
              <strong className="text-base font-extrabold text-amber-600">
                {optimizationResult.overall_payback_years ? `${optimizationResult.overall_payback_years} Years` : 'N/A'}
              </strong>
              <div className="text-[10px] text-slate-500 mt-0.5">Capital recovery</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5EAE7] shadow-xs">
              <span className="text-[11px] text-slate-500 block">Avoided Emissions</span>
              <strong className="text-base font-extrabold text-[#123C32]">
                {formatCO2(optimizationResult.avoided_co2_kg_annual)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-0.5">CEA grid factor</div>
            </div>
          </div>

          {/* Fair Baseline Comparison Card */}
          <div className="bg-gradient-to-r from-emerald-950 via-[#123C32] to-[#0A261F] text-white p-6 rounded-2xl shadow-md border border-emerald-800/80">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-emerald-800/60 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#F5B942] bg-emerald-900/60 px-2 py-0.5 rounded border border-[#F5B942]/30">
                  Fair Scientific Benchmark
                </span>
                <h3 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-emerald-400" />
                  Optimized Plan vs Naive Baseline Strategy
                </h3>
              </div>
              <div className="bg-white/10 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/20 text-xs">
                <span>Optimization Advantage: </span>
                <strong className="text-[#F5B942] text-sm font-extrabold">
                  +{optimizationResult.baseline_comparison.savings_lift_pct.toFixed(1)}% Annual Savings Lift
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-emerald-300 block mb-1">Optimized Plan (Knapsack)</span>
                <div className="text-lg font-bold text-white">
                  {formatINR(optimizationResult.total_annual_savings_inr)}
                  <span className="text-xs text-emerald-200/80 font-normal"> / year</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  Capex: {formatINR(optimizationResult.total_allocated_inr)} • {formatPower(optimizationResult.total_capacity_kwp)}
                </div>
              </div>

              <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                <span className="text-slate-300 block mb-1">Naive Baseline (Largest Roof First)</span>
                <div className="text-lg font-bold text-slate-200">
                  {formatINR(optimizationResult.baseline_comparison.baseline_savings_inr)}
                  <span className="text-xs text-slate-400 font-normal"> / year</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Capex: {formatINR(optimizationResult.baseline_comparison.baseline_allocated_inr)} • {formatPower(optimizationResult.baseline_comparison.baseline_capacity_kwp)}
                </div>
              </div>

              <div className="bg-emerald-900/40 p-3.5 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
                <div>
                  <span className="text-[#F5B942] block mb-1 font-semibold">Net Incremental Benefit</span>
                  <div className="text-lg font-extrabold text-[#F5B942]">
                    +{formatINR(optimizationResult.baseline_comparison.savings_lift_inr)}
                    <span className="text-xs text-white/80 font-normal"> / year</span>
                  </div>
                </div>
                <div className="text-[10px] text-emerald-200/90 leading-tight mt-1">
                  Higher cash flow without spending an extra rupee of capital!
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-800/40 text-[11px] text-slate-300">
              <strong>Methodology:</strong> {optimizationResult.baseline_comparison.methodology_note}
            </div>
          </div>

          {/* Allocation Decisions & Explainable Rationale Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#17231F] flex items-center gap-2">
                <span>Rooftop Portfolio Allocations & Decision Rationales</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-normal">
                  {optimizationResult.allocations.length} total
                </span>
              </h3>
              <div className="text-xs text-slate-500">
                {selectedAllocations.length} Selected • {excludedAllocations.length} Deferred
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {optimizationResult.allocations.map((item) => {
                const isSelected = item.is_selected;

                return (
                  <div
                    key={item.building_id}
                    className={`bg-white rounded-2xl border p-5 transition-all shadow-xs ${
                      isSelected
                        ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
                        : 'border-slate-200/80 bg-slate-50/40 opacity-90'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white ${
                            isSelected ? 'bg-emerald-600' : 'bg-slate-400'
                          }`}
                        >
                          {isSelected ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-base text-[#123C32]">{item.building_name}</h4>
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
                              {item.category}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                isSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isSelected ? 'SELECTED FOR SOLAR' : 'EXCLUDED / DEFERRED'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Max Roof Capacity: {formatPower(item.max_capacity_kwp)}
                          </div>
                        </div>
                      </div>

                      {/* Right KPI Summary */}
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Recommended Solar</span>
                          <strong className={isSelected ? 'text-emerald-700 text-sm' : 'text-slate-500 text-sm'}>
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
                          <strong className="text-slate-800 text-sm">
                            {formatINR(item.estimated_cost_inr)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Annual Savings</span>
                          <strong className={isSelected ? 'text-emerald-700 text-sm' : 'text-slate-400 text-sm'}>
                            {formatINR(item.expected_annual_savings_inr)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Payback</span>
                          <strong className="text-slate-800 text-sm">
                            {item.payback_years ? `${item.payback_years}y` : '—'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Explainability Section */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <strong className="text-[#123C32] block mb-1">
                          Explainable Solver Rationale:
                        </strong>
                        <ul className="list-disc pl-4 space-y-1 text-slate-700">
                          {item.decision_reasons.map((r, rIdx) => (
                            <li key={rIdx}>{r}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                        <div className="bg-slate-50 p-2 rounded-lg text-slate-600">
                          <strong className="text-slate-700 block">Shade Assessment:</strong>
                          {item.shade_impact_summary}
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg text-slate-600">
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
