"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";

import { auth } from "../lib/firebase";

export default function RedefinirSenhaPage() {
  const searchParams = useSearchParams();

  const oobCode = searchParams.get("oobCode");

  const [email, setEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [verificando, setVerificando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [codigoValido, setCodigoValido] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    async function validarCodigo() {
      if (!oobCode) {
        setErro(
          "O link de redefinição é inválido ou está incompleto."
        );
        setVerificando(false);
        return;
      }

      try {
        const emailConta =
          await verifyPasswordResetCode(
            auth,
            oobCode
          );

        setEmail(emailConta);
        setCodigoValido(true);
      } catch (error) {
        console.error(
          "Erro ao validar código:",
          error
        );

        setErro(
          "Este link é inválido ou expirou. Solicite uma nova redefinição de senha."
        );
      } finally {
        setVerificando(false);
      }
    }

    validarCodigo();
  }, [oobCode]);

  async function handleRedefinirSenha(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErro("");

    if (!oobCode) {
      setErro(
        "Código de redefinição não encontrado."
      );
      return;
    }

    if (!novaSenha) {
      setErro(
        "Informe sua nova senha."
      );
      return;
    }

    if (novaSenha.length < 6) {
      setErro(
        "A senha deve ter pelo menos 6 caracteres."
      );
      return;
    }

    if (
      novaSenha !== confirmarSenha
    ) {
      setErro(
        "As senhas não coincidem."
      );
      return;
    }

    try {
      setSalvando(true);

      await confirmPasswordReset(
        auth,
        oobCode,
        novaSenha
      );

      setSucesso(true);
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (error) {
      console.error(
        "Erro ao redefinir senha:",
        error
      );

      setErro(
        "Não foi possível redefinir sua senha. O link pode ter expirado."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <section className="flex min-h-[calc(100vh-120px)] items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="bg-[var(--color-bg-soft)] px-8 py-10 text-center md:px-12">
            <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
              Casa Naturaleh
            </span>

            <h1 className="mt-4 text-3xl font-semibold md:text-4xl">
              Redefinir sua senha
            </h1>

            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--color-text-light)]">
              Crie uma nova senha para acessar sua conta com segurança.
            </p>
          </div>

          <div className="p-8 md:p-12">
            {verificando ? (
              <div className="py-8 text-center">
                <p className="text-sm text-[var(--color-text-light)]">
                  Validando seu link...
                </p>
              </div>
            ) : sucesso ? (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-2xl text-green-700">
                  ✓
                </div>

                <h2 className="mt-6 text-2xl font-semibold">
                  Senha redefinida
                </h2>

                <p className="mt-3 text-sm leading-6 text-[var(--color-text-light)]">
                  Sua nova senha foi salva com sucesso. Agora você já pode entrar na sua conta.
                </p>

                <Link
                  href="/login"
                  className="mt-8 inline-flex w-full justify-center rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Ir para o login
                </Link>
              </div>
            ) : codigoValido ? (
              <form
                onSubmit={
                  handleRedefinirSenha
                }
                className="space-y-5"
              >
                <div>
                  <span className="text-sm font-medium">
                    Conta
                  </span>

                  <div className="mt-2 rounded-2xl bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text-light)]">
                    {email}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="novaSenha"
                    className="text-sm font-medium"
                  >
                    Nova senha
                  </label>

                  <input
                    id="novaSenha"
                    type="password"
                    value={novaSenha}
                    onChange={(event) =>
                      setNovaSenha(
                        event.target.value
                      )
                    }
                    autoComplete="new-password"
                    placeholder="Mínimo de 6 caracteres"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmarSenha"
                    className="text-sm font-medium"
                  >
                    Confirmar nova senha
                  </label>

                  <input
                    id="confirmarSenha"
                    type="password"
                    value={confirmarSenha}
                    onChange={(event) =>
                      setConfirmarSenha(
                        event.target.value
                      )
                    }
                    autoComplete="new-password"
                    placeholder="Digite novamente"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                  />
                </div>

                {erro && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-600">
                    {erro}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={salvando}
                  className="w-full cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando
                    ? "Redefinindo..."
                    : "Redefinir senha"}
                </button>
              </form>
            ) : (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600">
                  !
                </div>

                <h2 className="mt-6 text-2xl font-semibold">
                  Link inválido
                </h2>

                <p className="mt-3 text-sm leading-6 text-[var(--color-text-light)]">
                  {erro}
                </p>

                <Link
                  href="/login"
                  className="mt-8 inline-flex w-full justify-center rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Voltar para o login
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}