export type PaymentMethod = "pix" | "cartao" | "boleto";
export type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled" | "refunded" | "partially_refunded" | "disputed" | "charged_back";
export type PaymentProviderName = "mercado_pago";
export type PaymentPresentation = {
  qrCode?: string; qrCodeBase64?: string; ticketUrl?: string; barcode?: string; expiresAt?: string;
};
export type PaymentRecord = {
  provider: PaymentProviderName;
  method: PaymentMethod;
  status: PaymentStatus;
  operationId: string;
  phase: "ready" | "creating" | "created";
  requestHash?: string;
  providerPaymentId?: string;
  providerStatus?: string;
  providerStatusDetail?: string;
  providerUpdatedAt?: string;
  confirmed?: boolean;
  presentation?: PaymentPresentation;
};
export type PaymentOrder = {
  userId: string; total: number; status: string; pagamento: PaymentMethod;
  cliente: { nome: string; email: string; telefone: string };
  endereco: { cep: string; rua: string; numero: string; bairro: string; cidade: string; estado: string; complemento?: string };
  payment?: PaymentRecord;
};
export type ProviderPayment = {
  id: string; orderId: string; operationId: string; amount: number; currency: string;
  status: PaymentStatus; rawStatus: string; rawDetail: string; method: PaymentMethod;
  updatedAt: string; presentation: PaymentPresentation;
};
export type PaymentInput = {
  token?: string; methodId: string; installments?: number; issuerId?: string;
  identification: { type: "CPF" | "CNPJ"; number: string };
};
export type PaymentSession = {
  orderId: string; amount: number; method: PaymentMethod;
  provider: PaymentProviderName | null; publicKey?: string;
  status: PaymentStatus; phase: "ready" | "creating" | "created" | "legacy";
  presentation: PaymentPresentation;
};
export interface PaymentProvider {
  readonly name: PaymentProviderName;
  publicKey(): string;
  parseInput(input: unknown, method: PaymentMethod): PaymentInput;
  createPayment(orderId: string, order: PaymentOrder, input: PaymentInput): Promise<ProviderPayment>;
  getPayment(paymentId: string): Promise<ProviderPayment>;
  findPayment(orderId: string, operationId: string): Promise<ProviderPayment | null>;
  validateWebhook(request: Request): string;
}
export class PaymentError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
export const paymentLabels: Record<PaymentStatus, string> = {
  pending: "Aguardando confirmação do pagamento", approved: "Pagamento aprovado",
  rejected: "Pagamento recusado", cancelled: "Pagamento cancelado", refunded: "Pagamento reembolsado",
  partially_refunded: "Pagamento parcialmente reembolsado", disputed: "Pagamento em contestação", charged_back: "Pagamento estornado",
};
