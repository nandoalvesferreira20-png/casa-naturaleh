"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useCart } from "../context/CartContext";

type ProductActionsProps = {
  id: string;
  nome: string;
  preco: number;
  slug: string;
  imagem: string;
  estoque: number;
};

export default function ProductActions({
  id,
  nome,
  preco,
  slug,
  imagem,
  estoque,
}: ProductActionsProps) {
  const { adicionarAoCarrinho, itens } = useCart();

  const [quantidade, setQuantidade] = useState(1);
  const [modalAberto, setModalAberto] = useState(false);
  const [quantidadeAdicionada, setQuantidadeAdicionada] = useState(0);
  const estoqueDisponivel = Number.isSafeInteger(estoque) && estoque > 0 ? estoque : 0;
  const quantidadeSelecionada = Math.min(quantidade, estoqueDisponivel);
  const noCarrinho = itens.find(item => item.id === id)?.quantidade ?? 0;
  const limiteAtingido = noCarrinho >= estoqueDisponivel;

  function diminuirQuantidade() {
    setQuantidade((valorAtual) =>
      Math.max(1, Math.min(valorAtual, estoqueDisponivel) - 1)
    );
  }

  function aumentarQuantidade() {
    setQuantidade((valorAtual) => Math.min(valorAtual + 1, estoqueDisponivel));
  }

  function handleAdicionarAoCarrinho() {
    if (!estoqueDisponivel || limiteAtingido) return;
    const adicionada = Math.min(quantidadeSelecionada, estoqueDisponivel - noCarrinho);
    adicionarAoCarrinho(
      {
        id,
        nome,
        preco,
        slug,
        imagem,
        estoque: estoqueDisponivel,
      },
      quantidadeSelecionada
    );

    setQuantidadeAdicionada(adicionada);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
  }

  return (
    <>
      <div className="mt-8">
        <p className="mb-3 text-sm text-[var(--color-text-light)]" role="status">
          {estoqueDisponivel > 0 ? `Em estoque: ${estoqueDisponivel} unidades` : "Produto indisponível no momento"}
        </p>
        {estoqueDisponivel > 0 && <div>
          <span className="text-sm font-medium">
            Quantidade
          </span>

          <div className="mt-3 inline-flex items-center overflow-hidden rounded-full border border-black/10 bg-white">
            <button
              type="button"
              onClick={diminuirQuantidade}
              disabled={quantidadeSelecionada <= 1}
              className="flex h-11 w-11 cursor-pointer items-center justify-center text-lg transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Diminuir quantidade de ${nome}`}
            >
              −
            </button>

            <span className="flex h-11 min-w-12 items-center justify-center border-x border-black/10 px-4 text-sm font-semibold">
              {quantidadeSelecionada}
            </span>

            <button
              type="button"
              onClick={aumentarQuantidade}
              disabled={quantidadeSelecionada >= estoqueDisponivel}
              className="flex h-11 w-11 cursor-pointer items-center justify-center text-lg transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Aumentar quantidade de ${nome}`}
            >
              +
            </button>
          </div>
        </div>}

        {estoqueDisponivel > 0 && (limiteAtingido || quantidadeSelecionada + noCarrinho > estoqueDisponivel) && (
          <p className="mt-3 text-sm text-[var(--color-text-light)]" role="status">
            {limiteAtingido ? "Limite disponível atingido no carrinho." : `Você já tem ${noCarrinho} no carrinho. Serão adicionadas apenas ${estoqueDisponivel - noCarrinho} unidades para respeitar o estoque.`}
          </p>
        )}

        <button
          type="button"
          onClick={handleAdicionarAoCarrinho}
          disabled={!estoqueDisponivel || limiteAtingido}
          className="mt-6 w-full cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {estoqueDisponivel > 0 ? "Adicionar ao carrinho" : "Produto indisponível"}
        </button>
      </div>

      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={fecharModal}
        >
          <div
            className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  Carrinho
                </span>

                <h2 className="mt-2 text-2xl font-semibold">
                  Produto adicionado ✓
                </h2>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl transition hover:bg-black/5"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid grid-cols-[90px_1fr] gap-4 rounded-[1.25rem] bg-[var(--color-bg)] p-4">
              <div className="relative h-[90px] w-[90px] overflow-hidden rounded-xl bg-[var(--color-bg-soft)]">
                <Image
                  src={imagem}
                  alt={nome}
                  fill
                  sizes="90px"
                  className="object-contain p-2"
                />
              </div>

              <div className="flex flex-col justify-center">
                <p className="font-semibold">
                  {nome}
                </p>

                <p className="mt-1 text-sm text-[var(--color-text-light)]">
                  Quantidade: {quantidadeAdicionada}
                </p>

                <p className="mt-2 font-semibold">
                  {(
                    preco * quantidadeAdicionada
                  ).toLocaleString(
                    "pt-BR",
                    {
                      style: "currency",
                      currency: "BRL",
                    }
                  )}
                </p>
              </div>
            </div>

            <p className="mt-6 text-sm leading-6 text-[var(--color-text-light)]">
              Deseja continuar comprando ou revisar os produtos do seu carrinho?
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/carrinho"
                className="rounded-full bg-[var(--color-primary)] px-6 py-3.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
              >
                Ir para o carrinho
              </Link>

              <button
                type="button"
                onClick={fecharModal}
                className="cursor-pointer rounded-full border border-black/10 px-6 py-3.5 text-sm font-semibold transition hover:bg-black/5"
              >
                Continuar comprando
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
