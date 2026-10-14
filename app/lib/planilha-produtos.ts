import * as XLSX from "xlsx";
import { categoriaOficial, ERRO_REVISAO_CATEGORIA, ERRO_CATEGORIA_OFICIAL } from "./categorias-importacao";
import { LIMITE_LINHAS, valorAtivo, erroImagem, interpretarEstoque, type LinhaImportacao, type ImagemImportacao } from "./importacao-produtos";

export const normalizarNome = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
export const gerarSlug = (s: string) => normalizarNome(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const aliases = {
  nome: ["nome", "produto", "nome do produto", "descricao do produto"],
  slug: ["slug"], categoria: ["categoria"], preco: ["preco", "preco de venda", "valor"],
  descricao: ["descricao", "descricao complementar"], estoque: ["estoque", "saldo", "saldo de estoque", "estoque atual"],
  ativo: ["ativo", "status", "situacao"], sku: ["sku", "codigo (sku)", "codigo"],
  imagem: ["url imagem 1", "imagem principal", "url imagem", "url de imagem", "imagem"],
  subCategoria: ["sub-categoria", "subcategoria"], marca: ["marca"], unidade: ["unidade"],
} as const;
export function parsePreco(valor: unknown): number | undefined {
  if (typeof valor === "number") return Number.isFinite(valor) && valor > 0 ? valor : undefined;
  let s = String(valor ?? "").trim().replace(/^R\$\s*/, "");
  if (/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(s)) return;
  const n = Number(s); return Number.isFinite(n) && n > 0 ? n : undefined;
}
export function urlImagemValida(s: string) {
  try { const u = new URL(s); return ["http:", "https:"].includes(u.protocol) && !u.username && !u.password; } catch { return false; }
}
export function analisarPlanilha(buffer: Buffer, categoriaPadrao = "") {
  const binario = buffer[0] === 0xd0 || (buffer[0] === 0x50 && buffer[1] === 0x4b);
  const workbook = XLSX.read(binario ? buffer : buffer.toString("utf8").replace(/^\uFEFF/, ""), { type: binario ? "buffer" : "string", raw: true, cellFormula: false, cellHTML: false, sheetRows: LIMITE_LINHAS + 52 });
  const candidatos = workbook.SheetNames.map(nome => ({ nome, sheet: workbook.Sheets[nome] }));
  for (const { nome, sheet } of candidatos) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", blankrows: true });
    const inicio = rows.slice(0, 50).findIndex(r => r.some(v => aliases.nome.includes(normalizarNome(String(v)) as never)) && r.some(v => aliases.preco.includes(normalizarNome(String(v)) as never)));
    if (inicio < 0) continue;
    const cabecalho = rows[inicio].map(v => String(v).trim());
    const keys = cabecalho.map(normalizarNome);
    const mapeamento = Object.fromEntries(Object.entries(aliases).map(([campo, nomes]) => [campo, nomes.map(n => keys.indexOf(n)).find(i => i >= 0) ?? -1])) as Record<keyof typeof aliases, number>;
    const dados = rows.slice(inicio + 1).map((row, i) => ({ row, linha: inicio + i + 2 })).filter(({ row }) => row.some(v => String(v).trim()));
    if (!dados.length) throw new Error("A planilha não contém produtos.");
    if (dados.length > LIMITE_LINHAS) throw new Error(`Importe no máximo ${LIMITE_LINHAS} produtos por lote.`);
    const linhas = dados.map(({ row, linha }): LinhaImportacao => {
      const get = (k: keyof typeof aliases) => String(row[mapeamento[k]] ?? "").trim();
      const erros: string[] = [], avisos: string[] = [];
      const preco = parsePreco(row[mapeamento.preco]);
      const estoque = get("estoque");
      const imagens = get("imagem").split(/[;\n|]+/).map(s => s.trim()).filter(Boolean);
      const imagem = imagens.find(urlImagemValida) ?? imagens[0] ?? "";
      if (imagens.length > 1) avisos.push("Somente a primeira imagem válida será usada.");
      if (mapeamento.estoque < 0) avisos.push("Coluna estoque ausente: será usado 0.");
      if (!imagem) avisos.push("Imagem ausente: produto será importado sem imagem.");
      return { linha, erros, avisos, sku: get("sku"), imagemOriginal: imagem,
        categoriaOriginal: get("categoria"), subCategoria: get("subCategoria"), marca: get("marca"), unidade: mapeamento.unidade < 0 ? undefined : get("unidade"), produto: {
        nome: get("nome"), slug: get("slug") || gerarSlug(get("nome")),
        categoria: (get("categoria") || categoriaPadrao).trim().replace(/\s+/g, " "),
        preco: preco === undefined ? get("preco") : String(preco), descricao: get("descricao"),
        estoque: mapeamento.estoque < 0 ? "0" : estoque, ativo: get("ativo") || "true", imagem,
      } };
    });
    return { linhas, relatorio: { aba: nome, linhaCabecalho: inicio + 1, colunas: cabecalho, mapeamento: Object.fromEntries(Object.entries(mapeamento).map(([k, i]) => [k, i < 0 ? null : cabecalho[i]])), total: linhas.length, urls: linhas.filter(l => urlImagemValida(l.produto.imagem)).length } };
  }
  throw new Error("Não foi encontrado um cabeçalho com nome do produto e preço.");
}
export function validarProdutos(linhas: LinhaImportacao[], imagens: ImagemImportacao[], existentes: { nome: string; slug: string }[]) {
  const nomes = new Set(existentes.map(p => normalizarNome(p.nome)));
  const slugs = new Set(existentes.map(p => p.slug));
  const vistos = new Set<string>();
  const skus = new Set<string>();
  return linhas.map(l => {
    const produto = { ...l.produto }, erros = [...l.erros];
    const nome = normalizarNome(produto.nome);
    const existente = nomes.has(nome) || existentes.some(p => p.slug === produto.slug);
    if (existente) erros.push("Possível produto já existente");
    if (vistos.has(nome)) erros.push("Possível produto duplicado na planilha");
    if (l.sku && skus.has(l.sku)) erros.push("SKU duplicado na planilha");
    if (l.sku) skus.add(l.sku);
    vistos.add(nome);
    const base = produto.slug;
    let sufixo = 2;
    if (!existente) { while (slugs.has(produto.slug)) produto.slug = `${base}-${sufixo++}`; slugs.add(produto.slug); }
    if (!produto.nome) erros.push("Campo obrigatório ausente: nome");
    if (l.classificacao) {
      if (!l.categoriaManual && l.classificacao.confianca < .6) erros.push(ERRO_REVISAO_CATEGORIA);
      else if (!categoriaOficial(produto.categoria)) erros.push(ERRO_CATEGORIA_OFICIAL);
    } else if (!produto.categoria) erros.push("Selecione uma categoria padrão ou informe categoria na planilha");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(produto.slug)) erros.push("Slug inválido");
    if (parsePreco(produto.preco) === undefined) erros.push("Preço inválido");
    const estoque = interpretarEstoque(produto.estoque, l.unidade);
    if (estoque.erro) erros.push(estoque.erro);
    if (valorAtivo(produto.ativo) === undefined) erros.push("Ativo inválido");
    if (produto.imagem) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(produto.imagem)) { if (!urlImagemValida(produto.imagem)) erros.push("URL de imagem inválida"); }
      else {
        const arquivos = imagens.filter(i => i.name === produto.imagem);
        if (arquivos.length !== 1) erros.push("Imagem não encontrada ou nome duplicado");
        else { const erro = erroImagem(arquivos[0]); if (erro) erros.push(erro); }
      }
    }
    return { ...l, produto, erros, existente, unidadeNormalizada: estoque.unidadeNormalizada, estoqueInterno: estoque.estoqueInterno };
  });
}
