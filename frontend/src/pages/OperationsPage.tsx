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
      <div className="p-8 text-center text-slate-500">
        Please select or create a project to inspect campus solar assets.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Operations & Asset Care</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Fleet Diagnostics
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Thermal panel anomaly inspection, recorded inverter generation monitoring, and maintenance ticketing.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-8">
        <button
          onClick={() => setActiveTab('inspections')}
          className={`pb-4 px-1 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'inspections'
              ? 'border-emerald-600 text-emerald-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Camera className="w-4 h-4" />
          Panel Defect Inspection
          {defectSummary && defectSummary.critical_alerts > 0 && (
            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 font-bold rounded-full">
              {defectSummary.critical_alerts} Alert
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`pb-4 px-1 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'telemetry'
              ? 'border-emerald-600 text-emerald-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          Inverter Generation & PR
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`pb-4 px-1 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'maintenance'
              ? 'border-emerald-600 text-emerald-700 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Maintenance Cases ({maintenanceCases.filter(c => c.status === 'OPEN').length} Open)
        </button>
      </div>

      {/* TAB 1: Panel Inspection */}
      {activeTab === 'inspections' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Modules Scanned</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{defectSummary?.total_inspections ?? 0}</div>
              <div className="mt-1 text-xs text-slate-500">Visual & thermal inspections</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Healthy Baseline Modules</div>
              <div className="mt-2 text-2xl font-bold text-emerald-600">{defectSummary?.healthy_panels ?? 0}</div>
              <div className="mt-1 text-xs text-emerald-700">Operating within STC tolerances</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Detected Anomaly Count</div>
              <div className="mt-2 text-2xl font-bold text-amber-600">{defectSummary?.defects_detected ?? 0}</div>
              <div className="mt-1 text-xs text-amber-700">Soiling, hotspotting, or cracking</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Estimated Power Loss</div>
              <div className="mt-2 text-2xl font-bold text-red-600">{defectSummary?.total_estimated_power_loss_pct ?? 0}%</div>
              <div className="mt-1 text-xs text-red-700">Fleet-averaged array generation derate</div>
            </div>
          </div>

          {/* Upload Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Upload Solar Module Image for Defect Analysis</h2>
            <p className="text-sm text-slate-600 mb-4">
              Ingest optical or thermal infrared drone images. The deterministic gradient classifier identifies cell hotspots, soiling, and micro-cracks.
            </p>

            <form onSubmit={handleUploadInspection} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Rooftop Building</label>
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
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
                    className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </div>
              </div>

              {inspectionSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800">
                  {inspectionSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={!inspectionFile || uploadingInspection}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#123C32] hover:bg-[#0B251F] text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploadingInspection ? 'Analyzing Module Imagery...' : 'Execute Module Diagnostic'}
              </button>
            </form>
          </div>

          {/* Past Inspections Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 text-sm">Inspected Module Inventory & Diagnostics</h3>
            </div>
            {defectSummary && defectSummary.inspections.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {defectSummary.inspections.map((insp) => (
                  <div key={insp.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          insp.defect_type === 'NORMAL'
                            ? 'bg-emerald-100 text-emerald-800'
                            : insp.severity === 'HIGH'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {insp.defect_type}
                        </span>
                        <span className="text-xs text-slate-500">Confidence: {(insp.confidence_score * 100).toFixed(0)}%</span>
                        {insp.temperature_delta_c !== undefined && insp.temperature_delta_c > 1.0 && (
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
                            ΔT: +{insp.temperature_delta_c.toFixed(1)}°C
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{insp.filename}</div>
                      <div className="text-xs text-slate-600">{insp.recommended_action}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {insp.estimated_power_loss_pct > 0 ? `-${insp.estimated_power_loss_pct.toFixed(1)}% Yield` : '0% Loss'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(insp.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Upload Inverter Generation Telemetry (CSV)</h2>
            <p className="text-sm text-slate-600 mb-4">
              Upload actual measured generation logs from campus inverters. Compares recorded output with NASA POWER solar modeling to derive empirical Performance Ratio (PR) and degradation.
            </p>

            <form onSubmit={handleUploadTelemetry} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Select Telemetry CSV (timestamp, generation_kwh)</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setTelemetryFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>

              {telemetrySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800">
                  {telemetrySuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={!telemetryFile || uploadingTelemetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#123C32] hover:bg-[#0B251F] text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploadingTelemetry ? 'Evaluating Inverter Logs...' : 'Ingest & Compare Yield'}
              </button>
            </form>
          </div>

          {/* Telemetry Logs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-900 text-sm">Telemetry History & Performance Ratio Audits</h3>
            </div>
            {monitoringLogs.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {monitoringLogs.map((log) => (
                  <div key={log.id} className="p-5 space-y-3 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          log.underperformance_flag
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.underperformance_flag ? 'Underperforming' : 'Optimal Conversion'}
                        </span>
                        <span className="font-semibold text-sm text-slate-900">{log.filename}</span>
                        <span className="text-xs text-slate-500">({log.record_count} intervals)</span>
                      </div>
                      <div className="text-xs font-medium text-slate-500">
                        Ingested: {new Date(log.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg text-xs">
                      <div>
                        <span className="text-slate-500 block">Measured Output:</span>
                        <span className="font-bold text-slate-900">{log.total_measured_generation_kwh.toLocaleString()} kWh</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Expected Model Yield:</span>
                        <span className="font-bold text-slate-900">{log.expected_generation_kwh.toLocaleString()} kWh</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Empirical PR:</span>
                        <span className={`font-bold ${log.performance_ratio_actual < 0.68 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {(log.performance_ratio_actual * 100).toFixed(1)}% (Design: 75.0%)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Annual Degradation:</span>
                        <span className="font-bold text-slate-900">{log.degradation_annual_pct.toFixed(2)}%/yr</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 italic">
                      {log.diagnostic_summary}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
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
            <div className="text-sm text-slate-600">
              Track and resolve operational tickets to protect campus solar revenue.
            </div>
            <button
              onClick={() => setShowNewCaseModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#123C32] hover:bg-[#0B251F] text-white rounded-lg text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Maintenance Ticket
            </button>
          </div>

          {/* Cases List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-sm">Campus Solar Maintenance Case Log</h3>
              <span className="text-xs text-slate-500 font-medium">{maintenanceCases.length} Total Cases</span>
            </div>
            {maintenanceCases.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {maintenanceCases.map((c) => (
                  <div key={c.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          c.status === 'RESOLVED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          c.priority === 'CRITICAL' || c.priority === 'HIGH'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {c.priority} Priority
                        </span>
                        <span className="text-xs text-slate-400">Category: {c.category}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{c.title}</div>
                      <div className="text-xs text-slate-600">{c.description}</div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span>Assigned: <b>{c.assigned_to || 'Unassigned'}</b></span>
                        <span>Estimated Impact: <b>~{c.estimated_loss_kwh_per_day} kWh/day loss</b></span>
                        <span>Created: {new Date(c.created_at).toLocaleDateString()}</span>
                        {c.resolved_at && (
                          <span className="text-emerald-700 font-medium">Resolved: {new Date(c.resolved_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleResolve(c.id, c.status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          c.status === 'RESOLVED'
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {c.status === 'RESOLVED' ? 'Reopen Case' : 'Mark Resolved'}
                      </button>
                      <button
                        onClick={() => handleDeleteCase(c.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                        title="Delete Ticket"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
                No maintenance tickets active. Clean arrays and healthy inverters!
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Case Modal */}
      {showNewCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create Solar Maintenance Case</h3>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Heavy particulate soiling on Library roof"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description & Findings</label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detailed inspection observations, inverter trip code, or drone thermal defect notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rooftop Building</label>
                <select
                  value={newBuildingId}
                  onChange={(e) => setNewBuildingId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Crew</label>
                  <input
                    type="text"
                    value={newAssignedTo}
                    onChange={(e) => setNewAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewCaseModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#123C32] hover:bg-[#0B251F] text-white text-sm font-medium rounded-lg shadow-sm"
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
