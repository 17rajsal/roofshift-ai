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
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E8EDF4] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6B16] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1739]">Budget Optimization</h3>
            </div>

            <p className="text-xs sm:text-sm text-[#61708A] leading-relaxed mb-5">
              Compare supplied capacity choices and modeled energy values under a stated budget. Savings and payback depend on your inputs.
            </p>

            <button
              onClick={() => navigate('/optimize')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E8EDF4] hover:border-[#FF6B16] text-xs font-bold text-[#0B1739] hover:text-[#FF6B16] transition-colors cursor-pointer mb-6"
            >
              <span>Learn More</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mini Interactive Preview Chart */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 mt-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2.5">
              <span>Capital Scenarios</span>
              <span className="text-blue-600 font-bold">+26.3% lift</span>
            </div>
            {/* Visual Bars */}
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Greedy Baseline</span>
                  <span>₹2.96L/yr</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-medium text-[#0B1739]">
                  <span>Knapsack Optimized</span>
                  <span className="text-[#FF6B16] font-bold">₹3.74L/yr</span>
                </div>
                <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF6B16] rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card B: Performance Monitoring */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E8EDF4] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#16A34A] flex items-center justify-center">
                <Tv2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1739]">Performance Monitoring</h3>
            </div>

            <p className="text-xs sm:text-sm text-[#61708A] leading-relaxed mb-5">
              Compare uploaded readings with declared expected output and review performance evidence.
            </p>

            <button
              onClick={() => navigate('/solar-features?feature=performance-monitoring')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E8EDF4] hover:border-[#16A34A] text-xs font-bold text-[#0B1739] hover:text-[#16A34A] transition-colors cursor-pointer mb-6"
            >
              <span>Learn More</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mini Interactive Preview Chart (Green Solar Curve) */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500">Illustrative Generation</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-[10px] font-bold text-[#16A34A]">
                <TrendingUp className="w-3 h-3" />
                428 kW
              </span>
            </div>
            {/* SVG Diurnal Curve */}
            <div className="h-16 w-full relative">
              <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity="0.3" />
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
            <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-medium">
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
            </div>
          </div>
        </div>

        {/* Card C: Panel Health / Fault Detection */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E8EDF4] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0B1739]">Panel Health / Fault Detection</h3>
            </div>

            <p className="text-xs sm:text-sm text-[#61708A] leading-relaxed mb-5">
              Review rule-based fault findings from submitted measurements and inspection evidence.
            </p>

            <button
              onClick={() => navigate('/solar-features?feature=panel-fault-detection')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E8EDF4] hover:border-rose-500 text-xs font-bold text-[#0B1739] hover:text-rose-500 transition-colors cursor-pointer mb-6"
            >
              <span>Learn More</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mini Visual: Solar panel array with warning overlay */}
          <div className="relative rounded-xl overflow-hidden border border-slate-100 aspect-[16/9] group-hover:scale-[1.01] transition-transform">
            <img
              src="/panel-inspection.jpg"
              alt="Rooftop solar panel diagnostic array"
              className="w-full h-full object-cover"
            />
            {/* Shaded defect highlight overlay */}
            <div className="absolute inset-0 bg-rose-500/10 pointer-events-none" />

            {/* Warning pill badge */}
            <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-md border border-rose-200 shadow-sm flex items-center gap-1.5 text-[10px] font-bold text-rose-600">
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>Performance Drop Detected</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
