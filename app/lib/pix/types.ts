import { paymentLabels, type PaymentRecord, type PaymentStatus } from "../payments/types";

export type ManualPixPayment = {
  provider: "pix_manual";
  method: "pix";
  status: "pending" | "approved" | "cancelled";
  txid: string;
  pixCopyPaste: string;
};
export type LocalPayment = { provider: "manual"; method: "local"; status: "pending" | "approved" | "cancelled" };
export type OrderPayment = PaymentRecord | ManualPixPayment | LocalPayment;

// O painel de pedidos existente confirma pelo status raiz, sem alterar regras ou migrar documentos.
export function orderPaymentLabel(payment: OrderPayment | undefined, orderStatus: string): string {
  if (payment?.provider === "pix_manual" || payment?.provider === "manual") {
    if (orderStatus === "cancelado") return "Pedido cancelado";
    if (payment.provider === "manual") return orderStatus === "pagamento_aprovado" || payment.status === "approved" ? "Pagamento aprovado" : "Pagamento na retirada";
    if (["pagamento_aprovado", "em_preparacao", "em_separacao", "enviado", "entregue"].includes(orderStatus)) return "Pagamento aprovado";
    return "Aguardando confirmação";
  }
  return paymentLabels[payment?.status as PaymentStatus] ?? orderStatus.replaceAll("_", " ");
}
