import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import {createClient} from '@supabase/supabase-js';
function carregar(path,deps={}) {
  const m={exports:{}};
  const code=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports',code)(n=>deps[n],m,m.exports);
  return m.exports;
}
const categorias=carregar('app/lib/categorias-importacao.ts');
const loja=carregar('app/lib/catalogo-loja.ts',{'./categorias-importacao':categorias});
const filtros=(s='')=>loja.lerFiltrosLoja(new URLSearchParams(s));
const produtos=Array.from({length:30},(_,i)=>({id:String(i).padStart(3,'0'),nome:i===0?'Camomila Especial':`Produto ${i}`,slug:i===0?'camomila-especial':`produto-${i}`,categoria:i<22?'Chás':'Suplementos',descricao:i===0?'Infusão suave':'Seleção',preco:30-i,ativo:true,estoque:i===0?0:5,criado_em:new Date(2026,0,i+1).toISOString(),imagem:'real.jpg'}));
produtos.push({...produtos[0],id:'inativo',ativo:false,preco:0,criado_em:'2027-01-01'});
function regexLike(pattern){
  let text='';
  for(let i=0;i<pattern.length;i++){
    const c=pattern[i];
    if(c==='\\'&&i+1<pattern.length) text+=pattern[++i].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    else if(c==='%')text+='.*'; else if(c==='_')text+='.'; else text+=c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }
  return new RegExp('^'+text+'$','i');
}
function ambiente() {
  const requests=[];
  const client=createClient('https://catalogo.example','anon-test',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,options={})=>{
    const url=new URL(String(input));requests.push({url,options});
    const q=url.searchParams;
    let rows=produtos.filter(p=>q.get('ativo')!=='eq.true'||p.ativo);
    if(q.has('categoria'))rows=rows.filter(p=>p.categoria===q.get('categoria').slice(3));
    if(q.has('or')){
      const condicoes=[...q.get('or').matchAll(/(nome|categoria|descricao|slug)\.ilike\.("(?:\\.|[^"\\])*")/g)].map(m=>({campo:m[1],regex:regexLike(JSON.parse(m[2]))}));
      assert.equal(condicoes.length,4);
      rows=rows.filter(p=>condicoes.some(c=>c.regex.test(p[c.campo]??'')));
    }
    const order=(q.get('order')??'').split(',').filter(Boolean);
    rows=[...rows].sort((a,b)=>{for(const item of order){const [campo,direcao]=item.split('.'); const cmp=a[campo]>b[campo]?1:a[campo]<b[campo]?-1:0;if(cmp)return direcao==='desc'?-cmp:cmp;}return 0;});
    const count=rows.length, offset=Number(q.get('offset')??0), limit=Number(q.get('limit')??rows.length);
    if(offset>0&&offset>=count)return new Response(JSON.stringify({code:'PGRST103',message:'Range not satisfiable'}),{status:416,headers:{'content-type':'application/json'}});
    const data=rows.slice(offset,offset+limit);
    return new Response(options.method==='HEAD'?null:JSON.stringify(data),{status:200,headers:{'content-type':'application/json','content-range':`${offset}-${offset+data.length-1}/${count}`}});
  }}});
  return {client,requests};
}

test('range consulta 12 por página, count global e páginas sem sobreposição',async()=>{
  const a=ambiente(), primeira=await loja.consultarPaginaLoja(a.client,filtros()), segunda=await loja.consultarPaginaLoja(a.client,filtros('page=2'));
  assert.equal(loja.PAGE_SIZE,12);assert.equal(primeira.produtos.length,12);assert.equal(primeira.total,30);assert.equal(primeira.paginas,3);
  assert.equal(segunda.produtos.length,12);assert.equal(segunda.produtos[0].id,'017');
  assert.ok(!primeira.produtos.some(p=>segunda.produtos.some(s=>s.id===p.id)));
  assert.equal(a.requests[1].url.searchParams.get('offset'),'12');assert.equal(a.requests[1].url.searchParams.get('limit'),'12');
  assert.match(a.requests[1].options.headers.get('Prefer'),/count=exact/);
  const ultima=await loja.consultarPaginaLoja(a.client,filtros('page=3'));assert.equal(ultima.produtos.length,6);
  assert.ok(![...primeira.produtos,...segunda.produtos,...ultima.produtos].some(p=>p.id==='inativo'));
  assert.ok(ultima.produtos.some(p=>p.estoque===0));
});

test('busca alcança produto fora da página atual e combina com categoria antes do range',async()=>{
  const a=ambiente();const r=await loja.consultarPaginaLoja(a.client,filtros('busca=Camomila&categoria=Chás&page=1'));
  assert.equal(r.total,1);assert.equal(r.produtos[0].id,'000');
  const vazio=await loja.consultarPaginaLoja(a.client,filtros('busca=Camomila&categoria=Suplementos'));
  assert.equal(vazio.total,0);assert.deepEqual(vazio.produtos,[]);
  const categoria=await loja.consultarPaginaLoja(a.client,filtros('categoria=Chás&page=2'));
  assert.equal(categoria.total,22);assert.equal(categoria.produtos.length,10);
  for(const busca of ['Infusão','camomila-especial','Suplementos'])assert.ok((await loja.consultarPaginaLoja(a.client,{...filtros(),busca})).total>0);
});

test('ordenação é global e estável, anterior/próxima são páginas consecutivas',async()=>{
  const a=ambiente();
  const menor=await loja.consultarPaginaLoja(a.client,filtros('ordenacao=menor-preco'));assert.equal(menor.produtos[0].preco,1);
  const maior=await loja.consultarPaginaLoja(a.client,filtros('ordenacao=maior-preco'));assert.equal(maior.produtos[0].preco,30);
  assert.match(a.requests[0].url.searchParams.get('order'),/^preco.asc,id.asc$/);
  const pagina2=await loja.consultarPaginaLoja(a.client,filtros('page=2&ordenacao=maior-preco'));assert.equal(pagina2.produtos[0].preco,18);
});

test('URL restaura página, categoria, busca e ordenação; filtros resetam para 1',()=>{
  const url=new URLSearchParams('page=4&categoria=Chás&busca=Camomila&ordenacao=menor-preco&utm=origem');
  assert.deepEqual(loja.lerFiltrosLoja(url),{page:4,categoria:'Chás',busca:'Camomila',ordenacao:'menor-preco'});
  for(const change of [{categoria:'Suplementos'},{busca:'aveia'},{ordenacao:'maior-preco'}]){
    const next=loja.atualizarParametrosLoja(url,change);assert.equal(next.get('page'),'1');assert.equal(next.get('utm'),'origem');
  }
  const next=loja.atualizarParametrosLoja(url,{page:5});assert.equal(next.get('page'),'5');assert.equal(next.get('categoria'),'Chás');
  const limpo=loja.atualizarParametrosLoja(url,{busca:'',categoria:'todas'});assert.equal(limpo.get('page'),'1');assert.ok(!limpo.has('busca')&&!limpo.has('categoria'));
  for(const p of ['0','-1','1.5','texto','1e2','9007199254740991'])assert.equal(filtros('page='+p).page,1);
});

test('sidebar consulta só IDs ativos de categorias oficiais e não baixa catálogo',async()=>{
  const a=ambiente(), r=await loja.consultarCategoriasLoja(a.client);
  assert.deepEqual(r,['Chás','Suplementos']);
  assert.ok(a.requests.every(({url})=>url.searchParams.get('select')==='id'&&url.searchParams.get('limit')==='1'));
});

test('janela de paginação mantém extremos e é compacta',()=>{
  assert.deepEqual(loja.janelaPaginas(9,30),[1,'…',8,9,10,'…',30]);
  assert.deepEqual(loja.janelaPaginas(1,1),[1]);
  assert.deepEqual(loja.janelaPaginas(30,30),[1,'…',26,27,28,29,30]);
});

test('buscas com pontuação e curingas não injetam filtros PostgREST',async()=>{
  const a=ambiente();
  for(const busca of ['camomila,ativo.eq.false','camomila)"','%','_']){
    const r=await loja.consultarPaginaLoja(a.client,{...filtros(),busca});assert.equal(r.total,0);
  }
});

test('página antiga fora do catálogo recupera count via HEAD sem baixar catálogo inteiro',async()=>{
  const a=ambiente(),r=await loja.consultarPaginaLoja(a.client,filtros('page=99&categoria=Chás'));
  assert.equal(r.total,22);assert.equal(r.paginas,2);assert.deepEqual(r.produtos,[]);
  assert.equal(a.requests[1].options.method,'HEAD');assert.equal(a.requests[1].url.searchParams.get('categoria'),'eq.Chás');
  assert.equal(a.requests[1].url.searchParams.has('offset'),false);
});
