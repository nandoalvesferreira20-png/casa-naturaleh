import Image from "next/image";

export default function Home() {
  return (
    <main>
      <section className="min-h-[75vh] bg-[var(--color-bg)]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-20 md:grid-cols-2">
          
          <div>
            <span className="mb-4 block text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
              Casa Naturaleh
            </span>

            <h1 className="max-w-xl text-4xl font-semibold leading-tight text-[var(--color-dark)] md:text-6xl">
              Bem-estar, saúde e escolhas mais naturais para o seu dia.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-[var(--color-text-light)] md:text-lg">
              Produtos selecionados para quem busca cuidar do corpo, da rotina
              e da qualidade de vida.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/loja"
                className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-[var(--color-white)] transition hover:bg-[var(--color-dark)]"
              >
                Conhecer a loja
              </a>

              <a
                href="/nossa-historia"
                className="rounded-full border border-[var(--color-primary)] px-6 py-3 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-[var(--color-white)]"
              >
                Nossa história
              </a>
            </div>
          </div>

          <div className="relative overflow-hidden flex min-h-[420px] items-center justify-center rounded-[2rem] bg-[var(--color-bg-soft)]">
            <Image
              src="/images/hero/casa-naturaleh.jpg"
              alt="Casa Naturaleh"
              fill
              sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          </div>

        </div>
      </section>
      <section className="bg-[var(--color-white)] py-20">
  <div className="mx-auto max-w-7xl px-6">
    
    <div className="mb-10 flex items-end justify-between gap-6">
      <div>
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
          Explore
        </span>

        <h2 className="mt-3 text-3xl font-semibold text-[var(--color-dark)] md:text-4xl">
          Categorias
        </h2>

        <p className="mt-3 max-w-2xl text-[var(--color-text-light)]">
          Encontre produtos para diferentes momentos da sua rotina.
        </p>
      </div>

      <a
        href="/loja"
        className="hidden text-sm font-medium text-[var(--color-primary)] transition hover:opacity-70 md:block"
      >
        Ver todos os produtos →
      </a>
    </div>

    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

      <a
        href="/loja"
        className="group rounded-[1.5rem] border border-[var(--color-bg-soft)] bg-[var(--color-bg)] p-5 transition hover:-translate-y-1 hover:shadow-md"
      >
        <div className="mb-5 flex h-48 items-center justify-center rounded-[1.2rem] bg-[var(--color-bg-soft)] text-sm text-[var(--color-text-light)]">
          imagem
        </div>

        <h3 className="text-lg font-semibold text-[var(--color-dark)]">
          Suplementos
        </h3>

        <p className="mt-2 text-sm leading-6 text-[var(--color-text-light)]">
          Produtos para performance, energia e recuperação.
        </p>

        <span className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)]">
          Explorar →
        </span>
      </a>

      <a
        href="/loja"
        className="group rounded-[1.5rem] border border-[var(--color-bg-soft)] bg-[var(--color-bg)] p-5 transition hover:-translate-y-1 hover:shadow-md"
      >
        <div className="mb-5 flex h-48 items-center justify-center rounded-[1.2rem] bg-[var(--color-bg-soft)] text-sm text-[var(--color-text-light)]">
          imagem
        </div>

        <h3 className="text-lg font-semibold text-[var(--color-dark)]">
          Produtos Naturais
        </h3>

        <p className="mt-2 text-sm leading-6 text-[var(--color-text-light)]">
          Opções selecionadas para uma rotina mais equilibrada.
        </p>

        <span className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)]">
          Explorar →
        </span>
      </a>

      <a
        href="/loja"
        className="group rounded-[1.5rem] border border-[var(--color-bg-soft)] bg-[var(--color-bg)] p-5 transition hover:-translate-y-1 hover:shadow-md"
      >
        <div className="mb-5 flex h-48 items-center justify-center rounded-[1.2rem] bg-[var(--color-bg-soft)] text-sm text-[var(--color-text-light)]">
          imagem
        </div>

        <h3 className="text-lg font-semibold text-[var(--color-dark)]">
          Bem-estar
        </h3>

        <p className="mt-2 text-sm leading-6 text-[var(--color-text-light)]">
          Produtos pensados para autocuidado e qualidade de vida.
        </p>

        <span className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)]">
          Explorar →
        </span>
      </a>

      <a
        href="/loja"
        className="group rounded-[1.5rem] border border-[var(--color-bg-soft)] bg-[var(--color-bg)] p-5 transition hover:-translate-y-1 hover:shadow-md"
      >
        <div className="mb-5 flex h-48 items-center justify-center rounded-[1.2rem] bg-[var(--color-bg-soft)] text-sm text-[var(--color-text-light)]">
          imagem
        </div>

        <h3 className="text-lg font-semibold text-[var(--color-dark)]">
          Cafeteria
        </h3>

        <p className="mt-2 text-sm leading-6 text-[var(--color-text-light)]">
          Sabores e experiências para aproveitar na Casa Naturaleh.
        </p>

        <span className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)]">
          Conhecer →
        </span>
      </a>

    </div>

    <a
      href="/loja"
      className="mt-8 inline-block text-sm font-medium text-[var(--color-primary)] md:hidden"
    >
      Ver todos os produtos →
    </a>

  </div>
</section>
<section className="bg-[var(--color-bg)] py-20">
  <div className="mx-auto max-w-7xl px-6">

    <div className="mb-10 flex items-end justify-between gap-6">
      <div>
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
          Selecionados para você
        </span>

        <h2 className="mt-3 text-3xl font-semibold text-[var(--color-dark)] md:text-4xl">
          Produtos em destaque
        </h2>

        <p className="mt-3 max-w-2xl text-[var(--color-text-light)]">
          Alguns dos produtos mais procurados da Casa Naturaleh.
        </p>
      </div>

      <a
        href="/loja"
        className="hidden text-sm font-medium text-[var(--color-primary)] transition hover:opacity-70 md:block"
      >
        Ver loja completa →
      </a>
    </div>

    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

      <article className="overflow-hidden rounded-[1.5rem] border border-[var(--color-bg-soft)] bg-[var(--color-white)] transition hover:-translate-y-1 hover:shadow-md">
        <div className="relative overflow-hidden flex h-64 items-center justify-center bg-[var(--color-bg-soft)] text-sm text-[var(--color-text-light)]">
          <Image
            src="/images/produtos/creatina.jpg"
            alt="Creatina Monohidratada"
            fill
            sizes="(min-width: 1280px) 290px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-5"
          />
        </div>

        <div className="p-5">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-light)]">
            Suplementos
          </span>

          <h3 className="mt-2 text-lg font-semibold text-[var(--color-dark)]">
            Creatina Monohidratada
          </h3>

          <p className="mt-2 text-sm text-[var(--color-text-light)]">
            Produto para auxiliar no desempenho e recuperação muscular.
          </p>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-lg font-semibold text-[var(--color-dark)]">
              R$ 89,90
            </span>

            <a
              href="/produto/creatina-monohidratada"
              className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-white)] transition hover:bg-[var(--color-dark)]"
            >
              Ver produto
            </a>
          </div>
        </div>
      </article>

      <article className="overflow-hidden rounded-[1.5rem] border border-[var(--color-bg-soft)] bg-[var(--color-white)] transition hover:-translate-y-1 hover:shadow-md">
        <div className="relative overflow-hidden flex h-64 items-center justify-center bg-[var(--color-bg-soft)] text-sm text-[var(--color-text-light)]">
          <Image
            src="/images/produtos/whey.jpg"
            alt="Whey Protein"
            fill
            sizes="(min-width: 1280px) 290px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-5"
          />
        </div>

        <div className="p-5">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-light)]">
            Proteínas
          </span>

          <h3 className="mt-2 text-lg font-semibold text-[var(--color-dark)]">
            Whey Protein
          </h3>

          <p className="mt-2 text-sm text-[var(--color-text-light)]">
            Proteína para complementar sua rotina de treino e nutrição.
          </p>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-lg font-semibold text-[var(--color-dark)]">
              R$ 129,90
            </span>

            <a
              href="/produto/whey-protein"
              className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-white)] transition hover:bg-[var(--color-dark)]"
            >
              Ver produto
            </a>
          </div>
        </div>
      </article>

      <article className="overflow-hidden rounded-[1.5rem] border border-[var(--color-bg-soft)] bg-[var(--color-white)] transition hover:-translate-y-1 hover:shadow-md">
        <div className="relative overflow-hidden flex h-64 items-center justify-center bg-[var(--color-bg-soft)] text-sm text-[var(--color-text-light)]">
          <Image
            src="/images/produtos/pasta de amendoim.jpg"
            alt="Pasta de Amendoim"
            fill
            sizes="(min-width: 1280px) 290px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-5"
          />
        </div>

        <div className="p-5">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-light)]">
            Naturais
          </span>

          <h3 className="mt-2 text-lg font-semibold text-[var(--color-dark)]">
            Pasta de Amendoim
          </h3>

          <p className="mt-2 text-sm text-[var(--color-text-light)]">
            Opção prática e saborosa para complementar suas refeições.
          </p>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-lg font-semibold text-[var(--color-dark)]">
              R$ 34,90
            </span>

            <a
              href="/produto/pasta-de-amendoim"
              className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-white)] transition hover:bg-[var(--color-dark)]"
            >
              Ver produto
            </a>
          </div>
        </div>
      </article>

      <article className="overflow-hidden rounded-[1.5rem] border border-[var(--color-bg-soft)] bg-[var(--color-white)] transition hover:-translate-y-1 hover:shadow-md">
        <div className="relative overflow-hidden flex h-64 items-center justify-center bg-[var(--color-bg-soft)] text-sm text-[var(--color-text-light)]">
          <Image
            src="/images/produtos/chá.jpg"
            alt="Chá Funcional"
            fill
            sizes="(min-width: 1280px) 290px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-5"
          />
        </div>

        <div className="p-5">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-light)]">
            Bem-estar
          </span>

          <h3 className="mt-2 text-lg font-semibold text-[var(--color-dark)]">
            Chá Funcional
          </h3>

          <p className="mt-2 text-sm text-[var(--color-text-light)]">
            Uma opção para tornar sua rotina mais leve e equilibrada.
          </p>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-lg font-semibold text-[var(--color-dark)]">
              R$ 24,90
            </span>

            <a
              href="/produto/cha-funcional"
              className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-white)] transition hover:bg-[var(--color-dark)]"
            >
              Ver produto
            </a>
          </div>
        </div>
      </article>

    </div>

    <a
      href="/loja"
      className="mt-8 inline-block text-sm font-medium text-[var(--color-primary)] md:hidden"
    >
      Ver loja completa →
    </a>

  </div>
</section>
<section className="bg-[var(--color-white)] py-20">
  <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">

    <div className="relative overflow-hidden flex min-h-[420px] items-center justify-center rounded-[2rem] bg-[var(--color-bg-soft)]">
      <Image
        src="/images/hero/loja.jpg"
        alt="Loja Casa Naturaleh"
        fill
        sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw"
        className="object-cover"
      />
    </div>

    <div>
      <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
        Nossa Essência
      </span>

      <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--color-dark)] md:text-5xl">
        Cuidar de você começa nas escolhas do dia a dia.
      </h2>

      <p className="mt-6 text-base leading-7 text-[var(--color-text-light)] md:text-lg">
        A Casa Naturaleh nasceu com o propósito de aproximar saúde, bem-estar e
        uma rotina mais equilibrada de forma simples e acolhedora.
      </p>

      <p className="mt-4 text-base leading-7 text-[var(--color-text-light)]">
        Selecionamos produtos que fazem sentido para diferentes momentos da sua
        rotina, sempre buscando qualidade, praticidade e uma experiência que vá
        além da compra.
      </p>

      <a
        href="/nossa-historia"
        className="mt-8 inline-flex rounded-full border border-[var(--color-primary)] px-6 py-3 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-[var(--color-white)]"
      >
        Conheça nossa história
      </a>
    </div>

  </div>
</section>
<section className="bg-[var(--color-bg-soft)] py-20">
  <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">

    <div>
      <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
        Mais que uma loja
      </span>

      <h2 className="mt-3 text-3xl font-semibold leading-tight text-[var(--color-dark)] md:text-5xl">
        Um espaço para viver o bem-estar de perto.
      </h2>

      <p className="mt-6 text-base leading-7 text-[var(--color-text-light)] md:text-lg">
        A experiência da Casa Naturaleh também acontece no nosso espaço físico,
        com cafeteria, produtos selecionados e um ambiente pensado para tornar
        cada visita mais leve e acolhedora.
      </p>

      <p className="mt-4 text-base leading-7 text-[var(--color-text-light)]">
        Aqui, cada detalhe faz parte da proposta de criar uma conexão mais
        natural com a sua rotina.
      </p>

      <div className="mt-8 flex flex-wrap gap-4">
        <a
          href="#"
          className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-[var(--color-white)] transition hover:bg-[var(--color-dark)]"
        >
          Ver menu da cafeteria
        </a>

        <a
          href="#"
          className="rounded-full border border-[var(--color-primary)] px-6 py-3 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-[var(--color-white)]"
        >
          Como chegar
        </a>
      </div>
    </div>

    <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] bg-[var(--color-bg-soft)]">
      <span className="text-sm text-[var(--color-text-light)]">
        imagem da cafeteria aqui
      </span>
    </div>

  </div>
</section>
<section className="bg-[var(--color-primary)] py-20">
  <div className="mx-auto max-w-5xl px-6 text-center">
    <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-bg-soft)]">
      Casa Naturaleh
    </span>

    <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--color-white)] md:text-5xl">
      Escolhas mais naturais começam por uma rotina mais consciente.
    </h2>

    <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[var(--color-bg-soft)] md:text-lg">
      Conheça nossos produtos e descubra opções pensadas para saúde,
      bem-estar e qualidade de vida.
    </p>

    <div className="mt-8 flex flex-wrap justify-center gap-4">
      <a
        href="/loja"
        className="rounded-full bg-[var(--color-white)] px-6 py-3 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-bg)]"
      >
        Ir para a loja
      </a>

      <a
        href="/nossa-historia"
        className="rounded-full border border-[var(--color-white)] px-6 py-3 text-sm font-medium text-[var(--color-white)] transition hover:bg-[var(--color-white)] hover:text-[var(--color-primary)]"
      >
        Conhecer a Casa Naturaleh
      </a>
    </div>
  </div>
</section>
    </main>
  );
}