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
                <span>MNRE / NISE (2014) National Solar Radiation Potential Assessment (3% Wasteland Coverage, 748.98 GWp baseline, https://mnre.gov.in/en/solar-overview/)</span>
              </li>
            </ul>
          </div>

          {/* Category 2: Derived AI Formulations */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-[#0F172A]">2. Engineering Suitability Index (MCDA)</h3>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Deterministic Model v8.2
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed mb-2.5">
              Deterministic Multi-Criteria Decision Analysis (MCDA) evaluates rooftop and ground-mount PV opportunity separately (XGBoost ML is strictly reserved for hourly solar generation forecasting):
            </p>
            <div className="space-y-2 font-mono text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-700">
              <div>
                <strong className="text-emerald-700 font-sans">Rooftop Score: </strong>
                35% GHI + 30% C&I Density + 15% TempDerate + 10% WindCooling − 10% CloudLoss
              </div>
              <div>
                <strong className="text-amber-700 font-sans">Open-Land Score: </strong>
                35% DNI + 30% BarrenLand + 20% ISTS Grid + 10% TempDerate − 5% TerrainSlope
              </div>
              <div className="text-slate-500 font-sans text-[10px] pt-1 border-t border-slate-200/70">
                Composite Index = 50% Rooftop + 50% Open-Land (Tier A+: ≥93, Tier A: 88-92, Tier B+: 82-87)
              </div>
            </div>
            <ul className="space-y-1 text-slate-500 mt-2.5">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span><strong>Silicon Thermal Derate:</strong> Pmax temperature coefficient (-0.38%/°C above 25°C).</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span><strong>Convective Cooling:</strong> Aerodynamic wind dissipation (+0.3%/m/s) offsetting cell heat.</span>
              </li>
            </ul>
          </div>

          {/* Category 3: Multi-Scale Granularity */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-[#FF6B16]" />
              <h3 className="font-bold text-sm text-[#0F172A]">3. Multi-Scale Spatial Hierarchy & Limitations</h3>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                0.5° Grid & Sub-Meter
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1 text-[11px] text-center font-semibold">
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
            <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[10px] text-amber-900 leading-relaxed">
              <span className="font-bold">Engineering Limitations: </span>
              Macro regional scores represent 0.5° × 0.5° satellite climatology and state baselines.
              Rooftop potential is not officially quantified state-by-state by MNRE.
              Regional metrics do not replace site-level 3D shadow raytracing (LiDAR required), legal revenue land clearances, or DISCOM substation interconnection approvals.
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
