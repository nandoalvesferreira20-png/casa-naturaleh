import type { Coordinates } from "./types";

export function validCoordinates(value: Coordinates): boolean {
  return Number.isFinite(value.lat) && Number.isFinite(value.lng) && Math.abs(value.lat) <= 90 && Math.abs(value.lng) <= 180;
}

// Raio em linha reta, não distância de trajeto rodoviário.
export function distanceKm(from: Coordinates, to: Coordinates): number {
  if (!validCoordinates(from) || !validCoordinates(to)) throw new Error("Coordenadas inválidas.");
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const a = Math.sin(radians(to.lat - from.lat) / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(radians(to.lng - from.lng) / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return distanceKm({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
}
