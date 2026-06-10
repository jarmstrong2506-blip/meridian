export function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalInches = Math.round(cm / 2.54);
  return { ft: Math.floor(totalInches / 12), in: totalInches % 12 };
}

export function ftInToCm(ft: number, inches: number): number {
  return Math.round(ft * 30.48 + inches * 2.54);
}

export function kgToLb(kg: number): number {
  return Math.round((kg / 0.453592) * 10) / 10;
}

export function lbToKg(lb: number): number {
  return Math.round(lb * 0.453592 * 10) / 10;
}

export function mToKm(m: number): number {
  return Math.round((m / 1000) * 100) / 100;
}

export function mToMiles(m: number): number {
  return Math.round((m / 1609.344) * 100) / 100;
}

export function kmToM(km: number): number {
  return Math.round(km * 1000);
}

export function milesToM(miles: number): number {
  return Math.round(miles * 1609.344);
}

export function formatDistance(metres: number, unit: 'km' | 'miles'): string {
  if (unit === 'km') return `${mToKm(metres).toFixed(2)} km`;
  return `${mToMiles(metres).toFixed(2)} mi`;
}

export function formatWeight(kg: number, unit: 'kg' | 'lb'): string {
  if (unit === 'kg') return `${kg.toFixed(1)} kg`;
  return `${kgToLb(kg).toFixed(1)} lb`;
}

export function formatHeight(cm: number, unit: 'cm' | 'ft'): string {
  if (unit === 'cm') return `${Math.round(cm)} cm`;
  const converted = cmToFtIn(cm);
  return `${converted.ft}'${converted.in}"`;
}

/**
 * Formats pace as "m:ss / km" or "m:ss / mi".
 * Returns '—' for zero or invalid inputs.
 */
export function formatPace(
  durationSeconds: number,
  distanceMeters: number,
  unit: 'km' | 'miles',
): string {
  if (durationSeconds <= 0 || distanceMeters <= 0) return '—';
  const distanceInUnit = unit === 'km' ? distanceMeters / 1000 : distanceMeters / 1609.344;
  if (distanceInUnit === 0) return '—';
  const secondsPerUnit = durationSeconds / distanceInUnit;
  const mins = Math.floor(secondsPerUnit / 60);
  const secs = Math.round(secondsPerUnit % 60);
  const label = unit === 'km' ? 'km' : 'mi';
  return `${mins}:${String(secs).padStart(2, '0')} / ${label}`;
}

/** Converts a user-entered distance value to metres for storage. */
export function toMetres(value: number, unit: 'km' | 'miles'): number {
  return unit === 'km' ? kmToM(value) : milesToM(value);
}
