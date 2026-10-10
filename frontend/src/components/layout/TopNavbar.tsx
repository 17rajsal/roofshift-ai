import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import { formatINR, formatArea } from '../../utils/formatters';
import { Sparkles, FileText, CheckCircle, Sliders, MapPin, Building, Cloud } from 'lucide-react';
import { AwsIntegrationsModal } from '../AwsIntegrationsModal';

export const TopNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const [showAwsModal, setShowAwsModal] = useState(false);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Executive Solar Portfolio Overview';
      case '/map': return 'Interactive Rooftop Solar Map & GIS';
      case '/buildings': return 'Candidate Building Profiles & Demand';
      case '/optimize': return 'Knapsack Budget Optimizer & Solver';
      case '/insights': return 'Diurnal Solar Surplus & Load Balance';
      case '/scheduling': return 'Smart Electricity Load Shifting';
      case '/recommendations': return 'Explainable Recommendations Feed';
      case '/reports': return 'Official Planning & Investment Report';
      default: return 'RoofShift AI';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E5EAE7] px-6 flex items-center justify-between shadow-xs sticky top-0 z-30">
      {/* Page Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
          <span>RoofShift AI</span>
          <span>/</span>
          <span className="text-emerald-700 font-medium">
            {activeProject ? activeProject.name : 'No Project'}
          </span>
          <span>/</span>
          <span className="text-slate-800 font-semibold">{getPageTitle()}</span>
        </div>
        <h1 className="text-base font-bold text-[#17231F] leading-tight flex items-center gap-2">
          {getPageTitle()}
          {activeProject?.is_demo === 'true' && (
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
              Delhi Campus Demo
            </span>
          )}
        </h1>
      </div>

      {/* Project Status Strip & Quick Actions */}
      <div className="flex items-center gap-4">
        {activeProject && (
          <div className="hidden lg:flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>{activeProject.city}</span>
            </div>
            <div className="h-3 w-px bg-slate-300" />
            <div className="flex items-center gap-1.5 text-slate-600">
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              <span>{activeProject.building_count} Buildings ({formatArea(activeProject.total_roof_area)})</span>
            </div>
            <div className="h-3 w-px bg-slate-300" />
            <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
              <span>Budget: {formatINR(activeProject.budget)}</span>
            </div>
          </div>
        )}

        {/* Sync Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium">Synced</span>
        </div>

        {/* AWS Architecture & Integrations Matrix */}
        <button
          onClick={() => setShowAwsModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100/80 shadow-xs transition-colors"
          title="Inspect live AWS Architecture & Local Fallbacks Matrix"
        >
          <Cloud className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline">AWS Architecture</span>
          <span className="text-[10px] bg-amber-200/70 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">10</span>
        </button>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/optimize')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#123C32] text-white hover:bg-[#0B251F] shadow-xs transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-[#F5B942]" />
            <span>Optimize</span>
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <AwsIntegrationsModal isOpen={showAwsModal} onClose={() => setShowAwsModal(false)} />
    </header>
  );
};
