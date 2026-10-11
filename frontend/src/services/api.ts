import {
  Project,
  Building,
  SolarAnalysisFull,
  OptimizationRunResponse,
  EnergyInsightsResponse,
  EnergyActivity,
  SchedulingOptimizationResponse,
  RecommendationCard,
  GeneratedReportSummary,
  GeocodeResult,
  DemandUploadResult,
  SystemIntegrationsResponse,
  PanelInspectionResponse,
  DefectSummaryResponse,
  SolarMonitoringResponse,
  MaintenanceCaseResponse,
  SolarMLForecastRequest,
  SolarMLForecastResponse,
  SolarMLDiurnalRequest,
  SolarMLDiurnalResponse,
  BulkImportSummaryResponse,
  IndiaSolarRegion,
  IndiaNationalSolarSummary,
  SampleCampusMetadata,
  EnvironmentalProfileResponse,
  OsmBuildingsResponse,
  OpenAreaScreeningResponse
} from '../types/models';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

export function resolveReportUrl(url: string): string {
  return new URL(url, new URL(`${API_BASE}/`, window.location.origin)).href;
}

async function responseError(res: Response): Promise<Error> {
  const body = await res.text();
  let detail: unknown;
  try {
    const parsed = JSON.parse(body);
    detail = parsed.detail || parsed.message;
  } catch { /* Non-JSON server failures get a readable fallback. */ }
  if (Array.isArray(detail)) {
    detail = detail.map(item => `${(item.loc || []).filter((part: string) => part !== 'body').join('.')}: ${item.msg}`).join('; ');
  }
  return new Error(typeof detail === 'string' ? detail : `Request failed (${res.status}). Please try again.`);
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });

  if (!res.ok) {
    throw await responseError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export const api = {
  // Projects
  async getProjects(): Promise<Project[]> {
    return fetchJson<Project[]>('/projects');
  },

  async getProject(id: string): Promise<Project> {
    return fetchJson<Project>(`/projects/${id}`);
  },

  async createProject(data: Partial<Project>): Promise<Project> {
    return fetchJson<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    return fetchJson<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteProject(id: string): Promise<void> {
    return fetchJson<void>(`/projects/${id}`, { method: 'DELETE' });
  },

  async duplicateProject(id: string): Promise<Project> {
    return fetchJson<Project>(`/projects/${id}/duplicate`, { method: 'POST' });
  },

  async seedDemoProject(): Promise<Project> {
    return fetchJson<Project>('/projects/seed-demo', { method: 'POST' });
  },

  // Buildings
  async getBuildings(
    projectId: string,
    params?: { limit?: number; offset?: number; category?: string; search?: string }
  ): Promise<Building[]> {
    const query = new URLSearchParams();
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    if (params?.offset !== undefined) query.set('offset', String(params.offset));
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return fetchJson<Building[]>(`/projects/${projectId}/buildings${qs ? `?${qs}` : ''}`);
  },

  async bulkImportBuildings(projectId: string, fileOrPayload: File | any): Promise<BulkImportSummaryResponse> {
    if (fileOrPayload instanceof File) {
      const formData = new FormData();
      formData.append('file', fileOrPayload);
      const res = await fetch(`${API_BASE}/projects/${projectId}/buildings/bulk-import`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        throw await responseError(res);
      }
      return res.json();
    } else {
      return fetchJson<BulkImportSummaryResponse>(`/projects/${projectId}/buildings/bulk-import`, {
        method: 'POST',
        body: JSON.stringify(fileOrPayload),
      });
    }
  },

  async recalculateProjectBuildings(projectId: string): Promise<{
    project_id: string;
    total_buildings: number;
    recalculated: number;
    failed: number;
    total_usable_area_sqm: number;
    total_potential_kwp: number;
    total_annual_generation_kwh: number;
  }> {
    return fetchJson<{
      project_id: string;
      total_buildings: number;
      recalculated: number;
      failed: number;
      total_usable_area_sqm: number;
      total_potential_kwp: number;
      total_annual_generation_kwh: number;
    }>(`/projects/${projectId}/recalculate`, {
      method: 'POST',
    });
  },

  async getBuilding(buildingId: string): Promise<Building> {
    return fetchJson<Building>(`/buildings/${buildingId}`);
  },

  async createBuilding(projectId: string, data: Partial<Building>): Promise<Building> {
    return fetchJson<Building>(`/projects/${projectId}/buildings`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateBuilding(buildingId: string, data: Partial<Building>): Promise<Building> {
    return fetchJson<Building>(`/buildings/${buildingId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async deleteBuilding(buildingId: string): Promise<void> {
    return fetchJson<void>(`/buildings/${buildingId}`, { method: 'DELETE' });
  },

  async duplicateBuilding(buildingId: string): Promise<Building> {
    return fetchJson<Building>(`/buildings/${buildingId}/duplicate`, { method: 'POST' });
  },

  // Solar Analysis
  async getSolarAnalysis(buildingId: string): Promise<SolarAnalysisFull> {
    return fetchJson<SolarAnalysisFull>(`/buildings/${buildingId}/solar-analysis`);
  },

  async triggerSolarAnalysis(buildingId: string): Promise<SolarAnalysisFull> {
    return fetchJson<SolarAnalysisFull>(`/buildings/${buildingId}/solar-analysis`, {
      method: 'POST'
    });
  },

  // Optimization
  async runOptimization(projectId: string, payload: {
    budget_inr: number;
    objective?: string;
    scenario_name?: string;
    capacity_step_kwp?: number;
    override_cost_per_kwp?: number;
    override_tariff_rate?: number;
    override_export_tariff?: number;
  }): Promise<OptimizationRunResponse> {
    return fetchJson<OptimizationRunResponse>(`/projects/${projectId}/optimize`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getOptimizationRuns(projectId: string): Promise<OptimizationRunResponse[]> {
    return fetchJson<OptimizationRunResponse[]>(`/projects/${projectId}/optimizations`);
  },

  // Energy Insights
  async getEnergyInsights(projectId: string): Promise<EnergyInsightsResponse> {
    return fetchJson<EnergyInsightsResponse>(`/projects/${projectId}/energy-insights`);
  },

  // Scheduling
  async getActivities(projectId: string): Promise<EnergyActivity[]> {
    return fetchJson<EnergyActivity[]>(`/projects/${projectId}/activities`);
  },

  async createActivity(projectId: string, data: Partial<EnergyActivity>): Promise<EnergyActivity> {
    return fetchJson<EnergyActivity>(`/projects/${projectId}/activities`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteActivity(activityId: string): Promise<void> {
    return fetchJson<void>(`/activities/${activityId}`, { method: 'DELETE' });
  },

  async optimizeSchedule(projectId: string): Promise<SchedulingOptimizationResponse> {
    return fetchJson<SchedulingOptimizationResponse>(`/projects/${projectId}/schedule-optimize`, {
      method: 'POST'
    });
  },

  // Recommendations
  async getRecommendations(projectId: string): Promise<{ count: number; recommendations: RecommendationCard[] }> {
    return fetchJson<{ count: number; recommendations: RecommendationCard[] }>(`/projects/${projectId}/recommendations`);
  },

  // Reports
  async generateReport(projectId: string, payload: { notes?: string } = {}): Promise<GeneratedReportSummary> {
    return fetchJson<GeneratedReportSummary>(`/projects/${projectId}/reports`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getReports(projectId: string): Promise<GeneratedReportSummary[]> {
    return fetchJson<GeneratedReportSummary[]>(`/projects/${projectId}/reports`);
  },

  // Geocoding
  async searchLocation(query: string): Promise<GeocodeResult[]> {
    return fetchJson<GeocodeResult[]>(`/geocoding/search?q=${encodeURIComponent(query)}`);
  },

  // Meter Demand CSV Upload (Mode A)
  async uploadHourlyDemandCsv(projectId: string, file: File): Promise<DemandUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/projects/${projectId}/demand-upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw await responseError(res);
    }
    return res.json();
  },

  // AWS System Integrations
  async getSystemIntegrations(): Promise<SystemIntegrationsResponse> {
    return fetchJson<SystemIntegrationsResponse>('/system/integrations');
  },

  // Panel Inspections
  async uploadPanelInspection(buildingId: string, file: File): Promise<PanelInspectionResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/buildings/${buildingId}/panel-inspection`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw await responseError(res);
    }
    return res.json();
  },

  async getBuildingInspections(buildingId: string): Promise<PanelInspectionResponse[]> {
    return fetchJson<PanelInspectionResponse[]>(`/buildings/${buildingId}/panel-inspections`);
  },

  async getProjectDefectSummary(projectId: string): Promise<DefectSummaryResponse> {
    return fetchJson<DefectSummaryResponse>(`/projects/${projectId}/defect-summary`);
  },

  // Inverter Monitoring Telemetry
  async uploadMonitoringCsv(projectId: string, file: File, buildingId?: string): Promise<SolarMonitoringResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const query = buildingId ? `?building_id=${encodeURIComponent(buildingId)}` : '';
    const res = await fetch(`${API_BASE}/projects/${projectId}/monitoring-upload${query}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw await responseError(res);
    }
    return res.json();
  },

  async getMonitoringLogs(projectId: string): Promise<SolarMonitoringResponse[]> {
    return fetchJson<SolarMonitoringResponse[]>(`/projects/${projectId}/monitoring-logs`);
  },

  // Maintenance Cases
  async getMaintenanceCases(projectId: string, status?: string): Promise<MaintenanceCaseResponse[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return fetchJson<MaintenanceCaseResponse[]>(`/projects/${projectId}/maintenance-cases${query}`);
  },

  async createMaintenanceCase(projectId: string, data: {
    title: string;
    description: string;
    category?: string;
    priority?: string;
    building_id?: string;
    estimated_loss_kwh_per_day?: number;
    assigned_to?: string;
  }): Promise<MaintenanceCaseResponse> {
    return fetchJson<MaintenanceCaseResponse>(`/projects/${projectId}/maintenance-cases`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateMaintenanceCase(caseId: string, data: Partial<{
    title: string;
    description: string;
    priority: string;
    status: string;
    estimated_loss_kwh_per_day: number;
    assigned_to: string;
  }>): Promise<MaintenanceCaseResponse> {
    return fetchJson<MaintenanceCaseResponse>(`/maintenance-cases/${caseId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteMaintenanceCase(caseId: string): Promise<void> {
    return fetchJson<void>(`/maintenance-cases/${caseId}`, { method: 'DELETE' });
  },

  // Thermal Intelligence & Hotspot Diagnostics
  async getThermalSummary(projectId: string): Promise<any> {
    return fetchJson<any>(`/projects/${projectId}/thermal-summary`);
  },

  async uploadThermalCsv(projectId: string, file: File, buildingId?: string, baselineTempC: number = 42.0): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const query = new URLSearchParams();
    if (buildingId) query.set('building_id', buildingId);
    query.set('baseline_temp_c', String(baselineTempC));
    const res = await fetch(`${API_BASE}/projects/${projectId}/thermal-upload-csv?${query.toString()}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw await responseError(res);
    }
    return res.json();
  },

  async createThermalMaintenanceTicket(projectId: string, data: {
    panel_id: string;
    building_id?: string;
    surface_temp_c: number;
    delta_temp_c: number;
    suspected_cause: string;
    priority?: string;
    notes?: string;
  }): Promise<any> {
    return fetchJson<any>(`/projects/${projectId}/thermal-maintenance-ticket`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Machine Learning Solar Forecasting
  async getSolarMLForecast(data: SolarMLForecastRequest): Promise<SolarMLForecastResponse> {
    return fetchJson<SolarMLForecastResponse>('/solar-ml/forecast', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getSolarMLDiurnalForecast(data: SolarMLDiurnalRequest): Promise<SolarMLDiurnalResponse> {
    return fetchJson<SolarMLDiurnalResponse>('/solar-ml/diurnal-forecast', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getSolarMLModelInfo(): Promise<any> {
    return fetchJson<any>('/solar-ml/model-info');
  },

  // India-Scale Solar Intelligence
  async getIndiaSolarSummary(): Promise<IndiaNationalSolarSummary> {
    return fetchJson<IndiaNationalSolarSummary>('/solar-intelligence/summary');
  },

  async getIndiaSolarRegions(params?: {
    zone?: string;
    min_suitability?: number;
    search?: string;
  }): Promise<IndiaSolarRegion[]> {
    const query = new URLSearchParams();
    if (params?.zone) query.append('zone', params.zone);
    if (params?.min_suitability !== undefined) query.append('min_suitability', String(params.min_suitability));
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    return fetchJson<IndiaSolarRegion[]>(`/solar-intelligence/regions${qs ? `?${qs}` : ''}`);
  },

  async getIndiaSolarRegion(regionId: string): Promise<IndiaSolarRegion> {
    return fetchJson<IndiaSolarRegion>(`/solar-intelligence/regions/${encodeURIComponent(regionId)}`);
  },

  async getSampleCampusInfo(): Promise<SampleCampusMetadata> {
    return fetchJson<SampleCampusMetadata>('/solar-intelligence/sample-campus');
  },

  async getIndiaSolarMethodology(): Promise<any> {
    return fetchJson<any>('/solar-intelligence/methodology');
  },

  // Real Geospatial Dynamic Intelligence
  async getEnvironmentalProfile(lat: number, lng: number): Promise<EnvironmentalProfileResponse> {
    return fetchJson<EnvironmentalProfileResponse>(`/geospatial/environmental-profile?lat=${lat}&lng=${lng}`);
  },

  async getOsmBuildings(lat: number, lng: number, radiusM: number = 250): Promise<OsmBuildingsResponse> {
    return fetchJson<OsmBuildingsResponse>(`/geospatial/buildings?lat=${lat}&lng=${lng}&radius_m=${radiusM}`);
  },

  async getOpenAreaScreening(lat: number, lng: number): Promise<OpenAreaScreeningResponse> {
    return fetchJson<OpenAreaScreeningResponse>(`/geospatial/open-area-screening?lat=${lat}&lng=${lng}`);
  },

  async getSunPosition(lat: number, lng: number, tzOffset: number = 5.5): Promise<any> {
    return fetchJson<any>(`/geospatial/sun-position?lat=${lat}&lng=${lng}&tz_offset_hours=${tzOffset}`);
  }
};
