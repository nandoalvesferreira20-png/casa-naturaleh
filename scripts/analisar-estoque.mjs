import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';
const require = createRequire(import.meta.url), cache = new Map();
function carregar(arquivo) {
  arquivo = resolve(arquivo);
  if (cache.has(arquivo)) return cache.get(arquivo).exports;
  const m = { exports: {} }; cache.set(arquivo, m);
  const code = ts.transpileModule(readFileSync(arquivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(n => n.startsWith('.') ? carregar(resolve(dirname(arquivo), n + '.ts')) : require(n), m, m.exports);
  return m.exports;
}
const p = carregar('app/lib/planilha-produtos.ts');
const r = carregar('app/lib/revisao-categorias.ts');
const arquivo = 'produtos_2026-10-08-1.xls';
const { linhas, relatorio } = p.analisarPlanilha(readFileSync(arquivo));
const resultado = p.validarProdutos(r.classificarLinhas(linhas), [], []);
const anteriores = resultado.map(l => {
  const erros = l.erros.filter(e => !e.startsWith('Estoque inválido') && e !== 'Unidade não reconhecida');
  if (!/^\d+$/.test(l.produto.estoque) || !Number.isSafeInteger(Number(l.produto.estoque)) || Number(l.produto.estoque) > 2147483647) erros.push('Estoque inválido');
  return {...l,erros};
});
const XLSX = require('xlsx');
const buffer = readFileSync(arquivo);
const binario = buffer[0] === 0xd0 || (buffer[0] === 0x50 && buffer[1] === 0x4b);
const w = XLSX.read(binario ? buffer : buffer.toString('utf8'),{type:binario?'buffer':'string',raw:true});
const raw = XLSX.utils.sheet_to_json(w.Sheets[relatorio.aba],{header:1,defval:'',blankrows:true});
const originais = l => ({linha:l.linha,nome:l.produto.nome,unidade:l.unidade,estoque:raw[l.linha-1][5],preco:raw[l.linha-1][4],erros:l.erros});
const errosAntes = {};
for(const l of anteriores) for(const e of l.erros) errosAntes[e]=(errosAntes[e]??0)+1;
const estoquesInvalidosAntes = anteriores.filter(l=>l.erros.includes('Estoque inválido'));
const erros = {}, unidades = {};
for (const l of resultado) { unidades[l.unidade] = (unidades[l.unidade] ?? 0) + 1; for (const e of l.erros) erros[e] = (erros[e] ?? 0) + 1; }
const invalidas = resultado.filter(l => l.erros.length);
const resumo = { arquivo, relatorio, unidades, erros, validos: resultado.length - invalidas.length, invalidos: invalidas.length,
  decimais: linhas.filter(l => /^\d+[.,]\d+$/.test(l.produto.estoque)).length,
  invalidosKG: invalidas.filter(l => l.unidade === 'KG').length,
  exemplos: invalidas.slice(0, 5).map(l => ({ linha: l.linha, nome: l.produto.nome, unidade: l.unidade, estoque: l.produto.estoque, preco: l.produto.preco, erros: l.erros })),
  formatos: linhas.slice(0, 5).map(l => ({ unidade: l.unidade, estoque: l.produto.estoque, preco: l.produto.preco })),
  diagnosticoAntes: {erros:errosAntes,validos:anteriores.filter(l=>!l.erros.length).length,invalidos:anteriores.filter(l=>l.erros.length).length,
    estoqueInvalidoKG:estoquesInvalidosAntes.filter(l=>l.unidade==='KG').length,estoqueInvalidoOutraUnidade:estoquesInvalidosAntes.filter(l=>l.unidade!=='KG').length,
    decimaisNaoNegativos:estoquesInvalidosAntes.filter(l=>/^\d+[.,]\d+$/.test(l.produto.estoque)).length,
    decimaisNegativos:estoquesInvalidosAntes.filter(l=>/^-\d+[.,]\d+$/.test(l.produto.estoque)).length,
    exemplos:estoquesInvalidosAntes.slice(0,5).map(originais)},
  tiposOriginais: {preco:[...new Set(raw.slice(1).filter(r=>r.some(Boolean)).map(r=>typeof r[4]))],estoque:[...new Set(raw.slice(1).filter(r=>r.some(Boolean)).map(r=>typeof r[5]))]},
  estoquesNaoNumericos:resultado.filter(l=> !/^-?\d+(?:[.,]\d+)?$/.test(l.produto.estoque)).map(originais),
  negativos:resultado.filter(l=>l.produto.estoque.startsWith('-')).map(originais),
  xilitol: resultado.filter(l => /xilitol/i.test(l.produto.nome)).map(originais) };
console.log(JSON.stringify(resumo, null, 2));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(resumo, null, 2) + '\n');
