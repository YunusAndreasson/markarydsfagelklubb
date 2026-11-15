type MarkerId = string | number;
type Position = { id: MarkerId; latitude: number; longitude: number };
type Projected = { id: MarkerId; x: number; y: number };

/** Compare native projected points, so zoom, rotation and pitch are respected.
 * Identical coordinates remain selectable even if native projection fails. */
export function overlappingMarkerIds(
  markers: readonly Position[], selectedId: MarkerId,
  projected: readonly Projected[], hitSize: number,
): MarkerId[] {
  const selected = markers.find((marker) => marker.id === selectedId);
  if (!selected) return [];
  const origin = projected.find((point) => point.id === selectedId);
  return markers.filter((marker) => {
    if (marker.id === selectedId || (marker.latitude === selected.latitude && marker.longitude === selected.longitude)) return true;
    const point = projected.find((candidate) => candidate.id === marker.id);
    return origin && point && Math.abs(point.x - origin.x) < hitSize && Math.abs(point.y - origin.y) < hitSize;
  }).map((marker) => marker.id);
}
