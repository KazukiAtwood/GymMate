export function distanceKm(
  latitude: number,
  longitude: number,
  gymLatitude: number,
  gymLongitude: number,
) {
  const radians = Math.PI / 180;
  const east =
    (gymLongitude - longitude) * radians * Math.cos(((latitude + gymLatitude) * radians) / 2);

  return 6371 * Math.hypot(east, (gymLatitude - latitude) * radians);
}

export function formatBirdDistance(kilometers: number) {
  return `à ${Math.round(kilometers)} km à vol d'oiseau`;
}
