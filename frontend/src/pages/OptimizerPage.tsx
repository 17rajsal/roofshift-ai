import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { OptimizationRunResponse, BuildingAllocationItem, Building as BuildingModel } from '../types/models';
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
  Scale,
  Building2,
  Check
} from 'lucide-react';

export const OptimizerPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const [budget, setBudget] = useState<number>(1000000);
  const [objective, setObjective] = useState<string>('MAXIMIZE_SAVINGS');
  const [scenarioName, setScenarioName] = useState<string>('Base Scenario');
  const [capacityStep, setCapacityStep] = useState<number>(0.5);

  const [buildings, setBuildings] = useState<BuildingModel[]>([]);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationRunResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const BUDGET_PRESETS = [
    { label: '₹5L', value: 500000 },
    { label: '₹10L', value: 1000000 },
    { label: '₹25L', value: 2500000 },
    { label: '₹50L', value: 5000000 },
    { label: '₹1Cr', value: 10000000 },
  ];

  useEffect(() => {
    if (activeProject) {
      setBudget(activeProject.budget);
      loadProjectBuildings();
      loadPreviousRuns();
    }
  }, [activeProject]);

  const loadProjectBuildings = async () => {
    if (!activeProject) return;
    try {
      const list = await api.getBuildings(activeProject.id, { limit: 100 });
      setBuildings(list);
      setSelectedBuildingIds(list.map((b) => b.id));
    } catch (err) {
      console.warn('Failed to load project buildings:', err);
    }
  };

  const loadPreviousRuns = async () => {
    if (!activeProject) return;
    try {
      const runs = await api.getOptimizationRuns(activeProject.id);
      if (runs.length > 0) {
        setOptimizationResult(runs[0]);
      } else {
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-bold text-[#0B1739] flex items-center gap-2">
              <span className="p-2 rounded-xl bg-orange-500/15 text-[#FF6B16] border border-orange-500/20">
                <SlidersHorizontal className="w-4 h-4 text-[#FF6B16]" />
              </span>
              <span>Multiple-Choice Knapsack Budget Optimizer</span>
            </h2>
            <span className="text-[10px] font-semibold bg-white/70 text-[#0B1739] px-2.5 py-0.5 rounded-full border border-white/80 font-mono">
              Exact Decimal Dynamic Programming
            </span>
          </div>
          <p className="text-xs text-[#61708A] mt-1.5 leading-relaxed">
            4-Step Capital Allocation: Select candidate roofs, configure budget, and compute optimal solar installations using exact decimal dynamic programming.
          </p>
        </div>

        <button
          onClick={() => navigate('/workspace/insights')}
          className="glass-button-primary px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <span>Continue to Energy Balance</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* STEP 1: SELECT CANDIDATE BUILDINGS & ROOFTOPS */}
      <div className="glass-panel rounded-3xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/60 pb-3">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6B16] bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full w-fit mb-1">
              Step 1 of 4
            </div>
            <h3 className="text-sm font-extrabold text-[#0B1739] flex items-center gap-2">
              <span>Select Candidate Buildings &amp; Rooftops</span>
              <span className="text-xs bg-white/70 text-[#0B1739] font-semibold px-2 py-0.5 rounded-full border border-white/80">
                {selectedBuildingIds.length} of {buildings.length} Selected
              </span>
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedBuildingIds(buildings.map((b) => b.id))}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-[#0B1739] font-semibold border border-white/80 shadow-2xs cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => setSelectedBuildingIds([])}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-500 font-semibold border border-white/80 shadow-2xs cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {buildings.length === 0 ? (
          <div className="p-4 rounded-2xl bg-white/60 border border-white/80 text-xs text-[#61708A] text-center">
            No buildings currently in this portfolio. You can add buildings via the Explorer map or Building Catalog.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {buildings.map((b) => {
              const isSelected = selectedBuildingIds.includes(b.id);
              return (
                <div
                  key={b.id}
                  onClick={() => {
                    setSelectedBuildingIds((prev) =>
                      prev.includes(b.id) ? prev.filter((id) => id !== b.id) : [...prev, b.id]
                    );
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-white/90 border-orange-500/40 shadow-xs'
                      : 'bg-white/40 border-white/70 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#0B1739] truncate">{b.name}</div>
                    <div className="text-[10px] text-[#61708A] mt-0.5">
                      {formatArea(b.usable_roof_area)} usable • Max {b.solar_analysis ? formatPower(b.solar_analysis.max_pv_capacity_kwp) : '—'}
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 ${
                      isSelected ? 'bg-[#FF6B16] border-[#FF6B16] text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* STEP 2: ENTER INVESTMENT BUDGET */}
      <div className="glass-panel rounded-3xl p-6 shadow-md space-y-4">
        <div className="border-b border-white/60 pb-3">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6B16] bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full w-fit mb-1">
            Step 2 of 4
          </div>
          <h3 className="text-sm font-extrabold text-[#0B1739]">
            Enter Available Investment Budget
          </h3>
          <p className="text-xs text-[#61708A] mt-0.5">
            Set the capital ceiling for solar procurement. The knapsack algorithm will allocate modules strictly within this limit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[#61708A]">₹</span>
            <input
              type="number"
              min="50000"
              step="50000"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full glass-input pl-9 pr-4 py-3 text-sm font-black text-[#0B1739] rounded-2xl focus:outline-hidden tabular-nums"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Presets:</span>
            {BUDGET_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setBudget(preset.value)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  budget === preset.value
                    ? 'bg-[#FF6B16] text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-[#0B1739] border border-white/90'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* STEP 3: RUN KNAPSACK OPTIMIZER */}
      <div className="glass-panel rounded-3xl p-6 shadow-md space-y-4">
        <div className="border-b border-white/60 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6B16] bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full w-fit mb-1">
              Step 3 of 4
            </div>
            <h3 className="text-sm font-extrabold text-[#0B1739]">
              Solve Exact Knapsack Solar Allocation
            </h3>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={handleRunOptimization}
            disabled={loading}
            className="px-6 py-3.5 rounded-2xl bg-[#FF6B16] hover:bg-[#EA580C] text-white font-black text-sm shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Cpu className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Solving Dynamic Programming Grid…' : 'Find Best Solar Plan →'}</span>
          </button>

          <span className="text-[11px] text-[#61708A]">
            Evaluates discrete capacity combinations across selected rooftops in under 150ms.
          </span>
        </div>

        {/* Collapsible Advanced Constraints in <details> */}
        <details className="group mt-3 rounded-2xl bg-white/50 border border-white/80 p-4 transition-all">
          <summary className="text-xs font-bold text-[#0B1739] flex items-center justify-between cursor-pointer select-none">
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-[#FF6B16]" />
              <span>Advanced Solver Constraints &amp; Sensitivity</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
          </summary>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 mt-2 border-t border-slate-200/50 text-xs">
            <div>
              <label className="block text-xs font-bold text-[#0B1739] mb-1">Objective Function</label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full glass-input px-3 py-2 text-xs rounded-xl focus:outline-hidden text-[#0B1739] font-medium cursor-pointer"
              >
                <option value="MAXIMIZE_SAVINGS">Maximize Annual Bill Savings (INR)</option>
                <option value="MAXIMIZE_ONSITE_UTILIZATION">Maximize Onsite Self-Consumption (kWh)</option>
                <option value="MAXIMIZE_GENERATION">Maximize Clean Generation (kWh)</option>
              </select>
              <p className="text-[10px] text-[#61708A] mt-1">Directs value weighting during state transitions.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1739] mb-1">Sensitivity Scenario</label>
              <select
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="w-full glass-input px-3 py-2 text-xs rounded-xl focus:outline-hidden text-[#0B1739] font-medium cursor-pointer"
              >
                <option value="Base Scenario">Base Scenario (PR 75%)</option>
                <option value="Conservative Scenario">Conservative (-10% yield, +10% cost)</option>
                <option value="Optimistic Scenario">Optimistic (+5% yield, -8% cost)</option>
              </select>
              <p className="text-[10px] text-[#61708A] mt-1">Stress-tests yield and tariff against weather variance.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1739] mb-1">Discrete Stepping Step</label>
              <select
                value={capacityStep}
                onChange={(e) => setCapacityStep(Number(e.target.value))}
                className="w-full glass-input px-3 py-2 text-xs rounded-xl focus:outline-hidden text-[#0B1739] font-medium cursor-pointer"
              >
                <option value={0.5}>0.5 kWp (Standard granular)</option>
                <option value={1.0}>1.0 kWp (Coarse)</option>
                <option value={2.0}>2.0 kWp (Industrial block)</option>
              </select>
              <p className="text-[10px] text-[#61708A] mt-1">Quantization step for discrete multiple-choice candidates.</p>
            </div>
          </div>
        </details>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/80 text-xs text-rose-900 flex items-center gap-2.5 backdrop-blur-md shadow-xs">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* STEP 4: SOLVER OUTPUT RESULTS */}
      {optimizationResult && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6B16] bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
              Step 4 of 4
            </span>
            <h3 className="text-sm font-extrabold text-[#0B1739]">
              Optimized Solar Allocation Results
            </h3>
          </div>
          {/* Key Optimization Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] text-[#61708A] block font-semibold">Total Capex Allocated</span>
              <strong className="text-base font-bold text-[#0B1739] tabular-nums mt-1 block">
                {formatINR(optimizationResult.total_allocated_inr)}
              </strong>
              <div className="text-[10px] text-[#61708A] mt-0.5">
                {formatPct((optimizationResult.total_allocated_inr / optimizationResult.budget_inr) * 100)} of budget
              </div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] text-[#61708A] block font-semibold">Remaining Reserve</span>
              <strong className="text-base font-bold text-[#0B1739] tabular-nums mt-1 block">
                {formatINR(optimizationResult.remaining_budget_inr)}
              </strong>
              <div className="text-[10px] text-[#61708A] mt-0.5">Capital buffer</div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] text-[#61708A] block font-semibold">Total Solar Capacity</span>
              <strong className="text-base font-bold text-emerald-600 tabular-nums mt-1 block">
                {formatPower(optimizationResult.total_capacity_kwp)}
              </strong>
              <div className="text-[10px] text-[#61708A] mt-0.5">
                Across {selectedAllocations.length} rooftops
              </div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] text-[#61708A] block font-semibold">Annual Bill Savings</span>
              <strong className="text-base font-bold text-emerald-600 tabular-nums mt-1 block">
                {formatINR(optimizationResult.total_annual_savings_inr)}
              </strong>
              <div className="text-[10px] text-[#61708A] mt-0.5">Annual cash flow</div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] text-[#61708A] block font-semibold">Portfolio Payback</span>
              <strong className="text-base font-bold text-[#FF6B16] tabular-nums mt-1 block">
                {optimizationResult.overall_payback_years ? `${optimizationResult.overall_payback_years} Years` : '—'}
              </strong>
              <div className="text-[10px] text-[#61708A] mt-0.5">Capital recovery</div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] text-[#61708A] block font-semibold">Avoided Emissions</span>
              <strong className="text-base font-bold text-[#0B1739] tabular-nums mt-1 block">
                {formatCO2(optimizationResult.avoided_co2_kg_annual)}
              </strong>
              <div className="text-[10px] text-[#61708A] mt-0.5">CEA grid factor</div>
            </div>
          </div>

          {/* Fair Baseline Comparison Card */}
          <div className="glass-elevated bg-[#0B1739]/95 text-white p-6 sm:p-7 rounded-3xl border border-white/20 shadow-2xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/15 pb-4 mb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B16] bg-orange-500/15 px-2.5 py-0.5 rounded-full border border-orange-500/25">
                  Empirical Benchmark
                </span>
                <h3 className="text-base font-bold text-white mt-1.5 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-slate-300" />
                  <span>Optimized Knapsack Plan vs Naive Largest-First Baseline</span>
                </h3>
              </div>
              <div className="glass-elevated bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/20 text-xs">
                <span>Optimization Gain: </span>
                <strong className="text-[#FF6B16] font-bold tabular-nums">
                  +{optimizationResult.baseline_comparison.savings_lift_pct.toFixed(1)}% Annual Savings Lift
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <span className="text-slate-400 block mb-1 font-semibold">Optimized Plan (Knapsack)</span>
                <div className="text-base font-bold text-white tabular-nums">
                  {formatINR(optimizationResult.total_annual_savings_inr)}
                  <span className="text-xs text-slate-400 font-normal"> / yr</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1 tabular-nums">
                  Capex: {formatINR(optimizationResult.total_allocated_inr)} • {formatPower(optimizationResult.total_capacity_kwp)}
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                <span className="text-slate-400 block mb-1 font-semibold">Naive Baseline (Largest First)</span>
                <div className="text-base font-bold text-slate-300 tabular-nums">
                  {formatINR(optimizationResult.baseline_comparison.baseline_savings_inr)}
                  <span className="text-xs text-slate-400 font-normal"> / yr</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
                  Capex: {formatINR(optimizationResult.baseline_comparison.baseline_allocated_inr)} • {formatPower(optimizationResult.baseline_comparison.baseline_capacity_kwp)}
                </div>
              </div>

              <div className="bg-orange-500/15 p-4 rounded-2xl border border-orange-500/30 flex flex-col justify-between backdrop-blur-sm">
                <div>
                  <span className="text-orange-300 block mb-1 font-bold">Net Incremental Benefit</span>
                  <div className="text-base font-bold text-[#FF6B16] tabular-nums">
                    +{formatINR(optimizationResult.baseline_comparison.savings_lift_inr)}
                    <span className="text-xs text-orange-200 font-normal"> / yr</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-300 leading-tight mt-1">
                  Higher cash recovery without expanding allocated capital.
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/15 text-[11px] text-slate-300 leading-relaxed">
              <strong className="text-white">Methodology:</strong> {optimizationResult.baseline_comparison.methodology_note}
            </div>
          </div>

          {/* Allocation Decisions & Explainable Rationale Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0B1739] flex items-center gap-2">
                <span>Rooftop Portfolio Allocations &amp; Decision Rationales</span>
                <span className="text-xs bg-white/70 text-[#0B1739] px-2.5 py-0.5 rounded-full font-semibold border border-white/80">
                  {optimizationResult.allocations.length} total
                </span>
              </h3>
              <div className="text-xs text-[#61708A] font-medium">
                {selectedAllocations.length} Selected • {excludedAllocations.length} Deferred
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {optimizationResult.allocations.map((item) => {
                const isSelected = item.is_selected;

                return (
                  <div
                    key={item.building_id}
                    className={`rounded-2xl p-5 transition-all shadow-md ${
                      isSelected
                        ? 'glass-panel border-l-4 border-l-emerald-500'
                        : 'glass-surface-secondary border-l-4 border-l-slate-400 opacity-90'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-white/40 pb-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs ${
                            isSelected ? 'bg-emerald-600' : 'bg-slate-400'
                          }`}
                        >
                          {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-[#0B1739]">{item.building_name}</h4>
                            <span className="text-[10px] bg-white/70 text-[#0B1739] font-semibold px-2 py-0.5 rounded-lg border border-white/80">
                              {item.category}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                                isSelected ? 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30' : 'bg-slate-200/60 text-slate-700 border-slate-300'
                              }`}
                            >
                              {isSelected ? 'SELECTED FOR SOLAR' : 'EXCLUDED / DEFERRED'}
                            </span>
                          </div>
                          <div className="text-xs text-[#61708A] mt-0.5 tabular-nums font-medium">
                            Max Roof Capacity: {formatPower(item.max_capacity_kwp)}
                          </div>
                        </div>
                      </div>

                      {/* Right KPI Summary */}
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div>
                          <span className="text-[#61708A] text-[10px] block font-semibold">Recommended Solar</span>
                          <strong className={`tabular-nums text-xs ${isSelected ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'}`}>
                            {formatPower(item.recommended_capacity_kwp)}
                            {isSelected && (
                              <span className="text-[10px] text-[#61708A] font-normal ml-1">
                                ({item.capacity_utilization_pct}%)
                              </span>
                            )}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[#61708A] text-[10px] block font-semibold">Allocated Capex</span>
                          <strong className="text-[#0B1739] text-xs tabular-nums font-bold">
                            {formatINR(item.estimated_cost_inr)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[#61708A] text-[10px] block font-semibold">Annual Savings</span>
                          <strong className={`tabular-nums text-xs ${isSelected ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'}`}>
                            {formatINR(item.expected_annual_savings_inr)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[#61708A] text-[10px] block font-semibold">Payback</span>
                          <strong className="text-[#0B1739] text-xs tabular-nums font-bold">
                            {item.payback_years ? `${item.payback_years}y` : '—'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Explainability Section */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <strong className="text-[#0B1739] block mb-1 font-bold">
                          Explainable Solver Rationale:
                        </strong>
                        <ul className="list-disc pl-4 space-y-0.5 text-[#61708A] leading-relaxed">
                          {item.decision_reasons.map((r, rIdx) => (
                            <li key={rIdx}>{r}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/40 text-[11px]">
                        <div className="glass-surface-secondary p-2.5 rounded-xl text-[#61708A] border border-white/60">
                          <strong className="text-[#0B1739] block">Shade Assessment:</strong>
                          {item.shade_impact_summary}
                        </div>
                        <div className="glass-surface-secondary p-2.5 rounded-xl text-[#61708A] border border-white/60">
                          <strong className="text-[#0B1739] block">Demand Coincidence:</strong>
                          {item.demand_support_summary}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Step Action Card */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-white/80 border border-white/90 shadow-sm">
            <div>
              <div className="text-xs font-extrabold text-[#0B1739]">
                Optimal Plan Ready for Review
              </div>
              <p className="text-[11px] text-[#61708A] mt-0.5">
                Review load shifting, hourly telemetry, and executive reports generated from this optimal allocation.
              </p>
            </div>
            <button
              onClick={() => navigate('/workspace/insights')}
              className="px-5 py-2.5 rounded-2xl bg-[#0B1739] hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <span>Review Savings and Financial Impact →</span>
              <ArrowRight className="w-4 h-4 text-[#FF6B16]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
