import React from 'react';
import { X, ShieldCheck, CheckCircle2, Layers, Cpu, Database, AlertCircle, Info } from 'lucide-react';

interface IndiaDataProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IndiaDataProvenanceModal: React.FC<IndiaDataProvenanceModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative text-[#0B1739] max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-2xl bg-slate-100/80 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[#FF6B16] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">Data & AI Provenance Architecture</h2>
            <p className="text-xs text-slate-500 font-medium">
              Transparent multi-scale solar engineering — Verified baselines vs Derived AI models
            </p>
          </div>
        </div>

        {/* Core Principles Alert */}
        <div className="mb-5 p-3.5 rounded-2xl bg-orange-50 border border-orange-200/80 text-orange-950 text-xs leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#FF6B16] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Zero Fabricated Claims:</span> RoofShift AI does not claim
            unsubstantiated live satellite flyovers or fictional government API feeds. All national
            intelligence is computed from peer-reviewed climatological baselines and deterministic solar physics.
          </div>
        </div>

        {/* 3 Categories of Data & AI Modeling */}
        <div className="space-y-4 text-xs">
          {/* Category 1: Real Baselines */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-[#0F172A]">1. Real Climatological Baselines</h3>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Peer-Reviewed
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed mb-2">
              Solar irradiance metrics (Global Horizontal Irradiance GHI, Direct Normal Irradiance DNI, and Diffuse DHI)
              are anchored in NASA POWER 20-year satellite/reanalysis datasets.
            </p>
            <ul className="space-y-1 text-slate-500">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>NASA Langley Research Center POWER Satellite Climatology (0.5° × 0.5° spatial grid)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>IMD (India Meteorological Department) long-term surface temperature & wind speed normals</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>MNRE (Ministry of New and Renewable Energy) state solar potential assessments</span>
              </li>
            </ul>
          </div>

          {/* Category 2: Derived AI Formulations */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-[#0F172A]">2. Derived AI & Physics Formulations</h3>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Computational Model
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed mb-2">
              Raw environmental inputs are processed through RoofShift AI’s multi-variable engineering engine:
            </p>
            <ul className="space-y-1 text-slate-500">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span><strong>Temperature Derating:</strong> Pmax coefficient modeling (silicon standard -0.38%/°C above 25°C).</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span><strong>Convective Cooling:</strong> Aerodynamic wind dissipation offsetting module surface heat.</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span><strong>Dual Suitability Index:</strong> Differentiated scoring for commercial rooftop vs open-land utility solar.</span>
              </li>
            </ul>
          </div>

          {/* Category 3: Multi-Scale Granularity */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-[#FF6B16]" />
              <h3 className="font-bold text-sm text-[#0F172A]">3. Multi-Scale Spatial Hierarchy</h3>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                Hierarchical Drilldown
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed mb-1.5">
              RoofShift AI operates across 4 distinct spatial resolution tiers:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-center font-semibold">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[#FF6B16] block">Scale 1</span>
                <span>National Map</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-blue-600 block">Scale 2</span>
                <span>State & Corridor</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-emerald-600 block">Scale 3</span>
                <span>City & District</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-violet-600 block">Scale 4</span>
                <span>Site & Rooftop</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs shadow-md cursor-pointer transition-all"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
