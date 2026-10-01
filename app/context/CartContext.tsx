"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

type CartItem = {
  id: number;
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
  removerDoCarrinho: (id: number) => void;
  aumentarQuantidade: (id: number) => void;
  diminuirQuantidade: (id: number) => void;
  totalItens: number;
  subtotal: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<CartItem[]>([]);

  function adicionarAoCarrinho(
    item: Omit<CartItem, "quantidade">,
    quantidade = 1
  ) {
    setItens((itensAtuais) => {
      const itemExiste = itensAtuais.find(
        (produto) => produto.id === item.id
      );

      if (itemExiste) {
        return itensAtuais.map((produto) =>
          produto.id === item.id
            ? {
                ...produto,
                quantidade: produto.quantidade + quantidade,
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
    });
  }

  function removerDoCarrinho(id: number) {
    setItens((itensAtuais) =>
      itensAtuais.filter((produto) => produto.id !== id)
    );
  }

  function aumentarQuantidade(id: number) {
    setItens((itensAtuais) =>
      itensAtuais.map((produto) =>
        produto.id === id
          ? {
              ...produto,
              quantidade: produto.quantidade + 1,
            }
          : produto
      )
    );
  }

  function diminuirQuantidade(id: number) {
    setItens((itensAtuais) =>
      itensAtuais
        .map((produto) =>
          produto.id === id
            ? {
                ...produto,
                quantidade: produto.quantidade - 1,
              }
            : produto
        )
        .filter((produto) => produto.quantidade > 0)
    );
  }

  const totalItens = itens.reduce(
    (total, produto) => total + produto.quantidade,
    0
  );

  const subtotal = itens.reduce(
    (total, produto) =>
      total + produto.preco * produto.quantidade,
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
        totalItens,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart precisa ser usado dentro de CartProvider"
    );
  }

  return context;
}