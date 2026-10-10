import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, CircleMarker, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Building, GeocodeResult } from '../../types/models';
import { api } from '../../services/api';
import { formatArea, formatEnergy, formatINR, formatPower } from '../../utils/formatters';
import { Search, MapPin, Plus, Navigation, Eye, AlertCircle, SunMedium } from 'lucide-react';
import { isSimpleRoofOutline, readRoofOutline, roofAreaSquareMeters, type RoofPoint } from '../../utils/roofGeometry';

// Fix Leaflet marker icons in Vite bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored markers based on shading
const createCustomMarker = (color: string) => {
  return L.divIcon({
    className: 'custom-solar-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 13px;
      ">
        ☀️
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const markerLowShade = createCustomMarker('#10B981'); // Emerald
const markerMedShade = createCustomMarker('#F5B942'); // Amber
const markerHighShade = createCustomMarker('#EF4444'); // Red

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
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

interface SolarMapProps {
  buildings: Building[];
  selectedBuildingId?: string | null;
  onSelectBuilding: (building: Building) => void;
  onAddBuildingAtCoord: (lat: number, lng: number) => void;
  onAddRoofOutline: (points: RoofPoint[], area: number) => void;
  defaultCenter?: [number, number];
}

export const SolarMap: React.FC<SolarMapProps> = ({
  buildings,
  selectedBuildingId,
  onSelectBuilding,
  onAddBuildingAtCoord,
  onAddRoofOutline,
  defaultCenter = [28.6139, 77.2090], // Delhi default
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(16);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddHint, setShowAddHint] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [outline, setOutline] = useState<RoofPoint[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [drawError, setDrawError] = useState<string | null>(null);

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

  useEffect(() => {
    if (buildings.length > 0 && !selectedBuildingId) {
      setMapCenter([buildings[0].latitude, buildings[0].longitude]);
    }
  }, [buildings]);

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

  const getMarkerIcon = (b: Building) => {
    const shade = (b.shading_category || '').toLowerCase();
    if (shade === 'high') return markerHighShade;
    if (shade === 'medium') return markerMedShade;
    return markerLowShade;
  };

  return (
    <div className="relative isolate z-0 w-full h-[600px] rounded-xl overflow-hidden border border-[#E5EAE7] shadow-sm bg-slate-100 flex flex-col">
      {/* Top Map Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Location Search Bar */}
        <form onSubmit={handleSearch} className="pointer-events-auto relative w-full sm:w-80">
          <div className="flex items-center bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-slate-200 overflow-hidden">
            <Search className="w-4 h-4 text-slate-400 ml-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Indian city, campus, or area..."
              aria-label="Search map location"
              className="w-full px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="bg-[#123C32] hover:bg-[#0B251F] text-white px-3 py-2 text-xs font-semibold transition-colors"
            >
              {isSearching ? '...' : 'Go'}
            </button>
          </div>
          {searchError && <p role="alert" className="mt-1 rounded-lg bg-white p-2 text-xs text-red-700 shadow">{searchError}</p>}

          {/* Search suggestions dropdown */}
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
                  className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                >
                  <span className="truncate text-slate-700">{r.display_name}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">{r.source}</span>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Legend and Add Building Control */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg border border-slate-200 text-xs">
          <div className="hidden xl:flex items-center gap-3 pr-2 border-r border-slate-200">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] text-slate-600">Low Shade (&lt;8%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]"></span>
              <span className="text-[11px] text-slate-600">Med Shade (15%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="text-[11px] text-slate-600">High Shade (30%)</span>
            </div>
          </div>
          <button
            onClick={() => { setShowAddHint(!showAddHint); setDrawing(false); setOutline([]); setDrawError(null); }}
            aria-pressed={showAddHint}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
              showAddHint ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Click to Add Roof</span>
          </button>
          <button type="button" aria-pressed={drawing} onClick={() => { setDrawing(!drawing); setShowAddHint(false); setOutline([]); setDrawError(null); }} className={`rounded px-2.5 py-1 font-semibold ${drawing ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Draw roof boundary</button>
        </div>
      </div>

      {drawing && <div className="absolute bottom-4 left-4 right-16 z-[400] rounded-xl border border-emerald-200 bg-white p-3 shadow-lg text-xs">
        <p className="font-semibold text-[#123C32]">Click each rooftop corner in order. {outline.length} corners · {formatArea(roofAreaSquareMeters(outline))}</p>
        <p className="mt-1 text-slate-500">Map measurements are approximate. Confirm the area before saving.</p>
        {drawError && <p role="alert" className="mt-1 text-red-700">{drawError}</p>}
        <div className="mt-2 flex gap-2"><button onClick={finishOutline} disabled={outline.length < 3} className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white disabled:opacity-50">Use this roof</button><button disabled={!outline.length} onClick={() => { setOutline(points => points.slice(0, -1)); setDrawError(null); }} className="rounded-lg bg-slate-100 px-3 py-2 disabled:opacity-50">Undo corner</button><button onClick={() => { setDrawing(false); setOutline([]); setDrawError(null); }} className="rounded-lg bg-slate-100 px-3 py-2">Cancel</button></div>
      </div>}

      {showAddHint && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] bg-[#123C32] text-white px-4 py-2 rounded-full shadow-xl text-xs font-medium flex items-center gap-2 border border-emerald-500/40 animate-bounce">
          <MapPin className="w-4 h-4 text-[#F5B942]" />
          <span>Click anywhere on the map to place a candidate rooftop!</span>
        </div>
      )}

      {/* Interactive Leaflet Map */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full"
      >
        <ZoomControl position="bottomright" />
        <MapController center={mapCenter} zoom={mapZoom} />
        <MapClickHandler onMapClick={(lat, lng) => {
          if (drawing) { setOutline(points => [...points, [lat, lng]]); setDrawError(null); }
          else if (showAddHint) { setShowAddHint(false); onAddBuildingAtCoord(lat, lng); }
        }} />
        {outline.length >= 3 ? <Polygon positions={outline} pathOptions={{ color: '#10B981' }} interactive={false} /> : outline.length >= 2 ? <Polyline positions={outline} pathOptions={{ color: '#10B981' }} interactive={false} /> : null}
        {outline.map((point, index) => <CircleMarker key={index} center={point} radius={4} pathOptions={{ color: '#123C32', fillOpacity: 1 }} interactive={false} />)}
        {buildings.map(building => {
          const points = readRoofOutline(building.roof_polygon);
          return points ? <Polygon key={`roof-${building.id}`} positions={points} pathOptions={{ color: building.id === selectedBuildingId ? '#123C32' : '#10B981', weight: building.id === selectedBuildingId ? 3 : 1, fillOpacity: 0.2 }} eventHandlers={{ click: () => { if (!drawing && !showAddHint) onSelectBuilding(building); } }} bubblingMouseEvents={false} /> : null;
        })}

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {buildings.map((b) => (
          <Marker
            key={b.id}
            position={[b.latitude, b.longitude]}
            icon={getMarkerIcon(b)}
            eventHandlers={{
              click: () => onSelectBuilding(b),
            }}
          >
            <Popup className="solar-building-popup">
              <div className="p-1 min-w-[220px]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                  <h3 className="font-bold text-sm text-[#123C32]">{b.name}</h3>
                  <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                    {b.category}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Gross Roof:</span>
                    <strong className="text-slate-800">{formatArea(b.gross_roof_area)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Usable Roof ({b.usable_roof_percentage}%):</span>
                    <strong className="text-slate-800">{formatArea(b.usable_roof_area)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Shading Derate:</span>
                    <strong className={b.shading_category === 'High' ? 'text-red-600' : 'text-slate-800'}>
                      {b.shading_category} ({b.custom_shading_loss || 5}%)
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Load:</span>
                    <strong className="text-slate-800">{formatEnergy(b.monthly_consumption_kwh)}</strong>
                  </div>
                  {b.solar_analysis && (
                    <>
                      <div className="h-px bg-slate-100 my-1" />
                      <div className="flex justify-between text-emerald-700">
                        <span>Potential PV:</span>
                        <strong>{formatPower(b.solar_analysis.max_pv_capacity_kwp)}</strong>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Est. Annual Savings:</span>
                        <strong>{formatINR(b.solar_analysis.annual_savings_inr)}</strong>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => onSelectBuilding(b)}
                    className="w-full text-center bg-[#123C32] hover:bg-[#0B251F] text-white py-1 px-2.5 rounded text-xs font-semibold transition-colors"
                  >
                    Inspect Profile &rarr;
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
