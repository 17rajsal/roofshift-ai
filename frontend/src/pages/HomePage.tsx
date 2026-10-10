import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  SlidersHorizontal,
  ArrowRight,
  FileCheck2,
  Wrench,
  Activity,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Building,
  MapPin,
  CalendarClock
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { formatINR, formatArea } from '../utils/formatters';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject, loadDemoProject } = useProject();

  const handleLaunchDemo = async () => {
    await loadDemoProject();
    navigate('/optimize');
  };

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Executive Portfolio Header */}
      <section className="bg-[#0F172A] text-white rounded-xl p-7 md:p-10 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800/90 border border-slate-700 text-xs font-medium text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>Commercial Rooftop Solar & Energy Portfolio Platform</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Institutional Solar Planning & Mathematical Capital Budgeting
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Evaluate multi-building rooftop viability, allocate constrained capital budgets using integer knapsack optimization, and balance diurnal solar generation against campus consumption.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => navigate('/map')}
              className="px-4 py-2.5 rounded-md bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center gap-2 transition-colors shadow-xs"
            >
              <span>Open Solar Explorer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => navigate('/optimize')}
              className="px-4 py-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 flex items-center gap-2 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Run Knapsack Optimizer</span>
            </button>

            <button
              onClick={handleLaunchDemo}
              className="px-4 py-2.5 rounded-md bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 font-medium text-xs border border-amber-400/30 flex items-center gap-2 transition-colors"
            >
              <span>Reload Delhi Campus (₹15L)</span>
            </button>
          </div>
        </div>

        {/* Active Portfolio KPI Strip */}
        {activeProject && (
          <div className="relative z-10 mt-8 pt-6 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Location</span>
              <strong className="text-white text-sm font-semibold">{activeProject.city}, India</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Portfolio Rooftops</span>
              <strong className="text-white text-sm font-semibold">{activeProject.building_count} Buildings</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Capital Budget</span>
              <strong className="text-amber-400 text-sm font-semibold tabular-nums">{formatINR(activeProject.budget)}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Total Roof Footprint</span>
              <strong className="text-white text-sm font-semibold tabular-nums">{formatArea(activeProject.total_roof_area)}</strong>
            </div>
          </div>
        )}
      </section>

      {/* 4-Step Engineering Architecture */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Methodology & System Architecture</div>
          <h2 className="text-base font-bold text-slate-900 mt-1">Four-Stage Decision Pipeline</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/70 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono font-semibold text-slate-400 mb-2">01 / GEOMETRY</div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1.5">GIS & Irradiance</h3>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                NASA POWER climatological GHI and DNI data derated for structural tilt and shading obstacles.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-slate-400">Physics Solar Engine</div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/70 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono font-semibold text-slate-400 mb-2">02 / PROFILE</div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1.5">Demand Synthesis</h3>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Diurnal load profile regression across academic, hostel, and laboratory building archetypes.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-slate-400">Energy Conservation</div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/70 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono font-semibold text-amber-600 mb-2">03 / SOLVER</div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1.5">Knapsack Knapsack</h3>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Multiple-Choice integer knapsack (Exact Decimal Dynamic Programming) solving optimal discrete kWp capacity per building.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-amber-700 font-medium">Exact discrete solver</div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/70 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-mono font-semibold text-emerald-600 mb-2">04 / DISPATCH</div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1.5">Load Shifting</h3>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Time-window scheduling for water pumping, laundry, and EV chargers to absorb surplus solar production.
              </p>
            </div>
            <div className="mt-3 text-[10px] text-emerald-700 font-medium">Peak Solar Alignment</div>
          </div>
        </div>
      </section>

      {/* Main Feature Navigation Hub */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Planning & Operations Workspace</h2>
          <p className="text-xs text-slate-500">Access end-to-end solar portfolio management workflows.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Map */}
          <div
            onClick={() => navigate('/map')}
            className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-400 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center mb-3 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900 mb-1 flex items-center justify-between">
                <span>Solar Explorer</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Digitize rooftop polygons, inspect usable surface area, and configure shading obstruction parameters.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-medium text-slate-700">
              Launch GIS Map &rarr;
            </div>
          </div>

          {/* Card 2: Optimizer */}
          <div
            onClick={() => navigate('/optimize')}
            className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-400 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900 mb-1 flex items-center justify-between">
                <span>Budget Optimizer</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Run the multiple-choice knapsack algorithm. Benchmark against naive allocation with explainability rationales.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-medium text-amber-700">
              Run Knapsack Solver &rarr;
            </div>
          </div>

          {/* Card 3: Operations & Diagnostics */}
          <div
            onClick={() => navigate('/operations')}
            className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-400 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                <Wrench className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900 mb-1 flex items-center justify-between">
                <span>Operations & Care</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Thermal drone module inspection, inverter generation vs. expected PR audits, and maintenance ticketing.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-medium text-emerald-700">
              Open Asset Care &rarr;
            </div>
          </div>

          {/* Card 4: Reports */}
          <div
            onClick={() => navigate('/reports')}
            className="group cursor-pointer bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-400 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center mb-3 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-slate-900 mb-1 flex items-center justify-between">
                <span>Executive Reports</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate and download publication-ready investment proposals with financial payback and CO₂ offset certificates.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-medium text-slate-700">
              Export PDF Proposals &rarr;
            </div>
          </div>
        </div>
      </section>

      {/* Target Infrastructure Portfolios */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-3">
          Institutional Portfolio Segments
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          {[
            { label: 'Colleges & Universities', sub: 'Multi-roof academic quads' },
            { label: 'Schools & Academies', sub: 'Daytime classroom load' },
            { label: 'Hospitals & Healthcare', sub: '24/7 continuous baseline' },
            { label: 'Commercial IT Parks', sub: 'Air-conditioning peak load' },
            { label: 'Industrial Facilities', sub: 'High-surface shed roofs' },
            { label: 'Government Buildings', sub: 'Administrative complexes' },
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200/60">
              <div className="text-xs font-semibold text-slate-800 mb-0.5">{item.label}</div>
              <div className="text-[10px] text-slate-500">{item.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Engineering Credibility Notice */}
      <section className="p-4 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="text-slate-800 font-semibold">Engineering Grounding & Verification:</strong>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            RoofShift AI delivers deterministic screening models. Calculations integrate official NASA POWER climatological satellite irradiance and Central Electricity Authority (CEA) grid baseline emission factors. For capital procurement, structural load inspections and electrical utility sanction limits must be formally certified.
          </p>
        </div>
      </section>
    </div>
  );
};

