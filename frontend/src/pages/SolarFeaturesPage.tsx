import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { solarFeatureApi, type FeatureTemplate, type FeatureInput, type FeatureValue } from '../services/solarFeatureApi';

const label = (key: string) => key.replace(/_/g, ' ').replace(/\bkwp\b/g, 'kWp').replace(/\bkwh\b/g, 'kWh').replace(/\binr\b/g, 'INR').replace(/\bco2e?\b/g, 'CO2').replace(/^./, char => char.toUpperCase());
const options: Record<string, string[]> = {
  data_basis: ['measured', 'climatology', 'forecast', 'user_assumption'],
  sensor_status: ['unknown', 'online', 'offline'], operating_status: ['unknown', 'online', 'offline'],
  inverter_status: ['unknown', 'normal', 'fault', 'offline'],
};
const numeric = (key: string) => /(_kw|_kwp|_kwh|_sqm|_v|_c|_w_m2|_pct|_fraction|_inr|_day|_years|_days|_minutes)$/.test(key) || ['latitude', 'longitude', 'year', 'month'].includes(key);
const inputClass = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none';

function InputFields({ value, onChange, fixedArray = false }: { value: FeatureInput; onChange: (next: FeatureInput) => void; fixedArray?: boolean }) {
  return <div className="grid gap-4 sm:grid-cols-2">{Object.entries(value).map(([key, child]) => {
    const change = (next: FeatureValue) => onChange({ ...value, [key]: next });
    if (Array.isArray(child)) return <fieldset key={key} className="sm:col-span-2 rounded-xl border border-slate-200 p-4">
      <legend className="px-1 font-semibold text-[#123C32]">{label(key)}</legend>
      <div className="space-y-4">{child.map((record, index) => <div key={index} className="rounded-lg bg-slate-50 p-3">
        <div className="mb-3 flex justify-between text-sm font-medium"><span>{label(key)} {index + 1}</span>{!fixedArray && key !== 'monthly_irradiance' && <button type="button" className="text-red-700" onClick={() => change(child.filter((_, item) => item !== index))}>Remove</button>}</div>
        {record && typeof record === 'object' && !Array.isArray(record) && <InputFields value={record} onChange={next => change(child.map((item, itemIndex) => itemIndex === index ? next : item))} />}
      </div>)}</div>
      {key !== 'monthly_irradiance' && child.length > 0 && <button type="button" className="mt-3 rounded-lg border border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-800" onClick={() => {
        const sample = structuredClone(child[child.length - 1]);
        if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
          for (const field of Object.keys(sample)) if (field === 'panel_id' || field === 'site_id') sample[field] = `${sample[field]} ${child.length + 1}`;
          for (const field of ['actual_energy_kwh', 'expected_energy_kwh', 'average_power_kw', 'energy_kwh', 'voltage_v', 'expected_voltage_v', 'irradiance_w_m2', 'temperature_c', 'last_cleaned_at', 'last_inspected_at', 'soiling_loss_pct']) if (field in sample) sample[field] = null;
          for (const field of ['sensor_status', 'operating_status', 'inverter_status']) if (field in sample) sample[field] = 'unknown';
        }
        change([...child, sample]);
      }}>Add {key === 'intervals' ? 'interval' : key === 'candidates' ? 'rooftop' : 'panel'}</button>}
      {child.length === 0 && <p className="text-sm text-slate-500">No entries available. Add buildings and run their solar analysis to populate rooftop candidates, or restore the starting inputs.</p>}
      {key === 'candidates' && child.length === 0 && <button type="button" className="mt-3 rounded-lg border border-emerald-700 px-3 py-2 text-sm text-emerald-800" onClick={() => change([{ site_id: 'Site 1', name: 'New rooftop', latitude: null, longitude: null, roof_area_sqm: null, ghi_kwh_m2_day: null, irradiance_source: 'User supplied irradiation', data_basis: 'user_assumption', usable_roof_fraction: 0.8, shading_loss_pct: 0 }])}>Add rooftop candidate</button>}
    </fieldset>;
    if (child && typeof child === 'object') return <fieldset key={key} className="sm:col-span-2"><legend>{label(key)}</legend><InputFields value={child} onChange={change} /></fieldset>;
    return <label key={key} className="block text-sm text-slate-600"><span className="mb-1 block font-medium">{label(key)}{key.endsWith('_fraction') ? ' (0 to 1)' : ''}</span>
      {options[key] ? <select className={inputClass} value={String(child ?? '')} onChange={event => change(event.target.value)}>{options[key].map(option => <option key={option} value={option}>{label(option)}</option>)}</select> :
        <input className={inputClass} type={numeric(key) || typeof child === 'number' ? 'number' : 'text'} step="any" value={child === null ? '' : String(child)} placeholder={child === null ? 'Unknown / enter observed value' : undefined} onChange={event => change(event.target.value === '' ? null : numeric(key) || typeof child === 'number' ? Number(event.target.value) : event.target.value)} />}
    </label>;
  })}</div>;
}

function ResultFields({ value }: { value: FeatureValue }) {
  if (value === null) return <span className="text-slate-500">Not available</span>;
  if (Array.isArray(value)) return <div className="space-y-3">{value.map((item, index) => <div key={index} className="rounded-lg border border-slate-200 p-3"><ResultFields value={item} /></div>)}</div>;
  if (typeof value === 'object') return <dl className="grid gap-3 sm:grid-cols-2">{Object.entries(value).filter(([key]) => key !== 'contract_version').map(([key, child]) => child && typeof child === 'object' ?
    <details key={key} className="sm:col-span-2 rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer font-medium text-[#123C32]">{label(key)}{Array.isArray(child) ? ` (${child.length})` : ''}</summary><div className="mt-3"><ResultFields value={child} /></div></details> :
    <div key={key} className="rounded-lg bg-slate-50 p-3"><dt className="text-xs font-medium text-slate-500">{label(key)}</dt><dd className="mt-1 break-words font-semibold text-[#123C32]"><ResultFields value={child} /></dd></div>)}</dl>;
  return <span>{typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : typeof value === 'boolean' ? value ? 'Yes' : 'No' : value}</span>;
}

function FeatureForm({ projectId, template, initialResult, onSaved }: { projectId: string; template: FeatureTemplate; initialResult?: FeatureInput; onSaved: (key: string, result: FeatureInput) => void }) {
  const [inputs, setInputs] = useState<FeatureInput>(structuredClone(template.request));
  const [result, setResult] = useState<FeatureInput | undefined>(initialResult);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const calculation = useRef<AbortController | null>(null);
  useEffect(() => () => calculation.current?.abort(), []);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
    <h2 className="text-xl font-bold text-[#123C32]">{template.title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">{template.notice}</p>
    <form className="mt-6" onSubmit={async event => {
      event.preventDefault(); setError(''); setBusy(true); setSaved(false);
      const controller = new AbortController(); calculation.current = controller;
      try { const calculated = await solarFeatureApi.calculate(projectId, template.key, inputs, controller.signal); if (!controller.signal.aborted) { setResult(calculated); onSaved(template.key, calculated); setSaved(true); } }
      catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Assessment failed. Please try again.'); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }}>
      <InputFields value={inputs} onChange={next => { setInputs(next); setSaved(false); }} />
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-3"><button disabled={busy} className="rounded-lg bg-emerald-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{busy ? 'Calculating…' : 'Calculate & save assessment'}</button><button type="button" className="text-sm text-slate-600 underline" onClick={() => { setInputs(structuredClone(template.request)); setError(''); setSaved(false); }}>Restore starting inputs</button></div>
    </form>
    {result && <div className="mt-6 border-t border-slate-200 pt-5"><h3 className="mb-3 font-semibold text-[#123C32]">{saved ? 'Saved assessment — available in expanded PDF reports' : 'Last saved assessment'}</h3><ResultFields value={result} /></div>}
  </section>;
}

export function SolarFeaturesPage() {
  const { activeProject } = useProject();
  const [templates, setTemplates] = useState<FeatureTemplate[]>([]);
  const [results, setResults] = useState<Record<string, FeatureInput>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get('feature') || 'solar-location-finder';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setTemplates([]); setResults({}); setError(''); setLoading(true);
    const controller = new AbortController();
    if (!activeProject) { setLoading(false); return () => controller.abort(); }
    Promise.all([solarFeatureApi.templates(activeProject.id, controller.signal), solarFeatureApi.history(activeProject.id, controller.signal)])
      .then(([catalogue, history]) => {
        if (controller.signal.aborted) return;
        setTemplates(catalogue.features);
        const latest: Record<string, FeatureInput> = {};
        history.assessments.forEach(item => { latest[item.feature_key] ??= item.result; });
        setResults(latest);
      }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Could not load assessments.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [activeProject?.id, retry]);
  if (!activeProject) return <p>Select a planning project to use solar assessments.</p>;
  const template = templates.find(item => item.key === selected) || templates[0];
  return <div className="mx-auto max-w-6xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold text-[#123C32]">Solar Assessments</h1><p className="mt-1 text-sm text-slate-600">{activeProject.name} · Calculations, diagnostics and maintenance planning</p></div><Link className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800" to="/reports">Expanded PDF reports</Link></div>
    {loading && <p role="status">Loading project assessments…</p>}
    {error && <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error} <button className="underline" onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
    {templates.length > 0 && <><label className="block max-w-lg text-sm font-semibold text-[#123C32]">Assessment<select className={`${inputClass} mt-2`} value={template.key} onChange={event => setSearchParams({ feature: event.target.value })}>{templates.map(item => <option key={item.key} value={item.key}>{item.title}</option>)}</select></label><FeatureForm key={`${activeProject.id}:${template.key}`} projectId={activeProject.id} template={template} initialResult={results[template.key]} onSaved={(key, result) => setResults(previous => ({ ...previous, [key]: result }))} /></>}
  </div>;
}
