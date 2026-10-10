import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  BarChart3,
  Layers,
  Activity,
  Sun,
  Calendar,
  Tv2,
  HeartPulse,
  Wrench,
  DollarSign,
  Leaf,
  FileText,
  ArrowUpRight
} from 'lucide-react';

export const HomeFeatureGrid: React.FC = () => {

  const features = [
    {
      id: '01',
      title: 'Solar Location Finder',
      description: 'Compare registered rooftops using location, shading and declared roof data.',
      icon: MapPin,
      iconBg: 'bg-orange-50 text-[#FF6B16]',
      route: '/solar-features?feature=solar-location-finder',
    },
    {
      id: '02',
      title: 'Energy Prediction',
      description: 'Model solar generation with climatology and declared shading assumptions.',
      icon: BarChart3,
      iconBg: 'bg-emerald-50 text-[#16A34A]',
      route: '/solar-features?feature=solar-prediction',
    },
    {
      id: '03',
      title: 'Budget Optimizer',
      description: 'Compare discrete capacities to maximize the selected budget objective.',
      icon: Layers,
      iconBg: 'bg-blue-50 text-blue-600',
      route: '/optimize',
    },
    {
      id: '04',
      title: 'Electricity Demand Analysis',
      description: 'Match solar generation with your energy needs.',
      icon: Activity,
      iconBg: 'bg-purple-50 text-purple-600',
      route: '/solar-features?feature=demand-analysis',
    },
    {
      id: '05',
      title: 'Solar Surplus Detection',
      description: 'Identify excess generation opportunities.',
      icon: Sun,
      iconBg: 'bg-amber-50 text-amber-500',
      route: '/insights',
    },
    {
      id: '06',
      title: 'Smart Scheduling',
      description: 'Shift flexible electricity loads into available solar windows.',
      icon: Calendar,
      iconBg: 'bg-sky-50 text-sky-600',
      route: '/scheduling',
    },
    {
      id: '07',
      title: 'Solar Monitoring',
      description: 'Track performance across all your sites.',
      icon: Tv2,
      iconBg: 'bg-teal-50 text-teal-600',
      route: '/solar-features?feature=performance-monitoring',
    },
    {
      id: '08',
      title: 'Panel Health / Fault Detection',
      description: 'Detect issues and performance drops early.',
      icon: HeartPulse,
      iconBg: 'bg-rose-50 text-rose-500',
      route: '/solar-features?feature=panel-fault-detection',
    },
    {
      id: '09',
      title: 'Maintenance Advisor',
      description: 'Review maintenance suggestions from uploaded performance and fault evidence.',
      icon: Wrench,
      iconBg: 'bg-slate-100 text-slate-700',
      route: '/solar-features?feature=maintenance-recommendations',
    },
    {
      id: '10',
      title: 'Financial Savings Calculator',
      description: 'Estimate savings, payback period and ROI.',
      icon: DollarSign,
      iconBg: 'bg-green-50 text-green-600',
      route: '/solar-features?feature=cost-savings',
    },
    {
      id: '11',
      title: 'Environmental Impact',
      description: 'Measure and report CO₂ reduction and sustainability impact.',
      icon: Leaf,
      iconBg: 'bg-emerald-50 text-emerald-600',
      route: '/solar-features?feature=environmental-impact',
    },
    {
      id: '12',
      title: 'Report Generator',
      description: 'Create professional reports for stakeholders.',
      icon: FileText,
      iconBg: 'bg-indigo-50 text-indigo-700',
      route: '/reports',
    },
  ];

  return (
    <section id="features" className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Warm off-white rounded wrapper matching screenshot */}
      <div className="bg-[#F8FAFC] rounded-3xl p-6 sm:p-10 lg:p-12 border border-[#E8EDF4]">

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1739] tracking-tight">
            All Features in One Platform
          </h2>
          <p className="mt-2.5 text-base text-[#61708A]">
            Everything you need to plan, analyze, and manage rooftop solar projects.
          </p>
        </div>

        {/* 4 cols × 3 rows feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <Link
                key={feat.id}
                to={feat.route}
                aria-label={`Open ${feat.title}`}
                className="bg-white rounded-2xl p-5 border border-[#E8EDF4] shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-1 cursor-pointer flex flex-col justify-between group relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF6B16]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl ${feat.iconBg} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-slate-300 group-hover:text-[#FF6B16] transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#0B1739] mb-1.5 group-hover:text-[#FF6B16] transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#61708A] leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] font-semibold text-[#FF6B16] opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Open Tool</span>
                  <span>→</span>
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </section>
  );
};
