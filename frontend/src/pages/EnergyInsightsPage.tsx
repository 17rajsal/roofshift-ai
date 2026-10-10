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
  X
} from 'lucide-react';
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
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5EAE7] shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#17231F] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>Solar Surplus & Diurnal Energy Insights</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Analyze hourly generation-demand coincidence and detect surplus windows for smart scheduling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-emerald-600" />
            <span>Upload Demand CSV (Mode A)</span>
          </button>
          <button
            onClick={() => navigate('/scheduling')}
            className="px-4 py-2 bg-[#123C32] hover:bg-[#0B251F] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span>Configure Load Shifting</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <Sun className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
          <div className="text-xs font-semibold">Modeling diurnal solar curves and campus load curves...</div>
        </div>
      )}

      {insights && !loading && (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-[#E5EAE7] shadow-xs">
              <span className="text-[11px] text-slate-500 block">Annual Solar Output</span>
              <strong className="text-base font-extrabold text-[#123C32]">
                {formatEnergy(insights.total_annual_generation_kwh)}
              </strong>
              <div className="text-[10px] text-emerald-600 mt-0.5">From {formatPower(insights.total_capacity_kwp)} PV</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5EAE7] shadow-xs">
              <span className="text-[11px] text-slate-500 block">Campus Demand Offset</span>
              <strong className="text-base font-extrabold text-emerald-700">
                {formatPct(insights.grid_offset_pct)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-0.5">Direct grid displacement</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5EAE7] shadow-xs">
              <span className="text-[11px] text-slate-500 block">Annual Bill Reduction</span>
              <strong className="text-base font-extrabold text-emerald-700">
                {formatINR(insights.total_annual_savings_inr)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-0.5">Displaced tariff savings</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5EAE7] shadow-xs">
              <span className="text-[11px] text-slate-500 block">Potential Solar Surplus</span>
              <strong className="text-base font-extrabold text-amber-600">
                {formatEnergy(insights.total_surplus_kwh)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-0.5">Export / shiftable load</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5EAE7] shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-500 block">Avoided Emissions</span>
              <strong className="text-base font-extrabold text-[#123C32]">
                {formatCO2(insights.avoided_co2_kg_annual)}
              </strong>
              <div className="text-[10px] text-slate-500 mt-0.5">CEA grid factor</div>
            </div>
          </div>

          {/* Diurnal 24-Hour Solar Generation vs Campus Demand Area Chart */}
          <div className="bg-white rounded-2xl border border-[#E5EAE7] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#123C32] flex items-center gap-2">
                  <Sun className="w-4 h-4 text-emerald-600" />
                  <span>Diurnal Solar Generation vs Campus Load Profile (Typical Day)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Illustrates the coincidence between midday solar production and institutional operations.
                </p>
              </div>

              {/* Peak solar window badge */}
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-xl text-xs text-amber-900 font-semibold">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Peak Surplus Window: {insights.peak_solar_window}</span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={insights.hourly_profile} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time_label" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'kW Power', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => [`${val} kW`]}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="solar_generation_kw"
                    name="Solar Generation (kW)"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="electricity_demand_kw"
                    name="Campus Demand (kW)"
                    stroke="#64748B"
                    fill="#64748B"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="solar_surplus_kw"
                    name="Solar Surplus (kW)"
                    stroke="#F5B942"
                    fill="#F5B942"
                    fillOpacity={0.35}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 12-Month Seasonal Demand vs Generation */}
          <div className="bg-white rounded-2xl border border-[#E5EAE7] p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#123C32] flex items-center gap-2 border-b border-slate-100 pb-3">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>12-Month Seasonal Energy Balance (kWh / Month)</span>
            </h3>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.monthly_trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toLocaleString()} kWh`]}
                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="solar_generation_kwh" name="Solar Gen (kWh)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="electricity_demand_kwh" name="Campus Demand (kWh)" fill="#475569" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="onsite_solar_kwh" name="Self-Consumed (kWh)" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Building-by-Building Portfolio Energy Table */}
          <div className="bg-white rounded-2xl border border-[#E5EAE7] p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#123C32] border-b border-slate-100 pb-3">
              Facility-by-Facility Solar Energy Balance
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Building Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Solar Cap</th>
                    <th className="py-2.5 px-3 text-right">Annual Gen</th>
                    <th className="py-2.5 px-3 text-right">Annual Demand</th>
                    <th className="py-2.5 px-3 text-right">Solar Fraction</th>
                    <th className="py-2.5 px-3 text-right">Est. Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {insights.building_comparisons.map((b) => (
                    <tr key={b.building_id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-bold text-[#123C32]">{b.building_name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{b.category}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                        {formatPower(b.allocated_capacity_kwp)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {formatEnergy(b.annual_generation_kwh)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatEnergy(b.annual_demand_kwh)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-800">
                        {b.solar_fraction_pct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {formatINR(b.annual_savings_inr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scientific Notice */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong>Data Provenance Disclosure:</strong>
              <p className="text-[11px] leading-relaxed">
                {insights.data_origin_notice}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Hourly Demand CSV Upload Modal (Mode A) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Upload Hourly Electricity Consumption</h3>
                  <p className="text-[11px] text-slate-500">Mode A: Measured Customer Demand Profile</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadResult(null);
                  setUploadError(null);
                  setSelectedFile(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                <strong>Measured vs Estimated Load:</strong> Uploading 8760 or 24-hour interval meter logs upgrades your campus from <em>Mode B (Synthetic Benchmarks)</em> to <em>Mode A (Measured Demand)</em> for higher financial and surplus precision.
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Need the standardized format?</span>
                <button
                  type="button"
                  onClick={downloadTemplateCsv}
                  className="text-emerald-700 font-semibold hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV Template</span>
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50">
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
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-xs font-semibold text-slate-700 block">
                      {selectedFile ? selectedFile.name : 'Click to select CSV meter file'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Accepts CSV with timestamp, consumption_kwh / power_kw columns (max 5MB)
                    </span>
                  </label>
                </div>

                {uploadError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {uploadError}
                  </div>
                )}

                {uploadResult && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1.5 text-emerald-950">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{uploadResult.status}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">{uploadResult.coverage_note}</p>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[10px]">
                      <div className="bg-white/80 p-1.5 rounded border border-emerald-100">
                        <span className="text-slate-400 block">Readings</span>
                        <strong>{uploadResult.readings_count}</strong>
                      </div>
                      <div className="bg-white/80 p-1.5 rounded border border-emerald-100">
                        <span className="text-slate-400 block">Avg Power</span>
                        <strong>{uploadResult.average_power_kw} kW</strong>
                      </div>
                      <div className="bg-white/80 p-1.5 rounded border border-emerald-100">
                        <span className="text-slate-400 block">Peak Load</span>
                        <strong>{uploadResult.peak_power_kw} kW</strong>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedFile || uploading}
                    className="px-4 py-2 bg-[#123C32] hover:bg-[#0B251F] text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {uploading ? (
                      <>
                        <Sun className="w-3.5 h-3.5 animate-spin" />
                        <span>Validating Meter Data...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Process & Save</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
