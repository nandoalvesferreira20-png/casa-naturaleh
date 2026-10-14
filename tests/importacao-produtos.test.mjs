import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { EventEmitter } from "node:events";

const require = createRequire(import.meta.url);
function carregar(arquivo, dependencias = {}) {
  const fonte = readFileSync(new URL(`../${arquivo}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const modulo = { exports: {} };
  new Function("require", "module", "exports", outputText)(nome => dependencias[nome] ?? require(nome), modulo, modulo.exports);
  return modulo.exports;
}
const validacao = carregar("app/lib/importacao-produtos.ts");
const categorias = carregar("app/lib/categorias-importacao.ts");
const revisao = carregar("app/lib/revisao-categorias.ts", { './categorias-importacao': categorias });
const planilha = carregar("app/lib/planilha-produtos.ts", { './importacao-produtos': validacao, './categorias-importacao': categorias });
const imagensRemotas = carregar("app/lib/imagem-importacao.ts", { './importacao-produtos': validacao });
const cabecalho = "nome,slug,categoria,preco,descricao,estoque,ativo,imagem\n";
const linha = (slug = "creatina", imagem = "creatina.webp") => `Creatina,${slug},Suplementos,89.90,Descrição,15,true,${imagem}`;
const imagem = { name: "creatina.webp", type: "image/webp", size: 24 };

test("CSV aceita BOM, CRLF, aspas escapadas, vírgulas e descrição multilinha", () => {
  const linhas = validacao.lerCSV('\uFEFF' + cabecalho.replace('\n', '\r\n') + '"Produto, especial",especial,Suplementos,10.50,"Texto ""citado""\r\nem duas linhas",0,não,creatina.webp\r\n' + linha());
  assert.equal(linhas[0].produto.nome, "Produto, especial");
  assert.equal(linhas[0].produto.descricao, 'Texto "citado"\nem duas linhas');
  assert.equal(linhas[1].linha, 4);
  assert.deepEqual(validacao.validarLinhas(linhas, [imagem], new Set()).map(l => l.erros), [[], []]);
});
test("CSV rejeita cabeçalho inválido, aspas abertas, vazio e excesso de linhas", () => {
  for (const csv of ["nome,slug\nA,a", cabecalho + '"aberto', cabecalho, cabecalho + Array(1001).fill(linha()).join('\n')]) assert.throws(() => validacao.lerCSV(csv));
});
test("valida obrigatórios, preço, estoque, ativo, duplicidade e imagens", () => {
  const linhas = validacao.lerCSV(cabecalho + ',duplicado,,NaN,,1.5,talvez,ausente.png\n' + linha('duplicado'));
  const resultado = validacao.validarLinhas(linhas, [imagem], new Set(['duplicado']));
  for (const esperado of ['nome', 'categoria', 'Preço inválido', 'Estoque inválido', 'Ativo inválido', 'Slug duplicado', 'Produto já existente', 'Imagem não encontrada']) assert.ok(resultado[0].erros.some(erro => erro.includes(esperado)), esperado);
  assert.ok(resultado[1].erros.includes('Slug duplicado no CSV'));
});
test("aceita todas as representações de ativo e rejeita números fora das regras", () => {
  for (const valor of ['true','1','sim']) assert.equal(validacao.valorAtivo(valor), true);
  for (const valor of ['false','0','nao','não']) assert.equal(validacao.valorAtivo(valor), false);
  for (const preco of ['0','-1','Infinity','0x10','1e3','89,90']) {
    const dados = validacao.lerCSV(cabecalho + linha()); dados[0].produto.preco = preco;
    assert.ok(validacao.validarLinhas(dados, [imagem], new Set())[0].erros.some(e => e.startsWith('Preço inválido')));
  }
  for (const estoque of ['', '-1', '1.5', '2147483648']) {
    const dados = validacao.lerCSV(cabecalho + linha()); dados[0].produto.estoque = estoque;
    assert.ok(validacao.validarLinhas(dados, [imagem], new Set())[0].erros.some(e => e.startsWith('Estoque inválido')));
  }
});
test("valida tamanho, extensão, MIME e nomes duplicados de imagens", () => {
  assert.ok(validacao.erroImagem({ ...imagem, size: 5 * 1024 * 1024 + 1 }));
  assert.ok(validacao.erroImagem({ ...imagem, type: 'image/svg+xml' }));
  assert.ok(validacao.erroImagem({ ...imagem, name: 'imagem.svg' }));
  const resultado = validacao.validarLinhas(validacao.lerCSV(cabecalho + linha()), [imagem, imagem], new Set());
  assert.ok(resultado[0].erros.some(e => e.includes('mesmo nome')));
});

function ambiente(opcoes = {}) {
  const eventos = [], inseridos = [], removidos = [];
  let acessoSupabase = 0;
  const storage = {
    upload: async (caminho) => { eventos.push('upload'); return { error: opcoes.falhaUpload ? new Error('upload') : null, data: { path: caminho } }; },
    getPublicUrl: caminho => ({ data: { publicUrl: `https://storage.test/produtos/${caminho}` } }),
    remove: async caminhos => { eventos.push('remove'); removidos.push(...caminhos); return { error: opcoes.falhaLimpeza ? new Error('remove') : null }; },
  };
  const supabaseAdmin = {
    storage: { from: bucket => { assert.equal(bucket, 'produtos'); return storage; } },
    from: tabela => {
      assert.equal(tabela, 'products');
      return {
        select: campo => {
          const consulta = { order: () => consulta, range: async () => {
            eventos.push('select:nome,slug');
            return { data: (opcoes.existentes ?? []).map(slug => ({ slug, nome: slug })), error: opcoes.semUnidade && campo.includes('unidade') ? new Error('column unidade does not exist') : null };
          }, in: async () => {
          eventos.push(`select:${campo}`);
          if (campo === 'slug') return { data: (opcoes.existentes ?? []).map(slug => ({ slug })), error: null };
          return { data: opcoes.confirmado ? inseridos.map(p => ({ id: p.id })) : [], error: opcoes.falhaConfirmacao ? new Error('offline') : null };
        } }; return consulta; },
        insert: async produtos => { eventos.push('insert'); inseridos.push(...produtos); return { error: opcoes.falhaInsert ? new Error('insert') : null }; },
      };
    },
  };
  const dependencias = {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '../../../../lib/firebase-admin': { verificarAdmin: async token => {
      eventos.push('auth'); if (opcoes.negado || token !== 'Bearer admin') throw new Error('denied');
    } },
    '../../../../lib/importacao-produtos': validacao,
    '../../../../lib/planilha-produtos': planilha,
    '../../../../lib/revisao-categorias': revisao,
    '../../../../lib/imagem-importacao': { ...imagensRemotas, baixarImagem: async () => { eventos.push('download'); if (opcoes.falhaDownload) throw new Error('404'); return imagensRemotas.validarConteudo(Buffer.from('RIFF0000WEBP000000000000')); } },
  };
  Object.defineProperty(dependencias, '../../../../lib/supabase-admin', { get() { acessoSupabase++; return { supabaseAdmin }; } });
  const { POST } = carregar('app/api/admin/produtos/importar/route.ts', dependencias);
  async function executar({ csv = cabecalho + linha(), acao = 'importar', arquivos = ['creatina.webp'], invalido = false, categorias = [] } = {}) {
    const form = new FormData();
    form.append('csv', new File([csv], 'produtos.csv'));
    form.append('acao', acao);
    form.append('categorias', JSON.stringify(categorias));
    form.append('manifesto', JSON.stringify(arquivos.map(name => ({ ...imagem, name }))));
    for (const nome of arquivos) form.append('imagens', new File([invalido ? 'invalido' : 'RIFF0000WEBP000000000000'], nome, { type: 'image/webp' }));
    const resposta = await POST(new Request('http://localhost/api/admin/produtos/importar', { method: 'POST', headers: { Authorization: 'Bearer admin' }, body: form }));
    return { status: resposta.status, dados: await resposta.json() };
  }
  return { executar, eventos, inseridos, removidos, acesso: () => acessoSupabase };
}
test("API rejeita acesso não admin antes de usar Supabase", async () => {
  const app = ambiente({ negado: true });
  assert.equal((await app.executar()).status, 403);
  assert.equal(app.acesso(), 0);
  assert.deepEqual(app.eventos, ['auth']);
});
test("prévia consulta slugs sem upload ou insert", async () => {
  const app = ambiente({ existentes: ['creatina'] });
  const { dados } = await app.executar({ acao: 'validar' });
  assert.ok(dados.linhas[0].erros.includes('Possível produto já existente'));
  assert.deepEqual(app.eventos, ['auth', 'select:nome,slug']);
});
test("importa somente válidos, gera UUID e mantém criado_em no default", async () => {
  const app = ambiente();
  const { dados } = await app.executar({ csv: cabecalho + linha() + '\n' + linha('sem-imagem', 'ausente.webp') });
  assert.equal(dados.importados, 1); assert.equal(dados.ignorados, 1); assert.equal(dados.erros, 0);
  assert.match(app.inseridos[0].id, /^[\da-f-]{36}$/);
  assert.equal(app.inseridos[0].preco, 89.9);
  assert.equal(app.inseridos[0].ativo, true);
  assert.equal('criado_em' in app.inseridos[0], false);
  assert.match(app.inseridos[0].imagem, /produtos\/catalogo\//);
  assert.equal(app.removidos.length, 0);
});
test("revalida produto já existente na confirmação sem fazer upload", async () => {
  const app = ambiente({ existentes: ['creatina'] });
  const { dados } = await app.executar();
  assert.equal(dados.ignorados, 1); assert.equal(app.inseridos.length, 0);
  assert.equal(app.eventos.includes('upload'), false);
});
test("falha de upload ou conteúdo inválido não cadastra URL inválida", async () => {
  for (const opcoes of [{ falhaUpload: true }, {}]) {
    const app = ambiente(opcoes);
    const { dados } = await app.executar({ invalido: !opcoes.falhaUpload });
    assert.equal(dados.erros, 1); assert.equal(app.inseridos.length, 0);
  }
});
test("falha do insert remove todas as imagens recém enviadas", async () => {
  const app = ambiente({ falhaInsert: true });
  const { dados } = await app.executar({ csv: cabecalho + linha() + '\n' + linha('whey', 'whey.webp').replace('Creatina,', 'Whey,'), arquivos: ['creatina.webp', 'whey.webp'] });
  assert.equal(dados.importados, 0); assert.equal(dados.erros, 2); assert.equal(app.removidos.length, 2);
});
test("resposta perdida de insert confirmado preserva imagens cadastradas", async () => {
  const app = ambiente({ falhaInsert: true, confirmado: true });
  const { dados } = await app.executar();
  assert.equal(dados.importados, 1); assert.equal(dados.erros, 0); assert.equal(app.removidos.length, 0);
});
test("falha de confirmação ou limpeza é apresentada, sem ocultar pendências", async () => {
  const app = ambiente({ falhaInsert: true, falhaConfirmacao: true });
  const { dados } = await app.executar();
  assert.equal(dados.avisos.length, 1); assert.equal(app.removidos.length, 0);
  const limpeza = ambiente({ falhaInsert: true, falhaLimpeza: true });
  const resposta = await limpeza.executar();
  assert.equal(resposta.dados.avisos.length, 1); assert.equal(limpeza.removidos.length, 3);
});

const XLSX = require('xlsx');
test('planilha real XLS identifica cabe?alho e mapeamento sem alterar original', () => {
  const buffer = readFileSync(new URL('../produtos_2026-10-08-1.xls', import.meta.url));
  const resultado = planilha.analisarPlanilha(buffer);
  assert.equal(resultado.linhas.length, 656);
  assert.equal(resultado.relatorio.mapeamento.nome, 'Produto');
  assert.equal(resultado.relatorio.mapeamento.preco, 'Preço');
  assert.equal(resultado.relatorio.mapeamento.estoque, 'Estoque');
  assert.equal(resultado.relatorio.mapeamento.imagem, 'URL imagem 1');
  assert.equal(resultado.linhas[0].produto.preco, '14.9');
  assert.equal(resultado.linhas[0].produto.estoque, '2.106');
  assert.equal(resultado.linhas[0].unidade, 'KG');
});
test('XLS e XLSX, pre?mbulo, categoria padrão e status', () => {
  for (const bookType of ['xls', 'xlsx']) {
    const w = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(w, XLSX.utils.aoa_to_sheet([['Exporta??o'],['Produto','Preço','Situação'],['CHÁ VERDE + HIBISCO 100G','R$ 1.249,90','Inativo']]), 'Produtos');
    const r = planilha.analisarPlanilha(XLSX.write(w, {type:'buffer',bookType}), 'Chás');
    assert.equal(r.relatorio.linhaCabecalho, 2);
    assert.equal(r.linhas[0].produto.slug, 'cha-verde-hibisco-100g');
    assert.equal(r.linhas[0].produto.preco, '1249.9');
    assert.equal(validacao.valorAtivo(r.linhas[0].produto.ativo), false);
    assert.equal(planilha.validarProdutos(r.linhas, [], [])[0].erros.length, 0);
  }
});
test('pre?os brasileiros e internacionais n?o perdem casas decimais', () => {
  for (const [s,n] of [['1,49',1.49],['14,90',14.9],['129.90',129.9],['R$ 14,90',14.9],['1.249,90',1249.9],['1249.90',1249.9]]) assert.equal(planilha.parsePreco(s),n);
  for (const s of ['NaN','-1','1e3','0x10','texto','1.2.3']) assert.equal(planilha.parsePreco(s),undefined);
});
test('CSV brasileiro usa separador ponto e v?rgula e gera slug', () => {
 const r = planilha.analisarPlanilha(Buffer.from('Produto;Preço;Estoque;Categoria\nChá;14,90;15;Chás'));
 assert.equal(r.linhas[0].produto.preco, '14.9');
 assert.equal(r.linhas[0].produto.slug, 'cha');
});
test('colis?es distintas recebem sufixo, nomes repetidos s?o ignorados', () => {
 const r = planilha.analisarPlanilha(Buffer.from('nome,preco,categoria\nChá verde,14.90,Chás\nCha-verde,10,Chás\nCHÁ VERDE,10,Chás'));
 const v = planilha.validarProdutos(r.linhas, [], []);
 assert.equal(v[1].produto.slug, 'cha-verde-2');
 assert.ok(v[2].erros.some(e => e.includes('duplicado')));
 assert.equal(planilha.validarProdutos(r.linhas, [], [{nome:'CHÁ VERDE',slug:'outro'}])[0].existente,true);
});
test('bloqueia IPs privados, metadata, loopback e IPv6 mapeado', () => {
 for (const ip of ['127.0.0.1','0.0.0.0','10.1.1.1','172.16.0.1','192.168.1.1','169.254.169.254','::1','::ffff:127.0.0.1','fc00::1','fe80::1']) assert.equal(imagensRemotas.enderecoPublico(ip),false,ip);
 assert.equal(imagensRemotas.enderecoPublico('8.8.8.8'),true);
});
test('rejeita conte?do falso, MIME divergente e imagem acima do limite', () => {
 assert.throws(() => imagensRemotas.validarConteudo(Buffer.from('texto'),'image/png'));
 assert.throws(() => imagensRemotas.validarConteudo(Buffer.from('RIFF0000WEBP'),'image/png'));
 const grande = Buffer.alloc(validacao.LIMITE_IMAGEM+1); grande.write('RIFF'); grande.write('WEBP',8);
 assert.throws(() => imagensRemotas.validarConteudo(grande));
});
test('download remoto reutiliza URL, grava URL pr?pria e n?o persiste SKU', async () => {
 const app=ambiente(); const csv=cabecalho+linha('creatina','https://erp.test/a.webp')+'\nWhey,whey,Suplementos,10,,0,true,https://erp.test/a.webp';
 const {dados}=await app.executar({csv,arquivos:[]});
 assert.equal(dados.importados,2);assert.equal(app.eventos.filter(e=>e==='download').length,1);assert.equal(app.eventos.filter(e=>e==='upload').length,1);
 assert.ok(app.inseridos.every(p=>p.imagem.startsWith('https://storage.test/')));assert.equal('sku' in app.inseridos[0],false);
});
test('URL quebrada n?o insere produto nem URL externa', async () => {
 const app=ambiente({falhaDownload:true});const {dados}=await app.executar({csv:cabecalho+linha('creatina','https://erp.test/a.webp'),arquivos:[]});
 assert.equal(dados.erros,1);assert.equal(app.inseridos.length,0);assert.match(dados.detalhes[0].mensagem,/Falha ao importar imagem/);
});
test('concorr?ncia de download limitada a quatro', async () => {
 let ativas=0,maximo=0;
 await imagensRemotas.concorrenciaLimitada(Array.from({length:20}),async()=>{maximo=Math.max(maximo,++ativas);await new Promise(r=>setTimeout(r,5));ativas--;});
 assert.equal(maximo,4);
});

test('download valida HTTP, MIME, tamanho, redirect e fixa DNS público', async () => {
  async function executar(respostas, dns = ['8.8.8.8']) {
    let conexoes = 0;
    const request = (_url, options, receber) => {
      conexoes++;
      options.lookup('erp.test', { all: true }, (erro, enderecos) => {
        assert.equal(erro, null); assert.equal(enderecos[0].address, '8.8.8.8');
      });
      const req = new EventEmitter();
      req.destroy = e => { req.emit('error', e); req.emit('close'); };
      req.end = () => queueMicrotask(() => {
        const resposta = respostas.shift();
        const res = new EventEmitter();
        Object.assign(res, { statusCode: resposta.status ?? 200, headers: resposta.headers ?? { 'content-type': 'image/webp' }, resume() {}, destroy(e) { if (e) queueMicrotask(() => res.emit('error', e)); req.emit('close'); } });
        receber(res);
        if (!resposta.headers?.location) { res.emit('data', resposta.buffer ?? Buffer.from('RIFF0000WEBP0000')); res.emit('end'); }
        req.emit('close');
      });
      return req;
    };
    const lib = carregar('app/lib/imagem-importacao.ts', {
      './importacao-produtos': validacao,
      'node:dns/promises': { lookup: async () => dns.map(address => ({address,family:4})) },
      'node:http': { request }, 'node:https': { request },
    });
    return { promise: lib.baixarImagem('https://erp.test/a.webp'), conexoes: () => conexoes };
  }
  assert.equal((await (await executar([{}])).promise).tipo, 'image/webp');
  for (const resposta of [{status:404}, {headers:{'content-type':'text/html'}}, {headers:{'content-type':'image/webp','content-length':String(validacao.LIMITE_IMAGEM+1)}}, {buffer:Buffer.alloc(validacao.LIMITE_IMAGEM+1)}]) {
    await assert.rejects((await executar([resposta])).promise);
  }
  const privado = await executar([{}], ['10.0.0.1']); await assert.rejects(privado.promise); assert.equal(privado.conexoes(),0);
  await assert.rejects((await executar([{status:302,headers:{location:'file:///secret'}}])).promise);
  assert.equal((await (await executar([{status:302,headers:{location:'/final.webp'}}, {}])).promise).tipo,'image/webp');
});

test('planilha real preserva erros de estoque, URL e categoria ausente', () => {
  const r = planilha.analisarPlanilha(readFileSync(new URL('../produtos_2026-10-08-1.xls', import.meta.url)));
  const v = planilha.validarProdutos(r.linhas, [], []);
  assert.equal(r.relatorio.urls,655);
  assert.equal(v.filter(l => !l.erros.length).length,641);
  assert.equal(v.filter(l => l.erros.some(e => e.startsWith('Estoque inválido'))).length,13);
});

test('peso converte exatamente para gramas e aceita os dois separadores decimais', () => {
  for (const [valor, esperado] of [['1',1000],['1.5',1500],['1,5',1500],['13.43',13430],['13,43',13430],['2.5',2500],['2,5',2500],['0.75',750],['0,75',750],['0.750',750],['0,750',750],['0.250',250],['0,250',250],['10.000',10000],['2.106',2106],['5.04',5040]]) {
    assert.equal(validacao.parsePeso(valor), esperado, valor);
  }
  for (const valor of ['texto','-1','','0.0001','2147483.648','1.234,56','10.000 kg']) assert.equal(validacao.parsePeso(valor), undefined, valor);
  for (const valor of ['1','5','10']) assert.equal(validacao.parseEstoqueUnitario(valor), Number(valor));
  for (const valor of ['texto','-1','','1.5','1,5','2147483648']) assert.equal(validacao.parseEstoqueUnitario(valor), undefined);
  for (const unidade of ['UN','UND','unidade','UNIDADES']) assert.equal(validacao.interpretarEstoque('13',unidade).estoqueInterno,13);
  assert.equal(validacao.interpretarEstoque('1','CX').erro,'Unidade não reconhecida');
  assert.equal(validacao.interpretarEstoque('1','').erro,'Unidade não reconhecida');
  assert.equal(validacao.formatarEstoqueImportacao('13.43','KG'),'13,43 kg');
  assert.equal(validacao.formatarEstoqueImportacao('13','UN'),'13 unidades');
});

test('validação é idempotente, mantém estoque original e preço, e grava unidade junto aos gramas', async () => {
  const r = planilha.analisarPlanilha(Buffer.from('Produto;Preço;Estoque;Unidade;Categoria\nPeso;79,90;13,43;KG;Naturais'));
  const v = planilha.validarProdutos(r.linhas, [], []);
  assert.equal(v[0].estoqueInterno,13430);
  assert.equal(v[0].produto.estoque,'13,43');
  assert.equal(v[0].produto.preco,'79.9');
  assert.equal(planilha.validarProdutos(v,[],[])[0].estoqueInterno,13430);
  const app = ambiente();
  const { dados } = await app.executar({csv: cabecalho.trimEnd()+',unidade\n'+linha().replace(',15,true,',',13.43,true,')+',KG'});
  assert.equal(dados.importados,1);
  assert.equal(app.inseridos[0].estoque,13430);
  assert.equal(app.inseridos[0].unidade,'KG');
});

test('estoque obrigatório vazio não vira zero; coluna ausente mantém compatibilidade', () => {
  const r = planilha.analisarPlanilha(Buffer.from('Produto;Preço;Estoque;Unidade;Categoria\nPeso;10;;KG;Naturais'));
  assert.ok(planilha.validarProdutos(r.linhas,[],[])[0].erros.some(e=>e.startsWith('Estoque inválido')));
});

test('schema sem unidade bloqueia importação antes de upload e permite preview', async () => {
  const app = ambiente({semUnidade:true});
  assert.equal((await app.executar({acao:'validar'})).status,200);
  const resposta = await app.executar();
  assert.equal(resposta.status,400);
  assert.match(resposta.dados.error,/products.unidade/);
  assert.equal(app.inseridos.length,0);
  assert.ok(!app.eventos.includes('upload'));
  assert.ok(!app.eventos.includes('download'));
});

test('planilha real recupera somente decimais KG e preserva os demais erros', () => {
  const r = planilha.analisarPlanilha(readFileSync(new URL('../produtos_2026-10-08-1.xls',import.meta.url)));
  const v = planilha.validarProdutos(revisao.classificarLinhas(r.linhas),[],[]);
  assert.equal(v.filter(l=>!l.erros.length).length,605);
  assert.equal(v.filter(l=>l.erros.length).length,51);
  assert.equal(v.filter(l=>l.unidade==='KG').length,289);
  assert.equal(v.filter(l=>l.unidade==='UN').length,367);
  const decimais = v.filter(l=>/^\d+[.,]\d+$/.test(l.produto.estoque));
  assert.equal(decimais.length,278);
  assert.ok(decimais.every(l=>l.unidadeNormalizada==='KG' && l.estoqueInterno!==undefined));
  assert.equal(decimais.filter(l=>!l.erros.length).length,274);
});

test('API grava categoria final corrigida e mantém sugestão apenas no preview', async () => {
  const app = ambiente();
  const preview = await app.executar({acao:'validar', categorias:[{linha:2,categoria:'Snacks'}]});
  assert.equal(preview.dados.linhas[0].produto.categoria,'Snacks');
  assert.equal(preview.dados.linhas[0].classificacao.categoria,'Suplementos');
  const resultado = await app.executar({categorias:[{linha:2,categoria:'Snacks'}]});
  assert.equal(resultado.dados.importados,1); assert.equal(app.inseridos[0].categoria,'Snacks');
  assert.equal('classificacao' in app.inseridos[0],false);
});
test('API não grava categoria não oficial nem produto incerto sem revisão', async () => {
  const forjada = ambiente();
  assert.equal((await forjada.executar({categorias:[{linha:2,categoria:'Outros'}]})).status,400);
  assert.equal(forjada.inseridos.length,0);
  const incerta=ambiente();
  const csv=cabecalho+linha().replace('Creatina,','Produto desconhecido,').replace('Suplementos,','GRANEL,');
  const r=await incerta.executar({csv}); assert.equal(r.dados.importados,0);assert.equal(r.dados.ignorados,1);
  const corrigida=await incerta.executar({csv,categorias:[{linha:2,categoria:'Mercearia'}]});
  assert.equal(corrigida.dados.importados,1);assert.equal(incerta.inseridos[0].categoria,'Mercearia');
});
