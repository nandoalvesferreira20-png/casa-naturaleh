import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import QRCode from "qrcode";

const nodeRequire = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
function load(file, mocks = {}) {
  const path = resolve(root, file);
  const compiled = { exports: {} };
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("require", "module", "exports", code)(name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith(".")) return load(resolve(dirname(path), name + ".ts"));
    return nodeRequire(name);
  }, compiled, compiled.exports);
  return compiled.exports;
}
const { generatePixPayload, crc16, pixTxid } = load("app/lib/pix/pix.ts");
const { orderPaymentLabel } = load("app/lib/pix/types.ts");
const options = { key: "123e4567-e12b-12d1-a456-426655440000", receiverName: "Casa Naturaleh", receiverCity: "São Paulo", amount: 39.98, txid: "PEDIDO123" };
const payment = { provider: "pix_manual", method: "pix", status: "pending", txid: options.txid, pixCopyPaste: generatePixPayload(options) };

function tlv(payload) {
  const fields = {};
  for (let i = 0; i < payload.length;) {
    const id = payload.slice(i, i + 2), size = Number(payload.slice(i + 2, i + 4));
    assert.ok(Number.isInteger(size) && size > 0 && i + 4 + size <= payload.length);
    assert.equal(fields[id], undefined); fields[id] = payload.slice(i + 4, i + 4 + size); i += 4 + size;
  }
  return fields;
}
test("CRC16 confere com vetor CCITT-FALSE e exemplo publicado pelo Banco Central", () => {
  assert.equal(crc16("123456789"), "29B1");
  const official = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D";
  assert.equal(crc16(official.slice(0, -4)), "1D3D");
});
test("payload completo contém chave, moeda, valor exato, recebedor, cidade, txid e CRC", () => {
  const payload = generatePixPayload(options), fields = tlv(payload), account = tlv(fields["26"]);
  assert.equal(fields["00"], "01"); assert.equal(account["00"], "br.gov.bcb.pix"); assert.equal(account["01"], options.key);
  assert.equal(fields["52"], "0000"); assert.equal(fields["53"], "986"); assert.equal(fields["54"], "39.98");
  assert.equal(fields["58"], "BR"); assert.equal(fields["59"], "CASA NATURALEH"); assert.equal(fields["60"], "SAO PAULO");
  assert.equal(tlv(fields["62"])["05"], options.txid); assert.equal(fields["63"], crc16(payload.slice(0, -4)));
});
test("valores monetários têm duas casas, sem aceitar NaN, negativo ou arredondamento indevido", () => {
  for (const [amount, expected] of [[0.01, "0.01"], [0.1 + 0.2, "0.30"], [100, "100.00"], [1234.56, "1234.56"]]) assert.equal(tlv(generatePixPayload({ ...options, amount }))["54"], expected);
  for (const amount of [NaN, Infinity, 0, -1, 1.234, "10", 1e15]) assert.throws(() => generatePixPayload({ ...options, amount }));
});
test("txid determinístico válido por pedido; prefixo respeita 25 caracteres", () => {
  assert.equal(pixTxid("pedido-123", "CN"), pixTxid("pedido-123", "CN"));
  assert.match(pixTxid("pedido-123", "CN"), /^CN[a-f0-9]{23}$/);
  assert.notEqual(pixTxid("pedido-123"), pixTxid("pedido123"));
  for (const txid of ["", "***", "a".repeat(26), "pedido-123", "café"]) assert.throws(() => generatePixPayload({ ...options, txid }));
  assert.throws(() => pixTxid("123", "LONGPREFIX")); assert.throws(() => pixTxid("123", "C-N"));
});
test("chaves, tamanho EMV e descrição são validados sem truncar chave", () => {
  for (const key of ["12345678909", "12345678000195", "+5511999999999", "pix@example.com", options.key]) assert.equal(tlv(tlv(generatePixPayload({ ...options, key }))["26"])["01"], key);
  for (const key of ["", "123.456.789-09", "Pix@Example.com", "not-a-key", "a".repeat(78)]) assert.throws(() => generatePixPayload({ ...options, key }));
  const described = tlv(generatePixPayload({ ...options, description: "Pedido 123" }));
  assert.equal(tlv(described["26"])["02"], "PEDIDO 123");
  assert.throws(() => generatePixPayload({ ...options, description: "a".repeat(72) }));
  assert.equal(tlv(generatePixPayload({ ...options, receiverName: "a".repeat(50), receiverCity: "b".repeat(50) }))["59"].length, 25);
});
test("QR codifica o payload inteiro, com valor e referência, sem rede", () => {
  const qr = QRCode.create(payment.pixCopyPaste, { errorCorrectionLevel: "M" });
  assert.ok(qr.modules.size > 21);
  const decodedSegments = qr.segments.map(segment => typeof segment.data === "string" ? segment.data : Buffer.from(segment.data).toString("utf8")).join("");
  assert.equal(decodedSegments, payment.pixCopyPaste);
});

function renderPanel(props = {}, canvasTarget = {}) {
  const states = [], effects = [], draws = []; let cursor = 0;
  const mockReact = { ...React, useRef: () => ({ current: canvasTarget }), useState: initial => {
    const index = cursor++; if (!(index in states)) states[index] = initial;
    return [states[index], value => { states[index] = value; }];
  }, useEffect: callback => effects.push(callback) };
  const Panel = load("app/components/payments/ManualPixPanel.tsx", { react: mockReact, qrcode: { toCanvas: async (...args) => draws.push(args) } }).default;
  const input = { orderId: "pedido-123", total: 39.98, orderStatus: "aguardando_pagamento", payment, ...props };
  const render = () => { cursor = 0; return Panel(input); };
  return { render, effects, draws, states, input };
}
function findElement(element, type) {
  if (!element || typeof element !== "object") return null;
  if (element.type === type) return element;
  for (const child of React.Children.toArray(element.props?.children)) { const found = findElement(child, type); if (found) return found; }
  return null;
}
test("painel mostra canvas e payload; efeito desenha QR com o mesmo copia e cola", async () => {
  const panel = renderPanel(); const tree = panel.render();
  assert.equal(findElement(tree, "textarea").props.value, payment.pixCopyPaste);
  assert.equal(findElement(tree, "canvas").props["aria-label"], "QR Code Pix do pedido");
  const cleanup = panel.effects[0](); await new Promise(resolve => setImmediate(resolve));
  assert.equal(panel.draws[0][1], payment.pixCopyPaste); cleanup();
  const html = renderToStaticMarkup(tree);
  assert.ok(html.includes("39,98")); assert.ok(html.includes("Após realizar o pagamento, aguarde a confirmação."));
  assert.equal(html.includes("Pagamento aprovado"), false);
});
test("copiar usa clipboard no clique, dá feedback e não aprova pagamento", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator"); let copied;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard: { writeText: async value => { copied = value; } } } });
  try {
    const panel = renderPanel(); await findElement(panel.render(), "button").props.onClick();
    assert.equal(copied, payment.pixCopyPaste); assert.ok(renderToStaticMarkup(panel.render()).includes("Código Pix copiado!"));
    assert.equal(panel.input.payment.status, "pending");
  } finally { if (previous) Object.defineProperty(globalThis, "navigator", previous); else delete globalThis.navigator; }
});
test("sem clipboard, painel oferece cópia manual sem alert", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: {} });
  try { const panel = renderPanel(); await findElement(panel.render(), "button").props.onClick(); assert.ok(renderToStaticMarkup(panel.render()).includes("Selecione e copie")); }
  finally { if (previous) Object.defineProperty(globalThis, "navigator", previous); else delete globalThis.navigator; }
});
test("status manual do admin é refletido e pedido aprovado/cancelado não oferece novo Pix", () => {
  assert.equal(orderPaymentLabel(payment, "aguardando_pagamento"), "Aguardando confirmação");
  for (const orderStatus of ["pagamento_aprovado", "em_preparacao", "enviado", "entregue", "cancelado"]) {
    const html = renderToStaticMarkup(renderPanel({ orderStatus }).render());
    assert.equal(html.includes("<canvas"), false); assert.equal(html.includes("Copiar código Pix"), false);
    assert.ok(html.includes(orderStatus === "cancelado" ? "Pedido cancelado" : "Pagamento aprovado"));
  }
  assert.equal(orderPaymentLabel(undefined, "aguardando_pagamento"), "aguardando pagamento");
  assert.equal(orderPaymentLabel({ provider: "mercado_pago", status: "approved" }, "pagamento_aprovado"), "Pagamento aprovado");
});
test("APIs antigas pausadas não chamam autenticação, provider ou webhook", async () => {
  const poison = new Proxy({}, { get() { throw new Error("Fluxo externo não pode ser executado"); } });
  for (const [file, depth] of [["app/api/payments/route.ts", "../../"], ["app/api/webhooks/payments/mercado-pago/route.ts", "../../../../"]]) {
    const route = load(file, { [`${depth}lib/payments`]: { paymentService: poison }, [`${depth}lib/payments/http`]: poison, [`${depth}lib/payments/service`]: poison });
    const request = new Request("http://localhost/api/payments", { method: "POST", body: "invalid" });
    assert.equal((await route.POST(request)).status, 503);
    if (file === "app/api/payments/route.ts") assert.equal((await route.GET(request)).status, 503);
    else assert.deepEqual(await route.GET().json(), { ok: true, route: "mercado-pago-webhook" });
  }
});
test("grafo ativo do pedido e checkout não importa Payment Brick nem serviço de gateway", () => {
  const visited = new Set();
  function visit(file) {
    if (visited.has(file)) return; visited.add(file);
    const tree = ts.createSourceFile(file, readFileSync(resolve(root, file), "utf8"), ts.ScriptTarget.Latest, true);
    for (const statement of tree.statements) {
      if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly) continue;
      const name = statement.moduleSpecifier.text; if (!name.startsWith(".")) continue;
      const base = resolve(root, dirname(file), name);
      const resolved = [base + ".ts", base + ".tsx", base + "/index.ts"].find(existsSync); if (resolved) visit(resolved);
    }
  }
  visit("app/pedido-confirmado/page.tsx"); visit("app/api/checkout/route.ts"); visit("app/checkout/page.tsx");
  for (const file of visited) assert.doesNotMatch(file, /(?:MercadoPagoForm|[/\\]PaymentPanel|mercado-pago|payments[/\\](?:service|index|provider))\.[tj]sx?$/);
});
