import React, { useEffect, useState } from 'react';
import { Building2, Maximize2, Zap, Layers, Leaf } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { api } from '../../services/api';
import type { OptimizationRunResponse } from '../../types/models';

export const HomeStatistics: React.FC = () => {
  const { activeProject } = useProject();

  const [latest, setLatest] = useState<OptimizationRunResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLatest(null);
    setFailed(false);
    if (!activeProject) {
      setPending(false);
      return;
    }
    setPending(true);
    api.getOptimizationRuns(activeProject.id)
      .then(runs => { if (!cancelled) setLatest(runs[0] ?? null); })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setPending(false); });
    return () => { cancelled = true; };
  }, [activeProject?.id]);

  const awaiting = !activeProject ? 'Select portfolio' : pending ? 'Loading…' : failed ? 'Unavailable' : 'Run optimizer';
  const money = (value: number) => `₹${(value / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Lakh`;
  const stats = [
    {
      id: 'buildings', label: 'Total Buildings',
      value: activeProject ? String(activeProject.building_count) : '—',
      description: 'registered in selected portfolio', icon: Building2, iconBg: 'bg-amber-50 text-amber-500',
    },
    {
      id: 'area', label: 'Total Roof Area',
      value: activeProject ? `${activeProject.total_roof_area.toLocaleString()} m²` : '—',
      description: 'declared gross roof area', icon: Maximize2, iconBg: 'bg-emerald-50 text-emerald-500',
    },
    {
      id: 'generation', label: 'Estimated Generation',
      value: latest ? `${(latest.total_annual_generation_kwh / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} MWh/year` : awaiting,
      description: 'latest saved planning estimate', icon: Zap, iconBg: 'bg-orange-50 text-[#FF6B16]',
    },
    {
      id: 'optimization', label: 'Allocated Budget',
      value: latest ? money(latest.total_allocated_inr) : awaiting,
      description: 'latest saved optimization', icon: Layers, iconBg: 'bg-blue-50 text-blue-500',
    },
    {
      id: 'savings', label: 'Estimated Savings',
      value: latest ? `${money(latest.total_annual_savings_inr)}/yr` : awaiting,
      description: 'declared tariff assumptions', icon: Leaf, iconBg: 'bg-green-50 text-green-600',
    },
  ];

  return (
    <section className="relative z-10 -mt-6 sm:-mt-10 max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 mb-20">
      <p className="mb-3 text-xs font-medium text-slate-500">Selected portfolio totals and saved planning results. These are not live meter readings.</p>
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
