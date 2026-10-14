import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../app/lib/valor-estoque.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m={exports:{}};
new Function('module','exports',code)(m,m.exports);
const {obterQuantidadeComercial,calcularValorEstoqueProduto}=m.exports;

test('UN e produtos legados mantêm preço vezes quantidade',()=>{
  for(const unidade of ['UN','UND',undefined,null,''])assert.equal(calcularValorEstoqueProduto({preco:10,estoque:5,unidade}),50);
});

test('KG usa quilogramas comerciais sem alterar o produto',()=>{
  const produto=Object.freeze({preco:79.90,estoque:13430,unidade:'KG'});
  assert.equal(obterQuantidadeComercial(produto),13.43);
  assert.ok(Math.abs(calcularValorEstoqueProduto(produto)-1073.057)<1e-9);
  assert.equal(calcularValorEstoqueProduto(produto).toFixed(2),'1073.06');
  assert.equal(produto.estoque,13430);assert.equal(produto.preco,79.90);
  assert.equal(calcularValorEstoqueProduto({preco:20,estoque:500,unidade:'KG'}),10);
  assert.equal(calcularValorEstoqueProduto({preco:50,estoque:1000,unidade:'KG'}),50);
  assert.equal(calcularValorEstoqueProduto({...produto,unidade:' kg '}),calcularValorEstoqueProduto(produto));
});

test('valores inválidos não contaminam o indicador com NaN',()=>{
  for(const invalido of [NaN,Infinity,-Infinity,-1,undefined,null,'texto','10',{}]){
    assert.equal(calcularValorEstoqueProduto({preco:invalido,estoque:5,unidade:'UN'}),0);
    assert.equal(calcularValorEstoqueProduto({preco:10,estoque:invalido,unidade:'KG'}),0);
  }
  assert.equal(calcularValorEstoqueProduto({preco:10,estoque:0,unidade:'KG'}),0);
  assert.equal(calcularValorEstoqueProduto({preco:0,estoque:5,unidade:'UN'}),0);
  assert.equal(calcularValorEstoqueProduto({preco:Number.MAX_VALUE,estoque:Number.MAX_VALUE}),0);
  assert.equal(calcularValorEstoqueProduto({preco:10,estoque:5,unidade:{}}),50);
});

test('total misto corrige apenas contribuição KG, mantendo precisão até exibição',()=>{
  const produtos=[{preco:10,estoque:5,unidade:'UN'},{preco:79.90,estoque:13430,unidade:'KG'},{preco:20,estoque:500,unidade:'KG'},{preco:50,estoque:1000,unidade:'KG'},{preco:NaN,estoque:2}];
  const total=produtos.reduce((s,p)=>s+calcularValorEstoqueProduto(p),0);
  assert.equal(total.toFixed(2),'1183.06');
  assert.ok(Number.isFinite(total));
});
