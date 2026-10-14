import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function carregar(path, deps = {}) {
  const m = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), { compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022} }).outputText)(n => deps[n] ?? require(n), m, m.exports);
  return m.exports;
}
const categorias = carregar('app/lib/categorias-importacao.ts');
const revisao = carregar('app/lib/revisao-categorias.ts', {'./categorias-importacao':categorias});
const base = carregar('app/lib/importacao-produtos.ts');
const planilha = carregar('app/lib/planilha-produtos.ts', {'./categorias-importacao':categorias,'./importacao-produtos':base});
for (const [nome, categoria] of [
  ['Chá de Hibisco','Chás'], ['Castanha de Caju','Oleaginosas'], ['Whey Protein','Suplementos'],
  ['Creatina Monohidratada','Suplementos'], ['Farinha de Amêndoas','Farinhas'], ['Semente de Chia','Sementes'],
  ['Açúcar Mascavo','Açúcares'], ['Xilitol','Adoçantes'], ['Café Especial','Cafeteria'], ['Canela em Pó','Especiarias'],
  ['Tempero Completo','Temperos'], ['Granola Tradicional','Cereais'], ['Chocolate 70%','Bomboniere'],
  ['Granulado de Chocolate','Confeitaria'], ['Chips de Banana','Snacks'], ['Noz-moscada','Especiarias'],
  ['Sal com Ervas','Temperos'], ['Gotas de Chocolate','Confeitaria'], ['Suco de Uva','Bebidas'],
  ['Chips de Banana Açúcar e Canela','Snacks'], ['Chips de Banana Lemon Pepper','Snacks'],
  ['Coco Chips sem Açúcar','Snacks'], ['Alho Granulado Desidratado','Culinária'],
  ['Canela de Velho Rasurada','Chás'], ['Trident Canela','Bomboniere'],
  ['Granola Salgada Lemon Pepper','Cereais'], ['Semente de Abóbora Lemon Pepper','Sementes'],
]) test(`${nome} → ${categoria}`, () => {
  const r = categorias.classifyProductCategory({nome});
  assert.equal(r.categoria,categoria); assert.ok(r.confianca>=.8); assert.ok(r.motivo);
});
test('tipo explícito vence ingrediente e categoria original', () => {
  assert.equal(categorias.classifyProductCategory({nome:'Farinha de Amêndoas',categoriaOriginal:'Oleaginosas'}).categoria,'Farinhas');
  assert.equal(categorias.classifyProductCategory({nome:'Chá com Canela',categoriaOriginal:'Temperos'}).categoria,'Chás');
});
test('acentos, espaços e caixa não afetam classificação ou nome original', () => {
  const nome='  CHÁ   DE HIBISCO  '; assert.equal(categorias.classifyProductCategory({nome}).categoria,'Chás'); assert.equal(nome,'  CHÁ   DE HIBISCO  ');
});
test('categoria original oficial e pistas não oficiais têm confiança distinta', () => {
  assert.equal(categorias.classifyProductCategory({nome:'Produto 1',categoriaOriginal:'Culinária'}).confianca,.9);
  const r=categorias.classifyProductCategory({nome:'Produto 1',categoriaOriginal:'Suplementação esportiva',descricao:'suplemento'});
  assert.equal(r.categoria,'Suplementos');assert.equal(r.status,'Revisar categoria');
  assert.equal(categorias.classifyProductCategory({nome:'Produto 1',categoriaOriginal:'Suplementação Esportiva'}).categoria,'Suplementos');
});
test('SKU e marca não classificam sozinhos; nenhuma categoria não oficial', () => {
  const r=categorias.classifyProductCategory({nome:'Produto 1',categoriaOriginal:'Todos os produtos',sku:'whey',marca:'Chás'});
  assert.equal(r.categoria,''); assert.equal(r.status,'Categoria incerta');
  for(const c of ['Todos os produtos','Outros','Diversos','Geral','GRANEL']) assert.equal(categorias.categoriaOficial(c),false);
});
test('incerteza impede importação até escolha manual; outros erros permanecem', () => {
  const r=planilha.analisarPlanilha(Buffer.from('nome,preco,categoria\nProduto 1,10,GRANEL'));
  const v=planilha.validarProdutos(revisao.classificarLinhas(r.linhas),[],[]);
  assert.ok(v[0].erros.includes(categorias.ERRO_REVISAO_CATEGORIA));
  const corrigida=revisao.aplicarCategoriaManual({...v[0],erros:[...v[0].erros,'Estoque inválido']},'Mercearia');
  assert.deepEqual(corrigida.erros,['Estoque inválido']);assert.equal(corrigida.produto.categoria,'Mercearia');
  assert.throws(()=>revisao.aplicarCategoriaManual(v[0],'Outros'));
});
test('correção manual prevalece ao reclassificar no servidor', () => {
  const r=planilha.analisarPlanilha(Buffer.from('nome,preco,categoria\nCastanha,10,GRANEL'));
  const v=revisao.classificarLinhas(r.linhas,revisao.lerEdicoesCategoria([{linha:2,categoria:'Snacks'}]));
  assert.equal(v[0].classificacao.categoria,'Oleaginosas');assert.equal(v[0].produto.categoria,'Snacks');assert.equal(v[0].categoriaManual,true);
});
test('servidor rejeita categoria forjada, linha inexistente e revisões duplicadas', () => {
  for(const dados of [[{linha:2,categoria:'Outros'}],[{linha:2,categoria:'Todos os produtos'}],[{linha:2,categoria:'Chás'},{linha:2,categoria:'Snacks'}]]) assert.throws(()=>revisao.lerEdicoesCategoria(dados));
  assert.throws(()=>revisao.classificarLinhas([],[{linha:2,categoria:'Chás'}]));
});
test('categoria padrão só confirma casos incertos e respeita escolha individual', () => {
  const r=planilha.analisarPlanilha(Buffer.from('nome,preco,categoria\nProduto 1,10,GRANEL\nCastanha,10,GRANEL'));
  const v=revisao.classificarLinhas(r.linhas,[{linha:2,categoria:'Culinária'}],'Mercearia');
  assert.equal(v[0].produto.categoria,'Culinária');assert.equal(v[1].produto.categoria,'Oleaginosas');
});
test('classificação da planilha real preserva 656 produtos e usa somente lista oficial', () => {
  const r=planilha.analisarPlanilha(readFileSync(new URL('../produtos_2026-10-08-1.xls',import.meta.url)));
  const v=revisao.classificarLinhas(r.linhas);
  assert.equal(v.length,656);assert.ok(v.every(l=>l.produto.categoria===''||categorias.categoriaOficial(l.produto.categoria)));
});
