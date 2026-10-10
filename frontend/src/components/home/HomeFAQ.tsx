import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export const HomeFAQ: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0); // First item open by default

  const faqs = [
    {
      q: 'How does RoofShift AI estimate solar generation without on-site hardware?',
      a: 'The planning engine uses NASA POWER monthly Global Horizontal Irradiance when available, plus declared usable roof area, performance ratio and shading loss. Missing irradiance uses clearly labeled illustrative defaults. These are planning estimates; orientation, tilt, detailed obstacle geometry and measured weather are not part of this model.',
    },
    {
      q: 'How does the Budget Optimizer decide which rooftops to fund?',
      a: 'The optimizer compares discrete capacity choices with an exact multiple-choice knapsack solver. It respects installation cost and the project budget, then maximizes the chosen objective: energy savings, generation or onsite solar consumption. Exactness applies to the supplied choices and model assumptions; documented resource limits return an error instead of an approximate plan.',
    },
    {
      q: 'Does RoofShift AI support multi-building institutional portfolios?',
      a: 'Yes. A project can contain multiple registered buildings with roof outlines, usable area, declared shading and monthly demand. Each building is modeled separately. Project selection is preserved so analyses, uploads and reports stay scoped to the selected portfolio.',
    },
    {
      q: 'What is the difference between uploaded measurements and climatological estimates?',
      a: 'Climatology describes modeled average solar conditions. Solar Features accepts performance readings for comparison with declared expected output and uploaded demand for interval analysis. These are user-supplied snapshots, not a connected live monitoring feed. Fault findings are rule-based evidence for review, not automatic image diagnoses.',
    },
    {
      q: 'How are energy bill savings and payback periods calculated?',
      a: 'Onsite solar is valued at the declared purchase tariff and exports at the declared export tariff. The Cost & Savings tool adds explicit assumptions for degradation, escalation, operating costs and discount rate. Users must enter the applicable local tariffs; example rates do not establish net-metering entitlement or financial guarantees.',
    },
    {
      q: 'Can reports and proposals be exported for executive review?',
      a: 'Yes. PDF reports summarize the selected project, optimization, registered load scheduling and saved feature snapshots with their assumptions. They support planning review and are not carbon certificates or regulatory compliance attestations. Environmental estimates use the declared emissions factor.',
    },
  ];

  return (
    <section id="faq" className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">

      {/* FAQ Banner / Header matching screenshot */}
      <div className="bg-[#FAFBFD] rounded-3xl p-8 sm:p-12 border border-[#E8EDF4] flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#FF6B16] uppercase tracking-wider mb-2">
            <HelpCircle className="w-4 h-4" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1739] tracking-tight">
            Have Questions?
          </h2>
          <p className="mt-1.5 text-sm sm:text-base text-[#61708A] max-w-xl">
            Find answers to common questions about RoofShift AI, our features, and how it works.
          </p>
        </div>

        <button
          onClick={() => {
            const el = document.getElementById('faq-accordion');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="px-6 py-3 rounded-xl bg-[#FF6B16] hover:bg-[#EA580C] text-white font-semibold text-sm transition-all shadow-xs hover:shadow hover:-translate-y-0.5 cursor-pointer flex-shrink-0"
        >
          View FAQ →
        </button>
      </div>

      {/* Accordion Container */}
      <div id="faq-accordion" className="max-w-3xl mx-auto space-y-3.5">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? 'border-[#FF6B16]/30 bg-white shadow-xs'
                  : 'border-[#E8EDF4] bg-white hover:border-slate-300'
              }`}
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full px-6 py-4.5 text-left flex items-center justify-between gap-4 cursor-pointer"
                aria-expanded={isOpen}
              >
                <span className="text-base font-bold text-[#0B1739] leading-snug">
                  {faq.q}
                </span>
                <span className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 flex-shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4 text-[#FF6B16]" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>

              {isOpen && (
                <div className="px-6 pb-5 pt-1 text-sm text-[#61708A] leading-relaxed border-t border-slate-50">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </section>
  );
};
