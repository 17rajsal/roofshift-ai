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
      setInspectionSuccess('Module inspection image successfully evaluated and logged.');
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
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              <span>Operations & Asset Care</span>
            </h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
              Fleet Diagnostics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic thermal panel anomaly diagnostics, recorded inverter telemetry verification, and preventive maintenance workflows.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Fleet State</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200/80 text-red-800 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab('inspections')}
          className={`pb-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'inspections'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Panel Defect Inspection</span>
          {defectSummary && defectSummary.critical_alerts > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] bg-red-100 text-red-700 font-bold rounded">
              {defectSummary.critical_alerts} Alert
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`pb-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'telemetry'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Inverter Generation & PR</span>
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`pb-3 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'maintenance'
              ? 'border-slate-900 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Maintenance Cases</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-slate-100 text-slate-700 font-medium rounded border border-slate-200">
            {maintenanceCases.filter(c => c.status === 'OPEN').length} Open
          </span>
        </button>
      </div>

      {/* TAB 1: Panel Inspection */}
      {activeTab === 'inspections' && (
        <div className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Total Modules Scanned</span>
              <div className="text-2xl font-semibold text-slate-900 tabular-nums font-mono mt-1">
                {defectSummary?.total_inspections ?? 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Visual & thermal sensor passes</div>
            </div>
            <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Healthy Baseline Modules</span>
              <div className="text-2xl font-semibold text-emerald-700 tabular-nums font-mono mt-1">
                {defectSummary?.healthy_panels ?? 0}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1 font-medium">Operating within STC tolerances</div>
            </div>
            <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Detected Anomaly Count</span>
              <div className="text-2xl font-semibold text-amber-700 tabular-nums font-mono mt-1">
                {defectSummary?.defects_detected ?? 0}
              </div>
              <div className="text-[11px] text-amber-700 mt-1 font-medium">Soiling, hotspotting, or cracking</div>
            </div>
            <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">Fleet Power Derate</span>
              <div className="text-2xl font-semibold text-red-600 tabular-nums font-mono mt-1">
                {defectSummary?.total_estimated_power_loss_pct ?? 0}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Array generation efficiency loss</div>
            </div>
          </div>

          {/* Upload Card */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Upload Solar Module Image for Defect Analysis</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingest optical or thermal infrared drone imagery. The gradient classifier identifies hot cells, particulate soiling, and micro-cracks.
              </p>
            </div>

            <form onSubmit={handleUploadInspection} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Rooftop Asset</label>
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Select Module Photo (JPG/PNG/TIFF)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setInspectionFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
                  />
                </div>
              </div>

              {inspectionSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-medium text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{inspectionSuccess}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!inspectionFile || uploadingInspection}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium shadow-2xs transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span>{uploadingInspection ? 'Evaluating Module Imagery...' : 'Execute Module Diagnostic'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Past Inspections Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Inspected Module Inventory & Diagnostics</h3>
              <span className="text-[11px] text-slate-500 font-mono">{defectSummary?.inspections.length || 0} Records</span>
            </div>
            {defectSummary && defectSummary.inspections.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {defectSummary.inspections.map((insp) => (
                  <div key={insp.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                          insp.defect_type === 'NORMAL'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : insp.severity === 'HIGH'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {insp.defect_type}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">Confidence: {(insp.confidence_score * 100).toFixed(0)}%</span>
                        {insp.temperature_delta_c !== undefined && insp.temperature_delta_c > 1.0 && (
                          <span className="text-[11px] font-mono font-medium text-red-700 bg-red-50 border border-red-200/60 px-1.5 py-0.5 rounded">
                            ΔT: +{insp.temperature_delta_c.toFixed(1)}°C
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-900">{insp.filename}</div>
                      <div className="text-xs text-slate-500">{insp.recommended_action}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-mono font-semibold ${insp.estimated_power_loss_pct > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {insp.estimated_power_loss_pct > 0 ? `-${insp.estimated_power_loss_pct.toFixed(1)}% Yield` : '0.0% Loss'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {new Date(insp.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No solar panel inspection records found. Upload an image above to run diagnostics.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Inverter Telemetry */}
      {activeTab === 'telemetry' && (
        <div className="space-y-5">
          {/* Upload Inverter CSV */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Upload Inverter Generation Telemetry (CSV)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload measured generation logs from campus inverters. Evaluates recorded energy against NASA POWER solar irradiance modeling to compute empirical Performance Ratio (PR) and annual degradation.
              </p>
            </div>

            <form onSubmit={handleUploadTelemetry} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Select Telemetry CSV (timestamp, generation_kwh)</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setTelemetryFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
                />
              </div>

              {telemetrySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-medium text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{telemetrySuccess}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!telemetryFile || uploadingTelemetry}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium shadow-2xs transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span>{uploadingTelemetry ? 'Evaluating Inverter Logs...' : 'Ingest & Compare Yield'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Telemetry Logs */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Telemetry History & Performance Ratio Audits</h3>
              <span className="text-[11px] text-slate-500 font-mono">{monitoringLogs.length} Files</span>
            </div>
            {monitoringLogs.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {monitoringLogs.map((log) => (
                  <div key={log.id} className="p-4 space-y-3 hover:bg-slate-50/70 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                          log.underperformance_flag
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {log.underperformance_flag ? 'Underperforming' : 'Optimal Conversion'}
                        </span>
                        <span className="font-semibold text-xs text-slate-900">{log.filename}</span>
                        <span className="text-[11px] text-slate-500 font-mono">({log.record_count} intervals)</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Ingested: {new Date(log.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-150 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block font-sans">Measured Output</span>
                        <span className="font-semibold text-slate-900">{log.total_measured_generation_kwh.toLocaleString()} kWh</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block font-sans">Expected Yield</span>
                        <span className="font-semibold text-slate-900">{log.expected_generation_kwh.toLocaleString()} kWh</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block font-sans">Empirical PR</span>
                        <span className={`font-semibold ${log.performance_ratio_actual < 0.68 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {(log.performance_ratio_actual * 100).toFixed(1)}% <span className="text-slate-400 text-[10px] font-sans font-normal">(Design: 75.0%)</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block font-sans">Annual Degradation</span>
                        <span className="font-semibold text-slate-900">{log.degradation_annual_pct.toFixed(2)}%/yr</span>
                      </div>
                    </div>

                    {log.diagnostic_summary && (
                      <div className="text-xs text-slate-600">
                        {log.diagnostic_summary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No inverter telemetry logs found. Upload a CSV file above to verify performance ratio.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Maintenance Cases */}
      {activeTab === 'maintenance' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Preventive & Corrective Maintenance Tickets</h3>
              <p className="text-xs text-slate-500">Track and dispatch repairs to protect campus solar revenue</p>
            </div>
            <button
              onClick={() => setShowNewCaseModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-slate-400" />
              <span>Create Maintenance Ticket</span>
            </button>
          </div>

          {/* Cases List */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Campus Solar Maintenance Case Log</h3>
              <span className="text-[11px] text-slate-500 font-mono">{maintenanceCases.length} Cases</span>
            </div>
            {maintenanceCases.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {maintenanceCases.map((c) => (
                  <div key={c.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                          c.status === 'RESOLVED'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {c.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                          c.priority === 'CRITICAL' || c.priority === 'HIGH'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {c.priority} Priority
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">Category: {c.category}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900">{c.title}</div>
                      <div className="text-xs text-slate-600 leading-relaxed">{c.description}</div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span>Assigned: <strong className="text-slate-800">{c.assigned_to || 'Unassigned'}</strong></span>
                        <span>Estimated Impact: <strong className="text-slate-900 font-mono">~{c.estimated_loss_kwh_per_day} kWh/day</strong></span>
                        <span className="font-mono">Created: {new Date(c.created_at).toLocaleDateString()}</span>
                        {c.resolved_at && (
                          <span className="text-emerald-700 font-mono font-medium">Resolved: {new Date(c.resolved_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleResolve(c.id, c.status)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          c.status === 'RESOLVED'
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                        }`}
                      >
                        {c.status === 'RESOLVED' ? 'Reopen Case' : 'Mark Resolved'}
                      </button>
                      <button
                        onClick={() => handleDeleteCase(c.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded hover:bg-red-50"
                        title="Delete Ticket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No maintenance tickets active. Clean arrays and healthy inverters!
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Case Modal */}
      {showNewCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Create Solar Maintenance Case</h3>
              <p className="text-xs text-slate-500 mt-0.5">Register a dispatchable ticket for campus facility technicians</p>
            </div>
            <form onSubmit={handleCreateCase} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Issue Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Heavy particulate soiling on Library roof"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description & Findings *</label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detailed inspection observations, inverter trip code, or drone thermal defect notes..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rooftop Asset</label>
                <select
                  value={newBuildingId}
                  onChange={(e) => setNewBuildingId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="PANEL_SOILING">Panel Soiling</option>
                    <option value="INVERTER_FAULT">Inverter Fault</option>
                    <option value="HOTSPOT">Cell Hotspot</option>
                    <option value="CABLE_DAMAGE">Cable / DC Disconnect</option>
                    <option value="VEGETATION_SHADING">Vegetation Shading</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">Daily Loss (kWh/day)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newEstimatedLoss}
                    onChange={(e) => setNewEstimatedLoss(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs font-mono focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Crew</label>
                  <input
                    type="text"
                    value={newAssignedTo}
                    onChange={(e) => setNewAssignedTo(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewCaseModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md shadow-2xs transition-colors"
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
