import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[var(--color-dark)] text-[var(--color-white)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-4">

        <div>
          <h2 className="text-xl font-semibold">
            Casa Naturaleh
          </h2>

          <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--color-bg-soft)]">
            Saúde, bem-estar e escolhas mais naturais para fazer parte da sua
            rotina.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em]">
            Navegação
          </h3>

          <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--color-bg-soft)]">
            <Link href="/" className="transition hover:text-[var(--color-white)]">
              Home
            </Link>

            <Link
              href="/nossa-historia"
              className="transition hover:text-[var(--color-white)]"
            >
              Nossa História
            </Link>

            <Link href="/loja" className="transition hover:text-[var(--color-white)]">
              Loja
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em]">
            Sua conta
          </h3>

          <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--color-bg-soft)]">
            <Link href="/login" className="transition hover:text-[var(--color-white)]">
              Entrar
            </Link>

            <Link
              href="/minha-conta"
              className="transition hover:text-[var(--color-white)]"
            >
              Minha Conta
            </Link>

            <Link
              href="/meus-pedidos"
              className="transition hover:text-[var(--color-white)]"
            >
              Meus Pedidos
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em]">
            Atendimento
          </h3>

          <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--color-bg-soft)]">
            <a href="#" className="transition hover:text-[var(--color-white)]">
              WhatsApp
            </a>

            <a href="#" className="transition hover:text-[var(--color-white)]">
              Instagram
            </a>

            <a href="#" className="transition hover:text-[var(--color-white)]">
              Como chegar
            </a>
          </div>
        </div>

      </div>

      <div className="border-t border-[var(--color-white)]/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-xs text-[var(--color-bg-soft)] md:flex-row md:items-center md:justify-between">
          <p>
            © 2026 Casa Naturaleh. Todos os direitos reservados.
          </p>

          <p>
            Desenvolvido por Loung Tech
          </p>
        </div>
      </div>
    </footer>
  );
}