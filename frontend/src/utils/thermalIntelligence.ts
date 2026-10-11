/**
 * Solar Thermal Intelligence & Hotspot Analysis
 * Scientific separation of Solar Irradiance (W/m², kWh) vs Panel Surface Temperature (°C).
 * Strict honest data provenance: MEASURED, ESTIMATED, SAMPLE, or UNAVAILABLE.
 */

export type ThermalDataProvenance = 'MEASURED' | 'ESTIMATED' | 'SAMPLE' | 'UNAVAILABLE';
export type ThermalMode = 'satellite' | 'potential' | 'thermal' | 'health';
export type ThermalDiagnosticStatus = 'NORMAL' | 'REVIEW' | 'ELEVATED' | 'CRITICAL';
export type ThermalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface HistoricalObservation {
  timestamp: string;
  label: string;
  surfaceTempC: number;
  deltaTempC: number;
  diagnosticStatus: ThermalDiagnosticStatus;
  notes: string;
  powerLossPct: number;
}

export interface PanelGroupThermalData {
  id: string;
  buildingId: string;
  buildingName: string;
  name: string;
  stringIdentifier: string;
  panelCount: number;
  coordinates: [number, number][]; // Leaflet LatLng polygon corners
  center: [number, number];
  surfaceTempC: number | null;
  baselineTempC: number;
  deltaTempC: number;
  ambientTempC: number;
  irradianceWm2: number;
  provenance: ThermalDataProvenance;
  observationTime: string;
  diagnosticStatus: ThermalDiagnosticStatus;
  suspectedCause: string;
  confidenceScore: number; // 0.0 - 1.0
  estimatedPowerLossPct: number;
  recommendedAction: string;
  priority: ThermalPriority;
  electricalSafetyAdvisory: string;
  history?: HistoricalObservation[];
}

export interface ThermalDataset {
  id: string;
  name: string;
  siteName: string;
  provenance: ThermalDataProvenance;
  timestamp: string;
  minTempC: number;
  maxTempC: number;
  avgTempC: number;
  ambientTempC: number;
  irradianceWm2: number;
  panelGroups: PanelGroupThermalData[];
  description: string;
}

export interface ThermalFleetSummary {
  buildingsMonitored: number;
  panelGroupsCount: number;
  totalPanelsCount: number;
  fleetAvgTempC: number;
  fleetMaxTempC: number;
  anomaliesCount: number;
  criticalCount: number;
  elevatedCount: number;
  reviewCount: number;
  normalCount: number;
  fleetPowerLossPct: number;
  dataProvenance: ThermalDataProvenance;
  observationDate: string;
}

/**
 * Standard Silicon Temperature Coefficient: -0.4% / °C above 25°C STC
 * Formula for nominal baseline operating cell temperature:
 * T_cell_baseline = T_ambient + ((NOCT - 20) / 800) * G_poa
 * With NOCT = 45°C, T_ambient = 33.5°C, G = 850 W/m²:
 * T_baseline = 33.5 + (25 / 800) * 850 = 33.5 + 26.56 = 60.06°C operating cell,
 * or module surface glass ~ 42°C.
 */
export const DEFAULT_AMBIENT_TEMP_C = 33.5;
export const DEFAULT_IRRADIANCE_WM2 = 850;
export const DEFAULT_BASELINE_TEMP_C = 42.0;

export const ELECTRICAL_SAFETY_NOTICE =
  'CRITICAL SAFETY ADVISORY: Do not touch, probe, or disconnect live photovoltaic modules, junction boxes, or DC string cabling. High-voltage DC arc hazards are present during daylight. Physical diagnostic tests and diode replacements must be performed by certified high-voltage solar technicians using lockout/tagout (LOTO) protocols.';

/**
 * Maps continuous surface temperature (°C) to scientific multi-stop gradient color.
 * Cool Blue (30°C) -> Sky Blue (38°C) -> Cyan (42°C) -> Green (46°C) -> Yellow (52°C) -> Orange (60°C) -> Red (68°C) -> Magenta (75°C+)
 */
export function getThermalColor(
  tempC: number | null,
  minTemp: number = 38.0,
  maxTemp: number = 72.0
): string {
  if (tempC === null || tempC === undefined) {
    return '#94A3B8'; // Slate-400 for unavailable
  }

  const clamped = Math.max(minTemp, Math.min(maxTemp, tempC));
  const t = (clamped - minTemp) / Math.max(1, maxTemp - minTemp);

  // Gradient stops: [position, hex]
  if (t <= 0.15) {
    // 0.0 to 0.15: Deep Blue (#1E3A8A) to Sky Blue (#0284C7)
    return interpolateColor('#1E3A8A', '#0284C7', t / 0.15);
  } else if (t <= 0.35) {
    // 0.15 to 0.35: Sky Blue (#0284C7) to Cyan (#06B6D4)
    return interpolateColor('#0284C7', '#06B6D4', (t - 0.15) / 0.2);
  } else if (t <= 0.5) {
    // 0.35 to 0.50: Cyan (#06B6D4) to Emerald Green (#10B981)
    return interpolateColor('#06B6D4', '#10B981', (t - 0.35) / 0.15);
  } else if (t <= 0.68) {
    // 0.50 to 0.68: Green (#10B981) to Amber / Yellow (#FBBF24)
    return interpolateColor('#10B981', '#FBBF24', (t - 0.5) / 0.18);
  } else if (t <= 0.82) {
    // 0.68 to 0.82: Yellow (#FBBF24) to Orange (#F97316)
    return interpolateColor('#FBBF24', '#F97316', (t - 0.68) / 0.14);
  } else if (t <= 0.93) {
    // 0.82 to 0.93: Orange (#F97316) to Vibrant Red (#EF4444)
    return interpolateColor('#F97316', '#EF4444', (t - 0.82) / 0.11);
  } else {
    // 0.93 to 1.00: Vibrant Red (#EF4444) to Deep Magenta (#9333EA)
    return interpolateColor('#EF4444', '#9333EA', (t - 0.93) / 0.07);
  }
}

function interpolateColor(color1: string, color2: string, factor: number): string {
  const f = Math.max(0, Math.min(1, factor));
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);

  const r1 = (c1 >> 16) & 255;
  const g1 = (c1 >> 8) & 255;
  const b1 = c1 & 255;

  const r2 = (c2 >> 16) & 255;
  const g2 = (c2 >> 8) & 255;
  const b2 = c2 & 255;

  const r = Math.round(r1 + (r2 - r1) * f);
  const g = Math.round(g1 + (g2 - g1) * f);
  const b = Math.round(b1 + (b2 - b1) * f);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function getDiagnosticStatusBadge(status: ThermalDiagnosticStatus) {
  switch (status) {
    case 'CRITICAL':
      return {
        label: 'Critical Hotspot',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        fillColor: '#EF4444',
        strokeColor: '#991B1B',
        textColor: 'text-rose-700',
        dotColor: 'bg-rose-500',
        description: 'Severe thermal deviation (ΔT ≥ 20°C). Immediate field inspection recommended.',
      };
    case 'ELEVATED':
      return {
        label: 'Elevated Temperature',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        fillColor: '#F97316',
        strokeColor: '#C2410C',
        textColor: 'text-amber-800',
        dotColor: 'bg-amber-500',
        description: 'Noticeable thermal deviation (ΔT 10°C–19°C). High risk of mismatch or soiling.',
      };
    case 'REVIEW':
      return {
        label: 'Review Recommended',
        badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        fillColor: '#FBBF24',
        strokeColor: '#B45309',
        textColor: 'text-yellow-800',
        dotColor: 'bg-yellow-400',
        description: 'Mild thermal elevation (ΔT 5°C–9°C). Monitor next wash cycle.',
      };
    case 'NORMAL':
    default:
      return {
        label: 'Nominal Operating',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        fillColor: '#10B981',
        strokeColor: '#047857',
        textColor: 'text-emerald-700',
        dotColor: 'bg-emerald-500',
        description: 'Surface temperature within standard expected operating range (ΔT < 5°C).',
      };
  }
}

/**
 * Builds realistic panel strings on top of building rooftop coordinates.
 */
function generateBuildingPanelStrings(
  buildingId: string,
  buildingName: string,
  centerLat: number,
  centerLng: number,
  prefix: string,
  stringsCount: number,
  anomaliesConfig: { [index: number]: Partial<PanelGroupThermalData> }
): PanelGroupThermalData[] {
  const panelGroups: PanelGroupThermalData[] = [];
  const latSpan = 0.00035;
  const lngSpan = 0.00045;
  const rowHeight = latSpan / (stringsCount / 2);
  const colWidth = lngSpan / 2;

  for (let i = 0; i < stringsCount; i++) {
    const row = Math.floor(i / 2);
    const col = i % 2;

    const topLat = centerLat + latSpan / 2 - row * rowHeight - 0.00002;
    const bottomLat = topLat - rowHeight + 0.00004;
    const leftLng = centerLng - lngSpan / 2 + col * colWidth + 0.00002;
    const rightLng = leftLng + colWidth - 0.00004;

    const coordinates: [number, number][] = [
      [topLat, leftLng],
      [topLat, rightLng],
      [bottomLat, rightLng],
      [bottomLat, leftLng],
    ];

    const center: [number, number] = [(topLat + bottomLat) / 2, (leftLng + rightLng) / 2];
    const stringId = `${prefix}-${String(i + 1).padStart(2, '0')}`;
    const stringName = `${buildingName} — String ${prefix}-${String(i + 1).padStart(2, '0')}`;

    // Normal nominal defaults
    const baseline = 42.0;
    const nominalTemp = Math.round((baseline + (Math.sin(i * 1.5) * 1.2)) * 10) / 10;
    const delta = Math.round((nominalTemp - baseline) * 10) / 10;

    let groupData: PanelGroupThermalData = {
      id: `PG-${buildingId.slice(0, 4)}-${stringId}`,
      buildingId,
      buildingName,
      name: stringName,
      stringIdentifier: stringId,
      panelCount: 18,
      coordinates,
      center,
      surfaceTempC: nominalTemp,
      baselineTempC: baseline,
      deltaTempC: delta,
      ambientTempC: DEFAULT_AMBIENT_TEMP_C,
      irradianceWm2: DEFAULT_IRRADIANCE_WM2,
      provenance: 'SAMPLE',
      observationTime: new Date(Date.now() - 3600000 * 2).toISOString(),
      diagnosticStatus: 'NORMAL',
      suspectedCause: 'Standard nominal crystalline-Si photovoltaic operating thermal envelope.',
      confidenceScore: 0.95,
      estimatedPowerLossPct: 0.0,
      recommendedAction: 'Maintain standard quarterly planned inspection and washing cycle.',
      priority: 'LOW',
      electricalSafetyAdvisory: ELECTRICAL_SAFETY_NOTICE,
      history: [
        {
          timestamp: new Date(Date.now() - 86400000 * 30).toISOString(),
          label: '30 Days Prior',
          surfaceTempC: nominalTemp - 0.4,
          deltaTempC: delta - 0.4,
          diagnosticStatus: 'NORMAL',
          notes: 'Standard seasonal baseline scan.',
          powerLossPct: 0.0,
        },
        {
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          label: 'Current Scan (Sample)',
          surfaceTempC: nominalTemp,
          deltaTempC: delta,
          diagnosticStatus: 'NORMAL',
          notes: 'Thermal equilibrium verified.',
          powerLossPct: 0.0,
        },
      ],
    };

    // Apply custom anomaly if specified
    if (anomaliesConfig[i]) {
      groupData = { ...groupData, ...anomaliesConfig[i] };
    }

    panelGroups.push(groupData);
  }

  return panelGroups;
}

/**
 * Pre-configured Demonstration Thermal Dataset for Delhi College Campus
 * Clearly labeled: SAMPLE / SIMULATED — Illustrative dataset for UI exploration.
 */
export const SAMPLE_DELHI_CAMPUS_THERMAL_DATASET: ThermalDataset = {
  id: 'DATASET-DELHI-CAMPUS-DEMO-01',
  name: 'Delhi College Campus — Aerial Thermal Survey (Demo)',
  siteName: 'Delhi Technical Institute North Campus',
  provenance: 'SAMPLE',
  timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  minTempC: 39.8,
  maxTempC: 67.5,
  avgTempC: 44.6,
  ambientTempC: 33.5,
  irradianceWm2: 845,
  description:
    'Demonstration calibrated radiometric dataset showing typical commercial rooftop solar thermal distribution, including normal baseline strings, soiling-induced thermal elevations, and a localized bypass diode defect on Academic Block.',
  panelGroups: [
    // Academic Block (28.6142, 77.2095) - 8 Strings
    ...generateBuildingPanelStrings(
      'bld-academic-01',
      'Academic Block',
      28.6142,
      77.2095,
      'A',
      8,
      {
        2: {
          surfaceTempC: 49.5,
          deltaTempC: 7.5,
          diagnosticStatus: 'REVIEW',
          suspectedCause:
            'Heavy dust accumulation and localized airborne particle soiling along the bottom module edge.',
          confidenceScore: 0.89,
          estimatedPowerLossPct: 4.8,
          recommendedAction:
            'Schedule nighttime demineralized water washing. Inspect for dust cementation along frame corners.',
          priority: 'MEDIUM',
          history: [
            {
              timestamp: new Date(Date.now() - 86400000 * 14).toISOString(),
              label: '14 Days Prior',
              surfaceTempC: 46.2,
              deltaTempC: 4.2,
              diagnosticStatus: 'NORMAL',
              notes: 'Dust accumulation starting to register slight thermal rise.',
              powerLossPct: 2.1,
            },
            {
              timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
              label: 'Current Scan',
              surfaceTempC: 49.5,
              deltaTempC: 7.5,
              diagnosticStatus: 'REVIEW',
              notes: 'Persistent edge soiling confirmed.',
              powerLossPct: 4.8,
            },
          ],
        },
        6: {
          surfaceTempC: 67.5,
          deltaTempC: 25.5,
          diagnosticStatus: 'CRITICAL',
          suspectedCause:
            'Localized bypass diode open-circuit failure or reverse-bias cell hotspotting under heavy string mismatch.',
          confidenceScore: 0.94,
          estimatedPowerLossPct: 18.5,
          recommendedAction:
            'Isolate sub-string using qualified high-voltage PPE. Inspect junction box diode continuity and test open-circuit Voc.',
          priority: 'CRITICAL',
          history: [
            {
              timestamp: new Date(Date.now() - 86400000 * 28).toISOString(),
              label: 'Pre-Incident Scan',
              surfaceTempC: 43.1,
              deltaTempC: 1.1,
              diagnosticStatus: 'NORMAL',
              notes: 'Nominal string performance baseline.',
              powerLossPct: 0.0,
            },
            {
              timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
              label: 'Current Critical Alert',
              surfaceTempC: 67.5,
              deltaTempC: 25.5,
              diagnosticStatus: 'CRITICAL',
              notes: 'Substantial ΔT > 25°C localized heating pattern detected across sub-string cells.',
              powerLossPct: 18.5,
            },
          ],
        },
      }
    ),

    // Library (28.6148, 77.2088) - 4 Strings
    ...generateBuildingPanelStrings(
      'bld-library-02',
      'Library',
      28.6148,
      77.2088,
      'L',
      4,
      {
        1: {
          surfaceTempC: 56.2,
          deltaTempC: 14.2,
          diagnosticStatus: 'ELEVATED',
          suspectedCause:
            'Localized localized avian dropping / organic soiling patch causing cell shading and reverse-bias dissipation.',
          confidenceScore: 0.91,
          estimatedPowerLossPct: 9.2,
          recommendedAction:
            'Manual soft-bristle cleaning with neutral biodegradable surfactant. Re-inspect string IV-curve post-clean.',
          priority: 'HIGH',
          history: [
            {
              timestamp: new Date(Date.now() - 86400000 * 20).toISOString(),
              label: '20 Days Prior',
              surfaceTempC: 42.0,
              deltaTempC: 0.0,
              diagnosticStatus: 'NORMAL',
              notes: 'Clean glass baseline.',
              powerLossPct: 0.0,
            },
            {
              timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
              label: 'Current Scan',
              surfaceTempC: 56.2,
              deltaTempC: 14.2,
              diagnosticStatus: 'ELEVATED',
              notes: 'Distinct circular thermal hotspot conforming to organic deposit.',
              powerLossPct: 9.2,
            },
          ],
        },
      }
    ),

    // Hostel (28.6132, 77.2082) - 6 Strings
    ...generateBuildingPanelStrings(
      'bld-hostel-03',
      'Hostel',
      28.6132,
      77.2082,
      'H',
      6,
      {
        2: {
          surfaceTempC: 48.4,
          deltaTempC: 6.4,
          diagnosticStatus: 'REVIEW',
          suspectedCause:
            'Partial parapet shadow casting diagonal gradient on southern string during morning operating window.',
          confidenceScore: 0.86,
          estimatedPowerLossPct: 3.5,
          recommendedAction:
            'Review inverter string voltage tracking. Consider adjusting tilt or bypass diode activation threshold.',
          priority: 'MEDIUM',
        },
      }
    ),

    // Auditorium (28.6155, 77.2078) - 4 Strings
    ...generateBuildingPanelStrings(
      'bld-auditorium-04',
      'Auditorium',
      28.6155,
      77.2078,
      'AUD',
      4,
      {
        2: {
          surfaceTempC: 53.6,
          deltaTempC: 11.6,
          diagnosticStatus: 'ELEVATED',
          suspectedCause:
            'Potential junction box terminal loose connection or thermal resistance buildup at DC connector.',
          confidenceScore: 0.88,
          estimatedPowerLossPct: 7.0,
          recommendedAction:
            'Check MC4 connector crimp tightness and thermal discoloration during scheduled outage window.',
          priority: 'HIGH',
        },
      }
    ),

    // Admin Block (28.6136, 77.2105) - 4 Strings
    ...generateBuildingPanelStrings(
      'bld-admin-05',
      'Admin Block',
      28.6136,
      77.2105,
      'ADM',
      4,
      {}
    ),
  ],
};

/**
 * Calculates overall fleet thermal summary KPIs.
 */
export function computeThermalFleetSummary(dataset: ThermalDataset): ThermalFleetSummary {
  const groups = dataset.panelGroups;
  const buildingSet = new Set(groups.map((g) => g.buildingId));

  let totalTemp = 0;
  let maxTemp = -Infinity;
  let countValid = 0;
  let criticalCount = 0;
  let elevatedCount = 0;
  let reviewCount = 0;
  let normalCount = 0;
  let totalLoss = 0;
  let totalPanels = 0;

  groups.forEach((g) => {
    totalPanels += g.panelCount;
    if (g.surfaceTempC !== null) {
      totalTemp += g.surfaceTempC;
      countValid++;
      if (g.surfaceTempC > maxTemp) {
        maxTemp = g.surfaceTempC;
      }
    }

    if (g.diagnosticStatus === 'CRITICAL') criticalCount++;
    else if (g.diagnosticStatus === 'ELEVATED') elevatedCount++;
    else if (g.diagnosticStatus === 'REVIEW') reviewCount++;
    else normalCount++;

    totalLoss += g.estimatedPowerLossPct;
  });

  const avgTemp = countValid > 0 ? Math.round((totalTemp / countValid) * 10) / 10 : 0;
  const avgLoss = groups.length > 0 ? Math.round((totalLoss / groups.length) * 10) / 10 : 0;

  return {
    buildingsMonitored: buildingSet.size,
    panelGroupsCount: groups.length,
    totalPanelsCount: totalPanels,
    fleetAvgTempC: avgTemp,
    fleetMaxTempC: maxTemp === -Infinity ? 0 : Math.round(maxTemp * 10) / 10,
    anomaliesCount: criticalCount + elevatedCount + reviewCount,
    criticalCount,
    elevatedCount,
    reviewCount,
    normalCount,
    fleetPowerLossPct: avgLoss,
    dataProvenance: dataset.provenance,
    observationDate: dataset.timestamp,
  };
}

/**
 * Computes temperature distribution histogram bins for thermal fleet analytics.
 */
export function computeTemperatureHistogram(groups: PanelGroupThermalData[]): {
  range: string;
  count: number;
  color: string;
  status: string;
}[] {
  const bins = [
    { range: '< 40°C', count: 0, color: '#1E40AF', status: 'Cool / Optimal' },
    { range: '40–44°C', count: 0, color: '#10B981', status: 'Nominal STC' },
    { range: '45–49°C', count: 0, color: '#FBBF24', status: 'Mild Rise / Review' },
    { range: '50–59°C', count: 0, color: '#F97316', status: 'Elevated Mismatch' },
    { range: '60°C+', count: 0, color: '#EF4444', status: 'Severe Hotspot' },
  ];

  groups.forEach((g) => {
    if (g.surfaceTempC === null) return;
    const t = g.surfaceTempC;
    if (t < 40) bins[0].count++;
    else if (t < 45) bins[1].count++;
    else if (t < 50) bins[2].count++;
    else if (t < 60) bins[3].count++;
    else bins[4].count++;
  });

  return bins;
}
