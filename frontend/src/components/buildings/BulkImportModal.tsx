import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  Loader2,
  Building,
  HelpCircle
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { api } from '../../services/api';
import { BulkImportSummaryResponse } from '../../types/models';
import { formatNumber, formatArea } from '../../utils/formatters';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const { activeProject, refreshProjects } = useProject();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedJson, setPastedJson] = useState('');
  const [importMode, setImportMode] = useState<'csv' | 'geojson'>('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BulkImportSummaryResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'name,latitude,longitude,gross_roof_area,usable_roof_percentage,category,monthly_consumption_kwh,tariff_inr,daytime_consumption_pct\n' +
      'Engineering Quadrangle Block A,17.5449,78.5718,3200,85,academic,42000,8.50,75\n' +
      'Main University Auditorium,17.5441,78.5724,1950,80,assembly,26000,8.50,60\n' +
      'Science Complex & Labs,17.5435,78.5709,4100,90,laboratory,58000,8.50,85\n' +
      'Student Residential Complex,17.5458,78.5732,2400,75,residential,31000,8.50,50\n' +
      'Indoor Sports Gymnasium,17.5427,78.5741,2800,85,sports,18000,8.50,45\n' +
      'Central Administration Tower,17.5452,78.5702,1500,70,commercial,22000,8.50,80\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'roofshift_bulk_buildings_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!activeProject) {
      setError('Please select or create an active project first.');
      return;
    }

    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      let res: BulkImportSummaryResponse;
      if (importMode === 'csv') {
        if (!selectedFile) {
          setError('Please select a CSV file to upload.');
          setLoading(false);
          return;
        }
        res = await api.bulkImportBuildings(activeProject.id, selectedFile);
      } else {
        if (selectedFile) {
          res = await api.bulkImportBuildings(activeProject.id, selectedFile);
        } else if (pastedJson.trim()) {
          const parsed = JSON.parse(pastedJson);
          res = await api.bulkImportBuildings(activeProject.id, parsed);
        } else {
          setError('Please provide a GeoJSON file or paste valid GeoJSON content.');
          setLoading(false);
          return;
        }
      }

      setSummary(res);
      await refreshProjects();
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import building dataset.');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setPastedJson('');
    setSummary(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[#FF6B16] border border-orange-500/20 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
                Bulk Building Importer & GeoJSON Ingestion
              </h2>
              <p className="text-xs text-slate-500">
                Import dozens or hundreds of campus buildings in a single batch
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetState();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Format Tabs */}
          <div className="flex p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60 max-w-md mx-auto">
            <button
              onClick={() => {
                setImportMode('csv');
                setSelectedFile(null);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                importMode === 'csv'
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              CSV Spreadsheet
            </button>
            <button
              onClick={() => {
                setImportMode('geojson');
                setSelectedFile(null);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                importMode === 'geojson'
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              GeoJSON Polygons
            </button>
          </div>

          {/* CSV Mode */}
          {importMode === 'csv' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Upload a CSV with rooftop footprints and energy characteristics.</span>
                <button
                  onClick={downloadSampleCsv}
                  className="flex items-center gap-1.5 text-[#FF6B16] hover:text-[#EA580C] font-semibold cursor-pointer underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample CSV
                </button>
              </div>

              {/* Drag & Drop Box */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-[#FF6B16] bg-orange-50/50'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-2">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-slate-900 text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB — Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#FF6B16] flex items-center justify-center mb-2">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-slate-800 text-sm">
                      Click to choose CSV or drag and drop here
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports up to 500+ buildings per upload batch
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GeoJSON Mode */}
          {importMode === 'geojson' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500">
                Upload a GeoJSON FeatureCollection containing building polygon footprints or paste the raw GeoJSON JSON below:
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".geojson,.json"
                  onChange={handleFileChange}
                  className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-[#FF6B16] hover:file:bg-orange-100 cursor-pointer"
                />
                {selectedFile && (
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-rose-500 font-semibold cursor-pointer underline"
                  >
                    Clear File
                  </button>
                )}
              </div>
              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder='Or paste GeoJSON FeatureCollection here: { "type": "FeatureCollection", "features": [...] }'
                className="w-full h-32 text-xs font-mono p-3 rounded-2xl border border-slate-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#FF6B16]/30"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <span className="font-bold">Import failed: </span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Success Summary */}
          {summary && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  Bulk Import Complete — {summary.imported} Added, {summary.updated} Updated
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                  <div className="text-slate-500 text-[10px] font-semibold uppercase">Portfolio Total</div>
                  <div className="text-base font-extrabold text-slate-800">
                    {summary.total_buildings_in_project} Roofs
                  </div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                  <div className="text-slate-500 text-[10px] font-semibold uppercase">Total Usable Area</div>
                  <div className="text-base font-extrabold text-slate-800">
                    {formatArea(summary.total_usable_area_sqm)}
                  </div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                  <div className="text-slate-500 text-[10px] font-semibold uppercase">Solar Capacity</div>
                  <div className="text-base font-extrabold text-slate-800">
                    {formatNumber(summary.total_potential_kwp, 1)} kWp
                  </div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                  <div className="text-slate-500 text-[10px] font-semibold uppercase">Annual Gen</div>
                  <div className="text-base font-extrabold text-slate-800">
                    {formatNumber(summary.total_annual_generation_kwh, 0)} kWh
                  </div>
                </div>
              </div>

              {summary.errors && summary.errors.length > 0 && (
                <div className="mt-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <div className="font-semibold mb-1">
                    {summary.errors.length} rows were skipped or invalid:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] max-h-24 overflow-y-auto">
                    {summary.errors.map((err, idx) => (
                      <li key={idx}>
                        Row {err.row_number || '?'}: {err.reason} ({err.identifier || 'unknown'})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200/80 bg-white/70 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span>Target Portfolio: <strong>{activeProject?.name || 'None'}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                resetState();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {summary ? 'Close' : 'Cancel'}
            </button>
            <button
              onClick={handleUpload}
              disabled={loading || (!selectedFile && !pastedJson.trim())}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#FF6B16] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Ingesting Rooftops…' : 'Process Bulk Import'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
