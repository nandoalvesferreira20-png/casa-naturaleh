import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoriaProduto } from "./categorias-importacao";

export type ProdutoHome = { id: string; nome: string; slug: string; categoria: string; preco: number; imagem: string; estoque: number };
export const CATEGORIAS_HOME = [
  { nome: "Chás", arquivo: "chas", imagem: "/images/hero/chá.webp", alt: "Chá representando a categoria Chás" },
  { nome: "Suplementos", arquivo: "suplementos", imagem: "/images/hero/creatina.webp", alt: "Creatina representando a categoria Suplementos" },
  { nome: "Farinhas", arquivo: "farinhas", imagem: "/images/hero/farinha.jpg", alt: "Farinha representando a categoria Farinhas" },
  { nome: "Oleaginosas", arquivo: "oleaginosas", imagem: "/images/hero/amendoim.jpg", alt: "Amendoim representando a categoria Oleaginosas" },
  { nome: "Cereais", arquivo: "cereais", imagem: "/images/hero/granola.jpg", alt: "Granola representando a categoria Cereais" },
  { nome: "Sementes", arquivo: "sementes", imagem: "/images/hero/ervilha.jpg", alt: "Ervilha representando a categoria Sementes" },
  { nome: "Temperos", arquivo: "temperos", imagem: "/images/hero/dry-rub.jpg", alt: "Dry rub representando a categoria Temperos" },
  { nome: "Snacks", arquivo: "snacks", imagem: "/images/hero/batata-doce.jpg", alt: "Batata-doce representando a categoria Snacks" },
] satisfies { nome: CategoriaProduto; arquivo: string; imagem: string | null; alt: string }[];

export async function consultarCatalogoHome(client: SupabaseClient) {
  // Uma consulta de produtos limitada a quatro. Categorias consultam somente
  // a existência de um ID ativo por categoria, sem baixar o catálogo completo.
  const [destaques, categorias] = await Promise.all([
    client.from("products").select("id,nome,slug,categoria,preco,imagem,estoque")
      .eq("ativo", true).order("criado_em", { ascending: false }).limit(4),
    Promise.all(CATEGORIAS_HOME.map(async categoria => {
      const { data, error } = await client.from("products").select("id")
        .eq("ativo", true).eq("categoria", categoria.nome).limit(1);
      return { categoria, existe: !error && Boolean(data?.length), erro: Boolean(error) };
    })),
  ]);
  return {
    produtos: destaques.error ? [] : (destaques.data ?? []) as ProdutoHome[],
    categorias: categorias.filter(c => c.existe).map(c => c.categoria),
    erroProdutos: Boolean(destaques.error),
    erroCategorias: categorias.some(c => c.erro),
  };
}

// Compartilha apenas requisições em andamento (inclusive o remount do Strict Mode).
// Não mantém cache permanente de preços/estoques no navegador.
let pendente: Promise<Awaited<ReturnType<typeof consultarCatalogoHome>>> | undefined;
export function carregarCatalogoHome() {
  if (!pendente) pendente = import("./supabase").then(({ supabase }) => consultarCatalogoHome(supabase)).finally(() => { pendente = undefined; });
  return pendente;
}
