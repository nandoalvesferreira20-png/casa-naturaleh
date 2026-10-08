"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabase";

type Produto = {
  id: string;
  nome: string;
  slug: string;
  categoria: string;
  preco: number;
  imagem: string;
  descricao: string | null;
  estoque: number;
  ativo: boolean;
  criado_em?: string;
};

export default function CarrinhoPage() {
  const {
    itens,
    removerDoCarrinho,
    aumentarQuantidade,
    diminuirQuantidade,
    subtotal,
    totalItens,
  } = useCart();

  const [
    produtos,
    setProdutos,
  ] = useState<Produto[]>([]);

  const [
    carregandoRecomendados,
    setCarregandoRecomendados,
  ] = useState(true);

  useEffect(() => {
    carregarProdutos();
  }, []);

  async function carregarProdutos() {
    try {
      setCarregandoRecomendados(
        true
      );

      const {
        data,
        error,
      } = await supabase
        .from("products")
        .select("*")
        .eq("ativo", true)
        .order(
          "criado_em",
          {
            ascending: false,
          }
        );

      if (error) {
        throw error;
      }

      setProdutos(
        (data ?? []) as Produto[]
      );
    } catch (error) {
      console.error(
        "Erro ao carregar produtos recomendados:",
        error
      );
    } finally {
      setCarregandoRecomendados(
        false
      );
    }
  }

  const produtosRecomendados =
    useMemo(() => {
      return produtos
        .filter(
          (produto) =>
            !itens.some(
              (item) =>
                item.id ===
                produto.id
            )
        )
        .slice(0, 4);
    }, [
      produtos,
      itens,
    ]);

  return (
    <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
      <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
            Carrinho
          </span>

          <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
            Seu carrinho
          </h1>

          <p className="mt-4 max-w-2xl text-[var(--color-text-light)]">
            Revise seus produtos antes de finalizar a compra.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-6">
          {itens.length === 0 ? (
            <div className="rounded-[2rem] bg-white p-10 text-center">
              <h2 className="text-2xl font-semibold">
                Seu carrinho está vazio.
              </h2>

              <p className="mt-3 text-[var(--color-text-light)]">
                Explore a loja e adicione alguns produtos.
              </p>

              <Link
                href="/loja"
                className="mt-6 inline-flex rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Ir para a loja
              </Link>
            </div>
          ) : (
            <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
              <div className="space-y-4">
                {itens.map(
                  (item) => (
                    <div
                      key={
                        item.id
                      }
                      className="grid gap-5 rounded-[1.5rem] border border-black/5 bg-white p-5 sm:grid-cols-[120px_1fr_auto] sm:items-center"
                    >
                      <div className="relative h-28 overflow-hidden rounded-2xl bg-[var(--color-bg-soft)]">
                        <Image
                          src={
                            item.imagem
                          }
                          alt={
                            item.nome
                          }
                          fill
                          sizes="120px"
                          className="object-contain p-3"
                        />
                      </div>

                      <div>
                        <h2 className="text-lg font-semibold">
                          {
                            item.nome
                          }
                        </h2>
                        <p className="mt-1 text-xs text-[var(--color-text-light)]" role="status">
                          {item.estoque} disponíveis em estoque
                          {item.quantidade >= item.estoque && " · Limite disponível atingido"}
                        </p>

                        <p className="mt-1 text-sm text-[var(--color-text-light)]">
                          {item.preco.toLocaleString(
                            "pt-BR",
                            {
                              style:
                                "currency",

                              currency:
                                "BRL",
                            }
                          )}{" "}
                          cada
                        </p>

                        <p className="mt-2 text-sm font-medium">
                          Subtotal:{" "}
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

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="inline-flex items-center overflow-hidden rounded-full border border-black/10 bg-[var(--color-bg)]">
                          <button
                            type="button"
                            onClick={() =>
                              diminuirQuantidade(
                                item.id
                              )
                            }
                            className="flex h-10 w-10 cursor-pointer items-center justify-center text-lg transition hover:bg-black/5"
                            aria-label={`Diminuir quantidade de ${item.nome}`}
                          >
                            −
                          </button>

                          <span className="flex h-10 min-w-10 items-center justify-center border-x border-black/10 px-3 text-sm font-semibold">
                            {
                              item.quantidade
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              aumentarQuantidade(
                                item.id
                              )
                            }
                            className="flex h-10 w-10 cursor-pointer items-center justify-center text-lg transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={item.quantidade >= item.estoque}
                            aria-label={`Aumentar quantidade de ${item.nome}`}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removerDoCarrinho(
                              item.id
                            )
                          }
                          className="cursor-pointer text-sm font-medium text-red-600 transition hover:opacity-70"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>

              <aside className="h-fit rounded-[1.5rem] bg-white p-6 lg:sticky lg:top-6">
                <h2 className="text-xl font-semibold">
                  Resumo do pedido
                </h2>

                <div className="mt-6 flex items-center justify-between border-b border-black/10 pb-4">
                  <span className="text-sm text-[var(--color-text-light)]">
                    Itens
                  </span>

                  <span className="font-medium">
                    {
                      totalItens
                    }
                  </span>
                </div>

                <div className="mt-6 flex items-center justify-between border-b border-black/10 pb-4">
                  <span className="text-sm text-[var(--color-text-light)]">
                    Subtotal
                  </span>

                  <span className="font-semibold">
                    {subtotal.toLocaleString(
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

                <p className="mt-4 text-sm leading-6 text-[var(--color-text-light)]">
                  Frete e demais valores serão calculados no checkout.
                </p>

                <Link
                  href="/checkout"
                  className="mt-6 flex w-full justify-center rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Ir para o checkout
                </Link>

                <Link
                  href="/loja"
                  className="mt-3 flex w-full justify-center rounded-full border border-black/10 px-6 py-4 text-sm font-semibold transition hover:bg-black/5"
                >
                  Continuar comprando
                </Link>
              </aside>
            </div>
          )}

          {!carregandoRecomendados &&
            produtosRecomendados.length >
              0 && (
              <section className="mt-20">
                <div className="mb-8">
                  <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
                    Complete sua compra
                  </span>

                  <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
                    Você também pode gostar
                  </h2>

                  <p className="mt-2 text-[var(--color-text-light)]">
                    Alguns produtos que combinam com sua seleção.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {produtosRecomendados.map(
                    (
                      produto
                    ) => (
                      <ProductCard
                        key={
                          produto.id
                        }
                        nome={
                          produto.nome
                        }
                        categoria={
                          produto.categoria
                        }
                        preco={
                          produto.preco
                        }
                        slug={
                          produto.slug
                        }
                        imagem={
                          produto.imagem
                        }
                        estoque={produto.estoque}
                      />
                    )
                  )}
                </div>
              </section>
            )}
        </div>
      </section>
    </main>
  );
}
