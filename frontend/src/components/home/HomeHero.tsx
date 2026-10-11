import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  CheckCircle2,
  Sparkles,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

interface HomeHeroProps {
  onRequestDemo: () => void;
  onWatchVideo?: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({ onRequestDemo, onWatchVideo }) => {
  const navigate = useNavigate();

  // Illustration figures are not active-project calculations.
  const displayGeneration = '836 MWh/year';

  return (
    <section className="relative overflow-hidden pt-6 pb-16 lg:pt-10 lg:pb-24">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">

          {/* Left Column: 48% (5.8/12 cols) */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-6 lg:pr-4">

            {/* Eyebrow Pill */}
            <div className="glass-badge inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-[#FF6B16] border-orange-500/25 tracking-wide uppercase shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#FF6B16]" />
              <span>Commercial Solar Planning Intelligence</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl xl:text-[56px] font-extrabold text-[#0B1739] tracking-tight leading-[1.12]">
              Plan, Design and Optimize{' '}
              <span className="text-[#FF6B16] block sm:inline">Rooftop Solar Projects</span>{' '}
              with Data
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-[#61708A] leading-relaxed max-w-xl font-normal">
              Turn institutional and enterprise rooftops into optimized clean energy portfolios. RoofShift AI unifies NASA POWER climatology, 0/1 Knapsack capital allocation, and thermal diagnostics into one frosted glass workspace.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onRequestDemo}
                className="glass-button-primary px-7 py-3.5 text-base flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>Request Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (onWatchVideo) onWatchVideo();
                  else navigate('/workspace?mode=india');
                }}
                className="glass-button-secondary px-6 py-3.5 text-base flex items-center gap-2.5 cursor-pointer shadow-xs"
              >
                <div className="w-6 h-6 rounded-full bg-orange-500/15 flex items-center justify-center text-[#FF6B16]">
                  <Play className="w-3 h-3 fill-[#FF6B16] translate-x-0.5" />
                </div>
                <span>Explore Solar Map</span>
              </button>
            </div>

            {/* Benefit Check Strip */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-[13px] font-semibold text-[#0B1739]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Faster planning</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Higher ROI</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>NASA Climatology</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Thermal Insights</span>
              </div>
            </div>

          </div>

          {/* Right Column: 52% (6.2/12 cols) — Hero Visual & Floating Analytics */}
          <div className="lg:col-span-6 xl:col-span-6 relative">
            <div className="relative rounded-3xl overflow-hidden border border-white/80 shadow-2xl aspect-[16/10] sm:aspect-[16/10] bg-slate-100 group">

              {/* Photorealistic Campus Solar Installation */}
              <img
                src="/hero-campus.jpg"
                alt="Institutional university campus with rooftop solar array"
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-102"
                loading="eager"
              />

              {/* Subtle visual gradient edge */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent pointer-events-none" />

              {/* Floating Card 1: Top-Left "Illustrative Planning Preview" */}
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 glass-elevated rounded-2xl p-4 sm:p-4.5 border border-white/90 shadow-2xl max-w-[240px] sm:max-w-[260px] transition-transform hover:-translate-y-1">
                <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-slate-200/60">
                  <div className="w-7 h-7 rounded-xl bg-orange-500/15 flex items-center justify-center text-[#FF6B16] shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#0B1739]">Campus Planning Preview</h4>
                </div>
                <ul className="space-y-1.5 text-[11px] sm:text-xs text-[#61708A] font-semibold">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>5 registered campus rooftops</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Modeled 482 MWh/yr potential</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>₹7.18L/yr projected savings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Thermal anomaly diagnostics</span>
                  </li>
                </ul>
              </div>

              {/* Floating Card 2: Bottom-Right "Estimated Generation" */}
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 glass-elevated rounded-2xl p-4 sm:p-4.5 border border-white/90 shadow-2xl min-w-[220px] sm:min-w-[240px] transition-transform hover:-translate-y-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-orange-500/15 flex items-center justify-center text-[#FF6B16]">
                    <BarChart3 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-[#61708A]">Modeled Generation</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 mt-1">
                  <div className="text-xl sm:text-2xl font-black text-[#0B1739] tracking-tight num-font">
                    {displayGeneration}
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-[11px] font-bold text-emerald-700 border border-emerald-500/25">
                    <TrendingUp className="w-3 h-3" />
                    <span>Optimal</span>
                  </div>
                </div>
                <span className="text-[10px] text-[#61708A] block mt-1 font-medium">NASA POWER Climatology verified</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
