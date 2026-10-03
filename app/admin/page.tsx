"use client";

import { useEffect, useMemo, useState } from "react";

import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import AdminRoute from "../components/AdminRoute";
import { db } from "../lib/firebase";

type ItemPedido = {
  id: number;
  nome: string;
  preco: number;
  quantidade: number;
  imagem: string;
  slug: string;
};

type Pedido = {
  id: string;

  userId: string;

  cliente: {
    nome: string;
    email: string;
    telefone: string;
  };

  endereco: {
    cep: string;
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };

  itens: ItemPedido[];

  subtotal: number;
  frete: number;
  total: number;

  pagamento: string;
  status: string;

  criadoEm?: Timestamp;
};

const statusDisponiveis = [
  "aguardando_pagamento",
  "pagamento_aprovado",
  "em_preparacao",
  "enviado",
  "entregue",
  "cancelado",
];

export default function AdminPage() {
  const [pedidos, setPedidos] =
    useState<Pedido[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState("");

  const [filtroStatus, setFiltroStatus] =
    useState("todos");

  const [pedidoAberto, setPedidoAberto] =
    useState<Pedido | null>(null);

  const [salvandoStatus, setSalvandoStatus] =
    useState<string | null>(null);

  useEffect(() => {
    carregarPedidos();
  }, []);

  async function carregarPedidos() {
    try {
      setCarregando(true);
      setErro("");

      const consulta = query(
        collection(db, "orders"),
        orderBy("criadoEm", "desc")
      );

      const snapshot =
        await getDocs(consulta);

      const lista: Pedido[] =
        snapshot.docs.map(
          (documento) => ({
            id: documento.id,
            ...(documento.data() as Omit<
              Pedido,
              "id"
            >),
          })
        );

      setPedidos(lista);
    } catch (error) {
      console.error(
        "Erro ao carregar pedidos:",
        error
      );

      setErro(
        "Não foi possível carregar os pedidos."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function alterarStatus(
    pedidoId: string,
    novoStatus: string
  ) {
    try {
      setSalvandoStatus(pedidoId);

      await updateDoc(
        doc(
          db,
          "orders",
          pedidoId
        ),
        {
          status: novoStatus,
        }
      );

      setPedidos((pedidosAtuais) =>
        pedidosAtuais.map(
          (pedido) =>
            pedido.id === pedidoId
              ? {
                  ...pedido,
                  status: novoStatus,
                }
              : pedido
        )
      );

      setPedidoAberto(
        (pedidoAtual) =>
          pedidoAtual?.id === pedidoId
            ? {
                ...pedidoAtual,
                status: novoStatus,
              }
            : pedidoAtual
      );
    } catch (error) {
      console.error(
        "Erro ao alterar status:",
        error
      );

      alert(
        "Não foi possível alterar o status do pedido."
      );
    } finally {
      setSalvandoStatus(null);
    }
  }

  const pedidosFiltrados =
    useMemo(() => {
      if (
        filtroStatus === "todos"
      ) {
        return pedidos;
      }

      return pedidos.filter(
        (pedido) =>
          pedido.status ===
          filtroStatus
      );
    }, [pedidos, filtroStatus]);

  const totalPedidos =
    pedidos.length;

  const valorEmPedidos =
    pedidos
      .filter(
        (pedido) =>
          pedido.status !== "cancelado"
      )
      .reduce(
        (total, pedido) =>
          total + pedido.total,
        0
      );

  const aguardandoPagamento =
    pedidos.filter(
      (pedido) =>
        pedido.status ===
        "aguardando_pagamento"
    ).length;

  const emPreparacao =
    pedidos.filter(
      (pedido) =>
        pedido.status ===
        "em_preparacao"
    ).length;

  function formatarData(
    data?: Timestamp
  ) {
    if (!data) {
      return "Data não disponível";
    }

    return data
      .toDate()
      .toLocaleString(
        "pt-BR"
      );
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

  function nomePagamento(
    pagamento: string
  ) {
    switch (pagamento) {
      case "pix":
        return "Pix";

      case "cartao":
        return "Cartão";

      case "boleto":
        return "Boleto";

      default:
        return pagamento;
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
    <AdminRoute>
      <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <section className="border-b border-black/5">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
              Administração
            </span>

            <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
              Pedidos
            </h1>

            <p className="mt-4 max-w-2xl text-[var(--color-text-light)]">
              Gerencie os pedidos,
              acompanhe os clientes e
              atualize o status das
              compras.
            </p>
          </div>
        </section>

        <section className="py-10">
          <div className="mx-auto max-w-7xl px-6">
            {/* Dashboard */}
            <div className="mb-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.5rem] bg-white p-6">
                <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                  Total de pedidos
                </span>

                <p className="mt-3 text-3xl font-semibold">
                  {carregando
                    ? "..."
                    : totalPedidos}
                </p>

                <p className="mt-2 text-sm text-[var(--color-text-light)]">
                  Pedidos registrados
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-white p-6">
                <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                  Valor em pedidos
                </span>

                <p className="mt-3 text-3xl font-semibold">
                  {carregando
                    ? "..."
                    : valorEmPedidos.toLocaleString(
                        "pt-BR",
                        {
                          style: "currency",
                          currency: "BRL",
                        }
                      )}
                </p>

                <p className="mt-2 text-sm text-[var(--color-text-light)]">
                  Desconsiderando cancelados
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-[var(--color-bg-soft)] p-6">
                <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-primary)]">
                  Aguardando pagamento
                </span>

                <p className="mt-3 text-3xl font-semibold">
                  {carregando
                    ? "..."
                    : aguardandoPagamento}
                </p>

                <p className="mt-2 text-sm text-[var(--color-text-light)]">
                  Pedidos pendentes
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-[var(--color-dark)] p-6 text-white">
                <span className="text-xs font-medium uppercase tracking-[0.15em] text-white/60">
                  Em preparação
                </span>

                <p className="mt-3 text-3xl font-semibold">
                  {carregando
                    ? "..."
                    : emPreparacao}
                </p>

                <p className="mt-2 text-sm text-white/60">
                  Pedidos em andamento
                </p>
              </div>
            </div>

            {/* Cabeçalho dos pedidos */}
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  Pedidos recentes
                </h2>

                <p className="mt-2 text-sm text-[var(--color-text-light)]">
                  {pedidosFiltrados.length}{" "}
                  {pedidosFiltrados.length === 1
                    ? "pedido"
                    : "pedidos"}
                </p>
              </div>

              <div>
                <label
                  htmlFor="filtroStatus"
                  className="text-sm font-medium"
                >
                  Filtrar por status
                </label>

                <select
                  id="filtroStatus"
                  value={filtroStatus}
                  onChange={(event) =>
                    setFiltroStatus(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none md:w-[240px]"
                >
                  <option value="todos">
                    Todos
                  </option>

                  {statusDisponiveis.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {nomeStatus(status)}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {erro && (
              <div className="mb-6 rounded-[1.5rem] bg-red-50 p-5 text-sm text-red-600">
                {erro}
              </div>
            )}

            {carregando ? (
              <div className="rounded-[1.5rem] bg-white p-8 text-center">
                Carregando pedidos...
              </div>
            ) : pedidosFiltrados.length === 0 ? (
              <div className="rounded-[1.5rem] bg-white p-8 text-center">
                Nenhum pedido encontrado.
              </div>
            ) : (
              <div className="space-y-5">
                {pedidosFiltrados.map(
                  (pedido) => (
                    <article
                      key={pedido.id}
                      className="rounded-[1.5rem] bg-white p-6"
                    >
                      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-semibold">
                              #{pedido.id}
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

                          <p className="mt-3 font-medium">
                            {
                              pedido.cliente
                                .nome
                            }
                          </p>

                          <p className="mt-1 text-sm text-[var(--color-text-light)]">
                            {
                              pedido.cliente
                                .email
                            }
                          </p>

                          <p className="mt-2 text-xs text-[var(--color-text-light)]">
                            {formatarData(
                              pedido.criadoEm
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-end gap-5">
                          <div>
                            <span className="text-xs uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                              Pagamento
                            </span>

                            <p className="mt-1 font-medium">
                              {nomePagamento(
                                pedido.pagamento
                              )}
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

                          <select
                            value={
                              pedido.status
                            }
                            disabled={
                              salvandoStatus ===
                              pedido.id
                            }
                            onChange={(event) =>
                              alterarStatus(
                                pedido.id,
                                event.target.value
                              )
                            }
                            className="rounded-xl border border-black/10 bg-[var(--color-bg)] px-4 py-2.5 text-sm outline-none disabled:opacity-50"
                          >
                            {statusDisponiveis.map(
                              (status) => (
                                <option
                                  key={
                                    status
                                  }
                                  value={
                                    status
                                  }
                                >
                                  {nomeStatus(
                                    status
                                  )}
                                </option>
                              )
                            )}
                          </select>

                          <button
                            type="button"
                            onClick={() =>
                              setPedidoAberto(
                                pedido
                              )
                            }
                            className="cursor-pointer rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-black/5"
                          >
                            Ver detalhes
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {pedidoAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10"
          onClick={() =>
            setPedidoAberto(null)
          }
        >
          <div
            className="max-h-full w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-7 shadow-xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  Pedido
                </span>

                <h2 className="mt-2 text-2xl font-semibold">
                  #{pedidoAberto.id}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPedidoAberto(null)
                }
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-xl hover:bg-black/5"
              >
                ×
              </button>
            </div>

            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <div>
                <span className="text-xs uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                  Cliente
                </span>

                <p className="mt-2 font-semibold">
                  {
                    pedidoAberto.cliente
                      .nome
                  }
                </p>

                <p className="mt-1 text-sm text-[var(--color-text-light)]">
                  {
                    pedidoAberto.cliente
                      .email
                  }
                </p>

                <p className="mt-1 text-sm text-[var(--color-text-light)]">
                  {
                    pedidoAberto.cliente
                      .telefone
                  }
                </p>
              </div>

              <div>
                <span className="text-xs uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                  Entrega
                </span>

                <p className="mt-2 text-sm leading-6">
                  {
                    pedidoAberto.endereco
                      .rua
                  }
                  ,{" "}
                  {
                    pedidoAberto.endereco
                      .numero
                  }

                  {pedidoAberto.endereco
                    .complemento && (
                    <>
                      {" "}
                      -{" "}
                      {
                        pedidoAberto
                          .endereco
                          .complemento
                      }
                    </>
                  )}

                  <br />

                  {
                    pedidoAberto.endereco
                      .bairro
                  }

                  <br />

                  {
                    pedidoAberto.endereco
                      .cidade
                  }{" "}
                  -{" "}
                  {
                    pedidoAberto.endereco
                      .estado
                  }

                  <br />

                  CEP{" "}
                  {
                    pedidoAberto.endereco
                      .cep
                  }
                </p>
              </div>
            </div>

            <div className="mt-8 border-t border-black/5 pt-6">
              <h3 className="text-lg font-semibold">
                Produtos
              </h3>

              <div className="mt-4 space-y-4">
                {pedidoAberto.itens.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="flex justify-between gap-4 border-b border-black/5 pb-4"
                    >
                      <div>
                        <p className="font-medium">
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
            </div>

            <div className="mt-6 flex justify-between border-t border-black/5 pt-6">
              <span className="font-semibold">
                Total
              </span>

              <span className="text-xl font-semibold">
                {pedidoAberto.total.toLocaleString(
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
        </div>
      )}
    </AdminRoute>
  );
}