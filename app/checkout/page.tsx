"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "../context/CartContext";

export default function CheckoutPage() {
  const { itens, subtotal, totalItens } = useCart();

  const frete = 0;
  const total = subtotal + frete;

  return (
    <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
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
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[1fr_400px]">

          <div className="space-y-8">
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
                    placeholder="(00) 00000-0000"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
            </section>

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
                <div>
                  <label
                    htmlFor="cep"
                    className="text-sm font-medium"
                  >
                    CEP
                  </label>

                  <input
                    id="cep"
                    type="text"
                    placeholder="00000-000"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

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
                    placeholder="Sua cidade"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

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
                    placeholder="Rua / Avenida"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

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
                    placeholder="123"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

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
                    placeholder="Apto, bloco..."
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

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
                    placeholder="Seu bairro"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="estado"
                    className="text-sm font-medium"
                  >
                    Estado
                  </label>

                  <select
                    id="estado"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  >
                    <option value="">
                      Selecione
                    </option>

                    <option value="SP">
                      SP
                    </option>

                    <option value="RJ">
                      RJ
                    </option>

                    <option value="MG">
                      MG
                    </option>

                    <option value="GO">
                      GO
                    </option>
                  </select>
                </div>
              </div>
            </section>

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
                <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-black/10 p-4 transition hover:border-[var(--color-primary)]">
                  <input
                    type="radio"
                    name="pagamento"
                    value="pix"
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

                <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-black/10 p-4 transition hover:border-[var(--color-primary)]">
                  <input
                    type="radio"
                    name="pagamento"
                    value="cartao"
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

                <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-black/10 p-4 transition hover:border-[var(--color-primary)]">
                  <input
                    type="radio"
                    name="pagamento"
                    value="boleto"
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
                      Quantidade: {item.quantidade}
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {(item.preco * item.quantidade).toLocaleString(
                        "pt-BR",
                        {
                          style: "currency",
                          currency: "BRL",
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
                  {subtotal.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
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
                  {total.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={itens.length === 0}
              className="mt-6 w-full cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Finalizar pedido
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