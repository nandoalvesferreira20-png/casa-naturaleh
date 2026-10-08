"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { paymentLabels, type PaymentInput, type PaymentSession } from "../../lib/payments/types";
import MercadoPagoForm from "./MercadoPagoForm";

export default function PaymentPanel({ orderId }: { orderId: string }) {
  const { user } = useAuth();
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const submitting = useRef(false);
  const request = useCallback(async (paymentData?: PaymentInput, signal?: AbortSignal): Promise<PaymentSession> => {
    if (!user) throw new Error("Faça login para acessar o pagamento.");
    const token = await user.getIdToken();
    const response = await fetch(paymentData ? "/api/payments" : `/api/payments?orderId=${encodeURIComponent(orderId)}`, {
      method: paymentData ? "POST" : "GET", cache: "no-store", signal,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(paymentData ? { body: JSON.stringify({ orderId, paymentData }) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Pagamento indisponível.");
    return result as PaymentSession;
  }, [user, orderId]);
  const refresh = useCallback(async () => {
    try { setSession(await request()); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível consultar o pagamento."); }
  }, [request]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try { const result = await request(undefined, controller.signal); if (!controller.signal.aborted) { setSession(result); setError(""); } }
      catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Não foi possível preparar o pagamento. Use Consultar status para tentar novamente."); }
    }
    void load();
    const timer = setInterval(() => { if (!submitting.current) void load(); }, 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [request]);
  const submit = useCallback(async (data: PaymentInput) => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try { setSession(await request(data)); }
    catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o pagamento. Consulte o status antes de tentar novamente.");
      throw err;
    } finally { submitting.current = false; setBusy(false); }
  }, [request]);
  const presentation = session?.presentation;
  return <section className="rounded-[1.5rem] bg-white p-6 md:p-8" aria-busy={busy}>
    <h2 className="text-2xl font-semibold">Pagamento</h2>
    <p className="mt-3 text-sm text-[var(--color-text-light)]" role="status">
      {busy ? "Processando pagamento..." : session ? paymentLabels[session.status] : "Preparando pagamento..."}
    </p>
    {error && <p role="alert" className="mt-3 text-sm">{error}</p>}
    {session?.phase === "ready" && session.provider === "mercado_pago" && session.publicKey && <div className="mt-6">
      <MercadoPagoForm publicKey={session.publicKey} amount={session.amount} method={session.method} onSubmit={submit} />
    </div>}
    {session?.phase === "creating" && <p className="mt-3 text-sm">Estamos verificando a tentativa enviada. Consulte o status antes de iniciar outro pedido. Se não houver atualização, contate o atendimento.</p>}
    {session?.status === "rejected" && <p className="mt-3 text-sm">O pagamento foi recusado. Contate o atendimento para orientar uma nova tentativa.</p>}
    {session?.status === "pending" && <div className="mt-4 space-y-3">
      {presentation?.qrCodeBase64 && <div>
        {/* QR gerado pelo provedor, embutido e sem otimização de imagem remota. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${presentation.qrCodeBase64}`} alt="QR Code para pagamento via Pix" width={224} height={224} />
      </div>}
      {presentation?.qrCode && <>
        <label htmlFor={`pix-${orderId}`} className="block text-sm font-semibold">Código Pix copia e cola</label>
        <textarea id={`pix-${orderId}`} readOnly value={presentation.qrCode} className="w-full rounded-xl border border-[var(--color-bg-soft)] p-3 text-sm" />
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(presentation.qrCode!); setCopied(true); } catch { setError("Selecione e copie o código Pix manualmente."); } }} className="rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm text-white">{copied ? "Código copiado" : "Copiar código Pix"}</button>
      </>}
      {presentation?.barcode && <p className="break-all text-sm">Código de barras: {presentation.barcode}</p>}
      {presentation?.ticketUrl && <a href={presentation.ticketUrl} target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold underline">{session.method === "boleto" ? "Abrir boleto" : "Abrir instruções de pagamento"}</a>}
      {presentation?.expiresAt && <p className="text-sm">Vencimento: {new Date(presentation.expiresAt).toLocaleString("pt-BR")}</p>}
    </div>}
    <button type="button" disabled={busy} onClick={() => void refresh()} className="mt-5 rounded-full border border-[var(--color-bg-soft)] px-5 py-3 text-sm font-semibold disabled:opacity-50">Consultar status</button>
  </section>;
}
