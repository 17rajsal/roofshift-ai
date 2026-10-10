import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Leaf,
  ShieldCheck,
  FileText
} from 'lucide-react';

export const HomeValueStrip: React.FC = () => {
  const benefits = [
    {
      id: 1,
      title: 'Lower Energy Costs',
      description: 'Significant long-term savings on electricity bills.',
      icon: DollarSign,
      iconBg: 'bg-emerald-600 text-white',
    },
    {
      id: 2,
      title: 'Higher ROI',
      description: 'Optimize system design for maximum financial returns.',
      icon: TrendingUp,
      iconBg: 'bg-orange-500 text-white',
    },
    {
      id: 3,
      title: 'Reduced Carbon Footprint',
      description: 'Measure and minimize CO₂ emissions with official CEA accounting.',
      icon: Leaf,
      iconBg: 'bg-emerald-600 text-white',
    },
    {
      id: 4,
      title: 'Better Maintenance Visibility',
      description: 'Detect issues early and keep systems performing at peak PR.',
      icon: ShieldCheck,
      iconBg: 'bg-teal-600 text-white',
    },
    {
      id: 5,
      title: 'Actionable Reports',
      description: 'Download professional reports for stakeholders and compliance.',
      icon: FileText,
      iconBg: 'bg-emerald-700 text-white',
    },
  ];

  return (
    <section className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Soft pale green horizontal container matching screenshot */}
      <div className="bg-[#EDF8F1] rounded-3xl p-8 sm:p-10 lg:p-12 border border-emerald-100">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1739] tracking-tight">
            Real Value for a Cleaner, More Profitable Future
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            RoofShift AI helps organizations reduce costs, increase sustainability and make data-driven decisions.
          </p>
        </div>

        {/* 5 Column Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.id} className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full ${b.iconBg} flex items-center justify-center mb-3.5 shadow-xs`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#0B1739] mb-1 leading-snug">
                  {b.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-[210px]">
                  {b.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
