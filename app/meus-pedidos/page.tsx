import Link from "next/link";
import ProtectedRoute from "../components/ProtectedRoute";

const pedidos = [
  {
    id: "CN-1024",
    data: "28/09/2026",
    status: "Em preparação",
    total: 219.8,
    itens: 3,
  },
  {
    id: "CN-1018",
    data: "15/09/2026",
    status: "Entregue",
    total: 129.9,
    itens: 1,
  },
  {
    id: "CN-1009",
    data: "02/09/2026",
    status: "Entregue",
    total: 94.8,
    itens: 2,
  },
];

export default function MeusPedidosPage() {
  return (
    <ProtectedRoute>
      <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
        <section className="border-b border-black/5">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
            <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
              Minha conta
            </span>

          <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
            Meus pedidos
          </h1>

          <p className="mt-4 max-w-2xl text-[var(--color-text-light)]">
            Acompanhe suas compras e consulte pedidos anteriores.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[280px_1fr]">

          <aside className="h-fit rounded-[1.5rem] bg-white p-4">
            <nav className="flex flex-col gap-2">
              <Link
                href="/minha-conta"
                className="rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-black/5"
              >
                Meus dados
              </Link>

              <Link
                href="/meus-pedidos"
                className="rounded-xl bg-[var(--color-bg-soft)] px-4 py-3 text-sm font-semibold"
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

          <div>
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  Histórico de pedidos
                </h2>

                <p className="mt-2 text-sm text-[var(--color-text-light)]">
                  {pedidos.length} pedidos encontrados
                </p>
              </div>

              <Link
                href="/loja"
                className="text-sm font-semibold text-[var(--color-primary)] transition hover:opacity-70"
              >
                Continuar comprando →
              </Link>
            </div>

            <div className="space-y-5">
              {pedidos.map((pedido) => (
                <article
                  key={pedido.id}
                  className="rounded-[1.5rem] border border-black/5 bg-white p-6"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold">
                          Pedido {pedido.id}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            pedido.status === "Entregue"
                              ? "bg-green-100 text-green-700"
                              : "bg-[var(--color-bg-soft)] text-[var(--color-primary)]"
                          }`}
                        >
                          {pedido.status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-[var(--color-text-light)]">
                        Realizado em {pedido.data}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-8">
                      <div>
                        <span className="text-xs uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                          Itens
                        </span>

                        <p className="mt-1 font-semibold">
                          {pedido.itens}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                          Total
                        </span>

                        <p className="mt-1 font-semibold">
                          {pedido.total.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="cursor-pointer rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-black/5"
                      >
                        Ver detalhes
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

        </div>
      </section>
    </main>
    </ProtectedRoute>
  );
}