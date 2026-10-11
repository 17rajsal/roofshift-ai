import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
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
  ExternalLink,
  SunMedium,
  LayoutDashboard,
  Globe
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
  badgeVariant?: 'orange' | 'green' | 'blue' | 'neutral';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  onOpenNewProjectModal,
  mobileOpen,
  onClose
}) => {
  const { projects, activeProject, setActiveProject, loadDemoProject, loading, error } = useProject();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navigationSections: NavSection[] = [
    {
      title: 'Solar Intelligence Platform',
      items: [
        {
          name: 'Explore India Map',
          path: '/workspace',
          icon: Globe,
          badge: 'National',
          badgeVariant: 'orange'
        },
        {
          name: 'Explore & Analyze',
          path: '/workspace/explore',
          icon: Compass,
          badge: activeProject ? `${activeProject.building_count} roofs` : undefined,
          badgeVariant: 'neutral'
        },
        {
          name: 'Plan & Optimize',
          path: '/workspace/plan',
          icon: SlidersHorizontal,
          badge: 'Knapsack DP',
          badgeVariant: 'orange'
        },
        {
          name: 'Monitor & Maintain',
          path: '/workspace/monitor',
          icon: Activity,
          badge: 'Telemetry',
          badgeVariant: 'green'
        },
        {
          name: 'Insights & Reports',
          path: '/workspace/insights',
          icon: FileCheck2,
          badge: 'Executive',
          badgeVariant: 'blue'
        }
      ]
    },
    {
      title: 'Intelligence Suite & Portal',
      items: [
        {
          name: '12-Feature Suite',
          path: '/solar-features',
          icon: SunMedium,
          badge: 'All Tools',
          badgeVariant: 'orange'
        },
        {
          name: 'Public Landing Home',
          path: '/',
          icon: ExternalLink
        }
      ]
    }
  ];

  return (
    <aside
      id="app-navigation"
      className={`fixed inset-y-0 left-0 z-50 w-72 m-2 sm:m-3 my-2 sm:my-3 rounded-3xl glass-panel flex flex-col flex-shrink-0 h-[calc(100vh-1rem)] sm:h-[calc(100vh-1.5rem)] overflow-hidden select-none md:static md:visible md:translate-x-0 transition-transform duration-300 ease-in-out shadow-2xl md:shadow-lg ${
        mobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div className="h-18 px-5 border-b border-white/60 flex items-center justify-between shrink-0 bg-white/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF6B16] to-[#FFA826] p-0.5 shadow-md shadow-orange-500/20 flex items-center justify-center text-white">
            <svg
              className="w-5 h-5 drop-shadow-xs"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
              <line x1="9" y1="5" x2="15" y2="5" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-[#0B1739]">
                RoofShift
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-[#FF6B16] border border-orange-500/30">
                AI
              </span>
            </div>
            <div className="text-[11px] font-medium text-[#61708A] tracking-tight">
              Solar Intelligence Platform
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close navigation"
          className="p-2 text-[#61708A] hover:text-[#0B1739] rounded-xl md:hidden hover:bg-white/60 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Portfolio Selector Glass Card */}
      <div className="p-3.5 border-b border-white/60 bg-white/30 shrink-0 relative">
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#61708A]">
            Active Portfolio
          </span>
          {activeProject?.is_demo === 'true' && (
            <span className="text-[9px] font-semibold text-amber-700 bg-amber-500/15 px-1.5 py-0.5 rounded-md">
              Sample Campus
            </span>
          )}
        </div>

        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-expanded={dropdownOpen}
          aria-label="Select planning portfolio"
          className="w-full flex items-center justify-between bg-white/70 hover:bg-white/90 border border-white/90 rounded-2xl px-3 py-2 text-left transition-all shadow-xs cursor-pointer group"
        >
          <div className="min-w-0 pr-2">
            <div className="text-xs font-bold text-[#0B1739] truncate group-hover:text-[#FF6B16] transition-colors">
              {activeProject ? activeProject.name : 'Select Project'}
            </div>
            <div className="text-[11px] text-[#61708A] truncate mt-0.5 font-medium">
              {activeProject
                ? `${activeProject.city} • ${formatINRShort(activeProject.budget)}`
                : 'No portfolio active'}
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[#61708A] flex-shrink-0 transition-transform duration-200 ${
              dropdownOpen ? 'rotate-180 text-[#FF6B16]' : ''
            }`}
          />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-3 right-3 z-50 glass-elevated border border-white/90 rounded-2xl shadow-xl mt-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="max-h-52 overflow-y-auto py-1 divide-y divide-slate-100">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveProject(p);
                    setDropdownOpen(false);
                    onClose();
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-white/80 transition-colors cursor-pointer ${
                    activeProject?.id === p.id
                      ? 'bg-orange-500/10 text-[#FF6B16] font-bold'
                      : 'text-[#0B1739]'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="truncate text-xs font-semibold">{p.name}</div>
                    <div className="text-[10px] text-[#61708A]">
                      {p.city} • {formatINRShort(p.budget)}
                    </div>
                  </div>
                  {activeProject?.id === p.id && (
                    <Check className="w-4 h-4 text-[#FF6B16] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="p-2 bg-white/60 border-t border-white/80 flex flex-col gap-1">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenNewProjectModal();
                }}
                className="w-full text-left px-2.5 py-2 text-xs text-[#0B1739] hover:text-[#FF6B16] flex items-center gap-2 hover:bg-white/80 rounded-xl transition-colors font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#FF6B16]" /> Create New Portfolio
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  loadDemoProject();
                }}
                className="w-full text-left px-2.5 py-2 text-xs text-amber-700 hover:text-amber-800 flex items-center gap-2 hover:bg-amber-500/15 rounded-xl transition-colors font-semibold cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-amber-600" /> Explore Sample Portfolio (Optional Demo)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-3.5 space-y-4 overflow-y-auto">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold text-[#61708A] uppercase tracking-wider">
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
                    `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500/15 to-amber-500/10 text-[#FF6B16] border border-orange-500/25 shadow-xs'
                        : 'text-[#0B1739] hover:bg-white/60 hover:text-[#FF6B16]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                            isActive ? 'text-[#FF6B16]' : 'text-[#61708A] group-hover:text-[#FF6B16]'
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            item.badgeVariant === 'orange'
                              ? 'bg-orange-500/15 text-[#FF6B16] border-orange-500/25'
                              : item.badgeVariant === 'green'
                              ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/25'
                              : item.badgeVariant === 'blue'
                              ? 'bg-blue-500/15 text-blue-700 border-blue-500/25'
                              : 'bg-slate-200/50 text-[#61708A] border-slate-300/40'
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

      {/* Footer System Status Strip */}
      <div className="p-3.5 border-t border-white/60 bg-white/40 shrink-0">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 font-medium text-[#61708A]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-[#0B1739]">
              {loading ? 'Syncing...' : error ? 'Offline' : 'System Operational'}
            </span>
          </span>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            Active
          </span>
        </div>
        <div className="text-[10px] text-[#61708A] mt-2 flex items-center justify-between font-medium">
          <span>NASA POWER & AWS Synced</span>
          <span className="font-semibold text-[#0B1739]">v2.5 Glass</span>
        </div>
      </div>
    </aside>
  );
};
