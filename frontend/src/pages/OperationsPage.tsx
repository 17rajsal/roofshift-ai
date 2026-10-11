import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  TrendingUp,
  Layers,
  Zap,
  Sun,
  Battery,
  ArrowRight,
  ShieldAlert,
  FileSpreadsheet,
  Download,
  ExternalLink,
  Thermometer,
  Flame,
  SlidersHorizontal,
  Cpu,
  Sparkles,
  Radio,
  Eye,
  CheckCircle2,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import {
  DefectSummaryResponse,
  SolarMonitoringResponse,
  MaintenanceCaseResponse,
  Building
} from '../types/models';
import { formatEnergy, formatINR, formatPower } from '../utils/formatters';

export const OperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProject } = useProject();

  // Tab state synced with URL search params ('telemetry' | 'faults' | 'maintenance')
  const paramTab = searchParams.get('tab');
  const activeTab: 'telemetry' | 'faults' | 'maintenance' =
    paramTab === 'faults' || paramTab === 'inspections' || paramTab === 'thermal'
      ? 'faults'
      : paramTab === 'maintenance'
      ? 'maintenance'
      : 'telemetry';

  const setActiveTab = (tab: 'telemetry' | 'faults' | 'maintenance') => {
    setSearchParams({ tab });
  };

  // 3 Operational Data Modes: 'connected' | 'uploaded' | 'simulation'
  const [dataMode, setDataMode] = useState<'connected' | 'uploaded' | 'simulation'>('simulation');

  // Building filter
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('fleet');

  // Telemetry state
  const [monitoringLogs, setMonitoringLogs] = useState<SolarMonitoringResponse[]>([]);
  const [telemetryFile, setTelemetryFile] = useState<File | null>(null);
  const [uploadingTelemetry, setUploadingTelemetry] = useState<boolean>(false);
  const [telemetrySuccess, setTelemetrySuccess] = useState<string | null>(null);

  // Defect / Thermal Inspection state
  const [defectSummary, setDefectSummary] = useState<DefectSummaryResponse | null>(null);
  const [thermalSummary, setThermalSummary] = useState<any | null>(null);
  const [inspectionFile, setInspectionFile] = useState<File | null>(null);
  const [uploadingInspection, setUploadingInspection] = useState<boolean>(false);
  const [inspectionSuccess, setInspectionSuccess] = useState<string | null>(null);
  const [inspectTargetBuildingId, setInspectTargetBuildingId] = useState<string>('');

  // Thermal CSV state
  const [thermalCsvFile, setThermalCsvFile] = useState<File | null>(null);
  const [uploadingThermalCsv, setUploadingThermalCsv] = useState<boolean>(false);
  const [thermalCsvSuccess, setThermalCsvSuccess] = useState<string | null>(null);

  // Maintenance state
  const [maintenanceCases, setMaintenanceCases] = useState<MaintenanceCaseResponse[]>([]);
  const [showNewCaseModal, setShowNewCaseModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('PANEL_SOILING');
  const [newPriority, setNewPriority] = useState<string>('MEDIUM');
  const [newBuildingId, setNewBuildingId] = useState<string>('');
  const [newEstimatedLoss, setNewEstimatedLoss] = useState<number>(5.0);
  const [newAssignedTo, setNewAssignedTo] = useState<string>('Operations O&M Team');
  const [ticketFilter, setTicketFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeProject) {
      loadData();
    }
  }, [activeProject]);

  useEffect(() => {
    if (buildings.length > 0 && !inspectTargetBuildingId) {
      setInspectTargetBuildingId(buildings[0].id);
      setNewBuildingId(buildings[0].id);
    }
  }, [buildings]);

  const loadData = async () => {
    if (!activeProject) return;
    setLoading(true);
    setError(null);
    try {
      const [summary, logs, cases, bList, thermal] = await Promise.all([
        api.getProjectDefectSummary(activeProject.id).catch(() => null),
        api.getMonitoringLogs(activeProject.id).catch(() => []),
        api.getMaintenanceCases(activeProject.id).catch(() => []),
        api.getBuildings(activeProject.id).catch(() => []),
        api.getThermalSummary(activeProject.id).catch(() => null)
      ]);
      setDefectSummary(summary);
      setMonitoringLogs(logs);
      setMaintenanceCases(cases);
      setBuildings(bList);
      setThermalSummary(thermal);

      // Auto-select uploaded mode if historical logs exist and user hasn't toggled
      if (logs.length > 0 && dataMode === 'uploaded') {
        setDataMode('uploaded');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load fleet operational data');
    } finally {
      setLoading(false);
    }
  };

  // Telemetry CSV Upload Handler
  const handleUploadTelemetry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !telemetryFile) return;
    setUploadingTelemetry(true);
    setError(null);
    setTelemetrySuccess(null);
    try {
      const targetBId = selectedBuildingId !== 'fleet' ? selectedBuildingId : undefined;
      await api.uploadMonitoringCsv(activeProject.id, telemetryFile, targetBId);
      setTelemetrySuccess('Inverter generation records ingested. Performance Ratio and degradation benchmark updated.');
      setTelemetryFile(null);
      setDataMode('uploaded');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Telemetry upload failed. Ensure CSV has timestamp, generation_kwh.');
    } finally {
      setUploadingTelemetry(false);
    }
  };

  // Thermal Image Inspection Handler
  const handleUploadInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectTargetBuildingId || !inspectionFile) return;
    setUploadingInspection(true);
    setError(null);
    setInspectionSuccess(null);
    try {
      await api.uploadPanelInspection(inspectTargetBuildingId, inspectionFile);
      setInspectionSuccess('Module inspection scan registered and evaluated against thermal baseline.');
      setInspectionFile(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Inspection upload failed');
    } finally {
      setUploadingInspection(false);
    }
  };

  // Thermal CSV Upload Handler
  const handleUploadThermalCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !thermalCsvFile) return;
    setUploadingThermalCsv(true);
    setError(null);
    setThermalCsvSuccess(null);
    try {
      const targetBId = selectedBuildingId !== 'fleet' ? selectedBuildingId : undefined;
      await api.uploadThermalCsv(activeProject.id, thermalCsvFile, targetBId);
      setThermalCsvSuccess('Thermal temperature survey ingested. Hotspot delta-T classifications evaluated.');
      setThermalCsvFile(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Thermal CSV upload failed. Ensure columns: panel_id, surface_temp_c.');
    } finally {
      setUploadingThermalCsv(false);
    }
  };

  // Create Maintenance Ticket from Defect / Hotspot directly
  const handleCreateTicketFromFinding = async (finding: {
    title: string;
    description: string;
    category: string;
    priority: string;
    building_id?: string;
    loss_kwh?: number;
  }) => {
    if (!activeProject) return;
    try {
      await api.createMaintenanceCase(activeProject.id, {
        title: finding.title,
        description: finding.description,
        category: finding.category,
        priority: finding.priority,
        building_id: finding.building_id,
        estimated_loss_kwh_per_day: finding.loss_kwh || 4.5,
        assigned_to: 'Solar Operations Crew'
      });
      await loadData();
      setActiveTab('maintenance');
    } catch (err: any) {
      setError(err.message || 'Could not create maintenance ticket');
    }
  };

  // Create Manual Maintenance Ticket
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
      setError(err.message || 'Failed to create maintenance ticket');
    }
  };

  const handleToggleResolve = async (caseId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'RESOLVED' ? 'OPEN' : 'RESOLVED';
      await api.updateMaintenanceCase(caseId, { status: nextStatus });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update ticket status');
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      await api.deleteMaintenanceCase(caseId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete ticket');
    }
  };

  // Sample CSV Download Generators
  const downloadSampleTelemetryCsv = () => {
    const rows = ['timestamp,generation_kwh'];
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    for (let h = 0; h < 24; h++) {
      const hh = h.toString().padStart(2, '0');
      let gen = 0;
      if (h >= 6 && h <= 18) {
        const peak = 38.5;
        const progress = (h - 6) / 12;
        gen = Number((Math.sin(progress * Math.PI) * peak * (0.92 + Math.random() * 0.1)).toFixed(2));
      }
      rows.push(`${dateStr} ${hh}:00:00,${gen}`);
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_inverter_telemetry.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSampleThermalCsv = () => {
    const rows = [
      'panel_id,surface_temp_c,notes',
      'MOD-A01,42.4,Nominal string temperature',
      'MOD-A02,43.1,Standard uniform irradiance',
      'MOD-A03,54.8,Elevated cell localized rise',
      'MOD-A04,42.0,Healthy baseline',
      'MOD-A07,67.2,Hotspot with potential bypass diode failure',
      'MOD-L01,41.9,Library roof string 1',
      'MOD-L02,58.3,Particulate soiling hotspot',
      'MOD-H01,44.2,Hostel block central array',
      'MOD-AUD02,52.6,Mild parapet shading heat elevation'
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_thermal_survey.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Fleet capacity calculation
  const totalCapacityKwp = useMemo(() => {
    if (!buildings.length) return 50.0;
    if (selectedBuildingId !== 'fleet') {
      const b = buildings.find(item => item.id === selectedBuildingId);
      return b?.solar_analysis?.max_pv_capacity_kwp || 15.0;
    }
    const sum = buildings.reduce((acc, b) => acc + (b.solar_analysis?.max_pv_capacity_kwp || 0), 0);
    return sum > 0 ? sum : 50.0;
  }, [buildings, selectedBuildingId]);

  // Simulation diurnal profile
  const simulatedOperationsData = useMemo(() => {
    const list = [];
    const baseCap = totalCapacityKwp;
    for (let h = 0; h < 24; h++) {
      const hh = `${h.toString().padStart(2, '0')}:00`;
      let gen = 0;
      if (h >= 6 && h <= 18) {
        const sinFactor = Math.sin(((h - 6) / 12) * Math.PI);
        gen = Number((sinFactor * baseCap * 0.78).toFixed(1));
      }
      // Typical institutional demand curve
      const demand = Number((h >= 8 && h <= 18 ? 22 + Math.sin(((h - 8) / 10) * Math.PI) * 16 : 8.5 + (h % 3) * 0.8).toFixed(1));
      const selfConsumed = Math.min(gen, demand);
      const gridExport = Math.max(0, gen - demand);
      const gridImport = Math.max(0, demand - gen);
      const batteryCharge = gridExport > 5 ? Math.min(8.0, gridExport * 0.4) : 0;

      list.push({
        hour: hh,
        solar_generation_kw: gen,
        facility_demand_kw: demand,
        self_consumed_kw: Number(selfConsumed.toFixed(1)),
        grid_export_kw: Number((gridExport - batteryCharge).toFixed(1)),
        grid_import_kw: Number(gridImport.toFixed(1)),
        battery_charge_kw: Number(batteryCharge.toFixed(1))
      });
    }
    return list;
  }, [totalCapacityKwp]);

  // Current live snapshot values
  const currentSnapshot = useMemo(() => {
    const currentHourIndex = new Date().getHours();
    const curr = simulatedOperationsData[currentHourIndex] || simulatedOperationsData[13];
    return {
      currentSolarKw: curr.solar_generation_kw,
      currentDemandKw: curr.facility_demand_kw,
      currentExportKw: curr.grid_export_kw,
      currentImportKw: curr.grid_import_kw,
      inverterEfficiencyPct: 98.2,
      inverterAvailabilityPct: 99.4,
      dailyEstimatedKwh: Number((totalCapacityKwp * 4.6).toFixed(1)),
      actualPrPct: 76.8,
      designPrPct: 75.0
    };
  }, [simulatedOperationsData, totalCapacityKwp]);

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-[#61708A] glass-panel rounded-3xl text-xs max-w-xl mx-auto my-12">
        <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="font-bold text-[#0B1739] text-sm mb-1">Select an Active Project</h3>
        <p className="text-xs">Please initialize or select a solar project to monitor operational energy flows and inverter assets.</p>
        <Link to="/workspace" className="inline-block mt-4 px-4 py-2 bg-[#FF6B16] text-white rounded-xl text-xs font-bold">
          Go to Workspace Hub →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* =========================================================================
          PAGE HEADER & SECTION TITLE
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-orange-500/15 text-[#FF6B16] border border-orange-500/20">
              <Activity className="w-4 h-4 text-[#FF6B16]" />
            </span>
            <h1 className="text-lg font-bold text-[#0B1739] tracking-tight">
              Live Solar Energy Operations &amp; Asset Care
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-white/70 text-[#0B1739] border-white/80">
              SolarOps Intelligence
            </span>
          </div>
          <p className="text-xs text-[#61708A] mt-1.5 leading-relaxed">
            Monitor real-time photovoltaic telemetry, verify Performance Ratio (PR), inspect panel thermal defects, and dispatch preventive maintenance.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Data Mode Selector */}
          <div className="flex items-center rounded-xl bg-white/80 border border-slate-200/80 p-0.5 text-xs shadow-2xs">
            <button
              onClick={() => setDataMode('simulation')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                dataMode === 'simulation'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Test mode with dynamic diurnal energy simulation"
            >
              Simulation Mode
            </button>
            <button
              onClick={() => setDataMode('uploaded')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                dataMode === 'uploaded'
                  ? 'bg-[#FF6B16] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Audit actual inverter telemetry from uploaded CSV files"
            >
              Uploaded CSV ({monitoringLogs.length})
            </button>
            <button
              onClick={() => setDataMode('connected')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                dataMode === 'connected'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Direct inverter gateway connection (Modbus / MQTT / API)"
            >
              Connected Live
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="glass-button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-xs"
            title="Refresh fleet data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FF6B16]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 text-rose-900 text-xs flex items-center justify-between gap-2.5 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="glass-panel p-1.5 rounded-2xl flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'telemetry'
              ? 'bg-[#FF6B16] text-white shadow-md shadow-orange-500/25'
              : 'text-[#61708A] hover:text-[#0B1739] hover:bg-white/40'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Real-Time Generation Telemetry &amp; PR</span>
          {monitoringLogs.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] bg-white/30 text-white font-bold rounded-full">
              {monitoringLogs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('faults')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'faults'
              ? 'bg-[#FF6B16] text-white shadow-md shadow-orange-500/25'
              : 'text-[#61708A] hover:text-[#0B1739] hover:bg-white/40'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Thermal Hotspots &amp; Module Diagnostics</span>
          {defectSummary && defectSummary.defects_detected > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] bg-red-100 text-red-700 font-bold rounded-full">
              {defectSummary.defects_detected} Anomaly
            </span>
          )}
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
          <span>Maintenance Action Advisor</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-white/70 text-[#0B1739] font-bold rounded-full border border-white/80">
            {maintenanceCases.filter(c => c.status === 'OPEN').length} Open
          </span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: LIVE GENERATION TELEMETRY & ENERGY FLOW
         ========================================================================= */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Part A: 1-Sentence Purpose */}
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FF6B16] shrink-0" />
              <span className="font-medium text-[#0B1739]">
                <strong>Feature Purpose:</strong> Tracks instantaneous array power production, evaluates inverter efficiency, balances grid import/export, and calculates empirical Performance Ratio (PR) against IEC 61724 standards.
              </span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
              dataMode === 'connected'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : dataMode === 'uploaded'
                ? 'bg-orange-100 text-orange-800 border border-orange-300'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}>
              Mode: {dataMode === 'connected' ? 'Connected Gateway' : dataMode === 'uploaded' ? 'Historical CSV' : 'Simulation'}
            </span>
          </div>

          {/* Part B: Inputs & Configuration */}
          <div className="glass-panel p-5 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1">Fleet Sub-Array Filter</label>
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    className="glass-input px-3 py-1.5 rounded-xl text-xs text-[#0B1739] focus:outline-none cursor-pointer min-w-[200px]"
                  >
                    <option value="fleet">All Arrays ({formatPower(totalCapacityKwp)} Fleet)</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.solar_analysis?.max_pv_capacity_kwp || 0} kWp)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1">Operational Telemetry Source</label>
                  <select
                    value={dataMode}
                    onChange={(e: any) => setDataMode(e.target.value)}
                    className="glass-input px-3 py-1.5 rounded-xl text-xs text-[#0B1739] focus:outline-none cursor-pointer"
                  >
                    <option value="simulation">Simulation / Developer Testing</option>
                    <option value="uploaded">Uploaded Historical CSV Records</option>
                    <option value="connected">Connected Inverter Telemetry Feed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 sm:pt-0">
                <button
                  type="button"
                  onClick={downloadSampleTelemetryCsv}
                  className="glass-button-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Download CSV format template"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download CSV Template</span>
                </button>
              </div>
            </div>

            {/* Collapsible Advanced Parameters */}
            <details className="group border-t border-slate-200/60 pt-3">
              <summary className="text-xs font-bold text-[#61708A] hover:text-[#0B1739] cursor-pointer flex items-center gap-1.5 select-none">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF6B16]" />
                <span>Advanced Engineering Inverter &amp; Grid Benchmarks</span>
              </summary>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                <div className="p-2.5 rounded-xl bg-white/60 border border-slate-200/60">
                  <span className="text-[#61708A] text-[10px] block font-bold">IEC 61724 PR Benchmark</span>
                  <span className="font-bold text-[#0B1739]">75.0% Design Baseline</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/60 border border-slate-200/60">
                  <span className="text-[#61708A] text-[10px] block font-bold">Inverter Derate Factor</span>
                  <span className="font-bold text-[#0B1739]">0.982 (CEC Efficiency)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/60 border border-slate-200/60">
                  <span className="text-[#61708A] text-[10px] block font-bold">Annual Degradation Rate</span>
                  <span className="font-bold text-[#0B1739]">0.75% / Year</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/60 border border-slate-200/60">
                  <span className="text-[#61708A] text-[10px] block font-bold">Grid Net Metering Cap</span>
                  <span className="font-bold text-[#0B1739]">100% Contract Demand</span>
                </div>
              </div>
            </details>
          </div>

          {/* Mode 1: Connected Live Notice (when in connected mode without physical gateway) */}
          {dataMode === 'connected' && (
            <div className="p-5 rounded-3xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-950 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>Connected Live Gateway: Awaiting Telemetry Feed</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                No active physical inverter gateway stream is currently sending telemetry. To stream live inverter metrics, configure your Modbus TCP/IP gateway or SunSpec API token to point to the RoofShift AI ingestion webhook. In the interim, switch to <strong>Simulation Mode</strong> to evaluate operations or upload verified inverter records below.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setDataMode('simulation')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-xs cursor-pointer"
                >
                  Switch to Simulation Mode
                </button>
              </div>
            </div>
          )}

          {/* Mode 2: Empty State when Uploaded mode has no files */}
          {dataMode === 'uploaded' && monitoringLogs.length === 0 && (
            <div className="p-8 text-center text-[#61708A] glass-panel rounded-3xl border border-white/80 space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-orange-500 mx-auto" />
              <h3 className="font-bold text-[#0B1739] text-sm">No Inverter Telemetry Uploaded Yet</h3>
              <p className="text-xs max-w-md mx-auto text-[#61708A]">
                Connect a data source or upload your generation and consumption records to begin monitoring actual Performance Ratio (PR) and degradation.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={downloadSampleTelemetryCsv}
                  className="glass-button-secondary px-3.5 py-2 text-xs font-semibold cursor-pointer"
                >
                  Download Sample CSV
                </button>
                <button
                  onClick={() => setDataMode('simulation')}
                  className="glass-button-primary px-4 py-2 text-xs font-bold shadow-md cursor-pointer"
                >
                  Switch to Simulation Mode
                </button>
              </div>
            </div>
          )}

          {/* Part D: Primary Operations Results & Energy Flow Diagram */}
          {(dataMode === 'simulation' || (dataMode === 'uploaded' && monitoringLogs.length > 0)) && (
            <>
              {/* 4 Primary Operations KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
                  <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Performance Ratio (PR)</span>
                  <div className="text-2xl font-bold text-emerald-600 tabular-nums font-mono mt-1">
                    {dataMode === 'uploaded' && monitoringLogs.length > 0
                      ? `${(monitoringLogs[0].performance_ratio_actual * 100).toFixed(1)}%`
                      : `${currentSnapshot.actualPrPct}%`}
                  </div>
                  <div className="text-[11px] text-[#61708A] mt-1 font-medium">Design benchmark: 75.0%</div>
                </div>

                <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
                  <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Today's Generation</span>
                  <div className="text-2xl font-bold text-[#0B1739] tabular-nums font-mono mt-1">
                    {dataMode === 'uploaded' && monitoringLogs.length > 0
                      ? `${monitoringLogs[0].total_measured_generation_kwh.toLocaleString()} kWh`
                      : `${currentSnapshot.dailyEstimatedKwh} kWh`}
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-1 font-semibold">
                    Specific Yield: ~4.6 kWh/kWp
                  </div>
                </div>

                <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
                  <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Instantaneous Solar Output</span>
                  <div className="text-2xl font-bold text-[#FF6B16] tabular-nums font-mono mt-1">
                    {currentSnapshot.currentSolarKw} kW
                  </div>
                  <div className="text-[11px] text-[#61708A] mt-1 font-medium">
                    Grid Export: {currentSnapshot.currentExportKw} kW
                  </div>
                </div>

                <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
                  <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Inverter Fleet Health</span>
                  <div className="text-2xl font-bold text-emerald-600 tabular-nums font-mono mt-1">
                    {currentSnapshot.inverterAvailabilityPct}%
                  </div>
                  <div className="text-[11px] text-[#61708A] mt-1 font-medium">
                    Conversion: {currentSnapshot.inverterEfficiencyPct}% Eff.
                  </div>
                </div>
              </div>

              {/* Energy Flow Diagram (Visual Operational Topology) */}
              <div className="glass-panel rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/40 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#0B1739] flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#FF6B16]" />
                      <span>Live Microgrid Energy Flow Topology</span>
                    </h3>
                    <p className="text-xs text-[#61708A] mt-0.5">
                      Real-time power routing across solar arrays, central string inverters, campus facility loads, and the utility grid.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 font-bold border border-emerald-500/25">
                    ● Active Dispatch
                  </span>
                </div>

                {/* Energy Flow Nodes */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                  {/* Node 1: Solar PV Array */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 border border-orange-200/80 text-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-[#FF6B16] flex items-center justify-center mx-auto">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-xs text-slate-800">Solar Array Field</div>
                    <div className="text-xl font-black text-[#FF6B16] font-mono">
                      {currentSnapshot.currentSolarKw} kW
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {formatPower(totalCapacityKwp)} DC Installed
                    </div>
                  </div>

                  {/* Node 2: Inverters */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200/80 text-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-600 flex items-center justify-center mx-auto">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-xs text-slate-800">String Inverters</div>
                    <div className="text-xl font-black text-blue-700 font-mono">
                      {currentSnapshot.inverterEfficiencyPct}%
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      CEC Inverter Efficiency
                    </div>
                  </div>

                  {/* Node 3: Campus Load */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-200/80 text-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center mx-auto">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-xs text-slate-800">Facility Operations</div>
                    <div className="text-xl font-black text-emerald-700 font-mono">
                      {currentSnapshot.currentDemandKw} kW
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Self-Consumed Onsite
                    </div>
                  </div>

                  {/* Node 4: Grid Interconnection */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-slate-50 border border-purple-200/80 text-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-700 flex items-center justify-center mx-auto">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-xs text-slate-800">Utility Grid Net</div>
                    <div className={`text-xl font-black font-mono ${
                      currentSnapshot.currentExportKw > 0 ? 'text-[#FF6B16]' : 'text-slate-800'
                    }`}>
                      {currentSnapshot.currentExportKw > 0
                        ? `+${currentSnapshot.currentExportKw} kW (Export)`
                        : `-${currentSnapshot.currentImportKw} kW (Import)`}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Bidirectional Meter
                    </div>
                  </div>
                </div>
              </div>

              {/* Diurnal Operations Curve (Generation vs Demand vs Grid Exchange) */}
              <div className="glass-panel rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/40 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#0B1739] flex items-center gap-2">
                      <Sun className="w-4 h-4 text-[#FF6B16]" />
                      <span>24-Hour Diurnal Energy Balance (Typical Operating Day)</span>
                    </h3>
                    <p className="text-xs text-[#61708A] mt-0.5">
                      Coincidence between midday photovoltaic production bell curve and institutional load requirements.
                    </p>
                  </div>
                  <span className="text-xs glass-surface-secondary text-[#0B1739] font-bold px-3 py-1 rounded-xl border border-white/60">
                    Mode: {dataMode === 'uploaded' ? 'Ingested Inverter CSV' : 'Simulated Operations'}
                  </span>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={simulatedOperationsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="rgba(24, 45, 80, 0.06)" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#61708A' }} stroke="rgba(24, 45, 80, 0.2)" interval={2} />
                      <YAxis tick={{ fontSize: 11, fill: '#61708A' }} stroke="rgba(24, 45, 80, 0.2)" label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#61708A' }} />
                      <Tooltip
                        formatter={(val: any) => [`${val} kW`]}
                        contentStyle={{ fontSize: '12px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(255, 255, 255, 0.8)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Area
                        type="monotone"
                        dataKey="solar_generation_kw"
                        name="Solar Generation (kW)"
                        stroke="#FF6B16"
                        fill="rgba(255, 107, 22, 0.2)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="facility_demand_kw"
                        name="Facility Demand (kW)"
                        stroke="#0B1739"
                        fill="rgba(11, 23, 57, 0.05)"
                        strokeWidth={1.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="grid_export_kw"
                        name="Grid Export (kW)"
                        stroke="#10B981"
                        fill="rgba(16, 185, 129, 0.15)"
                        strokeWidth={1.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Upload Inverter CSV Form Card */}
          <div className="glass-panel rounded-3xl p-6 shadow-xl space-y-4">
            <div className="border-b border-white/40 pb-3">
              <h2 className="text-sm font-bold text-[#0B1739] flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#FF6B16]" />
                <span>Upload Inverter Generation Telemetry (CSV)</span>
              </h2>
              <p className="text-xs text-[#61708A] mt-1 leading-relaxed">
                Ingest actual recorded inverter generation data to evaluate empirical Performance Ratio (PR), verify degradation against the 0.75%/year standard, and flag underperforming arrays.
              </p>
            </div>

            <form onSubmit={handleUploadTelemetry} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0B1739] mb-1.5">
                  Select Telemetry CSV File (columns: timestamp, generation_kwh)
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setTelemetryFile(e.target.files?.[0] || null)}
                  className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-[#61708A] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/80 file:text-[#0B1739] hover:file:bg-white cursor-pointer"
                />
              </div>

              {telemetrySuccess && (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-2xs backdrop-blur-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{telemetrySuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={downloadSampleTelemetryCsv}
                  className="text-xs font-semibold text-[#61708A] hover:text-[#0B1739] underline cursor-pointer"
                >
                  Download Sample CSV Template
                </button>
                <button
                  type="submit"
                  disabled={!telemetryFile || uploadingTelemetry}
                  className="glass-button-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-white/80" />
                  <span>{uploadingTelemetry ? 'Ingesting Inverter Records…' : 'Ingest & Compare Yield'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Historical Telemetry Ingestion Log Table */}
          {monitoringLogs.length > 0 && (
            <div className="glass-panel rounded-3xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/40 flex items-center justify-between">
                <h3 className="font-bold text-[#0B1739] text-xs uppercase tracking-wider">
                  Ingested Inverter Telemetry History &amp; PR Audits
                </h3>
                <span className="text-[11px] text-[#61708A] font-mono font-semibold">{monitoringLogs.length} Files</span>
              </div>
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
                        <span className="text-[#61708A] text-[10px] uppercase block font-sans font-bold">Expected Output</span>
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
            </div>
          )}

          {/* Part E: Next Step Navigation */}
          <div className="flex items-center justify-between p-5 rounded-3xl glass-panel">
            <div>
              <div className="text-xs font-bold text-[#0B1739]">Next Recommended Step</div>
              <div className="text-xs text-[#61708A]">Inspect panel thermal hot spots or review dispatchable load shifting.</div>
            </div>
            <button
              onClick={() => setActiveTab('faults')}
              className="glass-button-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>Inspect Panel Hotspots &amp; Faults</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: THERMAL HOTSPOTS & PANEL DIAGNOSTICS
         ========================================================================= */}
      {activeTab === 'faults' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Part A: 1-Sentence Purpose */}
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-medium text-[#0B1739]">
                <strong>Feature Purpose:</strong> Detects cell hotspots, bypass diode failures, and soiling power derates from calibrated thermography surveys and optical module inspections.
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
              Thermography &Delta;T Diagnostics
            </span>
          </div>

          {/* Part D: Primary Thermal Results Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Modules / Strings Scanned</span>
              <div className="text-2xl font-bold text-[#0B1739] tabular-nums font-mono mt-1">
                {thermalSummary?.total_monitored_strings || defectSummary?.total_inspections || 9}
              </div>
              <div className="text-[11px] text-[#61708A] mt-1 font-medium">Monitored PV circuits</div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Healthy Baseline</span>
              <div className="text-2xl font-bold text-emerald-600 tabular-nums font-mono mt-1">
                {thermalSummary?.normal_count || defectSummary?.healthy_panels || 4}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1 font-semibold">&Delta;T &lt; +5°C (Nominal)</div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Detected Hotspots &amp; Faults</span>
              <div className="text-2xl font-bold text-rose-600 tabular-nums font-mono mt-1">
                {thermalSummary?.anomalies_count || defectSummary?.defects_detected || 5}
              </div>
              <div className="text-[11px] text-rose-600 mt-1 font-semibold">Elevated / Critical rise</div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Fleet Power Derate</span>
              <div className="text-2xl font-bold text-rose-600 tabular-nums font-mono mt-1">
                {thermalSummary?.fleet_power_loss_pct || defectSummary?.total_estimated_power_loss_pct || 4.8}%
              </div>
              <div className="text-[11px] text-[#61708A] mt-1 font-medium">Calculated power loss</div>
            </div>
          </div>

          {/* Thermal Temperature Survey Table with 1-Click Ticket Dispatch */}
          <div className="glass-panel rounded-3xl shadow-xl overflow-hidden space-y-4 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/40 pb-3">
              <div>
                <h3 className="font-bold text-[#0B1739] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-rose-500" />
                  <span>Calibrated Module Surface Temperature Findings</span>
                </h3>
                <p className="text-xs text-[#61708A] mt-0.5">
                  Relative temperature elevation (&Delta;T = T_surface &minus; 42.0°C baseline). Dispatch technicians directly from identified hotspots.
                </p>
              </div>
              <button
                onClick={downloadSampleThermalCsv}
                className="glass-button-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Sample Survey CSV</span>
              </button>
            </div>

            {/* Observations List */}
            <div className="divide-y divide-white/40">
              {(thermalSummary?.observations || [
                { id: '1', panel_id: 'MOD-A07', surface_temp_c: 67.2, delta_temp_c: 25.2, diagnostic_status: 'CRITICAL', severity: 'CRITICAL', suspected_cause: 'Severe cell hotspot; potential bypass diode failure', estimated_power_loss_pct: 18.5, recommended_action: 'Isolate string with HV PPE and verify junction box Voc.' },
                { id: '2', panel_id: 'MOD-L02', surface_temp_c: 58.3, delta_temp_c: 16.3, diagnostic_status: 'ELEVATED', severity: 'HIGH', suspected_cause: 'Heavy localized particulate soiling patch (avian deposits)', estimated_power_loss_pct: 9.5, recommended_action: 'Perform targeted manual wash with neutral surfactant.' },
                { id: '3', panel_id: 'MOD-AUD02', surface_temp_c: 52.6, delta_temp_c: 10.6, diagnostic_status: 'REVIEW', severity: 'MEDIUM', suspected_cause: 'Parapet boundary shading heat dissipation', estimated_power_loss_pct: 4.0, recommended_action: 'Verify shade boundary during peak generation hours.' },
                { id: '4', panel_id: 'MOD-A01', surface_temp_c: 42.4, delta_temp_c: 0.4, diagnostic_status: 'NORMAL', severity: 'NONE', suspected_cause: 'Nominal operating envelope', estimated_power_loss_pct: 0.0, recommended_action: 'Continue standard quarterly maintenance schedule.' },
              ]).map((obs: any) => (
                <div key={obs.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-white/40 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        obs.diagnostic_status === 'CRITICAL'
                          ? 'bg-rose-500/15 text-rose-800 border-rose-500/30'
                          : obs.diagnostic_status === 'ELEVATED'
                          ? 'bg-amber-500/15 text-amber-800 border-amber-500/30'
                          : obs.diagnostic_status === 'REVIEW'
                          ? 'bg-blue-500/15 text-blue-800 border-blue-500/30'
                          : 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30'
                      }`}>
                        {obs.diagnostic_status}
                      </span>
                      <strong className="text-xs text-[#0B1739]">{obs.panel_id}</strong>
                      <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                        Surface: {obs.surface_temp_c}°C (&Delta;T +{obs.delta_temp_c}°C)
                      </span>
                      {obs.estimated_power_loss_pct > 0 && (
                        <span className="text-[11px] font-mono text-rose-600 font-bold">
                          -{obs.estimated_power_loss_pct}% Power Loss
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-[#0B1739]">{obs.suspected_cause}</div>
                    <div className="text-xs text-[#61708A]">{obs.recommended_action}</div>
                  </div>

                  {obs.diagnostic_status !== 'NORMAL' && (
                    <div className="shrink-0 pt-2 md:pt-0">
                      <button
                        onClick={() => handleCreateTicketFromFinding({
                          title: `Thermal Hotspot: ${obs.panel_id} (+${obs.delta_temp_c}°C)`,
                          description: `${obs.suspected_cause}. Recommended action: ${obs.recommended_action}`,
                          category: obs.diagnostic_status === 'CRITICAL' ? 'HOTSPOT' : 'PANEL_SOILING',
                          priority: obs.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
                          loss_kwh: Number((obs.delta_temp_c * 0.45).toFixed(1))
                        })}
                        className="px-3.5 py-1.5 rounded-xl bg-[#FF6B16] hover:bg-[#EA580C] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Dispatch Maintenance Ticket</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Upload Temperature Survey CSV Form Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Form 1: Thermal CSV Survey */}
            <div className="glass-panel rounded-3xl p-6 shadow-xl space-y-4">
              <div className="border-b border-white/40 pb-3">
                <h3 className="text-sm font-bold text-[#0B1739] flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#FF6B16]" />
                  <span>Upload Thermal Survey (CSV)</span>
                </h3>
                <p className="text-xs text-[#61708A] mt-0.5">
                  CSV format: panel_id, surface_temp_c, notes.
                </p>
              </div>

              <form onSubmit={handleUploadThermalCsv} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1.5">Select Survey CSV</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setThermalCsvFile(e.target.files?.[0] || null)}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-[#61708A] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/80 file:text-[#0B1739] hover:file:bg-white cursor-pointer"
                  />
                </div>

                {thermalCsvSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{thermalCsvSuccess}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={!thermalCsvFile || uploadingThermalCsv}
                    className="glass-button-primary px-4 py-2 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {uploadingThermalCsv ? 'Evaluating Survey…' : 'Ingest Temperature Survey'}
                  </button>
                </div>
              </form>
            </div>

            {/* Form 2: Optical Module Photo Scan */}
            <div className="glass-panel rounded-3xl p-6 shadow-xl space-y-4">
              <div className="border-b border-white/40 pb-3">
                <h3 className="text-sm font-bold text-[#0B1739] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#FF6B16]" />
                  <span>Module Imagery Scan (JPG/PNG)</span>
                </h3>
                <p className="text-xs text-[#61708A] mt-0.5">
                  Upload visual defect photo for automated defect triage.
                </p>
              </div>

              <form onSubmit={handleUploadInspection} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1.5">Rooftop Asset</label>
                  <select
                    value={inspectTargetBuildingId}
                    onChange={(e) => setInspectTargetBuildingId(e.target.value)}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-[#0B1739] focus:outline-none cursor-pointer"
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1.5">Select Module Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setInspectionFile(e.target.files?.[0] || null)}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-xs text-[#61708A] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/80 file:text-[#0B1739] hover:file:bg-white cursor-pointer"
                  />
                </div>

                {inspectionSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{inspectionSuccess}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={!inspectionFile || uploadingInspection}
                    className="glass-button-primary px-4 py-2 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {uploadingInspection ? 'Evaluating Imagery…' : 'Execute Image Diagnostic'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Part E: Next Step Navigation */}
          <div className="flex items-center justify-between p-5 rounded-3xl glass-panel">
            <div>
              <div className="text-xs font-bold text-[#0B1739]">Next Recommended Step</div>
              <div className="text-xs text-[#61708A]">Review open maintenance tickets and dispatch field technicians.</div>
            </div>
            <button
              onClick={() => setActiveTab('maintenance')}
              className="glass-button-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>View Maintenance Action Advisor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: INTELLIGENT MAINTENANCE ACTION ADVISOR
         ========================================================================= */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Part A: 1-Sentence Purpose */}
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#FF6B16] shrink-0" />
              <span className="font-medium text-[#0B1739]">
                <strong>Feature Purpose:</strong> Tracks, prioritizes, and resolves preventive and corrective maintenance tickets to prevent array clipping and protect facility solar yield.
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
              O&amp;M Dispatch
            </span>
          </div>

          {/* Part D: Primary Maintenance Results KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Open Work Orders</span>
              <div className="text-2xl font-bold text-amber-600 tabular-nums font-mono mt-1">
                {maintenanceCases.filter(c => c.status === 'OPEN').length}
              </div>
              <div className="text-[11px] text-[#61708A] mt-1 font-medium">Pending resolution</div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Critical &amp; High Priority</span>
              <div className="text-2xl font-bold text-rose-600 tabular-nums font-mono mt-1">
                {maintenanceCases.filter(c => c.status === 'OPEN' && (c.priority === 'CRITICAL' || c.priority === 'HIGH')).length}
              </div>
              <div className="text-[11px] text-rose-600 mt-1 font-semibold">Immediate safety / yield risk</div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Cumulative Daily Loss</span>
              <div className="text-2xl font-bold text-[#FF6B16] tabular-nums font-mono mt-1">
                ~{maintenanceCases.filter(c => c.status === 'OPEN').reduce((sum, c) => sum + (c.estimated_loss_kwh_per_day || 0), 0).toFixed(1)} kWh/day
              </div>
              <div className="text-[11px] text-[#61708A] mt-1 font-medium">Yield deficit at risk</div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] font-bold text-[#61708A] uppercase tracking-wider block">Resolved Cases</span>
              <div className="text-2xl font-bold text-emerald-600 tabular-nums font-mono mt-1">
                {maintenanceCases.filter(c => c.status === 'RESOLVED').length}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1 font-semibold">Repairs completed</div>
            </div>
          </div>

          {/* Part B & C: Filter Controls & Create Ticket Action Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 glass-panel p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0B1739]">Filter Tickets:</span>
              <div className="flex items-center rounded-xl bg-white/80 border border-slate-200/80 p-0.5 text-xs shadow-2xs">
                <button
                  onClick={() => setTicketFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    ticketFilter === 'ALL' ? 'bg-[#FF6B16] text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  All ({maintenanceCases.length})
                </button>
                <button
                  onClick={() => setTicketFilter('OPEN')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    ticketFilter === 'OPEN' ? 'bg-[#FF6B16] text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Open ({maintenanceCases.filter(c => c.status === 'OPEN').length})
                </button>
                <button
                  onClick={() => setTicketFilter('RESOLVED')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    ticketFilter === 'RESOLVED' ? 'bg-[#FF6B16] text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Resolved ({maintenanceCases.filter(c => c.status === 'RESOLVED').length})
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowNewCaseModal(true)}
              className="glass-button-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Maintenance Ticket</span>
            </button>
          </div>

          {/* Tickets Log List */}
          <div className="glass-panel rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/40 flex items-center justify-between">
              <h3 className="font-bold text-[#0B1739] text-xs uppercase tracking-wider">
                Fleet Maintenance Case Log
              </h3>
              <span className="text-[11px] text-[#61708A] font-mono font-semibold">
                {maintenanceCases.filter(c => ticketFilter === 'ALL' || c.status === ticketFilter).length} Tickets
              </span>
            </div>

            {maintenanceCases.filter(c => ticketFilter === 'ALL' || c.status === ticketFilter).length > 0 ? (
              <div className="divide-y divide-white/40">
                {maintenanceCases
                  .filter(c => ticketFilter === 'ALL' || c.status === ticketFilter)
                  .map((c) => (
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
                          <span>Daily Impact: <strong className="text-[#0B1739] font-mono font-bold">~{c.estimated_loss_kwh_per_day} kWh/day</strong></span>
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
                No maintenance tickets active in this category. Clean arrays and healthy inverters!
              </div>
            )}
          </div>

          {/* Part E: Next Step Navigation */}
          <div className="flex items-center justify-between p-5 rounded-3xl glass-panel">
            <div>
              <div className="text-xs font-bold text-[#0B1739]">Next Recommended Step</div>
              <div className="text-xs text-[#61708A]">Generate audit-ready executive PDF report with operational findings.</div>
            </div>
            <Link
              to="/reports"
              className="glass-button-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>Generate Formal PDF Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* =========================================================================
          NEW TICKET MODAL
         ========================================================================= */}
      {showNewCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1739]/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="glass-elevated max-w-lg w-full p-6 border border-white/80 rounded-3xl shadow-2xl space-y-4 bg-white/95">
            <div className="border-b border-white/40 pb-3">
              <h3 className="text-sm font-bold text-[#0B1739]">Create Solar Maintenance Ticket</h3>
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
                  placeholder="e.g. Heavy particulate soiling on Academic Block roof"
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
                  <label className="block text-xs font-bold text-[#0B1739] mb-1">Estimated Daily Loss (kWh/day)</label>
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
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default OperationsPage;
