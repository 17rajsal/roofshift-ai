import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, Wrench, ShieldAlert } from 'lucide-react';
import { OperationsPage } from './OperationsPage';

export const MonitorMaintainSection: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'telemetry';

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-4">
      {/* Section Sub-Navigation Bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-2 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          <button
            onClick={() => setTab('telemetry')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'telemetry'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Real-Time Generation Telemetry</span>
          </button>

          <button
            onClick={() => setTab('faults')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'faults'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>String Inverter Faults & Soiling</span>
          </button>

          <button
            onClick={() => setTab('maintenance')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'maintenance'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Maintenance Action Advisor</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 pr-3">
          <span className="font-semibold text-slate-700">Section 3</span>
          <span>•</span>
          <span>Monitor & Maintain</span>
        </div>
      </div>

      {/* Render active sub-view (OperationsPage hosts all subcomponents with internal tab anchors) */}
      <div>
        <OperationsPage />
      </div>
    </div>
  );
};
export default MonitorMaintainSection;
