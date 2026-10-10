import React, { useEffect, useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  Polygon,
  Polyline,
  CircleMarker,
  Circle,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { Building, GeocodeResult } from '../../types/models';
import { api } from '../../services/api';
import { formatArea, formatEnergy, formatINR, formatPower } from '../../utils/formatters';
import {
  Search,
  MapPin,
  Plus,
  Flame,
  Layers,
  Sparkles,
  Maximize2,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sun,
  Zap,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { isSimpleRoofOutline, readRoofOutline, roofAreaSquareMeters, type RoofPoint } from '../../utils/roofGeometry';
import {
  computeBuildingSolarMetrics,
  getBuildingMetricColor,
  MetricVisualizationMode,
  SolarSuitabilityMetrics,
} from '../../utils/solarSuitability';
import {
  ThermalMode,
  ThermalDataProvenance,
  PanelGroupThermalData,
  getThermalColor,
  getDiagnosticStatusBadge,
} from '../../utils/thermalIntelligence';
import { SolarMapLegend } from './SolarMapLegend';
import { ThermalMapLegend } from './ThermalMapLegend';

// Fix Leaflet marker icons in Vite bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create custom numeric score badge marker
const createScoreMarker = (
  score: number,
  colorHex: string,
  isSelected: boolean,
  isTopCandidate: boolean
) => {
  return L.divIcon({
    className: 'custom-solar-score-badge',
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: ${colorHex};
        color: #ffffff;
        font-weight: 800;
        font-size: 11px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        border: ${isSelected ? '3px solid #0B1739' : '2px solid #ffffff'};
        box-shadow: ${
          isSelected
            ? '0 0 0 4px rgba(255, 107, 22, 0.7), 0 8px 18px rgba(0,0,0,0.45)'
            : '0 4px 10px rgba(0,0,0,0.3)'
        };
        cursor: pointer;
        transition: transform 0.15s ease;
      ">
        ${score}
        ${
          isTopCandidate
            ? `<span style="position: absolute; top: -3px; right: -3px; width: 10px; height: 10px; background: #FF6B16; border-radius: 50%; border: 1.5px solid white;"></span>`
            : ''
        }
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

function MapViewController({
  center,
  zoom,
  fitAllTrigger,
  buildings,
}: {
  center: [number, number];
  zoom: number;
  fitAllTrigger: number;
  buildings: Building[];
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: false });
  }, [center, zoom, map]);

  useEffect(() => {
    if (fitAllTrigger > 0 && buildings.length > 0) {
      const bounds = L.latLngBounds(buildings.map((b) => [b.latitude, b.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }
  }, [fitAllTrigger, buildings, map]);

  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e: any) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export interface SolarMapProps {
  buildings: Building[];
  selectedBuildingId?: string | null;
  onSelectBuilding: (building: Building) => void;
  onAddBuildingAtCoord: (lat: number, lng: number) => void;
  onAddRoofOutline: (points: RoofPoint[], area: number) => void;
  defaultCenter?: [number, number];
  metricMode?: MetricVisualizationMode;
  onMetricModeChange?: (mode: MetricVisualizationMode) => void;
  thermalMode?: ThermalMode;
  onThermalModeChange?: (mode: ThermalMode) => void;
  panelGroups?: PanelGroupThermalData[];
  selectedPanelGroupId?: string | null;
  onSelectPanelGroup?: (panelGroup: PanelGroupThermalData) => void;
  minTempC?: number;
  maxTempC?: number;
  provenance?: ThermalDataProvenance;
  categoryFilter?: string;
  onCategoryFilterChange?: (cat: string) => void;
  tierFilter?: string;
  onTierFilterChange?: (tier: string) => void;
  tileLayerMode?: 'satellite' | 'street' | 'light';
  onTileLayerModeChange?: (tile: 'satellite' | 'street' | 'light') => void;
  showHeatLayer?: boolean;
  onToggleHeatLayer?: (show: boolean) => void;
  showPolygons?: boolean;
  onTogglePolygons?: (show: boolean) => void;
  showBadges?: boolean;
  onToggleBadges?: (show: boolean) => void;
}

export const SolarMap: React.FC<SolarMapProps> = ({
  buildings,
  selectedBuildingId,
  onSelectBuilding,
  onAddBuildingAtCoord,
  onAddRoofOutline,
  defaultCenter = [28.6139, 77.209],
  metricMode = 'suitability',
  onMetricModeChange,
  thermalMode = 'thermal',
  onThermalModeChange,
  panelGroups = [],
  selectedPanelGroupId,
  onSelectPanelGroup,
  minTempC = 38.0,
  maxTempC = 68.0,
  provenance = 'SAMPLE',
  categoryFilter = 'All',
  onCategoryFilterChange,
  tierFilter = 'All',
  onTierFilterChange,
  tileLayerMode = 'satellite',
  onTileLayerModeChange,
  showHeatLayer = true,
  onToggleHeatLayer,
  showPolygons = true,
  onTogglePolygons,
  showBadges = true,
  onToggleBadges,
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(17);
  const [fitAllTrigger, setFitAllTrigger] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Interactive Rooftop Drawing State
  const [drawing, setDrawing] = useState(false);
  const [outline, setOutline] = useState<RoofPoint[]>([]);
  const [showAddHint, setShowAddHint] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);

  // Internal layer controls fallback if not controlled
  const [localMetricMode, setLocalMetricMode] = useState<MetricVisualizationMode>(metricMode);
  const activeMetricMode = onMetricModeChange ? metricMode : localMetricMode;

  const [localThermalMode, setLocalThermalMode] = useState<ThermalMode>(thermalMode);
  const activeThermalMode = onThermalModeChange ? thermalMode : localThermalMode;

  const [localTileMode, setLocalTileMode] = useState<'satellite' | 'street' | 'light'>(tileLayerMode);
  const activeTileMode = onTileLayerModeChange ? tileLayerMode : localTileMode;

  const [localShowHeat, setLocalShowHeat] = useState<boolean>(showHeatLayer);
  const activeShowHeat = onToggleHeatLayer ? showHeatLayer : localShowHeat;

  const [localShowPolygons, setLocalShowPolygons] = useState<boolean>(showPolygons);
  const activeShowPolygons = onTogglePolygons ? showPolygons : localShowPolygons;

  const [localShowBadges, setLocalShowBadges] = useState<boolean>(showBadges);
  const activeShowBadges = onToggleBadges ? showBadges : localShowBadges;

  // Thermal Overlay Opacity (slider control)
  const [thermalOpacity, setThermalOpacity] = useState<number>(0.75);

  // Precompute metrics for all buildings
  const buildingsWithMetrics = useMemo(() => {
    return buildings.map((b) => {
      const metrics = computeBuildingSolarMetrics(b);
      const metricColor = getBuildingMetricColor(b, activeMetricMode, metrics);
      return {
        building: b,
        metrics,
        metricColor,
      };
    });
  }, [buildings, activeMetricMode]);

  // Tier counts for legend
  const tierCounts = useMemo(() => {
    const counts = { excellent: 0, good: 0, moderate: 0, low: 0, poor: 0 };
    buildingsWithMetrics.forEach(({ metrics }) => {
      if (metrics.tier === 'Excellent') counts.excellent++;
      else if (metrics.tier === 'Good') counts.good++;
      else if (metrics.tier === 'Moderate') counts.moderate++;
      else if (metrics.tier === 'Low') counts.low++;
      else counts.poor++;
    });
    return counts;
  }, [buildingsWithMetrics]);

  // Filtered buildings
  const filteredBuildingsWithMetrics = useMemo(() => {
    return buildingsWithMetrics.filter(({ building, metrics }) => {
      if (categoryFilter !== 'All' && building.category !== categoryFilter) {
        return false;
      }
      if (tierFilter !== 'All' && metrics.tier !== tierFilter) {
        return false;
      }
      return true;
    });
  }, [buildingsWithMetrics, categoryFilter, tierFilter]);

  // Center on selection
  useEffect(() => {
    if (selectedBuildingId) {
      const b = buildings.find((x) => x.id === selectedBuildingId);
      if (b) {
        setMapCenter([b.latitude, b.longitude]);
        setMapZoom(17);
      }
    }
  }, [selectedBuildingId, buildings]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setSearchError(null);
      const results = await api.searchLocation(searchQuery);
      setSearchResults(results);
      if (results.length > 0) {
        setMapCenter([results[0].lat, results[0].lon]);
        setMapZoom(16);
      } else {
        setSearchError('No matching location found. Try a nearby city or campus.');
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Location search is unavailable. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const finishOutline = () => {
    if (!isSimpleRoofOutline(outline)) {
      setDrawError('Draw at least three distinct corners without crossing edges. The roof must cover at least 1 m².');
      return;
    }
    onAddRoofOutline(outline, Math.round(roofAreaSquareMeters(outline) * 100) / 100);
    setDrawing(false);
    setOutline([]);
    setDrawError(null);
  };

  // Tile layer configuration
  const tileConfig = {
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19,
    },
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
    light: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> Positron',
      maxZoom: 20,
    },
  }[activeTileMode];

  return (
    <div className="relative isolate z-0 w-full h-[650px] rounded-2xl overflow-hidden border border-slate-200/90 shadow-lg bg-slate-950 flex flex-col">
      {/* Top Controls Overlay */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Search Input */}
        <form onSubmit={handleSearch} className="pointer-events-auto relative w-full sm:w-64">
          <div className="flex items-center bg-white/95 backdrop-blur-md rounded-lg shadow-md border border-slate-200/90 overflow-hidden">
            <Search className="w-3.5 h-3.5 text-slate-400 ml-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campus or city..."
              aria-label="Search map location"
              className="w-full px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 text-xs font-semibold transition-colors"
            >
              {isSearching ? '...' : 'Go'}
            </button>
          </div>
          {searchError && (
            <p role="alert" className="mt-1 rounded-md bg-white p-1.5 text-[11px] text-red-700 shadow border border-red-200">
              {searchError}
            </p>
          )}

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50">
              {searchResults.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMapCenter([r.lat, r.lon]);
                    setMapZoom(16);
                    setSearchResults([]);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                >
                  <span className="truncate text-slate-700">{r.display_name}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">{r.source}</span>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* 4 Map Modes Segmented Switcher (Center-Right) */}
        <div className="pointer-events-auto flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-xl text-xs">
          <button
            type="button"
            onClick={() => {
              setLocalThermalMode('satellite');
              onThermalModeChange?.('satellite');
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeThermalMode === 'satellite'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Satellite</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLocalThermalMode('potential');
              onThermalModeChange?.('potential');
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeThermalMode === 'potential'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Solar Potential</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLocalThermalMode('thermal');
              onThermalModeChange?.('thermal');
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeThermalMode === 'thermal'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Thermal Heatmap</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLocalThermalMode('health');
              onThermalModeChange?.('health');
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              activeThermalMode === 'health'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Fault &amp; Health</span>
          </button>
        </div>

        {/* Quick Toolbar: Tiles, Opacity, Drawing */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-md border border-slate-200/90 text-xs">
          {/* Base Tile Layer Switcher */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setLocalTileMode('satellite');
                onTileLayerModeChange?.('satellite');
              }}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${
                activeTileMode === 'satellite' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Satellite HD
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalTileMode('street');
                onTileLayerModeChange?.('street');
              }}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${
                activeTileMode === 'street' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Street
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalTileMode('light');
                onTileLayerModeChange?.('light');
              }}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors ${
                activeTileMode === 'light' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Light
            </button>
          </div>

          {/* Opacity Slider for Thermal Heatmap Mode */}
          {activeThermalMode === 'thermal' && (
            <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2 py-0.5 border border-slate-200">
              <SlidersHorizontal className="w-3 h-3 text-slate-500" />
              <input
                type="range"
                min="0.3"
                max="0.95"
                step="0.05"
                value={thermalOpacity}
                onChange={(e) => setThermalOpacity(parseFloat(e.target.value))}
                className="w-16 accent-orange-500 h-1"
                title="Thermal Heatmap Opacity"
              />
              <span className="text-[10px] font-mono text-slate-600">{Math.round(thermalOpacity * 100)}%</span>
            </div>
          )}

          {/* Fit all buildings */}
          <button
            type="button"
            onClick={() => setFitAllTrigger((prev) => prev + 1)}
            title="Fit view to all campus rooftops"
            className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200" />

          {/* Add & Draw Buttons */}
          <button
            type="button"
            onClick={() => {
              setShowAddHint(!showAddHint);
              setDrawing(false);
              setOutline([]);
              setDrawError(null);
            }}
            aria-pressed={showAddHint}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              showAddHint ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>Pin Roof</span>
          </button>

          <button
            type="button"
            aria-pressed={drawing}
            onClick={() => {
              setDrawing(!drawing);
              setShowAddHint(false);
              setOutline([]);
              setDrawError(null);
            }}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              drawing ? 'bg-amber-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            Draw Roof
          </button>
        </div>
      </div>

      {/* Floating Bottom Left Legend */}
      <div className="absolute bottom-4 left-4 z-[400] pointer-events-auto">
        {activeThermalMode === 'potential' ? (
          <SolarMapLegend mode={activeMetricMode} tierCounts={tierCounts} />
        ) : (
          <ThermalMapLegend
            mode={activeThermalMode}
            minTempC={minTempC}
            maxTempC={maxTempC}
            provenance={provenance}
          />
        )}
      </div>

      {/* Active Roof Boundary Drawing Instruction Box */}
      {drawing && (
        <div className="absolute bottom-4 left-4 right-16 sm:left-auto sm:right-16 z-[400] rounded-xl border border-amber-300 bg-white/95 backdrop-blur-md p-3.5 shadow-xl text-xs max-w-md">
          <p className="font-bold text-slate-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Click each rooftop corner in sequence</span>
          </p>
          <p className="mt-1 text-slate-600 text-[11px]">
            {outline.length} corners placed · Est. Area: <strong className="text-slate-900">{formatArea(roofAreaSquareMeters(outline))}</strong>
          </p>
          {drawError && <p role="alert" className="mt-1 text-red-700 text-[11px] font-medium">{drawError}</p>}
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={finishOutline}
              disabled={outline.length < 3}
              className="rounded-md bg-amber-600 hover:bg-amber-700 px-3 py-1.5 font-semibold text-white text-xs disabled:opacity-50 transition-colors shadow-2xs"
            >
              Use this roof
            </button>
            <button
              disabled={!outline.length}
              onClick={() => {
                setOutline((points) => points.slice(0, -1));
                setDrawError(null);
              }}
              className="rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 text-xs disabled:opacity-50"
            >
              Undo corner
            </button>
            <button
              onClick={() => {
                setDrawing(false);
                setOutline([]);
                setDrawError(null);
              }}
              className="rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Prompt Banner for Map Pin placement */}
      {showAddHint && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[400] bg-slate-900 text-white px-4 py-2 rounded-full shadow-2xl text-xs font-medium flex items-center gap-2 border border-slate-700 animate-bounce">
          <MapPin className="w-4 h-4 text-amber-400" />
          <span>Click anywhere on the map to place a candidate rooftop!</span>
        </div>
      )}

      {/* Leaflet Map Canvas */}
      <MapContainer
        zoomAnimation={false}
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full"
      >
        <ZoomControl position="bottomright" />
        <MapViewController center={mapCenter} zoom={mapZoom} fitAllTrigger={fitAllTrigger} buildings={buildings} />

        <MapClickHandler
          onMapClick={(lat, lng) => {
            if (drawing) {
              setOutline((points) => [...points, [lat, lng]]);
              setDrawError(null);
            } else if (showAddHint) {
              setShowAddHint(false);
              onAddBuildingAtCoord(lat, lng);
            }
          }}
        />

        {/* Base Tile Layer */}
        <TileLayer url={tileConfig.url} attribution={tileConfig.attribution} maxZoom={tileConfig.maxZoom} />

        {/* In-Progress Drawn Outline */}
        {outline.length >= 3 ? (
          <Polygon positions={outline} pathOptions={{ color: '#FF6B16', weight: 2, fillOpacity: 0.25 }} interactive={false} />
        ) : outline.length >= 2 ? (
          <Polyline positions={outline} pathOptions={{ color: '#FF6B16', weight: 2 }} interactive={false} />
        ) : null}
        {outline.map((point, index) => (
          <CircleMarker
            key={index}
            center={point}
            radius={4}
            pathOptions={{ color: '#0B1739', fillColor: '#FF6B16', fillOpacity: 1 }}
            interactive={false}
          />
        ))}

        {/* 1. Solar Heat / Radiant Potential Halos (ONLY shown in Solar Potential mode) */}
        {activeThermalMode === 'potential' &&
          activeShowHeat &&
          filteredBuildingsWithMetrics.map(({ building, metricColor }) => {
            const isSelected = building.id === selectedBuildingId;
            return (
              <React.Fragment key={`heat-halo-${building.id}`}>
                <Circle
                  center={[building.latitude, building.longitude]}
                  radius={isSelected ? 65 : 50}
                  pathOptions={{
                    stroke: false,
                    fillColor: metricColor.colorHex,
                    fillOpacity: isSelected ? 0.22 : 0.12,
                  }}
                  interactive={false}
                />
                <Circle
                  center={[building.latitude, building.longitude]}
                  radius={isSelected ? 38 : 28}
                  pathOptions={{
                    stroke: false,
                    fillColor: metricColor.colorHex,
                    fillOpacity: isSelected ? 0.35 : 0.22,
                  }}
                  interactive={false}
                />
                <Circle
                  center={[building.latitude, building.longitude]}
                  radius={isSelected ? 18 : 14}
                  pathOptions={{
                    stroke: false,
                    fillColor: metricColor.colorHex,
                    fillOpacity: isSelected ? 0.55 : 0.38,
                  }}
                  interactive={false}
                />
              </React.Fragment>
            );
          })}

        {/* 2. Building Rooftop Base Polygons */}
        {activeShowPolygons &&
          filteredBuildingsWithMetrics.map(({ building, metricColor, metrics }) => {
            const points = readRoofOutline(building.roof_polygon);
            if (!points) return null;
            const isSelected = building.id === selectedBuildingId;

            // In Satellite or Thermal mode, keep building outlines subtle
            const outlineColor =
              activeThermalMode === 'potential'
                ? metricColor.colorHex
                : isSelected
                ? '#FF6B16'
                : '#38BDF8';
            const fillCol =
              activeThermalMode === 'potential' ? metricColor.colorHex : '#0F172A';
            const fillOp = activeThermalMode === 'potential' ? (isSelected ? 0.6 : 0.35) : 0.15;

            return (
              <Polygon
                key={`roof-polygon-${building.id}`}
                positions={points}
                pathOptions={{
                  color: outlineColor,
                  weight: isSelected ? 3 : 1.5,
                  fillColor: fillCol,
                  fillOpacity: fillOp,
                  dashArray: activeThermalMode !== 'potential' ? '3, 3' : undefined,
                }}
                eventHandlers={{
                  click: () => {
                    if (!drawing && !showAddHint) onSelectBuilding(building);
                  },
                }}
              >
                <Tooltip sticky direction="top" className="custom-roof-tooltip">
                  <div className="p-1 text-xs font-sans">
                    <strong className="block text-slate-900">{building.name}</strong>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {formatArea(building.usable_roof_area)} • {metrics.estimatedCapacityKwp} kWp
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

        {/* 3. Panel Group Strings: Thermal Overlay & Health Status Polygons */}
        {panelGroups.map((group) => {
          const isSelected = group.id === selectedPanelGroupId;
          const statusBadge = getDiagnosticStatusBadge(group.diagnosticStatus);

          // Determine polygon fill color based on active mode
          let polygonFillColor = '#38BDF8';
          let polygonStrokeColor = '#0B1739';
          let polygonFillOpacity = 0.25;

          if (activeThermalMode === 'thermal') {
            polygonFillColor = getThermalColor(group.surfaceTempC, minTempC, maxTempC);
            polygonStrokeColor = isSelected ? '#FFFFFF' : '#0B1739';
            polygonFillOpacity = thermalOpacity;
          } else if (activeThermalMode === 'health') {
            polygonFillColor = statusBadge.fillColor;
            polygonStrokeColor = isSelected ? '#FFFFFF' : statusBadge.strokeColor;
            polygonFillOpacity = 0.8;
          } else if (activeThermalMode === 'satellite') {
            polygonFillColor = '#0284C7';
            polygonStrokeColor = '#FFFFFF';
            polygonFillOpacity = 0.25;
          } else {
            // Potential mode
            polygonFillColor = '#FBBF24';
            polygonStrokeColor = '#D97706';
            polygonFillOpacity = 0.4;
          }

          const isCriticalHotspot = group.deltaTempC >= 15.0;

          return (
            <React.Fragment key={`panel-group-${group.id}`}>
              {/* Critical Hotspot Pulsing Radial Halo (in Thermal or Health mode) */}
              {(activeThermalMode === 'thermal' || activeThermalMode === 'health') &&
                isCriticalHotspot && (
                  <>
                    <Circle
                      center={group.center}
                      radius={16}
                      pathOptions={{
                        stroke: false,
                        fillColor: '#EF4444',
                        fillOpacity: 0.35,
                      }}
                      interactive={false}
                    />
                    <Circle
                      center={group.center}
                      radius={8}
                      pathOptions={{
                        stroke: false,
                        fillColor: '#EF4444',
                        fillOpacity: 0.65,
                      }}
                      interactive={false}
                    />
                  </>
                )}

              {/* Geo-referenced Panel String Polygon */}
              <Polygon
                positions={group.coordinates}
                pathOptions={{
                  color: polygonStrokeColor,
                  weight: isSelected ? 3 : 1.5,
                  fillColor: polygonFillColor,
                  fillOpacity: polygonFillOpacity,
                }}
                eventHandlers={{
                  click: () => {
                    onSelectPanelGroup?.(group);
                  },
                }}
              >
                <Tooltip sticky direction="top" className="custom-panel-tooltip">
                  <div className="p-1.5 text-xs font-sans min-w-[180px]">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1 mb-1">
                      <strong className="text-slate-900">{group.name}</strong>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                        style={{
                          backgroundColor: `${statusBadge.fillColor}20`,
                          color: statusBadge.fillColor,
                        }}
                      >
                        {statusBadge.label}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-[11px] text-slate-600">
                      <div className="flex justify-between">
                        <span>Surface Temp:</span>
                        <strong className="text-slate-900 font-mono">
                          {group.surfaceTempC !== null ? `${group.surfaceTempC.toFixed(1)}°C` : 'N/A'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Baseline ΔT:</span>
                        <strong
                          className={`font-mono ${
                            group.deltaTempC >= 10 ? 'text-rose-600' : 'text-slate-700'
                          }`}
                        >
                          {group.deltaTempC >= 0 ? `+${group.deltaTempC.toFixed(1)}°C` : `${group.deltaTempC.toFixed(1)}°C`}
                        </strong>
                      </div>
                      {group.estimatedPowerLossPct > 0 && (
                        <div className="flex justify-between text-rose-600 font-semibold">
                          <span>Est. Loss:</span>
                          <span>{group.estimatedPowerLossPct.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            </React.Fragment>
          );
        })}

        {/* 4. Building Numerical Score Badges (Shown in Solar Potential Mode) */}
        {activeThermalMode === 'potential' &&
          activeShowBadges &&
          filteredBuildingsWithMetrics.map(({ building, metricColor, metrics }) => {
            const isSelected = building.id === selectedBuildingId;
            const isTopCandidate = metrics.score >= 85;

            return (
              <Marker
                key={`marker-${building.id}`}
                position={[building.latitude, building.longitude]}
                icon={createScoreMarker(metrics.score, metricColor.colorHex, isSelected, isTopCandidate)}
                eventHandlers={{
                  click: () => onSelectBuilding(building),
                }}
              >
                <Popup className="solar-building-popup">
                  <div className="p-1 min-w-[240px] font-sans">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{building.name}</h3>
                        <span className="text-[10px] text-slate-500">{building.category}</span>
                      </div>
                      <div
                        className="px-2 py-0.5 rounded text-[10px] font-bold border"
                        style={{
                          backgroundColor: `${metricColor.colorHex}15`,
                          borderColor: `${metricColor.colorHex}40`,
                          color: metricColor.colorHex,
                        }}
                      >
                        {metrics.score}/100 • {metrics.tier}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gross Roof Area:</span>
                        <strong className="text-slate-800 tabular-nums">{formatArea(building.gross_roof_area)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Usable Solar Area:</span>
                        <strong className="text-slate-800 tabular-nums">{formatArea(building.usable_roof_area)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Est. PV Capacity:</span>
                        <strong className="text-slate-900 tabular-nums">{formatPower(metrics.estimatedCapacityKwp)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Est. Annual Generation:</span>
                        <strong className="text-slate-900 tabular-nums">{formatEnergy(metrics.estimatedAnnualGenKwh)}</strong>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => onSelectBuilding(building)}
                        className="w-full text-center bg-slate-900 hover:bg-slate-800 text-white py-1.5 px-3 rounded text-xs font-semibold transition-colors shadow-2xs"
                      >
                        Inspect Facility &rarr;
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};
