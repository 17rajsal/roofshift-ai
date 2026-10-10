import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { RecommendationCard } from '../types/models';
import { api } from '../services/api';
import {
  Sparkles,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign,
  Sun,
  Clock,
  Layers,
  ChevronRight,
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
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5EAE7] shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#17231F] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <span>Explainable Smart Recommendations Feed</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic, calculation-grounded advice generated directly from solver outputs and shading geometry.
          </p>
        </div>

        <button
          onClick={() => navigate('/reports')}
          className="px-4 py-2 bg-[#123C32] hover:bg-[#0B251F] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <span>Generate Formal PDF Report</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === cat
                ? 'bg-[#123C32] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
            className="bg-white rounded-2xl border border-[#E5EAE7] p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {rec.category}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(rec.priority)}`}>
                  {rec.priority} Priority
                </span>
              </div>

              <h3 className="font-bold text-sm text-[#123C32] mb-1">{rec.title}</h3>
              <div className="text-[11px] font-semibold text-emerald-700 mb-2.5">
                Target: {rec.target}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {rec.why_it_matters}
              </p>

              {/* Supporting calculation */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1 mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Supporting Calculation:
                </span>
                <p className="text-slate-800 font-mono text-[11px]">{rec.supporting_calculation}</p>
              </div>

              {/* Benefit & Confidence */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-600">
                <span>Benefit: <strong className="text-emerald-700">{rec.expected_benefit}</strong></span>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">
                  {rec.confidence_label}
                </span>
              </div>
            </div>

            {/* Suggested Action Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 italic truncate max-w-[70%]">
                Action: {rec.suggested_next_action}
              </span>
              <button
                onClick={() => navigate('/reports')}
                className="text-xs font-bold text-[#123C32] hover:text-emerald-700 flex items-center gap-1 transition-colors"
              >
                <span>Include</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
