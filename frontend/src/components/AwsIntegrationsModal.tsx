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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-xl border border-amber-200">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">AWS Architecture & Fallback Capability Matrix</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  10 Services Configured
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-service AWS architecture with verified zero-cost local fallbacks. Works locally without cloud credentials.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadStatus}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Bedrock Directive Banner */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-start gap-3 shadow-sm border border-slate-800">
            <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
              <Ban className="w-5 h-5" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm text-red-300">
                <span>Architectural Directive: Zero Amazon Bedrock Dependency</span>
                <span className="text-[10px] bg-red-950 text-red-200 px-2 py-0.5 rounded border border-red-800">
                  HARD_DISABLED
                </span>
              </div>
              <p className="text-slate-300 mt-1 leading-relaxed">
                RoofShift AI uses 100% deterministic mathematical optimization (Google OR-Tools CP-SAT & Dynamic Programming), PV physics models, and Scikit-learn load curve profilers. Zero LLM latency, zero model downtime, and zero API costs during critical demonstration.
              </p>
            </div>
          </div>

          {loading && !data && (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
              <p className="text-xs">Querying AWS adapters and local fallbacks...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 pb-1">
                <span>Environment: <strong className="text-slate-800">{data.environment}</strong></span>
                <span>AWS Region: <strong className="text-slate-800">{data.aws_region}</strong></span>
                <span>AWS Direct Calls: <strong className="text-slate-800">{data.aws_enabled ? 'Enabled' : 'Graceful Local Mode'}</strong></span>
              </div>

              {/* Grid of AWS Services */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {data.services.map((svc: AwsServiceStatus, idx: number) => {
                  const isActive = svc.status === 'Active';
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                              {svc.category}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">{svc.service}</h4>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {svc.status}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <span className="text-slate-400 text-[11px] w-20 shrink-0">Provider:</span>
                            <span className="font-semibold">{svc.active_provider}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="text-slate-400 text-[11px] w-20 shrink-0">Fallback:</span>
                            <span className="text-slate-600 truncate">{svc.fallback}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="text-slate-400 text-[11px] w-20 shrink-0">Artifact:</span>
                            <code className="text-[10px] bg-slate-200/70 text-slate-800 px-1.5 py-0.5 rounded">
                              {svc.evidence}
                            </code>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Cost: <strong className="text-emerald-700 font-semibold">{svc.cost_estimate}</strong></span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            RoofShift AI Platform • Environmental Hacks 2026 • Team DRX
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#123C32] hover:bg-[#0B251F] text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
