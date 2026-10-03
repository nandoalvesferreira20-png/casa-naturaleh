"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "../context/AuthContext";

export default function CadastroPage() {
  const { cadastrar } = useAuth();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleCadastro(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErro("");

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    try {
      setCarregando(true);

      await cadastrar(nome, email, telefone, senha);

      router.push("/minha-conta");
    } catch (error) {
      console.error(error);

      setErro("Não foi possível criar sua conta.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
      <section className="py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-sm lg:grid-cols-2">

          <div className="bg-[var(--color-bg-soft)] p-8 md:p-12">
            <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
              Casa Naturaleh
            </span>

            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
              Crie sua conta.
            </h1>

            <p className="mt-5 max-w-md leading-7 text-[var(--color-text-light)]">
              Tenha seus pedidos, dados e informações de compra organizados em
              um só lugar.
            </p>

            <div className="mt-10 rounded-[1.5rem] bg-white/60 p-6">
              <h2 className="font-semibold">
                Já possui uma conta?
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--color-text-light)]">
                Entre com seus dados para acompanhar suas compras.
              </p>

              <Link
                href="/login"
                className="mt-5 inline-flex text-sm font-semibold text-[var(--color-primary)] transition hover:opacity-70"
              >
                Fazer login →
              </Link>
            </div>
          </div>

          <div className="p-8 md:p-12">
            <div className="mx-auto max-w-md">
              <h2 className="text-2xl font-semibold">
                Cadastro
              </h2>

              <p className="mt-2 text-sm text-[var(--color-text-light)]">
                Preencha seus dados para criar sua conta.
              </p>

              <form
                onSubmit={handleCadastro}
                className="mt-8 space-y-5"
              >
                <div>
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
                    value={nome}
                    onChange={(event) =>
                      setNome(event.target.value)
                    }
                    required
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
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    required
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
                    value={telefone}
                    onChange={(event) =>
                      setTelefone(event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="senha"
                      className="text-sm font-medium"
                    >
                      Senha
                    </label>

                    <input
                      id="senha"
                      type="password"
                      placeholder="Crie uma senha"
                      value={senha}
                      onChange={(event) =>
                        setSenha(event.target.value)
                      }
                      required
                      minLength={6}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirmarSenha"
                      className="text-sm font-medium"
                    >
                      Confirmar senha
                    </label>

                    <input
                      id="confirmarSenha"
                      type="password"
                      placeholder="Repita a senha"
                      value={confirmarSenha}
                      onChange={(event) =>
                        setConfirmarSenha(event.target.value)
                      }
                      required
                      minLength={6}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 text-sm text-[var(--color-text-light)]">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 h-4 w-4"
                  />

                  <span>
                    Li e concordo com os termos de uso e a política de
                    privacidade.
                  </span>
                </label>

                {erro && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {erro}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {carregando
                    ? "Criando conta..."
                    : "Criar minha conta"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-[var(--color-text-light)]">
                Já tem uma conta?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[var(--color-primary)]"
                >
                  Entrar
                </Link>
              </p>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}