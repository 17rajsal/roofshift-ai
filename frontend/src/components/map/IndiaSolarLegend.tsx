import React from 'react';
import { SunMedium, Thermometer, Wind, CloudSun, Building2, Mountain, Sparkles } from 'lucide-react';

export type IndiaMapLayer =
  | 'ghi'
  | 'temp'
  | 'wind'
  | 'cloud'
  | 'rooftop'
  | 'openland'
  | 'composite';

interface IndiaSolarLegendProps {
  activeLayer: IndiaMapLayer;
}

export const IndiaSolarLegend: React.FC<IndiaSolarLegendProps> = ({ activeLayer }) => {
  const getLayerConfig = () => {
    switch (activeLayer) {
      case 'ghi':
        return {
          title: 'Solar Irradiance (GHI)',
          subtitle: 'NASA POWER 20-Year Baseline',
          units: 'kWh/m²/day',
          icon: <SunMedium className="w-4 h-4 text-[#FF6B16]" />,
          gradient: 'from-amber-200 via-orange-400 to-amber-600',
          bands: [
            { label: '< 4.5', color: '#FCD34D', desc: 'Moderate' },
            { label: '4.5 – 5.2', color: '#F59E0B', desc: 'Good' },
            { label: '5.2 – 5.6', color: '#FF6B16', desc: 'High' },
            { label: '> 5.6', color: '#D97706', desc: 'Exceptional' },
          ],
        };
      case 'temp':
        return {
          title: 'Ambient Temperature & Heat Stress',
          subtitle: 'IMD Long-Term Climatological Mean',
          units: '°C (Ambient Mean)',
          icon: <Thermometer className="w-4 h-4 text-rose-500" />,
          gradient: 'from-cyan-300 via-amber-300 to-rose-600',
          bands: [
            { label: '< 15°C', color: '#67E8F9', desc: 'Cold (+4% to +8% PV Boost)' },
            { label: '15 – 28°C', color: '#FDE047', desc: 'Optimal Thermal Band' },
            { label: '28 – 32°C', color: '#F97316', desc: 'Moderate Derate (-2%)' },
            { label: '> 32°C', color: '#E11D48', desc: 'High Heat Derate (-3.5%)' },
          ],
        };
      case 'wind':
        return {
          title: 'Wind Speed & PV Convective Cooling',
          subtitle: 'Aerodynamic Heat Dissipation',
          units: 'm/s (Annual Mean)',
          icon: <Wind className="w-4 h-4 text-sky-500" />,
          gradient: 'from-slate-200 via-sky-300 to-blue-600',
          bands: [
            { label: '< 3.0', color: '#94A3B8', desc: 'Low Cooling' },
            { label: '3.0 – 4.0', color: '#38BDF8', desc: 'Moderate Cooling' },
            { label: '4.0 – 5.0', color: '#0284C7', desc: 'Active Cooling (+1.5%)' },
            { label: '> 5.0', color: '#1D4ED8', desc: 'High Convective Cooling' },
          ],
        };
      case 'cloud':
        return {
          title: 'Monsoon Cloud Attenuation',
          subtitle: 'Seasonal Irradiance Loss Factor',
          units: '% Annual Cloud Cover',
          icon: <CloudSun className="w-4 h-4 text-indigo-500" />,
          gradient: 'from-amber-200 via-sky-300 to-indigo-600',
          bands: [
            { label: '< 20%', color: '#FDE68A', desc: 'Minimal Monsoon Loss' },
            { label: '20 – 35%', color: '#7DD3FC', desc: 'Standard Monsoon Dip' },
            { label: '35 – 45%', color: '#818CF8', desc: 'Significant Seasonal Loss' },
            { label: '> 45%', color: '#4338CA', desc: 'Heavy Monsoonal Attenuation' },
          ],
        };
      case 'rooftop':
        return {
          title: 'Rooftop Solar Suitability',
          subtitle: 'Commercial, Industrial & Urban Opportunity',
          units: 'Index (0–100)',
          icon: <Building2 className="w-4 h-4 text-emerald-600" />,
          gradient: 'from-emerald-200 via-emerald-400 to-emerald-700',
          bands: [
            { label: '< 75', color: '#A7F3D0', desc: 'Emerging Rooftop' },
            { label: '75 – 85', color: '#34D399', desc: 'Moderate Rooftop' },
            { label: '85 – 92', color: '#10B981', desc: 'High Commercial Rooftop' },
            { label: '> 92', color: '#047857', desc: 'Prime C&I Urban Epicenter' },
          ],
        };
      case 'openland':
        return {
          title: 'Open-Land Solar Farm Suitability',
          subtitle: 'Utility-Scale Ground Mount & Transmission',
          units: 'Index (0–100)',
          icon: <Mountain className="w-4 h-4 text-amber-600" />,
          gradient: 'from-amber-200 via-amber-400 to-amber-700',
          bands: [
            { label: '< 60', color: '#FDE68A', desc: 'Constrained Land' },
            { label: '60 – 80', color: '#FBBF24', desc: 'Moderate Open Land' },
            { label: '80 – 92', color: '#D97706', desc: 'Strong Utility Potential' },
            { label: '> 92', color: '#B45309', desc: 'Ultra-Mega Park Zone' },
          ],
        };
      case 'composite':
      default:
        return {
          title: 'AI Solar Suitability Index',
          subtitle: 'Comprehensive Climatology & Yield Score',
          units: 'Score (0–100)',
          icon: <Sparkles className="w-4 h-4 text-[#FF6B16]" />,
          gradient: 'from-blue-400 via-emerald-400 to-orange-500',
          bands: [
            { label: 'Tier C (<75)', color: '#64748B', desc: 'Moderate Solar Potential' },
            { label: 'Tier B (75–84)', color: '#3B82F6', desc: 'Favorable Regional Return' },
            { label: 'Tier A (85–92)', color: '#10B981', desc: 'High Investment Suitability' },
            { label: 'Tier A+ (>92)', color: '#FF6B16', desc: 'Exceptional Strategic Hub' },
          ],
        };
    }
  };

  const config = getLayerConfig();

  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3.5 shadow-md max-w-xs text-xs text-[#0B1739]">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="p-1 rounded-lg bg-slate-100">{config.icon}</div>
        <div>
          <div className="font-bold text-[12px] leading-tight text-[#0F172A]">{config.title}</div>
          <div className="text-[10px] text-slate-500">{config.subtitle}</div>
        </div>
      </div>

      <div className="mt-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
        <span>Scale Range</span>
        <span className="text-[#FF6B16] lowercase font-bold">{config.units}</span>
      </div>

      <div className={`h-2 rounded-full bg-gradient-to-r ${config.gradient} mb-2 shadow-inner`} />

      <div className="grid grid-cols-2 gap-1.5 pt-1">
        {config.bands.map((band, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: band.color }}
            />
            <span className="font-semibold text-slate-700 truncate">{band.label}:</span>
            <span className="text-slate-500 text-[10px] truncate">{band.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
