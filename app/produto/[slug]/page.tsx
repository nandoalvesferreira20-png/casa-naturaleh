import Image from "next/image";
import { notFound } from "next/navigation";

import ProductActions from "../../components/ProductActions";
import ProductCard from "../../components/ProductCard";
import { supabase } from "../../lib/supabase";

type Produto = {
  id: string;
  nome: string;
  slug: string;
  categoria: string;
  preco: number;
  imagem: string;
  descricao: string | null;
  estoque: number;
  ativo: boolean;
  criado_em?: string;
};

type ProdutoPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProdutoPage({
  params,
}: ProdutoPageProps) {
  const { slug } = await params;

  const {
    data: produto,
    error,
  } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao buscar produto:",
      error
    );

    notFound();
  }

  if (!produto) {
    notFound();
  }

  const produtoAtual =
    produto as Produto;

  const {
    data: relacionados,
    error: erroRelacionados,
  } = await supabase
    .from("products")
    .select("*")
    .eq("ativo", true)
    .neq(
      "id",
      produtoAtual.id
    )
    .order(
      "criado_em",
      {
        ascending: false,
      }
    )
    .limit(4);

  if (erroRelacionados) {
    console.error(
      "Erro ao buscar produtos relacionados:",
      erroRelacionados
    );
  }

  const produtosRelacionados =
    (relacionados ?? []) as Produto[];

  return (
    <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
      <section className="py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2">

          {/* Imagem do produto */}
          <div className="relative flex h-[520px] items-center justify-center overflow-hidden rounded-[2rem] bg-[var(--color-bg-soft)]">
            <Image
              src={produtoAtual.imagem}
              alt={produtoAtual.nome}
              fill
              sizes="(min-width: 1280px) 592px, (min-width: 1024px) 50vw, 100vw"
              className="object-contain p-6"
              priority
            />
          </div>

          {/* Informações do produto */}
          <div className="flex flex-col justify-center">
            <span className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-primary)]">
              {produtoAtual.categoria}
            </span>

            <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">
              {produtoAtual.nome}
            </h1>

            <span className="mt-6 text-3xl font-semibold">
              {produtoAtual.preco.toLocaleString(
                "pt-BR",
                {
                  style: "currency",
                  currency: "BRL",
                }
              )}
            </span>

            {produtoAtual.descricao && (
              <p className="mt-6 max-w-xl leading-7 text-[var(--color-text-light)]">
                {produtoAtual.descricao}
              </p>
            )}

            <ProductActions
              id={produtoAtual.id}
              nome={produtoAtual.nome}
              preco={produtoAtual.preco}
              slug={produtoAtual.slug}
              imagem={produtoAtual.imagem}
              estoque={produtoAtual.estoque}
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
                  •{" "}
                  {produtoAtual.estoque > 0
                    ? `${produtoAtual.estoque} ${
                        produtoAtual.estoque === 1
                          ? "unidade disponível"
                          : "unidades disponíveis"
                      }`
                    : "Produto indisponível no momento"}
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
      {produtosRelacionados.length > 0 && (
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
              {produtosRelacionados.map(
                (item) => (
                  <ProductCard
                    key={item.id}
                    nome={item.nome}
                    categoria={
                      item.categoria
                    }
                    preco={item.preco}
                    slug={item.slug}
                    imagem={item.imagem}
                    estoque={item.estoque}
                  />
                )
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
