"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import ProductCard from "../components/ProductCard";
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

export default function LojaPage() {
  const [produtos, setProdutos] =
    useState<Produto[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState("");

  const [busca, setBusca] =
    useState("");

  const [
    categoriaSelecionada,
    setCategoriaSelecionada,
  ] = useState("todas");

  const [
    ordenacao,
    setOrdenacao,
  ] = useState("recentes");

  useEffect(() => {
    carregarProdutos();
  }, []);

  async function carregarProdutos() {
    try {
      setCarregando(true);
      setErro("");

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
        "Erro ao carregar produtos:",
        error
      );

      setErro(
        "Não foi possível carregar os produtos."
      );
    } finally {
      setCarregando(false);
    }
  }

  function normalizarTexto(
    texto: string
  ) {
    return texto
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .trim();
  }

  const categorias =
    useMemo(() => {
      const lista =
        produtos
          .map(
            (produto) =>
              produto.categoria
          )
          .filter(Boolean);

      return Array.from(
        new Set(lista)
      ).sort((a, b) =>
        a.localeCompare(
          b,
          "pt-BR"
        )
      );
    }, [produtos]);

  const produtosFiltrados =
    useMemo(() => {
      let lista = [
        ...produtos,
      ];

      const termo =
        normalizarTexto(
          busca
        );

      if (termo) {
        lista =
          lista.filter(
            (produto) => {
              const nome =
                normalizarTexto(
                  produto.nome
                );

              const categoria =
                normalizarTexto(
                  produto.categoria
                );

              const descricao =
                normalizarTexto(
                  produto.descricao ??
                    ""
                );

              return (
                nome.includes(
                  termo
                ) ||
                categoria.includes(
                  termo
                ) ||
                descricao.includes(
                  termo
                )
              );
            }
          );
      }

      if (
        categoriaSelecionada !==
        "todas"
      ) {
        lista =
          lista.filter(
            (produto) =>
              produto.categoria ===
              categoriaSelecionada
          );
      }

      if (
        ordenacao ===
        "menor-preco"
      ) {
        lista.sort(
          (a, b) =>
            a.preco -
            b.preco
        );
      }

      if (
        ordenacao ===
        "maior-preco"
      ) {
        lista.sort(
          (a, b) =>
            b.preco -
            a.preco
        );
      }

      if (
        ordenacao ===
        "recentes"
      ) {
        lista.sort(
          (a, b) => {
            const dataA =
              a.criado_em
                ? new Date(
                    a.criado_em
                  ).getTime()
                : 0;

            const dataB =
              b.criado_em
                ? new Date(
                    b.criado_em
                  ).getTime()
                : 0;

            return (
              dataB -
              dataA
            );
          }
        );
      }

      return lista;
    }, [
      produtos,
      busca,
      categoriaSelecionada,
      ordenacao,
    ]);

  function limparBusca() {
    setBusca("");
  }

  return (
    <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
      <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
            Loja
          </span>

          <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
            Encontre o que faz sentido para a sua rotina.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-text-light)] md:text-lg">
            Explore nossa seleção de produtos
            para saúde, bem-estar,
            suplementação e uma rotina mais
            equilibrada.
          </p>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <input
                type="search"
                value={busca}
                onChange={(event) =>
                  setBusca(
                    event.target.value
                  )
                }
                placeholder="Buscar produto..."
                autoComplete="off"
                className="w-full rounded-full border border-black/10 bg-white px-5 py-3 pr-12 text-sm outline-none transition focus:border-[var(--color-primary)]"
              />

              {busca && (
                <button
                  type="button"
                  onClick={
                    limparBusca
                  }
                  aria-label="Limpar busca"
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-lg text-[var(--color-text-light)] transition hover:text-[var(--color-text)]"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={
                categoriaSelecionada
              }
              onChange={(event) =>
                setCategoriaSelecionada(
                  event.target.value
                )
              }
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm outline-none"
            >
              <option value="todas">
                Todas as categorias
              </option>

              {categorias.map(
                (categoria) => (
                  <option
                    key={
                      categoria
                    }
                    value={
                      categoria
                    }
                  >
                    {categoria}
                  </option>
                )
              )}
            </select>

            <select
              value={ordenacao}
              onChange={(event) =>
                setOrdenacao(
                  event.target.value
                )
              }
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm outline-none"
            >
              <option value="recentes">
                Mais recentes
              </option>

              <option value="menor-preco">
                Menor preço
              </option>

              <option value="maior-preco">
                Maior preço
              </option>
            </select>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-6">
          {erro && (
            <div className="mb-8 rounded-[1.5rem] bg-red-50 p-5 text-sm text-red-600">
              {erro}
            </div>
          )}

          <div className="mb-8 flex items-center justify-between">
            <p className="text-sm text-[var(--color-text-light)]">
              {carregando
                ? "Carregando produtos..."
                : `${produtosFiltrados.length} ${
                    produtosFiltrados.length ===
                    1
                      ? "produto encontrado"
                      : "produtos encontrados"
                  }`}
            </p>
          </div>

          {carregando ? (
            <div className="rounded-[1.5rem] bg-white p-10 text-center text-sm text-[var(--color-text-light)]">
              Carregando catálogo...
            </div>
          ) : produtosFiltrados.length ===
            0 ? (
            <div className="rounded-[1.5rem] bg-white p-10 text-center">
              <h2 className="text-xl font-semibold">
                Nenhum produto encontrado.
              </h2>

              <p className="mt-2 text-sm text-[var(--color-text-light)]">
                Tente buscar por outro nome ou
                alterar os filtros.
              </p>

              {(busca ||
                categoriaSelecionada !==
                  "todas") && (
                <button
                  type="button"
                  onClick={() => {
                    setBusca("");
                    setCategoriaSelecionada(
                      "todas"
                    );
                  }}
                  className="mt-5 cursor-pointer rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {produtosFiltrados.map(
                (produto) => (
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
                  />
                )
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}