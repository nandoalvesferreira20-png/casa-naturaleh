import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function carregar(path,deps={},ambiente={}){
  const m={exports:{}};
  const code=ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('require','module','exports','window','setTimeout','clearTimeout',code)(n=>deps[n]??require(n),m,m.exports,ambiente.window,ambiente.setTimeout,ambiente.clearTimeout);
  return m.exports;
}
const categorias=carregar('app/lib/categorias-importacao.ts');
const helper=carregar('app/lib/catalogo-loja.ts',{'./categorias-importacao':categorias});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// Executor de hooks sem navegador. Testa efeitos, cleanup e eventos; não substitui QA visual.
function montar(initial='',{reduced=false}={}){
  let url=new URL('https://loja.example/loja'+initial),cursor=0,tree,agenda=[];
  const slots=[],requests=[],timers=new Map(),rotas=[],scroll=[];
  let timerId=0;
  const router={push(href){rotas.push({tipo:'push',href});url=new URL(href,url);},replace(href){rotas.push({tipo:'replace',href});url=new URL(href,url);}};
  const react={
    useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
    useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
    useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>!Object.is(d,old.deps[j]))){agenda.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}},
  };
  const windowMock={get location(){return url;},matchMedia:()=>({matches:reduced})};
  const Card=()=>null;
  const {default:Component}=carregar('app/loja/LojaCatalogo.tsx',{
    react,'next/navigation':{useRouter:()=>router,usePathname:()=>'/loja',useSearchParams:()=>url.searchParams},
    '../components/ProductCard':{default:Card},'../lib/supabase':{supabase:{}},
    '../lib/catalogo-loja':{...helper,consultarCategoriasLoja:async()=>['Chás','Suplementos'],consultarPaginaLoja:(_client,filtros,signal)=>new Promise(resolve=>requests.push({filtros,signal,resolve}))},
  },{window:windowMock,setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)});
  function nodes(node,out=[]){if(Array.isArray(node)){for(const n of node)nodes(n,out);}else if(node&&typeof node==='object'&&node.props){out.push(node);nodes(node.props.children,out);}return out;}
  function render(){cursor=0;tree=Component();for(const n of nodes(tree))if(n.props.ref)n.props.ref.current={scrollIntoView:options=>scroll.push(options)};const atual=agenda;agenda=[];for(const fn of atual)fn();}
  render();
  return {requests,timers,rotas,scroll,Card,nodes:()=>nodes(tree),render,get url(){return url;},async flush(){await tick();render();await tick();},async go(q){url=new URL('/loja'+q,url);render();await tick();},fire(){const tasks=[...timers.values()];timers.clear();for(const t of tasks)t.fn();render();},find(predicate){const node=nodes(tree).find(predicate);assert.ok(node,'Elemento esperado não encontrado');return node;}};
}
const produto=id=>({id,nome:id,slug:id,categoria:'Chás',preco:10,imagem:'real.jpg',estoque:5});

test('reload restaura página 2; resposta antiga abortada não sobrescreve página nova',async()=>{
  const a=montar('?page=2');await a.flush();assert.equal(a.requests[0].filtros.page,2);
  await a.go('?page=3');assert.equal(a.requests[0].signal.aborted,true);assert.equal(a.requests[1].filtros.page,3);
  a.requests[1].resolve({produtos:[produto('novo')],total:30,paginas:3});await a.flush();
  assert.equal(a.find(n=>n.type===a.Card).props.slug,'novo');
  a.requests[0].resolve({produtos:[produto('antigo')],total:30,paginas:3});await a.flush();
  assert.equal(a.find(n=>n.type===a.Card).props.slug,'novo');
});

test('busca tem debounce de 350ms, preserva categoria e reseta página',async()=>{
  const a=montar('?page=4&categoria=Chás');await a.flush();
  a.find(n=>n.props.id==='busca-loja').props.onChange({target:{value:'camo'}});a.render();
  a.find(n=>n.props.id==='busca-loja').props.onChange({target:{value:'camomila'}});a.render();
  assert.equal(a.timers.size,1);assert.equal([...a.timers.values()][0].ms,350);assert.equal(a.requests.length,1);
  a.fire();await a.flush();
  assert.equal(a.url.searchParams.get('page'),'1');assert.equal(a.url.searchParams.get('busca'),'camomila');assert.equal(a.url.searchParams.get('categoria'),'Chás');
  assert.equal(a.requests.at(-1).filtros.busca,'camomila');
});

test('categoria reseta página; voltar restaura filtros e cancela busca pendente',async()=>{
  const a=montar('?page=4&categoria=Chás');await a.flush();
  a.find(n=>n.props.id==='busca-loja').props.onChange({target:{value:'pendente'}});a.render();
  a.find(n=>n.type==='button'&&n.props.children==='Suplementos').props.onClick();a.render();await a.flush();
  assert.equal(a.url.searchParams.get('page'),'1');assert.equal(a.url.searchParams.get('categoria'),'Suplementos');assert.equal(a.timers.size,0);
  await a.go('?page=4&categoria=Chás');assert.equal(a.requests.at(-1).filtros.page,4);assert.equal(a.requests.at(-1).filtros.categoria,'Chás');
});

test('anterior/próxima respeitam extremos; scroll respeita movimento reduzido',async()=>{
  const a=montar('?page=1',{reduced:true});await a.flush();
  a.requests[0].resolve({produtos:[produto('um')],total:30,paginas:3});await a.flush();
  assert.equal(a.find(n=>n.props.children==='← Anterior').props.disabled,true);
  a.find(n=>n.props.children==='Próxima →').props.onClick();a.render();await a.flush();
  assert.equal(a.url.searchParams.get('page'),'2');assert.deepEqual(a.scroll[0],{block:'start',behavior:'auto'});
  await a.go('?page=3');a.requests.at(-1).resolve({produtos:[produto('ultimo')],total:30,paginas:3});await a.flush();
  assert.equal(a.find(n=>n.props.children==='Próxima →').props.disabled,true);
});

test('página obsoleta é corrigida na URL; estado vazio permite limpar filtros',async()=>{
  const a=montar('?page=99&categoria=Chás');await a.flush();a.requests[0].resolve({produtos:[],total:22,paginas:2});await a.flush();
  assert.equal(a.url.searchParams.get('page'),'2');assert.equal(a.rotas.at(-1).tipo,'replace');await a.flush();
  await a.go('?page=1&categoria=Chás&busca=inexistente');a.requests.at(-1).resolve({produtos:[],total:0,paginas:1});await a.flush();
  assert.ok(a.find(n=>n.props.children==='Nenhum produto encontrado.'));
  a.find(n=>n.props.children==='Limpar filtros').props.onClick();a.render();
  assert.equal(a.url.searchParams.get('page'),'1');assert.equal(a.url.searchParams.has('busca'),false);assert.equal(a.url.searchParams.has('categoria'),false);
});
