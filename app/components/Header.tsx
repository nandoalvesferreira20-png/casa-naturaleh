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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/brand/logo-casa-naturaleh.png"
            alt="Casa Naturaleh"
            width={150}
            height={60}
            className="h-auto w-[130px] object-contain md:w-[150px]"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--color-text)] transition hover:text-[var(--color-primary)]"
          >
            Home
          </Link>

          <Link
            href="/nossa-historia"
            className="text-sm font-medium text-[var(--color-text)] transition hover:text-[var(--color-primary)]"
          >
            Nossa História
          </Link>

          <Link
            href="/loja"
            className="text-sm font-medium text-[var(--color-text)] transition hover:text-[var(--color-primary)]"
          >
            Loja
          </Link>

          <Link
            href="/meus-pedidos"
            className="text-sm font-medium text-[var(--color-text)] transition hover:text-[var(--color-primary)]"
          >
            Meus Pedidos
          </Link>

          <Link
            href="/minha-conta"
            className="text-sm font-medium text-[var(--color-text)] transition hover:text-[var(--color-primary)]"
          >
            Minha Conta
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <Link
              href="/minha-conta"
              className="max-w-[180px] truncate rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-black/5"
              title={`Olá, ${nomeUsuario}`}
            >
              Olá, {nomeUsuario}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-black/5"
            >
              Entrar
            </Link>
          )}

          <Link
            href="/carrinho"
            className="relative text-xl"
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
    </header>
  );
}