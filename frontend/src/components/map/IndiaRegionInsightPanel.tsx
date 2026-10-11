import React from 'react';
import {
  X,
  Sparkles,
  SunMedium,
  Thermometer,
  Wind,
  CloudSun,
  Building2,
  Mountain,
  ArrowRight,
  School,
  FileDown,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { IndiaSolarRegion } from '../../types/models';

interface IndiaRegionInsightPanelProps {
  region: IndiaSolarRegion | null;
  onClose: () => void;
  onDrillDownToSite: (region: IndiaSolarRegion) => void;
  onOpenSampleCampus: () => void;
}

export const IndiaRegionInsightPanel: React.FC<IndiaRegionInsightPanelProps> = ({
  region,
  onClose,
  onDrillDownToSite,
  onOpenSampleCampus,
}) => {
  if (!region) return null;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'A+':
        return 'bg-orange-500/15 text-[#FF6B16] border-orange-500/30';
      case 'A':
        return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
      case 'B+':
      case 'B':
        return 'bg-blue-500/15 text-blue-700 border-blue-500/30';
      default:
        return 'bg-slate-500/15 text-slate-700 border-slate-500/30';
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(region, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RoofShift_AI_Solar_Profile_${region.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="absolute top-4 right-4 z-1000 w-[380px] sm:w-[420px] max-w-[calc(100vw-32px)] bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-3xl shadow-2xl p-5 sm:p-6 text-[#0B1739] max-h-[calc(100vh-140px)] overflow-y-auto animate-in slide-in-from-right-4 duration-300">
      {/* Header with Close */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getTierColor(
                region.suitability_tier
              )}`}
            >
              Tier {region.suitability_tier} Zone
            </span>
            <span className="text-[11px] text-slate-400 font-semibold">{region.zone}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
            {region.name}
          </h2>
          <div className="text-[11px] text-slate-500 font-medium">
            {region.zone_classification}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
          aria-label="Close insight panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Score Ring & Yield Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/60 border border-orange-200/60 mb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            AI Suitability Index
          </div>
          <div className="text-3xl font-black text-[#FF6B16] flex items-baseline gap-1 mt-0.5">
            <span>{region.ai_suitability_composite}</span>
            <span className="text-sm font-bold text-slate-400">/ 100</span>
          </div>
          <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Yield: ~{region.annual_yield_kwh_per_kwp} kWh/kWp/yr</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Coordinates
          </div>
          <div className="text-xs font-semibold text-slate-700 mt-1">
            {region.coordinates.lat.toFixed(2)}°N, {region.coordinates.lng.toFixed(2)}°E
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            NASA POWER 0.5° Grid
          </div>
        </div>
      </div>

      {/* 4 Climatological Environmental Indicator Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
            <SunMedium className="w-3.5 h-3.5 text-[#FF6B16]" />
            <span className="font-semibold">Irradiance (GHI)</span>
          </div>
          <div className="text-base font-extrabold text-[#0F172A]">
            {region.ghi_daily_kwh} <span className="text-[10px] font-normal text-slate-500">kWh/m²/d</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            DNI: {region.dni_daily_kwh} kWh/m²/d
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
            <Thermometer className="w-3.5 h-3.5 text-rose-500" />
            <span className="font-semibold">Ambient Temp</span>
          </div>
          <div className="text-base font-extrabold text-[#0F172A]">
            {region.ambient_temp_celsius}°C
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {region.ambient_temp_celsius > 30 ? (
              <span className="text-amber-600 font-medium">Heat derate ~ -2.8%</span>
            ) : region.ambient_temp_celsius < 18 ? (
              <span className="text-emerald-600 font-medium">Cold boost ~ +4.5%</span>
            ) : (
              <span className="text-slate-500">Nominal thermal band</span>
            )}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
            <Wind className="w-3.5 h-3.5 text-sky-500" />
            <span className="font-semibold">Wind Speed</span>
          </div>
          <div className="text-base font-extrabold text-[#0F172A]">
            {region.wind_speed_ms} <span className="text-[10px] font-normal text-slate-500">m/s</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Convective cooling: +{(region.wind_speed_ms * 0.3).toFixed(1)}%
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
            <CloudSun className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-semibold">Cloud Cover</span>
          </div>
          <div className="text-base font-extrabold text-[#0F172A]">
            {region.cloud_monsoon_pct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Monsoon seasonal dip
          </div>
        </div>
      </div>

      {/* Differentiated Suitability Comparison (Rooftop vs Open Land) */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 mb-4 shadow-2xs">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          Dual Opportunity Suitability
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-[#0F172A]">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                Rooftop Solar Potential
              </span>
              <span className="font-extrabold text-emerald-600">
                {region.rooftop_suitability_score} / 100
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${region.rooftop_suitability_score}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Estimated State Potential:</span>
              <span className="font-semibold text-slate-700">{region.estimated_rooftop_potential_gw} GWp</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-[#0F172A]">
                <Mountain className="w-3.5 h-3.5 text-amber-600" />
                Open-Land Solar Farm Potential
              </span>
              <span className="font-extrabold text-amber-600">
                {region.open_land_suitability_score} / 100
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${region.open_land_suitability_score}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Estimated Ground Potential:</span>
              <span className="font-semibold text-slate-700">{region.estimated_openland_potential_gw} GWp</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Strategic Engineering Recommendations */}
      <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 mb-4 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-[12px] text-[#0F172A] mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[#FF6B16]" />
          <span>AI Strategic Recommendations</span>
        </div>

        <div className="space-y-2 text-[11px] text-slate-600 leading-relaxed">
          <div>
            <span className="font-bold text-slate-800">Module Selection: </span>
            {region.ai_recommendations.module_technology}
          </div>
          <div>
            <span className="font-bold text-slate-800">Tracking & Tilt: </span>
            {region.ai_recommendations.tracking_recommendation}
          </div>
          <div>
            <span className="font-bold text-slate-800">Soiling & Maintenance: </span>
            {region.ai_recommendations.soiling_and_cleaning}
          </div>
          <div>
            <span className="font-bold text-slate-800">Grid & Storage: </span>
            {region.ai_recommendations.grid_and_storage}
          </div>
          <div>
            <span className="font-bold text-slate-800">Seasonal Risks: </span>
            {region.ai_recommendations.seasonal_risk_summary}
          </div>
        </div>
      </div>

      {/* Featured Corridors */}
      {region.key_corridors && region.key_corridors.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Key Solar Corridors & Clusters
          </div>
          <div className="flex flex-wrap gap-1.5">
            {region.key_corridors.map((c, i) => (
              <span
                key={i}
                className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action CTAs */}
      <div className="space-y-2 pt-1">
        <button
          onClick={() => onDrillDownToSite(region)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#FF6B16] hover:bg-[#EA580C] text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
        >
          <span>Drill Down to Site Planning in {region.short_name}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onOpenSampleCampus}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Inspect 5-building BITS Pilani sample portfolio"
          >
            <School className="w-3.5 h-3.5 text-[#FF6B16]" />
            <span>Sample Campus</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0F172A] border border-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-600" />
            <span>Export Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};
