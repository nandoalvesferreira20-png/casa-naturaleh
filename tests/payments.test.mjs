import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHmac } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const cache = new Map();
function load(path, mocks = {}, isolated = false) {
  const filename = resolve(root, path);
  if (!isolated && cache.has(filename)) return cache.get(filename);
  const compiled = { exports: {} };
  const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", code)(name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith("node:")) return require(name);
    if (name.startsWith(".")) return load(resolve(dirname(filename), `${name}.ts`));
    throw new Error(`Dependência externa proibida neste teste: ${name}`);
  }, compiled, compiled.exports);
  if (!isolated) cache.set(filename, compiled.exports);
  return compiled.exports;
}
const { PaymentService, initialPayment } = load("app/lib/payments/service.ts");
const { PaymentError } = load("app/lib/payments/types.ts");
const { MercadoPagoProvider, normalizeStatus } = load("app/lib/payments/mercado-pago.ts");
const config = { accessToken: "TEST-fake", publicKey: "TEST-public", webhookSecret: "fake-secret", webhookUrl: "https://example.test/webhook", production: false };
const input = { methodId: "pix", identification: { type: "CPF", number: "12345678909" } };
function fixture(method = "pix") {
  let order = { userId: "owner", total: 129.9, status: "aguardando_pagamento", pagamento: method,
    cliente: { nome: "Teste Cliente", email: "buyer@example.test", telefone: "11999999999" },
    endereco: { cep: "01001000", rua: "Rua Teste", numero: "10", bairro: "Centro", cidade: "São Paulo", estado: "SP" },
    payment: initialPayment("mercado_pago", method) };
  const calls = [], writes = [];
  let state = "pending", overrides = {}, fail = false, beforeCreateResponse;
  const raw = () => ({ id: 123, external_reference: "order-1", metadata: { payment_operation: order.payment.operationId },
    transaction_amount: 129.9, currency_id: "BRL", live_mode: false, status: state, status_detail: "", date_last_updated: "2026-10-07T12:00:00Z",
    payment_method_id: method === "pix" ? "pix" : method === "boleto" ? "bolbradesco" : "visa", payment_type_id: method === "cartao" ? "credit_card" : method,
    point_of_interaction: { transaction_data: { qr_code: "fake-qr", qr_code_base64: "YWJj", ticket_url: "https://example.test/pay" } },
    barcode: { content: "123456789" }, transaction_details: { external_resource_url: "https://example.test/boleto" },
    date_of_expiration: "2026-10-10T12:00:00Z", secret: "must-not-persist", ...overrides });
  const provider = new MercadoPagoProvider(config, async (url, options) => {
    calls.push({ url, options }); if (fail) throw new Error("private network detail");
    if (options.method === "POST") await beforeCreateResponse?.();
    return Response.json(url.includes("/search?") ? { results: [raw()] } : raw());
  });
  const store = { get: async id => id === "order-1" ? structuredClone(order) : null,
    update: async (id, change) => { if (id !== "order-1") throw new PaymentError("Pedido não encontrado.", 404); const patch = change(structuredClone(order)); if (patch) { order = { ...order, ...patch }; writes.push(patch); } } };
  const service = new PaymentService(store, () => provider);
  return { service, provider, calls, writes, get order() { return order; }, raw, setState: value => { state = value; }, override: value => { overrides = value; }, fail: () => { fail = true; }, legacy: () => { delete order.payment; }, beforeResponse: callback => { beforeCreateResponse = callback; } };
}
function notification(signed = true) {
  const signature = createHmac("sha256", config.webhookSecret).update("id:123;request-id:req-1;ts:1791374400;").digest("hex");
  return new Request("https://example.test/webhook?data.id=123&type=payment", { method: "POST", headers: signed ? { "x-signature": `ts=1791374400,v1=${signature}`, "x-request-id": "req-1" } : {}, body: JSON.stringify({ status: "approved", data: { id: "999" } }) });
}
test("sem autenticação, outro usuário ou pedido inexistente não chama provedor", async () => {
  const f = fixture();
  await assert.rejects(f.service.create("order-1", "", input), { status: 401 });
  await assert.rejects(f.service.create("order-1", "intruder", input), { status: 404 });
  await assert.rejects(f.service.create("missing", "owner", input), { status: 404 });
  assert.equal(f.calls.length, 0);
});
test("valor manipulado é ignorado; cobrança usa order.total e associa referência, metadata e UUID", async () => {
  const f = fixture(); const result = await f.service.create("order-1", "owner", { ...input, amount: 0.01, transaction_amount: 0.01, userId: "intruder" });
  const payload = JSON.parse(f.calls[0].options.body);
  assert.equal(payload.transaction_amount, 129.9); assert.equal(payload.external_reference, "order-1");
  assert.equal(payload.metadata.payment_operation, f.order.payment.operationId);
  assert.equal(f.calls[0].options.headers["X-Idempotency-Key"], f.order.payment.operationId);
  assert.equal(result.status, "pending"); assert.equal(f.order.status, "aguardando_pagamento");
  assert.equal(f.order.payment.providerPaymentId, "123");
  assert.equal(result.presentation.qrCode, "fake-qr");
  assert.equal(JSON.stringify(result).includes("must-not-persist"), false);
  assert.equal(JSON.stringify(result).includes("requestHash"), false);
});
test("criação approved aguarda confirmação por webhook; status genérico normalizado", async () => {
  const f = fixture(); f.setState("approved");
  assert.equal(normalizeStatus("approved"), "approved");
  await f.service.create("order-1", "owner", input);
  assert.equal(f.order.payment.status, "pending"); assert.equal(f.order.status, "aguardando_pagamento");
  await f.service.webhook("mercado_pago", notification());
  assert.equal(f.order.payment.status, "approved"); assert.equal(f.order.status, "pagamento_aprovado");
  assert.equal(f.calls.at(-1).url, "https://api.mercadopago.com/v1/payments/123");
});
test("rejected nunca aprova o pedido", async () => {
  const f = fixture(); f.setState("rejected"); await f.service.create("order-1", "owner", input);
  await f.service.webhook("mercado_pago", notification());
  assert.equal(f.order.payment.status, "rejected"); assert.equal(f.order.status, "aguardando_pagamento");
});
test("webhook inválido não consulta provedor nem altera pedido", async () => {
  const f = fixture(); await assert.rejects(f.service.webhook("mercado_pago", notification(false)), { status: 401 });
  assert.equal(f.calls.length, 0); assert.equal(f.writes.length, 0);
});
test("webhook assinado consulta ID assinado e ignora status e ID forjados no corpo", async () => {
  const f = fixture(); await f.service.create("order-1", "owner", input);
  await f.service.webhook("mercado_pago", notification());
  assert.equal(f.calls.at(-1).url.endsWith("/123"), true); assert.equal(f.order.payment.status, "pending");
});
test("webhook duplicado não produz outra atualização", async () => {
  const f = fixture(); await f.service.create("order-1", "owner", input); f.setState("approved");
  await f.service.webhook("mercado_pago", notification()); const count = f.writes.length;
  await f.service.webhook("mercado_pago", notification());
  assert.equal(f.writes.length, count);
});
test("webhook recebido antes da resposta de criação não perde a aprovação", async () => {
  const f = fixture(); f.beforeResponse(async () => {
    f.setState("approved"); await f.service.webhook("mercado_pago", notification()); f.setState("pending");
  });
  const result = await f.service.create("order-1", "owner", input);
  assert.equal(result.status, "approved"); assert.equal(f.order.status, "pagamento_aprovado");
});
test("alteração no ID assinado rejeita notificação sem qualquer consulta", async () => {
  const f = fixture(); const signed = notification();
  const tampered = new Request("https://example.test/webhook?data.id=456", { headers: signed.headers });
  await assert.rejects(f.service.webhook("mercado_pago", tampered), { status: 401 });
  assert.equal(f.calls.length, 0); assert.equal(f.writes.length, 0);
});
test("repetições concorrentes usam o mesmo UUID e uma cobrança já vinculada não é recriada", async () => {
  const f = fixture(); await Promise.all([f.service.create("order-1", "owner", input), f.service.create("order-1", "owner", input)]);
  const keys = new Set(f.calls.map(call => call.options.headers["X-Idempotency-Key"])); assert.equal(keys.size, 1);
  const count = f.calls.length; await f.service.create("order-1", "owner", input); assert.equal(f.calls.length, count);
});
test("indisponibilidade mantém operação; outro token não cria nova cobrança ambígua", async () => {
  const f = fixture("cartao"); f.fail(); const card = { ...input, methodId: "visa", token: "token-valid-123", installments: 1 };
  await assert.rejects(f.service.create("order-1", "owner", card), { status: 503 });
  assert.equal(f.order.payment.phase, "creating");
  await assert.rejects(f.service.create("order-1", "owner", { ...card, token: "token-other-456" }), { status: 409 });
  assert.equal(f.calls.length, 1);
});
test("resposta perdida pode ser recuperada pelo external_reference e operação", async () => {
  const f = fixture(); f.order.payment.phase = "creating";
  const result = await f.service.getSession("order-1", "owner");
  assert.equal(result.phase, "created"); assert.ok(f.calls[0].url.includes("external_reference=order-1"));
  assert.equal(f.calls[1].url.endsWith("/123"), true);
});
test("valor, moeda, ambiente, operação e outro paymentId incompatíveis são rejeitados", async () => {
  for (const bad of [{ transaction_amount: 1 }, { currency_id: "USD" }, { live_mode: true }, { metadata: { payment_operation: "other" } }, { external_reference: "other-order" }]) {
    const f = fixture(); await f.service.create("order-1", "owner", input); f.override(bad);
    await assert.rejects(f.service.webhook("mercado_pago", notification()));
    assert.equal(f.order.payment.confirmed, false);
  }
  const f = fixture(); await f.service.create("order-1", "owner", input); f.order.payment.providerPaymentId = "456";
  await assert.rejects(f.service.webhook("mercado_pago", notification()), { status: 409 });
});
test("webhook antigo não regride aprovação; status de entrega é preservado", async () => {
  const f = fixture(); await f.service.create("order-1", "owner", input); f.setState("approved");
  await f.service.webhook("mercado_pago", notification()); f.setState("pending"); f.override({ date_last_updated: "2026-10-06T12:00:00Z" });
  await f.service.webhook("mercado_pago", notification()); assert.equal(f.order.payment.status, "approved");
  f.order.status = "enviado"; f.setState("approved"); f.override({ date_last_updated: "2026-10-08T12:00:00Z" });
  await f.service.webhook("mercado_pago", notification()); assert.equal(f.order.status, "enviado");
});
test("cartão: token transitório, sem persistência de documento, CVV ou PAN", async () => {
  const f = fixture("cartao"); await f.service.create("order-1", "owner", { ...input, methodId: "visa", token: "token-valid-123", installments: 1, issuerId: "25", card_number: "fake-pan", cvv: "fake-cvv" });
  const saved = JSON.stringify(f.order);
  for (const secret of ["token-valid-123", "12345678909", "fake-pan", "fake-cvv", config.accessToken]) assert.equal(saved.includes(secret), false);
  const payload = JSON.parse(f.calls[0].options.body); assert.equal(payload.token, "token-valid-123"); assert.equal(payload.cvv, undefined); assert.equal(payload.card_number, undefined);
});
test("boleto usa endereço do pedido, exibe URL, código e vencimento", async () => {
  const f = fixture("boleto"); const result = await f.service.create("order-1", "owner", { ...input, methodId: "bolbradesco" });
  const payload = JSON.parse(f.calls[0].options.body); assert.equal(payload.payer.address.street_name, "Rua Teste");
  assert.equal(result.presentation.barcode, "123456789"); assert.ok(result.presentation.ticketUrl.startsWith("https:")); assert.ok(result.presentation.expiresAt);
});
test("pedidos antigos são legíveis, mas não cobráveis automaticamente", async () => {
  const f = fixture(); f.legacy(); const result = await f.service.getSession("order-1", "owner");
  assert.equal(result.phase, "legacy"); assert.equal(result.provider, null);
  await assert.rejects(f.service.create("order-1", "owner", input), { status: 409 }); assert.equal(f.calls.length, 0);
});
test("método, documento e token inválidos não iniciam cobrança", async () => {
  for (const data of [null, {}, { ...input, methodId: "visa" }, { ...input, identification: { type: "CPF", number: "1" } }]) {
    const f = fixture(); await assert.rejects(f.service.create("order-1", "owner", data), { status: 400 }); assert.equal(f.calls.length, 0);
  }
  const f = fixture("cartao"); await assert.rejects(f.service.create("order-1", "owner", { ...input, methodId: "visa", token: "" }), { status: 400 });
});
test("API autentica antes de ler payload, rejeita token expirado e não expõe credenciais", async () => {
  const http = load("app/lib/payments/http.ts", {
    "next/server": { NextResponse: { json: (data, init) => Response.json(data, init) } },
    "../firebase-admin": { adminAuth: { verifyIdToken: async (token, checkRevoked) => { assert.equal(checkRevoked, true); if (token !== "valid") throw new Error("SECRET"); return { uid: "owner" }; } } },
  }, true);
  const f = fixture(); const route = load("app/api/payments/route.ts", { "../../lib/payments": { paymentService: f.service }, "../../lib/payments/http": http }, true);
  for (const authorization of ["", "Bearer expired"]) {
    const response = await route.POST(new Request("http://localhost/api/payments", { method: "POST", headers: { authorization }, body: "broken" }));
    assert.equal(response.status, 401); assert.equal((await response.text()).includes("SECRET"), false);
  }
  const response = await route.POST(new Request("http://localhost/api/payments", { method: "POST", headers: { authorization: "Bearer valid" }, body: JSON.stringify({ orderId: "order-1", amount: 1, paymentData: input }) }));
  assert.equal(response.status, 200); assert.equal(JSON.parse(f.calls[0].options.body).transaction_amount, 129.9);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
test("provedor trata 404, JSON inválido, erro de API e resposta incompatível sem detalhes privados", async () => {
  for (const [response, status] of [[new Response("private", { status: 404 }), 404], [new Response("private", { status: 400 }), 422], [new Response("private", { status: 500 }), 503], [new Response("not-json"), 502], [Response.json({}), 502]]) {
    const provider = new MercadoPagoProvider(config, async () => response);
    await assert.rejects(provider.getPayment("123"), error => error.status === status && !error.message.includes("private"));
  }
});
