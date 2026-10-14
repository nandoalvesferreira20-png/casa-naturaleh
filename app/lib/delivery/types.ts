export type FulfillmentType = "delivery" | "pickup";
export type Fulfillment = { type: "pickup"; shippingFee: 0 } | { type: "delivery"; shippingFee: number; distanceKm: number };
export type DeliveryAddress = { cep: string; rua: string; numero: string; complemento?: string; bairro: string; cidade: string; estado: string };
export type Coordinates = { lat: number; lng: number };
export type Precision = "HIGH" | "MEDIUM" | "LOW";
export const INCONCLUSIVE_MESSAGE = "Não conseguimos confirmar com precisão se esse endereço está dentro da área de entrega. Revise os dados ou escolha retirada na loja.";

export const STORE_ADDRESS = "Av. Francisco Prestes Maia, 561 - Centro, São Bernardo do Campo - SP, 09770-000";
export const DELIVERY_FEE = 15;
export const DELIVERY_RADIUS_KM = 15;

export function addressText(address?: DeliveryAddress | null): string {
  return address ? `${address.rua}, ${address.numero}${address.complemento ? ` - ${address.complemento}` : ""} - ${address.bairro}, ${address.cidade} - ${address.estado}, CEP ${address.cep}` : "Endereço não informado";
}

export class DeliveryError extends Error {
  constructor(message: string, readonly status = 422) { super(message); }
}
