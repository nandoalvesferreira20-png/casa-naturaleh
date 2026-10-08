import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
function carregar(arquivo, dependencias = {}) {
  const fonte = readFileSync(new URL(`../${arquivo}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const modulo = { exports: {} };
  new Function("require", "module", "exports", outputText)(nome => dependencias[nome] ?? require(nome), modulo, modulo.exports);
  return modulo.exports;
}
const validacao = carregar("app/lib/importacao-produtos.ts");
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
  for (const csv of ["nome,slug\nA,a", cabecalho + '"aberto', cabecalho, cabecalho + Array(201).fill(linha()).join('\n')]) assert.throws(() => validacao.lerCSV(csv));
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
        select: campo => ({ in: async () => {
          eventos.push(`select:${campo}`);
          if (campo === 'slug') return { data: (opcoes.existentes ?? []).map(slug => ({ slug })), error: null };
          return { data: opcoes.confirmado ? inseridos.map(p => ({ id: p.id })) : [], error: opcoes.falhaConfirmacao ? new Error('offline') : null };
        } }),
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
  };
  Object.defineProperty(dependencias, '../../../../lib/supabase-admin', { get() { acessoSupabase++; return { supabaseAdmin }; } });
  const { POST } = carregar('app/api/admin/produtos/importar/route.ts', dependencias);
  async function executar({ csv = cabecalho + linha(), acao = 'importar', arquivos = ['creatina.webp'], invalido = false } = {}) {
    const form = new FormData();
    form.append('csv', new File([csv], 'produtos.csv'));
    form.append('acao', acao);
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
  assert.ok(dados.linhas[0].erros.includes('Produto já existente'));
  assert.deepEqual(app.eventos, ['auth', 'select:slug']);
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
  const { dados } = await app.executar({ csv: cabecalho + linha() + '\n' + linha('whey', 'whey.webp'), arquivos: ['creatina.webp', 'whey.webp'] });
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
