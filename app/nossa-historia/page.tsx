export default function NossaHistoriaPage() {
  return (
    <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
      
      <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
            Nossa História
          </span>

          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            Mais que uma loja, um espaço pensado para escolhas mais conscientes.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--color-text-light)] md:text-lg">
            A Casa Naturaleh nasceu com o propósito de aproximar saúde,
            bem-estar e uma rotina mais equilibrada de forma simples,
            acolhedora e acessível.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
          
          <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] bg-[var(--color-bg-soft)]">
            <span className="text-sm text-[var(--color-text-light)]">
              imagem da história aqui
            </span>
          </div>

          <div>
            <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
              Como tudo começou
            </span>

            <h2 className="mt-3 text-3xl font-semibold leading-tight md:text-5xl">
              Um cuidado que começou com propósito.
            </h2>

            <p className="mt-6 text-base leading-7 text-[var(--color-text-light)]">
              Desde o início, a Casa Naturaleh foi pensada para ser mais do que
              um lugar de compra. A ideia sempre foi criar um espaço onde
              produtos, experiência e acolhimento estivessem conectados.
            </p>

            <p className="mt-4 text-base leading-7 text-[var(--color-text-light)]">
              Com uma curadoria voltada para saúde, bem-estar e qualidade de
              vida, a marca foi construindo uma relação próxima com quem busca
              escolhas mais naturais para o dia a dia.
            </p>
          </div>

        </div>
      </section>

      <section className="bg-[var(--color-bg-soft)] py-20">
        <div className="mx-auto max-w-7xl px-6">
          
          <div className="max-w-3xl">
            <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
              Nosso propósito
            </span>

            <h2 className="mt-3 text-3xl font-semibold leading-tight md:text-5xl">
              Tornar o bem-estar parte da rotina.
            </h2>

            <p className="mt-6 text-base leading-7 text-[var(--color-text-light)]">
              Acreditamos que pequenas escolhas podem transformar a forma como
              cada pessoa se relaciona com sua saúde e com o próprio dia.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            
            <div className="rounded-[1.5rem] bg-[var(--color-bg)] p-6">
              <h3 className="text-xl font-semibold">
                Qualidade
              </h3>

              <p className="mt-3 text-sm leading-6 text-[var(--color-text-light)]">
                Produtos selecionados com cuidado e atenção à experiência de
                quem compra.
              </p>
            </div>

            <div className="rounded-[1.5rem] bg-[var(--color-bg)] p-6">
              <h3 className="text-xl font-semibold">
                Acolhimento
              </h3>

              <p className="mt-3 text-sm leading-6 text-[var(--color-text-light)]">
                Um espaço pensado para que cada pessoa se sinta bem recebida,
                seja presencialmente ou online.
              </p>
            </div>

            <div className="rounded-[1.5rem] bg-[var(--color-bg)] p-6">
              <h3 className="text-xl font-semibold">
                Bem-estar
              </h3>

              <p className="mt-3 text-sm leading-6 text-[var(--color-text-light)]">
                Um olhar mais completo para saúde, rotina, equilíbrio e
                qualidade de vida.
              </p>
            </div>

          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">

          <div>
            <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
              Hoje
            </span>

            <h2 className="mt-3 text-3xl font-semibold leading-tight md:text-5xl">
              Uma experiência que continua evoluindo.
            </h2>

            <p className="mt-6 text-base leading-7 text-[var(--color-text-light)]">
              A Casa Naturaleh segue crescendo e ampliando sua presença, agora
              também no digital, para levar sua proposta a ainda mais pessoas.
            </p>

            <a
              href="/loja"
              className="mt-8 inline-flex rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Conhecer a loja
            </a>
          </div>

          <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] bg-[var(--color-bg-soft)]">
            <span className="text-sm text-[var(--color-text-light)]">
              imagem atual da Casa Naturaleh
            </span>
          </div>

        </div>
      </section>

    </main>
  );
}