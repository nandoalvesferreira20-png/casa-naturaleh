"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

export type CartItem = {
  id: string;
  nome: string;
  preco: number;
  slug: string;
  imagem: string;
  quantidade: number;
};

type CartContextType = {
  itens: CartItem[];

  adicionarAoCarrinho: (
    item: Omit<CartItem, "quantidade">,
    quantidade?: number
  ) => void;

  removerDoCarrinho: (
    id: string
  ) => void;

  aumentarQuantidade: (
    id: string
  ) => void;

  diminuirQuantidade: (
    id: string
  ) => void;

  limparCarrinho: () => void;

  totalItens: number;
  subtotal: number;
};

const CartContext =
  createContext<
    CartContextType | undefined
  >(undefined);

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    itens,
    setItens,
  ] = useState<CartItem[]>([]);

  function adicionarAoCarrinho(
    item: Omit<
      CartItem,
      "quantidade"
    >,
    quantidade = 1
  ) {
    setItens(
      (itensAtuais) => {
        const itemExiste =
          itensAtuais.find(
            (produto) =>
              produto.id ===
              item.id
          );

        if (itemExiste) {
          return itensAtuais.map(
            (produto) =>
              produto.id ===
              item.id
                ? {
                    ...produto,

                    quantidade:
                      produto.quantidade +
                      quantidade,
                  }
                : produto
          );
        }

        return [
          ...itensAtuais,

          {
            ...item,
            quantidade,
          },
        ];
      }
    );
  }

  function removerDoCarrinho(
    id: string
  ) {
    setItens(
      (itensAtuais) =>
        itensAtuais.filter(
          (produto) =>
            produto.id !== id
        )
    );
  }

  function aumentarQuantidade(
    id: string
  ) {
    setItens(
      (itensAtuais) =>
        itensAtuais.map(
          (produto) =>
            produto.id === id
              ? {
                  ...produto,

                  quantidade:
                    produto.quantidade +
                    1,
                }
              : produto
        )
    );
  }

  function diminuirQuantidade(
    id: string
  ) {
    setItens(
      (itensAtuais) =>
        itensAtuais
          .map(
            (produto) =>
              produto.id === id
                ? {
                    ...produto,

                    quantidade:
                      produto.quantidade -
                      1,
                  }
                : produto
          )
          .filter(
            (produto) =>
              produto.quantidade >
              0
          )
    );
  }

  function limparCarrinho() {
    setItens([]);
  }

  const totalItens =
    itens.reduce(
      (
        total,
        produto
      ) =>
        total +
        produto.quantidade,
      0
    );

  const subtotal =
    itens.reduce(
      (
        total,
        produto
      ) =>
        total +
        produto.preco *
          produto.quantidade,
      0
    );

  return (
    <CartContext.Provider
      value={{
        itens,

        adicionarAoCarrinho,

        removerDoCarrinho,

        aumentarQuantidade,

        diminuirQuantidade,

        limparCarrinho,

        totalItens,

        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context =
    useContext(
      CartContext
    );

  if (!context) {
    throw new Error(
      "useCart precisa ser usado dentro de CartProvider"
    );
  }

  return context;
}