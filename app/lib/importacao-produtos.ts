export const LIMITE_CSV = 5 * 1024 * 1024;
export const LIMITE_IMAGEM = 5 * 1024 * 1024;
export const LIMITE_LOTE = 50 * 1024 * 1024;
export const LIMITE_LINHAS = 1000;

const colunas = ["nome", "slug", "categoria", "preco", "descricao", "estoque", "ativo", "imagem"] as const;
type Coluna = typeof colunas[number];
export type ImagemImportacao = { name: string; size: number; type: string };
export type LinhaImportacao = {
  linha: number;
  produto: Record<Coluna, string>;
  erros: string[];
  avisos?: string[];
  sku?: string;
  imagemOriginal?: string;
  existente?: boolean;
  categoriaOriginal?: string;
  subCategoria?: string;
  marca?: string;
  unidade?: string;
  unidadeNormalizada?: "KG" | "UN";
  estoqueInterno?: number;
  classificacao?: import("./categorias-importacao").ClassificacaoCategoria;
  categoriaManual?: boolean;
};

export function normalizarUnidade(valor: string | undefined): "KG" | "UN" | undefined {
  const s = (valor ?? "UN").trim().toUpperCase();
  if (["UN", "UND", "UNIDADE", "UNIDADES"].includes(s)) return "UN";
  if (s === "KG") return "KG";
}

export function parseEstoqueUnitario(valor: string): number | undefined {
  const s = valor.trim();
  if (!/^\d+$/.test(s)) return;
  const n = Number(s);
  return Number.isSafeInteger(n) && n <= 2147483647 ? n : undefined;
}

// A planilha usa ponto decimal, inclusive 0.750. Não é separador de milhar.
// Conversão por dígitos evita arredondamento binário e perda de frações de grama.
export function parsePeso(valor: string): number | undefined {
  const match = /^(\d+)(?:[.,](\d+))?$/.exec(valor.trim());
  if (!match || (match[2]?.slice(3).replace(/0/g, "") ?? "")) return;
  const gramas = Number(match[1] + (match[2] ?? "").slice(0, 3).padEnd(3, "0"));
  return Number.isSafeInteger(gramas) && gramas <= 2147483647 ? gramas : undefined;
}

export function interpretarEstoque(valor: string, unidade: string | undefined) {
  const unidadeNormalizada = normalizarUnidade(unidade);
  if (!unidadeNormalizada) return { erro: "Unidade não reconhecida" };
  const estoqueInterno = unidadeNormalizada === "KG" ? parsePeso(valor) : parseEstoqueUnitario(valor);
  const erro = estoqueInterno === undefined
    ? unidadeNormalizada === "KG"
      ? "Estoque inválido para KG: use peso não negativo, representável em gramas e dentro do limite integer"
      : "Estoque inválido para produto unitário: use um inteiro maior ou igual a zero dentro do limite integer"
    : undefined;
  return { unidadeNormalizada, estoqueInterno, erro };
}

export function formatarEstoqueImportacao(valor: string, unidade: string | undefined): string {
  const { unidadeNormalizada, estoqueInterno } = interpretarEstoque(valor, unidade);
  if (estoqueInterno === undefined) return valor || "—";
  return unidadeNormalizada === "KG"
    ? `${(estoqueInterno / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg`
    : `${estoqueInterno.toLocaleString("pt-BR")} unidades`;
}
export type ResultadoImportacao = {
  importados: number;
  ignorados: number;
  erros: number;
  detalhes: { linha: number; mensagem: string }[];
  avisos: string[];
};

// CSV com BOM, CRLF, campos entre aspas, vírgulas, aspas escapadas e quebras internas.
export function lerCSV(texto: string): LinhaImportacao[] {
  texto = texto.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const registros: { linha: number; campos: string[] }[] = [];
  let campos: string[] = [], campo = "", aspas = false, fechado = false;
  let linha = 1, inicio = 1;
  function salvarCampo() { campos.push(campo.trim()); campo = ""; fechado = false; }
  function salvarRegistro() {
    salvarCampo();
    if (campos.some(Boolean)) registros.push({ linha: inicio, campos });
    campos = [];
  }
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }
        else { aspas = false; fechado = true; }
      } else { campo += c; if (c === "\n") linha++; }
    } else if (c === ",") salvarCampo();
    else if (c === "\n") { salvarRegistro(); linha++; inicio = linha; }
    else if (c === '"' && !campo && !fechado) aspas = true;
    else if (c === '"' || (fechado && c.trim())) throw new Error(`Linha ${linha} — aspas inválidas no CSV.`);
    else if (!fechado) campo += c;
  }
  if (aspas) throw new Error(`Linha ${inicio} — campo com aspas não fechadas.`);
  salvarRegistro();
  const cabecalho = registros.shift()?.campos;
  if (!cabecalho || new Set(cabecalho).size !== cabecalho.length || colunas.some(c => !cabecalho.includes(c))) {
    throw new Error("CSV inválido. Use as oito colunas do modelo, separadas por vírgulas.");
  }
  if (!registros.length) throw new Error("O CSV não contém produtos.");
  if (registros.length > LIMITE_LINHAS) throw new Error(`Importe no máximo ${LIMITE_LINHAS} produtos por lote.`);
  return registros.map(registro => ({
    linha: registro.linha,
    unidade: cabecalho.includes("unidade") ? registro.campos[cabecalho.indexOf("unidade")] : undefined,
    produto: Object.fromEntries(colunas.map(c => [c, registro.campos[cabecalho.indexOf(c)] ?? ""])) as Record<Coluna, string>,
    erros: registro.campos.length === cabecalho.length ? [] : ["Quantidade de campos diferente do cabeçalho"],
  }));
}

export function valorAtivo(valor: string): boolean | undefined {
  const normalizado = valor.trim().toLowerCase();
  if (["true", "1", "sim", "ativo", "a"].includes(normalizado)) return true;
  if (["false", "0", "nao", "não", "inativo", "i"].includes(normalizado)) return false;
}

export function erroImagem(imagem: ImagemImportacao): string | undefined {
  const extensao = imagem.name.split(".").pop()?.toLowerCase();
  const tipos: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  if (!extensao || !Object.hasOwn(tipos, extensao) || (imagem.type && tipos[extensao] !== imagem.type)) return "Formato de imagem inválido (use JPG, JPEG, PNG ou WEBP)";
  if (!Number.isFinite(imagem.size) || imagem.size <= 0 || imagem.size > LIMITE_IMAGEM) return "Imagem vazia ou maior que 5 MB";
}

export function validarLinhas(linhas: LinhaImportacao[], imagens: ImagemImportacao[], existentes: Set<string>): LinhaImportacao[] {
  const frequencia = new Map<string, number>();
  for (const { produto } of linhas) frequencia.set(produto.slug, (frequencia.get(produto.slug) ?? 0) + 1);
  return linhas.map(l => {
    const { linha, produto, erros: anteriores } = l;
    const erros = [...anteriores];
    for (const campo of ["nome", "slug", "categoria", "imagem"] as const) if (!produto[campo]) erros.push(`Campo obrigatório ausente: ${campo}`);
    if (produto.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(produto.slug)) erros.push("Slug inválido: use letras minúsculas, números e hífens");
    if (!/^\d+(?:\.\d{1,2})?$/.test(produto.preco) || !Number.isFinite(Number(produto.preco)) || Number(produto.preco) <= 0) erros.push("Preço inválido: use ponto decimal e valor maior que zero");
    const estoque = interpretarEstoque(produto.estoque, l.unidade);
    if (estoque.erro) erros.push(estoque.erro);
    if (valorAtivo(produto.ativo) === undefined) erros.push("Ativo inválido: use true, false, 1, 0, sim, nao ou não");
    if ((frequencia.get(produto.slug) ?? 0) > 1) erros.push("Slug duplicado no CSV");
    if (existentes.has(produto.slug)) erros.push("Produto já existente");
    const arquivos = imagens.filter(imagem => imagem.name === produto.imagem);
    if (!arquivos.length) erros.push("Imagem não encontrada");
    else if (arquivos.length > 1) erros.push("Mais de uma imagem com o mesmo nome");
    else { const erro = erroImagem(arquivos[0]); if (erro) erros.push(erro); }
    return { ...l, linha, produto, erros, unidadeNormalizada: estoque.unidadeNormalizada, estoqueInterno: estoque.estoqueInterno };
  });
}
