import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Mail,
  CheckCircle2
} from 'lucide-react';
import { RoofShiftLogo } from './RoofShiftLogo';

export const HomeFooter: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 4000);
      setEmail('');
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-white border-t border-[#E8EDF4] pt-16 pb-12 text-sm text-[#61708A]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-8 pb-12 border-b border-[#E8EDF4]">
          
          {/* Column 1: Branding & Bio (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <RoofShiftLogo iconSize={32} textSize="text-xl" />
            <p className="text-xs sm:text-[13px] leading-relaxed text-[#61708A]">
              Empowering a cleaner, more sustainable future with intelligent rooftop solar planning and integer budget optimization.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-1 text-slate-400">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:text-[#0B1739] hover:border-slate-400 transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:text-[#0B1739] hover:border-slate-400 transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="https://github.com/17rajsal"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center hover:text-[#0B1739] hover:border-slate-400 transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Product (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <button onClick={() => scrollTo('features')} className="hover:text-[#0B1739] transition-colors cursor-pointer">
                  Features
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/map')} className="hover:text-[#0B1739] transition-colors cursor-pointer">
                  Solar Explorer
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/optimize')} className="hover:text-[#0B1739] transition-colors cursor-pointer">
                  Budget Optimizer
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/reports')} className="hover:text-[#0B1739] transition-colors cursor-pointer">
                  PDF Proposals
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/operations')} className="hover:text-[#0B1739] transition-colors cursor-pointer">
                  Asset Operations
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Solutions (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">Solutions</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <span className="hover:text-[#0B1739] cursor-pointer">Commercial Buildings</span>
              </li>
              <li>
                <span className="hover:text-[#0B1739] cursor-pointer">Educational Campuses</span>
              </li>
              <li>
                <span className="hover:text-[#0B1739] cursor-pointer">Multi-Site Portfolios</span>
              </li>
              <li>
                <span className="hover:text-[#0B1739] cursor-pointer">Campus Energy Planning</span>
              </li>
              <li>
                <span className="hover:text-[#0B1739] cursor-pointer">Industrial Rooftops</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Resources (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <button onClick={() => scrollTo('how-it-works')} className="hover:text-[#0B1739] transition-colors cursor-pointer">
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => scrollTo('faq')} className="hover:text-[#0B1739] transition-colors cursor-pointer">
                  FAQ
                </button>
              </li>
              <li>
                <a href="/docs/ARCHITECTURE.md" target="_blank" className="hover:text-[#0B1739] transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="/docs/DATA_SOURCES.md" target="_blank" className="hover:text-[#0B1739] transition-colors">
                  NASA POWER Sources
                </a>
              </li>
            </ul>
          </div>

          {/* Column 5: Stay Updated (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">Stay Updated</h4>
            <p className="text-xs leading-relaxed text-[#61708A]">
              Get the latest product updates and institutional clean energy insights.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full bg-slate-50 border border-[#E8EDF4] rounded-xl pl-3.5 pr-11 py-2.5 text-xs text-[#0B1739] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B16]/20 focus:border-[#FF6B16]"
                />
                <button
                  type="submit"
                  aria-label="Subscribe to newsletter"
                  className="absolute right-1.5 w-8 h-8 rounded-lg bg-[#FF6B16] hover:bg-[#EA580C] text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {subscribed && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 animate-fadeIn">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Thank you! We have registered your contact.</span>
                </div>
              )}
            </form>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © 2026 RoofShift AI — Team DRX. All rights reserved.
          </div>
          <div className="font-medium text-[#61708A]">
            Building a cleaner, brighter tomorrow.
          </div>
        </div>

      </div>
    </footer>
  );
};
