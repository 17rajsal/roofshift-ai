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
  SystemIntegrationsResponse
} from '../types/models';

const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });

  if (!res.ok) {
    let errorDetail = 'API Request failed';
    try {
      const err = await res.json();
      errorDetail = err.detail || err.message || errorDetail;
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail);
  }

  if (res.status === 204) {
    return {} as T;
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
  async getBuildings(projectId: string): Promise<Building[]> {
    return fetchJson<Building[]>(`/projects/${projectId}/buildings`);
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
      let errorDetail = 'CSV upload failed';
      try {
        const err = await res.json();
        errorDetail = err.detail || err.message || errorDetail;
      } catch {}
      throw new Error(errorDetail);
    }
    return res.json();
  },

  // AWS System Integrations
  async getSystemIntegrations(): Promise<SystemIntegrationsResponse> {
    return fetchJson<SystemIntegrationsResponse>('/system/integrations');
  }
};
