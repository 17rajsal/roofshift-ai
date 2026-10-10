import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun,
  Cpu,
  ArrowRight,
  MapPin,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  Building2,
  Zap,
  BarChart2,
  Award
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { formatINR, formatArea, formatEnergy, formatCO2 } from '../utils/formatters';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject, loadDemoProject } = useProject();

  const handleLaunchDemo = async () => {
    await loadDemoProject();
    navigate('/optimize');
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#123C32] via-[#0D2F27] to-[#071C17] text-white p-8 md:p-14 shadow-xl border border-emerald-900/60">
        {/* Glow ambient background elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#F5B942]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-400/30 text-xs font-semibold text-emerald-300">
            <Award className="w-4 h-4 text-[#F5B942]" />
            <span>Environmental Hacks 2026 • WeMakeDevs × AWS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Turn Every Rooftop into a <span className="text-[#F5B942]">Smarter Energy Investment</span>.
          </h1>

          <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed font-normal">
            Discover rooftop solar potential, allocate limited installation budgets mathematically, 
            and shift flexible electricity demand to peak solar daylight—unifying solar engineering, 
            tariffs, and optimization into one explainable platform.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => navigate('/map')}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#123C32] font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition-all transform hover:-translate-y-0.5"
            >
              <span>Start Solar Planning</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleLaunchDemo}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 backdrop-blur-xs flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Sun className="w-4 h-4 text-[#F5B942]" />
              <span>Explore Delhi College Demo (₹10L)</span>
            </button>
          </div>

          {/* Quick Metrics Bar if Active Project */}
          {activeProject && (
            <div className="pt-6 border-t border-emerald-800/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-emerald-300/70 block">Current Location</span>
                <strong className="text-white text-sm">{activeProject.city}</strong>
              </div>
              <div>
                <span className="text-emerald-300/70 block">Candidate Roofs</span>
                <strong className="text-white text-sm">{activeProject.building_count} Buildings</strong>
              </div>
              <div>
                <span className="text-emerald-300/70 block">Capital Budget</span>
                <strong className="text-white text-sm">{formatINR(activeProject.budget)}</strong>
              </div>
              <div>
                <span className="text-emerald-300/70 block">Total Roof Footprint</span>
                <strong className="text-white text-sm">{formatArea(activeProject.total_roof_area)}</strong>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Core Innovation Formula Banner */}
      <section className="bg-white border border-[#E5EAE7] rounded-2xl p-6 shadow-xs">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
            Product Differentiation
          </span>
          <h2 className="text-xl font-bold text-[#17231F]">
            The Core Formula Behind RoofShift AI
          </h2>
          <p className="text-xs text-slate-600">
            Traditional solar audits look at rooftops in isolation. RoofShift AI solves the multi-building portfolio allocation problem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold mb-3">
              1
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#123C32] mb-1">Solar Potential</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                NASA POWER satellite GHI climatology + shading obstruction derating per roof.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800 font-bold mb-3">
              2
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#123C32] mb-1">Energy Demand</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Daytime load coincidence analysis to assess direct grid avoidance vs export.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 font-bold mb-3">
              3
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#123C32] mb-1">Knapsack Optimization</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mathematical multi-choice knapsack algorithm allocating discrete kWp capacity within budget.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-800 font-bold mb-3">
              4
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#123C32] mb-1">Smart Load Shifting</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rescheduling EV charging & water pumps to absorb excess midday solar surplus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-[#17231F]">End-to-End Decision Workflow</h2>
          <p className="text-xs text-slate-600">
            Each module is backed by live mathematical logic and verified calculation engines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Map */}
          <div
            onClick={() => navigate('/map')}
            className="group cursor-pointer bg-white border border-[#E5EAE7] rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#123C32] mb-1.5 flex items-center justify-between">
                <span>Interactive Solar Map</span>
                <ArrowRight className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Explore campus geography, place candidate rooftops, inspect usable surface area, 
                and flag high-shading obstacles with real geocoding.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-emerald-700 font-medium">
              Explore GIS Map &rarr;
            </div>
          </div>

          {/* Card 2: Optimizer */}
          <div
            onClick={() => navigate('/optimize')}
            className="group cursor-pointer bg-white border border-[#E5EAE7] rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#123C32] mb-1.5 flex items-center justify-between">
                <span>Budget Knapsack Solver</span>
                <ArrowRight className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Solve the portfolio allocation problem mathematically. Compare the optimal plan against 
                a naive baseline with explainable reasons for every rooftop.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-amber-700 font-medium">
              Launch Optimization Engine &rarr;
            </div>
          </div>

          {/* Card 3: Report */}
          <div
            onClick={() => navigate('/reports')}
            className="group cursor-pointer bg-white border border-[#E5EAE7] rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-[#123C32] mb-1.5 flex items-center justify-between">
                <span>Official PDF Reports</span>
                <ArrowRight className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate and download publication-quality investment proposals with executive summaries, 
                tables, payback analysis, and engineering limitations.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-medium">
              Preview & Download PDF &rarr;
            </div>
          </div>
        </div>
      </section>

      {/* Target Audiences & Use Cases */}
      <section className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6">
        <h2 className="text-base font-bold text-[#123C32] mb-4">
          Built for Multi-Building Institutional Campuses
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          {[
            { label: 'Colleges & Universities', sub: 'Campus Quads' },
            { label: 'Schools & Academies', sub: 'K-12 Campuses' },
            { label: 'Hospitals & Medical', sub: '24x7 Critical Load' },
            { label: 'Commercial IT Parks', sub: 'High Daytime Load' },
            { label: 'Industrial Plants', sub: 'Shed Rooftops' },
            { label: 'Government Hubs', sub: 'Public Buildings' },
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs">
              <div className="text-xs font-bold text-[#123C32] mb-0.5">{item.label}</div>
              <div className="text-[10px] text-slate-500">{item.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Transparency & Regulatory Disclaimer */}
      <section className="p-4 bg-emerald-50/60 border border-emerald-200/70 rounded-xl text-xs text-emerald-950 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong>Scientific & Regulatory Transparency:</strong>
          <p className="text-[11px] text-emerald-900 leading-relaxed">
            RoofShift AI is an institutional preliminary decision-support and screening platform. 
            All estimates utilize authentic public solar irradiance climatology from NASA POWER and 
            Central Electricity Authority (CEA) grid baseline factors. Prior to procurement, 
            professional structural audits and DISCOM transformer capacity sanctions must be verified.
          </p>
        </div>
      </section>
    </div>
  );
};
