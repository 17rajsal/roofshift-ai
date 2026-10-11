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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0B1739]/60 p-4 backdrop-blur-md animate-fadeIn">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl bg-[#0B1739]/90 border border-white/20 shadow-2xl overflow-hidden text-slate-100 backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-[#FF6B16] border border-orange-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">{moduleTitle}</h3>
              <p className="text-xs text-slate-300">
                Aerial Drone &amp; Handheld Infrared Thermography Inspection View
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mandatory Scientific Disclaimer Banner */}
        <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#FF6B16]" />
          <span>
            <strong>Scientific Notice:</strong> Non-radiometric inspection image. Pixel color variations
            represent relative thermal contrast. Calibrated radiometric temperatures require raw FLIR /
            DJI RJPEG metadata.
          </span>
        </div>

        {/* Workspace: Image Canvas + Controls */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4 min-h-[420px]">
          {/* Main Inspection Canvas */}
          <div className="lg:col-span-3 bg-slate-950/80 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
            <div
              className="relative max-w-full max-h-[500px] cursor-crosshair overflow-hidden rounded-2xl shadow-2xl transition-transform duration-100 border border-white/10"
              style={{ transform: `scale(${zoom})` }}
              onClick={handleImageClick}
            >
              <img
                src={sampleThermalImage}
                alt="Solar Panel Thermal Inspection"
                className="max-h-[460px] object-contain rounded-2xl"
                style={{ filter: getFilterStyle() }}
              />

              {/* Probe Point Pin */}
              {probePoint && (
                <div
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center gap-2"
                  style={{ left: `${probePoint.x}%`, top: `${probePoint.y}%` }}
                >
                  <span className="w-5 h-5 rounded-full border-2 border-red-500 bg-red-500/30 animate-ping absolute" />
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white bg-red-600 shadow-md" />
                  <div className="bg-[#0B1739]/90 border border-white/20 px-2.5 py-1 rounded-xl text-[10px] font-bold text-white shadow-xl whitespace-nowrap backdrop-blur-md">
                    Probe ({probePoint.x}%, {probePoint.y}%) · Relative High
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Floating Canvas Toolbar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-[#0B1739]/80 border border-white/20 px-4 py-2 rounded-full backdrop-blur-xl shadow-2xl text-xs text-slate-200">
              <button
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                className="hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-[#FF6B16]" />
              </button>
              <span className="text-[11px] font-mono font-bold">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
                className="hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-[#FF6B16]" />
              </button>
              <div className="w-px h-3.5 bg-white/20 mx-1" />
              <button
                onClick={() => {
                  setZoom(1);
                  setProbePoint(null);
                  setBrightness(100);
                  setContrast(110);
                }}
                className="hover:text-white flex items-center gap-1.5 text-[11px] font-bold p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Right Inspection Settings Panel */}
          <div className="bg-[#0B1739]/70 border-t lg:border-t-0 lg:border-l border-white/10 p-5 flex flex-col gap-5 text-xs backdrop-blur-md">
            <div>
              <label className="font-bold text-white block mb-2.5 uppercase tracking-wider text-[10px]">
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
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                      palette === p.id
                        ? 'border-[#FF6B16] bg-orange-500/20 text-white shadow-xs'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-full h-2 rounded mb-1.5 bg-gradient-to-r ${p.gradient}`} />
                    <span className="font-bold text-[11px]">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-white block mb-2.5 uppercase tracking-wider text-[10px]">
                Contrast Enhancement
              </label>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1 font-semibold">
                    <span>Brightness</span>
                    <span className="font-mono text-[#FF6B16] font-bold">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="160"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-[#FF6B16]"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1 font-semibold">
                    <span>Contrast</span>
                    <span className="font-mono text-[#FF6B16] font-bold">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="180"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-[#FF6B16]"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 p-4 border border-white/10 text-[11px] text-slate-300 space-y-1.5 shadow-2xs">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#FF6B16]" />
                <span>Image Metadata</span>
              </p>
              <p>Type: High-Resolution Aerial JPEG</p>
              <p>FOV: 45° Nadir Orthomosaic</p>
              <p>Target: 18x Photovoltaic Cells / String</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between text-xs">
          <span className="text-slate-300">Click on any panel cell to drop an inspection probe.</span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all border border-white/20 shadow-xs"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
