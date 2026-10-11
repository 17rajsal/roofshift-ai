import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
  Flame,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';

interface ThermalUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: (uploadedObservations: any[]) => void;
}

export const ThermalUploadModal: React.FC<ThermalUploadModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [baselineTempC, setBaselineTempC] = useState<number>(42.0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'panel_id,surface_temp_c,irradiance_wm2,notes\n' +
      'A-01,42.1,845,Nominal crystalline string\n' +
      'A-02,42.8,845,Nominal string\n' +
      'A-03,49.5,840,Lower edge soiling accumulation\n' +
      'A-04,43.0,845,Nominal string\n' +
      'A-07,67.5,850,Critical localized bypass diode hotspot\n' +
      'L-01,41.5,840,Nominal string\n' +
      'L-02,56.2,845,Organic bird dropping soiling patch\n' +
      'H-01,44.0,830,Nominal residential string\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_solar_thermal_readings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith('.csv') && !selected.name.toLowerCase().endsWith('.txt')) {
        setError('Please select a valid CSV file (.csv).');
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
      setSuccessCount(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV file to upload.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.uploadThermalCsv(projectId, file, undefined, baselineTempC);
      setSuccessCount(res.length);
      onSuccess(res);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please check CSV format.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0B1739]/50 p-4 backdrop-blur-md animate-fadeIn">
      <div className="relative flex flex-col w-full max-w-lg rounded-3xl glass-elevated border border-white/80 shadow-2xl overflow-hidden text-[#0B1739]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/50 bg-white/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-[#FF6B16] border border-orange-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0B1739] tracking-tight">Upload Thermal Readings</h3>
              <p className="text-[11px] text-[#61708A]">
                Import calibrated surface temperatures from field thermography logs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#61708A] hover:text-[#0B1739] hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Baseline Operating Temp Parameter */}
          <div>
            <label className="font-bold text-[#0B1739] block mb-1.5">
              Nominal Operating Baseline (°C)
            </label>
            <div className="flex items-center gap-2.5">
              <input
                type="number"
                step="0.5"
                min="20"
                max="60"
                value={baselineTempC}
                onChange={(e) => setBaselineTempC(parseFloat(e.target.value) || 42.0)}
                className="w-28 rounded-xl border border-white/80 bg-white/80 px-3.5 py-2 text-xs font-mono font-bold text-[#0B1739] focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none shadow-2xs"
              />
              <span className="text-[#61708A] text-[11px] leading-tight">
                Nominal expected operating surface temp under current ambient &amp; irradiance conditions.
              </span>
            </div>
          </div>

          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/80 hover:border-[#FF6B16] rounded-2xl p-6 text-center cursor-pointer transition-all glass-surface-secondary hover:bg-white/70 shadow-2xs"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#FF6B16] flex items-center justify-center mx-auto mb-3 border border-orange-500/20">
              <Upload className="w-6 h-6" />
            </div>
            {file ? (
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#0B1739]">
                <FileText className="w-4 h-4 text-[#FF6B16]" />
                <span>{file.name}</span>
                <span className="text-[11px] text-[#61708A] font-normal">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <div>
                <p className="font-bold text-[#0B1739] text-xs">Click to choose a CSV file</p>
                <p className="text-[11px] text-[#61708A] mt-1 font-mono">
                  Required columns: <code className="bg-white/80 text-[#0B1739] px-1.5 py-0.5 rounded border border-white/80">panel_id</code>,{' '}
                  <code className="bg-white/80 text-[#0B1739] px-1.5 py-0.5 rounded border border-white/80">surface_temp_c</code>
                </p>
              </div>
            )}
          </div>

          {/* Download Sample Template */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="text-[11px] text-[#FF6B16] hover:text-[#EA580C] font-bold flex items-center gap-1.5 underline underline-offset-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download sample CSV template</span>
            </button>
            <span className="text-[10px] text-[#61708A] font-medium">Max file size: 5 MB</span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-2xl bg-red-50/80 border border-red-200/80 p-4 text-red-800 flex items-start gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successCount !== null && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-800 flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A]" />
              <span className="font-bold">Successfully ingested {successCount} calibrated panel temperature readings!</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200/50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-white/80 bg-white/60 text-[#0B1739] hover:bg-white/80 font-bold transition-all text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="px-5 py-2.5 rounded-xl bg-[#FF6B16] hover:bg-[#EA580C] disabled:opacity-50 text-white font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-xs"
            >
              {loading ? (
                <span>Ingesting...</span>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Analyze Readings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
