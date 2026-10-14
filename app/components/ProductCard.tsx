import Image from "next/image";

type ProductCardProps = {
  nome: string;
  categoria: string;
  preco: number;
  slug: string;
  imagem: string;
  estoque: number;
  headingLevel?: 2 | 3;
};

export default function ProductCard({
  nome,
  categoria,
  preco,
  slug,
  imagem,
  estoque,
  headingLevel = 2,
}: ProductCardProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const precoFormatado = preco.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-black/5 bg-white transition hover:-translate-y-1 hover:shadow-md cn-card">
      <div className="relative flex h-64 shrink-0 items-center justify-center overflow-hidden bg-[var(--color-bg-soft)]">
        <Image
          src={imagem}
          alt={nome}
          fill
          sizes="(min-width: 1280px) 290px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-contain p-5"
        />
        {estoque <= 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--color-bg)] px-3 py-1 text-xs font-medium text-[var(--color-text)]">
            Sem estoque
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <span className="block h-4 truncate text-xs font-medium uppercase leading-4 tracking-[0.18em] text-[var(--color-primary)] cn-brand-text">
          {categoria}
        </span>

        <Heading title={nome} className="cn-ui-title mt-2 line-clamp-2 h-14 min-h-14 break-words text-lg font-semibold leading-7">
          {nome}
        </Heading>

        <div className="mt-auto flex min-h-16 flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-5">
          <span className="whitespace-nowrap text-lg font-semibold tabular-nums">
            {precoFormatado}
          </span>

          <a
            href={`/produto/${slug}`}
            className="inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 cn-button-primary"
          >
            Ver produto
          </a>
        </div>
      </div>
    </article>
  );
}
