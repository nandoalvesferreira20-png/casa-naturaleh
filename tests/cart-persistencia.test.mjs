import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToString } from "react-dom/server";

const require = createRequire(import.meta.url);
const fonte = readFileSync(new URL("../app/context/CartContext.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(fonte, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
});
function carregar(react = React) {
  const modulo = { exports: {} };
  new Function("require", "module", "exports", outputText)(nome => nome === "react" ? react : require(nome), modulo, modulo.exports);
  return modulo.exports;
}
const chave = "casa-naturaleh-cart";
const produto = { id: "e1b4a818-f501-4918-9c48-2b4339e7db42", nome: "Creatina", preco: 89.9, slug: "creatina", imagem: "/creatina.jpg", estoque: 10 };
const item = { ...produto, quantidade: 2 };

function armazenamento(inicial) {
  const dados = new Map(inicial === undefined ? [] : [[chave, inicial]]);
  const operacoes = [];
  return {
    dados, operacoes,
    getItem: key => { operacoes.push("ler"); return dados.get(key) ?? null; },
    setItem: (key, value) => { operacoes.push("salvar"); dados.set(key, value); },
    removeItem: key => { operacoes.push("remover"); dados.delete(key); },
  };
}

// Executor de hooks para testar os ciclos do provider sem DOM ou novas dependências.
// Estados são aplicados depois dos efeitos, reproduzindo o risco de sobrescrita inicial.
function montar(storage, { strict = false } = {}) {
  let estados = [], indice = 0, efeitos = [], dependencias = [], agendados = [], pendentes = [], contexto;
  const react = {
    createContext: () => ({ Provider: "provider" }),
    useState: inicial => {
      const posicao = indice++;
      if (!(posicao in estados)) estados[posicao] = inicial;
      return [estados[posicao], valor => pendentes.push(() => { estados[posicao] = typeof valor === "function" ? valor(estados[posicao]) : valor; })];
    },
    useEffect: (efeito, deps) => {
      const posicao = indice++;
      efeitos[posicao] = efeito;
      if (!dependencias[posicao] || deps.some((dep, i) => !Object.is(dep, dependencias[posicao][i]))) agendados.push(efeito);
      dependencias[posicao] = deps;
    },
  };
  const { CartProvider } = carregar(react);
  function noNavegador(fn) {
    const anterior = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage } });
    try { return fn(); } finally {
      if (anterior) Object.defineProperty(globalThis, "window", anterior);
      else delete globalThis.window;
    }
  }
  function renderizar() { indice = 0; contexto = CartProvider({ children: null }).props.value; }
  function executarEfeitos() { const atuais = agendados; agendados = []; atuais.forEach(efeito => efeito()); }
  function estabilizar() {
    let limite = 20;
    while (pendentes.length || agendados.length) {
      if (!limite--) throw new Error("Renderizações sem fim");
      const atualizacoes = pendentes; pendentes = []; atualizacoes.forEach(fn => fn());
      renderizar(); executarEfeitos();
    }
  }
  noNavegador(() => {
    renderizar();
    assert.deepEqual(contexto.itens, []);
    const efeitosMontagem = [...agendados];
    executarEfeitos();
    if (strict) efeitosMontagem.forEach(efeito => efeito());
    estabilizar();
  });
  return {
    get atual() { return contexto; },
    agir(nome, ...args) { noNavegador(() => { contexto[nome](...args); estabilizar(); }); },
  };
}

test("SSR renderiza vazio sem window/localStorage", () => {
  const { CartProvider, useCart } = carregar();
  function Resumo() { const cart = useCart(); return React.createElement("span", null, `${cart.totalItens}:${cart.subtotal}`); }
  assert.equal(renderToString(React.createElement(CartProvider, null, React.createElement(Resumo))), "<span>0:0</span>");
});
test("restaura antes de salvar, inclusive com repetição dos efeitos no Strict Mode", () => {
  for (const strict of [false, true]) {
    const storage = armazenamento(JSON.stringify([item]));
    const app = montar(storage, { strict });
    assert.deepEqual(app.atual.itens, [item]);
    assert.equal(storage.operacoes[0], "ler");
    assert.equal(storage.operacoes.includes("remover"), false);
    assert.deepEqual(JSON.parse(storage.dados.get(chave)), [item]);
  }
});
test("adicionar, somar, aumentar e diminuir persistem após novas montagens", () => {
  const storage = armazenamento();
  let app = montar(storage);
  app.agir("adicionarAoCarrinho", produto);
  app = montar(storage); // Reload/F5: novo provider usando o mesmo storage.
  assert.equal(app.atual.totalItens, 1);
  app.agir("adicionarAoCarrinho", produto, 2);
  app.agir("aumentarQuantidade", produto.id);
  app = montar(storage);
  assert.equal(app.atual.itens.length, 1);
  assert.equal(app.atual.totalItens, 4);
  assert.equal(app.atual.subtotal, produto.preco * 4);
  app.agir("diminuirQuantidade", produto.id);
  app = montar(storage);
  assert.equal(app.atual.totalItens, 3);
  const novaSessao = armazenamento(storage.dados.get(chave));
  assert.equal(montar(novaSessao).atual.totalItens, 3);
});
test("remover, diminuir até zero e limpar não restauram itens removidos", () => {
  for (const acao of ["removerDoCarrinho", "diminuirQuantidade", "limparCarrinho"]) {
    const storage = armazenamento(JSON.stringify([{ ...item, quantidade: 1 }]));
    const app = montar(storage);
    app.agir(acao, produto.id);
    assert.equal(storage.dados.has(chave), false);
    assert.deepEqual(montar(storage).atual.itens, []);
    assert.equal(app.atual.subtotal, 0);
  }
});
test("JSON corrompido ou valor fora do formato é removido sem falhar", () => {
  for (const salvo of ["{invalido", "", "null", "42", '{}', '"texto"']) {
    const storage = armazenamento(salvo);
    assert.deepEqual(montar(storage).atual.itens, []);
    assert.equal(storage.dados.has(chave), false);
  }
});
test("descarta itens inválidos e propriedades extras, preservando os válidos", () => {
  const invalidos = [null, {}, { ...item, id: 1 }, { ...item, nome: null }, { ...item, preco: "89.90" }, { ...item, slug: 1 }, { ...item, imagem: null }, { ...item, quantidade: 0 }, { ...item, quantidade: -1 }, { ...item, quantidade: "2" }];
  const storage = armazenamento(JSON.stringify([...invalidos, { ...item, token: "nao-persistir", usuario: "nao-persistir" }]));
  const app = montar(storage);
  assert.deepEqual(app.atual.itens, [item]);
  assert.deepEqual(JSON.parse(storage.dados.get(chave)), [item]);
  app.agir("adicionarAoCarrinho", { ...produto, id: "outro-uuid", credencial: "nao-persistir" });
  assert.equal(storage.dados.get(chave).includes("nao-persistir"), false);
});
test("rejeita valores numéricos não finitos no JSON", () => {
  const storage = armazenamento(JSON.stringify([item]).replace('89.9', '1e400'));
  assert.deepEqual(montar(storage).atual.itens, []);
});
test("storage bloqueado ou sem espaço não quebra as ações em memória", () => {
  const bloqueado = {
    getItem() { throw new Error("SecurityError"); },
    setItem() { throw new Error("QuotaExceededError"); },
    removeItem() { throw new Error("SecurityError"); },
  };
  const app = montar(bloqueado);
  app.agir("adicionarAoCarrinho", produto);
  app.agir("aumentarQuantidade", produto.id);
  assert.equal(app.atual.totalItens, 2);
  app.agir("limparCarrinho");
  assert.equal(app.atual.totalItens, 0);
});

test("estoques 10 e 2 limitam adição inicial, soma e aumento após restauração", () => {
  for (const estoque of [10, 2]) {
    const storage = armazenamento();
    let app = montar(storage);
    app.agir("adicionarAoCarrinho", { ...produto, estoque }, estoque + 1);
    assert.equal(app.atual.totalItens, estoque);
    app.agir("aumentarQuantidade", produto.id);
    app.agir("adicionarAoCarrinho", { ...produto, estoque }, 4);
    assert.equal(app.atual.totalItens, estoque);
    app = montar(storage);
    assert.equal(app.atual.itens[0].estoque, estoque);
    assert.equal(app.atual.totalItens, estoque);
    app.agir("limparCarrinho");
    app.agir("adicionarAoCarrinho", { ...produto, estoque }, 1);
    app.agir("adicionarAoCarrinho", { ...produto, estoque }, estoque);
    assert.equal(app.atual.totalItens, estoque);
  }
});
test("estoque zero e quantidades inválidas não entram no carrinho", () => {
  const app = montar(armazenamento());
  for (const estoque of [0, -1, NaN, Infinity, undefined, 1.5]) app.agir("adicionarAoCarrinho", { ...produto, estoque });
  for (const quantidade of [0, -1, NaN, Infinity, 1.5]) app.agir("adicionarAoCarrinho", produto, quantidade);
  assert.deepEqual(app.atual.itens, []);
});
test("estoque atualizado na adição reduz o limite anterior", () => {
  const app = montar(armazenamento(JSON.stringify([{ ...item, quantidade: 5 }])));
  app.agir("adicionarAoCarrinho", { ...produto, estoque: 2 }, 1);
  assert.equal(app.atual.totalItens, 2);
  assert.equal(app.atual.itens[0].estoque, 2);
});
test("restauração descarta legados sem estoque e limita quantidade excedente", () => {
  const { estoque: _estoque, ...legado } = item;
  assert.equal(_estoque, 10);
  const storage = armazenamento(JSON.stringify([legado, { ...item, estoque: 0 }, { ...item, quantidade: 20, estoque: 2 }]));
  const app = montar(storage);
  assert.equal(app.atual.itens.length, 1);
  assert.equal(app.atual.totalItens, 2);
  assert.equal(JSON.parse(storage.dados.get(chave))[0].quantidade, 2);
});

function acoesProduto(props, cart) {
  const fonteAcoes = readFileSync(new URL("../app/components/ProductActions.tsx", import.meta.url), "utf8");
  const codigo = ts.transpileModule(fonteAcoes, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const estados = [];
  let indice = 0;
  const modulo = { exports: {} };
  const mocks = {
    react: { useState(inicial) {
      const posicao = indice++;
      if (!(posicao in estados)) estados[posicao] = inicial;
      return [estados[posicao], valor => { estados[posicao] = typeof valor === "function" ? valor(estados[posicao]) : valor; }];
    } },
    "../context/CartContext": { useCart: () => cart.atual },
    "next/image": { default: "img" }, "next/link": { default: "a" },
  };
  new Function("require", "module", "exports", codigo)(nome => mocks[nome] ?? require(nome), modulo, modulo.exports);
  function elementos() {
    indice = 0;
    const encontrados = [];
    function visitar(no) {
      if (!no || typeof no !== "object") return;
      encontrados.push(no);
      React.Children.forEach(no.props?.children, visitar);
    }
    visitar(modulo.exports.default(props));
    return encontrados;
  }
  return { elementos, botao: rotulo => elementos().find(no => no.type === "button" && (no.props["aria-label"] === rotulo || no.props.children === rotulo)) };
}

test("ProductActions bloqueia seleção acima de 10 e compra sem estoque", () => {
  const app = montar(armazenamento());
  const acoes = acoesProduto(produto, app);
  for (let i = 0; i < 12; i++) acoes.botao("Aumentar quantidade de Creatina").props.onClick();
  assert.equal(acoes.botao("Aumentar quantidade de Creatina").props.disabled, true);
  assert.ok(acoes.elementos().some(no => no.type === "span" && no.props.children === 10));
  const semEstoque = acoesProduto({ ...produto, estoque: 0 }, app);
  assert.equal(semEstoque.botao("Produto indisponível").props.disabled, true);
  semEstoque.botao("Produto indisponível").props.onClick();
  assert.equal(app.atual.totalItens, 0);
  assert.equal(semEstoque.botao("Aumentar quantidade de Creatina"), undefined);
});

test("ProductActions informa quantidade efetivamente adicionada ao atingir estoque", () => {
  const storage = armazenamento();
  const app = montar(storage);
  app.agir("adicionarAoCarrinho", { ...produto, estoque: 2 });
  const cart = { get atual() { return { ...app.atual, adicionarAoCarrinho: (...args) => app.agir("adicionarAoCarrinho", ...args) }; } };
  const acoes = acoesProduto({ ...produto, estoque: 2 }, cart);
  acoes.botao("Aumentar quantidade de Creatina").props.onClick();
  acoes.botao("Adicionar ao carrinho").props.onClick();
  assert.equal(app.atual.totalItens, 2);
  assert.equal(acoes.botao("Adicionar ao carrinho").props.disabled, true);
  assert.ok(acoes.elementos().some(no => no.type === "p" && Array.isArray(no.props.children) && no.props.children[0] === "Quantidade: " && no.props.children[1] === 1));
});
