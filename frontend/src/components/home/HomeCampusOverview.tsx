import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  Plus,
  Minus,
  TrendingUp,
  Leaf,
  DollarSign,
  Activity
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export const HomeCampusOverview: React.FC = () => {
  const { projects, activeProject, setActiveProject } = useProject();
  const [activeTab, setActiveTab] = useState<'generation' | 'cost' | 'co2' | 'demand'>('generation');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Buildings list from active project or fallback to reference campus
  const sampleBuildings = [
    { id: 'b1', name: 'Academic Block', potential: 'excellent', area: 850, gen: 310, rating: 'Excellent' },
    { id: 'b2', name: 'Hostel A & B', potential: 'good', area: 620, gen: 235, rating: 'Good' },
    { id: 'b3', name: 'Central Library', potential: 'excellent', area: 440, gen: 175, rating: 'Excellent' },
    { id: 'b4', name: 'Auditorium', potential: 'moderate', area: 320, gen: 95, rating: 'Moderate' },
    { id: 'b5', name: 'Admin Complex', potential: 'low', area: 210, gen: 45, rating: 'Low' },
  ];

  // Month-by-month generation and demand chart data
  const monthlyData = [
    { month: 'Jan', solar: 55, demand: 78 },
    { month: 'Feb', solar: 68, demand: 80 },
    { month: 'Mar', solar: 88, demand: 92 },
    { month: 'Apr', solar: 98, demand: 110 },
    { month: 'May', solar: 108, demand: 125 },
    { month: 'Jun', solar: 92, demand: 120 },
    { month: 'Jul', solar: 74, demand: 115 },
    { month: 'Aug', solar: 70, demand: 110 },
    { month: 'Sep', solar: 82, demand: 98 },
    { month: 'Oct', solar: 78, demand: 88 },
    { month: 'Nov', solar: 64, demand: 82 },
    { month: 'Dec', solar: 52, demand: 76 },
  ];

  const getPotentialColor = (pot: string) => {
    switch (pot) {
      case 'excellent':
        return 'bg-emerald-500 border-emerald-400 text-emerald-900';
      case 'good':
        return 'bg-lime-400 border-lime-300 text-lime-900';
      case 'moderate':
        return 'bg-amber-400 border-amber-300 text-amber-900';
      case 'low':
        return 'bg-rose-400 border-rose-300 text-rose-900';
      default:
        return 'bg-slate-400 border-slate-300 text-slate-900';
    }
  };

  return (
    <section className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-16">

      {/* Top Header: Section title + Site selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1739] tracking-tight">
            Illustrative Campus Overview
          </h2>
          <p className="mt-2 text-base text-[#61708A]">
            Example roofs, charts and impact figures demonstrate the interface. The illustration does not change with your selected project.
          </p>
        </div>

        {/* Site Selector Dropdown */}
        <div className="relative min-w-[220px]">
          <select
            value={activeProject?.id || ''}
            onChange={(e) => {
              const selected = projects.find((p) => p.id === e.target.value);
              if (selected) setActiveProject(selected);
            }}
            aria-label="Select campus portfolio site"
            className="w-full bg-white border border-[#E8EDF4] rounded-xl px-4 py-2.5 text-sm font-bold text-[#0B1739] shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B16]/20 appearance-none cursor-pointer pr-10"
          >
            {projects.length > 0 ? (
              projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.city})
                </option>
              ))
            ) : (
              <option value="demo">Greenfield University Campus</option>
            )}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
        </div>
      </div>

      {/* Main Container: Left Map (55%) + Right Insights (45%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

        {/* Left Panel: Geospatial Campus View (55% = 7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E8EDF4] shadow-sm overflow-hidden flex flex-col relative aspect-[4/3] sm:aspect-[16/11]">

          {/* Top Campus Map Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-[#0B1739]">
                Illustrative University Campus
              </span>
              <span className="text-[11px] text-slate-400">· 5 Example Roofs</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Interactive Illustration</span>
          </div>

          {/* Interactive Geospatial Canvas Simulator */}
          <div className="relative flex-1 bg-slate-900 overflow-hidden select-none">
            {/* Aerial Orthophoto Background */}
            <img
              src="/hero-campus.jpg"
              alt="Illustrative campus rooftop view"
              className="w-full h-full object-cover filter brightness-90 contrast-105 transition-transform duration-300"
              style={{ transform: `scale(${zoomLevel})` }}
            />

            {/* SVG Rooftop Polygons with Solar Classification overlays */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-300"
              style={{ transform: `scale(${zoomLevel})` }}
              viewBox="0 0 600 450"
            >
              {/* Building 1: Academic Block (Excellent - Green) */}
              <polygon
                points="110,210 220,180 250,260 140,290"
                fill="rgba(16, 185, 129, 0.45)"
                stroke="#10B981"
                strokeWidth="2.5"
                className="cursor-pointer pointer-events-auto hover:fill-opacity-70 transition-all"
                onClick={() => setSelectedBuilding('b1')}
              />
              <text x="155" y="245" fill="#FFFFFF" fontSize="12" fontWeight="bold" textAnchor="middle">
                Academic (310 kWp)
              </text>

              {/* Building 2: Hostel Complex (Good - Lime) */}
              <polygon
                points="280,140 400,110 420,180 300,210"
                fill="rgba(163, 230, 53, 0.45)"
                stroke="#A3E635"
                strokeWidth="2.5"
                className="cursor-pointer pointer-events-auto hover:fill-opacity-70 transition-all"
                onClick={() => setSelectedBuilding('b2')}
              />
              <text x="345" y="165" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">
                Hostel (235 kWp)
              </text>

              {/* Building 3: Central Library (Excellent - Green) */}
              <polygon
                points="260,240 370,220 390,300 280,320"
                fill="rgba(16, 185, 129, 0.45)"
                stroke="#10B981"
                strokeWidth="2.5"
                className="cursor-pointer pointer-events-auto hover:fill-opacity-70 transition-all"
                onClick={() => setSelectedBuilding('b3')}
              />
              <text x="325" y="275" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">
                Library (175 kWp)
              </text>

              {/* Building 4: Auditorium (Moderate - Amber) */}
              <polygon
                points="420,220 520,200 540,280 440,300"
                fill="rgba(245, 158, 11, 0.45)"
                stroke="#F59E0B"
                strokeWidth="2.5"
                className="cursor-pointer pointer-events-auto hover:fill-opacity-70 transition-all"
                onClick={() => setSelectedBuilding('b4')}
              />
              <text x="475" y="255" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                Auditorium
              </text>

              {/* Building 5: Admin Block (Low - Rose) */}
              <polygon
                points="170,330 260,310 275,370 185,390"
                fill="rgba(244, 63, 94, 0.45)"
                stroke="#F43F5E"
                strokeWidth="2.5"
                className="cursor-pointer pointer-events-auto hover:fill-opacity-70 transition-all"
                onClick={() => setSelectedBuilding('b5')}
              />
              <text x="220" y="355" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">
                Admin
              </text>
            </svg>

            {/* Floating Map Legend (Top-Right) */}
            <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md rounded-xl p-3 border border-slate-200 shadow-md text-xs">
              <span className="font-bold text-[#0B1739] block mb-2 text-[11px] uppercase tracking-wide">
                Solar Potential
              </span>
              <div className="space-y-1.5 text-[11px] font-medium text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Excellent</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-400"></span>
                  <span>Good</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span>Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>Low</span>
                </div>
              </div>
            </div>

            {/* Zoom Controls (Bottom-Left) */}
            <div className="absolute bottom-4 left-4 z-20 flex flex-col bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden">
              <button
                onClick={() => setZoomLevel((prev) => Math.min(prev + 0.2, 1.8))}
                className="p-2 hover:bg-slate-50 text-slate-700 border-b border-slate-100"
                aria-label="Zoom in campus map"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel((prev) => Math.max(prev - 0.2, 0.8))}
                className="p-2 hover:bg-slate-50 text-slate-700"
                aria-label="Zoom out campus map"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          {/* Bottom Interactive Building Selection Strip */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => setSelectedBuilding('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex-shrink-0 ${
                selectedBuilding === 'all'
                  ? 'bg-[#0B1739] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Buildings (5)
            </button>
            {sampleBuildings.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBuilding(b.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0 flex items-center gap-1.5 ${
                  selectedBuilding === b.id
                    ? 'bg-[#FF6B16] text-white font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${b.potential === 'excellent' ? 'bg-emerald-500' : b.potential === 'good' ? 'bg-lime-400' : b.potential === 'moderate' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                <span>{b.name}</span>
              </button>
            ))}
          </div>

        </div>

        {/* Right Panel: Example Site Insights (45% = 5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-[#E8EDF4] shadow-sm flex flex-col justify-between">

          <div>
            {/* Header: Title + Building Selector */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0B1739]">Example Site Insights</h3>
              <div className="relative">
                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  aria-label="Select individual building"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 appearance-none pr-8 cursor-pointer"
                >
                  <option value="all">All Buildings</option>
                  <option value="b1">Academic Block</option>
                  <option value="b2">Hostel Complex</option>
                  <option value="b3">Central Library</option>
                  <option value="b4">Auditorium</option>
                  <option value="b5">Admin Complex</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Tab navigation matching screenshot */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl mb-6 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('generation')}
                className={`py-2 rounded-lg transition-all text-center ${
                  activeTab === 'generation'
                    ? 'bg-[#FF6B16] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Generation
              </button>
              <button
                onClick={() => setActiveTab('cost')}
                className={`py-2 rounded-lg transition-all text-center ${
                  activeTab === 'cost'
                    ? 'bg-[#FF6B16] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cost
              </button>
              <button
                onClick={() => setActiveTab('co2')}
                className={`py-2 rounded-lg transition-all text-center ${
                  activeTab === 'co2'
                    ? 'bg-[#FF6B16] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                CO₂ Savings
              </button>
              <button
                onClick={() => setActiveTab('demand')}
                className={`py-2 rounded-lg transition-all text-center ${
                  activeTab === 'demand'
                    ? 'bg-[#FF6B16] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Demand Match
              </button>
            </div>

            {/* Active Tab Content */}
            {activeTab === 'generation' && (
              <div>
                {/* Metric Summary */}
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <div className="text-3xl font-black text-[#0B1739] tracking-tight">
                      836 MWh/year
                    </div>
                    <div className="text-xs text-slate-400 font-medium">Estimated clean solar yield</div>
                  </div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-xs font-bold text-[#16A34A] border border-emerald-200">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Illustrative comparison</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#FF6B16]"></span>
                    <span>Solar Generation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#93C5FD]"></span>
                    <span>Energy Demand</span>
                  </div>
                </div>

                {/* Monthly Comparison Bar Chart */}
                <div className="h-44 flex items-end gap-1.5 sm:gap-2 pt-6 border-b border-slate-100 pb-2">
                  {monthlyData.map((d) => (
                    <div key={d.month} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className="w-full flex items-end justify-center gap-0.5 h-32">
                        {/* Orange Solar Bar */}
                        <div
                          className="w-1/2 bg-[#FF6B16] rounded-t-sm hover:brightness-110 transition-all"
                          style={{ height: `${(d.solar / 130) * 100}%` }}
                          title={`Solar: ${d.solar} MWh`}
                        />
                        {/* Light Blue Demand Bar */}
                        <div
                          className="w-1/2 bg-[#93C5FD] rounded-t-sm hover:brightness-105 transition-all"
                          style={{ height: `${(d.demand / 130) * 100}%` }}
                          title={`Demand: ${d.demand} MWh`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold mt-1.5">
                        {d.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'cost' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-xs text-slate-500 font-semibold">Total Capital Requirement</div>
                  <div className="text-2xl font-black text-[#0B1739] mt-0.5">₹9,95,000</div>
                  <div className="text-[11px] text-slate-400 mt-1">Within ₹10 Lakh budget ceiling</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="text-[11px] text-emerald-700 font-semibold">Annual Savings</div>
                    <div className="text-lg font-black text-emerald-800 mt-0.5">₹3,73,820 / yr</div>
                    <div className="text-[10px] text-emerald-600">+26.3% knapsack lift</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="text-[11px] text-blue-700 font-semibold">Payback Period</div>
                    <div className="text-lg font-black text-blue-800 mt-0.5">2.66 Years</div>
                    <div className="text-[10px] text-blue-600">IRR: 37.5%</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'co2' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                    <Leaf className="w-4 h-4 text-emerald-600" />
                    <span>Avoided Grid Emissions (CEA Factor: 0.716 kg/kWh)</span>
                  </div>
                  <div className="text-3xl font-black text-emerald-950 mt-1">
                    342.5 Metric Tonnes CO₂ / yr
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">Coal Displacement</span>
                    <strong className="text-base font-bold text-slate-800">137 Tonnes / yr</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">Equivalent Forest Cover</span>
                    <strong className="text-base font-bold text-slate-800">15,400 Trees planted</strong>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'demand' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-800">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <span>Solar-to-Load Coincidence</span>
                  </div>
                  <div className="text-3xl font-black text-purple-950 mt-1">91.4% Self-Consumed</div>
                  <div className="text-xs text-purple-700 mt-1">Minimizes low-value export under net metering</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">Peak Shaving</span>
                    <strong className="text-base font-bold text-slate-800">-34 kW Demand Drop</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block">Export Surplus</span>
                    <strong className="text-base font-bold text-slate-800">8.6% Grid Injected</strong>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Illustrative planning figures</span>
            <span>Open tools for saved project results</span>
          </div>

        </div>

      </div>
    </section>
  );
};
