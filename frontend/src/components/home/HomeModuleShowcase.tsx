import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Tv2,
  HeartPulse,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

export const HomeModuleShowcase: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="solutions" className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1739] tracking-tight">
          Powerful Modules for Planning & Review
        </h2>
        <p className="mt-2.5 text-base text-[#61708A]">
          Dive deeper into the key capabilities that make RoofShift AI a complete solar planning platform.
        </p>
      </div>

      <p className="mb-5 text-xs font-medium text-slate-500">Illustrative previews below. Open a tool for project calculations or uploaded measurement results.</p>
      {/* 3 Large Showcase Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

        {/* Card A: Budget Optimization */}
        <div className="glass-panel glass-panel-hover rounded-3xl p-6 sm:p-7 border border-white/85 shadow-lg flex flex-col justify-between group">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-orange-500/15 text-[#FF6B16] flex items-center justify-center shadow-2xs border border-white/70">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1739]">Budget Optimization</h3>
            </div>

            <p className="text-xs sm:text-sm text-[#61708A] leading-relaxed mb-5 font-normal">
              Compare discrete capacities and modeled energy values under a stated budget. 0/1 Knapsack dynamic programming maximizes Capex returns.
            </p>

            <button
              onClick={() => navigate('/optimize')}
              className="glass-button-secondary px-4 py-2 text-xs mb-6 cursor-pointer"
            >
              <span>Launch Optimizer</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#FF6B16]" />
            </button>
          </div>

          {/* Mini Interactive Preview Chart */}
          <div className="glass-surface-secondary rounded-2xl p-4 border border-white/70 mt-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#61708A] mb-3">
              <span>Capital Scenarios</span>
              <span className="text-[#FF6B16] font-bold">+26.3% lift</span>
            </div>
            {/* Visual Bars */}
            <div className="space-y-2.5">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-[#61708A] font-medium">
                  <span>Greedy Baseline</span>
                  <span className="num-font font-bold">₹2.96L/yr</span>
                </div>
                <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-[#0B1739]">
                  <span>Knapsack Optimized</span>
                  <span className="text-[#FF6B16] font-extrabold num-font">₹3.74L/yr</span>
                </div>
                <div className="h-2.5 w-full bg-slate-200/60 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#FF6B16] to-[#F05A0B] rounded-full shadow-xs" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card B: Performance Monitoring */}
        <div className="glass-panel glass-panel-hover rounded-3xl p-6 sm:p-7 border border-white/85 shadow-lg flex flex-col justify-between group">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shadow-2xs border border-white/70">
                <Tv2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1739]">Performance Monitoring</h3>
            </div>

            <p className="text-xs sm:text-sm text-[#61708A] leading-relaxed mb-5 font-normal">
              Compare uploaded telemetry with declared expected output and track inverter efficiency and degradation profiles.
            </p>

            <button
              onClick={() => navigate('/operations')}
              className="glass-button-secondary px-4 py-2 text-xs mb-6 cursor-pointer"
            >
              <span>Open Telemetry</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
            </button>
          </div>

          {/* Mini Interactive Preview Chart (Green Solar Curve) */}
          <div className="glass-surface-secondary rounded-2xl p-4 border border-white/70 mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#61708A]">Diurnal Solar Curve</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-700 border border-emerald-500/25">
                <TrendingUp className="w-3 h-3" />
                428 kW Peak
              </span>
            </div>
            {/* SVG Diurnal Curve */}
            <div className="h-16 w-full relative">
              <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 55 Q 50 55 70 30 T 100 8 T 130 30 Q 150 55 200 55"
                  fill="url(#curveGradient)"
                />
                <path
                  d="M 0 55 Q 50 55 70 30 T 100 8 T 130 30 Q 150 55 200 55"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="2.5"
                />
                <circle cx="100" cy="8" r="3.5" fill="#16A34A" />
              </svg>
            </div>
            <div className="flex justify-between text-[10px] text-[#61708A] mt-1 font-semibold">
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
            </div>
          </div>
        </div>

        {/* Card C: Panel Health / Fault Detection */}
        <div className="glass-panel glass-panel-hover rounded-3xl p-6 sm:p-7 border border-white/85 shadow-lg flex flex-col justify-between group">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-600 flex items-center justify-center shadow-2xs border border-white/70">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1739]">Thermal & Fault Detection</h3>
            </div>

            <p className="text-xs sm:text-sm text-[#61708A] leading-relaxed mb-5 font-normal">
              Detect module hot spots, diode failures, and string degradation early with our infrared thermal intelligence mapping.
            </p>

            <button
              onClick={() => navigate('/map')}
              className="glass-button-secondary px-4 py-2 text-xs mb-6 cursor-pointer"
            >
              <span>View Thermal Map</span>
              <ArrowRight className="w-3.5 h-3.5 text-rose-500" />
            </button>
          </div>

          {/* Mini Visual: Solar panel array with warning overlay */}
          <div className="relative rounded-2xl overflow-hidden border border-white/80 aspect-[16/9] shadow-inner">
            <img
              src="/panel-inspection.jpg"
              alt="Rooftop solar panel diagnostic array"
              className="w-full h-full object-cover"
            />
            {/* Shaded defect highlight overlay */}
            <div className="absolute inset-0 bg-rose-500/10 pointer-events-none" />

            {/* Warning pill badge */}
            <div className="absolute bottom-2.5 right-2.5 glass-elevated px-3 py-1 rounded-full border border-rose-200/80 shadow-md flex items-center gap-1.5 text-[10px] font-bold text-rose-700">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Thermal Anomaly Detected</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
