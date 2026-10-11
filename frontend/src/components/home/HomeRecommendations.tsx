import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Wrench, BarChart2, Leaf, ArrowRight } from 'lucide-react';

export const HomeRecommendations: React.FC = () => {
  const navigate = useNavigate();

  const recommendations = [
    {
      id: 1,
      title: 'High Potential Roofs Identified',
      description: '2 new buildings with excellent solar potential.',
      icon: Sun,
      iconBg: 'bg-amber-50 text-amber-500',
      badge: 'High Impact',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      time: 'Illustrative example',
      route: '/map',
    },
    {
      id: 2,
      title: 'Schedule Maintenance',
      description: '3 sites show early signs of performance drop.',
      icon: Wrench,
      iconBg: 'bg-slate-100 text-slate-700',
      badge: 'Recommended',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      time: 'Illustrative example',
      route: '/solar-features?feature=maintenance-recommendations',
    },
    {
      id: 3,
      title: 'Optimize System Size',
      description: 'Compare projected savings under a revised configuration.',
      icon: BarChart2,
      iconBg: 'bg-blue-50 text-blue-600',
      badge: 'Suggestion',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      time: 'Illustrative example',
      route: '/optimize',
    },
    {
      id: 4,
      title: 'New Sustainability Report',
      description: 'Create an environmental planning report from saved results.',
      icon: Leaf,
      iconBg: 'bg-emerald-50 text-emerald-600',
      badge: 'New',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
      time: 'Illustrative example',
      route: '/reports',
    },
  ];

  return (
    <section className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header + View All button */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1739] tracking-tight">
            Example Actions & Planning Tools
          </h2>
          <p className="mt-2 text-base text-[#61708A]">
            Illustrative examples only. Open a tool for your saved project findings.
          </p>
        </div>

        <button
          onClick={() => navigate('/recommendations')}
          className="glass-button-secondary px-4 py-2 text-xs cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#FF6B16]" />
        </button>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {recommendations.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.route}
              aria-label={`Open ${item.title}`}
              className="glass-panel glass-panel-hover p-6 rounded-3xl border border-white/85 shadow-sm cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>

                <h3 className="text-sm sm:text-base font-bold text-[#0B1739] mb-1.5 group-hover:text-[#FF6B16] transition-colors leading-snug">
                  {item.title}
                </h3>

                <p className="text-xs text-[#61708A] leading-relaxed mb-4">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px]">
                <span className={`px-2.5 py-0.5 rounded-full font-bold border ${item.badgeClass}`}>
                  {item.badge}
                </span>
                <span className="text-slate-400 font-medium">
                  {item.time}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
