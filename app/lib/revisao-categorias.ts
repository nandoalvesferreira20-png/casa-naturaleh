import type { LinhaImportacao } from "./importacao-produtos";
import { classifyProductCategory, categoriaOficial, ERRO_REVISAO_CATEGORIA, ERRO_CATEGORIA_OFICIAL } from "./categorias-importacao";

export type EdicaoCategoria = { linha: number; categoria: string };
export function lerEdicoesCategoria(valor: unknown): EdicaoCategoria[] {
  if (!Array.isArray(valor) || valor.length > 1000) throw new Error("Revisões de categoria inválidas");
  const vistos = new Set<number>();
  return valor.map(item => {
    if (!item || !Number.isSafeInteger(item.linha) || item.linha < 2 || !categoriaOficial(item.categoria) || vistos.has(item.linha)) throw new Error("Revisões de categoria inválidas: use somente categorias oficiais e linhas únicas");
    vistos.add(item.linha); return { linha: item.linha, categoria: item.categoria };
  });
}
export function aplicarCategoriaManual(linha: LinhaImportacao, categoria: string): LinhaImportacao {
  if (!categoriaOficial(categoria)) throw new Error(ERRO_CATEGORIA_OFICIAL);
  return { ...linha, categoriaManual: true, produto: { ...linha.produto, categoria },
    erros: linha.erros.filter(e => e !== ERRO_REVISAO_CATEGORIA && e !== ERRO_CATEGORIA_OFICIAL) };
}
export function classificarLinhas(linhas: LinhaImportacao[], edicoes: EdicaoCategoria[] = [], padrao = "") {
  if (padrao && !categoriaOficial(padrao)) throw new Error(ERRO_CATEGORIA_OFICIAL);
  const ids = new Set(linhas.map(l => l.linha));
  if (edicoes.some(e => !ids.has(e.linha))) throw new Error("Revisão de categoria aponta para uma linha inexistente");
  const escolhas = new Map(edicoes.map(e => [e.linha, e.categoria]));
  return linhas.map(l => {
    const classificacao = classifyProductCategory({ ...l, ...l.produto, categoriaOriginal: l.categoriaOriginal ?? l.produto.categoria });
    const sugerida = { ...l, classificacao, categoriaManual: false, produto: { ...l.produto, categoria: classificacao.categoria } };
    const manual = escolhas.get(l.linha) ?? (classificacao.confianca < .6 ? padrao : "");
    return manual ? aplicarCategoriaManual(sugerida, manual) : sugerida;
  });
}
