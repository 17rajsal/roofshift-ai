import React, { useState } from 'react';
import { X, Building2, MapPin, DollarSign, Zap } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { api } from '../../services/api';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  const { createProject } = useProject();
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [city, setCity] = useState('New Delhi');
  const [latitude, setLatitude] = useState(28.6139);
  const [longitude, setLongitude] = useState(77.2090);
  const [budget, setBudget] = useState(1000000);
  const [tariff, setTariff] = useState(8.5);
  const [exportTariff, setExportTariff] = useState(3.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCityChange = async (cityName: string) => {
    setCity(cityName);
    try {
      const results = await api.searchLocation(cityName);
      if (results.length > 0) {
        setLatitude(results[0].lat);
        setLongitude(results[0].lon);
      }
    } catch {
      // Keep defaults
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a project name.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const matches = await api.searchLocation(city.trim());
      if (!matches.length) throw new Error('Choose a city that can be located on the map.');
      await createProject({
        name: name.trim(),
        organization_name: organization.trim() || name.trim(),
        city,
        latitude: matches[0].lat,
        longitude: matches[0].lon,
        budget,
        tariff_rate: tariff,
        export_tariff: exportTariff,
        co2_factor: 0.716
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Create new solar planning project" className="fixed inset-0 z-50 bg-[#0B1739]/50 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="glass-elevated rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto w-full shadow-2xl border border-white/80">
        <div className="px-6 py-5 border-b border-slate-200/50 bg-white/60 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF6B16] border border-orange-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#0B1739] tracking-tight">Initialize Solar Planning Project</h2>
              <p className="text-[11px] text-[#61708A]">Set campus boundary, location coordinates and fiscal constraints</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close new project form" className="text-[#61708A] hover:text-[#0B1739] p-2 rounded-xl hover:bg-white/80 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50/80 border border-red-200/80 rounded-2xl text-xs text-red-800 shadow-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#0B1739] mb-1">Project Portfolio Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rohini Campus Phase 1"
              className="w-full px-3.5 py-2 text-xs border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0B1739] mb-1">Organization / Institutional Client</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Delhi Technological University"
              className="w-full px-3.5 py-2 text-xs border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-[#0B1739] mb-1">Indian City / Region</label>
              <input
                type="text"
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                placeholder="New Delhi, Mumbai, Pune..."
                className="w-full px-3.5 py-2 text-xs border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0B1739] mb-1">Coordinates (Lat, Lon)</label>
              <div className="text-xs text-[#0B1739] px-3.5 py-2 bg-white/60 border border-white/80 rounded-xl truncate font-mono font-bold shadow-2xs">
                {latitude.toFixed(3)}° N, {longitude.toFixed(3)}° E
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-[#0B1739] mb-1">Capital Budget (₹ INR) *</label>
              <input
                type="number"
                min="10000"
                step="1000"
                required
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0B1739] mb-1">Grid Tariff (₹ / kWh) *</label>
              <input
                type="number"
                step="0.01"
                min="1.0"
                required
                value={tariff}
                onChange={(e) => setTariff(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
              />
            </div>
          </div>

          <div className="p-4 glass-surface-secondary border border-white/60 rounded-2xl text-xs text-[#61708A] leading-relaxed shadow-2xs">
            <strong className="text-[#0B1739] block mb-1 font-bold">NASA POWER Climatology Integration:</strong>
            Global horizontal and tilted solar irradiance will be retrieved deterministically for these geographic coordinates.
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-[#0B1739] hover:bg-white/80 rounded-xl border border-white/80 bg-white/60 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#FF6B16] hover:bg-[#EA580C] rounded-xl shadow-md transition-all disabled:opacity-50 hover:shadow-lg"
            >
              {loading ? 'Initializing Project...' : 'Initialize Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
