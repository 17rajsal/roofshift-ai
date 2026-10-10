import React from 'react';
import { Building2, Maximize2, Zap, Layers, Leaf } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export const HomeStatistics: React.FC = () => {
  const { activeProject } = useProject();

  // If a live project is active, we can show real calculated numbers with realistic scale,
  // while preserving the reference demo statistics as baseline.
  const hasLiveActive = Boolean(activeProject && activeProject.building_count > 0);

  const stats = [
    {
      id: 'buildings',
      label: 'Total Buildings',
      value: hasLiveActive && activeProject ? String(activeProject.building_count) : '124',
      description: 'analyzed',
      icon: Building2,
      iconBg: 'bg-amber-50 text-amber-500',
    },
    {
      id: 'area',
      label: 'Total Roof Area',
      value: hasLiveActive && activeProject
        ? `${activeProject.total_roof_area.toLocaleString()} m²`
        : '245,000 m²',
      description: 'usable space',
      icon: Maximize2,
      iconBg: 'bg-emerald-50 text-emerald-500',
    },
    {
      id: 'generation',
      label: 'Estimated Generation',
      value: hasLiveActive && activeProject
        ? `${Math.round(activeProject.total_roof_area * 0.42)} MWh/year`
        : '836 MWh/year',
      description: 'clean energy potential',
      icon: Zap,
      iconBg: 'bg-orange-50 text-[#FF6B16]',
    },
    {
      id: 'optimization',
      label: 'Budget Optimization',
      value: '22%',
      description: 'higher ROI',
      icon: Layers,
      iconBg: 'bg-blue-50 text-blue-500',
    },
    {
      id: 'savings',
      label: 'Estimated Savings',
      value: hasLiveActive && activeProject
        ? `₹${Math.round((activeProject.total_roof_area * 0.42 * 8.5) / 100000)} Lakh/yr`
        : '$125,000/year',
      description: 'energy cost savings',
      icon: Leaf,
      iconBg: 'bg-green-50 text-[#16A34A]',
    },
  ];

  return (
    <section className="relative z-10 -mt-6 sm:-mt-10 max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 mb-20">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8EDF4] shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-[13px] font-semibold text-[#61708A]">
                  {stat.label}
                </span>
                <div className={`w-8 h-8 rounded-full ${stat.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-black text-[#0B1739] tracking-tight">
                  {stat.value}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
                  {stat.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
