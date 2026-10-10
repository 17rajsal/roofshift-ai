export type FeatureValue = string | number | boolean | null | FeatureValue[] | { [key: string]: FeatureValue };
export type FeatureInput = { [key: string]: FeatureValue };
export interface FeatureTemplate { key: string; title: string; notice: string; request: FeatureInput }
export interface FeatureAssessment { assessment_id: string; project_id: string; feature_key: string; created_at: string; inputs: FeatureInput; result: FeatureInput }
const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

async function request<T>(path: string, signal?: AbortSignal, body?: FeatureInput): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    signal, method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const detail = Array.isArray(error.detail) ? error.detail.map((item: { loc: string[]; msg: string }) => `${item.loc.filter(part => part !== 'body').join(' ')}: ${item.msg}`).join('; ') : error.detail;
    throw new Error(detail || `Could not complete the assessment (${response.status}).`);
  }
  return response.json();
}

export const solarFeatureApi = {
  templates: (projectId: string, signal?: AbortSignal) => request<{ project_id: string; features: FeatureTemplate[] }>(`/projects/${projectId}/features/templates`, signal),
  history: (projectId: string, signal?: AbortSignal) => request<{ assessments: FeatureAssessment[] }>(`/projects/${projectId}/features/latest`, signal),
  calculate: (projectId: string, key: string, body: FeatureInput, signal?: AbortSignal) => request<FeatureInput>(`/projects/${projectId}/features/${key}`, signal, body),
};
