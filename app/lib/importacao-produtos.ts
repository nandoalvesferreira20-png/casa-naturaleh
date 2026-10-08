export const LIMITE_CSV = 1024 * 1024;
export const LIMITE_IMAGEM = 5 * 1024 * 1024;
export const LIMITE_LOTE = 50 * 1024 * 1024;
export const LIMITE_LINHAS = 200;

const colunas = ["nome", "slug", "categoria", "preco", "descricao", "estoque", "ativo", "imagem"] as const;
type Coluna = typeof colunas[number];
export type ImagemImportacao = { name: string; size: number; type: string };
export type LinhaImportacao = {
  linha: number;
  produto: Record<Coluna, string>;
  erros: string[];
};
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
    produto: Object.fromEntries(colunas.map(c => [c, registro.campos[cabecalho.indexOf(c)] ?? ""])) as Record<Coluna, string>,
    erros: registro.campos.length === cabecalho.length ? [] : ["Quantidade de campos diferente do cabeçalho"],
  }));
}

export function valorAtivo(valor: string): boolean | undefined {
  const normalizado = valor.toLowerCase();
  if (["true", "1", "sim"].includes(normalizado)) return true;
  if (["false", "0", "nao", "não"].includes(normalizado)) return false;
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
  return linhas.map(({ linha, produto, erros: anteriores }) => {
    const erros = [...anteriores];
    for (const campo of ["nome", "slug", "categoria", "imagem"] as const) if (!produto[campo]) erros.push(`Campo obrigatório ausente: ${campo}`);
    if (produto.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(produto.slug)) erros.push("Slug inválido: use letras minúsculas, números e hífens");
    if (!/^\d+(?:\.\d{1,2})?$/.test(produto.preco) || !Number.isFinite(Number(produto.preco)) || Number(produto.preco) <= 0) erros.push("Preço inválido: use ponto decimal e valor maior que zero");
    if (!/^\d+$/.test(produto.estoque) || !Number.isSafeInteger(Number(produto.estoque)) || Number(produto.estoque) > 2147483647) erros.push("Estoque inválido: use um inteiro maior ou igual a zero");
    if (valorAtivo(produto.ativo) === undefined) erros.push("Ativo inválido: use true, false, 1, 0, sim, nao ou não");
    if ((frequencia.get(produto.slug) ?? 0) > 1) erros.push("Slug duplicado no CSV");
    if (existentes.has(produto.slug)) erros.push("Produto já existente");
    const arquivos = imagens.filter(imagem => imagem.name === produto.imagem);
    if (!arquivos.length) erros.push("Imagem não encontrada");
    else if (arquivos.length > 1) erros.push("Mais de uma imagem com o mesmo nome");
    else { const erro = erroImagem(arquivos[0]); if (erro) erros.push(erro); }
    return { linha, produto, erros };
  });
}
