import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileCheck2, SunMedium, BarChart3 } from 'lucide-react';
import { ReportPage } from './ReportPage';
import { SolarFeaturesPage } from './SolarFeaturesPage';

export const InsightsReportsSection: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'reports';

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-4">
      {/* Section Sub-Navigation Bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-2 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          <button
            onClick={() => setTab('reports')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'reports'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Executive PDF Reports</span>
          </button>

          <button
            onClick={() => setTab('capabilities')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'capabilities'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <SunMedium className="w-4 h-4" />
            <span>12-Feature Capability Suite</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 pr-3">
          <span className="font-semibold text-slate-700">Section 4</span>
          <span>•</span>
          <span>Insights & Reports</span>
        </div>
      </div>

      {/* Render active sub-view */}
      <div>
        {currentTab === 'reports' && <ReportPage />}
        {currentTab === 'capabilities' && <SolarFeaturesPage />}
      </div>
    </div>
  );
};
export default InsightsReportsSection;
