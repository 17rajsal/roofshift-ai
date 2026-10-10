import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle2, Sparkles, ArrowRight, Building2 } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

interface DemoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoRequestModal: React.FC<DemoRequestModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { loadDemoProject } = useProject();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    city: 'New Delhi',
    bill: '50000',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleLaunchLiveDemo = async () => {
    setLoading(true);
    try {
      await loadDemoProject();
      onClose();
      navigate('/optimize');
    } catch {
      onClose();
      navigate('/map');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E8EDF4] shadow-2xl overflow-hidden relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#16A34A] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#0B1739]">Local Demo Preview Ready</h3>
            <p className="text-sm text-[#61708A] leading-relaxed">
              This is a local walkthrough preview. These details remain in this browser page; no booking request or site assessment has been sent to a team.
            </p>
            <div className="pt-4 flex flex-col gap-2.5">
              <button
                onClick={handleLaunchLiveDemo}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#FF6B16] hover:bg-[#EA580C] text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Loading Campus…' : 'Launch Interactive Campus Demo Now →'}</span>
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Back to Website
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#FFF4E9] text-[#FF6B16] font-semibold text-xs w-fit mb-3">
              <Building2 className="w-3.5 h-3.5" />
              <span>Institutional Pilot Program</span>
            </div>
            <h3 className="text-2xl font-black text-[#0B1739] tracking-tight">
              Explore a Campus Walkthrough
            </h3>
            <p className="text-xs sm:text-sm text-[#61708A] mt-1 mb-6">
              Explore the seeded campus demo and its planning tools. This form prepares a local preview and does not contact a team.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8EDF4] text-xs text-[#0B1739] focus:outline-none focus:ring-2 focus:ring-[#FF6B16]/20 focus:border-[#FF6B16]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@institution.edu"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8EDF4] text-xs text-[#0B1739] focus:outline-none focus:ring-2 focus:ring-[#FF6B16]/20 focus:border-[#FF6B16]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0B1739] mb-1">Organization / Campus Name</label>
                <input
                  type="text"
                  required
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="e.g. Delhi Technological University"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8EDF4] text-xs text-[#0B1739] focus:outline-none focus:ring-2 focus:ring-[#FF6B16]/20 focus:border-[#FF6B16]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1">City / Region</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="New Delhi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8EDF4] text-xs text-[#0B1739] focus:outline-none focus:ring-2 focus:ring-[#FF6B16]/20 focus:border-[#FF6B16]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0B1739] mb-1">Monthly Power Bill (₹)</label>
                  <input
                    type="text"
                    value={formData.bill}
                    onChange={(e) => setFormData({ ...formData, bill: e.target.value })}
                    placeholder="₹50,000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8EDF4] text-xs text-[#0B1739] focus:outline-none focus:ring-2 focus:ring-[#FF6B16]/20 focus:border-[#FF6B16]"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  className="w-full sm:flex-1 py-3 rounded-xl bg-[#FF6B16] hover:bg-[#EA580C] text-white font-bold text-sm transition-all shadow-md cursor-pointer text-center"
                >
                  Prepare Local Walkthrough
                </button>
                <button
                  type="button"
                  onClick={handleLaunchLiveDemo}
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-[#0B1739] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Quick Test</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
