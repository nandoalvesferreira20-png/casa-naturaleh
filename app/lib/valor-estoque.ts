type ProdutoEstoque = { preco: unknown; estoque: unknown; unidade?: unknown };

export function obterQuantidadeComercial(produto: Pick<ProdutoEstoque, "estoque" | "unidade">): number {
  const { estoque, unidade } = produto;
  if (typeof estoque !== "number" || !Number.isFinite(estoque) || estoque < 0) return 0;
  const kg = typeof unidade === "string" && unidade.trim().toUpperCase() === "KG";
  return kg ? estoque / 1000 : estoque;
}

export function calcularValorEstoqueProduto(produto: ProdutoEstoque): number {
  const { preco } = produto;
  if (typeof preco !== "number" || !Number.isFinite(preco) || preco < 0) return 0;
  const valor = preco * obterQuantidadeComercial(produto);
  return Number.isFinite(valor) ? valor : 0;
}
