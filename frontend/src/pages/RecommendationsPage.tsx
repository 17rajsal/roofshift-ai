import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { RecommendationCard } from '../types/models';
import { api } from '../services/api';
import {
  Sparkles,
  ArrowRight,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const RecommendationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject } = useProject();

  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (activeProject) {
      loadRecommendations();
    }
  }, [activeProject]);

  const loadRecommendations = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      const res = await api.getRecommendations(activeProject.id);
      setRecommendations(res.recommendations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'All',
    'Installation Priority',
    'Financial Allocation',
    'Solar Performance',
    'Energy Scheduling',
    'Technical & Regulatory Risk',
  ];

  const filtered = selectedCategory === 'All'
    ? recommendations
    : recommendations.filter((r) => r.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  const getPriorityBadge = (p: string) => {
    switch (p.toLowerCase()) {
      case 'high':
        return 'bg-red-500/10 text-red-700 border-red-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-800 border-amber-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20';
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-[#FF6B16] border border-orange-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-[#0B1739] tracking-tight">
                  Decision Intelligence &amp; Recommendations
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 shadow-2xs">
                  Deterministic Logic
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#61708A] mt-0.5">
                Calculation-grounded advisory generated directly from knapsack solver outputs, irradiance geometry, and tariff models.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/reports')}
          className="w-full sm:w-auto px-5 py-3 bg-[#FF6B16] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
        >
          <span>Generate Formal PDF Report</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === cat
                ? 'bg-[#0B1739] text-white shadow-md'
                : 'glass-panel text-[#61708A] hover:text-[#0B1739] hover:bg-white shadow-2xs'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recommendations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((rec) => (
          <div
            key={rec.id}
            className="glass-panel p-6 rounded-3xl shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-all space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-white/80 text-[#0B1739] px-2.5 py-1 rounded-lg border border-white/80 shadow-2xs">
                  {rec.category}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border shadow-2xs ${getPriorityBadge(rec.priority)}`}>
                  {rec.priority} Priority
                </span>
              </div>

              <h3 className="font-black text-base text-[#0B1739] mb-1 tracking-tight">{rec.title}</h3>
              <div className="text-xs font-bold text-[#16A34A] mb-2.5 font-mono">
                Target: {rec.target}
              </div>

              <p className="text-xs text-[#61708A] leading-relaxed mb-3.5">
                {rec.why_it_matters}
              </p>

              {/* Supporting calculation */}
              <div className="p-4 rounded-2xl glass-surface-secondary border border-white/60 text-xs space-y-1.5 mb-3 shadow-2xs">
                <span className="text-[10px] font-bold text-[#0B1739] uppercase tracking-wider block">
                  Supporting Solver Proof:
                </span>
                <p className="text-[#0B1739] font-mono text-[11px] leading-relaxed">{rec.supporting_calculation}</p>
              </div>

              {/* Benefit & Confidence */}
              <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-200/50 text-[#61708A]">
                <span>Expected Yield: <strong className="text-[#16A34A] font-black font-mono">{rec.expected_benefit}</strong></span>
                <span className="text-[10px] font-bold bg-white/80 text-[#0B1739] px-2.5 py-1 rounded-lg border border-white/80 shadow-2xs">
                  {rec.confidence_label}
                </span>
              </div>
            </div>

            {/* Suggested Action Footer */}
            <div className="pt-3 border-t border-slate-200/50 flex items-center justify-between text-xs">
              <span className="text-[11px] text-[#61708A] font-medium truncate max-w-[70%]">
                Action: {rec.suggested_next_action}
              </span>
              <button
                onClick={() => navigate('/reports')}
                className="text-xs font-bold text-[#FF6B16] hover:text-[#EA580C] flex items-center gap-1 transition-colors"
              >
                <span>Include in Report</span>
                <ChevronRight className="w-4 h-4 text-[#FF6B16]" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Part E: Next Step Navigation */}
      <div className="flex items-center justify-between p-5 rounded-3xl glass-panel">
        <div>
          <div className="text-xs font-bold text-[#0B1739]">Next Recommended Step</div>
          <div className="text-xs text-[#61708A]">Synthesize full engineering, financial, and scheduling analysis into formal PDF proposals.</div>
        </div>
        <button
          onClick={() => navigate('/reports')}
          className="glass-button-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <span>Generate Formal PDF Report</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
