"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import { STORE_ADDRESS, addressText, type DeliveryAddress, type Fulfillment } from "../lib/delivery/types";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import ManualPixPanel from "../components/payments/ManualPixPanel";
import { orderPaymentLabel, type OrderPayment } from "../lib/pix/types";

type Pedido = {
  userId: string;

  cliente: {
    nome: string;
    email: string;
    telefone: string;
  };

  endereco?: DeliveryAddress | null;
  fulfillment?: Fulfillment;

  itens: {
    id: string;
    nome: string;
    preco: number;
    quantidade: number;
    imagem: string;
    slug: string;
  }[];

  subtotal: number;
  frete: number;
  total: number;

  pagamento: string;
  status: string;
  payment?: OrderPayment;
};

export function ComprovanteWhatsApp({ pedidoId, pedido }: { pedidoId: string | null; pedido: Pedido }) {
  if (!pedidoId || !pedido.payment || !["pix_manual", "manual"].includes(pedido.payment.provider) ||
    pedido.payment.status !== "pending" || pedido.status !== "aguardando_pagamento") return null;

  const local = pedido.payment.provider === "manual" && pedido.fulfillment?.type === "pickup";
  if (pedido.payment.provider === "manual" && !local) return null;
  const txid = pedido.payment.provider === "pix_manual" ? pedido.payment.txid : "";
  const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const mensagem = [
    local ? "Olá! Acabei de realizar um pedido na Casa Naturaleh para retirada. Vou realizar o pagamento no local." : "Olá! Acabei de realizar um pedido na Casa Naturaleh e efetuei o pagamento via Pix.",
    "",
    `Pedido: #${pedidoId}`,
    `Nome: ${pedido.cliente.nome}`,
    ...(pedido.fulfillment ? [
      `Forma de recebimento: ${pedido.fulfillment.type === "pickup" ? "Retirada na loja" : "Entrega"}`,
      pedido.fulfillment.type === "pickup" ? `Retirada em: ${STORE_ADDRESS}` : `Endereço: ${addressText(pedido.endereco)}`,
      `Frete: ${moeda.format(pedido.frete)}`,
    ] : []),
    `Forma de pagamento: ${local ? "Pagamento no local" : "Pix"}`,
    "",
    "Itens:",
    ...pedido.itens.map(item => `- ${item.quantidade}x ${item.nome} — ${moeda.format(item.preco)} por unidade`),
    "",
    `Total: ${moeda.format(pedido.total)}`,
    ...(txid ? ["", `TXID Pix: ${txid}`] : []),
    "",
    local ? "Gostaria de combinar a retirada do meu pedido." : "Estou enviando o comprovante para confirmação do pagamento.",
    "",
    "Obrigado!",
  ].join("\n");

  return <section className="rounded-[1.5rem] bg-white p-6 md:p-8">
    <p className="text-sm leading-6 text-[var(--color-text-light)]">
      {local ? "Fale com a loja para combinar a retirada. O pagamento será realizado no local." : "Após realizar o Pix, envie o comprovante pelo WhatsApp para agilizar a confirmação do seu pedido. O pagamento será conferido pela loja antes da aprovação. Anexe o comprovante na conversa."}
    </p>
    <a
      href={`https://wa.me/5511999572975?text=${encodeURIComponent(mensagem)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex w-full justify-center rounded-full bg-[var(--color-primary)] px-6 py-4 text-center text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
    >
      {local ? "Combinar retirada no WhatsApp" : "Já paguei — enviar comprovante no WhatsApp"}
    </a>
  </section>;
}

export default function PedidoConfirmadoClient() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const pedidoId = searchParams.get("id");

  const [pedido, setPedido] =
    useState<Pedido | null>(null);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState("");

  useEffect(() => {
    async function carregarPedido() {
      if (!user || !pedidoId) {
        return;
      }

      try {
        setCarregando(true);
        setErro("");

        const referencia = doc(
          db,
          "orders",
          pedidoId
        );

        const snapshot =
          await getDoc(referencia);

        if (!snapshot.exists()) {
          setErro(
            "Pedido não encontrado."
          );

          return;
        }

        const dados =
          snapshot.data() as Pedido;

        if (dados.userId !== user.uid) {
          setErro(
            "Você não tem acesso a este pedido."
          );

          return;
        }

        setPedido(dados);
      } catch (error) {
        console.error(
          "Erro ao carregar pedido:",
          error
        );

        setErro(
          "Não foi possível carregar o pedido."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarPedido();
  }, [user, pedidoId]);

  function nomePagamento(
    pagamento: string
  ) {
    switch (pagamento) {
      case "local":
        return "Pagamento na retirada";

      case "pix":
        return "Pix";

      case "cartao":
        return "Cartão de crédito";

      case "boleto":
        return "Boleto";

      default:
        return pagamento;
    }
  }

  return (
    <ProtectedRoute>
      <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-4xl px-6">
            {carregando ? (
              <div className="rounded-[2rem] bg-white p-10 text-center">
                <p className="text-[var(--color-text-light)]">
                  Carregando pedido...
                </p>
              </div>
            ) : erro ? (
              <div className="rounded-[2rem] bg-white p-10 text-center">
                <h1 className="text-3xl font-semibold">
                  Ops.
                </h1>

                <p className="mt-3 text-[var(--color-text-light)]">
                  {erro}
                </p>

                <Link
                  href="/meus-pedidos"
                  className="mt-8 inline-flex rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white"
                >
                  Ver meus pedidos
                </Link>
              </div>
            ) : pedido ? (
              <div className="space-y-8">
                {/* Confirmação */}
                <section className="rounded-[2rem] bg-[var(--color-bg-soft)] p-8 text-center md:p-12">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl">
                    ✓
                  </div>

                  <span className="mt-6 block text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
                    Pedido recebido
                  </span>

                  <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
                    Pedido realizado com sucesso
                  </h1>

                  <p className="mx-auto mt-4 max-w-xl leading-7 text-[var(--color-text-light)]">
                    Recebemos seu pedido e ele já está registrado na sua conta.
                  </p>

                  <div className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm">
                    Pedido{" "}
                    <span className="ml-2 font-semibold">
                      #{pedidoId}
                    </span>
                  </div>
                </section>

                {/* Resumo */}
                <section className="rounded-[1.5rem] bg-white p-6 md:p-8">
                  <h2 className="text-2xl font-semibold">
                    Resumo do pedido
                  </h2>

                  <div className="mt-6 space-y-4">
                    {pedido.itens.map(
                      (item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-6 border-b border-black/5 pb-4"
                        >
                          <div>
                            <p className="font-semibold">
                              {item.nome}
                            </p>

                            <p className="mt-1 text-sm text-[var(--color-text-light)]">
                              Quantidade:{" "}
                              {
                                item.quantidade
                              }
                            </p>
                          </div>

                          <p className="font-medium">
                            {(
                              item.preco *
                              item.quantidade
                            ).toLocaleString(
                              "pt-BR",
                              {
                                style:
                                  "currency",
                                currency:
                                  "BRL",
                              }
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-light)]">
                        Subtotal
                      </span>

                      <span>
                        {pedido.subtotal.toLocaleString(
                          "pt-BR",
                          {
                            style:
                              "currency",
                            currency:
                              "BRL",
                          }
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-light)]">
                        Frete
                      </span>

                      <span>
                        {pedido.frete === 0 ? "Grátis" : pedido.frete.toLocaleString(
                          "pt-BR",
                          {
                            style:
                              "currency",
                            currency:
                              "BRL",
                          }
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-black/10 pt-4">
                      <span className="font-semibold">
                        Total
                      </span>

                      <span className="text-xl font-semibold">
                        {pedido.total.toLocaleString(
                          "pt-BR",
                          {
                            style:
                              "currency",
                            currency:
                              "BRL",
                          }
                        )}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Pagamento e entrega */}
                <section className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-[1.5rem] bg-white p-6">
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-primary)]">
                      Pagamento
                    </span>

                    <h2 className="mt-3 text-xl font-semibold">
                      {nomePagamento(
                        pedido.pagamento
                      )}
                    </h2>

                    <p className="mt-2 text-sm text-[var(--color-text-light)]">
                      {orderPaymentLabel(pedido.payment, pedido.status)}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-white p-6">
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-primary)]">
                      Recebimento
                    </span>

                    <p className="mt-3 font-semibold">{pedido.fulfillment?.type === "pickup" ? "Retirada na loja" : "Entrega"}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-light)]">{pedido.fulfillment?.type === "pickup" ? STORE_ADDRESS : addressText(pedido.endereco)}</p>
                  </div>
                </section>

                {pedido.payment?.provider === "pix_manual" && pedidoId && <ManualPixPanel orderId={pedidoId} total={pedido.total} orderStatus={pedido.status} payment={pedido.payment} />}
                {pedido.payment?.provider === "manual" && pedido.payment.status === "pending" && pedido.status === "aguardando_pagamento" && <section className="rounded-[1.5rem] bg-white p-6 md:p-8"><h2 className="text-2xl font-semibold">Pagamento na retirada</h2><p className="mt-3 text-sm">Você poderá realizar o pagamento ao retirar seu pedido na loja.</p></section>}
                <ComprovanteWhatsApp pedidoId={pedidoId} pedido={pedido} />
                {pedido.payment && pedido.payment.provider !== "pix_manual" && pedido.payment.provider !== "manual" && pedido.status === "aguardando_pagamento" && <p className="text-sm text-[var(--color-text-light)]">Este pedido foi criado com a integração de pagamento anterior. Entre em contato com a loja para conferir o pagamento.</p>}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/meus-pedidos"
                    className="flex-1 rounded-full bg-[var(--color-primary)] px-6 py-4 text-center text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Ver meus pedidos
                  </Link>

                  <Link
                    href="/loja"
                    className="flex-1 rounded-full border border-black/10 px-6 py-4 text-center text-sm font-semibold transition hover:bg-black/5"
                  >
                    Continuar comprando
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </ProtectedRoute>
  );
}
