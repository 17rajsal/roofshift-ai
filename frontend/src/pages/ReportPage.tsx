import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';
import { GeneratedReportSummary } from '../types/models';
import { api, resolveReportUrl } from '../services/api';
import {
  formatINR,
  formatEnergy,
  formatPower,
  formatArea,
} from '../utils/formatters';
import {
  FileText,
  Download,
  Printer,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  Cpu,
  Sun,
  AlertCircle,
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
    window.open(resolveReportUrl(rep.download_url), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8 pb-16">
      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button onClick={() => void loadReports()} className="font-semibold underline">Reload reports</button></div>}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5EAE7] shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#17231F] flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>Official Solar Investment & Energy Optimization Report</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Download an executive engineering proposal complete with knapsack budget allocations and explainability.
          </p>
        </div>

        <button
          onClick={handleGeneratePdf}
          disabled={generating || loading || !activeProject}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{generating ? 'Compiling Official PDF...' : 'Generate New PDF Report'}</span>
        </button>
      </div>

      <div className="rounded-2xl border border-[#E5EAE7] bg-white p-5">
        <label htmlFor="report-notes" className="block text-sm font-semibold text-[#123C32]">Notes for this report</label>
        <textarea id="report-notes" value={notes} onChange={event => setNotes(event.target.value)} maxLength={2000} rows={3} placeholder="Add project context for the review team…" className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      {/* Main Grid: Report Preview & Document Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Report Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5EAE7] p-8 shadow-xs space-y-6">
            {/* Report Cover Header */}
            <div className="border-b-2 border-emerald-600 pb-5">
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">
                RoofShift AI • Preliminary Solar Planning Report
              </div>
              <h1 className="text-2xl font-black text-[#123C32] tracking-tight">
                Solar Investment & Energy Optimization Assessment
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span><strong>Organization:</strong> {activeProject?.organization_name}</span>
                <span><strong>Location:</strong> {activeProject?.city}</span>
                <span><strong>Sanctioned Budget:</strong> {formatINR(activeProject?.budget)}</span>
              </div>
            </div>

            {/* Document Sections Outline */}
            <div className="space-y-4 text-xs text-slate-700">
              <div>
                <h3 className="font-bold text-sm text-[#123C32] mb-1">1. Executive Summary & Investment KPIs</h3>
                <p className="text-slate-600 leading-relaxed">
                  Synthesizes the recommended solar capacity, capital expenditure allocation, 
                  annual electricity bill reduction, and payback duration across the campus.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-[#123C32] mb-1">2. Candidate Buildings Inventory & Roof Characteristics</h3>
                <p className="text-slate-600 leading-relaxed">
                  Surveys total roof area (m²), usable installation surface, visual shading derates, 
                  and baseline monthly utility consumption for all evaluated facilities.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-[#123C32] mb-1">3. Mathematical Multiple-Choice Knapsack Allocations</h3>
                <p className="text-slate-600 leading-relaxed">
                  Tabulates the exact capacity (kWp) assigned to each building, turnkey cost, expected yield, 
                  and the rigorous mathematical rationales for selected and deferred rooftops.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-[#123C32] mb-1">4. Optimized Plan vs Naive Baseline Benchmark</h3>
                <p className="text-slate-600 leading-relaxed">
                  Quantifies the economic lift gained by solving the portfolio knapsack problem 
                  over a conventional naive strategy (largest roof first).
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-[#123C32] mb-1">5. Diurnal Solar Surplus & Smart Load Shifting</h3>
                <p className="text-slate-600 leading-relaxed">
                  Details recommended operating windows for flexible equipment (EV charging, water pumping) 
                  to absorb midday solar generation and minimize discounted grid exports.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-[#123C32] mb-1">6. Assumptions, Data Sources & Engineering Limitations</h3>
                <p className="text-slate-600 leading-relaxed">
                  Discloses NASA POWER satellite irradiance provenance, system performance ratios (75% PR), 
                  and statutory DISCOM interconnection transformer guidelines.
                </p>
              </div>
            </div>

            {/* Regulatory Disclaimer Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
              <strong className="text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Preliminary Decision Support Notice
              </strong>
              <p className="leading-relaxed">
                This document is prepared as a preliminary techno-economic screening analysis. 
                It does not substitute for certified structural engineering assessments, detailed electrical 
                protection single-line diagrams, or statutory DISCOM approvals required prior to physical procurement.
              </p>
            </div>
          </div>
        </div>

        {/* Right Col: PDF Download Card & Generated Reports History */}
        <div className="space-y-5">
          {/* Active Download Card */}
          <div className="bg-white rounded-2xl border border-emerald-300 p-6 shadow-sm space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-base text-[#123C32]">{activeReport ? 'Ready for Download' : 'Your project reports'}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Saved investment proposals for the active project.
              </p>
            </div>

            {activeReport ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="text-slate-800 font-bold truncate">{activeReport.filename}</div>
                  <div className="text-slate-500 text-[10px]">
                    Size: {(activeReport.file_size_bytes / 1024).toFixed(1)} KB • PDF Document
                  </div>
                </div>

                <button
                  onClick={() => downloadReportFile(activeReport)}
                  className="w-full py-3 bg-[#123C32] hover:bg-[#0B251F] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4 text-[#F5B942]" />
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
          <div className="bg-white rounded-2xl border border-[#E5EAE7] p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
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
                  className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                    activeReport?.report_id === rep.report_id
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-slate-50/70 border-slate-200/60 hover:bg-slate-100'
                  }`}
                >
                  <div className="truncate mr-2">
                    <div className="font-semibold text-slate-800 truncate">{rep.filename}</div>
                    <div className="text-[10px] text-slate-400">
                      {(rep.file_size_bytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadReportFile(rep);
                    }}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg"
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
