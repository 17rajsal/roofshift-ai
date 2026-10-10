export type RoofPoint = [number, number]; // Latitude, longitude in degrees.

export function readRoofOutline(value: unknown): RoofPoint[] | null {
  if (!Array.isArray(value) || value.length < 3) return null;
  return value.every(point => Array.isArray(point) && point.length === 2
    && Number.isFinite(point[0]) && Math.abs(point[0]) <= 90
    && Number.isFinite(point[1]) && Math.abs(point[1]) <= 180) ? value as RoofPoint[] : null;
}

export function roofAreaSquareMeters(points: RoofPoint[]): number {
  if (points.length < 3) return 0;
  const radians = Math.PI / 180;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const delta = ((next[1] - current[1] + 540) % 360 - 180) * radians;
    sum += delta * (2 + Math.sin(current[0] * radians) + Math.sin(next[0] * radians));
  }
  return Math.abs(sum) * 6378137 ** 2 / 2;
}

function intersects(a: RoofPoint, b: RoofPoint, c: RoofPoint, d: RoofPoint): boolean {
  const cross = (p: RoofPoint, q: RoofPoint, r: RoofPoint) =>
    (q[1] - p[1]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[1] - p[1]);
  const overlap = (axis: number) => Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis]))
    <= Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis]));
  return overlap(0) && overlap(1) && cross(a, b, c) * cross(a, b, d) <= 0 && cross(c, d, a) * cross(c, d, b) <= 0;
}

export function isSimpleRoofOutline(points: RoofPoint[]): boolean {
  if (!readRoofOutline(points) || roofAreaSquareMeters(points) < 1) return false;
  if (new Set(points.map(point => point.join(','))).size !== points.length) return false;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
      if (intersects(points[i], points[(i + 1) % points.length], points[j], points[(j + 1) % points.length])) return false;
    }
  }
  return true;
}
