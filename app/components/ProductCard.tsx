import Image from "next/image";

type ProductCardProps = {
  nome: string;
  categoria: string;
  preco: number;
  slug: string;
  imagem: string;
};

export default function ProductCard({
  nome,
  categoria,
  preco,
  slug,
  imagem,
}: ProductCardProps) {
  const precoFormatado = preco.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-white transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative overflow-hidden flex h-64 items-center justify-center bg-[var(--color-bg-soft)]">
        <Image
          src={imagem}
          alt={nome}
          fill
          sizes="(min-width: 1280px) 290px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-contain p-5"
        />
      </div>

      <div className="p-5">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-primary)]">
          {categoria}
        </span>

        <h2 className="mt-2 text-lg font-semibold">
          {nome}
        </h2>

        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="text-lg font-semibold">
            {precoFormatado}
          </span>

          <a
            href={`/produto/${slug}`}
            className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Ver produto
          </a>
        </div>
      </div>
    </article>
  );
}