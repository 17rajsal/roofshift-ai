import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { GeneratedReportSummary } from '../types/models';
import { api, resolveReportUrl } from '../services/api';
import {
  formatINR,
} from '../utils/formatters';
import {
  FileText,
  Download,
  ShieldCheck,
  FileCheck,
  ArrowRight,
  Activity,
} from 'lucide-react';

export const ReportPage: React.FC = () => {
  const { activeProject } = useProject();
  const [reports, setReports] = useState<GeneratedReportSummary[]>([]);
  const [generating, setGenerating] = useState<boolean>(false);
  const [activeReport, setActiveReport] = useState<GeneratedReportSummary | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);

  const loadReports = useCallback(async () => {
    if (!activeProject) return;
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const list = await api.getReports(activeProject.id);
      if (version !== requestVersion.current) return;
      setReports(list);
      setActiveReport(current => list.find(report => report.report_id === current?.report_id) || list[0] || null);
    } catch (err) {
      if (version === requestVersion.current) setError(err instanceof Error ? err.message : 'Could not load reports.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    setReports([]);
    setActiveReport(null);
    void loadReports();
    return () => { requestVersion.current++; };
  }, [loadReports]);

  const handleGeneratePdf = async () => {
    if (!activeProject) return;
    try {
      setGenerating(true);
      setError(null);
      const rep = await api.generateReport(activeProject.id, { notes });
      setReports(current => [rep, ...current]);
      setActiveReport(rep);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadReportFile = (rep: GeneratedReportSummary) => {
    const link = document.createElement('a');
    link.href = resolveReportUrl(rep.download_url);
    link.download = rep.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-red-200/80 bg-red-50/80 backdrop-blur-md p-4 text-xs text-red-800 shadow-xs">
          <span>{error}</span>
          <button onClick={() => void loadReports()} className="font-bold underline hover:text-red-950">Reload reports</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-[#FF6B16] border border-orange-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-[#0B1739] tracking-tight">
                  Executive Investment &amp; Engineering Reports
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 shadow-2xs">
                  Audit-Ready PDF
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#61708A] mt-0.5">
                Generate formal engineering proposals with knapsack portfolio allocations, load shift schedules, and financial payback models.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleGeneratePdf}
          disabled={generating || loading || !activeProject}
          className="w-full sm:w-auto px-5 py-3 bg-[#FF6B16] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-white" />
          <span>{generating ? 'Compiling Official PDF...' : 'Generate New PDF Report'}</span>
        </button>
      </div>

      {/* Engineering Notes Input */}
      <div className="glass-panel p-6 rounded-3xl shadow-sm space-y-2">
        <label htmlFor="report-notes" className="block text-xs font-bold text-[#0B1739] uppercase tracking-wider">
          Review Notes &amp; Engineering Annotations
        </label>
        <p className="text-xs text-[#61708A]">These notes will be compiled into Section 6 of the official PDF document.</p>
        <textarea
          id="report-notes"
          value={notes}
          onChange={event => setNotes(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Add campus context, special interconnection notes, or institutional approvals for the executive review team…"
          className="w-full rounded-2xl border border-white/80 bg-white/80 p-3.5 text-xs text-[#0B1739] placeholder:text-[#61708A]/60 focus:outline-none focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 shadow-2xs"
        />
      </div>

      {/* Main Grid: Report Preview & Document Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Report Structure Outline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Report Cover Header */}
            <div className="border-b border-slate-200/50 pb-5">
              <div className="text-[10px] font-mono font-bold text-[#FF6B16] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF6B16] inline-block" />
                RoofShift AI • Engineering &amp; Financial Feasibility Study
              </div>
              <h1 className="text-xl font-black text-[#0B1739] tracking-tight">
                Solar Investment &amp; Multi-Rooftop Dispatch Assessment
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#61708A] mt-3">
                <span className="px-3 py-1 rounded-xl bg-white/70 border border-white/80 font-mono shadow-2xs">
                  <strong className="font-sans font-bold text-[#0B1739]">Client:</strong> {activeProject?.organization_name}
                </span>
                <span className="px-3 py-1 rounded-xl bg-white/70 border border-white/80 font-mono shadow-2xs">
                  <strong className="font-sans font-bold text-[#0B1739]">Jurisdiction:</strong> {activeProject?.city}
                </span>
                <span className="px-3 py-1 rounded-xl bg-white/70 border border-white/80 font-mono shadow-2xs">
                  <strong className="font-sans font-bold text-[#0B1739]">Sanctioned Budget:</strong> {formatINR(activeProject?.budget)}
                </span>
              </div>
            </div>

            {/* Document Sections Outline */}
            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl glass-surface-secondary border border-white/60">
                <h3 className="font-bold text-[#0B1739] mb-1 text-xs">1. Executive Summary &amp; Investment KPIs</h3>
                <p className="text-[#61708A] leading-relaxed text-[11px]">
                  Synthesizes recommended DC/AC capacity, turnkey capital expenditure, annual utility cost reduction, and simple capital payback duration.
                </p>
              </div>

              <div className="p-4 rounded-2xl glass-surface-secondary border border-white/60">
                <h3 className="font-bold text-[#0B1739] mb-1 text-xs">2. Candidate Buildings Inventory &amp; Rooftop Geometries</h3>
                <p className="text-[#61708A] leading-relaxed text-[11px]">
                  Surveys gross roof area (m²), usable surface after setback buffers, visual shading derates, and baseline consumption profiles.
                </p>
              </div>

              <div className="p-4 rounded-2xl glass-surface-secondary border border-white/60">
                <h3 className="font-bold text-[#0B1739] mb-1 text-xs">3. Mathematical Multiple-Choice Knapsack Allocations</h3>
                <p className="text-[#61708A] leading-relaxed text-[11px]">
                  Tabulates exact capacity (kWp) allocated per rooftop, turnkey cost, expected generation, and solver rationales for selected vs. deferred roofs.
                </p>
              </div>

              <div className="p-4 rounded-2xl glass-surface-secondary border border-white/60">
                <h3 className="font-bold text-[#0B1739] mb-1 text-xs">4. Optimized Plan vs Naive Baseline Benchmark</h3>
                <p className="text-[#61708A] leading-relaxed text-[11px]">
                  Quantifies economic lift achieved by solving the mathematical knapsack over a conventional naive heuristic (largest roof first).
                </p>
              </div>

              <div className="p-4 rounded-2xl glass-surface-secondary border border-white/60">
                <h3 className="font-bold text-[#0B1739] mb-1 text-xs">5. Diurnal Solar Surplus &amp; Flexible Load Dispatch</h3>
                <p className="text-[#61708A] leading-relaxed text-[11px]">
                  Details operating windows for flexible equipment (EV charging, pump reservoirs, HVAC pre-cooling) to absorb peak solar generation.
                </p>
              </div>

              <div className="p-4 rounded-2xl glass-surface-secondary border border-white/60">
                <h3 className="font-bold text-[#0B1739] mb-1 text-xs">6. Assumptions, Data Provenance &amp; Limitations</h3>
                <p className="text-[#61708A] leading-relaxed text-[11px]">
                  Documents NASA POWER satellite irradiance provenance, system performance ratio (75% PR), and statutory DISCOM transformer constraints.
                </p>
              </div>
            </div>

            {/* Regulatory Disclaimer Box */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-[#0B1739] space-y-1 shadow-2xs">
              <strong className="text-[#0B1739] flex items-center gap-2 font-bold">
                <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                Preliminary Decision Support Notice
              </strong>
              <p className="text-[11px] leading-relaxed text-[#61708A]">
                This document provides preliminary techno-economic screening analysis. It does not substitute for certified structural engineering assessments, electrical protection single-line diagrams, or statutory DISCOM net-metering approvals required prior to physical procurement.
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: PDF Download Card & Generated Reports History */}
        <div className="space-y-6">
          {/* Active Download Card */}
          <div className="glass-panel rounded-3xl p-6 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-[#16A34A] flex items-center justify-center border border-emerald-500/20">
              <FileCheck className="w-5 h-5 text-[#16A34A]" />
            </div>

            <div>
              <h3 className="font-black text-base text-[#0B1739]">{activeReport ? 'Ready for Download' : 'Report Output'}</h3>
              <p className="text-xs text-[#61708A] mt-0.5">
                Executive investment document compiled for the active project.
              </p>
            </div>

            {activeReport ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl glass-surface-secondary border border-white/60 text-xs space-y-1">
                  <div className="text-[#0B1739] font-bold truncate">{activeReport.filename}</div>
                  <div className="text-[#61708A] text-[10px] font-mono">
                    Size: {(activeReport.file_size_bytes / 1024).toFixed(1)} KB • Adobe PDF
                  </div>
                </div>

                <button
                  onClick={() => downloadReportFile(activeReport)}
                  className="w-full py-3 bg-[#FF6B16] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Download Formal PDF Report</span>
                </button>
              </div>
            ) : (
              <div className="text-xs text-[#61708A] p-4 rounded-2xl glass-surface-secondary border border-white/60">
                Click <strong className="text-[#0B1739]">"Generate New PDF Report"</strong> above to compile the official document.
              </div>
            )}
          </div>

          {/* Previous Reports History */}
          <div className="glass-panel rounded-3xl p-6 shadow-sm space-y-3.5">
            <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">
              Generated Reports Archive ({reports.length})
            </h4>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {loading && <p role="status" className="text-xs text-[#61708A]">Loading report history…</p>}
              {!loading && reports.length === 0 && <p className="text-xs text-[#61708A]">No reports generated for this project yet.</p>}
              {reports.map((rep) => (
                <div
                  key={rep.report_id}
                  onClick={() => setActiveReport(rep)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setActiveReport(rep); } }}
                  className={`p-3.5 rounded-2xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                    activeReport?.report_id === rep.report_id
                      ? 'glass-elevated border-[#FF6B16] ring-1 ring-[#FF6B16]/30 shadow-md font-bold'
                      : 'glass-surface-secondary border-white/60 hover:bg-white/80'
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="font-bold text-[#0B1739] truncate text-xs">{rep.filename}</div>
                    <div className="text-[10px] text-[#61708A] font-mono">
                      {(rep.file_size_bytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadReportFile(rep);
                    }}
                    className="p-2 text-[#61708A] hover:text-[#0B1739] hover:bg-white/80 rounded-xl transition-colors"
                    title="Download this file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Part E: Next Step Navigation */}
      <div className="flex items-center justify-between p-5 rounded-3xl glass-panel">
        <div>
          <div className="text-xs font-bold text-[#0B1739]">Workflow Complete</div>
          <div className="text-xs text-[#61708A]">Return to Workspace Hub or monitor live telemetry and asset performance.</div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/operations"
            className="glass-button-secondary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Activity className="w-3.5 h-3.5 text-[#FF6B16]" />
            <span>Open Solar Operations</span>
          </Link>
          <Link
            to="/workspace"
            className="glass-button-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <span>Return to Workspace Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
