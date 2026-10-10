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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Thermal Readings</h3>
              <p className="text-xs text-slate-500">
                Import calibrated surface temperatures from field thermography logs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Baseline Operating Temp Parameter */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Nominal Operating Baseline (°C)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="20"
                max="60"
                value={baselineTempC}
                onChange={(e) => setBaselineTempC(parseFloat(e.target.value) || 42.0)}
                className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
              />
              <span className="text-slate-500 text-[11px]">
                Nominal expected operating surface temp under current ambient &amp; irradiance conditions.
              </span>
            </div>
          </div>

          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-orange-50/30"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            {file ? (
              <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-800">
                <FileText className="w-4 h-4 text-orange-500" />
                <span>{file.name}</span>
                <span className="text-xs text-slate-500 font-normal">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <div>
                <p className="font-medium text-slate-700">Click to choose a CSV file</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Required columns: <code className="bg-slate-200 px-1 py-0.5 rounded">panel_id</code>,{' '}
                  <code className="bg-slate-200 px-1 py-0.5 rounded">surface_temp_c</code>
                </p>
              </div>
            )}
          </div>

          {/* Download Sample Template */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="text-[11px] text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 underline underline-offset-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download sample CSV template</span>
            </button>
            <span className="text-[10px] text-slate-400">Max file size: 5 MB</span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successCount !== null && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Successfully ingested {successCount} calibrated panel temperature readings!</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold transition-colors shadow-sm flex items-center gap-1.5"
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
