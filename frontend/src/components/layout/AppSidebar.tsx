import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  Building,
  SlidersHorizontal,
  Activity,
  CalendarClock,
  Sparkles,
  FileCheck2,
  Wrench,
  ChevronDown,
  Check,
  Plus,
  RefreshCw,
  X,
  Server,
  Layers
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { formatINRShort } from '../../utils/formatters';

interface AppSidebarProps {
  onOpenNewProjectModal: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ onOpenNewProjectModal, mobileOpen, onClose }) => {
  const { projects, activeProject, setActiveProject, loadDemoProject, loading, error } = useProject();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const navigationSections: NavSection[] = [
    {
      title: 'Portfolio & GIS',
      items: [
        { name: 'Landing Page', path: '/', icon: LayoutDashboard },
        { name: 'Solar Explorer', path: '/map', icon: Compass, badge: activeProject ? `${activeProject.building_count} roofs` : undefined },
        { name: 'Building Analysis', path: '/buildings', icon: Building },
      ]
    },
    {
      title: 'Optimization & Dispatch',
      items: [
        { name: 'Budget Optimizer', path: '/optimize', icon: SlidersHorizontal, badge: 'OR-Tools', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
        { name: 'Energy Analytics', path: '/insights', icon: Activity },
        { name: 'Smart Scheduling', path: '/scheduling', icon: CalendarClock },
      ]
    },
    {
      title: 'Operations & Asset Care',
      items: [
        { name: 'Operations & Health', path: '/operations', icon: Wrench, badge: 'Diagnostics', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      ]
    },
    {
      title: 'Governance & Reports',
      items: [
        { name: 'Advisory Insights', path: '/recommendations', icon: Sparkles },
        { name: 'Executive Reports', path: '/reports', icon: FileCheck2, badge: 'PDF' },
      ]
    }
  ];

  return (
    <aside
      id="app-navigation"
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-slate-100 flex flex-col flex-shrink-0 h-full overflow-hidden border-r border-slate-800/80 select-none md:static md:visible md:translate-x-0 transition-transform duration-200 ease-in-out ${
        mobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Geometric Solar & Rooftop Grid Mark */}
          <div className="w-8 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shadow-xs">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
              <line x1="9" y1="5" x2="15" y2="5" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-white">RoofShift</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                AI
              </span>
            </div>
            <div className="text-[10px] text-slate-400 tracking-normal font-normal">
              Commercial Solar Optimizer
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close navigation"
          className="p-1.5 text-slate-400 hover:text-white rounded md:hidden hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Project Selector Box */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 relative">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
          Active Portfolio
        </div>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-expanded={dropdownOpen}
          aria-label="Select planning project"
          className="w-full flex items-center justify-between bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-md px-2.5 py-2 text-left transition-colors"
        >
          <div className="min-w-0 pr-2">
            <div className="text-xs font-semibold text-white truncate">
              {activeProject ? activeProject.name : 'Select Project'}
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {activeProject ? `${activeProject.city} • ${formatINRShort(activeProject.budget)}` : 'No portfolio active'}
            </div>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-3 right-3 z-50 bg-[#1E293B] border border-slate-700 rounded-md shadow-xl mt-1 overflow-hidden">
            <div className="max-h-52 overflow-y-auto py-1 divide-y divide-slate-800">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveProject(p);
                    setDropdownOpen(false);
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/50 transition-colors ${
                    activeProject?.id === p.id ? 'bg-slate-700/30 text-amber-300 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="truncate text-xs">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.city} • {formatINRShort(p.budget)}</div>
                  </div>
                  {activeProject?.id === p.id && <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
            <div className="p-1.5 bg-slate-900 border-t border-slate-800 flex flex-col gap-1">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenNewProjectModal();
                }}
                className="w-full text-left px-2 py-1.5 text-[11px] text-slate-300 hover:text-white flex items-center gap-2 hover:bg-slate-800 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-slate-400" /> Create New Portfolio
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  loadDemoProject();
                }}
                className="w-full text-left px-2 py-1.5 text-[11px] text-amber-300 hover:text-amber-200 flex items-center gap-2 hover:bg-slate-800 rounded transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Reload Delhi Campus Demo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Structured Nav Links */}
      <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-0.5">
            <div className="px-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors group ${
                      isActive
                        ? 'bg-slate-800 text-white font-semibold border-l-2 border-amber-400 pl-2'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                            item.badgeColor || (isActive ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-slate-800 text-slate-400 border-slate-700/60')
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer / System Status */}
      <div className="p-3 border-t border-slate-800 bg-[#0B132B]/60">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-[11px]">{loading ? 'Syncing...' : error ? 'Offline' : 'System Ready'}</span>
          </span>
          <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700">
            AWS Ready
          </span>
        </div>
        <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
          <span>TEAM DRX</span>
          <span>v2.4 Enterprise</span>
        </div>
      </div>
    </aside>
  );
};

