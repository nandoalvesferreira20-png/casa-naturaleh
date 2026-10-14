import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = fileURLToPath(new URL("../", import.meta.url));
const nodeRequire = createRequire(import.meta.url);
function loader({ env = {}, fetch = () => { throw Error("Rede não autorizada no teste"); }, mocks = {}, now = () => Date.now(), logs = [], waits = [] } = {}) {
  const cache = new Map();
  let elapsed = 0;
  function load(file) {
    const path = resolve(root, file);
    if (cache.has(path)) return cache.get(path);
    const loaded = { exports: {} };
    const compiled = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    new Function("require", "module", "exports", "process", "fetch", "Date", "setTimeout", "console", compiled)(name => {
      if (name in mocks) return mocks[name];
      if (name.startsWith(".")) {
        const target = resolve(dirname(path), name);
        return load(existsSync(target + ".ts") ? target + ".ts" : target + ".tsx");
      }
      return nodeRequire(name);
    }, loaded, loaded.exports, { env }, fetch, class extends Date { static now() { return now() + elapsed; } },
    (callback, ms) => { waits.push(ms); elapsed += ms; queueMicrotask(callback); }, { info: (...args) => logs.push(args) });
    cache.set(path, loaded.exports);
    return loaded.exports;
  }
  return load;
}
function elements(tree, type) {
  if (!React.isValidElement(tree)) return [];
  return [...(tree.type === type ? [tree] : []), ...React.Children.toArray(tree.props.children).flatMap(child => elements(child, type))];
}
test("checkout muda frete/total, oculta endereço na retirada e reseta local ao escolher entrega", () => {
  const states = []; let cursor = 0;
  const mocks = {
    react: { ...React, useState: initial => { const index = cursor++; if (!(index in states)) states[index] = initial; return [states[index], value => { states[index] = value; }]; }, useEffect() {}, useRef: () => ({ current: false }) },
    "../context/CartContext": { useCart: () => ({ itens: [], subtotal: 100, totalItens: 0, limparCarrinho() {} }) },
    "../context/AuthContext": { useAuth: () => ({ user: null }) },
    "../lib/firebase": {}, "firebase/firestore": {}, "next/navigation": { useRouter: () => ({}) },
    "next/link": { default: "a" }, "next/image": { default: "img" },
  };
  const Page = loader({ mocks })("app/checkout/page.tsx").default;
  const render = () => { cursor = 0; return Page(); };
  let tree = render();
  assert.equal(elements(tree, "input").some(e => e.props.id === "cep"), false);
  elements(tree, "input").find(e => e.props.value === "local").props.onChange();
  tree = render(); assert.equal(elements(tree, "input").find(e => e.props.value === "local").props.checked, true);
  elements(tree, "input").find(e => e.props.value === "delivery").props.onChange();
  tree = render();
  assert.equal(elements(tree, "input").find(e => e.props.value === "pix").props.checked, true);
  assert.equal(elements(tree, "input").some(e => e.props.value === "local"), false);
  assert.equal(elements(tree, "input").some(e => e.props.id === "cep"), true);
  assert.match(renderToStaticMarkup(tree), /115,00/);
  elements(tree, "input").find(e => e.props.value === "pickup").props.onChange();
  tree = render(); assert.match(renderToStaticMarkup(tree), /Grátis/); assert.match(renderToStaticMarkup(tree), /100,00/);
});
test("confirmação aceita pedido antigo, retirada sem endereço e pagamento local sem Pix", () => {
  const base = { userId: "user", cliente: { nome: "Cliente" }, itens: [], subtotal: 100, frete: 0, total: 100, pagamento: "local", status: "aguardando_pagamento" };
  for (const pedido of [base, { ...base, endereco: null, fulfillment: { type: "pickup", shippingFee: 0 }, payment: { provider: "manual", method: "local", status: "pending" } }]) {
    let cursor = 0;
    const mocks = {
      react: { ...React, useState: () => [[pedido, false, ""][cursor++], () => {}], useEffect() {} },
      "next/navigation": { useSearchParams: () => new URLSearchParams("id=123") },
      "../context/AuthContext": { useAuth: () => ({ user: { uid: "user" } }) },
      "../lib/firebase": {}, "firebase/firestore": {}, "../components/ProtectedRoute": { default: ({ children }) => children },
      "../components/payments/ManualPixPanel": { default: () => { throw Error("Pix não deve ser gerado"); } }, "next/link": { default: "a" },
    };
    const Page = loader({ mocks })("app/pedido-confirmado/PedidoConfirmadoClient.tsx").default;
    const html = renderToStaticMarkup(Page());
    assert.doesNotMatch(html, /QR Code|Pagamento aprovado/);
    if (pedido.fulfillment) { assert.match(html, /Retirada na loja/); assert.match(html, /Francisco Prestes Maia/); assert.match(html, /Pagamento na retirada/); }
  }
});

test("admin de pedidos abre detalhe legado e retirada sem endereço sem alterar pagamento", () => {
  for (const fulfillment of [undefined, { type: "pickup", shippingFee: 0 }]) {
    const pedido = { id: "123", cliente: { nome: "Cliente", email: "a@example.com", telefone: "11999999999" }, itens: [], total: 100, subtotal: 100, frete: 0, status: "aguardando_pagamento", pagamento: fulfillment ? "local" : "pix", fulfillment, endereco: null };
    let cursor = 0;
    const mocks = {
      react: { ...React, useState: () => [[[pedido], false, "", "todos", pedido, null][cursor++], () => {}], useEffect() {}, useMemo: fn => fn() },
      "../components/AdminRoute": { default: ({ children }) => children }, "../lib/firebase": {}, "firebase/firestore": {},
    };
    const Page = loader({ mocks })("app/admin/page.tsx").default;
    const html = renderToStaticMarkup(Page());
    if (fulfillment) { assert.match(html, /Francisco Prestes Maia/); assert.match(html, /Pagamento na retirada/); }
    else assert.match(html, /Endereço não informado/);
    assert.equal(pedido.status, "aguardando_pagamento");
  }
});
test("pagamento local pendente não é considerado aprovado ao preparar retirada", () => {
  const { orderPaymentLabel } = loader()("app/lib/pix/types.ts");
  const payment = { provider: "manual", method: "local", status: "pending" };
  for (const status of ["aguardando_pagamento", "em_preparacao", "em_separacao"]) assert.equal(orderPaymentLabel(payment, status), "Pagamento na retirada");
  assert.equal(orderPaymentLabel(payment, "pagamento_aprovado"), "Pagamento aprovado");
  assert.equal(orderPaymentLabel(payment, "cancelado"), "Pedido cancelado");
});
