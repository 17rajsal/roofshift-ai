import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents,
  Marker,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Search,
  Sparkles,
  SunMedium,
  Thermometer,
  Wind,
  CloudSun,
  Building2,
  Mountain,
  School,
  ShieldCheck,
  Compass,
  Layers,
  ChevronRight,
  Maximize2,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../services/api';
import { IndiaSolarRegion, IndiaNationalSolarSummary, OsmBuildingItem } from '../../types/models';
import { IndiaSolarLegend, IndiaMapLayer } from './IndiaSolarLegend';
import { IndiaRegionInsightPanel } from './IndiaRegionInsightPanel';
import { IndiaDataProvenanceModal } from './IndiaDataProvenanceModal';
import { CoordinateInspectionDrawer } from './CoordinateInspectionDrawer';

// Fix Leaflet marker icons in Vite bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper component to programmatically pan/zoom map
function MapController({
  selectedRegion,
  clickedCoord,
  resetTrigger,
}: {
  selectedRegion: IndiaSolarRegion | null;
  clickedCoord: { lat: number; lng: number } | null;
  resetTrigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (clickedCoord) {
      map.flyTo([clickedCoord.lat, clickedCoord.lng], 8, {
        duration: 1.2,
      });
    } else if (selectedRegion) {
      map.flyTo([selectedRegion.coordinates.lat, selectedRegion.coordinates.lng], 6, {
        duration: 1.2,
      });
    }
  }, [clickedCoord, selectedRegion, map]);

  useEffect(() => {
    if (resetTrigger > 0) {
      map.flyTo([22.8, 79.5], 5, { duration: 1.2 });
    }
  }, [resetTrigger, map]);

  return null;
}

// Click event listener for arbitrary coordinates
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface IndiaSolarMapProps {
  onDrillDownToSite?: (region: IndiaSolarRegion) => void;
  onOpenSampleCampus?: () => void;
  onStartProjectAtCoordinate?: (params: {
    city: string;
    lat: number;
    lng: number;
    mappedBuildings?: OsmBuildingItem[];
  }) => void;
  className?: string;
}

export const IndiaSolarMap: React.FC<IndiaSolarMapProps> = ({
  onDrillDownToSite,
  onOpenSampleCampus,
  onStartProjectAtCoordinate,
  className = '',
}) => {
  const [regions, setRegions] = useState<IndiaSolarRegion[]>([]);
  const [summary, setSummary] = useState<IndiaNationalSolarSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState<IndiaMapLayer>('composite');
  const [selectedRegion, setSelectedRegion] = useState<IndiaSolarRegion | null>(null);
  const [clickedCoord, setClickedCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [isProvenanceModalOpen, setIsProvenanceModalOpen] = useState(false);
  const [resetViewCount, setResetViewCount] = useState(0);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const results = await api.searchLocation(searchQuery.trim());
      if (results && results.length > 0) {
        const top = results[0];
        setClickedCoord({ lat: top.lat, lng: top.lon });
        setSelectedRegion(null);
      }
    } catch (err) {
      console.warn('Geocoding search failed:', err);
    }
  };

  // Fetch all regions and summary
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        const [regionsData, summaryData] = await Promise.all([
          api.getIndiaSolarRegions(),
          api.getIndiaSolarSummary(),
        ]);
        if (!cancelled) {
          setRegions(regionsData);
          setSummary(summaryData);
          // Default selection to Rajasthan (highest solar corridor) if none selected
          if (!selectedRegion && regionsData.length > 0) {
            const defaultReg = regionsData.find((r) => r.id === 'rajasthan') || regionsData[0];
            setSelectedRegion(defaultReg);
          }
        }
      } catch (err) {
        console.error('Failed to load India solar regions:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter regions based on search query and zone
  const filteredRegions = useMemo(() => {
    return regions.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.short_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.zone_classification.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.key_corridors.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchZone = zoneFilter === 'all' || r.zone.toLowerCase().includes(zoneFilter.toLowerCase());

      return matchSearch && matchZone;
    });
  }, [regions, searchQuery, zoneFilter]);

  // Color & Radius calculations per layer
  const getCircleStyle = (region: IndiaSolarRegion) => {
    const isSelected = selectedRegion?.id === region.id;

    switch (activeLayer) {
      case 'ghi': {
        const val = region.ghi_daily_kwh;
        let color = '#FCD34D'; // Moderate
        if (val >= 5.6) color = '#D97706';
        else if (val >= 5.2) color = '#FF6B16';
        else if (val >= 4.5) color = '#F59E0B';
        return {
          fillColor: color,
          color: isSelected ? '#0F172A' : color,
          radius: 20 + (val - 4.0) * 8,
          weight: isSelected ? 3 : 1.5,
          fillOpacity: isSelected ? 0.85 : 0.65,
        };
      }
      case 'temp': {
        const val = region.ambient_temp_celsius;
        let color = '#FDE047';
        if (val < 15) color = '#67E8F9';
        else if (val >= 32) color = '#E11D48';
        else if (val >= 28) color = '#F97316';
        return {
          fillColor: color,
          color: isSelected ? '#0F172A' : color,
          radius: 18 + (val / 35) * 10,
          weight: isSelected ? 3 : 1.5,
          fillOpacity: isSelected ? 0.85 : 0.65,
        };
      }
      case 'wind': {
        const val = region.wind_speed_ms;
        let color = '#94A3B8';
        if (val >= 5.0) color = '#1D4ED8';
        else if (val >= 4.0) color = '#0284C7';
        else if (val >= 3.0) color = '#38BDF8';
        return {
          fillColor: color,
          color: isSelected ? '#0F172A' : color,
          radius: 18 + val * 2.5,
          weight: isSelected ? 3 : 1.5,
          fillOpacity: isSelected ? 0.85 : 0.65,
        };
      }
      case 'cloud': {
        const val = region.cloud_monsoon_pct;
        let color = '#FDE68A';
        if (val >= 45) color = '#4338CA';
        else if (val >= 35) color = '#818CF8';
        else if (val >= 20) color = '#7DD3FC';
        return {
          fillColor: color,
          color: isSelected ? '#0F172A' : color,
          radius: 18 + (val / 55) * 10,
          weight: isSelected ? 3 : 1.5,
          fillOpacity: isSelected ? 0.85 : 0.65,
        };
      }
      case 'rooftop': {
        const val = region.rooftop_suitability_score;
        let color = '#A7F3D0';
        if (val >= 92) color = '#047857';
        else if (val >= 85) color = '#10B981';
        else if (val >= 75) color = '#34D399';
        return {
          fillColor: color,
          color: isSelected ? '#0F172A' : color,
          radius: 18 + ((val - 70) / 30) * 12,
          weight: isSelected ? 3 : 1.5,
          fillOpacity: isSelected ? 0.85 : 0.65,
        };
      }
      case 'openland': {
        const val = region.open_land_suitability_score;
        let color = '#FDE68A';
        if (val >= 92) color = '#B45309';
        else if (val >= 80) color = '#D97706';
        else if (val >= 60) color = '#FBBF24';
        return {
          fillColor: color,
          color: isSelected ? '#0F172A' : color,
          radius: 18 + ((val - 50) / 50) * 12,
          weight: isSelected ? 3 : 1.5,
          fillOpacity: isSelected ? 0.85 : 0.65,
        };
      }
      case 'composite':
      default: {
        const val = region.ai_suitability_composite;
        let color = '#64748B';
        if (val >= 92) color = '#FF6B16';
        else if (val >= 85) color = '#10B981';
        else if (val >= 75) color = '#3B82F6';
        return {
          fillColor: color,
          color: isSelected ? '#0F172A' : color,
          radius: 20 + ((val - 70) / 30) * 12,
          weight: isSelected ? 3 : 1.5,
          fillOpacity: isSelected ? 0.85 : 0.7,
        };
      }
    }
  };

  const getLayerDisplayValue = (region: IndiaSolarRegion) => {
    switch (activeLayer) {
      case 'ghi':
        return `${region.ghi_daily_kwh} kWh/m²`;
      case 'temp':
        return `${region.ambient_temp_celsius}°C`;
      case 'wind':
        return `${region.wind_speed_ms} m/s`;
      case 'cloud':
        return `${region.cloud_monsoon_pct}% cloud`;
      case 'rooftop':
        return `${region.rooftop_suitability_score} / 100`;
      case 'openland':
        return `${region.open_land_suitability_score} / 100`;
      case 'composite':
      default:
        return `${region.ai_suitability_composite} / 100`;
    }
  };

  return (
    <div className={`relative flex flex-col h-[740px] w-full rounded-3xl overflow-hidden border border-slate-200/90 shadow-xl bg-white ${className}`}>
      {/* 1. Top Integrated Control Bar */}
      <div className="relative z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search & Zone Filter */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search state, city, or coordinates... (hit Enter)"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-2xl bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-orange-500/40 text-[#0B1739] placeholder:text-slate-400 focus:outline-hidden transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </form>

          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-2xl bg-slate-100/90 border border-slate-200/80 text-slate-700 font-semibold focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Zones ({regions.length})</option>
            <option value="Arid">North-West Arid</option>
            <option value="Deccan">Deccan & South</option>
            <option value="Gangetic">Gangetic Plains</option>
            <option value="Coast">Coastal Belts</option>
            <option value="Himalayan">Himalayan Cold</option>
          </select>
        </div>

        {/* Center/Right: Quick Action & Provenance Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setResetViewCount((c) => c + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
            title="Reset to All-India View"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Reset Map</span>
          </button>

          <button
            onClick={() => onOpenSampleCampus && onOpenSampleCampus()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-[#FF6B16] border border-orange-500/20 text-xs font-bold transition-all cursor-pointer"
            title="Inspect 5-building BITS Pilani sample campus portfolio"
          >
            <School className="w-3.5 h-3.5" />
            <span>Sample Campus Demo</span>
          </button>

          <button
            onClick={() => setIsProvenanceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Data Provenance</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Layer Selector Bar */}
      <div className="relative z-20 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200/80 px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <Layers className="w-3 h-3" />
          Intelligence Layer:
        </span>

        <button
          onClick={() => setActiveLayer('composite')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            activeLayer === 'composite'
              ? 'bg-[#FF6B16] text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Engineering Suitability Index</span>
        </button>

        <button
          onClick={() => setActiveLayer('ghi')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            activeLayer === 'ghi'
              ? 'bg-[#FF6B16] text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
          }`}
        >
          <SunMedium className="w-3.5 h-3.5 text-amber-500" />
          <span>Solar Irradiance (GHI)</span>
        </button>

        <button
          onClick={() => setActiveLayer('rooftop')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            activeLayer === 'rooftop'
              ? 'bg-[#FF6B16] text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Rooftop Solar Opportunity</span>
        </button>

        <button
          onClick={() => setActiveLayer('openland')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            activeLayer === 'openland'
              ? 'bg-[#FF6B16] text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
          }`}
        >
          <Mountain className="w-3.5 h-3.5 text-amber-600" />
          <span>Open-Land Solar Farms</span>
        </button>

        <button
          onClick={() => setActiveLayer('temp')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            activeLayer === 'temp'
              ? 'bg-[#FF6B16] text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
          }`}
        >
          <Thermometer className="w-3.5 h-3.5 text-rose-500" />
          <span>Ambient Temperature</span>
        </button>

        <button
          onClick={() => setActiveLayer('wind')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            activeLayer === 'wind'
              ? 'bg-[#FF6B16] text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
          }`}
        >
          <Wind className="w-3.5 h-3.5 text-sky-500" />
          <span>Wind & Cooling</span>
        </button>

        <button
          onClick={() => setActiveLayer('cloud')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
            activeLayer === 'cloud'
              ? 'bg-[#FF6B16] text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
          }`}
        >
          <CloudSun className="w-3.5 h-3.5 text-indigo-500" />
          <span>Monsoon Attenuation</span>
        </button>
      </div>

      {/* 3. Main Leaflet Map View */}
      <div className="relative flex-1 w-full bg-[#EAF2F8] overflow-hidden">
        <MapContainer
          center={[22.8, 79.5]}
          zoom={5}
          minZoom={4}
          maxZoom={9}
          maxBounds={[
            [6.0, 65.0],
            [38.0, 98.0],
          ]}
          zoomControl={false}
          className="h-full w-full"
        >
          <ZoomControl position="bottomleft" />
          <MapController
            selectedRegion={selectedRegion}
            clickedCoord={clickedCoord}
            resetTrigger={resetViewCount}
          />
          <MapClickHandler
            onMapClick={(lat, lng) => {
              setClickedCoord({ lat, lng });
              setSelectedRegion(null);
            }}
          />

          {/* Clean OpenStreetMap basemap tiles for high readability */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Render Clicked Coordinate Pin Marker */}
          {clickedCoord && (
            <Marker position={[clickedCoord.lat, clickedCoord.lng]} />
          )}

          {/* Render All Filtered Indian Solar Regions as Interactive Heat Hotspots */}
          {filteredRegions.map((region) => {
            const circleStyle = getCircleStyle(region);
            const isSelected = selectedRegion?.id === region.id;

            return (
              <CircleMarker
                key={region.id}
                center={[region.coordinates.lat, region.coordinates.lng]}
                radius={circleStyle.radius}
                pathOptions={{
                  fillColor: circleStyle.fillColor,
                  color: circleStyle.color,
                  weight: circleStyle.weight,
                  fillOpacity: circleStyle.fillOpacity,
                }}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e as any);
                    setSelectedRegion(region);
                    setClickedCoord(null);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                  <div className="p-1 text-center font-sans">
                    <div className="font-extrabold text-[12px] text-[#0F172A] flex items-center justify-center gap-1">
                      <span>{region.name}</span>
                      <span className="text-[10px] text-orange-600 font-bold px-1.5 py-0.2 rounded-full bg-orange-100">
                        {region.suitability_tier}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                      {getLayerDisplayValue(region)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Click to inspect AI profile
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Floating Active Layer Legend (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-1000 pointer-events-auto">
          <IndiaSolarLegend activeLayer={activeLayer} />
        </div>

        {/* Floating Coordinate Inspection Drawer (when specific coordinate clicked or searched) */}
        {clickedCoord && (
          <CoordinateInspectionDrawer
            lat={clickedCoord.lat}
            lng={clickedCoord.lng}
            onClose={() => setClickedCoord(null)}
            onStartProject={(params) => {
              if (onStartProjectAtCoordinate) {
                onStartProjectAtCoordinate(params);
              }
            }}
          />
        )}

        {/* Floating Smart Area Insight Panel (when region selected and no specific coordinate is open) */}
        {!clickedCoord && selectedRegion && (
          <IndiaRegionInsightPanel
            region={selectedRegion}
            onClose={() => setSelectedRegion(null)}
            onDrillDownToSite={(reg) => {
              if (onDrillDownToSite) onDrillDownToSite(reg);
            }}
            onOpenSampleCampus={() => {
              if (onOpenSampleCampus) onOpenSampleCampus();
            }}
          />
        )}
      </div>

      {/* Transparent Data Provenance Modal */}
      <IndiaDataProvenanceModal
        isOpen={isProvenanceModalOpen}
        onClose={() => setIsProvenanceModalOpen(false)}
      />
    </div>
  );
};
