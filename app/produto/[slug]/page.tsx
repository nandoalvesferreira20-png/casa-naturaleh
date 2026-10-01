import Image from "next/image";
import { notFound } from "next/navigation";

import ProductActions from "../../components/ProductActions";
import ProductCard from "../../components/ProductCard";
import { produtos } from "../../data/produtos";

type ProdutoPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProdutoPage({
  params,
}: ProdutoPageProps) {
  const { slug } = await params;

  const produto = produtos.find(
    (item) => item.slug === slug
  );

  if (!produto) {
    notFound();
  }

  const produtosRelacionados = produtos
    .filter((item) => item.id !== produto.id)
    .slice(0, 4);

  return (
    <main className="bg-[var(--color-bg)] text-[var(--color-text)]">

      <section className="py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2">

          {/* Imagem do produto */}
          <div className="relative flex h-[520px] items-center justify-center overflow-hidden rounded-[2rem] bg-[var(--color-bg-soft)]">
            <Image
              src={produto.imagem}
              alt={produto.nome}
              fill
              sizes="(min-width: 1280px) 592px, (min-width: 1024px) 50vw, 100vw"
              className="object-contain p-6"
            />
          </div>

          {/* Informações do produto */}
          <div className="flex flex-col justify-center">

            <span className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-primary)]">
              {produto.categoria}
            </span>

            <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">
              {produto.nome}
            </h1>

            <span className="mt-6 text-3xl font-semibold">
              {produto.preco.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>

            <p className="mt-6 max-w-xl leading-7 text-[var(--color-text-light)]">
              {produto.descricao}
            </p>

            <ProductActions
              id={produto.id}
              nome={produto.nome}
              preco={produto.preco}
              slug={produto.slug}
              imagem={produto.imagem}
            />

            {/* Benefícios */}
            <div className="mt-10 grid gap-4 border-t border-black/10 pt-8 sm:grid-cols-3">

              <div className="rounded-[1.25rem] bg-white p-4">
                <h3 className="text-sm font-semibold">
                  Compra segura
                </h3>

                <p className="mt-2 text-xs leading-5 text-[var(--color-text-light)]">
                  Seus dados protegidos durante todo o processo.
                </p>
              </div>

              <div className="rounded-[1.25rem] bg-white p-4">
                <h3 className="text-sm font-semibold">
                  Produto selecionado
                </h3>

                <p className="mt-2 text-xs leading-5 text-[var(--color-text-light)]">
                  Curadoria feita pela Casa Naturaleh.
                </p>
              </div>

              <div className="rounded-[1.25rem] bg-white p-4">
                <h3 className="text-sm font-semibold">
                  Entrega
                </h3>

                <p className="mt-2 text-xs leading-5 text-[var(--color-text-light)]">
                  Frete calculado na finalização da compra.
                </p>
              </div>

            </div>

            {/* Informações adicionais */}
            <div className="mt-8 rounded-[1.5rem] bg-[var(--color-bg-soft)] p-6">
              <h2 className="text-lg font-semibold">
                Informações do produto
              </h2>

              <ul className="mt-4 space-y-3 text-sm text-[var(--color-text-light)]">
                <li>
                  • Produto selecionado pela Casa Naturaleh
                </li>

                <li>
                  • Consulte disponibilidade em estoque
                </li>

                <li>
                  • Envio e retirada serão calculados no checkout
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Produtos recomendados */}
      <section className="border-t border-black/5 bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">

          <div className="mb-10">
            <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
              Continue explorando
            </span>

            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              Você também pode gostar
            </h2>

            <p className="mt-3 text-[var(--color-text-light)]">
              Outros produtos selecionados para complementar sua rotina.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {produtosRelacionados.map((item) => (
              <ProductCard
                key={item.id}
                nome={item.nome}
                categoria={item.categoria}
                preco={item.preco}
                slug={item.slug}
                imagem={item.imagem}
              />
            ))}
          </div>

        </div>
      </section>

    </main>
  );
}