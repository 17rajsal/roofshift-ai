import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Sun,
  MapPin,
  Building2,
  Cpu,
  BarChart3,
  Clock,
  Sparkles,
  FileText,
  Home,
  Plus,
  ChevronDown,
  CloudSun,
  ShieldCheck,
  CheckCircle2,
  X
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { formatINRShort } from '../../utils/formatters';

interface AppSidebarProps {
  onOpenNewProjectModal: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ onOpenNewProjectModal, mobileOpen, onClose }) => {
  const { projects, activeProject, setActiveProject, loadDemoProject, loading, error } = useProject();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { name: 'Overview Home', path: '/', icon: Home },
    { name: 'Solar Map', path: '/map', icon: MapPin, badge: activeProject ? `${activeProject.building_count} roofs` : undefined },
    { name: 'Building Analysis', path: '/buildings', icon: Building2 },
    { name: 'Budget Optimizer', path: '/optimize', icon: Cpu, badge: 'Solver', badgeColor: 'bg-amber-100 text-amber-800 border-amber-300' },
    { name: 'Energy Insights', path: '/insights', icon: BarChart3 },
    { name: 'Smart Scheduling', path: '/scheduling', icon: Clock },
    { name: 'Recommendations', path: '/recommendations', icon: Sparkles },
    { name: 'Final Report', path: '/reports', icon: FileText, badge: 'PDF' },
  ];

  return (
    <aside id="app-navigation" className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#123C32] text-white flex flex-col flex-shrink-0 h-full overflow-y-auto border-r border-[#0B251F] select-none md:static md:visible md:translate-x-0 ${mobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}>
      {/* Brand Header */}
      <div className="p-5 border-b border-emerald-900/60">
        <button onClick={onClose} aria-label="Close navigation" className="absolute top-2 right-2 p-2 md:hidden"><X className="h-4 w-4" /></button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-[#F5B942] flex items-center justify-center text-[#123C32] shadow-lg shadow-emerald-950/40 font-bold">
            <Sun className="w-6 h-6 animate-spin-slow text-[#123C32]" />
          </div>
          <div>
            <div className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              RoofShift <span className="text-[#F5B942]">AI</span>
            </div>
            <div className="text-[10px] tracking-wider uppercase text-emerald-300/80 font-medium">
              Solar & Energy Optimizer
            </div>
          </div>
        </div>

        {/* Hackathon Badge */}
        <div className="mt-3 py-1 px-2.5 rounded-md bg-emerald-950/70 border border-emerald-500/20 text-[11px] text-emerald-200/90 flex items-center justify-between">
          <span>Env Hacks 2026</span>
          <span className="font-semibold text-[#F5B942]">AWS × WeMakeDevs</span>
        </div>
      </div>

      {/* Project Selector */}
      <div className="p-4 border-b border-emerald-900/40 relative">
        <label className="text-[11px] font-semibold text-emerald-300/70 uppercase tracking-wider block mb-1.5">
          Active Planning Project
        </label>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-expanded={dropdownOpen}
          aria-label="Select planning project"
          className="w-full flex items-center justify-between bg-emerald-950/60 hover:bg-emerald-950 border border-emerald-700/40 rounded-lg p-2.5 text-left transition-colors"
        >
          <div className="truncate">
            <div className="text-sm font-semibold text-white truncate">
              {activeProject ? activeProject.name : 'Select Project'}
            </div>
            <div className="text-xs text-emerald-300/80">
              {activeProject ? `${activeProject.city} • ${formatINRShort(activeProject.budget)}` : 'No active project'}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-4 right-4 z-50 bg-[#0B251F] border border-emerald-600/30 rounded-lg shadow-2xl mt-1 overflow-hidden">
            <div className="max-h-48 overflow-y-auto py-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveProject(p);
                    setDropdownOpen(false);
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-900/50 transition-colors ${
                    activeProject?.id === p.id ? 'bg-emerald-800/40 text-emerald-200 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <div className="truncate">
                    <div className="truncate">{p.name}</div>
                    <div className="text-[10px] text-emerald-400/80">{p.city} • {formatINRShort(p.budget)}</div>
                  </div>
                  {activeProject?.id === p.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
            <div className="border-t border-emerald-800/60 p-2 flex flex-col gap-1.5 bg-[#081C17]">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenNewProjectModal();
                }}
                className="w-full text-left px-2 py-1.5 text-xs text-emerald-300 hover:text-white flex items-center gap-1.5 hover:bg-emerald-900/40 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Create New Project
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  loadDemoProject();
                }}
                className="w-full text-left px-2 py-1.5 text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1.5 hover:bg-amber-950/40 rounded transition-colors"
              >
                <CloudSun className="w-3.5 h-3.5" /> Reload Delhi Campus Demo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest">
          Planning Workflow
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-emerald-500 text-[#123C32] font-semibold shadow-md shadow-emerald-900/30'
                    : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#123C32]' : 'text-emerald-400 group-hover:text-emerald-300'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        item.badgeColor || (isActive ? 'bg-[#123C32]/20 text-[#123C32] border-transparent' : 'bg-emerald-950/70 text-emerald-300 border-emerald-700/40')
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
      </nav>

      {/* Footer / System Status */}
      <div className="p-4 border-t border-emerald-900/60 bg-[#0E2F27]">
        <div className="flex items-center justify-between text-[11px] text-emerald-300/80 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {loading ? 'Checking workspace…' : error ? 'Backend unavailable' : 'Workspace ready'}
          </span>
          <span className="text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded text-emerald-300 border border-emerald-800/40">
            AWS Ready
          </span>
        </div>
        <div className="text-[10px] text-slate-400 text-center mt-2">
          Team DRX • Preliminary Decision Tool
        </div>
      </div>
    </aside>
  );
};
