import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectProvider } from './context/ProjectContext';
import { AppSidebar } from './components/layout/AppSidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { NewProjectModal } from './components/layout/NewProjectModal';

import { HomePage } from './pages/HomePage';
import { SolarMapPage } from './pages/SolarMapPage';
import { BuildingsPage } from './pages/BuildingsPage';
import { OptimizerPage } from './pages/OptimizerPage';
import { EnergyInsightsPage } from './pages/EnergyInsightsPage';
import { SchedulingPage } from './pages/SchedulingPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { ReportPage } from './pages/ReportPage';
import { SolarFeaturesPage } from './pages/SolarFeaturesPage';

export function App() {
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  return (
    <ProjectProvider>
      <BrowserRouter>
        <div className="flex h-screen w-screen overflow-hidden bg-[#F6F8F7]">
          {/* Main App Sidebar */}
          <AppSidebar onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)} />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            <TopNavbar />

            {/* Scrollable Page Body */}
            <main className="flex-1 overflow-y-auto px-6 py-6">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/map" element={<SolarMapPage />} />
                <Route path="/buildings" element={<BuildingsPage />} />
                <Route path="/optimize" element={<OptimizerPage />} />
                <Route path="/insights" element={<EnergyInsightsPage />} />
                <Route path="/scheduling" element={<SchedulingPage />} />
                <Route path="/recommendations" element={<RecommendationsPage />} />
                <Route path="/reports" element={<ReportPage />} />
                <Route path="/solar-features" element={<SolarFeaturesPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>

        {/* Global New Project Modal */}
        <NewProjectModal
          isOpen={isNewProjectModalOpen}
          onClose={() => setIsNewProjectModalOpen(false)}
        />
      </BrowserRouter>
    </ProjectProvider>
  );
}

export default App;
