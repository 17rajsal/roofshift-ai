import { Building } from '../types/models';

export type SolarSuitabilityTier = 'Excellent' | 'Good' | 'Moderate' | 'Low' | 'Poor';

export interface SolarSuitabilityMetrics {
  score: number; // 0 - 100
  tier: SolarSuitabilityTier;
  tierLabel: string;
  colorHex: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  glowColor: string;
  shadingLossPct: number;
  usableAreaRatio: number; // 0 - 1
  estimatedCapacityKwp: number;
  estimatedAnnualGenKwh: number;
  specificYieldKwhPerKwp: number;
  estimatedAnnualSavingsInr: number;
  avoidedCo2KgAnnual: number;
  daytimeDemandMatchPct: number;
  paybackYears: number | null;
}

export function computeBuildingSolarMetrics(
  building: Building,
  projectTariff: number = 8.5,
  projectCo2: number = 0.716
): SolarSuitabilityMetrics {
  // 1. Shading derate (up to 40 pts)
  let shadingLossPct = 5;
  if (building.custom_shading_loss !== undefined && building.custom_shading_loss !== null) {
    shadingLossPct = building.custom_shading_loss;
  } else {
    const cat = (building.shading_category || '').toLowerCase();
    if (cat === 'high') shadingLossPct = 30;
    else if (cat === 'medium') shadingLossPct = 15;
    else shadingLossPct = 5;
  }
  const shadeScore = Math.max(0, Math.min(40, 40 - (shadingLossPct * 1.05)));

  // 2. Yield & Irradiance potential (up to 30 pts)
  let specificYield = 1350 * (1 - shadingLossPct / 100);
  if (building.solar_analysis?.specific_yield_kwh_per_kwp) {
    specificYield = building.solar_analysis.specific_yield_kwh_per_kwp;
  }
  let yieldScore = 15;
  if (specificYield >= 1350) yieldScore = 30;
  else if (specificYield >= 1200) yieldScore = 24 + ((specificYield - 1200) / 150) * 5;
  else if (specificYield >= 1000) yieldScore = 16 + ((specificYield - 1000) / 200) * 7;
  else yieldScore = Math.max(5, (specificYield / 1000) * 15);

  // 3. Usable Area proportion (up to 15 pts)
  const usableRatio = building.gross_roof_area > 0
    ? Math.min(1, building.usable_roof_area / building.gross_roof_area)
    : (building.usable_roof_percentage || 75) / 100;
  const areaScore = Math.min(15, usableRatio * 18);

  // 4. Daytime Demand Absorption (up to 15 pts)
  const daytimePct = building.daytime_consumption_pct || 65;
  const demandScore = Math.min(15, (daytimePct / 100) * 17);

  // Composite Score
  const rawScore = shadeScore + yieldScore + areaScore + demandScore;
  const score = Math.round(Math.max(10, Math.min(99, rawScore)));

  // Tiers and Colors
  let tier: SolarSuitabilityTier = 'Moderate';
  let tierLabel = 'Viable with Mitigations';
  let colorHex = '#F59E0B'; // Amber
  let badgeBg = 'bg-amber-50';
  let badgeText = 'text-amber-800';
  let badgeBorder = 'border-amber-200';
  let glowColor = 'rgba(245, 158, 11, 0.4)';

  if (score >= 85) {
    tier = 'Excellent';
    tierLabel = 'Prime Solar Candidate';
    colorHex = '#047857'; // Deep Emerald
    badgeBg = 'bg-emerald-50';
    badgeText = 'text-emerald-800';
    badgeBorder = 'border-emerald-300';
    glowColor = 'rgba(4, 120, 87, 0.45)';
  } else if (score >= 70) {
    tier = 'Good';
    tierLabel = 'Strong Potential';
    colorHex = '#10B981'; // Emerald
    badgeBg = 'bg-emerald-50';
    badgeText = 'text-emerald-700';
    badgeBorder = 'border-emerald-200';
    glowColor = 'rgba(16, 185, 129, 0.4)';
  } else if (score >= 50) {
    tier = 'Moderate';
    tierLabel = 'Moderate Potential';
    colorHex = '#F59E0B'; // Amber
    badgeBg = 'bg-amber-50';
    badgeText = 'text-amber-800';
    badgeBorder = 'border-amber-200';
    glowColor = 'rgba(245, 158, 11, 0.35)';
  } else if (score >= 30) {
    tier = 'Low';
    tierLabel = 'Suboptimal / Shaded';
    colorHex = '#F97316'; // Orange
    badgeBg = 'bg-orange-50';
    badgeText = 'text-orange-800';
    badgeBorder = 'border-orange-200';
    glowColor = 'rgba(249, 115, 22, 0.35)';
  } else {
    tier = 'Poor';
    tierLabel = 'Severe Shading Loss';
    colorHex = '#EF4444'; // Red
    badgeBg = 'bg-red-50';
    badgeText = 'text-red-700';
    badgeBorder = 'border-red-200';
    glowColor = 'rgba(239, 68, 68, 0.35)';
  }

  // Key derived physical/economic numbers
  const estimatedCapacityKwp = building.solar_analysis?.max_pv_capacity_kwp
    ?? Math.round((building.usable_roof_area / 8.0) * 10) / 10;

  const estimatedAnnualGenKwh = building.solar_analysis?.annual_generation_kwh
    ?? Math.round(estimatedCapacityKwp * specificYield);

  const estimatedAnnualSavingsInr = building.solar_analysis?.annual_savings_inr
    ?? Math.round(estimatedAnnualGenKwh * (building.tariff_inr || projectTariff) * (daytimePct / 100));

  const avoidedCo2KgAnnual = building.solar_analysis?.avoided_co2_kg_annual
    ?? Math.round(estimatedAnnualGenKwh * projectCo2);

  const paybackYears = building.solar_analysis?.simple_payback_years
    ?? (estimatedAnnualSavingsInr > 0 ? Math.round(((estimatedCapacityKwp * (building.cost_per_kwp || 50000)) / estimatedAnnualSavingsInr) * 10) / 10 : null);

  return {
    score,
    tier,
    tierLabel,
    colorHex,
    badgeBg,
    badgeText,
    badgeBorder,
    glowColor,
    shadingLossPct,
    usableAreaRatio: usableRatio,
    estimatedCapacityKwp,
    estimatedAnnualGenKwh,
    specificYieldKwhPerKwp: Math.round(specificYield * 10) / 10,
    estimatedAnnualSavingsInr,
    avoidedCo2KgAnnual,
    daytimeDemandMatchPct: daytimePct,
    paybackYears,
  };
}

export type MetricVisualizationMode =
  | 'suitability'
  | 'generation'
  | 'yield'
  | 'savings'
  | 'co2';

export interface MetricColorDef {
  colorHex: string;
  label: string;
  formattedValue: string;
}

export function getBuildingMetricColor(
  building: Building,
  mode: MetricVisualizationMode,
  metrics: SolarSuitabilityMetrics
): MetricColorDef {
  switch (mode) {
    case 'generation': {
      const genMwh = metrics.estimatedAnnualGenKwh / 1000;
      let colorHex = '#EF4444';
      if (genMwh >= 50) colorHex = '#047857';
      else if (genMwh >= 30) colorHex = '#10B981';
      else if (genMwh >= 15) colorHex = '#F59E0B';
      else if (genMwh >= 5) colorHex = '#F97316';
      return {
        colorHex,
        label: `${genMwh.toFixed(1)} MWh/yr`,
        formattedValue: `${metrics.estimatedAnnualGenKwh.toLocaleString()} kWh`,
      };
    }
    case 'yield': {
      const y = metrics.specificYieldKwhPerKwp;
      let colorHex = '#EF4444';
      if (y >= 1300) colorHex = '#047857';
      else if (y >= 1200) colorHex = '#10B981';
      else if (y >= 1100) colorHex = '#F59E0B';
      else if (y >= 950) colorHex = '#F97316';
      return {
        colorHex,
        label: `${Math.round(y)} kWh/kWp`,
        formattedValue: `${Math.round(y)} kWh/kWp/yr`,
      };
    }
    case 'savings': {
      const s = metrics.estimatedAnnualSavingsInr;
      let colorHex = '#EF4444';
      if (s >= 250000) colorHex = '#047857';
      else if (s >= 150000) colorHex = '#10B981';
      else if (s >= 75000) colorHex = '#F59E0B';
      else if (s >= 30000) colorHex = '#F97316';
      return {
        colorHex,
        label: `₹${(s / 100000).toFixed(2)}L/yr`,
        formattedValue: `₹${Math.round(s).toLocaleString('en-IN')}`,
      };
    }
    case 'co2': {
      const co2Tons = metrics.avoidedCo2KgAnnual / 1000;
      let colorHex = '#EF4444';
      if (co2Tons >= 35) colorHex = '#047857';
      else if (co2Tons >= 20) colorHex = '#10B981';
      else if (co2Tons >= 10) colorHex = '#F59E0B';
      else if (co2Tons >= 4) colorHex = '#F97316';
      return {
        colorHex,
        label: `${co2Tons.toFixed(1)} tCO₂/yr`,
        formattedValue: `${co2Tons.toFixed(1)} metric tons CO₂`,
      };
    }
    case 'suitability':
    default:
      return {
        colorHex: metrics.colorHex,
        label: `${metrics.score}/100 · ${metrics.tier}`,
        formattedValue: `${metrics.score} / 100 (${metrics.tierLabel})`,
      };
  }
}
