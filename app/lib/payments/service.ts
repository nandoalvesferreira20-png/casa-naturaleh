import { createHash, randomUUID } from "node:crypto";
import { PaymentError, type PaymentOrder, type PaymentProvider, type PaymentProviderName, type PaymentRecord, type PaymentSession, type ProviderPayment, type PaymentMethod } from "./types";

export interface PaymentStore {
  get(id: string): Promise<PaymentOrder | null>;
  update(id: string, change: (order: PaymentOrder) => Partial<PaymentOrder> | null): Promise<void>;
}
export function initialPayment(provider: PaymentProviderName, method: PaymentMethod): PaymentRecord {
  return { provider, method, status: "pending", phase: "ready", operationId: randomUUID() };
}
export function validOrderId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new PaymentError("Pedido inválido.");
}

export class PaymentService {
  constructor(private readonly store: PaymentStore, private readonly resolve: (name: PaymentProviderName) => PaymentProvider) {}

  private async owned(id: string, uid: string) {
    validOrderId(id);
    if (!uid) throw new PaymentError("Faça login para acessar o pagamento.", 401);
    const order = await this.store.get(id);
    // Mesma resposta para não revelar pedidos de outras contas.
    if (!order || order.userId !== uid) throw new PaymentError("Pedido não encontrado.", 404);
    return order;
  }
  private session(id: string, order: PaymentOrder): PaymentSession {
    const payment = order.payment;
    return {
      orderId: id, amount: order.total, method: payment?.method ?? order.pagamento,
      provider: payment?.provider ?? null, status: payment?.status ?? "pending",
      phase: payment?.phase ?? "legacy", presentation: payment?.presentation ?? {},
      ...(payment?.phase === "ready" ? { publicKey: this.resolve(payment.provider).publicKey() } : {}),
    };
  }
  async getSession(id: string, uid: string) {
    let order = await this.owned(id, uid);
    if (order.payment?.phase === "creating" && !order.payment.providerPaymentId) {
      const found = await this.resolve(order.payment.provider).findPayment(id, order.payment.operationId);
      if (found) {
        // Recuperação de uma resposta perdida; aprovação continua dependente do webhook.
        await this.observe(order.payment.provider, found, false);
        order = await this.owned(id, uid);
      }
    }
    return this.session(id, order);
  }
  async create(id: string, uid: string, data: unknown) {
    const order = await this.owned(id, uid);
    const payment = order.payment;
    if (!payment) throw new PaymentError("Este pedido antigo não admite cobrança automática. Contate o atendimento.", 409);
    if (payment.phase === "created") return this.session(id, order);
    if (order.status !== "aguardando_pagamento" || !Number.isFinite(order.total) || order.total <= 0) throw new PaymentError("Pedido indisponível para pagamento.", 409);
    const provider = this.resolve(payment.provider);
    const input = provider.parseInput(data, payment.method);
    const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    await this.store.update(id, current => {
      if (current.userId !== uid || current.status !== "aguardando_pagamento" || current.total !== order.total || current.payment?.operationId !== payment.operationId) throw new PaymentError("O pedido foi alterado. Consulte seu status.", 409);
      if (current.payment.phase === "created") return null;
      if (current.payment.requestHash && current.payment.requestHash !== requestHash) throw new PaymentError("Já existe uma tentativa em processamento. Consulte o status ou contate o atendimento antes de tentar novamente.", 409);
      return { payment: { ...current.payment, phase: "creating", requestHash } };
    });
    const current = await this.owned(id, uid);
    if (current.payment?.phase === "created") return this.session(id, current);
    // O mesmo UUID e os mesmos dados são reutilizados em retries concorrentes.
    // Tokens/documentos são transitórios; somente o hash é persistido.
    const result = await provider.createPayment(id, current, input);
    await this.observe(provider.name, result, false);
    return this.session(id, await this.owned(id, uid));
  }
  async webhook(name: PaymentProviderName, request: Request) {
    const provider = this.resolve(name);
    const id = provider.validateWebhook(request);
    const payment = await provider.getPayment(id);
    await this.observe(name, payment, true);
  }
  private async observe(name: PaymentProviderName, result: ProviderPayment, confirmed: boolean) {
    validOrderId(result.orderId);
    await this.store.update(result.orderId, order => {
      const payment = order.payment;
      if (!payment || payment.provider !== name || payment.phase === "ready" ||
        payment.operationId !== result.operationId || payment.method !== result.method || result.currency !== "BRL" ||
        Math.round(order.total * 100) !== Math.round(result.amount * 100) ||
        (payment.providerPaymentId && payment.providerPaymentId !== result.id)) {
        throw new PaymentError("Pagamento não corresponde ao pedido.", 409);
      }
      if (payment.providerUpdatedAt && Date.parse(result.updatedAt) < Date.parse(payment.providerUpdatedAt)) return null;
      // Uma resposta de criação atrasada nunca desfaz a confirmação por webhook.
      if (!confirmed && payment.confirmed) return null;
      const status = result.status === "approved" && !confirmed ? "pending" : result.status;
      const next: PaymentRecord = {
        ...payment, phase: "created", providerPaymentId: result.id,
        status, providerStatus: result.rawStatus, providerStatusDetail: result.rawDetail,
        providerUpdatedAt: result.updatedAt, confirmed: confirmed || payment.confirmed || false,
        presentation: result.presentation,
      };
      let orderStatus = order.status;
      if (confirmed && status === "approved" && order.status === "aguardando_pagamento") {
        orderStatus = "pagamento_aprovado";
        // TODO: baixa de estoque idempotente na próxima sprint, com registro/outbox transacional.
        // Nenhuma alteração em products.estoque nesta camada.
      }
      if (JSON.stringify(payment) === JSON.stringify(next) && orderStatus === order.status) return null;
      return { payment: next, status: orderStatus };
    });
  }
}
