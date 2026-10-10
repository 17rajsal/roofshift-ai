import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import { formatINR, formatArea } from '../../utils/formatters';
import { FileText, CheckCircle2, SlidersHorizontal, MapPin, Building, Cloud, Menu, ChevronRight } from 'lucide-react';
import { AwsIntegrationsModal } from '../AwsIntegrationsModal';

export const TopNavbar: React.FC<{ onOpenNavigation: () => void }> = ({ onOpenNavigation }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeProject, loading, error } = useProject();
  const [showAwsModal, setShowAwsModal] = useState(false);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Portfolio Overview';
      case '/map': return 'Solar Explorer';
      case '/buildings': return 'Building Catalog';
      case '/optimize': return 'Budget Optimizer';
      case '/insights': return 'Energy Analytics';
      case '/scheduling': return 'Smart Scheduling';
      case '/operations': return 'Operations & Care';
      case '/recommendations': return 'Advisory Insights';
      case '/reports': return 'Executive Reports';
      default: return 'RoofShift AI';
    }
  };

  return (
    <header className="h-14 shrink-0 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 select-none">
      <button onClick={onOpenNavigation} aria-label="Open navigation" aria-controls="app-navigation" className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 md:hidden">
        <Menu className="h-5 w-5" />
      </button>

      {/* Page Title & Breadcrumbs */}
      <div className="min-w-0 flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
          <span className="font-medium text-slate-600 truncate max-w-[140px]">
            {activeProject ? activeProject.name : 'Portfolio'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        </div>
        <h1 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <span>{getPageTitle()}</span>
          {activeProject?.is_demo === 'true' && (
            <span className="hidden md:inline-flex text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              Delhi Campus Demo
            </span>
          )}
        </h1>
      </div>

      {/* Project Status Strip & Quick Actions */}
      <div className="flex items-center gap-3">
        {activeProject && (
          <div className="hidden xl:flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-md px-3 py-1 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{activeProject.city}</span>
            </div>
            <div className="h-3 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5 text-slate-600">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>{activeProject.building_count} Roofs ({formatArea(activeProject.total_roof_area)})</span>
            </div>
            <div className="h-3 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5 text-slate-800 font-semibold tabular-nums">
              <span>Budget: {formatINR(activeProject.budget)}</span>
            </div>
          </div>
        )}

        {/* Sync Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-md">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium text-[11px]">{loading ? 'Syncing…' : error ? 'Offline' : 'Online'}</span>
        </div>

        {/* AWS Architecture & Integrations Matrix */}
        <button
          onClick={() => setShowAwsModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100/80 transition-colors"
          title="Inspect live AWS Architecture & Local Fallbacks Matrix"
        >
          <Cloud className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline text-xs font-semibold">AWS Stack</span>
          <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded">10</span>
        </button>

        {/* Quick Actions */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => navigate('/optimize')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>Optimize</span>
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-2xs"
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

