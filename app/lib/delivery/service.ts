import { geocodeAddress } from "./geocoding";
import { distanceKm, validCoordinates } from "./distance";
import { DELIVERY_FEE, DELIVERY_RADIUS_KM, INCONCLUSIVE_MESSAGE, DeliveryError, type Coordinates, type Precision, type DeliveryAddress, type Fulfillment } from "./types";

export function assessDelivery(location: Coordinates & { precision: Precision; alternatives?: Coordinates[] }) {
  const lat = process.env.STORE_LAT?.trim();
  const lng = process.env.STORE_LNG?.trim();
  const store = { lat: Number(lat), lng: Number(lng) };
  if (!lat || !lng || !validCoordinates(store)) {
    throw new DeliveryError("A validação de entrega está indisponível. Tente novamente mais tarde ou escolha retirada na loja.", 503);
  }
  const distances = [location, ...(location.alternatives ?? [])].map(point => distanceKm(store, point));
  const distance = Math.max(...distances);
  const nearest = Math.min(...distances);
  if (process.env.NODE_ENV === "development") console.info("[delivery:distance]", { distanceKm: Number(distance.toFixed(3)) });
  if (location.precision === "LOW") return { decision: "inconclusive", message: INCONCLUSIVE_MESSAGE, distanceKm: distance };
  if (nearest > DELIVERY_RADIUS_KM) return { decision: "outside", message: "Este endereço está fora da nossa área de entrega de 15 km.", distanceKm: distance };
  if (distance > DELIVERY_RADIUS_KM) return { decision: "inconclusive", message: INCONCLUSIVE_MESSAGE, distanceKm: distance };
  if (location.precision !== "HIGH" && (location.precision !== "MEDIUM" || distance > 13)) return { decision: "inconclusive", message: INCONCLUSIVE_MESSAGE, distanceKm: distance };
  return { decision: "allowed", message: "Entrega disponível — R$ 15,00", distanceKm: distance };
}

export async function validateDelivery(address: DeliveryAddress): Promise<Fulfillment> {
  const assessment = assessDelivery(await geocodeAddress(address));
  if (assessment.decision !== "allowed") throw new DeliveryError(assessment.message);
  return { type: "delivery", shippingFee: DELIVERY_FEE, distanceKm: assessment.distanceKm };
}
