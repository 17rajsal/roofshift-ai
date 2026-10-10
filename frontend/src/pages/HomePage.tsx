import React, { useState } from 'react';
import { HomeNavbar } from '../components/home/HomeNavbar';
import { HomeHero } from '../components/home/HomeHero';
import { HomeStatistics } from '../components/home/HomeStatistics';
import { HomeWorkflow } from '../components/home/HomeWorkflow';
import { HomeFeatureGrid } from '../components/home/HomeFeatureGrid';
import { HomeModuleShowcase } from '../components/home/HomeModuleShowcase';
import { HomeCampusOverview } from '../components/home/HomeCampusOverview';
import { HomeRecommendations } from '../components/home/HomeRecommendations';
import { HomeValueStrip } from '../components/home/HomeValueStrip';
import { HomeFAQ } from '../components/home/HomeFAQ';
import { HomeFooter } from '../components/home/HomeFooter';
import { DemoRequestModal } from '../components/home/DemoRequestModal';

export const HomePage: React.FC = () => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-[#0B1739] font-sans antialiased selection:bg-[#FFF4E9] selection:text-[#FF6B16] flex flex-col">
      {/* 1. Header / Navbar */}
      <HomeNavbar onRequestDemo={() => setIsDemoModalOpen(true)} />

      {/* Main Page Flow Matching Reference Screenshot Sequence */}
      <main className="flex-1">
        {/* 2. Hero Section with Photorealistic Aerial Imagery & Floating Analytics */}
        <HomeHero onRequestDemo={() => setIsDemoModalOpen(true)} />

        {/* 3. Live 5-Card Statistics Section */}
        <HomeStatistics />

        {/* 4. How RoofShift AI Works (5-Step Process) */}
        <HomeWorkflow />

        {/* 5. All Features in One Platform (12-Feature Interactive Grid) */}
        <HomeFeatureGrid />

        {/* 6. Powerful Modules for Real Impact (3 Large Showcase Cards) */}
        <HomeModuleShowcase />

        {/* 7. Campus & Portfolio Overview (Interactive Geospatial View + Site Insights) */}
        <HomeCampusOverview />

        {/* 8. Recommended Actions & Recent Updates */}
        <HomeRecommendations />

        {/* 9. Real Value for a Cleaner Future (Pale Green Value Strip) */}
        <HomeValueStrip />

        {/* 10. Have Questions? (FAQ Section) */}
        <HomeFAQ />
      </main>

      {/* 11. Multi-Column SaaS Footer */}
      <HomeFooter />

      {/* Interactive Demo Request Dialog */}
      <DemoRequestModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
};
