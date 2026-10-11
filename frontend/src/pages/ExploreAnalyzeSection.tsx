import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Globe, Compass, Building, Activity, Flame } from 'lucide-react';
import { IndiaSolarMap } from '../components/map/IndiaSolarMap';
import { SolarMapPage } from './SolarMapPage';
import { BuildingsPage } from './BuildingsPage';
import { EnergyInsightsPage } from './EnergyInsightsPage';
import { OperationsPage } from './OperationsPage';

export const ExploreAnalyzeSection: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'india';

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-4">
      {/* Section Sub-Navigation Bar */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-2 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          <button
            onClick={() => setTab('india')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'india'
                ? 'bg-[#FF6B16] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>India Solar Map</span>
          </button>

          <button
            onClick={() => setTab('map')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'map'
                ? 'bg-[#FF6B16] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Campus GIS Rooftops</span>
          </button>

          <button
            onClick={() => setTab('buildings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'buildings'
                ? 'bg-[#FF6B16] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Building Catalog & Roofs</span>
          </button>

          <button
            onClick={() => setTab('forecast')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'forecast'
                ? 'bg-[#FF6B16] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Solar Climatology & Forecast</span>
          </button>

          <button
            onClick={() => setTab('thermal')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentTab === 'thermal'
                ? 'bg-[#FF6B16] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Thermal Hotspot Inspection</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 pr-3">
          <span className="font-semibold text-slate-700">Section 1</span>
          <span>•</span>
          <span>Explore & Analyze</span>
        </div>
      </div>

      {/* Render active sub-view */}
      <div>
        {currentTab === 'india' && (
          <div className="space-y-4">
            <IndiaSolarMap
              onDrillDownToSite={() => setTab('map')}
              onOpenSampleCampus={() => setTab('map')}
            />
          </div>
        )}
        {currentTab === 'map' && <SolarMapPage />}
        {currentTab === 'buildings' && <BuildingsPage />}
        {currentTab === 'forecast' && <EnergyInsightsPage />}
        {currentTab === 'thermal' && <OperationsPage />}
      </div>
    </div>
  );
};
export default ExploreAnalyzeSection;
