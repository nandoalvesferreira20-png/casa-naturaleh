"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import type { PaymentInput, PaymentMethod } from "../../lib/payments/types";

type BrickData = { token?: string; payment_method_id: string; installments?: number; issuer_id?: string; payer?: { identification?: PaymentInput["identification"] } };
type Controller = { unmount(): Promise<void> };
type BrickSettings = {
  initialization: { amount: number };
  customization: { paymentMethods: { creditCard?: "all"; bankTransfer?: string[]; ticket?: string[]; maxInstallments?: number } };
  callbacks: { onReady(): void; onError(): void; onSubmit(data: { formData: BrickData }): Promise<void> };
};
declare global {
  interface Window {
    MercadoPago?: new (key: string, config: { locale: string }) => { bricks(): { create(type: "payment", id: string, settings: BrickSettings): Promise<Controller> } };
  }
}
type Props = { publicKey: string; amount: number; method: PaymentMethod; onSubmit(data: PaymentInput): Promise<void> };

// Único componente que conhece o SDK e os campos específicos deste gateway.
export default function MercadoPagoForm({ publicKey, amount, method, onSubmit }: Props) {
  const id = `payment-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const lifecycle = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    if (!loaded) return;
    let disposed = false;
    let controller: Controller | undefined;
    // Serializa montagem/desmontagem inclusive no StrictMode e em troca de props.
    lifecycle.current = lifecycle.current.then(async () => {
      if (disposed || !window.MercadoPago) return;
      setReady(false); setError("");
      const sdk = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      controller = await sdk.bricks().create("payment", id, {
        initialization: { amount },
        customization: { paymentMethods: method === "pix" ? { bankTransfer: ["pix"] } : method === "boleto" ? { ticket: ["bolbradesco"] } : { creditCard: "all", maxInstallments: 12 } },
        callbacks: {
          onReady: () => { if (!disposed) setReady(true); },
          onError: () => { if (!disposed) setError("Não foi possível preparar o formulário de pagamento. Atualize a página para tentar novamente."); },
          onSubmit: async ({ formData }) => {
            if (disposed) return;
            const identification = formData.payer?.identification;
            if (!identification) {
              setError("Informe seu documento no formulário de pagamento.");
              throw new Error("Documento obrigatório.");
            }
            // Nunca encaminhar transaction_amount, número de cartão ou CVV à nossa API.
            await onSubmit({ methodId: formData.payment_method_id, identification,
              ...(method === "cartao" ? { token: formData.token, installments: formData.installments, ...(formData.issuer_id ? { issuerId: formData.issuer_id } : {}) } : {}),
            });
          },
        },
      });
    }).catch(() => { if (!disposed) setError("Não foi possível carregar o formulário seguro de pagamento."); });
    return () => {
      disposed = true;
      lifecycle.current = lifecycle.current.then(async () => { await controller?.unmount(); }).catch(() => {});
    };
  }, [loaded, publicKey, amount, method, id, onSubmit]);
  return <>
    <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" onReady={() => setLoaded(true)} onError={() => setError("Não foi possível carregar o formulário seguro. Verifique sua conexão.")} />
    {!ready && !error && <p className="text-sm text-[var(--color-text-light)]">Preparando pagamento...</p>}
    {error && <p role="alert" className="text-sm text-[var(--color-text)]">{error}</p>}
    <div id={id} />
  </>;
}
