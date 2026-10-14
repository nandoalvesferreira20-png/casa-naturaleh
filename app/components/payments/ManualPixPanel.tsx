"use client";

import { useEffect, useRef, useState } from "react";
import { orderPaymentLabel, type ManualPixPayment } from "../../lib/pix/types";

type Props = { orderId: string; total: number; orderStatus: string; payment: ManualPixPayment };

export default function ManualPixPanel({ orderId, total, orderStatus, payment }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [qrError, setQrError] = useState(false);
  const [feedback, setFeedback] = useState("");
  const pending = orderStatus === "aguardando_pagamento";
  const payload = typeof payment.pixCopyPaste === "string" ? payment.pixCopyPaste : "";

  useEffect(() => {
    const target = canvas.current;
    if (!pending || !payload || !target) return;
    let cancelled = false;
    // O pacote codifica apenas o payload salvo pelo backend. Nenhuma API externa.
    import("qrcode").then(async QRCode => {
      if (cancelled) return;
      await QRCode.toCanvas(target, payload, { width: 256, margin: 4, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
      if (!cancelled) setQrError(false);
    }).catch(() => { if (!cancelled) setQrError(true); });
    return () => { cancelled = true; };
  }, [payload, pending]);

  async function copyPix() {
    try {
      await navigator.clipboard.writeText(payload);
      setFeedback("Código Pix copiado!");
    } catch { setFeedback("Não foi possível copiar automaticamente. Selecione e copie o código abaixo."); }
  }

  return <section className="rounded-[1.5rem] bg-white p-6 md:p-8 cn-card">
    <h2 className="text-2xl font-normal">Pagamento via Pix</h2>
    <p className="mt-3 text-sm text-[var(--color-text-light)]">Pedido #{orderId}</p>
    <p className="mt-3 font-semibold">Valor: {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
    <p className="mt-3 text-sm" role="status">{orderPaymentLabel(payment, orderStatus)}</p>
    {pending && payload ? <div className="mt-5 space-y-4">
      <canvas ref={canvas} role="img" aria-label="QR Code Pix do pedido" className="h-auto w-full max-w-[256px]" />
      {qrError && <p role="alert" className="text-sm">Não foi possível desenhar o QR Code. Use o Pix copia e cola abaixo.</p>}
      <p className="break-all text-sm text-[var(--color-text-light)]">Referência Pix: {payment.txid}</p>
      <label htmlFor={`pix-${orderId}`} className="block text-sm font-semibold">Pix copia e cola</label>
      <textarea id={`pix-${orderId}`} readOnly value={payload} rows={4} className="w-full rounded-xl border border-[var(--color-bg-soft)] p-3 text-sm cn-input" />
      <button type="button" onClick={copyPix} className="rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 cn-button-primary">Copiar código Pix</button>
      {feedback && <p role="status" className="text-sm">{feedback}</p>}
      <p className="text-sm text-[var(--color-text-light)]">Após realizar o pagamento, aguarde a confirmação.</p>
    </div> : pending ? <p className="mt-4 text-sm">Dados Pix indisponíveis neste pedido. Entre em contato com a loja.</p> : null}
  </section>;
}
