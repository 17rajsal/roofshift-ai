import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProject } from '../../context/ProjectContext';
import { formatINR, formatArea } from '../../utils/formatters';
import {
  FileText,
  SlidersHorizontal,
  MapPin,
  Building,
  Cloud,
  Menu,
  ChevronRight,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { AwsIntegrationsModal } from '../AwsIntegrationsModal';
import { SolarMLForecastModal } from '../SolarMLForecastModal';

export const TopNavbar: React.FC<{ onOpenNavigation: () => void }> = ({ onOpenNavigation }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeProject, loading, error } = useProject();
  const [showAwsModal, setShowAwsModal] = useState(false);
  const [showMLModal, setShowMLModal] = useState(false);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Portfolio Overview';
      case '/workspace':
        return 'Solar Intelligence Workspace';
      case '/workspace/explore':
        return 'Section 1 — Explore & Analyze';
      case '/workspace/plan':
        return 'Section 2 — Plan & Optimize';
      case '/workspace/monitor':
        return 'Section 3 — Monitor & Maintain';
      case '/workspace/insights':
        return 'Section 4 — Insights & Reports';
      case '/map':
        return 'Solar Explorer & Thermal Intelligence';
      case '/buildings':
        return 'Building Catalog & Rooftops';
      case '/optimize':
        return 'Knapsack Budget Optimizer';
      case '/insights':
        return 'Energy Analytics & Solar Climatology';
      case '/scheduling':
        return 'Smart Load Shifting & Battery Dispatch';
      case '/operations':
        return 'Solar Monitoring, Telemetry & Diagnostics';
      case '/solar-features':
        return '12-Feature Intelligence Suite';
      case '/recommendations':
        return 'AI Advisory & Retrofit Insights';
      case '/reports':
        return 'Executive Engineering Reports';
      default:
        return 'RoofShift AI Workspace';
    }
  };

  return (
    <>
      <header className="h-16 mx-2 sm:mx-3 mt-2 sm:mt-3 mb-1 px-4 sm:px-6 rounded-2xl glass-panel shrink-0 flex items-center justify-between gap-3 sticky top-2 z-30 select-none shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenNavigation}
            aria-label="Open navigation"
            aria-controls="app-navigation"
            className="p-2 rounded-xl hover:bg-white/70 text-[#0B1739] md:hidden transition-colors cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb & Title */}
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#61708A]">
              <span className="font-semibold text-[#0B1739] truncate max-w-[150px]">
                {activeProject ? activeProject.name : 'Portfolio'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-[#0B1739] tracking-tight truncate flex items-center gap-2">
              <span>{getPageTitle()}</span>
              {activeProject?.is_demo === 'true' && (
                <span className="hidden lg:inline-flex text-[10px] font-bold bg-orange-500/10 text-[#FF6B16] border border-orange-500/25 px-2 py-0.5 rounded-full">
                  Verified Delhi Campus
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Project Status Strip & Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {activeProject && (
            <div className="hidden xl:flex items-center gap-3 bg-white/60 border border-white/80 rounded-xl px-3.5 py-1.5 text-xs shadow-2xs">
              <div className="flex items-center gap-1.5 text-[#0B1739] font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#FF6B16]" />
                <span>{activeProject.city}</span>
              </div>
              <div className="h-3 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5 text-[#0B1739] font-medium">
                <Building className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  {activeProject.building_count} Roofs ({formatArea(activeProject.total_roof_area)})
                </span>
              </div>
              <div className="h-3 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5 text-[#0B1739] font-bold tabular-nums">
                <span className="text-[#61708A] font-medium">Budget:</span>
                <span className="text-emerald-700">{formatINR(activeProject.budget)}</span>
              </div>
            </div>
          )}

          {/* NASA & AWS Cloud Sync Pill */}
          <button
            onClick={() => setShowAwsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/70 hover:bg-white text-[#0B1739] border border-white/90 shadow-2xs transition-all cursor-pointer group"
            title="Inspect Cloud Architecture and NASA Climatology Pipeline"
          >
            <Cloud className="w-4 h-4 text-blue-500 group-hover:text-[#FF6B16] transition-colors" />
            <span className="hidden md:inline">AWS & NASA Sync</span>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-700 border border-emerald-500/20 font-bold px-1.5 py-0.5 rounded-full">
              Live
            </span>
          </button>

          {/* Solar ML Forecast Model Pill */}
          <button
            onClick={() => setShowMLModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/70 hover:bg-white text-[#0B1739] border border-white/90 shadow-2xs transition-all cursor-pointer group"
            title="Real Machine Learning Solar Generation Forecaster & Benchmark"
          >
            <Sparkles className="w-4 h-4 text-[#FF6B16] group-hover:rotate-12 transition-transform" />
            <span className="hidden md:inline">Solar ML</span>
            <span className="text-[10px] bg-amber-500/15 text-amber-800 border border-amber-500/25 font-bold px-1.5 py-0.5 rounded-full">
              XGBoost
            </span>
          </button>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/optimize')}
              className="glass-button-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Optimize</span>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="glass-button-secondary px-3 py-1.5 text-xs hidden md:flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-[#61708A]" />
              <span>Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* Global AWS Integrations & Architecture Modal */}
      <AwsIntegrationsModal
        isOpen={showAwsModal}
        onClose={() => setShowAwsModal(false)}
      />

      {/* Real Machine Learning Solar Generation Forecaster Modal */}
      <SolarMLForecastModal
        isOpen={showMLModal}
        onClose={() => setShowMLModal(false)}
      />
    </>
  );
};
