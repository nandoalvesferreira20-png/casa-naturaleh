import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORIAS_OFICIAIS } from "./categorias-importacao";

export const PAGE_SIZE = 12;
export type FiltrosLoja = { page: number; busca: string; categoria: string; ordenacao: "recentes" | "menor-preco" | "maior-preco" };
export type ProdutoLoja = { id: string; nome: string; slug: string; categoria: string; preco: number; imagem: string; estoque: number };

export function lerFiltrosLoja(params: URLSearchParams): FiltrosLoja {
  const p = params.get("page") ?? "1";
  const page = /^\d+$/.test(p) && Number.isSafeInteger(Number(p)) && Number(p) > 0 && Number(p) <= Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE) ? Number(p) : 1;
  const ordenacao = params.get("ordenacao");
  return { page, busca: params.get("busca")?.trim() ?? "", categoria: params.get("categoria") || "todas", ordenacao: ordenacao === "menor-preco" || ordenacao === "maior-preco" ? ordenacao : "recentes" };
}

export function atualizarParametrosLoja(params: URLSearchParams, mudanca: Partial<FiltrosLoja>) {
  const novos = new URLSearchParams(params);
  const reset = mudanca.busca !== undefined || mudanca.categoria !== undefined || mudanca.ordenacao !== undefined;
  if (reset) novos.set("page", "1");
  for (const [campo, valor] of Object.entries(mudanca)) {
    if (campo === "categoria" && valor === "todas" || campo === "busca" && !String(valor).trim() || campo === "ordenacao" && valor === "recentes") novos.delete(campo);
    else novos.set(campo, String(valor));
  }
  return novos;
}

export function filtroBuscaLoja(termo: string) {
  // Valores entre aspas protegem a gramática .or(); % e _ são literais da busca.
  const pattern = (s: string) => JSON.stringify(`%${s.replace(/\\/g, "\\\\").replace(/[%_*]/g, "\\$&")}%`);
  const slug = termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "-");
  return ["nome", "categoria", "descricao"].map(c => `${c}.ilike.${pattern(termo)}`).concat(`slug.ilike.${pattern(slug)}`).join(",");
}

export async function consultarPaginaLoja(client: SupabaseClient, filtros: FiltrosLoja, signal?: AbortSignal) {
  let query = client.from("products").select("id,nome,slug,categoria,preco,imagem,estoque", { count: "exact" }).eq("ativo", true);
  if (filtros.busca) query = query.or(filtroBuscaLoja(filtros.busca));
  if (filtros.categoria !== "todas") query = query.eq("categoria", filtros.categoria);
  query = filtros.ordenacao === "recentes"
    ? query.order("criado_em", { ascending: false, nullsFirst: false })
    : query.order("preco", { ascending: filtros.ordenacao === "menor-preco" });
  const from = (filtros.page - 1) * PAGE_SIZE;
  query = query.order("id", { ascending: true }).range(from, from + PAGE_SIZE - 1);
  if (signal) query = query.abortSignal(signal);
  const { data, count, error } = await query;
  let total = count;
  if (error?.code === "PGRST103") {
    // Uma URL antiga pode apontar além da última página após remoções no catálogo.
    // HEAD recupera somente a contagem para corrigir a URL, sem baixar produtos.
    let contagem = client.from("products").select("id", { count: "exact", head: true }).eq("ativo", true);
    if (filtros.busca) contagem = contagem.or(filtroBuscaLoja(filtros.busca));
    if (filtros.categoria !== "todas") contagem = contagem.eq("categoria", filtros.categoria);
    if (signal) contagem = contagem.abortSignal(signal);
    const resposta = await contagem;
    if (resposta.error) throw resposta.error;
    total = resposta.count;
  } else if (error) throw error;
  if (total === null) throw new Error("O banco não retornou a contagem do catálogo.");
  return { produtos: (data ?? []) as ProdutoLoja[], total, paginas: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function consultarCategoriasLoja(client: SupabaseClient, signal?: AbortSignal) {
  // Usa a lista oficial existente, verificando disponibilidade sem baixar produtos.
  const categorias = await Promise.all(CATEGORIAS_OFICIAIS.map(async categoria => {
    let query = client.from("products").select("id").eq("ativo", true).eq("categoria", categoria).limit(1);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    return data?.length ? categoria : null;
  }));
  return categorias.filter((c): c is NonNullable<typeof c> => c !== null).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function janelaPaginas(page: number, total: number): (number | "…")[] {
  const numeros = new Set([1, total]);
  for (let n = Math.max(1, page - 1); n <= Math.min(total, page + 1); n++) numeros.add(n);
  if (page <= 3) for (let n = 1; n <= Math.min(5, total); n++) numeros.add(n);
  if (page >= total - 2) for (let n = Math.max(1, total - 4); n <= total; n++) numeros.add(n);
  const lista: (number | "…")[] = []; let anterior = 0;
  for (const n of [...numeros].sort((a,b) => a-b)) { if (anterior && n - anterior > 1) lista.push("…"); lista.push(n); anterior = n; }
  return lista;
}
