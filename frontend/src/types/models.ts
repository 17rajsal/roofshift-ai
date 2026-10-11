export interface Project {
  id: string;
  name: string;
  organization_name: string;
  city: string;
  latitude: number;
  longitude: number;
  budget: number;
  tariff_rate: number;
  export_tariff: number;
  co2_factor: number;
  is_demo: string;
  building_count: number;
  total_roof_area: number;
  created_at: string;
  updated_at: string;
}

export interface SolarAnalysisSummary {
  id: string;
  usable_roof_area_sqm: number;
  max_pv_capacity_kwp: number;
  annual_generation_kwh: number;
  monthly_generation_kwh: number[];
  specific_yield_kwh_per_kwp: number;
  performance_ratio: number;
  effective_shading_loss_pct: number;
  annual_consumption_kwh: number;
  annual_onsite_consumed_kwh: number;
  annual_exported_kwh: number;
  onsite_utilization_pct: number;
  annual_savings_inr: number;
  installation_cost_inr: number;
  simple_payback_years: number | null;
  avoided_co2_kg_annual: number;
  ghi_annual_avg_kwh_m2_day: number;
  irradiance_source: string;
  data_quality_label: string;
  updated_at: string;
}

export interface Building {
  id: string;
  project_id: string;
  name: string;
  category: string;
  address?: string;
  latitude: number;
  longitude: number;
  gross_roof_area: number;
  usable_roof_percentage: number;
  usable_roof_area: number;
  shading_category: string;
  custom_shading_loss?: number;
  roof_polygon?: any[];
  obstacles_notes?: string;
  monthly_consumption_kwh: number;
  tariff_inr?: number;
  daytime_consumption_pct: number;
  demand_origin: string;
  cost_per_kwp: number;
  fixed_cost: number;
  max_eligible_kwp?: number;
  solar_analysis?: SolarAnalysisSummary;
  created_at: string;
  updated_at: string;
}

export interface MonthlySolarItem {
  month: string;
  month_index: number;
  ghi_kwh_m2_day: number;
  generation_kwh: number;
  consumption_kwh: number;
  onsite_used_kwh: number;
  export_kwh: number;
}

export interface SolarAnalysisFull {
  building_id: string;
  building_name: string;
  gross_roof_area_sqm: number;
  usable_roof_area_sqm: number;
  max_pv_capacity_kwp: number;
  annual_generation_kwh: number;
  monthly_breakdown: MonthlySolarItem[];
  specific_yield_kwh_per_kwp: number;
  performance_ratio: number;
  effective_shading_loss_pct: number;
  annual_consumption_kwh: number;
  annual_onsite_consumed_kwh: number;
  annual_exported_kwh: number;
  onsite_utilization_pct: number;
  installation_cost_inr: number;
  annual_savings_inr: number;
  simple_payback_years: number | null;
  avoided_co2_kg_annual: number;
  ghi_annual_avg_kwh_m2_day: number;
  irradiance_source: string;
  data_quality_label: string;
  calculation_notes?: string;
  last_updated: string;
}

export interface BuildingAllocationItem {
  building_id: string;
  building_name: string;
  category: string;
  recommended_capacity_kwp: number;
  max_capacity_kwp: number;
  capacity_utilization_pct: number;
  estimated_cost_inr: number;
  expected_annual_generation_kwh: number;
  expected_annual_savings_inr: number;
  expected_onsite_consumed_kwh: number;
  expected_exported_kwh: number;
  payback_years: number | null;
  is_selected: boolean;
  prioritization_score: number;
  decision_reasons: string[];
  shade_impact_summary: string;
  demand_support_summary: string;
}

export interface BaselineComparison {
  baseline_allocated_inr: number;
  baseline_savings_inr: number;
  baseline_generation_kwh: number;
  baseline_capacity_kwp: number;
  baseline_allocations: any[];
  savings_lift_inr: number;
  savings_lift_pct: number;
  methodology_note: string;
}

export interface OptimizationRunResponse {
  run_id: string;
  project_id: string;
  budget_inr: number;
  total_allocated_inr: number;
  remaining_budget_inr: number;
  total_capacity_kwp: number;
  total_annual_generation_kwh: number;
  total_annual_savings_inr: number;
  total_onsite_consumed_kwh: number;
  total_exported_kwh: number;
  overall_payback_years: number | null;
  avoided_co2_kg_annual: number;
  objective: string;
  scenario_name: string;
  allocations: BuildingAllocationItem[];
  baseline_comparison: BaselineComparison;
  solver_method: string;
  created_at: string;
}

export interface HourlyPoint {
  hour: number;
  time_label: string;
  solar_generation_kw: number;
  electricity_demand_kw: number;
  onsite_solar_used_kw: number;
  grid_import_kw: number;
  solar_surplus_kw: number;
}

export interface MonthlyTrendPoint {
  month: string;
  solar_generation_kwh: number;
  electricity_demand_kwh: number;
  onsite_solar_kwh: number;
  surplus_export_kwh: number;
  grid_import_kwh: number;
}

export interface BuildingEnergyMetric {
  building_id: string;
  building_name: string;
  category: string;
  allocated_capacity_kwp: number;
  annual_generation_kwh: number;
  annual_demand_kwh: number;
  generation_to_demand_ratio_pct: number;
  solar_fraction_pct: number;
  annual_savings_inr: number;
  avoided_co2_kg: number;
}

export interface EnergyInsightsResponse {
  project_id: string;
  has_active_optimization: boolean;
  total_capacity_kwp: number;
  total_annual_generation_kwh: number;
  total_annual_demand_kwh: number;
  total_onsite_solar_kwh: number;
  total_surplus_kwh: number;
  total_grid_import_offset_kwh: number;
  grid_offset_pct: number;
  total_installation_cost_inr: number;
  total_annual_savings_inr: number;
  simple_payback_years: number | null;
  avoided_co2_kg_annual: number;
  peak_solar_window: string;
  hourly_profile: HourlyPoint[];
  monthly_trends: MonthlyTrendPoint[];
  building_comparisons: BuildingEnergyMetric[];
  data_origin_notice: string;
}

export interface EnergyActivity {
  id: string;
  project_id: string;
  building_id?: string;
  name: string;
  power_kw: number;
  duration_hours: number;
  earliest_hour: number;
  latest_hour: number;
  preferred_hour: number;
  days_per_week: number;
  is_shiftable: boolean;
  created_at: string;
}

export interface ShiftRecommendation {
  activity_id: string;
  activity_name: string;
  building_name: string;
  original_window: string;
  recommended_window: string;
  recommended_start_hour: number;
  duration_hours: number;
  power_kw: number;
  energy_kwh_per_session: number;
  available_surplus_in_window_kwh: number;
  additional_solar_absorbed_kwh: number;
  estimated_annual_savings_inr: number;
  reason: string;
  practical_notes: string;
}

export interface HourlyProfileComparison {
  hour: number;
  time_label: string;
  solar_generation_kw: number;
  baseline_load_kw: number;
  shifted_load_kw: number;
  surplus_before_kw: number;
  surplus_after_kw: number;
}

export interface SchedulingOptimizationResponse {
  project_id: string;
  activities_analyzed: number;
  shiftable_activities_count: number;
  recommendations: ShiftRecommendation[];
  hourly_comparison: HourlyProfileComparison[];
  daily_surplus_before_kwh: number;
  daily_surplus_after_kwh: number;
  daily_solar_absorption_gain_kwh: number;
  annual_solar_absorption_gain_kwh: number;
  annual_financial_gain_inr: number;
  co2_reduction_gain_kg: number;
  disclaimer: string;
}

export interface RecommendationCard {
  id: string;
  category: string;
  priority: 'High' | 'Medium' | 'Info';
  target: string;
  title: string;
  why_it_matters: string;
  supporting_calculation: string;
  expected_benefit: string;
  confidence_label: string;
  suggested_next_action: string;
}

export interface GeneratedReportSummary {
  report_id: string;
  project_id: string;
  project_name: string;
  filename: string;
  download_url: string;
  file_size_bytes: number;
  generated_at: string;
}

export interface GeocodeResult {
  display_name: string;
  lat: number;
  lon: number;
  source: string;
}

export interface DemandUploadResult {
  status: string;
  filename: string;
  readings_count: number;
  average_power_kw: number;
  peak_power_kw: number;
  total_measured_kwh: number;
  data_mode: string;
  coverage_note: string;
}

export interface AwsServiceStatus {
  service: string;
  category: string;
  status: string;
  active_provider: string;
  fallback: string;
  evidence: string;
  cost_estimate: string;
  bucket_name?: string;
  place_index?: string;
  function_name?: string;
  schedule_expression?: string;
  log_group?: string;
  threshold?: string;
}

export interface SystemIntegrationsResponse {
  platform: string;
  version: string;
  environment: string;
  aws_enabled: boolean;
  aws_region: string;
  bedrock_status: {
    enabled: boolean;
    status: string;
    decision: string;
    latency_impact: string;
  };
  services: AwsServiceStatus[];
}

export interface PanelInspectionResponse {
  id: string;
  building_id: string;
  filename: string;
  image_url: string;
  defect_type: string;
  severity: string;
  confidence_score: number;
  temperature_delta_c?: number;
  estimated_power_loss_pct: number;
  recommended_action: string;
  model_provenance: string;
  created_at: string;
}

export interface DefectSummaryResponse {
  total_inspections: number;
  defects_detected: number;
  healthy_panels: number;
  critical_alerts: number;
  total_estimated_power_loss_pct: number;
  inspections: PanelInspectionResponse[];
}

export interface SolarMonitoringResponse {
  id: string;
  project_id: string;
  building_id?: string;
  filename: string;
  record_count: number;
  total_measured_generation_kwh: number;
  expected_generation_kwh: number;
  performance_ratio_actual: number;
  expected_performance_ratio: number;
  generation_delta_pct: number;
  degradation_annual_pct: number;
  underperformance_flag: boolean;
  diagnostic_summary: string;
  data_mode: string;
  created_at: string;
}

export interface MaintenanceCaseResponse {
  id: string;
  project_id: string;
  building_id?: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  estimated_loss_kwh_per_day: number;
  assigned_to?: string;
  created_at: string;
  resolved_at?: string;
}

export interface SolarMLForecastRequest {
  capacity_kwp: number;
  irradiance_w_per_m2: number;
  ambient_temperature_c: number;
  cell_temperature_c?: number;
  hour_of_day: number;
}

export interface SolarMLForecastResponse {
  capacity_kwp: number;
  irradiance_w_per_m2: number;
  ambient_temperature_c: number;
  cell_temperature_c: number;
  hour_of_day: number;
  ml_predicted_power_kw: number;
  physics_baseline_kw: number;
  delta_kw: number;
  confidence_lower_kw: number;
  confidence_upper_kw: number;
  model_name: string;
  model_version: string;
  model_algorithm: string;
  model_status: string;
  dataset_provenance: string;
  test_r2_score: number;
  test_nmae_pct: number;
  prediction_timestamp_utc: string;
}

export interface SolarMLDiurnalRequest {
  capacity_kwp: number;
  peak_irradiance_w_m2: number;
  ambient_temperature_c: number;
}

export interface DiurnalIntervalPrediction {
  hour: number;
  irradiance_w_per_m2: number;
  ambient_temp_c: number;
  ml_power_kw: number;
  physics_power_kw: number;
  delta_kw: number;
  confidence_lower_kw: number;
  confidence_upper_kw: number;
}

export interface SolarMLDiurnalResponse {
  capacity_kwp: number;
  peak_irradiance_w_m2: number;
  intervals: DiurnalIntervalPrediction[];
  total_daily_ml_kwh: number;
  total_daily_physics_kwh: number;
  energy_difference_pct: number;
  model_version: string;
  model_status: string;
}

export interface BulkImportRowError {
  row_number?: number;
  identifier?: string;
  reason: string;
}

export interface BulkImportSummaryResponse {
  total_processed: number;
  imported: number;
  updated: number;
  failed: number;
  errors: BulkImportRowError[];
  total_buildings_in_project: number;
  total_usable_area_sqm: number;
  total_potential_kwp: number;
  total_annual_generation_kwh: number;
}

export interface IndiaSolarRegion {
  id: string;
  name: string;
  short_name: string;
  zone: string;
  coordinates: { lat: number; lng: number };
  bounds: { north: number; south: number; east: number; west: number };
  ghi_daily_kwh: number;
  dni_daily_kwh: number;
  dhi_daily_kwh: number;
  ambient_temp_celsius: number;
  wind_speed_ms: number;
  cloud_monsoon_pct: number;
  rooftop_suitability_score: number;
  open_land_suitability_score: number;
  ai_suitability_composite: number;
  suitability_tier: string;
  zone_classification: string;
  estimated_rooftop_potential_gw: number;
  estimated_openland_potential_gw: number;
  annual_yield_kwh_per_kwp: number;
  monthly_ghi: Record<string, number>;
  key_corridors: string[];
  ai_recommendations: {
    module_technology: string;
    tracking_recommendation: string;
    soiling_and_cleaning: string;
    grid_and_storage: string;
    seasonal_risk_summary: string;
  };
}

export interface IndiaNationalSolarSummary {
  total_analyzed_regions: number;
  total_national_rooftop_potential_gw: number;
  total_national_openland_potential_gw: number;
  national_avg_daily_ghi_kwh: number;
  national_avg_daily_dni_kwh: number;
  national_avg_ambient_temp_c: number;
  top_opportunity_regions: Array<{
    id: string;
    name: string;
    score: number;
    tier: string;
    zone_classification: string;
    ghi_daily_kwh: number;
    rooftop_score: number;
    openland_score: number;
  }>;
  provenance_summary: {
    satellite_climatology: string;
    temperature_meteorology: string;
    capacity_potential: string;
    modeling_engine: string;
  };
}

export interface SampleCampusMetadata {
  campus_name: string;
  location: string;
  coordinates: { lat: number; lng: number };
  type: string;
  buildings_count: number;
  sample_buildings: string[];
  purpose: string;
  role_in_platform: string;
}

export interface EnvironmentalProfileResponse {
  status: string;
  coordinates: { lat: number; lon: number };
  in_india_bounds: boolean;
  nearest_region: {
    id: string;
    name: string;
    short_name: string;
    zone: string;
    zone_classification: string;
  };
  solar_irradiance: {
    ghi_daily_kwh: number;
    dni_daily_kwh: number;
    dhi_daily_kwh: number;
    monthly_ghi: Record<string, number>;
    annual_yield_kwh_per_kwp: number;
    performance_ratio: number;
    thermal_derate_factor: number;
    source: string;
    source_label: string;
  };
  meteorological_conditions: {
    ambient_temperature_celsius: number;
    wind_speed_ms: number;
    relative_humidity_pct: number;
    cloud_cover_pct: number;
    weather_condition: string;
    weather_source: string;
    is_climatological_fallback: boolean;
  };
  sun_ephemeris: {
    solar_elevation_deg: number;
    solar_zenith_deg: number;
    solar_azimuth_deg: number;
    solar_noon_elevation_deg: number;
    solar_declination_deg: number;
    equation_of_time_minutes: number;
    sunrise_time: string;
    sunset_time: string;
    day_length_hours: number;
    calculation_method: string;
    shading_assessment_status: string;
    shading_limitation_notice: string;
  };
  ai_suitability: {
    rooftop_suitability_score: number;
    open_land_suitability_score: number;
    composite_score: number;
    tier: string;
  };
  shading_disclaimer: string;
}

export interface OsmBuildingItem {
  id: string;
  name: string;
  category: string;
  gross_roof_area: number;
  usable_roof_area: number;
  latitude: number;
  longitude: number;
  polygon_coordinates: number[][];
  max_pv_capacity_kwp: number;
  annual_generation_kwh: number;
  annual_savings_inr: number;
  avoided_co2_kg_annual: number;
  shading_loss_percentage: number;
  shading_assessment_notice: string;
  source: string;
}

export interface OsmBuildingsResponse {
  status: string;
  building_count: number;
  buildings: OsmBuildingItem[];
  total_gross_roof_area_sqm?: number;
  total_usable_roof_area_sqm?: number;
  total_pv_capacity_kwp?: number;
  coordinates: { lat: number; lon: number };
  radius_m: number;
  message?: string;
  action_required?: string;
  source: string;
}

export interface OpenAreaScreeningResponse {
  status: string;
  coordinates: { lat: number; lon: number };
  nearest_region_name: string;
  zone_classification: string;
  open_land_suitability_score: number;
  suitability_tier: string;
  screening_metrics: {
    daily_ghi_kwh: number;
    daily_dni_kwh: number;
    estimated_terrain_slope_pct: number;
    slope_suitability: string;
    indicative_land_class: string;
    annual_generation_mwh_per_mw: number;
    hectares_required_per_mw: number;
  };
  regulatory_and_grid_disclaimer: string;
  data_provenance: string;
}

