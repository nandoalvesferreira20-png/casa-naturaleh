import Link from "next/link";

export default function LoginPage() {
  return (
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
                  className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-black/10 px-5 py-3.5 text-sm font-semibold transition hover:bg-black/5"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold">
                    G
                  </span>

                  Continuar com Google
                </button>

                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-black/10 px-5 py-3.5 text-sm font-semibold transition hover:bg-black/5"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1877F2] text-sm font-bold text-white">
                    f
                  </span>

                  Continuar com Facebook
                </button>

                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-black/10 px-5 py-3.5 text-sm font-semibold transition hover:bg-black/5"
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
              <form className="space-y-5">
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
                    htmlFor="senha"
                    className="text-sm font-medium"
                  >
                    Senha
                  </label>

                  <input
                    id="senha"
                    type="password"
                    placeholder="Digite sua senha"
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
                    className="cursor-pointer text-sm font-medium text-[var(--color-primary)] transition hover:opacity-70"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Entrar
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
  );
}