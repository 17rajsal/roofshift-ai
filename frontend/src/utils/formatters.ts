export function formatINR(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return '₹' + Math.round(val).toLocaleString('en-IN');
}

export function formatINRShort(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} Lakh`;
  }
  return '₹' + Math.round(val).toLocaleString('en-IN');
}

export function formatEnergy(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0 kWh';
  if (val >= 1000000) {
    return `${(val / 1000000).toFixed(2)} GWh`;
  }
  if (val >= 1000) {
    return `${(val / 1000).toFixed(1)} MWh`;
  }
  return `${Math.round(val).toLocaleString('en-IN')} kWh`;
}

export function formatPower(val?: number | null, unit: string = 'kWp'): string {
  if (val === undefined || val === null || isNaN(val)) return `0 ${unit}`;
  return `${val.toFixed(1)} ${unit}`;
}

export function formatArea(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0 m²';
  return `${Math.round(val).toLocaleString('en-IN')} m²`;
}

export function formatPct(val?: number | null, decimals: number = 1): string {
  if (val === undefined || val === null || isNaN(val)) return '0%';
  return `${val.toFixed(decimals)}%`;
}

export function formatCO2(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0 kg CO₂';
  if (val >= 1000) {
    return `${(val / 1000).toFixed(1)} tons CO₂`;
  }
  return `${Math.round(val).toLocaleString('en-IN')} kg CO₂`;
}
