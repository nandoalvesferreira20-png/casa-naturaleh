import Image from "next/image";
import Link from "next/link";

const endereco = "Av. Francisco Prestes Maia, 561 - Centro, São Bernardo do Campo - SP, 09770-000";
const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
const linkClass = "inline-flex min-h-11 items-center gap-2 rounded-sm text-sm leading-6 text-[var(--color-bg-soft)] transition-colors hover:text-[var(--color-white)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-bg-soft)] motion-reduce:transition-none";
const headingClass = "cn-ui-title text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-white)]";
const navegacao = [
  { href: "/", texto: "Início" },
  { href: "/nossa-historia", texto: "Nossa História" },
  { href: "/loja", texto: "Loja" },
  { href: "/meus-pedidos", texto: "Meus Pedidos" },
  { href: "/minha-conta", texto: "Minha Conta" },
  { href: "/login", texto: "Entrar" },
];

export default function Footer() {
  const ano = new Date().getFullYear();

  return (
    <footer className="cn-on-dark bg-[var(--color-dark)] text-[var(--color-white)]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 md:grid-cols-2 md:gap-12 lg:grid-cols-[1fr_0.8fr_1.1fr_1.2fr] lg:gap-8 lg:py-16">
        <div className="min-w-0">
          <Link href="/" aria-label="Casa Naturaleh — página inicial" className="inline-flex w-full max-w-64 items-center rounded-lg bg-[var(--color-bg)] px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-bg-soft)]">
            <Image src="/images/brand/logo-casa-naturaleh.png" alt="Casa Naturaleh" width={749} height={333} sizes="256px" className="h-auto w-full object-contain" />
          </Link>
          <p className="mt-5 text-sm leading-7 text-[var(--color-bg-soft)]">Viva com leveza e propósito</p>
        </div>

        <nav aria-labelledby="footer-navegacao" className="min-w-0">
          <h2 id="footer-navegacao" className={headingClass}>Navegação</h2>
          <ul className="mt-4">
            {navegacao.map(link => <li key={link.href}><Link href={link.href} className={linkClass}>{link.texto}</Link></li>)}
          </ul>
        </nav>

        <section aria-labelledby="footer-atendimento" className="min-w-0">
          <h2 id="footer-atendimento" className={headingClass}>Atendimento</h2>
          <div className="mt-5 flex flex-col items-start gap-3">
            <a href="https://wa.me/5511999572975" target="_blank" rel="noopener noreferrer" className={`${linkClass} rounded-full border border-[var(--color-primary)] px-5 py-2 hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-dark)] cn-button-secondary`}>
              WhatsApp <span aria-hidden="true">↗</span><span className="sr-only"> (abre em nova aba)</span>
            </a>
            <p className="text-xs leading-6 text-[var(--color-bg-soft)]">(11) 99957-2975</p>
            <a href="https://www.instagram.com/casanaturaleh/" target="_blank" rel="noopener noreferrer" className={linkClass}>
              <span><span className="block text-xs">Instagram</span>@casanaturaleh</span><span aria-hidden="true">↗</span><span className="sr-only"> (abre em nova aba)</span>
            </a>
            <a href="mailto:casanaturaleh@gmail.com" className={`${linkClass} max-w-full break-all`}>
              <span><span className="block text-xs">E-mail</span>casanaturaleh@gmail.com</span>
            </a>
          </div>
        </section>

        <section aria-labelledby="footer-loja" className="min-w-0">
          <h2 id="footer-loja" className={headingClass}>Nossa loja</h2>
          <address className="mt-5 not-italic">
            <a href={mapa} target="_blank" rel="noopener noreferrer" className={linkClass}>
              <span>{endereco}<span className="sr-only"> (abrir localização no Google Maps em nova aba)</span></span>
            </a>
          </address>
          <h3 className="mt-6 text-sm font-medium">Horário de funcionamento</h3>
          <dl className="mt-3 space-y-3 text-sm leading-6 text-[var(--color-bg-soft)]">
            <div><dt>Segunda a sexta</dt><dd>08:00 às 19:00</dd></div>
            <div><dt>Sábado</dt><dd>08:00 às 15:00</dd></div>
          </dl>
        </section>
      </div>

      <div className="border-t border-[var(--color-primary)]/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs leading-6 text-[var(--color-bg-soft)] lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <p>CNPJ 60.354.678/0001-02</p>
          <p>© {ano} Casa Naturaleh. Todos os direitos reservados.</p>
          <p>Desenvolvido por Loung Tech</p>
        </div>
      </div>
    </footer>
  );
}
