import React from 'react';

interface RoofShiftLogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export const RoofShiftLogo: React.FC<RoofShiftLogoProps> = ({
  className = '',
  iconSize = 34,
  textSize = 'text-2xl',
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      <div className="relative flex items-center justify-center flex-shrink-0">
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Sun disc */}
          <circle cx="20" cy="18" r="7.5" fill="#FF6B16" />
          
          {/* Sunburst Rays */}
          <line x1="20" y1="3" x2="20" y2="7.5" stroke="#FF6B16" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="9.4" y1="7.4" x2="12.6" y2="10.6" stroke="#FF6B16" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="30.6" y1="7.4" x2="27.4" y2="10.6" stroke="#FF6B16" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="5" y1="18" x2="9.5" y2="18" stroke="#FF6B16" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="35" y1="18" x2="30.5" y2="18" stroke="#FF6B16" strokeWidth="2.5" strokeLinecap="round" />
          
          {/* Main Roof Pitch Outline */}
          <path
            d="M6 27L20 14L34 27"
            stroke="#0B1739"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Inner Photovoltaic Ridge */}
          <path
            d="M12 24L20 16.5L28 24"
            stroke="#FF6B16"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* PV String grid markers */}
          <line x1="16" y1="23" x2="17.5" y2="28" stroke="#0B1739" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="24" y1="23" x2="22.5" y2="28" stroke="#0B1739" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <span className={`${textSize} font-extrabold tracking-tight leading-none`}>
        <span className="text-[#0B1739]">RoofShift</span>{' '}
        <span className="text-[#FF6B16]">AI</span>
      </span>
    </div>
  );
};
