import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const code = ts.transpileModule(readFileSync(new URL('../app/lib/catalogo-home.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const modulo={exports:{}};
new Function('require','module','exports',code)(()=>{throw new Error('Dependência externa inesperada');},modulo,modulo.exports);
const {consultarCatalogoHome}=modulo.exports;

function banco(linhas,{falhaProdutos=false,falhaCategorias=false}={}) {
  const consultas=[];
  return {consultas, from(tabela) {
    assert.equal(tabela,'products');
    const q={campos:'',filtros:[],limite:null,ordem:null}; consultas.push(q);
    const consulta={select(campos){q.campos=campos;return consulta;},eq(campo,valor){q.filtros.push([campo,valor]);return consulta;},order(campo,opcoes){q.ordem=[campo,opcoes];return consulta;},limit(n){q.limite=n;return consulta;},then(resolve,reject){
      const error=(q.campos==='id'?falhaCategorias:falhaProdutos)?new Error('offline'):null;
      let data=linhas.filter(l=>q.filtros.every(([campo,valor])=>l[campo]===valor));
      if(q.ordem) data=[...data].sort((a,b)=>b[q.ordem[0]].localeCompare(a[q.ordem[0]]));
      data=data.slice(0,q.limite).map(l=>Object.fromEntries(q.campos.split(',').map(c=>[c,l[c]])));
      return Promise.resolve({data:error?null:data,error}).then(resolve,reject);
    }};
    return consulta;
  }};
}

test('Home consulta somente ativos, limita destaques e exclui categorias vazias/inativas',async()=>{
  const linhas=Array.from({length:6},(_,i)=>({id:String(i),nome:`Produto ${i}`,slug:`produto-${i}`,categoria:i%2?'Chás':'Farinhas',preco:10,imagem:'real.jpg',estoque:3,ativo:true,criado_em:`2026-10-0${i+1}`}));
  linhas.push({...linhas[0],id:'inativo',ativo:false,categoria:'Snacks',criado_em:'2026-11-01'});
  const client=banco(linhas), r=await consultarCatalogoHome(client);
  assert.deepEqual(r.produtos.map(p=>p.id),['5','4','3','2']);
  assert.deepEqual(r.categorias.map(c=>c.nome),['Chás','Farinhas']);
  assert.equal(r.produtos[0].estoque,3);
  assert.ok(!r.erroProdutos && !r.erroCategorias);
  assert.equal(client.consultas.length,9);
  assert.ok(client.consultas.every(q=>q.filtros.some(([c,v])=>c==='ativo'&&v===true)));
  assert.ok(client.consultas.slice(1).every(q=>q.campos==='id'&&q.limite===1));
});

test('catálogo vazio não recebe fallback estático',async()=>{
  const r=await consultarCatalogoHome(banco([]));
  assert.deepEqual(r.produtos,[]);assert.deepEqual(r.categorias,[]);
  assert.equal(r.erroProdutos,false);assert.equal(r.erroCategorias,false);
});

test('falhas de consultas ficam explícitas sem inventar produtos ou categorias',async()=>{
  const r=await consultarCatalogoHome(banco([],{falhaProdutos:true,falhaCategorias:true}));
  assert.deepEqual(r.produtos,[]);assert.deepEqual(r.categorias,[]);
  assert.equal(r.erroProdutos,true);assert.equal(r.erroCategorias,true);
});
