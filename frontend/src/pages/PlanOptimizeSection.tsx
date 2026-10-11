import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, CalendarClock, Sparkles } from 'lucide-react';
import { OptimizerPage } from './OptimizerPage';
import { SchedulingPage } from './SchedulingPage';
import { RecommendationsPage } from './RecommendationsPage';

export const PlanOptimizeSection: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'optimizer';

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-4">
      {/* Section Sub-Navigation Bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-2 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          <button
            onClick={() => setTab('optimizer')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'optimizer'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Knapsack Budget Optimizer</span>
          </button>

          <button
            onClick={() => setTab('scheduling')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'scheduling'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Surplus-to-Load & Battery Dispatch</span>
          </button>

          <button
            onClick={() => setTab('recommendations')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'recommendations'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Phased Rollout Advisory</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 pr-3">
          <span className="font-semibold text-slate-700">Section 2</span>
          <span>•</span>
          <span>Plan & Optimize</span>
        </div>
      </div>

      {/* Render active sub-view */}
      <div>
        {currentTab === 'optimizer' && <OptimizerPage />}
        {currentTab === 'scheduling' && <SchedulingPage />}
        {currentTab === 'recommendations' && <RecommendationsPage />}
      </div>
    </div>
  );
};
export default PlanOptimizeSection;
