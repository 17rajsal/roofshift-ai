import React from 'react';
import {
  ThermalMode,
  ThermalDataProvenance,
  getDiagnosticStatusBadge,
} from '../../utils/thermalIntelligence';
import { Info, AlertTriangle, ShieldCheck, Flame, Layers } from 'lucide-react';

interface ThermalMapLegendProps {
  mode: ThermalMode;
  minTempC?: number;
  maxTempC?: number;
  provenance?: ThermalDataProvenance;
  criticalCount?: number;
  elevatedCount?: number;
  reviewCount?: number;
  normalCount?: number;
}

export const ThermalMapLegend: React.FC<ThermalMapLegendProps> = ({
  mode,
  minTempC = 38.0,
  maxTempC = 68.0,
  provenance = 'SAMPLE',
  criticalCount = 1,
  elevatedCount = 2,
  reviewCount = 2,
  normalCount = 21,
}) => {
  if (mode === 'satellite') {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-lg backdrop-blur-md text-xs max-w-[260px]">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Layers className="w-3.5 h-3.5 text-slate-600" />
          <span>Satellite Base Layer</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 leading-snug">
          High-resolution aerial imagery showing physical rooftop geometry and installation boundaries.
        </p>
      </div>
    );
  }

  if (mode === 'health') {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white/95 p-3.5 shadow-lg backdrop-blur-md text-xs max-w-[280px]">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Fleet Diagnostic Health</span>
          </div>
          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              provenance === 'MEASURED'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {provenance}
          </span>
        </div>

        <div className="mt-2.5 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-700">Nominal (ΔT &lt; 5°C)</span>
            </div>
            <span className="font-semibold text-slate-900">{normalCount}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="text-slate-700">Review (ΔT 5–9°C)</span>
            </div>
            <span className="font-semibold text-slate-900">{reviewCount}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-700">Elevated (ΔT 10–19°C)</span>
            </div>
            <span className="font-semibold text-slate-900">{elevatedCount}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-slate-700 font-medium">Critical (ΔT ≥ 20°C)</span>
            </div>
            <span className="font-bold text-rose-600">{criticalCount}</span>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          <span>Rule-based diagnostic classification</span>
        </div>
      </div>
    );
  }

  // Thermal Heatmap Mode Legend
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-md text-xs max-w-[310px]">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <Flame className="w-4 h-4 text-orange-500" />
          <span>Panel Surface Temp</span>
        </div>
        <span
          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
            provenance === 'MEASURED'
              ? 'bg-emerald-100 text-emerald-800'
              : provenance === 'SAMPLE'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {provenance === 'SAMPLE' ? 'Sample Demo' : provenance}
        </span>
      </div>

      {/* Scientific Multi-stop Thermal Gradient */}
      <div className="mt-2.5">
        <div
          className="h-3.5 w-full rounded-md shadow-inner"
          style={{
            background:
              'linear-gradient(to right, #1E3A8A 0%, #0284C7 16%, #06B6D4 33%, #10B981 50%, #FBBF24 67%, #F97316 83%, #EF4444 94%, #9333EA 100%)',
          }}
        />
        <div className="mt-1.5 flex justify-between text-[11px] font-mono text-slate-600">
          <span>{minTempC.toFixed(0)}°C</span>
          <span>{((minTempC + maxTempC) / 2).toFixed(0)}°C</span>
          <span className="font-bold text-slate-900">{maxTempC.toFixed(0)}°C+</span>
        </div>
        <div className="flex justify-between text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">
          <span>Coolest</span>
          <span>Baseline</span>
          <span>Hotspot</span>
        </div>
      </div>

      <div className="mt-2.5 rounded-md bg-slate-50 p-2 text-[10px] text-slate-600 leading-snug border border-slate-100">
        <strong className="text-slate-800">Scientific Distinction:</strong> Surface temperature (°C) is
        separate from solar irradiance (W/m²). Hotspots are evaluated relative to the baseline operating
        envelope.
      </div>
    </div>
  );
};
