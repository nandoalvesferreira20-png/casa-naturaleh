import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../../lib/firebase-admin";
import { initialPayment } from "../../lib/payments/service";
import { configuredProviderName } from "../../lib/payments/provider";
import type { PaymentMethod } from "../../lib/payments/types";

export const runtime = "nodejs";

class ErroCheckout extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function objeto(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    throw new ErroCheckout("Dados do checkout inválidos.");
  }
  return valor as Record<string, unknown>;
}

function texto(dados: Record<string, unknown>, campo: string, rotulo: string, opcional = false): string {
  const valor = dados[campo];
  if (opcional && valor === undefined) return "";
  if (typeof valor !== "string" || (!opcional && !valor.trim()) || valor.length > 300) {
    throw new ErroCheckout(`Preencha corretamente ${rotulo}.`);
  }
  return valor.trim();
}

function validarBody(body: unknown) {
  const dados = objeto(body);
  const cliente = objeto(dados.cliente);
  const endereco = objeto(dados.endereco);
  const clienteValidado = {
    nome: texto(cliente, "nome", "o nome"),
    email: texto(cliente, "email", "o e-mail"),
    telefone: texto(cliente, "telefone", "o telefone"),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clienteValidado.email)) throw new ErroCheckout("Informe um e-mail válido.");
  const enderecoValidado = {
    cep: texto(endereco, "cep", "o CEP"),
    rua: texto(endereco, "rua", "a rua"),
    numero: texto(endereco, "numero", "o número"),
    complemento: texto(endereco, "complemento", "o complemento", true),
    bairro: texto(endereco, "bairro", "o bairro"),
    cidade: texto(endereco, "cidade", "a cidade"),
    estado: texto(endereco, "estado", "o estado").toUpperCase(),
  };
  if (typeof dados.pagamento !== "string" || !["pix", "cartao", "boleto"].includes(dados.pagamento)) {
    throw new ErroCheckout("Escolha uma forma de pagamento válida: pix, cartao ou boleto.");
  }
  if (!Array.isArray(dados.itens) || dados.itens.length === 0) throw new ErroCheckout("Seu carrinho está vazio.");
  if (dados.itens.length > 100) throw new ErroCheckout("O pedido deve conter no máximo 100 produtos diferentes.");
  const ids = new Set<string>();
  const itens = dados.itens.map(valor => {
    const item = objeto(valor);
    if (typeof item.id !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(item.id)) {
      throw new ErroCheckout("ID de produto inválido.");
    }
    const id = item.id.toLowerCase();
    if (ids.has(id)) throw new ErroCheckout("Produto duplicado no carrinho. Envie a quantidade total em um único item.");
    ids.add(id);
    if (typeof item.quantidade !== "number" || !Number.isSafeInteger(item.quantidade) || item.quantidade <= 0) {
      throw new ErroCheckout("Quantidade inválida. Use um número inteiro maior que zero.");
    }
    return { id, quantidade: item.quantidade };
  });
  // Lista explícita: preços, totais, userId, status e demais campos recebidos são ignorados.
  return { cliente: clienteValidado, endereco: enderecoValidado, pagamento: dados.pagamento, itens };
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Faça login para finalizar seu pedido." }, { status: 401 });

  let uid: string;
  try {
    const usuario = await adminAuth.verifyIdToken(token, true);
    uid = usuario.uid;
  } catch {
    return NextResponse.json({ error: "Sessão inválida ou expirada. Faça login novamente." }, { status: 401 });
  }

  try {
    const limite = 64 * 1024;
    if (Number(request.headers.get("content-length")) > limite) throw new ErroCheckout("Dados do pedido excedem o tamanho permitido.");
    let body: unknown;
    try {
      const conteudo = await request.text();
      if (Buffer.byteLength(conteudo, "utf8") > limite) throw new ErroCheckout("Dados do pedido excedem o tamanho permitido.");
      body = JSON.parse(conteudo);
    } catch (error) {
      if (error instanceof ErroCheckout) throw error;
      throw new ErroCheckout("JSON do pedido inválido.");
    }
    const dados = validarBody(body);
    const { supabaseAdmin } = await import("../../lib/supabase-admin");
    const { data: produtos, error } = await supabaseAdmin.from("products")
      .select("id,nome,slug,preco,imagem,estoque,ativo")
      .in("id", dados.itens.map(item => item.id));
    if (error || !produtos) throw new Error("Falha na consulta ao catálogo.");
    const porId = new Map(produtos.map(produto => [produto.id, produto]));
    let subtotalCentavos = 0;
    const itens = dados.itens.map(item => {
      const produto = porId.get(item.id);
      if (!produto) throw new ErroCheckout("Produto não encontrado.");
      if (produto.ativo !== true) throw new ErroCheckout(`Produto ${produto.nome} não está mais disponível.`, 409);
      if (!Number.isSafeInteger(produto.estoque) || produto.estoque < item.quantidade) {
        throw new ErroCheckout(`Estoque insuficiente para ${produto.nome}.`, 409);
      }
      // Trabalhar em centavos evita erros de soma com ponto flutuante.
      const precoTexto = String(produto.preco);
      if (!/^\d+(?:\.\d{1,2})?$/.test(precoTexto)) throw new Error("Preço inválido no catálogo.");
      const centavos = Math.round(Number(precoTexto) * 100);
      if (!Number.isSafeInteger(centavos) || centavos <= 0) throw new Error("Preço inválido no catálogo.");
      const totalItem = centavos * item.quantidade;
      subtotalCentavos += totalItem;
      if (!Number.isSafeInteger(totalItem) || !Number.isSafeInteger(subtotalCentavos)) throw new ErroCheckout("Valor do pedido excede o limite permitido.");
      if (typeof produto.nome !== "string" || typeof produto.imagem !== "string" || typeof produto.slug !== "string") throw new Error("Produto inválido no catálogo.");
      return {
        id: produto.id, nome: produto.nome, preco: centavos / 100,
        quantidade: item.quantidade, imagem: produto.imagem, slug: produto.slug,
      };
    });
    const subtotal = subtotalCentavos / 100;
    const pedido = await adminDb.collection("orders").add({
      userId: uid, cliente: dados.cliente, endereco: dados.endereco, itens,
      subtotal, frete: 0, total: subtotal, pagamento: dados.pagamento,
      status: "aguardando_pagamento", criadoEm: FieldValue.serverTimestamp(),
      payment: initialPayment(configuredProviderName(), dados.pagamento as PaymentMethod),
    });
    return NextResponse.json({ success: true, orderId: pedido.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ErroCheckout) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Erro interno ao criar pedido no checkout.");
    return NextResponse.json({ error: "Não foi possível finalizar o pedido. Tente novamente mais tarde." }, { status: 500 });
  }
}
