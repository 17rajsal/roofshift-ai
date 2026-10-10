import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { AppSidebar } from './components/layout/AppSidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { NewProjectModal } from './components/layout/NewProjectModal';

const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const SolarMapPage = lazy(() => import('./pages/SolarMapPage').then(module => ({ default: module.SolarMapPage })));
const BuildingsPage = lazy(() => import('./pages/BuildingsPage').then(module => ({ default: module.BuildingsPage })));
const OptimizerPage = lazy(() => import('./pages/OptimizerPage').then(module => ({ default: module.OptimizerPage })));
const EnergyInsightsPage = lazy(() => import('./pages/EnergyInsightsPage').then(module => ({ default: module.EnergyInsightsPage })));
const SchedulingPage = lazy(() => import('./pages/SchedulingPage').then(module => ({ default: module.SchedulingPage })));
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage').then(module => ({ default: module.RecommendationsPage })));
const OperationsPage = lazy(() => import('./pages/OperationsPage').then(module => ({ default: module.OperationsPage })));
const ReportPage = lazy(() => import('./pages/ReportPage').then(module => ({ default: module.ReportPage })));

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
          {navigationOpen && <button aria-label="Close navigation" onClick={() => setNavigationOpen(false)} className="fixed inset-0 z-40 bg-slate-900/50 md:hidden" />}
          <AppSidebar mobileOpen={navigationOpen} onClose={() => setNavigationOpen(false)} onOpenNewProjectModal={() => { setNavigationOpen(false); setIsNewProjectModalOpen(true); }} />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            <TopNavbar onOpenNavigation={() => setNavigationOpen(true)} />

            {/* Scrollable Page Body */}
            <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              {error && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button onClick={() => void refreshProjects()} className="font-semibold underline">Retry connection</button></div>}
              {loading && !activeProject ? <p role="status" className="p-6 text-sm text-slate-500">Loading portfolio workspaceâ€¦</p> : !activeProject ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center max-w-md mx-auto my-12 shadow-xs"><h2 className="text-lg font-bold text-slate-900">Portfolio Not Found</h2><p className="my-2.5 text-xs text-slate-500">Create a solar planning portfolio to add building rooftops and optimize your clean energy capital.</p><button onClick={() => setIsNewProjectModalOpen(true)} className="rounded-md bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition-colors">Create Portfolio</button></div> : <Suspense fallback={<p role="status" className="p-6 text-sm text-slate-500">Loading viewâ€¦</p>}>
              <Routes key={activeProject.id}>
                <Route path="/" element={<HomePage />} />
                <Route path="/map" element={<SolarMapPage />} />
                <Route path="/buildings" element={<BuildingsPage />} />
                <Route path="/optimize" element={<OptimizerPage />} />
                <Route path="/insights" element={<EnergyInsightsPage />} />
                <Route path="/scheduling" element={<SchedulingPage />} />
                <Route path="/recommendations" element={<RecommendationsPage />} />
                <Route path="/solar-features" element={<SolarFeaturesPage />} />
                <Route path="/operations" element={<OperationsPage />} />
                <Route path="/reports" element={<ReportPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Suspense>}
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
  return <ProjectProvider><BrowserRouter><ApplicationShell /></BrowserRouter></ProjectProvider>;
}

export default App;
