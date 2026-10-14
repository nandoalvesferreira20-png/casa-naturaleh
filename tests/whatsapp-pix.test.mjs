import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const nodeRequire = createRequire(import.meta.url);
const source = readFileSync(new URL("../app/pedido-confirmado/PedidoConfirmadoClient.tsx", import.meta.url), "utf8");
const compiled = { exports: {} };
const deliveryTypes = { exports: {} };
new Function("exports", ts.transpileModule(readFileSync(new URL("../app/lib/delivery/types.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(deliveryTypes.exports);
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
new Function("require", "module", "exports", code)(name => {
  if (name === "react" || name === "react/jsx-runtime") return nodeRequire(name);
  if (name === "../lib/delivery/types") return deliveryTypes.exports;
  // Nenhuma API de escrita, carrinho ou rede fica disponível para esta ação.
  return {};
}, compiled, compiled.exports);
const { ComprovanteWhatsApp } = compiled.exports;
const pedido = {
  userId: "UID_PRIVADO", cliente: { nome: "João & Ana + família", email: "EMAIL_PRIVADO", telefone: "TELEFONE_PRIVADO" },
  endereco: { rua: "ENDERECO_PRIVADO" },
  itens: [
    { nome: "Chá & limão", quantidade: 2, preco: 14.9 },
    { nome: "Pasta de amendoim", quantidade: 1, preco: 129 },
  ],
  total: 158.8, status: "aguardando_pagamento",
  payment: { provider: "pix_manual", method: "pix", status: "pending", txid: "CN123", pixCopyPaste: "CHAVE_PIX_PRIVADA" },
};
function linkFrom(tree) {
  return React.Children.toArray(tree.props.children).find(child => child.type === "a");
}
test("link abre WhatsApp correto em nova aba e codifica dados reais, incluindo acentos", () => {
  const tree = ComprovanteWhatsApp({ pedidoId: "pedido-123", pedido });
  const link = linkFrom(tree);
  const url = new URL(link.props.href);
  assert.equal(url.origin + url.pathname, "https://wa.me/5511999572975");
  assert.equal(link.props.target, "_blank");
  assert.equal(link.props.rel, "noopener noreferrer");
  const mensagem = url.searchParams.get("text");
  const moeda = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  for (const trecho of ["Pedido: #pedido-123", "Nome: João & Ana + família", `2x Chá & limão — ${moeda(14.9)} por unidade`,
    `1x Pasta de amendoim — ${moeda(129)} por unidade`, `Total: ${moeda(158.8)}`, "TXID Pix: CN123"]) {
    assert.ok(mensagem.includes(trecho), trecho);
  }
  assert.equal(link.props.href.split("?text=")[1], encodeURIComponent(mensagem));
  for (const privado of [pedido.userId, pedido.cliente.email, pedido.cliente.telefone, pedido.endereco.rua, pedido.payment.pixCopyPaste]) {
    assert.ok(!mensagem.includes(privado));
  }
  assert.match(renderToStaticMarkup(tree), /pagamento será conferido/);
});
test("ação é apenas um link e preserva pedido e pagamento pendentes", () => {
  const antes = JSON.stringify(pedido);
  const link = linkFrom(ComprovanteWhatsApp({ pedidoId: "123", pedido }));
  assert.equal(link.type, "a");
  assert.equal(link.props.onClick, undefined);
  assert.equal(JSON.stringify(pedido), antes);
  assert.equal(pedido.status, "aguardando_pagamento");
  assert.equal(pedido.payment.status, "pending");
});
test("pedidos legados, aprovados e cancelados não oferecem ação de comprovante Pix manual", () => {
  for (const patch of [
    { payment: undefined },
    { payment: { provider: "mercado_pago", method: "card", status: "pending" } },
    { status: "pagamento_aprovado" }, { status: "cancelado" },
    { payment: { ...pedido.payment, status: "approved" } },
  ]) assert.equal(ComprovanteWhatsApp({ pedidoId: "123", pedido: { ...pedido, ...patch } }), null);
  assert.equal(ComprovanteWhatsApp({ pedidoId: null, pedido }), null);
});
test("Pix sem txid continua utilizável sem incluir undefined na mensagem", () => {
  const tree = ComprovanteWhatsApp({ pedidoId: "123", pedido: { ...pedido, payment: { ...pedido.payment, txid: undefined } } });
  const mensagem = new URL(linkFrom(tree).props.href).searchParams.get("text");
  assert.ok(!mensagem.includes("TXID"));
  assert.ok(!mensagem.includes("undefined"));
});

test("WhatsApp delivery inclui endereço, frete e Pix; pickup inclui retirada e pagamento local futuro", () => {
  const delivery = { ...pedido, frete: 15, fulfillment: { type: "delivery", shippingFee: 15, distanceKm: 7 },
    endereco: { rua: "Rua Flores", numero: "10", bairro: "Centro", cidade: "São Bernardo do Campo", estado: "SP", cep: "09770-000", complemento: "Apto 2" } };
  const mensagem = order => new URL(linkFrom(ComprovanteWhatsApp({ pedidoId: "123", pedido: order })).props.href).searchParams.get("text");
  assert.match(mensagem(delivery), /Forma de recebimento: Entrega/);
  assert.match(mensagem(delivery), /Endereço: Rua Flores, 10 - Apto 2/);
  assert.match(mensagem(delivery), /Frete: R\$\s15,00/);
  assert.match(mensagem(delivery), /Forma de pagamento: Pix/);
  const pickup = { ...pedido, endereco: null, frete: 0, fulfillment: { type: "pickup", shippingFee: 0 } };
  assert.match(mensagem(pickup), /Retirada na loja/);
  assert.match(mensagem(pickup), /Francisco Prestes Maia, 561/);
  const local = { ...pickup, payment: { provider: "manual", method: "local", status: "pending" } };
  assert.match(mensagem(local), /Forma de pagamento: Pagamento no local/);
  assert.match(mensagem(local), /Vou realizar o pagamento no local/);
  assert.doesNotMatch(mensagem(local), /efetuei|pago|comprovante|TXID/i);
  assert.match(renderToStaticMarkup(ComprovanteWhatsApp({ pedidoId: "123", pedido: local })), /Combinar retirada/);
  assert.equal(local.payment.status, "pending");
});
