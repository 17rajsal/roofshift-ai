import React, { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  AlertTriangle,
  Info,
  Maximize2,
  Eye,
  Camera,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ThermalInspectionViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImageUrl?: string;
  moduleTitle?: string;
}

type PaletteType = 'ironbow' | 'rainbow' | 'whitehot' | 'amber';

export const ThermalInspectionViewerModal: React.FC<ThermalInspectionViewerModalProps> = ({
  isOpen,
  onClose,
  initialImageUrl,
  moduleTitle = 'Academic Block — String A-07 Inspection',
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [palette, setPalette] = useState<PaletteType>('ironbow');
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(110);
  const [probePoint, setProbePoint] = useState<{ x: number; y: number } | null>(null);

  if (!isOpen) return null;

  // Palette CSS filter styles for visual thermal inspection
  const getFilterStyle = () => {
    let filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    if (palette === 'ironbow') {
      filter += ' hue-rotate(15deg) saturate(140%)';
    } else if (palette === 'rainbow') {
      filter += ' hue-rotate(45deg) saturate(180%)';
    } else if (palette === 'whitehot') {
      filter += ' grayscale(100%)';
    } else if (palette === 'amber') {
      filter += ' sepia(100%) saturate(200%) hue-rotate(350deg)';
    }
    return filter;
  };

  const sampleThermalImage =
    initialImageUrl ||
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80';

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setProbePoint({ x, y });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{moduleTitle}</h3>
              <p className="text-xs text-slate-400">
                Aerial Drone &amp; Handheld Infrared Thermography Inspection View
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mandatory Scientific Disclaimer Banner */}
        <div className="px-6 py-2.5 bg-amber-950/40 border-b border-amber-900/40 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Scientific Notice:</strong> Non-radiometric inspection image. Pixel color variations
            represent relative thermal contrast. Calibrated radiometric temperatures require raw FLIR /
            DJI RJPEG metadata.
          </span>
        </div>

        {/* Workspace: Image Canvas + Controls */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4 min-h-[420px]">
          {/* Main Inspection Canvas */}
          <div className="lg:col-span-3 bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
            <div
              className="relative max-w-full max-h-[500px] cursor-crosshair overflow-hidden rounded-lg shadow-2xl transition-transform duration-100"
              style={{ transform: `scale(${zoom})` }}
              onClick={handleImageClick}
            >
              <img
                src={sampleThermalImage}
                alt="Solar Panel Thermal Inspection"
                className="max-h-[460px] object-contain rounded-lg"
                style={{ filter: getFilterStyle() }}
              />

              {/* Probe Point Pin */}
              {probePoint && (
                <div
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5"
                  style={{ left: `${probePoint.x}%`, top: `${probePoint.y}%` }}
                >
                  <span className="w-4 h-4 rounded-full border-2 border-red-500 bg-red-500/30 animate-ping absolute" />
                  <span className="w-3 h-3 rounded-full border-2 border-white bg-red-600 shadow-md" />
                  <div className="bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-white shadow-lg whitespace-nowrap">
                    Probe ({probePoint.x}%, {probePoint.y}%) · Relative High
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Floating Canvas Toolbar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg text-xs text-slate-300">
              <button
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                className="hover:text-white p-1"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
                className="hover:text-white p-1"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="w-px h-3 bg-slate-700 mx-1" />
              <button
                onClick={() => {
                  setZoom(1);
                  setProbePoint(null);
                  setBrightness(100);
                  setContrast(110);
                }}
                className="hover:text-white flex items-center gap-1 text-[11px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Right Inspection Settings Panel */}
          <div className="bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 flex flex-col gap-5 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-2 uppercase tracking-wider text-[10px]">
                Thermal Palette
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'ironbow', label: 'Ironbow', gradient: 'from-purple-900 via-orange-500 to-yellow-300' },
                    { id: 'rainbow', label: 'Rainbow', gradient: 'from-blue-600 via-green-500 to-red-500' },
                    { id: 'whitehot', label: 'White-Hot', gradient: 'from-black via-slate-500 to-white' },
                    { id: 'amber', label: 'Amber', gradient: 'from-stone-900 via-amber-600 to-amber-200' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPalette(p.id)}
                    className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all ${
                      palette === p.id
                        ? 'border-orange-500 bg-orange-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-full h-2 rounded mb-1 bg-gradient-to-r ${p.gradient}`} />
                    <span className="font-semibold text-[11px]">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-2 uppercase tracking-wider text-[10px]">
                Contrast Enhancement
              </label>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Brightness</span>
                    <span className="font-mono">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="160"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Contrast</span>
                    <span className="font-mono">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="180"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-slate-950/60 p-3 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <p className="font-semibold text-slate-200 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Image Metadata</span>
              </p>
              <p>Type: High-Resolution Aerial JPEG</p>
              <p>FOV: 45° Nadir Orthomosaic</p>
              <p>Target: 18x Photovoltaic Cells / String</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">Click on any panel cell to drop an inspection probe.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
