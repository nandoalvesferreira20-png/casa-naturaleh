"use client";

import {
  createContext,
  useContext,
  useEffect,
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
  estoque: number;
};

const CHAVE_CARRINHO = "casa-naturaleh-cart";

function itemValido(valor: unknown): valor is CartItem {
  if (!valor || typeof valor !== "object") return false;
  const item = valor as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.nome === "string" &&
    typeof item.preco === "number" && Number.isFinite(item.preco) &&
    typeof item.slug === "string" &&
    typeof item.imagem === "string" &&
    typeof item.quantidade === "number" &&
    Number.isSafeInteger(item.quantidade) && item.quantidade > 0 &&
    typeof item.estoque === "number" &&
    Number.isSafeInteger(item.estoque) && item.estoque > 0
  );
}

// Copiar somente os campos do carrinho, sem persistir propriedades adicionais.
function dadosDoItem({ id, nome, preco, slug, imagem, quantidade, estoque }: CartItem): CartItem {
  return { id, nome, preco, slug, imagem, quantidade: Math.min(quantidade, estoque), estoque };
}

function limparCarrinhoSalvo() {
  try {
    window.localStorage.removeItem(CHAVE_CARRINHO);
  } catch {
    // Storage bloqueado/indisponível não deve impedir o uso do carrinho em memória.
  }
}

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

  const [carrinhoCarregado, setCarrinhoCarregado] = useState(false);

  useEffect(() => {
    function restaurarCarrinho() {
      try {
        const salvo = window.localStorage.getItem(CHAVE_CARRINHO);
        if (salvo !== null) {
          const dados: unknown = JSON.parse(salvo);
          if (!Array.isArray(dados)) {
            limparCarrinhoSalvo();
          } else {
            setItens(dados.filter(itemValido).map(dadosDoItem));
          }
        }
      } catch {
        limparCarrinhoSalvo();
      } finally {
        setCarrinhoCarregado(true);
      }
    }

    // Restauração única de armazenamento externo após a montagem, mantendo SSR vazio.
    restaurarCarrinho();
  }, []);

  useEffect(() => {
    // Nunca sobrescrever o valor salvo com o estado vazio da primeira renderização.
    if (!carrinhoCarregado) return;
    if (itens.length === 0) {
      limparCarrinhoSalvo();
      return;
    }
    try {
      window.localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens.map(dadosDoItem)));
    } catch {
      // Falta de espaço ou bloqueio do navegador: preservar o funcionamento em memória.
    }
  }, [itens, carrinhoCarregado]);

  function adicionarAoCarrinho(
    item: Omit<
      CartItem,
      "quantidade"
    >,
    quantidade = 1
  ) {
    if (!Number.isSafeInteger(item.estoque) || item.estoque <= 0 ||
        !Number.isSafeInteger(quantidade) || quantidade <= 0) return;

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
                    estoque: item.estoque,
                    quantidade:
                      Math.min(produto.quantidade + quantidade, item.estoque),
                  }
                : produto
          );
        }

        return [
          ...itensAtuais,

          {
            ...item,
            quantidade: Math.min(quantidade, item.estoque),
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
            produto.id === id && produto.quantidade < produto.estoque
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
    limparCarrinhoSalvo();
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
