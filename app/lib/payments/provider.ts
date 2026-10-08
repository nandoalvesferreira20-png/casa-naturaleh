import { MercadoPagoProvider } from "./mercado-pago";
import { PaymentError, type PaymentProvider, type PaymentProviderName } from "./types";

export function configuredProviderName(): PaymentProviderName {
  const name = process.env.PAYMENT_PROVIDER ?? "mercado_pago";
  if (name !== "mercado_pago") throw new PaymentError("Provedor de pagamento não configurado.", 503);
  return name;
}
export function getPaymentProvider(name = configuredProviderName()): PaymentProvider {
  if (name !== "mercado_pago") throw new PaymentError("Provedor de pagamento não disponível.", 503);
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? "";
  const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? "";
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? "";
  const webhookUrl = process.env.MERCADO_PAGO_WEBHOOK_URL ?? "";
  const environment = process.env.PAYMENTS_ENVIRONMENT ?? "test";
  if (!accessToken || !publicKey || !webhookSecret || !webhookUrl || !["test", "production"].includes(environment)) {
    throw new PaymentError("Pagamentos ainda não configurados. Seu pedido está salvo; tente novamente mais tarde.", 503);
  }
  if (environment === "test" && !accessToken.startsWith("TEST-")) throw new PaymentError("Configure credenciais de teste para habilitar os pagamentos neste ambiente.", 503);
  try { if (new URL(webhookUrl).protocol !== "https:") throw new Error(); } catch { throw new PaymentError("Configure uma URL HTTPS para as notificações de pagamento.", 503); }
  return new MercadoPagoProvider({ accessToken, publicKey, webhookSecret, webhookUrl, production: environment === "production" });
}
