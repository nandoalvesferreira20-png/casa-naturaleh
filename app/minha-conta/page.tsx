import Link from "next/link";
import ProtectedRoute from "../components/ProtectedRoute";

export default function MinhaContaPage() {
  return (
    <ProtectedRoute>
      <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
        <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
            Minha conta
          </span>

          <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
            Olá, Fernando
          </h1>

          <p className="mt-4 max-w-2xl text-[var(--color-text-light)]">
            Gerencie seus dados, endereços e acompanhe suas compras.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[280px_1fr]">

          {/* Menu lateral */}
          <aside className="h-fit rounded-[1.5rem] bg-white p-4">
            <nav className="flex flex-col gap-2">
              <Link
                href="/minha-conta"
                className="rounded-xl bg-[var(--color-bg-soft)] px-4 py-3 text-sm font-semibold"
              >
                Meus dados
              </Link>

              <Link
                href="/meus-pedidos"
                className="rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-black/5"
              >
                Meus pedidos
              </Link>

              <button
                type="button"
                className="cursor-pointer rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Sair da conta
              </button>
            </nav>
          </aside>

          {/* Conteúdo */}
          <div className="space-y-8">

            {/* Dados pessoais */}
            <section className="rounded-[1.5rem] bg-white p-6 md:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">
                    Dados pessoais
                  </h2>

                  <p className="mt-2 text-sm text-[var(--color-text-light)]">
                    Atualize suas principais informações.
                  </p>
                </div>

                <button
                  type="button"
                  className="cursor-pointer text-sm font-semibold text-[var(--color-primary)] transition hover:opacity-70"
                >
                  Editar dados
                </button>
              </div>

              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                    Nome
                  </span>

                  <p className="mt-2 font-medium">
                    Fernando Ferreira
                  </p>
                </div>

                <div>
                  <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                    E-mail
                  </span>

                  <p className="mt-2 font-medium">
                    fernando@email.com
                  </p>
                </div>

                <div>
                  <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                    Telefone
                  </span>

                  <p className="mt-2 font-medium">
                    (11) 99999-9999
                  </p>
                </div>

                <div>
                  <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                    Senha
                  </span>

                  <button
                    type="button"
                    className="mt-2 block cursor-pointer font-medium text-[var(--color-primary)]"
                  >
                    Alterar senha
                  </button>
                </div>
              </div>
            </section>

            {/* Endereço */}
            <section className="rounded-[1.5rem] bg-white p-6 md:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">
                    Endereço de entrega
                  </h2>

                  <p className="mt-2 text-sm text-[var(--color-text-light)]">
                    Usaremos este endereço para facilitar suas próximas compras.
                  </p>
                </div>

                <button
                  type="button"
                  className="cursor-pointer text-sm font-semibold text-[var(--color-primary)] transition hover:opacity-70"
                >
                  Editar endereço
                </button>
              </div>

              <div className="mt-8 rounded-[1.25rem] bg-[var(--color-bg)] p-5">
                <p className="font-semibold">
                  Endereço principal
                </p>

                <p className="mt-2 text-sm leading-6 text-[var(--color-text-light)]">
                  Rua Exemplo, 123
                  <br />
                  Bairro Exemplo
                  <br />
                  São Paulo - SP
                  <br />
                  CEP 00000-000
                </p>
              </div>
            </section>

            {/* Atalhos */}
            <section className="grid gap-6 md:grid-cols-2">
              <Link
                href="/meus-pedidos"
                className="rounded-[1.5rem] bg-[var(--color-bg-soft)] p-6 transition hover:-translate-y-1"
              >
                <span className="text-sm font-medium uppercase tracking-[0.15em] text-[var(--color-primary)]">
                  Pedidos
                </span>

                <h2 className="mt-3 text-xl font-semibold">
                  Acompanhar minhas compras
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--color-text-light)]">
                  Veja seus pedidos recentes e acompanhe o status de cada compra.
                </p>

                <span className="mt-5 inline-block text-sm font-semibold text-[var(--color-primary)]">
                  Ver pedidos →
                </span>
              </Link>

              <Link
                href="/loja"
                className="rounded-[1.5rem] bg-[var(--color-dark)] p-6 text-white transition hover:-translate-y-1"
              >
                <span className="text-sm font-medium uppercase tracking-[0.15em] text-white/60">
                  Casa Naturaleh
                </span>

                <h2 className="mt-3 text-xl font-semibold">
                  Continuar comprando
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/70">
                  Explore novos produtos para complementar sua rotina.
                </p>

                <span className="mt-5 inline-block text-sm font-semibold">
                  Ir para a loja →
                </span>
              </Link>
            </section>

          </div>
        </div>
      </section>
    </main>
    </ProtectedRoute>
  );
}