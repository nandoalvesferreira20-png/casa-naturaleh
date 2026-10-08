"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { paymentLabels, type PaymentRecord } from "../lib/payments/types";

type Pedido = {
  id: string;
  userId: string;
  total: number;
  status: string;
  payment?: PaymentRecord;
  criadoEm?: Timestamp;

  itens: {
    id: string;
    nome: string;
    preco: number;
    quantidade: number;
    imagem: string;
    slug: string;
  }[];
};

export default function MeusPedidosPage() {
  const { user, sair } = useAuth();
  const router = useRouter();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarPedidos() {
      if (!user) {
        return;
      }

      try {
        setCarregando(true);
        setErro("");

        const consulta = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          orderBy("criadoEm", "desc")
        );

        const snapshot = await getDocs(consulta);

        const lista: Pedido[] =
          snapshot.docs.map((documento) => ({
            id: documento.id,
            ...(documento.data() as Omit<
              Pedido,
              "id"
            >),
          }));

        setPedidos(lista);
      } catch (error) {
        console.error(
          "Erro ao carregar pedidos:",
          error
        );

        setErro(
          "Não foi possível carregar seus pedidos."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarPedidos();
  }, [user]);

  async function handleLogout() {
    try {
      await sair();
      router.push("/login");
    } catch (error) {
      console.error(
        "Erro ao sair da conta:",
        error
      );
    }
  }

  function formatarData(
    data?: Timestamp
  ) {
    if (!data) {
      return "Data não disponível";
    }

    return data
      .toDate()
      .toLocaleDateString("pt-BR");
  }

  function nomeStatus(
    status: string
  ) {
    switch (status) {
      case "aguardando_pagamento":
        return "Aguardando pagamento";

      case "pagamento_aprovado":
        return "Pagamento aprovado";

      case "em_preparacao":
        return "Em preparação";

      case "enviado":
        return "Enviado";

      case "entregue":
        return "Entregue";

      case "cancelado":
        return "Cancelado";

      default:
        return status;
    }
  }

  function classeStatus(
    status: string
  ) {
    switch (status) {
      case "entregue":
        return "bg-green-100 text-green-700";

      case "cancelado":
        return "bg-red-100 text-red-700";

      case "enviado":
        return "bg-blue-100 text-blue-700";

      case "pagamento_aprovado":
        return "bg-emerald-100 text-emerald-700";

      case "em_preparacao":
        return "bg-amber-100 text-amber-700";

      default:
        return "bg-[var(--color-bg-soft)] text-[var(--color-primary)]";
    }
  }

  return (
    <ProtectedRoute>
      <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
        <section className="border-b border-black/5">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
            <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
              Minha conta
            </span>

            <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
              Meus pedidos
            </h1>

            <p className="mt-4 max-w-2xl text-[var(--color-text-light)]">
              Acompanhe suas compras e consulte pedidos anteriores.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[280px_1fr]">
            {/* Menu lateral */}
            <aside className="h-fit rounded-[1.5rem] bg-white p-4">
              <nav className="flex flex-col gap-2">
                <Link
                  href="/minha-conta"
                  className="rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-black/5"
                >
                  Meus dados
                </Link>

                <Link
                  href="/meus-pedidos"
                  className="rounded-xl bg-[var(--color-bg-soft)] px-4 py-3 text-sm font-semibold"
                >
                  Meus pedidos
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="cursor-pointer rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Sair da conta
                </button>
              </nav>
            </aside>

            {/* Conteúdo */}
            <div>
              <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">
                    Histórico de pedidos
                  </h2>

                  <p className="mt-2 text-sm text-[var(--color-text-light)]">
                    {carregando
                      ? "Carregando pedidos..."
                      : `${pedidos.length} ${
                          pedidos.length === 1
                            ? "pedido encontrado"
                            : "pedidos encontrados"
                        }`}
                  </p>
                </div>

                <Link
                  href="/loja"
                  className="text-sm font-semibold text-[var(--color-primary)] transition hover:opacity-70"
                >
                  Continuar comprando →
                </Link>
              </div>

              {erro && (
                <div className="rounded-[1.5rem] bg-red-50 p-6 text-sm text-red-600">
                  {erro}
                </div>
              )}

              {carregando ? (
                <div className="rounded-[1.5rem] bg-white p-8 text-center">
                  <p className="text-[var(--color-text-light)]">
                    Carregando seus pedidos...
                  </p>
                </div>
              ) : pedidos.length === 0 ? (
                <div className="rounded-[1.5rem] bg-white p-8 text-center">
                  <h3 className="text-xl font-semibold">
                    Você ainda não fez nenhum pedido.
                  </h3>

                  <p className="mt-2 text-sm text-[var(--color-text-light)]">
                    Quando finalizar uma compra, ela aparecerá aqui.
                  </p>

                  <Link
                    href="/loja"
                    className="mt-6 inline-flex rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Ir para a loja
                  </Link>
                </div>
              ) : (
                <div className="space-y-5">
                  {pedidos.map(
                    (pedido) => {
                      const quantidadeItens =
                        pedido.itens.reduce(
                          (
                            total,
                            item
                          ) =>
                            total +
                            item.quantidade,
                          0
                        );

                      return (
                        <article
                          key={pedido.id}
                          className="rounded-[1.5rem] border border-black/5 bg-white p-6"
                        >
                          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-lg font-semibold">
                                  Pedido #
                                  {pedido.id}
                                </h3>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${classeStatus(
                                    pedido.status
                                  )}`}
                                >
                                  {nomeStatus(
                                    pedido.status
                                  )}
                                </span>
                              </div>

                              <p className="mt-2 text-sm text-[var(--color-text-light)]">
                                Realizado em{" "}
                                {formatarData(
                                  pedido.criadoEm
                                )}
                              </p>
                              {pedido.payment && <p className="mt-2 text-sm text-[var(--color-text-light)]">Pagamento: {paymentLabels[pedido.payment.status] ?? nomeStatus(pedido.status)}</p>}
                            </div>

                            <div className="flex flex-wrap items-center gap-8">
                              <div>
                                <span className="text-xs uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                                  Itens
                                </span>

                                <p className="mt-1 font-semibold">
                                  {
                                    quantidadeItens
                                  }
                                </p>
                              </div>

                              <div>
                                <span className="text-xs uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                                  Total
                                </span>

                                <p className="mt-1 font-semibold">
                                  {pedido.total.toLocaleString(
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

                              <Link
                                href={`/pedido-confirmado?id=${pedido.id}`}
                                className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-black/5"
                              >
                                Ver detalhes
                              </Link>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </ProtectedRoute>
  );
}
