import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { EnergyInsightsResponse, DemandUploadResult } from '../types/models';
import { api } from '../services/api';
import {
  formatEnergy,
  formatINR,
  formatPower,
  formatPct,
  formatCO2,
} from '../utils/formatters';
import {
  Activity,
  BarChart3,
  Sun,
  Zap,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldAlert,
  Info,
  CheckCircle2,
  UploadCloud,
  FileSpreadsheet,
  Download,
  X,
  Sparkles
} from 'lucide-react';
import { SolarMLForecastModal } from '../components/SolarMLForecastModal';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const EnergyInsightsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeProject } = useProject();
  const [insights, setInsights] = useState<EnergyInsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Meter Demand CSV Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMLModal, setShowMLModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<DemandUploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (activeProject) {
      loadInsights();
    }
  }, [activeProject]);

  const loadInsights = async () => {
    if (!activeProject) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getEnergyInsights(activeProject.id);
      setInsights(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load energy insights');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !selectedFile) return;
    try {
      setUploading(true);
      setUploadError(null);
      const res = await api.uploadHourlyDemandCsv(activeProject.id, selectedFile);
      setUploadResult(res);
      await loadInsights();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplateCsv = () => {
    const rows = ['timestamp,consumption_kwh'];
    for (let h = 0; h < 24; h++) {
      const hh = h.toString().padStart(2, '0');
      const kw = h >= 8 && h <= 17 ? (55 + Math.sin((h - 8) / 9 * Math.PI) * 25).toFixed(1) : (18 + Math.random() * 4).toFixed(1);
      rows.push(`2026-03-15 ${hh}:00:00,${kw}`);
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_campus_hourly_demand.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 rounded-3xl">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-orange-500/15 text-[#FF6B16] border border-orange-500/20">
              <Activity className="w-4 h-4 text-[#FF6B16]" />
            </span>
            <h2 className="text-lg font-bold text-[#0B1739] flex items-center gap-2">
              <span>Solar Surplus &amp; Diurnal Energy Balance</span>
            </h2>
            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
              uploadResult
                ? 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30'
                : 'bg-white/70 text-[#0B1739] border-white/80'
            }`}>
              {uploadResult ? 'Mode A: Ingested Meter Data' : 'Mode B: Archetype Synthesis'}
            </span>
          </div>
          <p className="text-xs text-[#61708A] mt-1.5 leading-relaxed">
            Hourly generation-demand coincidence analysis, peak surplus windows, and 12-month facility self-consumption.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowMLModal(true)}
            className="glass-button-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs text-amber-900 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
            title="Open Trained XGBoost Machine Learning Forecaster"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B16]" />
            <span>Solar ML Forecaster</span>
            <span className="text-[10px] bg-amber-500/25 text-amber-900 font-bold px-1.5 py-0.5 rounded">
              XGBoost
            </span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="glass-button-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#FF6B16]" />
            <span>Upload Demand CSV</span>
          </button>
          <button
            onClick={() => navigate('/scheduling')}
            className="glass-button-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <span>Proceed to Scheduling</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center text-[#61708A] glass-panel rounded-3xl border border-white/80 text-xs">
          Modeling diurnal solar curves and campus load curves…
        </div>
      )}

      {insights && !loading && (
        <>
          {/* Top 5 Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] text-[#61708A] block font-semibold">Annual Solar Output</span>
              <strong className="text-base font-bold text-[#0B1739] tabular-nums mt-1 block">
                {formatEnergy(insights.total_annual_generation_kwh)}
              </strong>
              <div className="text-[10px] text-[#61708A] mt-0.5">From {formatPower(insights.total_capacity_kwp)} array</div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] text-[#61708A] block font-semibold">Campus Demand Offset</span>
              <strong className="text-base font-bold text-emerald-600 tabular-nums mt-1 block">
                {formatPct(insights.grid_offset_pct)}
              </strong>
              <div className="text-[10px] text-[#61708A] mt-0.5">Direct grid displacement</div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] text-[#61708A] block font-semibold">Annual Bill Reduction</span>
              <strong className="text-base font-bold text-emerald-600 tabular-nums mt-1 block">
                {formatINR(insights.total_annual_savings_inr)}
              </strong>
              <div className="text-[10px] text-[#61708A] mt-0.5">Displaced tariff savings</div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
              <span className="text-[11px] text-[#61708A] block font-semibold">Potential Solar Surplus</span>
              <strong className="text-base font-bold text-[#FF6B16] tabular-nums mt-1 block">
                {formatEnergy(insights.total_surplus_kwh)}
              </strong>
              <div className="text-[10px] text-[#61708A] mt-0.5">Export / flexible load</div>
            </div>

            <div className="glass-panel glass-panel-hover p-4 rounded-2xl col-span-2 sm:col-span-1">
              <span className="text-[11px] text-[#61708A] block font-semibold">Avoided Emissions</span>
              <strong className="text-base font-bold text-[#0B1739] tabular-nums mt-1 block">
                {formatCO2(insights.avoided_co2_kg_annual)}
              </strong>
              <div className="text-[10px] text-[#61708A] mt-0.5">CEA grid factor</div>
            </div>
          </div>

          {/* Diurnal 24-Hour Solar Generation vs Campus Demand Area Chart */}
          <div className="glass-panel rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/40 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0B1739] flex items-center gap-2">
                  <Sun className="w-4 h-4 text-[#FF6B16]" />
                  <span>Diurnal Solar Generation vs Campus Demand (Typical Day)</span>
                </h3>
                <p className="text-xs text-[#61708A] mt-0.5">
                  Illustrates the coincidence between midday solar production and institutional operations.
                </p>
              </div>

              {/* Peak solar window badge */}
              <div className="flex items-center gap-1.5 glass-surface-secondary border border-white/70 px-3 py-1 rounded-xl text-xs text-[#0B1739]">
                <Clock className="w-3.5 h-3.5 text-[#FF6B16]" />
                <span>Peak Surplus Window: <strong className="text-[#0B1739]">{insights.peak_solar_window}</strong></span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={insights.hourly_profile} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="rgba(24, 45, 80, 0.06)" vertical={false} />
                  <XAxis dataKey="time_label" tick={{ fontSize: 10, fill: '#61708A' }} stroke="rgba(24, 45, 80, 0.2)" interval={2} />
                  <YAxis tick={{ fontSize: 11, fill: '#61708A' }} stroke="rgba(24, 45, 80, 0.2)" label={{ value: 'kW Power', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#61708A' }} />
                  <Tooltip
                    formatter={(val: any) => [`${val} kW`]}
                    contentStyle={{ fontSize: '12px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 8px 24px rgba(24,45,80,0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="solar_generation_kw"
                    name="Solar Generation (kW)"
                    stroke="#16A34A"
                    fill="#16A34A"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="electricity_demand_kw"
                    name="Campus Demand (kW)"
                    stroke="#0B1739"
                    fill="#0B1739"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="solar_surplus_kw"
                    name="Solar Surplus (kW)"
                    stroke="#FF6B16"
                    fill="#FF6B16"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 12-Month Seasonal Demand vs Generation */}
          <div className="glass-panel rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#0B1739] flex items-center gap-2 border-b border-white/40 pb-3">
              <TrendingUp className="w-4 h-4 text-[#FF6B16]" />
              <span>12-Month Seasonal Energy Balance (kWh / Month)</span>
            </h3>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.monthly_trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="rgba(24, 45, 80, 0.06)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#61708A' }} stroke="rgba(24, 45, 80, 0.2)" />
                  <YAxis tick={{ fontSize: 11, fill: '#61708A' }} stroke="rgba(24, 45, 80, 0.2)" />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toLocaleString()} kWh`]}
                    contentStyle={{ fontSize: '12px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 8px 24px rgba(24,45,80,0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="solar_generation_kwh" name="Solar Output (kWh)" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="electricity_demand_kwh" name="Facility Demand (kWh)" fill="#0B1739" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="onsite_solar_kwh" name="Self-Consumed (kWh)" fill="#0D9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Building-by-Building Portfolio Energy Table */}
          <div className="glass-panel rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#0B1739] border-b border-white/40 pb-3">
              Facility-by-Facility Solar Energy Balance
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="glass-surface-secondary text-[#0B1739] font-bold border-b border-white/60">
                  <tr>
                    <th className="py-3 px-3.5">Facility Name</th>
                    <th className="py-3 px-3.5">Category</th>
                    <th className="py-3 px-3.5 text-right">Solar Cap</th>
                    <th className="py-3 px-3.5 text-right">Annual Gen</th>
                    <th className="py-3 px-3.5 text-right">Annual Demand</th>
                    <th className="py-3 px-3.5 text-right">Solar Fraction</th>
                    <th className="py-3 px-3.5 text-right">Est. Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {insights.building_comparisons.map((b) => (
                    <tr key={b.building_id} className="hover:bg-white/40 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-[#0B1739]">{b.building_name}</td>
                      <td className="py-3 px-3.5 text-[#61708A]">{b.category}</td>
                      <td className="py-3 px-3.5 text-right text-[#0B1739] tabular-nums font-semibold">
                        {formatPower(b.allocated_capacity_kwp)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-[#0B1739] tabular-nums font-semibold">
                        {formatEnergy(b.annual_generation_kwh)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-[#61708A] tabular-nums font-medium">
                        {formatEnergy(b.annual_demand_kwh)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-emerald-700 tabular-nums">
                        {b.solar_fraction_pct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-emerald-600 tabular-nums">
                        {formatINR(b.annual_savings_inr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scientific Notice */}
          <div className="p-4.5 glass-surface-secondary border border-white/60 rounded-2xl text-xs text-[#61708A] flex items-start gap-3 shadow-xs">
            <Info className="w-4 h-4 text-[#FF6B16] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-[#0B1739] font-bold">Data Provenance Disclosure:</strong>
              <p className="text-[11px] leading-relaxed">
                {insights.data_origin_notice}
              </p>
            </div>
            {/* Part E: Next Step Navigation */}
            <div className="flex items-center justify-between p-5 rounded-3xl glass-panel">
              <div>
                <div className="text-xs font-bold text-[#0B1739]">Next Recommended Step</div>
                <div className="text-xs text-[#61708A]">Align flexible campus equipment and battery charging with peak solar surplus windows.</div>
              </div>
              <button
                onClick={() => navigate('/scheduling')}
                className="glass-button-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <span>Proceed to Smart Load Scheduling</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hourly Demand CSV Upload Modal (Mode A) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-[#0B1739]/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-elevated rounded-3xl shadow-2xl border border-white/80 w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-white/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/15 text-emerald-700 rounded-xl border border-emerald-500/25">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0B1739]">Upload Hourly Electricity Consumption</h3>
                  <p className="text-[11px] text-[#61708A]">Mode A: Measured Customer Demand Profile</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadResult(null);
                  setUploadError(null);
                  setSelectedFile(null);
                }}
                className="p-1.5 text-[#61708A] hover:text-[#0B1739] rounded-xl hover:bg-white/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-xs text-emerald-950 leading-relaxed">
                <strong>Measured vs Estimated Load:</strong> Uploading 8760 or 24-hour interval meter logs upgrades your campus from <em>Mode B (Synthetic Benchmarks)</em> to <em>Mode A (Measured Demand)</em> for higher financial and surplus precision.
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#61708A]">Need the standardized format?</span>
                <button
                  type="button"
                  onClick={downloadTemplateCsv}
                  className="text-emerald-700 font-bold hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV Template</span>
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div className="border-2 border-dashed border-white/80 rounded-2xl p-6 text-center hover:border-orange-500 transition-colors glass-surface-secondary">
                  <input
                    type="file"
                    id="csv-file-input"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        setUploadResult(null);
                        setUploadError(null);
                      }
                    }}
                  />
                  <label htmlFor="csv-file-input" className="cursor-pointer block">
                    <UploadCloud className="w-8 h-8 text-[#FF6B16] mx-auto mb-2" />
                    <span className="text-xs font-bold text-[#0B1739] block">
                      {selectedFile ? selectedFile.name : 'Click to select CSV meter file'}
                    </span>
                    <span className="text-[10px] text-[#61708A] block mt-1">
                      Accepts CSV with timestamp, consumption_kwh / power_kw columns (max 5MB)
                    </span>
                  </label>
                </div>

                {uploadError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
                    {uploadError}
                  </div>
                )}

                {uploadResult && (
                  <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-xs space-y-2 text-emerald-950">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{uploadResult.status}</span>
                    </div>
                    <p className="text-[11px] text-[#61708A]">{uploadResult.coverage_note}</p>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[10px]">
                      <div className="bg-white/80 p-2 rounded-xl border border-emerald-100 shadow-2xs">
                        <span className="text-[#61708A] block font-medium">Readings</span>
                        <strong className="text-[#0B1739] font-bold">{uploadResult.readings_count}</strong>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl border border-emerald-100 shadow-2xs">
                        <span className="text-[#61708A] block font-medium">Avg Power</span>
                        <strong className="text-[#0B1739] font-bold">{uploadResult.average_power_kw} kW</strong>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl border border-emerald-100 shadow-2xs">
                        <span className="text-[#61708A] block font-medium">Peak Load</span>
                        <strong className="text-[#0B1739] font-bold">{uploadResult.peak_power_kw} kW</strong>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="glass-button-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedFile || uploading}
                    className="glass-button-primary px-5 py-2 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {uploading ? (
                      <>
                        <Sun className="w-3.5 h-3.5 animate-spin" />
                        <span>Validating Meter Data…</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Process &amp; Save</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Solar ML Forecast & Benchmark Modal */}
      <SolarMLForecastModal
        isOpen={showMLModal}
        onClose={() => setShowMLModal(false)}
        initialCapacityKwp={insights?.total_capacity_kwp || 50}
      />
    </div>
  );
};
