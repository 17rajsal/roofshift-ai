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
    <section className="relative overflow-hidden bg-white pt-6 pb-16 lg:pt-10 lg:pb-24">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Column: 48% (5.8/12 cols) */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-6 lg:pr-4">
            
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF4E9] border border-[#FF6B16]/20 text-[12px] font-semibold text-[#FF6B16] tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#FF6B16]" />
              <span>Data-Informed Solar Planning for a Brighter Tomorrow</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl xl:text-[56px] font-extrabold text-[#0B1739] tracking-tight leading-[1.12]">
              Plan, Design and Optimize{' '}
              <span className="text-[#FF6B16] block sm:inline">Rooftop Solar Projects</span>{' '}
              with Data
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-[#61708A] leading-relaxed max-w-xl">
              Turn every rooftop into an opportunity. RoofShift AI helps organizations identify, design, and optimize solar projects with transparent planning estimates — from site analysis to savings and impact.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onRequestDemo}
                className="px-6 py-3.5 rounded-xl bg-[#FF6B16] hover:bg-[#EA580C] text-white font-semibold text-base transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
              >
                <span>Request Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  if (onWatchVideo) onWatchVideo();
                  else navigate('/map');
                }}
                className="px-5 py-3.5 rounded-xl border border-[#E8EDF4] hover:border-slate-300 hover:bg-slate-50 text-[#0B1739] font-semibold text-base transition-all flex items-center gap-2.5 cursor-pointer shadow-xs"
              >
                <div className="w-6 h-6 rounded-full bg-[#FFF4E9] flex items-center justify-center text-[#FF6B16]">
                  <Play className="w-3 h-3 fill-[#FF6B16] translate-x-0.5" />
                </div>
                <span>Explore Solar Map</span>
              </button>
            </div>

            {/* Benefit Check Strip */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-[13px] font-medium text-[#0B1739]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                <span>Faster planning</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                <span>Higher ROI</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                <span>Data-driven decisions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                <span>Built for real projects</span>
              </div>
            </div>

          </div>

          {/* Right Column: 52% (6.2/12 cols) — Hero Visual & Floating Analytics */}
          <div className="lg:col-span-6 xl:col-span-6 relative">
            <div className="relative rounded-2xl overflow-hidden border border-[#E8EDF4] shadow-xl aspect-[16/10] sm:aspect-[16/10] bg-slate-100 group">
              
              {/* Photorealistic Campus Solar Installation */}
              <img
                src="/hero-campus.jpg"
                alt="Institutional university campus with rooftop solar array"
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-102"
                loading="eager"
              />

              {/* Subtle visual gradient edge */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent pointer-events-none" />

              {/* Floating Card 1: Top-Left "Illustrative Planning Preview" */}
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 bg-white/95 backdrop-blur-md rounded-xl p-3.5 sm:p-4 border border-[#E8EDF4] shadow-lg max-w-[230px] sm:max-w-[250px] transition-transform hover:-translate-y-1">
                <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
                  <div className="w-6 h-6 rounded-md bg-[#FFF4E9] flex items-center justify-center text-[#FF6B16]">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#0B1739]">Illustrative Planning Preview</h4>
                </div>
                <ul className="space-y-1.5 text-[11px] sm:text-xs text-[#61708A] font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" />
                    <span>Compare registered rooftops</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" />
                    <span>Model solar potential</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" />
                    <span>Evaluate projected savings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" />
                    <span>Generate a planning report</span>
                  </li>
                </ul>
              </div>

              {/* Floating Card 2: Bottom-Right "Estimated Generation" */}
              <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 bg-white/95 backdrop-blur-md rounded-xl p-3.5 sm:p-4 border border-[#E8EDF4] shadow-lg min-w-[210px] sm:min-w-[230px] transition-transform hover:-translate-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center text-amber-500">
                    <BarChart3 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-[#61708A]">Estimated Generation</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 mt-1">
                  <div className="text-xl sm:text-2xl font-extrabold text-[#0B1739] tracking-tight">
                    {displayGeneration}
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[11px] font-bold text-[#16A34A] border border-emerald-200">
                    <TrendingUp className="w-3 h-3" />
                    <span>Example</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Illustrative only; open tools for project results</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
