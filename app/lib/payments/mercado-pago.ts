import { createHmac, timingSafeEqual } from "node:crypto";
import { PaymentError, type PaymentInput, type PaymentMethod, type PaymentOrder, type PaymentProvider, type PaymentStatus, type ProviderPayment } from "./types";

type Config = { accessToken: string; publicKey: string; webhookSecret: string; webhookUrl: string; production: boolean };
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function httpsUrl(value: unknown): string | undefined {
  try { const url = new URL(text(value)); return url.protocol === "https:" ? url.toString() : undefined; } catch { return undefined; }
}
export function normalizeStatus(status: string, detail = ""): PaymentStatus {
  if (status === "approved" && detail === "partially_refunded") return "partially_refunded";
  const mapping: Record<string, PaymentStatus> = {
    pending: "pending", in_process: "pending", authorized: "pending", approved: "approved",
    rejected: "rejected", cancelled: "cancelled", refunded: "refunded", in_mediation: "disputed", charged_back: "charged_back",
  };
  return mapping[status] ?? "pending";
}

export class MercadoPagoProvider implements PaymentProvider {
  readonly name = "mercado_pago" as const;
  constructor(private readonly config: Config, private readonly request: typeof fetch = fetch) {}
  publicKey() { return this.config.publicKey; }

  parseInput(value: unknown, method: PaymentMethod): PaymentInput {
    const input = object(value);
    const document = object(input.identification);
    const type = document.type;
    const number = text(document.number).replace(/\D/g, "");
    if ((type !== "CPF" && type !== "CNPJ") || !new RegExp(`^\\d{${type === "CPF" ? 11 : 14}}$`).test(number)) {
      throw new PaymentError("Informe um CPF ou CNPJ válido no formulário de pagamento.");
    }
    const methodId = text(input.methodId);
    const result: PaymentInput = { methodId, identification: { type, number } };
    if (method === "pix" && methodId !== "pix") throw new PaymentError("Método de pagamento inválido.");
    if (method === "boleto" && methodId !== "bolbradesco") throw new PaymentError("Método de boleto inválido.");
    if (method === "cartao") {
      if (!/^[a-zA-Z0-9_-]{1,50}$/.test(methodId) || ["pix", "bolbradesco"].includes(methodId)) throw new PaymentError("Bandeira de cartão inválida.");
      const token = text(input.token);
      if (!/^[a-zA-Z0-9_-]{10,256}$/.test(token)) throw new PaymentError("Token do cartão inválido ou expirado. Confira o formulário.");
      if (typeof input.installments !== "number" || !Number.isInteger(input.installments) || input.installments < 1 || input.installments > 12) throw new PaymentError("Parcelamento inválido.");
      result.token = token; result.installments = input.installments;
      if (input.issuerId !== undefined) {
        if (!/^\d{1,20}$/.test(String(input.issuerId))) throw new PaymentError("Emissor do cartão inválido.");
        result.issuerId = String(input.issuerId);
      }
    }
    return result;
  }

  private async api(path: string, body?: unknown, key?: string): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await this.request(`https://api.mercadopago.com${path}`, {
        method: body ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${this.config.accessToken}`, "Content-Type": "application/json", ...(key ? { "X-Idempotency-Key": key } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new PaymentError("O provedor de pagamento não respondeu. Consulte o status antes de tentar novamente.", 503); }
    if (!response.ok) {
      if (response.status === 404) throw new PaymentError("Pagamento não encontrado no provedor.", 404);
      if ([400, 422].includes(response.status)) throw new PaymentError("O provedor não aceitou os dados de pagamento. Confira os dados ou contate o atendimento.", 422);
      throw new PaymentError("Pagamento temporariamente indisponível. Consulte o status novamente em instantes.", 503);
    }
    try { return object(await response.json()); } catch { throw new PaymentError("Resposta inesperada do provedor de pagamento.", 502); }
  }

  private normalize(data: Record<string, unknown>): ProviderPayment {
    const id = String(data.id ?? "");
    const orderId = text(data.external_reference);
    const metadata = object(data.metadata);
    const rawStatus = text(data.status), rawDetail = text(data.status_detail);
    const updatedAt = text(data.date_last_updated);
    const method: PaymentMethod | null = data.payment_method_id === "pix" ? "pix" : data.payment_method_id === "bolbradesco" ? "boleto" : data.payment_type_id === "credit_card" ? "cartao" : null;
    if (!/^\d+$/.test(id) || !orderId || !method || !rawStatus || !Number.isFinite(Date.parse(updatedAt)) ||
      typeof data.transaction_amount !== "number" || !Number.isFinite(data.transaction_amount) ||
      data.live_mode !== this.config.production || data.currency_id !== "BRL") {
      throw new PaymentError("Resposta de pagamento incompatível com o pedido ou ambiente.", 502);
    }
    const transaction = object(object(data.point_of_interaction).transaction_data);
    const details = object(data.transaction_details);
    const qrCode = text(transaction.qr_code), qrCodeBase64 = text(transaction.qr_code_base64);
    const barcode = text(object(data.barcode).content);
    const ticketUrl = httpsUrl(details.external_resource_url) ?? httpsUrl(transaction.ticket_url);
    const expiresAt = text(data.date_of_expiration);
    return {
      id, orderId, operationId: text(metadata.payment_operation), amount: data.transaction_amount, currency: "BRL",
      status: normalizeStatus(rawStatus, rawDetail), rawStatus, rawDetail, method, updatedAt,
      presentation: {
        ...(qrCode && qrCode.length < 10000 ? { qrCode } : {}),
        ...(qrCodeBase64 && qrCodeBase64.length < 300000 && /^[A-Za-z0-9+/=]+$/.test(qrCodeBase64) ? { qrCodeBase64 } : {}),
        ...(ticketUrl ? { ticketUrl } : {}), ...(barcode ? { barcode } : {}),
        ...(expiresAt && Number.isFinite(Date.parse(expiresAt)) ? { expiresAt } : {}),
      },
    };
  }

  async createPayment(orderId: string, order: PaymentOrder, input: PaymentInput) {
    const names = order.cliente.nome.trim().split(/\s+/);
    const body = {
      transaction_amount: order.total, description: `Pedido Casa Naturaleh ${orderId}`,
      external_reference: orderId, metadata: { payment_operation: order.payment!.operationId },
      notification_url: this.config.webhookUrl,
      payment_method_id: input.methodId,
      ...(input.token ? { token: input.token, installments: input.installments, ...(input.issuerId ? { issuer_id: input.issuerId } : {}) } : {}),
      payer: {
        email: order.cliente.email, first_name: names[0], last_name: names.slice(1).join(" ") || names[0],
        identification: input.identification,
        ...(order.payment!.method === "boleto" ? { address: {
          zip_code: order.endereco.cep.replace(/\D/g, ""), street_name: order.endereco.rua,
          street_number: order.endereco.numero, neighborhood: order.endereco.bairro,
          city: order.endereco.cidade, federal_unit: order.endereco.estado,
        } } : {}),
      },
    };
    return this.normalize(await this.api("/v1/payments", body, order.payment!.operationId));
  }
  async getPayment(id: string) {
    if (!/^\d{1,30}$/.test(id)) throw new PaymentError("ID de pagamento inválido.");
    const result = this.normalize(await this.api(`/v1/payments/${id}`));
    if (result.id !== id) throw new PaymentError("Pagamento retornado não corresponde à consulta.", 502);
    return result;
  }
  async findPayment(orderId: string, operationId: string) {
    const query = new URLSearchParams({ external_reference: orderId, sort: "date_created", criteria: "desc", limit: "100" });
    const response = await this.api(`/v1/payments/search?${query}`);
    if (!Array.isArray(response.results)) throw new PaymentError("Não foi possível consultar o pagamento.", 502);
    const found = response.results.map(object).find(item => object(item.metadata).payment_operation === operationId);
    return found ? this.getPayment(String(found.id)) : null;
  }
  validateWebhook(request: Request) {
    const id = new URL(request.url).searchParams.get("data.id")?.toLowerCase() ?? "";
    const requestId = request.headers.get("x-request-id") ?? "";
    const signature = request.headers.get("x-signature") ?? "";
    const parts = signature.split(",").map(part => part.trim().split("="));
    const ts = parts.find(([key]) => key === "ts")?.[1];
    const hashes = parts.filter(([key]) => key === "v1").map(([, value]) => value);
    if (!/^\d{1,30}$/.test(id) || !requestId || !ts || !/^\d+$/.test(ts)) throw new PaymentError("Assinatura de webhook inválida.", 401);
    const expected = createHmac("sha256", this.config.webhookSecret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest();
    if (!hashes.some(hash => /^[a-fA-F0-9]{64}$/.test(hash ?? "") && timingSafeEqual(expected, Buffer.from(hash, "hex")))) {
      throw new PaymentError("Assinatura de webhook inválida.", 401);
    }
    // Replays são inofensivos: o serviço consulta o recurso atual e aplica atualização idempotente.
    return id;
  }
}
