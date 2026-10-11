import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Camera,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  TrendingDown,
  Layers
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import {
  DefectSummaryResponse,
  SolarMonitoringResponse,
  MaintenanceCaseResponse,
  Building
} from '../types/models';

export const OperationsPage: React.FC = () => {
  const { activeProject } = useProject();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [activeTab, setActiveTab] = useState<'inspections' | 'telemetry' | 'maintenance'>('inspections');

  // Inspection state
  const [defectSummary, setDefectSummary] = useState<DefectSummaryResponse | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [inspectionFile, setInspectionFile] = useState<File | null>(null);
  const [uploadingInspection, setUploadingInspection] = useState<boolean>(false);
  const [inspectionSuccess, setInspectionSuccess] = useState<string | null>(null);

  // Telemetry state
  const [monitoringLogs, setMonitoringLogs] = useState<SolarMonitoringResponse[]>([]);
  const [telemetryFile, setTelemetryFile] = useState<File | null>(null);
  const [uploadingTelemetry, setUploadingTelemetry] = useState<boolean>(false);
  const [telemetrySuccess, setTelemetrySuccess] = useState<string | null>(null);

  // Maintenance state
  const [maintenanceCases, setMaintenanceCases] = useState<MaintenanceCaseResponse[]>([]);
  const [showNewCaseModal, setShowNewCaseModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('PANEL_SOILING');
  const [newPriority, setNewPriority] = useState<string>('MEDIUM');
  const [newBuildingId, setNewBuildingId] = useState<string>('');
  const [newEstimatedLoss, setNewEstimatedLoss] = useState<number>(5.0);
  const [newAssignedTo, setNewAssignedTo] = useState<string>('Campus Technical Team');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeProject) {
      loadData();
    }
  }, [activeProject]);

  useEffect(() => {
    if (buildings.length > 0 && !selectedBuildingId) {
      setSelectedBuildingId(buildings[0].id);
      setNewBuildingId(buildings[0].id);
    }
  }, [buildings]);

  const loadData = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const [summary, logs, cases, bList] = await Promise.all([
        api.getProjectDefectSummary(activeProject.id).catch(() => null),
        api.getMonitoringLogs(activeProject.id).catch(() => []),
        api.getMaintenanceCases(activeProject.id).catch(() => []),
        api.getBuildings(activeProject.id).catch(() => [])
      ]);
      setDefectSummary(summary);
      setMonitoringLogs(logs);
      setMaintenanceCases(cases);
      setBuildings(bList);
      if (bList.length > 0 && !selectedBuildingId) {
        setSelectedBuildingId(bList[0].id);
        setNewBuildingId(bList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load operations data');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuildingId || !inspectionFile) return;
    setUploadingInspection(true);
    setError(null);
    setInspectionSuccess(null);
    try {
      await api.uploadPanelInspection(selectedBuildingId, inspectionFile);
      setInspectionSuccess('Demonstration inspection logged; findings are simulated.');
      setInspectionFile(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Inspection upload failed');
    } finally {
      setUploadingInspection(false);
    }
  };

  const handleUploadTelemetry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !telemetryFile) return;
    setUploadingTelemetry(true);
    setError(null);
    setTelemetrySuccess(null);
    try {
      await api.uploadMonitoringCsv(activeProject.id, telemetryFile);
      setTelemetrySuccess('Inverter telemetry successfully ingested and evaluated against design PR.');
      setTelemetryFile(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Telemetry upload failed');
    } finally {
      setUploadingTelemetry(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newTitle || !newDescription) return;
    try {
      await api.createMaintenanceCase(activeProject.id, {
        title: newTitle,
        description: newDescription,
        category: newCategory,
        priority: newPriority,
        building_id: newBuildingId || undefined,
        estimated_loss_kwh_per_day: newEstimatedLoss,
        assigned_to: newAssignedTo
      });
      setShowNewCaseModal(false);
      setNewTitle('');
      setNewDescription('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create maintenance case');
    }
  };

  const handleToggleResolve = async (caseId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'RESOLVED' ? 'OPEN' : 'RESOLVED';
      await api.updateMaintenanceCase(caseId, { status: nextStatus });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update case status');
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      await api.deleteMaintenanceCase(caseId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete case');
    }
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Please select or initialize an active campus project to inspect solar assets.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-orange-500/15 text-[#FF6B16] border border-orange-500/20">
              <Wrench className="w-4 h-4 text-[#FF6B16]" />
            </span>
            <h1 className="text-lg font-bold text-[#0B1739] tracking-tight">
              Operations &amp; Asset Care
            </h1>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-white/70 text-[#0B1739] border-white/80">
              Fleet Diagnostics
            </span>
          </div>
          <p className="text-xs text-[#61708A] mt-1.5 leading-relaxed">
            Simulated image inspection, legacy CSV screening and saved maintenance cases. Use Solar Assessments for diagnostics from explicit observed intervals.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="glass-button-secondary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold cursor-pointer shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Fleet State</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 text-rose-900 text-xs flex items-center gap-2.5 backdrop-blur-md shadow-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="glass-panel p-1.5 rounded-2xl flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('inspections')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'inspections'
              ? 'bg-[#FF6B16] text-white shadow-md shadow-orange-500/25'
              : 'text-[#61708A] hover:text-[#0B1739] hover:bg-white/40'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Panel Defect Inspection</span>
          {defectSummary && defectSummary.critical_alerts > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] bg-red-100 text-red-700 font-bold rounded-full">
              {defectSummary.critical_alerts} Alert
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'telemetry'
              ? 'bg-[#FF6B16] text-white shadow-md shadow-orange-500/25'
              : 'text-[#61708A] hover:text-[#0B1739] hover:bg-white/40'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Inverter Generation &amp; PR</span>
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'maintenance'
              ? 'bg-[#FF6B16] text-white shadow-md shadow-orange-500/25'
              : 'text-[#61708A] hover:text-[#0B1739] hover:bg-white/40'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Maintenance Cases</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-white/70 text-[#0B1739] font-bold rounded-full border border-white/80">
            {maintenanceCases.filter(c => c.status === 'OPEN').length} Open
          </span>
        </button>
      </div>

      {/* TAB 1: Panel Inspection */}
      {activeTab === 'inspections' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Total Modules Scanned</span>
              <div className="text-2xl font-bold text-[#0B1739] tabular-nums font-mono mt-1">
                {defectSummary?.total_inspections ?? 0}
              </div>
              <div className="text-[11px] text-[#61708A] mt-1 font-medium">Demonstration image records</div>
            </div>
            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Healthy Baseline Modules</span>
              <div className="text-2xl font-bold text-emerald-600 tabular-nums font-mono mt-1">
                {defectSummary?.healthy_panels ?? 0}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1 font-semibold">Simulated normal examples</div>
            </div>
            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Detected Anomaly Count</span>
              <div className="text-2xl font-bold text-amber-600 tabular-nums font-mono mt-1">
                {defectSummary?.defects_detected ?? 0}
              </div>
              <div className="text-[11px] text-amber-600 mt-1 font-semibold">Soiling, hotspotting, or cracking</div>
            </div>
            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Fleet Power Derate</span>
              <div className="text-2xl font-bold text-rose-600 tabular-nums font-mono mt-1">
                {defectSummary?.total_estimated_power_loss_pct ?? 0}%
              </div>
              <div className="text-[11px] text-[#61708A] mt-1 font-medium">Simulated loss estimate</div>
            </div>
          </div>

          {/* Upload Card */}
          <div className="glass-panel rounded-3xl p-6 shadow-xl">
            <div className="border-b border-white/40 pb-3 mb-4">
              <h2 className="text-sm font-bold text-[#0B1739]">Demonstration Image Inspection</h2>
              <p className="text-xs text-[#61708A] mt-1 leading-relaxed">
                Demonstration only: filename and raw byte patterns select example findings. Scores, temperature deltas and losses are synthetic. No image recognition or thermal measurement is implemented. Use Solar Assessments for diagnostics from supplied telemetry.
              </p>
            </div>

            <form onSubmit={handleUploadInspection} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1.5">Rooftop Asset</label>
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs text-[#0B1739] focus:outline-none cursor-pointer"
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1.5">Select Module Photo (JPG/PNG/TIFF)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setInspectionFile(e.target.files?.[0] || null)}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-[#61708A] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/80 file:text-[#0B1739] hover:file:bg-white"
                  />
                </div>
              </div>

              {inspectionSuccess && (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-2xs backdrop-blur-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{inspectionSuccess}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!inspectionFile || uploadingInspection}
                  className="glass-button-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-white/80" />
                  <span>{uploadingInspection ? 'Evaluating Module Imagery…' : 'Execute Module Diagnostic'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Past Inspections Table */}
          <div className="glass-panel rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/40 flex items-center justify-between">
              <h3 className="font-bold text-[#0B1739] text-xs uppercase tracking-wider">Inspected Module Inventory &amp; Diagnostics</h3>
              <span className="text-[11px] text-[#61708A] font-mono font-semibold">{defectSummary?.inspections.length || 0} Records</span>
            </div>
            {defectSummary && defectSummary.inspections.length > 0 ? (
              <div className="divide-y divide-white/40">
                {defectSummary.inspections.map((insp) => (
                  <div key={insp.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/40 transition-colors">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          insp.defect_type === 'NORMAL'
                            ? 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30'
                            : insp.severity === 'HIGH'
                            ? 'bg-rose-500/15 text-rose-800 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-800 border-amber-500/30'
                        }`}>
                          {insp.defect_type}
                        </span>
                        <span className="text-xs text-[#61708A] font-mono">Demo score: {(insp.confidence_score * 100).toFixed(0)}%</span>
                        {insp.temperature_delta_c !== undefined && insp.temperature_delta_c > 1.0 && (
                          <span className="text-[11px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-lg">
                            ΔT: +{insp.temperature_delta_c.toFixed(1)}°C
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-[#0B1739]">{insp.filename}</div>
                      <div className="text-xs text-[#61708A] leading-relaxed">{insp.recommended_action}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-mono font-bold ${insp.estimated_power_loss_pct > 0 ? 'text-rose-600' : 'text-[#0B1739]'}`}>
                        {insp.estimated_power_loss_pct > 0 ? `-${insp.estimated_power_loss_pct.toFixed(1)}% Yield` : '0.0% Loss'}
                      </div>
                      <div className="text-[10px] text-[#61708A] font-mono mt-0.5">
                        {new Date(insp.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-[#61708A] text-xs">
                No solar panel inspection records found. Upload an image above to run diagnostics.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Inverter Telemetry */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          {/* Upload Inverter CSV */}
          <div className="glass-panel rounded-3xl p-6 shadow-xl">
            <div className="border-b border-white/40 pb-3 mb-4">
              <h2 className="text-sm font-bold text-[#0B1739]">Upload Inverter Generation Telemetry (CSV)</h2>
              <p className="text-xs text-[#61708A] mt-1 leading-relaxed">
                Legacy CSV screening assumes hourly energy records, a minimum one-day window and a fixed irradiation value. Degradation is an assumed 0.75%/year, not a measurement. For explicit interval durations and coverage, use Performance Monitoring in Solar Assessments.
              </p>
            </div>

            <form onSubmit={handleUploadTelemetry} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0B1739] mb-1.5">Select Telemetry CSV (timestamp, generation_kwh)</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setTelemetryFile(e.target.files?.[0] || null)}
                  className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-[#61708A] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/80 file:text-[#0B1739] hover:file:bg-white"
                />
              </div>

              {telemetrySuccess && (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-2xs backdrop-blur-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{telemetrySuccess}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!telemetryFile || uploadingTelemetry}
                  className="glass-button-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-white/80" />
                  <span>{uploadingTelemetry ? 'Evaluating Inverter Logs…' : 'Ingest & Compare Yield'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Telemetry Logs */}
          <div className="glass-panel rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/40 flex items-center justify-between">
              <h3 className="font-bold text-[#0B1739] text-xs uppercase tracking-wider">Telemetry History &amp; Performance Ratio Audits</h3>
              <span className="text-[11px] text-[#61708A] font-mono font-semibold">{monitoringLogs.length} Files</span>
            </div>
            {monitoringLogs.length > 0 ? (
              <div className="divide-y divide-white/40">
                {monitoringLogs.map((log) => (
                  <div key={log.id} className="p-5 space-y-3.5 hover:bg-white/40 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          log.underperformance_flag
                            ? 'bg-rose-500/15 text-rose-800 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30'
                        }`}>
                          {log.underperformance_flag ? 'Underperforming' : 'Optimal Conversion'}
                        </span>
                        <span className="font-bold text-xs text-[#0B1739]">{log.filename}</span>
                        <span className="text-[11px] text-[#61708A] font-mono font-medium">({log.record_count} intervals)</span>
                      </div>
                      <div className="text-[11px] text-[#61708A] font-mono">
                        Ingested: {new Date(log.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 glass-surface-secondary p-3.5 rounded-2xl border border-white/60 text-xs font-mono">
                      <div>
                        <span className="text-[#61708A] text-[10px] uppercase block font-sans font-bold">Measured Output</span>
                        <span className="font-bold text-[#0B1739]">{log.total_measured_generation_kwh.toLocaleString()} kWh</span>
                      </div>
                      <div>
                        <span className="text-[#61708A] text-[10px] uppercase block font-sans font-bold">Expected Yield</span>
                        <span className="font-bold text-[#0B1739]">{log.expected_generation_kwh.toLocaleString()} kWh</span>
                      </div>
                      <div>
                        <span className="text-[#61708A] text-[10px] uppercase block font-sans font-bold">Empirical PR</span>
                        <span className={`font-bold ${log.performance_ratio_actual < 0.68 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {(log.performance_ratio_actual * 100).toFixed(1)}% <span className="text-[#61708A] text-[10px] font-sans font-normal">(Design: 75.0%)</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[#61708A] text-[10px] uppercase block font-sans font-bold">Annual Degradation</span>
                        <span className="font-bold text-[#0B1739]">{log.degradation_annual_pct.toFixed(2)}%/yr</span>
                      </div>
                    </div>

                    {log.diagnostic_summary && (
                      <div className="text-xs text-[#61708A] leading-relaxed">
                        {log.diagnostic_summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-[#61708A] text-xs">
                No inverter telemetry logs found. Upload a CSV file above to verify performance ratio.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Maintenance Cases */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0B1739]">Preventive &amp; Corrective Maintenance Tickets</h3>
              <p className="text-xs text-[#61708A] mt-0.5">Track and dispatch repairs to protect campus solar revenue</p>
            </div>
            <button
              onClick={() => setShowNewCaseModal(true)}
              className="glass-button-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-white/80" />
              <span>Create Maintenance Ticket</span>
            </button>
          </div>

          {/* Cases List */}
          <div className="glass-panel rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/40 flex items-center justify-between">
              <h3 className="font-bold text-[#0B1739] text-xs uppercase tracking-wider">Campus Solar Maintenance Case Log</h3>
              <span className="text-[11px] text-[#61708A] font-mono font-semibold">{maintenanceCases.length} Cases</span>
            </div>
            {maintenanceCases.length > 0 ? (
              <div className="divide-y divide-white/40">
                {maintenanceCases.map((c) => (
                  <div key={c.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/40 transition-colors">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          c.status === 'RESOLVED'
                            ? 'bg-slate-200/60 text-slate-700 border-slate-300'
                            : 'bg-amber-500/15 text-amber-800 border-amber-500/30'
                        }`}>
                          {c.status}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          c.priority === 'CRITICAL' || c.priority === 'HIGH'
                            ? 'bg-rose-500/15 text-rose-800 border-rose-500/30'
                            : 'bg-blue-500/15 text-blue-800 border-blue-500/30'
                        }`}>
                          {c.priority} Priority
                        </span>
                        <span className="text-[11px] text-[#61708A] font-mono font-medium">Category: {c.category}</span>
                      </div>
                      <div className="text-xs font-bold text-[#0B1739]">{c.title}</div>
                      <div className="text-xs text-[#61708A] leading-relaxed">{c.description}</div>
                      <div className="flex items-center gap-4 text-[11px] text-[#61708A] pt-1 flex-wrap">
                        <span>Assigned: <strong className="text-[#0B1739]">{c.assigned_to || 'Unassigned'}</strong></span>
                        <span>Estimated Impact: <strong className="text-[#0B1739] font-mono font-bold">~{c.estimated_loss_kwh_per_day} kWh/day</strong></span>
                        <span className="font-mono">Created: {new Date(c.created_at).toLocaleDateString()}</span>
                        {c.resolved_at && (
                          <span className="text-emerald-700 font-mono font-bold">Resolved: {new Date(c.resolved_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleResolve(c.id, c.status)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          c.status === 'RESOLVED'
                            ? 'glass-button-secondary'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                        }`}
                      >
                        {c.status === 'RESOLVED' ? 'Reopen Case' : 'Mark Resolved'}
                      </button>
                      <button
                        onClick={() => handleDeleteCase(c.id)}
                        className="p-2 text-[#61708A] hover:text-rose-600 transition-colors rounded-xl hover:bg-rose-50/60 cursor-pointer"
                        title="Delete Ticket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-[#61708A] text-xs">
                No maintenance tickets active. Clean arrays and healthy inverters!
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Case Modal */}
      {showNewCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1739]/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="glass-elevated max-w-lg w-full p-6 border border-white/80 rounded-3xl shadow-2xl space-y-4">
            <div className="border-b border-white/40 pb-3">
              <h3 className="text-sm font-bold text-[#0B1739]">Create Solar Maintenance Case</h3>
              <p className="text-xs text-[#61708A] mt-0.5">Register a dispatchable ticket for campus facility technicians</p>
            </div>
            <form onSubmit={handleCreateCase} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#0B1739] mb-1">Issue Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Heavy particulate soiling on Library roof"
                  className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-[#0B1739] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0B1739] mb-1">Description &amp; Findings *</label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detailed inspection observations, inverter trip code, or drone thermal defect notes..."
                  className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-[#0B1739] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0B1739] mb-1">Rooftop Asset</label>
                <select
                  value={newBuildingId}
                  onChange={(e) => setNewBuildingId(e.target.value)}
                  className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-[#0B1739] focus:outline-none cursor-pointer"
                >
                  <option value="">General Campus Array</option>
                  {buildings.map((b: Building) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-[#0B1739] focus:outline-none cursor-pointer"
                  >
                    <option value="PANEL_SOILING">Panel Soiling</option>
                    <option value="INVERTER_FAULT">Inverter Fault</option>
                    <option value="HOTSPOT">Cell Hotspot</option>
                    <option value="CABLE_DAMAGE">Cable / DC Disconnect</option>
                    <option value="VEGETATION_SHADING">Vegetation Shading</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-[#0B1739] focus:outline-none cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1">Daily Loss (kWh/day)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newEstimatedLoss}
                    onChange={(e) => setNewEstimatedLoss(parseFloat(e.target.value) || 0)}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-xs font-mono text-[#0B1739] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1">Assigned Crew</label>
                  <input
                    type="text"
                    value={newAssignedTo}
                    onChange={(e) => setNewAssignedTo(e.target.value)}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-[#0B1739] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/40">
                <button
                  type="button"
                  onClick={() => setShowNewCaseModal(false)}
                  className="glass-button-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-button-primary px-4 py-2 text-xs font-bold shadow-md cursor-pointer"
                >
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
