import ProductCard from "../components/ProductCard";

import { produtos } from "../data/produtos";

export default function LojaPage() {
  return (
    <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
      <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
            Loja
          </span>

          <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
            Encontre o que faz sentido para a sua rotina.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--color-text-light)] md:text-lg">
            Explore nossa seleção de produtos para saúde, bem-estar,
            suplementação e uma rotina mais equilibrada.
          </p>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
            <input
              type="text"
              placeholder="Buscar produto..."
              className="w-full rounded-full border border-black/10 bg-white px-5 py-3 text-sm outline-none transition focus:border-[var(--color-primary)]"
            />

            <select className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm outline-none">
              <option>Todas as categorias</option>
              <option>Suplementos</option>
              <option>Proteínas</option>
              <option>Produtos Naturais</option>
              <option>Bem-estar</option>
            </select>

            <select className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm outline-none">
              <option>Ordenar por</option>
              <option>Menor preço</option>
              <option>Maior preço</option>
              <option>Mais recentes</option>
            </select>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 flex items-center justify-between">
            <p className="text-sm text-[var(--color-text-light)]">
              {produtos.length} produtos encontrados
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {produtos.map((produto) => (
              <ProductCard
                key={produto.id}
                nome={produto.nome}
                categoria={produto.categoria}
                preco={produto.preco}
                slug={produto.slug}
                imagem={produto.imagem}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}