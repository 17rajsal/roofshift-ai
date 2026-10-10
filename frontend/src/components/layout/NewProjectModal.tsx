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
    <div role="dialog" aria-modal="true" aria-label="Create new solar planning project" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg max-h-[90vh] overflow-y-auto w-full shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-900">Initialize Solar Planning Project</h2>
          </div>
          <button onClick={onClose} aria-label="Close new project form" className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200/80 rounded-md text-xs text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Project Portfolio Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rohini Campus Phase 1"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Organization / Institutional Client</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Delhi Technological University"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Indian City / Region</label>
              <input
                type="text"
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                placeholder="New Delhi, Mumbai, Pune..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Coordinates (Lat, Lon)</label>
              <div className="text-xs text-slate-700 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md truncate font-mono">
                {latitude.toFixed(3)}° N, {longitude.toFixed(3)}° E
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Capital Budget (₹ INR) *</label>
              <input
                type="number"
                min="10000"
                step="1000"
                required
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Grid Tariff (₹ / kWh) *</label>
              <input
                type="number"
                step="0.01"
                min="1.0"
                required
                value={tariff}
                onChange={(e) => setTariff(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-900 block mb-0.5 font-medium">NASA POWER Climatology:</strong>
            Global horizontal and tilted solar irradiance will be retrieved deterministically for these geographic coordinates.
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-2xs transition-colors disabled:opacity-50"
            >
              {loading ? 'Initializing Project...' : 'Initialize Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
