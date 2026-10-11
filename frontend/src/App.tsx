import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { AppSidebar } from './components/layout/AppSidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { NewProjectModal } from './components/layout/NewProjectModal';
import { SlidersHorizontal } from 'lucide-react';

// Pages
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const WorkspaceHub = lazy(() => import('./pages/WorkspaceHub').then(m => ({ default: m.WorkspaceHub })));
const ExploreAnalyzeSection = lazy(() => import('./pages/ExploreAnalyzeSection').then(m => ({ default: m.ExploreAnalyzeSection })));
const PlanOptimizeSection = lazy(() => import('./pages/PlanOptimizeSection').then(m => ({ default: m.PlanOptimizeSection })));
const MonitorMaintainSection = lazy(() => import('./pages/MonitorMaintainSection').then(m => ({ default: m.MonitorMaintainSection })));
const InsightsReportsSection = lazy(() => import('./pages/InsightsReportsSection').then(m => ({ default: m.InsightsReportsSection })));

const SolarMapPage = lazy(() => import('./pages/SolarMapPage').then(m => ({ default: m.SolarMapPage })));
const BuildingsPage = lazy(() => import('./pages/BuildingsPage').then(m => ({ default: m.BuildingsPage })));
const OptimizerPage = lazy(() => import('./pages/OptimizerPage').then(m => ({ default: m.OptimizerPage })));
const EnergyInsightsPage = lazy(() => import('./pages/EnergyInsightsPage').then(m => ({ default: m.EnergyInsightsPage })));
const SchedulingPage = lazy(() => import('./pages/SchedulingPage').then(m => ({ default: m.SchedulingPage })));
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage').then(m => ({ default: m.RecommendationsPage })));
const OperationsPage = lazy(() => import('./pages/OperationsPage').then(m => ({ default: m.OperationsPage })));
const ReportPage = lazy(() => import('./pages/ReportPage').then(m => ({ default: m.ReportPage })));

const SolarFeaturesPage = lazy(() => import('./pages/SolarFeaturesPage').then(module => ({ default: module.SolarFeaturesPage })));

function ApplicationShell() {
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const { activeProject, loading, error, refreshProjects } = useProject();
  const location = useLocation();

  useEffect(() => { setNavigationOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!navigationOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setNavigationOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [navigationOpen]);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#F8FBFF] text-[#0B1739]">
      {/* Ambient background glows */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-blue-300/25 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/4 -right-40 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 left-1/3 w-96 h-96 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main App Sidebar */}
      {navigationOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setNavigationOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs md:hidden"
        />
      )}
      <AppSidebar
        mobileOpen={navigationOpen}
        onClose={() => setNavigationOpen(false)}
        onOpenNewProjectModal={() => {
          setNavigationOpen(false);
          setIsNewProjectModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        <TopNavbar onOpenNavigation={() => setNavigationOpen(true)} />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-2 sm:px-4 pb-4">
          {error && (
            <div
              role="alert"
              className="mb-4 mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/80 backdrop-blur-md p-4 text-xs font-medium text-rose-800 shadow-sm"
            >
              <span>{error}</span>
              <button
                onClick={() => void refreshProjects()}
                className="font-bold underline cursor-pointer hover:text-rose-900"
              >
                Retry connection
              </button>
            </div>
          )}

          {loading && !activeProject ? (
            <div className="flex items-center justify-center p-12">
              <div className="glass-panel p-6 rounded-2xl flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-[#FF6B16] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold text-[#0B1739]">
                  Loading clean energy portfolio workspace…
                </span>
              </div>
            </div>
          ) : !activeProject ? (
            <div className="glass-elevated p-8 text-center max-w-md mx-auto my-12 rounded-3xl shadow-xl border border-white/80">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/15 text-[#FF6B16] flex items-center justify-center mx-auto mb-4">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-[#0B1739]">Portfolio Not Found</h2>
              <p className="my-2.5 text-xs text-[#61708A] leading-relaxed">
                Create a commercial rooftop solar planning portfolio to map buildings and optimize clean energy Capex allocations.
              </p>
              <button
                onClick={() => setIsNewProjectModalOpen(true)}
                className="glass-button-primary px-5 py-2.5 text-xs cursor-pointer shadow-md"
              >
                Create Solar Portfolio
              </button>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex items-center justify-center p-12">
                  <div className="glass-panel p-6 rounded-2xl flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-[#FF6B16] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-semibold text-[#0B1739]">
                      Loading engineering workspace…
                    </span>
                  </div>
                </div>
              }
            >
              <Routes key={activeProject.id}>
                {/* V8 Simplified 4-Section SaaS Workspace */}
                <Route path="/workspace" element={<WorkspaceHub />} />
                <Route path="/workspace/explore" element={<ExploreAnalyzeSection />} />
                <Route path="/workspace/plan" element={<PlanOptimizeSection />} />
                <Route path="/workspace/monitor" element={<MonitorMaintainSection />} />
                <Route path="/workspace/insights" element={<InsightsReportsSection />} />

                {/* Direct feature views maintained for seamless backward compatibility */}
                <Route path="/map" element={<SolarMapPage />} />
                <Route path="/buildings" element={<BuildingsPage />} />
                <Route path="/optimize" element={<OptimizerPage />} />
                <Route path="/insights" element={<EnergyInsightsPage />} />
                <Route path="/scheduling" element={<SchedulingPage />} />
                <Route path="/recommendations" element={<RecommendationsPage />} />
                <Route path="/solar-features" element={<SolarFeaturesPage />} />
                <Route path="/operations" element={<OperationsPage />} />
                <Route path="/reports" element={<ReportPage />} />
                <Route path="*" element={<Navigate to="/workspace" replace />} />
              </Routes>
            </Suspense>
          )}
        </main>
      </div>

      {/* Global New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ProjectProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white text-slate-500 font-semibold text-sm">Loading RoofShift AI…</div>}>
          <Routes>
            {/* 1. Public Master SaaS Landing Page */}
            <Route path="/" element={<HomePage />} />

            {/* 2. Operational Workspace Tools */}
            <Route path="/*" element={<ApplicationShell />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ProjectProvider>
  );
}

export default App;
