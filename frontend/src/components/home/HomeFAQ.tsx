import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export const HomeFAQ: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0); // First item open by default

  const faqs = [
    {
      q: 'How does RoofShift AI estimate solar generation without on-site hardware?',
      a: 'We query NASA POWER Climatology API to retrieve multi-decade Global Horizontal Irradiance (GHI) and Direct Normal Irradiance (DNI) at the exact coordinates of your campus. We then apply physical derating factors—including tilt, orientation, local shading geometry, soiling, and temperature coefficients—to model monthly kilowatt-hour output.',
    },
    {
      q: 'How does the Budget Optimizer decide which rooftops to fund?',
      a: 'Unlike naive approaches that simply pick the largest roof until funds run out, RoofShift AI formulates solar allocation as a Multiple-Choice Knapsack Problem (MCKP). Using exact dynamic programming, it evaluates all candidate capacity steps per building, taking into account shade deratings, daytime demand coincidence, and net-metering tariffs to mathematically maximize financial return.',
    },
    {
      q: 'Does RoofShift AI support multi-building institutional portfolios?',
      a: 'Yes. Organizations can evaluate dozens of distributed rooftops across a single campus or multiple regional sites. Each building retains its own geometric footprint, azimuth, tilt, obstacle count, and metered hourly demand profile.',
    },
    {
      q: 'What is the difference between live telemetry and climatological estimates?',
      a: 'Planning and forecasting rely on multi-decade climatological data from NASA POWER and NISE India. Once an array is operational, users can upload inverter telemetry CSVs to our Operations module, which calculates empirical Performance Ratio (PR) and flags abnormal string degradation or soiling losses in real time.',
    },
    {
      q: 'How are energy bill savings and payback periods calculated?',
      a: 'Financial projections model two distinct revenue streams: (1) direct on-site grid displacement valued at retail commercial tariffs (e.g. ₹8.50/kWh), and (2) surplus solar exported under state net-metering regulations (e.g. ₹3.50/kWh DERC feed-in rate). Cash flows include inverter replacement reserves and 0.75%/year panel degradation.',
    },
    {
      q: 'Can reports and proposals be exported for executive review?',
      a: 'Yes. Our Report Generator compiles publication-grade vector PDF documents using ReportLab. Reports include site maps, financial cash flows, carbon abatement certificates (using CEA India’s 0.716 kg CO₂/kWh grid factor), and cryptographic SHA-256 verification hashes.',
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
