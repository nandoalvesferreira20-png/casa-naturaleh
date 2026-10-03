"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";


import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";

type Endereco = {
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
};

type Perfil = {
  nome?: string;
  email?: string;
  telefone?: string;
  endereco?: Endereco;
};

export default function CheckoutPage() {
  const { itens, subtotal, totalItens, limparCarrinho } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  // Identificação
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  // Endereço
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  // CEP
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepEncontrado, setCepEncontrado] = useState(false);
  const [erroCep, setErroCep] = useState("");

  // Perfil
  const [carregandoPerfil, setCarregandoPerfil] = useState(false);

  // Pagamento
  const [pagamento, setPagamento] = useState("");

  // Finalização
  const [finalizando, setFinalizando] = useState(false);
  const [erroFinalizacao, setErroFinalizacao] = useState("");

  const frete = 0;
  const total = subtotal + frete;

  useEffect(() => {
    async function carregarDadosUsuario() {
      if (!user) {
        return;
      }

      try {
        setCarregandoPerfil(true);

        setNome(
          user.displayName ||
            user.email?.split("@")[0] ||
            ""
        );

        setEmail(user.email || "");

        const referencia = doc(
          db,
          "users",
          user.uid
        );

        const snapshot = await getDoc(referencia);

        if (!snapshot.exists()) {
          return;
        }

        const perfil =
          snapshot.data() as Perfil;

        setNome(
          perfil.nome ||
            user.displayName ||
            ""
        );

        setEmail(
          perfil.email ||
            user.email ||
            ""
        );

        setTelefone(
          perfil.telefone || ""
        );

        if (perfil.endereco) {
          setCep(
            perfil.endereco.cep || ""
          );

          setRua(
            perfil.endereco.rua || ""
          );

          setNumero(
            perfil.endereco.numero || ""
          );

          setComplemento(
            perfil.endereco.complemento ||
              ""
          );

          setBairro(
            perfil.endereco.bairro || ""
          );

          setCidade(
            perfil.endereco.cidade || ""
          );

          setEstado(
            perfil.endereco.estado || ""
          );

          if (
            perfil.endereco.cidade &&
            perfil.endereco.estado
          ) {
            setCepEncontrado(true);
          }
        }
      } catch (error) {
        console.error(
          "Erro ao carregar dados do usuário:",
          error
        );
      } finally {
        setCarregandoPerfil(false);
      }
    }

    carregarDadosUsuario();
  }, [user]);

  function handleCepChange(valor: string) {
    const apenasNumeros = valor
      .replace(/\D/g, "")
      .slice(0, 8);

    const cepFormatado =
      apenasNumeros.replace(
        /^(\d{5})(\d)/,
        "$1-$2"
      );

    setCep(cepFormatado);

    setCepEncontrado(false);
    setErroCep("");
  }

  async function buscarCep() {
    const cepLimpo =
      cep.replace(/\D/g, "");

    if (cepLimpo.length === 0) {
      return;
    }

    if (cepLimpo.length !== 8) {
      setCepEncontrado(false);

      setErroCep(
        "Informe um CEP válido."
      );

      return;
    }

    try {
      setBuscandoCep(true);
      setErroCep("");

      const resposta = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`
      );

      if (!resposta.ok) {
        throw new Error(
          "Erro ao consultar CEP."
        );
      }

      const dados =
        await resposta.json();

      if (dados.erro) {
        setCepEncontrado(false);

        setErroCep(
          "CEP não encontrado."
        );

        return;
      }

      setRua(
        dados.logradouro || ""
      );

      setBairro(
        dados.bairro || ""
      );

      setCidade(
        dados.localidade || ""
      );

      setEstado(
        dados.uf || ""
      );

      setCepEncontrado(true);
    } catch (error) {
      console.error(
        "Erro ao buscar CEP:",
        error
      );

      setCepEncontrado(false);

      setErroCep(
        "Não foi possível consultar o CEP."
      );
    } finally {
      setBuscandoCep(false);
    }
  }

  async function handleFinalizarPedido() {
    setErroFinalizacao("");

    if (!user) {
      setErroFinalizacao(
        "Faça login para finalizar seu pedido."
      );

      return;
    }

    if (itens.length === 0) {
      setErroFinalizacao(
        "Seu carrinho está vazio."
      );

      return;
    }

    if (!nome.trim()) {
      setErroFinalizacao(
        "Informe seu nome."
      );

      return;
    }

    if (!email.trim()) {
      setErroFinalizacao(
        "Informe seu e-mail."
      );

      return;
    }

    if (!telefone.trim()) {
      setErroFinalizacao(
        "Informe seu telefone."
      );

      return;
    }

    if (!cep.trim()) {
      setErroFinalizacao(
        "Informe o CEP."
      );

      return;
    }

    if (!rua.trim()) {
      setErroFinalizacao(
        "Informe a rua."
      );

      return;
    }

    if (!numero.trim()) {
      setErroFinalizacao(
        "Informe o número."
      );

      return;
    }

    if (!bairro.trim()) {
      setErroFinalizacao(
        "Informe o bairro."
      );

      return;
    }

    if (!cidade.trim()) {
      setErroFinalizacao(
        "Informe a cidade."
      );

      return;
    }

    if (!estado.trim()) {
      setErroFinalizacao(
        "Informe o estado."
      );

      return;
    }

    if (!pagamento) {
      setErroFinalizacao(
        "Escolha uma forma de pagamento."
      );

      return;
    }

    try {
      setFinalizando(true);

      const pedido = {
        userId: user.uid,

        cliente: {
          nome: nome.trim(),
          email: email.trim(),
          telefone: telefone.trim(),
        },

        endereco: {
          cep: cep.trim(),
          rua: rua.trim(),
          numero: numero.trim(),
          complemento:
            complemento.trim(),
          bairro: bairro.trim(),
          cidade: cidade.trim(),
          estado:
            estado.trim().toUpperCase(),
        },

        itens: itens.map((item) => ({
          id: item.id,
          nome: item.nome,
          preco: item.preco,
          quantidade: item.quantidade,
          imagem: item.imagem,
          slug: item.slug,
        })),

        subtotal,
        frete,
        total,

        pagamento,

        status:
          "aguardando_pagamento",

        criadoEm:
          serverTimestamp(),
      };

      const referencia =
        await addDoc(
          collection(db, "orders"),
          pedido
        );

        limparCarrinho();

      router.push(
        `/pedido-confirmado?id=${referencia.id}`
      );
    } catch (error) {
      console.error(
        "Erro ao finalizar pedido:",
        error
      );

      setErroFinalizacao(
        "Não foi possível finalizar o pedido."
      );
    } finally {
      setFinalizando(false);
    }
  }

  return (
    <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Cabeçalho */}
      <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
            Checkout
          </span>

          <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
            Finalize sua compra
          </h1>

          <p className="mt-4 max-w-2xl text-[var(--color-text-light)]">
            Revise seus dados, endereço de entrega e forma de pagamento.
          </p>

          {user && (
            <p className="mt-3 text-sm font-medium text-[var(--color-primary)]">
              {carregandoPerfil
                ? "Carregando seus dados..."
                : "Seus dados salvos foram preenchidos automaticamente."}
            </p>
          )}
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-8">
            {/* Identificação */}
            <section className="rounded-[1.5rem] bg-white p-6 md:p-8">
              <div className="mb-6">
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  1. Identificação
                </span>

                <h2 className="mt-2 text-2xl font-semibold">
                  Seus dados
                </h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="nome"
                    className="text-sm font-medium"
                  >
                    Nome completo
                  </label>

                  <input
                    id="nome"
                    type="text"
                    value={nome}
                    onChange={(event) =>
                      setNome(
                        event.target.value
                      )
                    }
                    placeholder="Seu nome completo"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="text-sm font-medium"
                  >
                    E-mail
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    placeholder="seuemail@exemplo.com"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="telefone"
                    className="text-sm font-medium"
                  >
                    Telefone
                  </label>

                  <input
                    id="telefone"
                    type="tel"
                    value={telefone}
                    onChange={(event) =>
                      setTelefone(
                        event.target.value
                      )
                    }
                    placeholder="(00) 00000-0000"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
            </section>

            {/* Entrega */}
            <section className="rounded-[1.5rem] bg-white p-6 md:p-8">
              <div className="mb-6">
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  2. Entrega
                </span>

                <h2 className="mt-2 text-2xl font-semibold">
                  Endereço
                </h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {/* CEP */}
                <div>
                  <label
                    htmlFor="cep"
                    className="text-sm font-medium"
                  >
                    CEP
                  </label>

                  <div className="relative mt-2">
                    <input
                      id="cep"
                      type="text"
                      inputMode="numeric"
                      value={cep}
                      onChange={(event) =>
                        handleCepChange(
                          event.target.value
                        )
                      }
                      onBlur={buscarCep}
                      placeholder="00000-000"
                      maxLength={9}
                      className="w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 pr-28 outline-none transition focus:border-[var(--color-primary)]"
                    />

                    {buscandoCep && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-light)]">
                        Buscando...
                      </span>
                    )}

                    {!buscandoCep &&
                      cepEncontrado && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-primary)]">
                          Encontrado ✓
                        </span>
                      )}
                  </div>
                </div>

                {/* Cidade */}
                <div>
                  <label
                    htmlFor="cidade"
                    className="text-sm font-medium"
                  >
                    Cidade
                  </label>

                  <input
                    id="cidade"
                    type="text"
                    value={cidade}
                    onChange={(event) =>
                      setCidade(
                        event.target.value
                      )
                    }
                    disabled={
                      cepEncontrado
                    }
                    placeholder="Sua cidade"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                {/* Rua */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="rua"
                    className="text-sm font-medium"
                  >
                    Rua
                  </label>

                  <input
                    id="rua"
                    type="text"
                    value={rua}
                    onChange={(event) =>
                      setRua(
                        event.target.value
                      )
                    }
                    placeholder="Rua / Avenida"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

                {/* Número */}
                <div>
                  <label
                    htmlFor="numero"
                    className="text-sm font-medium"
                  >
                    Número
                  </label>

                  <input
                    id="numero"
                    type="text"
                    value={numero}
                    onChange={(event) =>
                      setNumero(
                        event.target.value
                      )
                    }
                    placeholder="123"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

                {/* Complemento */}
                <div>
                  <label
                    htmlFor="complemento"
                    className="text-sm font-medium"
                  >
                    Complemento
                  </label>

                  <input
                    id="complemento"
                    type="text"
                    value={complemento}
                    onChange={(event) =>
                      setComplemento(
                        event.target.value
                      )
                    }
                    placeholder="Apto, bloco..."
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

                {/* Bairro */}
                <div>
                  <label
                    htmlFor="bairro"
                    className="text-sm font-medium"
                  >
                    Bairro
                  </label>

                  <input
                    id="bairro"
                    type="text"
                    value={bairro}
                    onChange={(event) =>
                      setBairro(
                        event.target.value
                      )
                    }
                    placeholder="Seu bairro"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

                {/* Estado */}
                <div>
                  <label
                    htmlFor="estado"
                    className="text-sm font-medium"
                  >
                    Estado
                  </label>

                  <input
                    id="estado"
                    type="text"
                    value={estado}
                    onChange={(event) =>
                      setEstado(
                        event.target.value.toUpperCase()
                      )
                    }
                    disabled={
                      cepEncontrado
                    }
                    placeholder="SP"
                    maxLength={2}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 uppercase outline-none transition focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              {erroCep && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {erroCep}
                </p>
              )}
            </section>

            {/* Pagamento */}
            <section className="rounded-[1.5rem] bg-white p-6 md:p-8">
              <div className="mb-6">
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  3. Pagamento
                </span>

                <h2 className="mt-2 text-2xl font-semibold">
                  Como deseja pagar?
                </h2>
              </div>

              <div className="space-y-3">
                {/* Pix */}
                <label
                  className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
                    pagamento === "pix"
                      ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)]"
                      : "border-black/10 hover:border-[var(--color-primary)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="pagamento"
                    value="pix"
                    checked={
                      pagamento === "pix"
                    }
                    onChange={(event) =>
                      setPagamento(
                        event.target.value
                      )
                    }
                  />

                  <div>
                    <p className="font-semibold">
                      Pix
                    </p>

                    <p className="mt-1 text-sm text-[var(--color-text-light)]">
                      Pagamento rápido e confirmação automática.
                    </p>
                  </div>
                </label>

                {/* Cartão */}
                <label
                  className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
                    pagamento === "cartao"
                      ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)]"
                      : "border-black/10 hover:border-[var(--color-primary)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="pagamento"
                    value="cartao"
                    checked={
                      pagamento ===
                      "cartao"
                    }
                    onChange={(event) =>
                      setPagamento(
                        event.target.value
                      )
                    }
                  />

                  <div>
                    <p className="font-semibold">
                      Cartão de crédito
                    </p>

                    <p className="mt-1 text-sm text-[var(--color-text-light)]">
                      Pagamento com cartão.
                    </p>
                  </div>
                </label>

                {/* Boleto */}
                <label
                  className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
                    pagamento === "boleto"
                      ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)]"
                      : "border-black/10 hover:border-[var(--color-primary)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="pagamento"
                    value="boleto"
                    checked={
                      pagamento ===
                      "boleto"
                    }
                    onChange={(event) =>
                      setPagamento(
                        event.target.value
                      )
                    }
                  />

                  <div>
                    <p className="font-semibold">
                      Boleto
                    </p>

                    <p className="mt-1 text-sm text-[var(--color-text-light)]">
                      Gere o boleto e efetue o pagamento.
                    </p>
                  </div>
                </label>
              </div>
            </section>
          </div>

          {/* Resumo */}
          <aside className="h-fit rounded-[1.5rem] bg-white p-6 lg:sticky lg:top-6">
            <h2 className="text-xl font-semibold">
              Resumo da compra
            </h2>

            <p className="mt-2 text-sm text-[var(--color-text-light)]">
              {totalItens} itens no carrinho
            </p>

            <div className="mt-6 max-h-[350px] space-y-4 overflow-y-auto">
              {itens.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[64px_1fr] gap-4 border-b border-black/5 pb-4"
                >
                  <div className="relative h-16 overflow-hidden rounded-xl bg-[var(--color-bg-soft)]">
                    <Image
                      src={item.imagem}
                      alt={item.nome}
                      fill
                      sizes="64px"
                      className="object-contain p-2"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      {item.nome}
                    </p>

                    <p className="mt-1 text-xs text-[var(--color-text-light)]">
                      Quantidade:{" "}
                      {item.quantidade}
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {(
                        item.preco *
                        item.quantidade
                      ).toLocaleString(
                        "pt-BR",
                        {
                          style:
                            "currency",
                          currency:
                            "BRL",
                        }
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-light)]">
                  Subtotal
                </span>

                <span className="font-medium">
                  {subtotal.toLocaleString(
                    "pt-BR",
                    {
                      style: "currency",
                      currency: "BRL",
                    }
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-light)]">
                  Frete
                </span>

                <span className="text-sm font-medium">
                  A calcular
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-black/10 pt-4">
                <span className="font-semibold">
                  Total
                </span>

                <span className="text-xl font-semibold">
                  {total.toLocaleString(
                    "pt-BR",
                    {
                      style: "currency",
                      currency: "BRL",
                    }
                  )}
                </span>
              </div>
            </div>

            {erroFinalizacao && (
              <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {erroFinalizacao}
              </p>
            )}

            <button
              type="button"
              onClick={
                handleFinalizarPedido
              }
              disabled={
                itens.length === 0 ||
                finalizando
              }
              className="mt-6 w-full cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {finalizando
                ? "Finalizando..."
                : "Finalizar pedido"}
            </button>

            <Link
              href="/carrinho"
              className="mt-3 flex justify-center text-sm font-medium text-[var(--color-primary)]"
            >
              Voltar ao carrinho
            </Link>

            <p className="mt-6 text-center text-xs leading-5 text-[var(--color-text-light)]">
              Seus dados serão utilizados apenas para processar e entregar seu
              pedido.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}