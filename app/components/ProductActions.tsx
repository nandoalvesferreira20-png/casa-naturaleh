"use client";

import { useState } from "react";
import { useCart } from "../context/CartContext";

type ProductActionsProps = {
  id: number;
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

  function diminuirQuantidade() {
    setQuantidade((valorAtual) =>
      valorAtual > 1 ? valorAtual - 1 : 1
    );
  }

  function aumentarQuantidade() {
    setQuantidade((valorAtual) => valorAtual + 1);
  }

  return (
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
        onClick={() =>
          adicionarAoCarrinho(
            {
              id,
              nome,
              preco,
              slug,
              imagem,
            },
            quantidade
          )
        }
        className="mt-6 w-full cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
      >
        Adicionar ao carrinho
      </button>
    </div>
  );
}