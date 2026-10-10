import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readRoofOutline, roofAreaSquareMeters, isSimpleRoofOutline } from '../src/utils/roofGeometry.ts';

test('roof measurement accounts for latitude and is independent of drawing direction', () => {
  const radius = 6378137;
  const latitude = 28.614;
  const latDelta = 20 / radius * 180 / Math.PI;
  const lonDelta = 40 / (radius * Math.cos(latitude * Math.PI / 180)) * 180 / Math.PI;
  const roof: [number, number][] = [[latitude, 77.209], [latitude + latDelta, 77.209], [latitude + latDelta, 77.209 + lonDelta], [latitude, 77.209 + lonDelta]];
  assert.ok(Math.abs(roofAreaSquareMeters(roof) - 800) < 0.1);
  assert.ok(Math.abs(roofAreaSquareMeters([...roof].reverse()) - 800) < 0.1);
  assert.equal(isSimpleRoofOutline(roof), true);
});

test('invalid persisted coordinates are ignored', () => {
  assert.equal(readRoofOutline([[91, 0], [0, 0], [0, 1]]), null);
  assert.equal(readRoofOutline([[0, 0], [0, 1], [NaN, 2]]), null);
  assert.equal(readRoofOutline({ coordinates: [] }), null);
  assert.equal(readRoofOutline([[0, 0], [0, 1]]), null);
});

test('crossed and repeated outlines cannot be saved', () => {
  assert.equal(isSimpleRoofOutline([[28.614, 77.209], [28.615, 77.210], [28.614, 77.210], [28.615, 77.209]]), false);
  assert.equal(isSimpleRoofOutline([[28.614, 77.209], [28.615, 77.210], [28.614, 77.209]]), false);
  assert.equal(isSimpleRoofOutline([[28.614, 77.209], [28.615, 77.209], [28.616, 77.209]]), false);
});
