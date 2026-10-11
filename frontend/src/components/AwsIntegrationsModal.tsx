import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemIntegrationsResponse, AwsServiceStatus } from '../types/models';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Server,
  Shield,
  Clock,
  Layers,
  FileCode,
  DollarSign,
  X,
  ExternalLink,
  RefreshCw,
  Ban
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AwsIntegrationsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<SystemIntegrationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSystemIntegrations();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load AWS system status');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1739]/50 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="glass-elevated rounded-3xl shadow-2xl border border-white/80 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200/50 flex items-center justify-between bg-white/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-[#FF6B16] border border-orange-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-black text-[#0B1739] tracking-tight">AWS Architecture &amp; Fallback Capability Matrix</h3>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 shadow-2xs">
                  10 Services Configured
                </span>
              </div>
              <p className="text-xs text-[#61708A] mt-0.5">
                Production-ready AWS architecture with deterministic local fallbacks. Fully functional offline and during live demos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadStatus}
              disabled={loading}
              className="p-2 text-[#61708A] hover:text-[#0B1739] hover:bg-white/80 rounded-xl transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FF6B16]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#61708A] hover:text-[#0B1739] hover:bg-white/80 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Bedrock Directive Banner */}
          <div className="p-5 rounded-2xl bg-[#0B1739]/95 text-white flex items-start gap-4 border border-white/20 shadow-md">
            <div className="p-2 bg-red-500/20 text-red-400 rounded-xl">
              <Ban className="w-5 h-5" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-xs text-red-300">
                <span>Architectural Directive: Zero Amazon Bedrock Dependency</span>
                <span className="text-[10px] font-mono bg-red-950/80 text-red-300 px-2 py-0.5 rounded border border-red-800">
                  HARD_DISABLED
                </span>
              </div>
              <p className="text-slate-300 mt-1 leading-relaxed text-[11px]">
                RoofShift AI uses 100% deterministic mathematical optimization (exact Decimal dynamic programming), PV planning engines and explicitly synthetic demand profiles. Zero LLM latency, zero model outages, and zero API costs during critical demonstration.
              </p>
            </div>
          </div>

          {loading && !data && (
            <div className="p-12 text-center text-[#61708A]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#FF6B16]" />
              <p className="text-xs font-semibold">Querying AWS adapters and local fallbacks...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50/80 border border-red-200/80 rounded-2xl text-xs text-red-800 flex items-center gap-2 shadow-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#61708A] pb-2 border-b border-slate-200/50 font-mono">
                <span>Environment: <strong className="font-sans text-[#0B1739] font-bold">{data.environment}</strong></span>
                <span>AWS Region: <strong className="font-sans text-[#0B1739] font-bold">{data.aws_region}</strong></span>
                <span>Direct Cloud Calls: <strong className="font-sans text-[#0B1739] font-bold">{data.aws_enabled ? 'Enabled' : 'Graceful Local Mode'}</strong></span>
              </div>

              {/* Grid of AWS Services */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.services.map((svc: AwsServiceStatus, idx: number) => {
                  const isActive = svc.status === 'Active';
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl glass-surface-secondary border border-white/60 hover:bg-white/80 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#61708A] block font-semibold">
                              {svc.category}
                            </span>
                            <h4 className="text-xs font-black text-[#0B1739] mt-0.5">{svc.service}</h4>
                          </div>
                          <span
                            className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg border shadow-2xs ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                                : 'bg-slate-200/50 text-[#61708A] border-slate-300/50'
                            }`}
                          >
                            {svc.status}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5 text-[#0B1739]">
                            <span className="text-[#61708A] text-[11px] w-18 shrink-0 font-sans font-semibold">Provider:</span>
                            <span className="font-mono text-[11px] font-bold text-[#0B1739]">{svc.active_provider}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[#61708A]">
                            <span className="text-[#61708A] text-[11px] w-18 shrink-0 font-sans font-semibold">Fallback:</span>
                            <span className="text-[#61708A] text-[11px] truncate font-medium">{svc.fallback}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[#61708A]">
                            <span className="text-[#61708A] text-[11px] w-18 shrink-0 font-sans font-semibold">Evidence:</span>
                            <code className="text-[10px] bg-white/80 text-[#0B1739] px-2 py-0.5 rounded-md font-mono border border-white/80 shadow-2xs">
                              {svc.evidence}
                            </code>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-[#61708A] font-mono">
                        <span>Cost: <strong className="text-[#16A34A] font-sans font-bold">{svc.cost_estimate}</strong></span>
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/50 bg-white/60 backdrop-blur-md flex items-center justify-between">
          <span className="text-[11px] text-[#61708A] font-mono">
            RoofShift AI • Cloud Architecture &amp; Infrastructure Status
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#FF6B16] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
