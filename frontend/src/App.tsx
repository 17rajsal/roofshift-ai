import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { AppSidebar } from './components/layout/AppSidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { NewProjectModal } from './components/layout/NewProjectModal';

// Pages
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Main App Sidebar */}
      {navigationOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setNavigationOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
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
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopNavbar onOpenNavigation={() => setNavigationOpen(true)} />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {error && (
            <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <span>{error}</span>
              <button onClick={() => void refreshProjects()} className="font-semibold underline">Retry connection</button>
            </div>
          )}

          {loading && !activeProject ? (
            <p role="status" className="p-6 text-sm text-slate-500">Loading portfolio workspace…</p>
          ) : !activeProject ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center max-w-md mx-auto my-12 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900">Portfolio Not Found</h2>
              <p className="my-2.5 text-xs text-slate-500">Create a solar planning portfolio to add building rooftops and optimize your clean energy capital.</p>
              <button onClick={() => setIsNewProjectModalOpen(true)} className="rounded-md bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition-colors">
                Create Portfolio
              </button>
            </div>
          ) : (
            <Suspense fallback={<p role="status" className="p-6 text-sm text-slate-500">Loading workspace tool…</p>}>
              <Routes key={activeProject.id}>
                <Route path="/map" element={<SolarMapPage />} />
                <Route path="/buildings" element={<BuildingsPage />} />
                <Route path="/optimize" element={<OptimizerPage />} />
                <Route path="/insights" element={<EnergyInsightsPage />} />
                <Route path="/scheduling" element={<SchedulingPage />} />
                <Route path="/recommendations" element={<RecommendationsPage />} />
                <Route path="/solar-features" element={<SolarFeaturesPage />} />
                <Route path="/operations" element={<OperationsPage />} />
                <Route path="/reports" element={<ReportPage />} />
                <Route path="*" element={<Navigate to="/map" replace />} />
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
