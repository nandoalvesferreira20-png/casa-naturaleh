"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { totalItens } = useCart();
  const { user } = useAuth();

  const nomeUsuario =
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Usuário";

  return (
    <header className="w-full border-b border-black/5 bg-[var(--color-bg)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/brand/logo-casa-naturaleh.png"
            alt="Casa Naturaleh"
            width={150}
            height={60}
            className="h-auto w-[130px] object-contain md:w-[150px]"
            preload
          />
        </Link>

        <nav aria-label="Navegação principal" className="cn-nav hidden items-center gap-6 xl:flex">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--color-text)] transition hover:text-[var(--color-primary)] cn-brand-text"
          >
            Home
          </Link>

          <Link
            href="/nossa-historia"
            className="text-sm font-medium text-[var(--color-text)] transition hover:text-[var(--color-primary)] cn-brand-text"
          >
            Nossa História
          </Link>

          <Link
            href="/loja"
            className="text-sm font-medium text-[var(--color-text)] transition hover:text-[var(--color-primary)] cn-brand-text"
          >
            Loja
          </Link>

          <Link
            href="/meus-pedidos"
            className="text-sm font-medium text-[var(--color-text)] transition hover:text-[var(--color-primary)] cn-brand-text"
          >
            Meus Pedidos
          </Link>

          <Link
            href="/minha-conta"
            className="text-sm font-medium text-[var(--color-text)] transition hover:text-[var(--color-primary)] cn-brand-text"
          >
            Minha Conta
          </Link>
        </nav>

        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {user ? (
            <Link
              href="/minha-conta"
              className="max-w-[120px] truncate rounded-full border border-black/10 px-3 py-2 text-sm font-medium transition hover:bg-black/5 sm:max-w-[180px] cn-button-secondary"
              title={`Olá, ${nomeUsuario}`}
            >
              Olá, {nomeUsuario}
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium cn-button-primary"
            >
              Entrar
            </Link>
          )}

          <Link
            href="/carrinho"
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl"
            aria-label="Carrinho"
          >
            🛒

            {totalItens > 0 && (
              <span className="absolute -right-3 -top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-xs font-semibold text-white">
                {totalItens}
              </span>
            )}
          </Link>
        </div>
      </div>
      <details className="border-t border-[var(--color-border)] px-5 pb-3 xl:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Menu</summary>
        <nav aria-label="Navegação principal no celular" className="grid grid-cols-2 gap-x-4">
          <Link href="/" className="cn-nav-link text-sm">Home</Link>
          <Link href="/nossa-historia" className="cn-nav-link text-sm">Nossa História</Link>
          <Link href="/loja" className="cn-nav-link text-sm">Loja</Link>
          <Link href="/meus-pedidos" className="cn-nav-link text-sm">Meus Pedidos</Link>
          <Link href="/minha-conta" className="cn-nav-link text-sm">Minha Conta</Link>
        </nav>
      </details>
    </header>
  );
}
