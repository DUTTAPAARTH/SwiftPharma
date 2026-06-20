const KOLKATA_CENTER = { lat: 22.5726, lng: 88.3639 };

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const toFiniteNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const hashText = (value = "") => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  }
  return hash;
};

export const normalizeStatusKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const resolveDestinationFromAddress = (address = "") => {
  const hash = hashText(String(address || ""));
  const latOffset = ((hash % 200) - 100) / 10000;
  const lngOffset = ((Math.floor(hash / 7) % 200) - 100) / 10000;

  return {
    lat: Number((KOLKATA_CENTER.lat + latOffset).toFixed(6)),
    lng: Number((KOLKATA_CENTER.lng + lngOffset).toFixed(6)),
  };
};

export const getTrackingStartPoint = () => {
  const latOffset = (Math.random() - 0.5) * 0.03;
  const lngOffset = (Math.random() - 0.5) * 0.03;
  return {
    lat: Number((KOLKATA_CENTER.lat + latOffset).toFixed(6)),
    lng: Number((KOLKATA_CENTER.lng + lngOffset).toFixed(6)),
  };
};

export const appendTrackingEvent = (orderLike, status, description) => {
  if (!orderLike.tracking) orderLike.tracking = {};
  if (!Array.isArray(orderLike.tracking.statusHistory)) {
    orderLike.tracking.statusHistory = [];
  }
  orderLike.tracking.statusHistory.push({
    status,
    description,
    timestamp: new Date(),
  });
};

export const ensureTrackingInitialized = (orderLike, options = {}) => {
  const now = new Date();
  const destination = resolveDestinationFromAddress(orderLike.address || "");
  const current = getTrackingStartPoint();

  if (!orderLike.tracking || options.reset) {
    orderLike.tracking = {
      deliveryAgentName: orderLike?.tracking?.deliveryAgentName || "",
      currentLocation: {
        lat: current.lat,
        lng: current.lng,
        updatedAt: now,
      },
      destinationLocation: {
        lat: destination.lat,
        lng: destination.lng,
      },
      estimatedDeliveryTime: new Date(now.getTime() + 45 * 60 * 1000),
      statusHistory: Array.isArray(orderLike?.tracking?.statusHistory)
        ? orderLike.tracking.statusHistory
        : [],
    };
    return orderLike.tracking;
  }

  if (!orderLike.tracking.currentLocation) {
    orderLike.tracking.currentLocation = {
      lat: current.lat,
      lng: current.lng,
      updatedAt: now,
    };
  }

  orderLike.tracking.currentLocation.lat = clamp(
    toFiniteNumber(orderLike.tracking.currentLocation.lat) ?? current.lat,
    -90,
    90,
  );
  orderLike.tracking.currentLocation.lng = clamp(
    toFiniteNumber(orderLike.tracking.currentLocation.lng) ?? current.lng,
    -180,
    180,
  );
  if (!orderLike.tracking.currentLocation.updatedAt) {
    orderLike.tracking.currentLocation.updatedAt = now;
  }

  if (!orderLike.tracking.destinationLocation) {
    orderLike.tracking.destinationLocation = {
      lat: destination.lat,
      lng: destination.lng,
    };
  }

  orderLike.tracking.destinationLocation.lat = clamp(
    toFiniteNumber(orderLike.tracking.destinationLocation.lat) ??
      destination.lat,
    -90,
    90,
  );
  orderLike.tracking.destinationLocation.lng = clamp(
    toFiniteNumber(orderLike.tracking.destinationLocation.lng) ??
      destination.lng,
    -180,
    180,
  );

  if (!orderLike.tracking.estimatedDeliveryTime) {
    orderLike.tracking.estimatedDeliveryTime = new Date(
      now.getTime() + 45 * 60 * 1000,
    );
  }

  if (!Array.isArray(orderLike.tracking.statusHistory)) {
    orderLike.tracking.statusHistory = [];
  }

  return orderLike.tracking;
};

