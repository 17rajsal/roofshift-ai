import React, { useState, useEffect } from 'react';
import { X, Building2, Sun, Zap, DollarSign, ShieldAlert, Check } from 'lucide-react';
import { Building } from '../../types/models';
import { api } from '../../services/api';

interface BuildingEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  building: Building | null;
  projectId: string;
  defaultCoordinates?: [number, number];
  defaultRoofPolygon?: [number, number][];
  defaultRoofArea?: number;
  onSaved: (building: Building) => void;
}

export const BuildingEditorModal: React.FC<BuildingEditorModalProps> = ({
  isOpen,
  onClose,
  building,
  projectId,
  defaultCoordinates = [28.6139, 77.2090],
  defaultRoofPolygon,
  defaultRoofArea,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Academic');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(defaultCoordinates[0]);
  const [longitude, setLongitude] = useState(defaultCoordinates[1]);
  const [grossRoofArea, setGrossRoofArea] = useState(300);
  const [usableRoofPct, setUsableRoofPct] = useState(70);
  const [shadingCategory, setShadingCategory] = useState('Low');
  const [customShadingLoss, setCustomShadingLoss] = useState(5);
  const [monthlyConsumption, setMonthlyConsumption] = useState(2000);
  const [daytimePct, setDaytimePct] = useState(65);
  const [costPerKwp, setCostPerKwp] = useState(50000);
  const [fixedCost, setFixedCost] = useState(0);
  const [maxEligibleKwp, setMaxEligibleKwp] = useState<number | undefined>(undefined);
  const [obstaclesNotes, setObstaclesNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (building) {
      setName(building.name);
      setCategory(building.category);
      setAddress(building.address || '');
      setLatitude(building.latitude);
      setLongitude(building.longitude);
      setGrossRoofArea(building.gross_roof_area);
      setUsableRoofPct(building.usable_roof_percentage);
      setShadingCategory(building.shading_category);
      setCustomShadingLoss(building.custom_shading_loss ?? 5);
      setMonthlyConsumption(building.monthly_consumption_kwh);
      setDaytimePct(building.daytime_consumption_pct);
      setCostPerKwp(building.cost_per_kwp);
      setFixedCost(building.fixed_cost);
      setMaxEligibleKwp(building.max_eligible_kwp);
      setObstaclesNotes(building.obstacles_notes || '');
    } else {
      setName('');
      setCategory('Academic');
      setAddress('');
      setLatitude(defaultCoordinates[0]);
      setLongitude(defaultCoordinates[1]);
      setGrossRoofArea(defaultRoofArea ?? 300);
      setUsableRoofPct(70);
      setShadingCategory('Low');
      setCustomShadingLoss(5);
      setMonthlyConsumption(2000);
      setDaytimePct(65);
      setCostPerKwp(50000);
      setFixedCost(0);
      setMaxEligibleKwp(undefined);
      setObstaclesNotes('');
    }
    setError(null);
  }, [building, defaultCoordinates[0], defaultCoordinates[1], defaultRoofArea, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a building name.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const payload: Partial<Building> = {
        name,
        category,
        address,
        latitude,
        longitude,
        gross_roof_area: grossRoofArea,
        usable_roof_percentage: usableRoofPct,
        shading_category: shadingCategory,
        custom_shading_loss: shadingCategory === 'Custom' ? customShadingLoss : undefined,
        monthly_consumption_kwh: monthlyConsumption,
        daytime_consumption_pct: daytimePct,
        cost_per_kwp: costPerKwp,
        fixed_cost: fixedCost,
        max_eligible_kwp: maxEligibleKwp || undefined,
        obstacles_notes: obstaclesNotes,
        roof_polygon: building?.roof_polygon ?? defaultRoofPolygon,
      };

      let result: Building;
      if (building) {
        result = await api.updateBuilding(building.id, payload);
      } else {
        result = await api.createBuilding(projectId, payload);
      }

      onSaved(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save building profile.');
    } finally {
      setLoading(false);
    }
  };

  const calculatedUsable = Math.round(grossRoofArea * (usableRoofPct / 100));
  const estimatedCapacity = (calculatedUsable / 8.0).toFixed(1);

  return (
    <div role="dialog" aria-modal="true" aria-label={building ? `Edit ${building.name}` : 'Add candidate rooftop'} className="fixed inset-0 z-50 bg-[#0B1739]/50 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="glass-elevated rounded-3xl max-w-2xl w-full shadow-2xl border border-white/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200/50 bg-white/60 flex items-center justify-between flex-shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-[#FF6B16] border border-orange-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#0B1739] tracking-tight">
                {building ? `Edit ${building.name} Profile` : 'Register Candidate Rooftop Asset'}
              </h2>
              <p className="text-[11px] text-[#61708A]">Calibrate physical dimensions, usable surface fraction and shading derate</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close rooftop form" className="text-[#61708A] hover:text-[#0B1739] p-2 rounded-xl hover:bg-white/80 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-red-50/80 border border-red-200/80 rounded-2xl text-xs text-red-800 shadow-xs">
              {error}
            </div>
          )}

          {/* Section 1: Identity */}
          <div>
            <h3 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#FF6B16]" />
              <span>Building Identity &amp; Location</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#0B1739] mb-1">Building Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Science Complex Block A"
                  className="w-full px-3.5 py-2 text-xs border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0B1739] mb-1">Facility Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
                >
                  <option value="Academic">Academic Block</option>
                  <option value="Residential">Hostel / Residential</option>
                  <option value="Administrative">Administrative Office</option>
                  <option value="Utility">Auditorium / Dining / Utility</option>
                  <option value="Commercial">Commercial / Complex</option>
                  <option value="Industrial">Workshop / Lab</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#0B1739] mb-1">Campus Location / Address Notes</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. North Quadrangle, Near Central Substation"
                  className="w-full px-3.5 py-2 text-xs border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Roof Geometry & Shading */}
          <div className="border-t border-slate-200/50 pt-5">
            <h3 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sun className="w-4 h-4 text-[#FF6B16]" />
              <span>Rooftop Geometry &amp; Shading Profile</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#0B1739] mb-1">Gross Roof Area (m²) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={grossRoofArea}
                  onChange={(e) => setGrossRoofArea(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-mono font-semibold border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0B1739] mb-1">Usable Area Fraction (%) *</label>
                <input
                  type="number"
                  required
                  min="10"
                  max="100"
                  value={usableRoofPct}
                  onChange={(e) => setUsableRoofPct(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-mono font-semibold border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0B1739] mb-1">Shading Profile</label>
                <select
                  value={shadingCategory}
                  onChange={(e) => setShadingCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
                >
                  <option value="Low">Low (&lt;5% loss)</option>
                  <option value="Medium">Medium (15% loss)</option>
                  <option value="High">High (30% loss)</option>
                  <option value="Custom">Custom Percentage</option>
                </select>
              </div>
            </div>

            {shadingCategory === 'Custom' && (
              <div className="mt-3">
                <label className="block text-xs font-bold text-[#0B1739] mb-1">Custom Shading Derate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="80"
                  value={customShadingLoss}
                  onChange={(e) => setCustomShadingLoss(Number(e.target.value))}
                  className="w-48 px-3.5 py-2 text-xs font-mono font-semibold border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
                />
              </div>
            )}

            {/* Derived preview badge */}
            <div className="mt-4 p-4 glass-surface-secondary border border-white/60 rounded-2xl text-xs text-[#0B1739] flex items-center justify-between font-mono shadow-2xs">
              <span>Usable Area: <strong className="text-[#0B1739] font-bold">{calculatedUsable} m²</strong></span>
              <span>Theoretical Max PV: <strong className="text-[#16A34A] font-bold">~{estimatedCapacity} kWp</strong> (at 8 m²/kWp)</span>
            </div>
          </div>

          {/* Section 3: Electricity Demand & Financials */}
          <div className="border-t border-slate-200/50 pt-5">
            <h3 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FF6B16]" />
              <span>Electricity Demand &amp; Turnkey Capex</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#0B1739] mb-1">Monthly Demand (kWh) *</label>
                <input
                  type="number"
                  required
                  min="100"
                  step="100"
                  value={monthlyConsumption}
                  onChange={(e) => setMonthlyConsumption(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-mono font-semibold border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0B1739] mb-1">Daytime Load Share (%)</label>
                <input
                  type="number"
                  required
                  min="10"
                  max="100"
                  value={daytimePct}
                  onChange={(e) => setDaytimePct(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-mono font-semibold border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0B1739] mb-1">Capex Benchmark (₹/kWp)</label>
                <input
                  type="number"
                  required
                  min="20000"
                  step="1000"
                  value={costPerKwp}
                  onChange={(e) => setCostPerKwp(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs font-mono font-semibold border border-white/80 bg-white/80 rounded-xl focus:border-[#FF6B16] focus:ring-2 focus:ring-[#FF6B16]/20 focus:outline-none text-[#0B1739] shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-200/50 flex items-center justify-end gap-3">
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
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#FF6B16] hover:bg-[#EA580C] rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2 hover:shadow-lg"
            >
              <Check className="w-4 h-4 text-white" />
              <span>{loading ? 'Solving Solar Model...' : 'Save & Calculate Solar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
