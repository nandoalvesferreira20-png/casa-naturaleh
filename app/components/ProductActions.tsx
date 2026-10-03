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
};

export default function ProductActions({
  id,
  nome,
  preco,
  slug,
  imagem,
}: ProductActionsProps) {
  const { adicionarAoCarrinho } = useCart();

  const [quantidade, setQuantidade] = useState(1);
  const [modalAberto, setModalAberto] = useState(false);

  function diminuirQuantidade() {
    setQuantidade((valorAtual) =>
      valorAtual > 1 ? valorAtual - 1 : 1
    );
  }

  function aumentarQuantidade() {
    setQuantidade((valorAtual) => valorAtual + 1);
  }

  function handleAdicionarAoCarrinho() {
    adicionarAoCarrinho(
      {
        id,
        nome,
        preco,
        slug,
        imagem,
      },
      quantidade
    );

    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
  }

  return (
    <>
      <div className="mt-8">
        <div>
          <span className="text-sm font-medium">
            Quantidade
          </span>

          <div className="mt-3 inline-flex items-center overflow-hidden rounded-full border border-black/10 bg-white">
            <button
              type="button"
              onClick={diminuirQuantidade}
              className="flex h-11 w-11 cursor-pointer items-center justify-center text-lg transition hover:bg-black/5"
              aria-label={`Diminuir quantidade de ${nome}`}
            >
              −
            </button>

            <span className="flex h-11 min-w-12 items-center justify-center border-x border-black/10 px-4 text-sm font-semibold">
              {quantidade}
            </span>

            <button
              type="button"
              onClick={aumentarQuantidade}
              className="flex h-11 w-11 cursor-pointer items-center justify-center text-lg transition hover:bg-black/5"
              aria-label={`Aumentar quantidade de ${nome}`}
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdicionarAoCarrinho}
          className="mt-6 w-full cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
        >
          Adicionar ao carrinho
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
                  Quantidade: {quantidade}
                </p>

                <p className="mt-2 font-semibold">
                  {(
                    preco * quantidade
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