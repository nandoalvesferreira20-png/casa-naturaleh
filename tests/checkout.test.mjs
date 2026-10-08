import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const id = "e1b4a818-f501-4918-9c48-2b4339e7db42";
const produto = { id, nome: "Produto real", slug: "produto-real", preco: 19.99, imagem: "/real.jpg", estoque: 10, ativo: true };
const body = () => ({
  cliente: { nome: "Cliente teste", email: "teste@example.com", telefone: "11999999999" },
  endereco: { cep: "01001-000", rua: "Rua teste", numero: "10", complemento: "", bairro: "Centro", cidade: "São Paulo", estado: "sp" },
  itens: [{ id, quantidade: 2 }], pagamento: "pix",
});
function compilar(fonte) {
  return ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
}
function api(opcoes = {}) {
  const pedidos = [], eventos = [];
  const mocks = {
    "../../lib/payments/service": { initialPayment: (provider, method) => ({ provider, method, status: "pending", phase: "ready", operationId: "uuid-servidor" }) },
    "../../lib/payments/provider": { configuredProviderName: () => "mercado_pago" },
    "next/server": { NextResponse: { json: (dados, options) => Response.json(dados, options) } },
    "firebase-admin/firestore": { FieldValue: { serverTimestamp: () => "TIMESTAMP_SERVIDOR" } },
    "../../lib/firebase-admin": {
      adminAuth: { verifyIdToken: async (token, revogado) => {
        eventos.push("auth"); assert.equal(revogado, true);
        if (token !== "valido") throw new Error("token inválido");
        return { uid: "uid-verificado" };
      } },
      adminDb: { collection: nome => {
        assert.equal(nome, "orders");
        return { add: async pedido => {
          eventos.push("pedido");
          if (opcoes.falhaFirestore) throw new Error("segredo interno");
          pedidos.push(pedido); return { id: "pedido-123" };
        } };
      } },
    },
    "../../lib/supabase-admin": { supabaseAdmin: { from: nome => {
      assert.equal(nome, "products");
      return { select: campos => {
        assert.equal(campos, "id,nome,slug,preco,imagem,estoque,ativo");
        return { in: async (campo, ids) => {
          eventos.push("catalogo"); assert.equal(campo, "id"); assert.ok(ids.includes(id));
          return { data: opcoes.produtos ?? [produto], error: opcoes.falhaSupabase ? new Error("segredo interno") : null };
        } };
      } };
    } } },
  };
  const modulo = { exports: {} };
  const codigo = compilar(readFileSync(new URL("../app/api/checkout/route.ts", import.meta.url), "utf8"));
  new Function("require", "module", "exports", "console", codigo)(nome => {
    assert.ok(mocks[nome], `Dependência inesperada: ${nome}`); return mocks[nome];
  }, modulo, modulo.exports, { error() {} });
  return { pedidos, eventos, async post(dados = body(), authorization = "Bearer valido") {
    const resposta = await modulo.exports.POST(new Request("http://localhost/api/checkout", {
      method: "POST", headers: { "content-type": "application/json", ...(authorization ? { authorization } : {}) },
      body: typeof dados === "string" ? dados : JSON.stringify(dados),
    }));
    return { status: resposta.status, dados: await resposta.json() };
  } };
}

test("pedido usa somente identidade verificada e dados reais do catálogo", async () => {
  const app = api(); const entrada = body();
  Object.assign(entrada, { userId: "outro", subtotal: 0.01, frete: -100, total: 0, status: "pagamento_aprovado", criadoEm: "forjado" });
  Object.assign(entrada.itens[0], { preco: 0.01, nome: "forjado", imagem: "forjada", estoque: 9999 });
  entrada.cliente.token = "nao-salvar";
  const resposta = await app.post(entrada);
  assert.equal(resposta.status, 201);
  assert.deepEqual(resposta.dados, { success: true, orderId: "pedido-123" });
  assert.deepEqual(app.eventos, ["auth", "catalogo", "pedido"]);
  assert.deepEqual(app.pedidos[0], {
    userId: "uid-verificado", cliente: body().cliente, endereco: { ...body().endereco, estado: "SP" },
    itens: [{ id, nome: produto.nome, slug: produto.slug, preco: 19.99, imagem: produto.imagem, quantidade: 2 }],
    subtotal: 39.98, frete: 0, total: 39.98, pagamento: "pix", status: "aguardando_pagamento", criadoEm: "TIMESTAMP_SERVIDOR",
    payment: { provider: "mercado_pago", method: "pix", status: "pending", phase: "ready", operationId: "uuid-servidor" },
  });
});
test("sem login, token inválido ou Bearer vazio retorna 401 sem consultar banco", async () => {
  for (const token of [null, "Bearer invalido", "Bearer ", "Basic valido"]) {
    const app = api(); assert.equal((await app.post(body(), token)).status, 401);
    assert.equal(app.eventos.includes("catalogo"), false); assert.equal(app.pedidos.length, 0);
  }
});
test("rejeita JSON malformado, carrinho vazio, quantidade inválida e UUID inválido", async () => {
  const invalidos = ["{quebrado", null, [], {}, { ...body(), itens: [] }, { ...body(), itens: [{ id: "1", quantidade: 1 }] }];
  for (const quantidade of [0, -1, 1.5, "2", null, 1e20]) invalidos.push({ ...body(), itens: [{ id, quantidade }] });
  for (const entrada of invalidos) {
    const app = api(); assert.equal((await app.post(entrada)).status, 400);
    assert.equal(app.eventos.includes("catalogo"), false); assert.equal(app.pedidos.length, 0);
  }
});
test("valida campos obrigatórios e pagamento no servidor", async () => {
  for (const [grupo, campos] of [["cliente", ["nome", "email", "telefone"]], ["endereco", ["cep", "rua", "numero", "bairro", "cidade", "estado"]]]) {
    for (const campo of campos) { const entrada = body(); entrada[grupo][campo] = " "; assert.equal((await api().post(entrada)).status, 400); }
  }
  for (const pagamento of ["dinheiro", null, {}, ""]) assert.equal((await api().post({ ...body(), pagamento })).status, 400);
  for (const pagamento of ["pix", "cartao", "boleto"]) assert.equal((await api().post({ ...body(), pagamento })).status, 201);
});
test("IDs duplicados não permitem contornar estoque, inclusive em caixa alta", async () => {
  const app = api(); const entrada = body(); entrada.itens.push({ id: id.toUpperCase(), quantidade: 9 });
  assert.equal((await app.post(entrada)).status, 400); assert.equal(app.pedidos.length, 0);
});
test("produto inexistente, inativo ou estoque insuficiente não cria pedido", async () => {
  for (const [produtos, status, mensagem] of [[[], 400, "não encontrado"], [[{ ...produto, ativo: false }], 409, "disponível"], [[{ ...produto, estoque: 1 }], 409, "Estoque insuficiente"]]) {
    const app = api({ produtos }); const resposta = await app.post();
    assert.equal(resposta.status, status); assert.ok(resposta.dados.error.includes(mensagem)); assert.equal(app.pedidos.length, 0);
  }
});
test("item inválido rejeita o pedido inteiro, mesmo com outro item válido", async () => {
  const entrada = body(); entrada.itens.push({ id: "12345678-1234-1234-1234-123456789012", quantidade: 1 });
  const app = api(); assert.equal((await app.post(entrada)).status, 400); assert.equal(app.pedidos.length, 0);
});
test("calcula valores em centavos e rejeita preço inválido no catálogo", async () => {
  const app = api({ produtos: [{ ...produto, preco: "0.10" }] });
  const entrada = body(); entrada.itens[0].quantidade = 3;
  assert.equal((await app.post(entrada)).status, 201); assert.equal(app.pedidos[0].total, 0.3);
  for (const preco of [null, -1, 0, "NaN", "Infinity", "0.001"]) {
    const invalido = api({ produtos: [{ ...produto, preco }] });
    assert.equal((await invalido.post()).status, 500); assert.equal(invalido.pedidos.length, 0);
  }
});
test("falhas de infraestrutura retornam 500 sem expor detalhes internos", async () => {
  for (const opcoes of [{ falhaSupabase: true }, { falhaFirestore: true }]) {
    const app = api(opcoes); const resposta = await app.post();
    assert.equal(resposta.status, 500); assert.equal(resposta.dados.error.includes("segredo"), false); assert.equal(app.pedidos.length, 0);
  }
});

function cliente(response) {
  const source = readFileSync(new URL("../app/checkout/page.tsx", import.meta.url), "utf8");
  const tree = ts.createSourceFile("checkout.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const pagina = tree.statements.find(no => ts.isFunctionDeclaration(no) && no.name?.text === "CheckoutPage");
  const handler = pagina.body.statements.find(no => ts.isFunctionDeclaration(no) && no.name?.text === "handleFinalizarPedido");
  const eventos = [], chamadas = [], erros = [];
  const contexto = {
    ...body().cliente, ...body().endereco, pagamento: "pix",
    itens: [{ ...produto, quantidade: 2, preco: 0.01 }],
    user: { getIdToken: async () => "token-client" },
    finalizacaoEmCurso: { current: false },
    setErroFinalizacao: erro => erros.push(erro), setFinalizando: () => {},
    limparCarrinho: () => eventos.push("limpar"), router: { push: url => eventos.push(url) },
    fetch: async (url, options) => { chamadas.push({ url, options }); return response(); },
    console: { error() {} },
  };
  const modulo = { exports: {} };
  new Function(...Object.keys(contexto), "exports", compilar(`export ${handler.getText(tree)}`))(...Object.values(contexto), modulo.exports);
  return { executar: modulo.exports.handleFinalizarPedido, eventos, chamadas, erros };
}
test("client envia apenas dados permitidos e limpa/redireciona somente no sucesso", async () => {
  const app = cliente(() => Response.json({ success: true, orderId: "pedido-123" }, { status: 201 }));
  await app.executar();
  assert.equal(app.chamadas[0].url, "/api/checkout");
  assert.equal(app.chamadas[0].options.headers.Authorization, "Bearer token-client");
  assert.deepEqual(JSON.parse(app.chamadas[0].options.body), { ...body(), endereco: { ...body().endereco, estado: "SP" } });
  assert.deepEqual(app.eventos, ["limpar", "/pedido-confirmado?id=pedido-123"]);
});
test("client preserva carrinho e mostra mensagem de estoque retornada pela API", async () => {
  const app = cliente(() => Response.json({ error: "Estoque insuficiente para Produto real." }, { status: 409 }));
  await app.executar(); assert.deepEqual(app.eventos, []); assert.equal(app.erros.at(-1), "Estoque insuficiente para Produto real.");
});
test("duplo clique simultâneo envia somente uma requisição", async () => {
  const app = cliente(() => Response.json({ success: true, orderId: "pedido-123" }, { status: 201 }));
  await Promise.all([app.executar(), app.executar()]); assert.equal(app.chamadas.length, 1);
});
