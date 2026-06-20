const EARTH_RADIUS_KM = 6371;

export const toRadians = (value) => (Number(value) * Math.PI) / 180;

export const haversineDistanceKm = (a = {}, b = {}) => {
  const lat1 = Number(a.lat);
  const lng1 = Number(a.lng);
  const lat2 = Number(b.lat);
  const lng2 = Number(b.lng);

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2));
  const s3 = Math.sin(dLng / 2) ** 2;

  const c =
    2 * Math.atan2(Math.sqrt(s1 + s2 * s3), Math.sqrt(1 - (s1 + s2 * s3)));
  return EARTH_RADIUS_KM * c;
};

export const kmToSphereRadians = (km) => Number(km || 0) / EARTH_RADIUS_KM;

