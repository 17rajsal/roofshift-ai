import React from 'react';
import {
  Building2,
  Search,
  BarChart3,
  SlidersHorizontal,
  FileCheck2,
  ArrowRight
} from 'lucide-react';

export const HomeWorkflow: React.FC = () => {
  const steps = [
    {
      num: 1,
      title: 'Upload or Select Buildings',
      description: 'Import your sites or choose from an interactive map.',
      icon: Building2,
    },
    {
      num: 2,
      title: 'Roof Potential Analysis',
      description: 'The model combines declared roof space, shading and solar climatology.',
      icon: Search,
    },
    {
      num: 3,
      title: 'Generate Insights',
      description: 'Get energy forecasts, cost estimates and expected ROI.',
      icon: BarChart3,
    },
    {
      num: 4,
      title: 'Review & Optimize',
      description: 'Compare scenarios and find the best budget setup.',
      icon: SlidersHorizontal,
    },
    {
      num: 5,
      title: 'Take Action',
      description: 'Export planning reports for technical and operational review.',
      icon: FileCheck2,
    },
  ];

  return (
    <section id="how-it-works" className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
      {/* Frosted Glass Container */}
      <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-white/85 shadow-xl">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="glass-badge inline-flex items-center gap-2 px-3 py-1 text-xs font-bold text-[#FF6B16] mb-3 uppercase tracking-wider">
            Engineered Workflow
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1739] tracking-tight">
            How RoofShift AI Works
          </h2>
          <p className="mt-3 text-base text-[#61708A]">
            From geospatial site discovery to automated engineering and capital investment review.
          </p>
        </div>

        {/* 5 Process Steps Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === steps.length - 1;

            return (
              <div key={step.num} className="relative flex flex-col items-center text-center group">

                {/* Step indicator header: Number Pill + Icon */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-orange-500/15 text-[#FF6B16] font-extrabold text-xs flex items-center justify-center border border-orange-500/25">
                    {step.num}
                  </span>
                  <div className="w-12 h-12 rounded-2xl glass-elevated shadow-sm flex items-center justify-center text-[#0B1739] group-hover:border-[#FF6B16] group-hover:text-[#FF6B16] group-hover:scale-105 transition-all">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                {/* Step Title & Description */}
                <h3 className="text-base font-bold text-[#0B1739] mb-1.5 leading-snug">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#61708A] leading-relaxed max-w-[220px] font-medium">
                  {step.description}
                </p>

                {/* Connector Arrow (Desktop only, between steps) */}
                {!isLast && (
                  <div className="hidden lg:block absolute top-7 -right-3 text-slate-300">
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
