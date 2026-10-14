import { Suspense } from "react";
import LojaCatalogo, { CatalogoLoading } from "./LojaCatalogo";

export default function LojaPage() {
  return (
    <div className="bg-[var(--color-bg)] text-[var(--color-text)]">
      <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)] cn-brand-text">Loja</span>
          <h1 className="mt-3 text-4xl font-normal md:text-6xl">Encontre o que faz sentido para a sua rotina.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-text-light)] md:text-lg">Explore nossa seleção de produtos para saúde, bem-estar, suplementação e uma rotina mais equilibrada.</p>
        </div>
      </section>
      <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-10"><CatalogoLoading /></div>}>
        <LojaCatalogo />
      </Suspense>
    </div>
  );
}
