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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 text-amber-700 rounded-md border border-slate-200">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">AWS Architecture & Fallback Capability Matrix</h3>
                <span className="text-[10px] uppercase font-mono font-medium tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  10 Services Configured
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Production-ready AWS architecture with deterministic local fallbacks. Fully functional offline and during live demos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadStatus}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
              title="Refresh status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Bedrock Directive Banner */}
          <div className="p-4 rounded-lg bg-slate-900 text-white flex items-start gap-3 border border-slate-800">
            <div className="p-2 bg-red-500/20 text-red-400 rounded">
              <Ban className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-2 font-medium text-xs text-red-300">
                <span>Architectural Directive: Zero Amazon Bedrock Dependency</span>
                <span className="text-[10px] font-mono bg-red-950 text-red-300 px-2 py-0.2 rounded border border-red-800">
                  HARD_DISABLED
                </span>
              </div>
              <p className="text-slate-300 mt-1 leading-relaxed text-[11px]">
                RoofShift AI uses 100% deterministic mathematical optimization (exact Decimal dynamic programming), PV planning engines and explicitly synthetic demand profiles. Zero LLM latency, zero model outages, and zero API costs during critical demonstration.
              </p>
            </div>
          </div>

          {loading && !data && (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
              <p className="text-xs">Querying AWS adapters and local fallbacks...</p>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200/80 rounded-md text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 pb-1 border-b border-slate-100 font-mono">
                <span>Environment: <strong className="font-sans text-slate-900">{data.environment}</strong></span>
                <span>AWS Region: <strong className="font-sans text-slate-900">{data.aws_region}</strong></span>
                <span>Direct Cloud Calls: <strong className="font-sans text-slate-900">{data.aws_enabled ? 'Enabled' : 'Graceful Local Mode'}</strong></span>
              </div>

              {/* Grid of AWS Services */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.services.map((svc: AwsServiceStatus, idx: number) => {
                  const isActive = svc.status === 'Active';
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                              {svc.category}
                            </span>
                            <h4 className="text-xs font-semibold text-slate-900">{svc.service}</h4>
                          </div>
                          <span
                            className={`text-[10px] font-medium font-mono px-2 py-0.5 rounded border ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {svc.status}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <span className="text-slate-400 text-[11px] w-18 shrink-0 font-sans">Provider:</span>
                            <span className="font-mono text-[11px] font-medium text-slate-900">{svc.active_provider}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="text-slate-400 text-[11px] w-18 shrink-0 font-sans">Fallback:</span>
                            <span className="text-slate-600 text-[11px] truncate">{svc.fallback}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <span className="text-slate-400 text-[11px] w-18 shrink-0 font-sans">Evidence:</span>
                            <code className="text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono border border-slate-200">
                              {svc.evidence}
                            </code>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>Cost: <strong className="text-emerald-700 font-sans font-medium">{svc.cost_estimate}</strong></span>
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
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            RoofShift AI • Environmental Hacks 2026 • Team DRX
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium shadow-2xs transition-colors"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
