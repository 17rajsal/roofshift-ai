import React, { useState } from 'react';
import { MetricVisualizationMode } from '../../utils/solarSuitability';
import { Info, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface SolarMapLegendProps {
  mode: MetricVisualizationMode;
  tierCounts?: {
    excellent: number;
    good: number;
    moderate: number;
    low: number;
    poor: number;
  };
}

export const SolarMapLegend: React.FC<SolarMapLegendProps> = ({ mode, tierCounts }) => {
  const [collapsed, setCollapsed] = useState(false);

  const getLegendTiers = () => {
    switch (mode) {
      case 'generation':
        return [
          { color: '#047857', label: 'Very High', range: '≥ 50 MWh/yr', count: tierCounts?.excellent },
          { color: '#10B981', label: 'High', range: '30 – 49 MWh/yr', count: tierCounts?.good },
          { color: '#F59E0B', label: 'Moderate', range: '15 – 29 MWh/yr', count: tierCounts?.moderate },
          { color: '#F97316', label: 'Low', range: '5 – 14 MWh/yr', count: tierCounts?.low },
          { color: '#EF4444', label: 'Minimal', range: '< 5 MWh/yr', count: tierCounts?.poor },
        ];
      case 'yield':
        return [
          { color: '#047857', label: 'Optimal Yield', range: '≥ 1,300 kWh/kWp', count: tierCounts?.excellent },
          { color: '#10B981', label: 'High Yield', range: '1,200 – 1,299', count: tierCounts?.good },
          { color: '#F59E0B', label: 'Moderate', range: '1,100 – 1,199', count: tierCounts?.moderate },
          { color: '#F97316', label: 'Attenuated', range: '950 – 1,099', count: tierCounts?.low },
          { color: '#EF4444', label: 'Severely Shaded', range: '< 950', count: tierCounts?.poor },
        ];
      case 'savings':
        return [
          { color: '#047857', label: 'Tier 1 Savings', range: '≥ ₹2.5 Lakh/yr', count: tierCounts?.excellent },
          { color: '#10B981', label: 'Tier 2 Savings', range: '₹1.5L – ₹2.5L', count: tierCounts?.good },
          { color: '#F59E0B', label: 'Tier 3 Savings', range: '₹75k – ₹1.5L', count: tierCounts?.moderate },
          { color: '#F97316', label: 'Tier 4 Savings', range: '₹30k – ₹75k', count: tierCounts?.low },
          { color: '#EF4444', label: 'Tier 5 Savings', range: '< ₹30k/yr', count: tierCounts?.poor },
        ];
      case 'co2':
        return [
          { color: '#047857', label: 'Top Offset', range: '≥ 35 tCO₂/yr', count: tierCounts?.excellent },
          { color: '#10B981', label: 'High Offset', range: '20 – 34 tCO₂', count: tierCounts?.good },
          { color: '#F59E0B', label: 'Moderate', range: '10 – 19 tCO₂', count: tierCounts?.moderate },
          { color: '#F97316', label: 'Low Offset', range: '4 – 9 tCO₂', count: tierCounts?.low },
          { color: '#EF4444', label: 'Minimal', range: '< 4 tCO₂/yr', count: tierCounts?.poor },
        ];
      case 'suitability':
      default:
        return [
          { color: '#047857', label: 'Excellent', range: '85 – 100 pts', count: tierCounts?.excellent },
          { color: '#10B981', label: 'Good', range: '70 – 84 pts', count: tierCounts?.good },
          { color: '#F59E0B', label: 'Moderate', range: '50 – 69 pts', count: tierCounts?.moderate },
          { color: '#F97316', label: 'Low', range: '30 – 49 pts', count: tierCounts?.low },
          { color: '#EF4444', label: 'Poor', range: '< 30 pts', count: tierCounts?.poor },
        ];
    }
  };

  const getMetricTitle = () => {
    switch (mode) {
      case 'generation': return 'Annual Generation Potential';
      case 'yield': return 'Specific Solar Yield (PR Adjusted)';
      case 'savings': return 'Projected Bill Savings';
      case 'co2': return 'Avoided Grid CO₂ Emissions';
      case 'suitability':
      default:
        return 'Solar Suitability Score';
    }
  };

  const tiers = getLegendTiers();

  return (
    <div className="glass-elevated rounded-2xl border border-white/80 shadow-xl p-3 text-xs select-none max-w-xs transition-all">
      <div
        className="flex items-center justify-between gap-3 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>{getMetricTitle()}</span>
        </div>
        <button
          type="button"
          className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
          aria-label={collapsed ? 'Expand legend' : 'Collapse legend'}
        >
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
          {tiers.map((t, idx) => (
            <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600 gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-2xs border border-white"
                  style={{ backgroundColor: t.color }}
                />
                <span className="font-semibold text-slate-800">{t.label}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="font-mono text-[10px]">{t.range}</span>
                {t.count !== undefined && (
                  <span className="bg-slate-100 px-1 py-0.2 rounded text-[9px] font-bold text-slate-600">
                    {t.count}
                  </span>
                )}
              </div>
            </div>
          ))}

          <div className="pt-1.5 border-t border-slate-100/80 flex items-center gap-1 text-[10px] text-slate-400">
            <Info className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Scores derated by NASA GHI & IEC 61724 PR.</span>
          </div>
        </div>
      )}
    </div>
  );
};
