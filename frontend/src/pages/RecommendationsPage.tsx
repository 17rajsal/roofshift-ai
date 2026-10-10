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
        return 'bg-red-50 text-red-700 border-red-200/80';
      case 'medium':
        return 'bg-amber-50 text-amber-800 border-amber-200/80';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Decision Intelligence & Recommendations</span>
            </h2>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
              Deterministic Logic
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Calculation-grounded advisory generated directly from knapsack solver outputs, irradiance geometry, and tariff models.
          </p>
        </div>

        <button
          onClick={() => navigate('/reports')}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors"
        >
          <span>Generate Formal PDF Report</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white font-medium shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 font-normal'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recommendations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((rec) => (
          <div
            key={rec.id}
            className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors space-y-3.5"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] font-mono font-medium uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {rec.category}
                </span>
                <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${getPriorityBadge(rec.priority)}`}>
                  {rec.priority} Priority
                </span>
              </div>

              <h3 className="font-semibold text-sm text-slate-900 mb-0.5">{rec.title}</h3>
              <div className="text-xs font-medium text-emerald-700 mb-2 font-mono">
                Target: {rec.target}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {rec.why_it_matters}
              </p>

              {/* Supporting calculation */}
              <div className="p-3 bg-slate-50 rounded border border-slate-150 text-xs space-y-1 mb-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Supporting Solver Proof:
                </span>
                <p className="text-slate-800 font-mono text-[11px] leading-relaxed">{rec.supporting_calculation}</p>
              </div>

              {/* Benefit & Confidence */}
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 text-slate-600">
                <span>Expected Yield: <strong className="text-emerald-700 font-mono">{rec.expected_benefit}</strong></span>
                <span className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {rec.confidence_label}
                </span>
              </div>
            </div>

            {/* Suggested Action Footer */}
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 italic truncate max-w-[70%]">
                Action: {rec.suggested_next_action}
              </span>
              <button
                onClick={() => navigate('/reports')}
                className="text-xs font-medium text-slate-900 hover:text-amber-700 flex items-center gap-1 transition-colors"
              >
                <span>Include in Report</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
