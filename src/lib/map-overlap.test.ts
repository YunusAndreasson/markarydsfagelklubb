import { describe, expect, it } from 'vitest';
import { overlappingMarkerIds } from './map-overlap';

describe('map overlap selection', () => {
  const markers = [
    { id: 1, latitude: 56, longitude: 13 },
    { id: 2, latitude: 56, longitude: 13 },
    { id: 3, latitude: 56.1, longitude: 13.1 },
    { id: 4, latitude: 56.2, longitude: 13.2 },
  ];
  it('keeps coincident locations selectable without native projection', () => {
    expect(overlappingMarkerIds(markers, 1, [], 44)).toEqual([1, 2]);
  });
  it('includes projected neighbors but excludes isolated pins', () => {
    expect(overlappingMarkerIds(markers, 1, [
      { id: 1, x: 100, y: 200 }, { id: 3, x: 130, y: 220 }, { id: 4, x: 200, y: 200 },
    ], 44)).toEqual([1, 2, 3]);
  });
  it('keeps a direct selection for isolated pins and rejects a stale id', () => {
    expect(overlappingMarkerIds(markers, 4, [], 44)).toEqual([4]);
    expect(overlappingMarkerIds(markers, 99, [], 44)).toEqual([]);
  });
});
