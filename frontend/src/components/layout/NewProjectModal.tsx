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
      <div className="bg-white rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-[#123C32] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#F5B942]" />
            <h2 className="text-base font-bold text-white">Create New Solar Planning Project</h2>
          </div>
          <button onClick={onClose} aria-label="Close new project form" className="text-slate-300 hover:text-white p-1 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rohini Campus Phase 1"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Organization / Institution Name</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. Delhi Technical University"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Indian City / Region</label>
              <input
                type="text"
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                placeholder="New Delhi, Mumbai, Pune..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Coordinates (Lat, Lon)</label>
              <div className="text-xs text-slate-500 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg truncate">
                {latitude.toFixed(3)}° N, {longitude.toFixed(3)}° E
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Capital Budget (₹ INR) *</label>
              <input
                type="number"
                min="10000"
                step="1000"
                required
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Grid Tariff (₹ / kWh) *</label>
              <input
                type="number"
                step="0.01"
                min="1.0"
                required
                value={tariff}
                onChange={(e) => setTariff(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-800">
            <strong>Location Solar Source:</strong> NASA POWER satellite climatology data will be mapped automatically based on coordinates.
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-[#123C32] hover:bg-[#0B251F] rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating Project...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
