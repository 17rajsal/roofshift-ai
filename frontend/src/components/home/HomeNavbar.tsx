import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, LayoutDashboard } from 'lucide-react';
import { RoofShiftLogo } from './RoofShiftLogo';

interface HomeNavbarProps {
  onRequestDemo: () => void;
}

export const HomeNavbar: React.FC<HomeNavbarProps> = ({ onRequestDemo }) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-xs border-b border-[#E8EDF4]'
          : 'bg-white border-b border-[#E8EDF4]/60'
      }`}
    >
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Left: Branding */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="cursor-pointer flex items-center"
        >
          <RoofShiftLogo iconSize={36} textSize="text-2xl" />
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-[#61708A]">
          <button
            onClick={() => scrollToSection('features')}
            className="hover:text-[#0B1739] transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection('solutions')}
            className="hover:text-[#0B1739] transition-colors cursor-pointer"
          >
            Solutions
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="hover:text-[#0B1739] transition-colors cursor-pointer"
          >
            How It Works
          </button>
          <button
            onClick={() => navigate('/solar-features?feature=cost-savings')}
            className="hover:text-[#0B1739] transition-colors cursor-pointer"
          >
            Savings Tools
          </button>
          <button
            onClick={() => scrollToSection('faq')}
            className="hover:text-[#0B1739] transition-colors cursor-pointer"
          >
            FAQ
          </button>
        </nav>

        {/* Right: Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onRequestDemo}
            className="px-5 py-2.5 rounded-lg bg-[#FF6B16] hover:bg-[#EA580C] text-white font-semibold text-sm transition-all shadow-xs hover:shadow hover:-translate-y-0.5 cursor-pointer"
          >
            Request Demo
          </button>

          <button
            onClick={() => navigate('/optimize')}
            className="px-5 py-2.5 rounded-lg border border-[#E8EDF4] hover:border-slate-300 hover:bg-slate-50 text-[#0B1739] font-semibold text-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Sign In</span>
          </button>

          <button
            onClick={() => navigate('/map')}
            className="ml-1 p-2.5 rounded-lg text-slate-500 hover:text-[#0B1739] hover:bg-slate-100 transition-colors cursor-pointer"
            title="Open Full Workspace"
          >
            <LayoutDashboard className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onRequestDemo}
            className="px-3.5 py-1.5 rounded-md bg-[#FF6B16] text-white font-medium text-xs"
          >
            Demo
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E8EDF4] bg-white px-5 py-6 space-y-4 shadow-lg">
          <div className="flex flex-col gap-3 text-base font-medium text-[#61708A]">
            <button
              onClick={() => scrollToSection('features')}
              className="text-left py-2 hover:text-[#0B1739]"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('solutions')}
              className="text-left py-2 hover:text-[#0B1739]"
            >
              Solutions
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-left py-2 hover:text-[#0B1739]"
            >
              How It Works
            </button>
            <button
              onClick={() => navigate('/solar-features?feature=cost-savings')}
              className="text-left py-2 hover:text-[#0B1739]"
            >
              Savings Tools
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="text-left py-2 hover:text-[#0B1739]"
            >
              FAQ
            </button>
          </div>
          <div className="pt-4 border-t border-[#E8EDF4] flex flex-col gap-2.5">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onRequestDemo();
              }}
              className="w-full py-2.5 rounded-lg bg-[#FF6B16] text-white font-semibold text-center text-sm"
            >
              Request Demo
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/optimize');
              }}
              className="w-full py-2.5 rounded-lg border border-[#E8EDF4] text-[#0B1739] font-semibold text-center text-sm flex items-center justify-center gap-1.5"
            >
              <span>Launch Platform</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
