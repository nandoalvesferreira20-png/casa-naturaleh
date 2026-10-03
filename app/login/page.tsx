"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";

import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";

export default function LoginPage() {
  const { entrar, entrarComGoogle } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Recuperação de senha
  const [modalRecuperacao, setModalRecuperacao] =
    useState(false);

  const [emailRecuperacao, setEmailRecuperacao] =
    useState("");

  const [enviandoRecuperacao, setEnviandoRecuperacao] =
    useState(false);

  const [erroRecuperacao, setErroRecuperacao] =
    useState("");

  const [sucessoRecuperacao, setSucessoRecuperacao] =
    useState("");

  async function handleGoogleLogin() {
    setErro("");

    try {
      setCarregando(true);

      await entrarComGoogle();

      router.push("/minha-conta");
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível entrar com o Google."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErro("");

    try {
      setCarregando(true);

      await entrar(email, senha);

      router.push("/minha-conta");
    } catch (error) {
      console.error(error);

      setErro("E-mail ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  }

  function abrirRecuperacao() {
    setErroRecuperacao("");
    setSucessoRecuperacao("");

    if (email.trim()) {
      setEmailRecuperacao(email.trim());
    }

    setModalRecuperacao(true);
  }

  function fecharRecuperacao() {
    if (enviandoRecuperacao) {
      return;
    }

    setModalRecuperacao(false);
    setErroRecuperacao("");
    setSucessoRecuperacao("");
  }

  async function handleRecuperarSenha(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErroRecuperacao("");
    setSucessoRecuperacao("");

    const emailLimpo =
      emailRecuperacao.trim();

    if (!emailLimpo) {
      setErroRecuperacao(
        "Informe seu e-mail."
      );
      return;
    }

    try {
      setEnviandoRecuperacao(true);

      await sendPasswordResetEmail(
        auth,
        emailLimpo
      );

      setSucessoRecuperacao(
        "Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha."
      );
    } catch (error: unknown) {
      console.error(
        "Erro ao recuperar senha:",
        error
      );

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error
      ) {
        const codigo = String(
          (
            error as {
              code: string;
            }
          ).code
        );

        if (
          codigo ===
          "auth/invalid-email"
        ) {
          setErroRecuperacao(
            "Informe um e-mail válido."
          );
          return;
        }

        if (
          codigo ===
          "auth/too-many-requests"
        ) {
          setErroRecuperacao(
            "Muitas tentativas. Aguarde alguns minutos e tente novamente."
          );
          return;
        }
      }

      setErroRecuperacao(
        "Não foi possível enviar o e-mail de recuperação."
      );
    } finally {
      setEnviandoRecuperacao(false);
    }
  }

  return (
    <>
      <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
        <section className="py-16 md:py-24">
          <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-sm lg:grid-cols-2">
            <div className="bg-[var(--color-bg-soft)] p-8 md:p-12">
              <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
                Casa Naturaleh
              </span>

              <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
                Entre na sua conta.
              </h1>

              <p className="mt-5 max-w-md leading-7 text-[var(--color-text-light)]">
                Acesse seus pedidos, dados pessoais e acompanhe suas compras em
                um só lugar.
              </p>

              <div className="mt-10 rounded-[1.5rem] bg-white/60 p-6">
                <h2 className="font-semibold">
                  Ainda não tem uma conta?
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--color-text-light)]">
                  Crie sua conta para acompanhar pedidos, salvar seus dados e
                  agilizar suas próximas compras.
                </p>

                <Link
                  href="/cadastro"
                  className="mt-5 inline-flex text-sm font-semibold text-[var(--color-primary)] transition hover:opacity-70"
                >
                  Criar minha conta →
                </Link>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <div className="mx-auto max-w-md">
                <h2 className="text-2xl font-semibold">
                  Login
                </h2>

                <p className="mt-2 text-sm text-[var(--color-text-light)]">
                  Escolha como deseja continuar.
                </p>

                {/* Login social */}
                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={carregando}
                    className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-black/10 px-5 py-3.5 text-sm font-semibold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold">
                      G
                    </span>

                    Continuar com Google
                  </button>

                  <button
                    type="button"
                    disabled={carregando}
                    className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-black/10 px-5 py-3.5 text-sm font-semibold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1877F2] text-sm font-bold text-white">
                      f
                    </span>

                    Continuar com Facebook
                  </button>

                  <button
                    type="button"
                    disabled={carregando}
                    className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-black/10 px-5 py-3.5 text-sm font-semibold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex h-6 w-6 items-center justify-center text-lg">
                      
                    </span>

                    Continuar com Apple
                  </button>
                </div>

                {/* Separador */}
                <div className="my-8 flex items-center gap-4">
                  <div className="h-px flex-1 bg-black/10" />

                  <span className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-light)]">
                    ou
                  </span>

                  <div className="h-px flex-1 bg-black/10" />
                </div>

                {/* Login tradicional */}
                <form
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
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
                        setEmail(
                          event.target.value
                        )
                      }
                      required
                      autoComplete="email"
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                    />
                  </div>

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
                      placeholder="Digite sua senha"
                      value={senha}
                      onChange={(event) =>
                        setSenha(
                          event.target.value
                        )
                      }
                      required
                      autoComplete="current-password"
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <label className="flex items-center gap-2 text-sm text-[var(--color-text-light)]">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                      />

                      Lembrar de mim
                    </label>

                    <button
                      type="button"
                      onClick={abrirRecuperacao}
                      className="cursor-pointer text-sm font-medium text-[var(--color-primary)] transition hover:opacity-70"
                    >
                      Esqueci minha senha
                    </button>
                  </div>

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
                      ? "Entrando..."
                      : "Entrar"}
                  </button>
                </form>

                <p className="mt-6 text-center text-xs leading-5 text-[var(--color-text-light)]">
                  Ao continuar, você concorda com os termos de uso e política de
                  privacidade da Casa Naturaleh.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modal recuperação de senha */}
      {modalRecuperacao && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={fecharRecuperacao}
        >
          <div
            className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  Segurança
                </span>

                <h2 className="mt-2 text-2xl font-semibold">
                  Recuperar senha
                </h2>
              </div>

              <button
                type="button"
                onClick={fecharRecuperacao}
                disabled={enviandoRecuperacao}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <p className="mt-5 text-sm leading-6 text-[var(--color-text-light)]">
              Informe o e-mail utilizado na sua conta. Enviaremos um link para
              você criar uma nova senha.
            </p>

            <form
              onSubmit={handleRecuperarSenha}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="emailRecuperacao"
                  className="text-sm font-medium"
                >
                  E-mail
                </label>

                <input
                  id="emailRecuperacao"
                  type="email"
                  value={emailRecuperacao}
                  onChange={(event) =>
                    setEmailRecuperacao(
                      event.target.value
                    )
                  }
                  placeholder="seuemail@exemplo.com"
                  required
                  autoComplete="email"
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>

              {erroRecuperacao && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {erroRecuperacao}
                </p>
              )}

              {sucessoRecuperacao && (
                <p className="rounded-xl bg-green-50 px-4 py-3 text-sm leading-6 text-green-700">
                  {sucessoRecuperacao}
                </p>
              )}

              {!sucessoRecuperacao && (
                <button
                  type="submit"
                  disabled={
                    enviandoRecuperacao
                  }
                  className="w-full cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enviandoRecuperacao
                    ? "Enviando..."
                    : "Enviar link de recuperação"}
                </button>
              )}

              {sucessoRecuperacao && (
                <button
                  type="button"
                  onClick={fecharRecuperacao}
                  className="w-full cursor-pointer rounded-full border border-black/10 px-6 py-3.5 text-sm font-semibold transition hover:bg-black/5"
                >
                  Voltar para o login
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}