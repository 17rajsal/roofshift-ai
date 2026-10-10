import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    <div className="space-y-6 pb-16">
      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
          <span>{error}</span>
          <button onClick={() => void loadReports()} className="font-semibold underline">Reload reports</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Executive Investment & Engineering Reports</span>
            </h2>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
              Audit-Ready PDF
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate formal engineering proposals with knapsack portfolio allocations, load shift schedules, and financial payback models.
          </p>
        </div>

        <button
          onClick={handleGeneratePdf}
          disabled={generating || loading || !activeProject}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium flex items-center gap-2 shadow-2xs transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>{generating ? 'Compiling Official PDF...' : 'Generate New PDF Report'}</span>
        </button>
      </div>

      {/* Engineering Notes Input */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
        <label htmlFor="report-notes" className="block text-xs font-semibold text-slate-900 uppercase tracking-wider">
          Review Notes & Engineering Annotations
        </label>
        <p className="text-xs text-slate-500 mt-0.5 mb-2">These notes will be compiled into Section 6 of the official PDF document.</p>
        <textarea
          id="report-notes"
          value={notes}
          onChange={event => setNotes(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Add campus context, special interconnection notes, or institutional approvals for the executive review team…"
          className="w-full rounded-md border border-slate-300 p-3 text-xs focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
      </div>

      {/* Main Grid: Report Preview & Document Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Report Structure Outline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs space-y-5">
            {/* Report Cover Header */}
            <div className="border-b border-slate-200 pb-4">
              <div className="text-[10px] font-mono font-medium text-amber-700 uppercase tracking-wider mb-1">
                RoofShift AI • Engineering & Financial Feasibility Study
              </div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Solar Investment & Multi-Rooftop Dispatch Assessment
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2 font-mono">
                <span><strong className="font-sans font-medium text-slate-700">Client:</strong> {activeProject?.organization_name}</span>
                <span><strong className="font-sans font-medium text-slate-700">Jurisdiction:</strong> {activeProject?.city}</span>
                <span><strong className="font-sans font-medium text-slate-700">Sanctioned Budget:</strong> {formatINR(activeProject?.budget)}</span>
              </div>
            </div>

            {/* Document Sections Outline */}
            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded border border-slate-150">
                <h3 className="font-semibold text-slate-900 mb-0.5">1. Executive Summary & Investment KPIs</h3>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Synthesizes recommended DC/AC capacity, turnkey capital expenditure, annual utility cost reduction, and simple capital payback duration.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-150">
                <h3 className="font-semibold text-slate-900 mb-0.5">2. Candidate Buildings Inventory & Rooftop Geometries</h3>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Surveys gross roof area (m²), usable surface after setback buffers, visual shading derates, and baseline consumption profiles.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-150">
                <h3 className="font-semibold text-slate-900 mb-0.5">3. Mathematical Multiple-Choice Knapsack Allocations</h3>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Tabulates exact capacity (kWp) allocated per rooftop, turnkey cost, expected generation, and solver rationales for selected vs. deferred roofs.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-150">
                <h3 className="font-semibold text-slate-900 mb-0.5">4. Optimized Plan vs Naive Baseline Benchmark</h3>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Quantifies economic lift achieved by solving the mathematical knapsack over a conventional naive heuristic (largest roof first).
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-150">
                <h3 className="font-semibold text-slate-900 mb-0.5">5. Diurnal Solar Surplus & Flexible Load Dispatch</h3>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Details operating windows for flexible equipment (EV charging, pump reservoirs, HVAC pre-cooling) to absorb peak solar generation.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-150">
                <h3 className="font-semibold text-slate-900 mb-0.5">6. Assumptions, Data Provenance & Limitations</h3>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Documents NASA POWER satellite irradiance provenance, system performance ratio (75% PR), and statutory DISCOM transformer constraints.
                </p>
              </div>
            </div>

            {/* Regulatory Disclaimer Box */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 space-y-1">
              <strong className="text-slate-800 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Preliminary Decision Support Notice
              </strong>
              <p className="text-[11px] leading-relaxed text-slate-500">
                This document provides preliminary techno-economic screening analysis. It does not substitute for certified structural engineering assessments, electrical protection single-line diagrams, or statutory DISCOM net-metering approvals required prior to physical procurement.
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: PDF Download Card & Generated Reports History */}
        <div className="space-y-5">
          {/* Active Download Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="w-8 h-8 rounded bg-slate-100 text-slate-800 flex items-center justify-center border border-slate-200">
              <FileCheck className="w-4 h-4 text-emerald-700" />
            </div>

            <div>
              <h3 className="font-semibold text-sm text-slate-900">{activeReport ? 'Ready for Download' : 'Report Output'}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Executive investment document compiled for the active project.
              </p>
            </div>

            {activeReport ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded border border-slate-150 text-xs space-y-1">
                  <div className="text-slate-900 font-medium truncate">{activeReport.filename}</div>
                  <div className="text-slate-500 text-[10px] font-mono">
                    Size: {(activeReport.file_size_bytes / 1024).toFixed(1)} KB • Adobe PDF
                  </div>
                </div>

                <button
                  onClick={() => downloadReportFile(activeReport)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download Formal PDF Report</span>
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Click <strong>"Generate New PDF Report"</strong> above to compile the official document.
              </div>
            )}
          </div>

          {/* Previous Reports History */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Generated Reports Archive ({reports.length})
            </h4>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loading && <p role="status" className="text-xs text-slate-500">Loading report history…</p>}
              {!loading && reports.length === 0 && <p className="text-xs text-slate-500">No reports generated for this project yet.</p>}
              {reports.map((rep) => (
                <div
                  key={rep.report_id}
                  onClick={() => setActiveReport(rep)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setActiveReport(rep); } }}
                  className={`p-3 rounded border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                    activeReport?.report_id === rep.report_id
                      ? 'bg-slate-100 border-slate-300 font-medium'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="font-medium text-slate-900 truncate text-xs">{rep.filename}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {(rep.file_size_bytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadReportFile(rep);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded"
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
    </div>
  );
};
