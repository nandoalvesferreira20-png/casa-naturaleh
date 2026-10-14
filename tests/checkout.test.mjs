import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";

const nodeRequire = createRequire(import.meta.url);
const deliveryTypes = { exports: {} };
new Function("require", "module", "exports", compilar(readFileSync(new URL("../app/lib/delivery/types.ts", import.meta.url), "utf8")))(nodeRequire, deliveryTypes, deliveryTypes.exports);
const pixConfig = { PIX_KEY: "123e4567-e12b-12d1-a456-426655440000", PIX_RECEIVER_NAME: "Casa Naturaleh", PIX_RECEIVER_CITY: "Sao Paulo" };
function pixModule(config = pixConfig) {
  const modulo = { exports: {} };
  new Function("require", "module", "exports", "process", compilar(readFileSync(new URL("../app/lib/pix/pix.ts", import.meta.url), "utf8")))(nodeRequire, modulo, modulo.exports, { env: config });
  return modulo.exports;
}

const id = "e1b4a818-f501-4918-9c48-2b4339e7db42";
const produto = { id, nome: "Produto real", slug: "produto-real", preco: 19.99, imagem: "/real.jpg", estoque: 10, ativo: true };
const body = () => ({
  cliente: { nome: "Cliente teste", email: "teste@example.com", telefone: "11999999999" },
  endereco: { cep: "01001-000", rua: "Rua teste", numero: "10", complemento: "", bairro: "Centro", cidade: "São Paulo", estado: "sp" },
  itens: [{ id, quantidade: 2 }], pagamento: "pix", fulfillmentType: "delivery",
});
function compilar(fonte) {
  return ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
}
function api(opcoes = {}) {
  const pedidos = [], eventos = [];
  const mocks = {
    "../../lib/delivery/types": deliveryTypes.exports,
    "../../lib/delivery/service": { validateDelivery: async () => {
      eventos.push("geocoding");
      if (opcoes.deliveryError) throw new deliveryTypes.exports.DeliveryError(opcoes.deliveryError.message, opcoes.deliveryError.status);
      return { type: "delivery", shippingFee: 15, distanceKm: 7.4 };
    } },
    "../../lib/pix/pix": pixModule(opcoes.pixConfig ?? pixConfig),
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
        return { doc: () => ({ id: "pedido-123", set: async pedido => {
          eventos.push("pedido");
          if (opcoes.falhaFirestore) throw new Error("segredo interno");
          pedidos.push(pedido);
        } }) };
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
  assert.deepEqual(app.eventos, ["auth", "catalogo", "geocoding", "pedido"]);
  assert.deepEqual(app.pedidos[0], {
    userId: "uid-verificado", cliente: body().cliente, endereco: { ...body().endereco, estado: "SP" },
    itens: [{ id, nome: produto.nome, slug: produto.slug, preco: 19.99, imagem: produto.imagem, quantidade: 2 }],
    subtotal: 39.98, frete: 15, total: 54.98, fulfillment: { type: "delivery", shippingFee: 15, distanceKm: 7.4 }, pagamento: "pix", status: "aguardando_pagamento", criadoEm: "TIMESTAMP_SERVIDOR",
    payment: { ...pixModule().createManualPixPayment("pedido-123", 54.98), createdAt: "TIMESTAMP_SERVIDOR" },
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
  for (const pagamento of ["dinheiro", "cartao", "boleto", null, {}, ""]) assert.equal((await api().post({ ...body(), pagamento })).status, 400);
  assert.equal((await api().post({ ...body(), pagamento: "pix" })).status, 201);
});

test("Pix usa total recalculado; chave, status e payload recebidos do navegador são ignorados", async () => {
  const app = api(); const entrada = body();
  entrada.total = 0.01; entrada.payment = { provider: "pix_manual", status: "approved", pixCopyPaste: "FORJADO", txid: "FORJADO" }; entrada.PIX_KEY = "FORJADA";
  assert.equal((await app.post(entrada)).status, 201);
  const saved = app.pedidos[0];
  assert.equal(saved.total, 54.98); assert.equal(saved.payment.provider, "pix_manual");
  assert.equal(saved.payment.method, "pix"); assert.equal(saved.payment.status, "pending");
  assert.equal(saved.status, "aguardando_pagamento");
  assert.ok(saved.payment.pixCopyPaste.includes("540554.98"));
  assert.ok(saved.payment.pixCopyPaste.includes(pixConfig.PIX_KEY));
  assert.match(saved.payment.txid, /^[a-zA-Z0-9]{1,25}$/);
  assert.equal(JSON.stringify(saved).includes("FORJAD"), false);
});

test("configuração Pix ausente/inválida retorna 503 sem gravar pedido parcial", async () => {
  for (const config of [{}, { ...pixConfig, PIX_KEY: "inválida" }, { ...pixConfig, PIX_RECEIVER_NAME: "" }]) {
    const app = api({ pixConfig: config }); const response = await app.post();
    assert.equal(response.status, 503); assert.equal(app.pedidos.length, 0);
    assert.equal(JSON.stringify(response).includes("inválida"), false);
  }
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
  assert.equal((await app.post(entrada)).status, 201); assert.equal(app.pedidos[0].total, 15.3);
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

function cliente(response, overrides = {}) {
  const source = readFileSync(new URL("../app/checkout/page.tsx", import.meta.url), "utf8");
  const tree = ts.createSourceFile("checkout.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const pagina = tree.statements.find(no => ts.isFunctionDeclaration(no) && no.name?.text === "CheckoutPage");
  const handler = pagina.body.statements.find(no => ts.isFunctionDeclaration(no) && no.name?.text === "handleFinalizarPedido");
  const eventos = [], chamadas = [], erros = [];
  const contexto = {
    ...body().cliente, ...body().endereco, pagamento: "pix", fulfillmentType: "delivery",
    itens: [{ ...produto, quantidade: 2, preco: 0.01 }],
    user: { getIdToken: async () => "token-client" },
    finalizacaoEmCurso: { current: false },
    setErroFinalizacao: erro => erros.push(erro), setFinalizando: () => {},
    limparCarrinho: () => eventos.push("limpar"), router: { push: url => eventos.push(url) },
    fetch: async (url, options) => { chamadas.push({ url, options }); return response(); },
    console: { error() {} },
    ...overrides,
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

test("pickup sem endereço permite Pix grátis e local sem gerar Pix/configuração externa", async () => {
  for (const pagamento of ["pix", "local"]) {
    const app = api({ pixConfig: pagamento === "local" ? {} : pixConfig });
    const entrada = { ...body(), fulfillmentType: "pickup", pagamento, endereco: undefined, frete: 999 };
    assert.equal((await app.post(entrada)).status, 201);
    const order = app.pedidos[0];
    assert.equal(order.endereco, null);
    assert.deepEqual(order.fulfillment, { type: "pickup", shippingFee: 0 });
    assert.equal(order.total, order.subtotal); assert.equal(order.frete, 0);
    assert.equal(app.eventos.includes("geocoding"), false);
    assert.equal(order.status, "aguardando_pagamento"); assert.equal(order.payment.status, "pending");
    if (pagamento === "local") assert.deepEqual(order.payment, { provider: "manual", method: "local", status: "pending", createdAt: "TIMESTAMP_SERVIDOR" });
    else assert.ok(order.payment.pixCopyPaste.includes("540539.98"));
  }
});
test("delivery subtotal 100 gera total e Pix 115 ignorando frete/coordenadas forjados", async () => {
  for (const frete of [0, 999]) {
    const app = api({ produtos: [{ ...produto, preco: 50 }] });
    assert.equal((await app.post({ ...body(), frete, total: 1, fulfillment: { type: "pickup", distanceKm: 0 }, lat: 0, lng: 0 })).status, 201);
    const order = app.pedidos[0];
    assert.equal(order.subtotal, 100); assert.equal(order.frete, 15); assert.equal(order.total, 115);
    assert.ok(order.payment.pixCopyPaste.includes("5406115.00"));
  }
});
test("delivery sem endereço, CEP/UF inválido, local e tipo inválido são rejeitados", async () => {
  for (const patch of [{ endereco: undefined }, { endereco: { ...body().endereco, cep: "123" } },
    { endereco: { ...body().endereco, estado: "ZZ" } }, { pagamento: "local" },
    { fulfillmentType: undefined }, { fulfillmentType: "forjado" }]) {
    const app = api(); assert.equal((await app.post({ ...body(), ...patch })).status, 400);
    assert.equal(app.pedidos.length, 0); assert.equal(app.eventos.includes("geocoding"), false);
  }
});
test("fora do raio e provedor indisponível não deixam pedido parcial", async () => {
  for (const status of [422, 503]) {
    const app = api({ deliveryError: { status, message: "Entrega não validada" } });
    assert.equal((await app.post()).status, status); assert.equal(app.pedidos.length, 0);
  }
});
test("client pickup local envia escolha e nenhum endereço, sem exigir campos de entrega", async () => {
  const app = cliente(() => Response.json({ success: true, orderId: "retirada" }, { status: 201 }), {
    fulfillmentType: "pickup", pagamento: "local", cep: "", rua: "", numero: "", bairro: "", cidade: "", estado: "",
  });
  await app.executar();
  const enviado = JSON.parse(app.chamadas[0].options.body);
  assert.equal(enviado.fulfillmentType, "pickup"); assert.equal(enviado.pagamento, "local"); assert.equal(enviado.endereco, null);
  assert.equal(enviado.frete, undefined);
});
