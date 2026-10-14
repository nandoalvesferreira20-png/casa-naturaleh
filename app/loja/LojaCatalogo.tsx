"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProductCard from "../components/ProductCard";
import { atualizarParametrosLoja, consultarCategoriasLoja, consultarPaginaLoja, janelaPaginas, lerFiltrosLoja, PAGE_SIZE, type FiltrosLoja } from "../lib/catalogo-loja";

const botao = "inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-[var(--color-bg-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40";

export function CatalogoLoading() {
  return <div role="status"><span className="sr-only">Carregando catálogo…</span><div aria-hidden="true" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: PAGE_SIZE }, (_, i) => <div key={i} className="h-[390px] rounded-[1.5rem] border border-black/5 bg-white"><div className="h-64 rounded-t-[1.5rem] bg-[var(--color-bg-soft)]" /><div className="m-5 h-4 w-2/3 rounded bg-black/5" /><div className="m-5 h-4 w-1/2 rounded bg-black/5" /></div>)}</div></div>;
}

export default function LojaCatalogo() {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  const snapshot = params.toString();
  const filtros = lerFiltrosLoja(new URLSearchParams(snapshot));
  const chave = JSON.stringify(filtros);
  const [resultado, setResultado] = useState<{ chave: string; dados?: Awaited<ReturnType<typeof consultarPaginaLoja>>; erro?: string } | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [erroCategorias, setErroCategorias] = useState(false);
  const [rascunho, setRascunho] = useState({ base: "", valor: "" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catalogo = useRef<HTMLDivElement>(null);
  const busca = rascunho.base === snapshot ? rascunho.valor : filtros.busca;
  const carregando = resultado?.chave !== chave;
  const dados = !carregando ? resultado?.dados : undefined;
  const erro = !carregando ? resultado?.erro : undefined;

  function navegar(mudanca: Partial<FiltrosLoja>, replace = false) {
    if (timer.current) clearTimeout(timer.current);
    const next = atualizarParametrosLoja(new URLSearchParams(window.location.search), mudanca);
    const href = `${pathname}?${next.toString()}`;
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }

  function trocarPagina(page: number) {
    navegar({ page });
    catalogo.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function mudarBusca(valor: string) {
    setRascunho({ base: snapshot, valor });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => navegar({ busca: valor.trim() }, true), 350);
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, [snapshot]);

  useEffect(() => {
    const ac = new AbortController();
    import("../lib/supabase").then(({ supabase }) => consultarCategoriasLoja(supabase, ac.signal)).then(lista => {
      if (!ac.signal.aborted) setCategorias(lista);
    }).catch(() => { if (!ac.signal.aborted) setErroCategorias(true); });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const consulta = JSON.parse(chave) as FiltrosLoja;
    import("../lib/supabase").then(({ supabase }) => consultarPaginaLoja(supabase, consulta, ac.signal)).then(dados => {
      if (ac.signal.aborted) return;
      if (consulta.page > dados.paginas) {
        const next = atualizarParametrosLoja(new URLSearchParams(snapshot), { page: dados.paginas });
        router.replace(`${pathname}?${next}`, { scroll: false });
        return;
      }
      setResultado({ chave, dados });
    }).catch(() => { if (!ac.signal.aborted) setResultado({ chave, erro: "Não foi possível carregar os produtos. Tente novamente mais tarde." }); });
    return () => ac.abort();
  }, [chave, snapshot, pathname, router]);

  function listaCategorias() {
    const opcoes = ["todas", ...categorias];
    return <ul className="mt-4 space-y-1">{opcoes.map(categoria => <li key={categoria}><button type="button" onClick={() => navegar({ categoria })} aria-current={filtros.categoria === categoria ? "true" : undefined} className={`min-h-11 w-full rounded-r-lg border-l-2 px-4 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] ${filtros.categoria === categoria ? "border-[var(--color-primary)] bg-[var(--color-bg-soft)]/40 font-semibold text-[var(--color-dark)]" : "border-transparent text-[var(--color-text-light)] hover:border-[var(--color-primary)] hover:text-[var(--color-dark)]"}`}>{categoria === "todas" ? "Todos os produtos" : categoria}</button></li>)}</ul>;
  }

  return <section className="py-10 pb-20">
    <div className="mx-auto max-w-7xl px-6">
      <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
        <div><label htmlFor="busca-loja" className="sr-only">Buscar produtos</label><div className="relative"><input id="busca-loja" type="search" value={busca} onChange={e => mudarBusca(e.target.value)} placeholder="Buscar produto..." autoComplete="off" className="min-h-11 w-full rounded-full border border-black/10 bg-white px-5 py-3 pr-12 text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" />{busca && <button type="button" onClick={() => { setRascunho({ base: snapshot, valor: "" }); navegar({ busca: "" }, true); }} aria-label="Limpar busca" className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-lg focus-visible:outline-2">×</button>}</div></div>
        <div><label htmlFor="ordem-loja" className="sr-only">Ordenar produtos</label><select id="ordem-loja" value={filtros.ordenacao} onChange={e => navegar({ ordenacao: e.target.value as FiltrosLoja["ordenacao"] })} className="min-h-11 w-full rounded-full border border-black/10 bg-white px-5 py-3 text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"><option value="recentes">Mais recentes</option><option value="menor-preco">Menor preço</option><option value="maior-preco">Maior preço</option></select></div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="min-w-0" aria-label="Filtro de categorias">
          <div className="hidden lg:block"><h2 className="text-sm font-semibold uppercase tracking-[0.15em]">Categorias</h2>{listaCategorias()}</div>
          <details className="rounded-xl border border-black/10 p-4 lg:hidden"><summary className="min-h-11 cursor-pointer text-sm font-semibold">Categorias · {filtros.categoria === "todas" ? "Todos os produtos" : filtros.categoria}</summary>{listaCategorias()}</details>
          {erroCategorias && <p role="status" className="mt-3 text-xs leading-6">Não foi possível carregar todas as categorias.</p>}
        </aside>

        <div ref={catalogo} className="min-w-0 scroll-mt-24" aria-busy={carregando}>
          <p role="status" aria-live="polite" className="mb-6 text-sm text-[var(--color-text-light)]">{carregando ? "Carregando produtos..." : erro ? "Catálogo indisponível" : `${dados?.total ?? 0} ${(dados?.total ?? 0) === 1 ? "produto encontrado" : "produtos encontrados"}`}</p>
          {carregando ? <CatalogoLoading /> : erro ? <div role="alert" className="rounded-[1.5rem] bg-white p-8 text-sm leading-7">{erro}</div> : !dados?.produtos.length ? <div className="rounded-[1.5rem] bg-white p-10 text-center"><h2 className="text-xl font-semibold">Nenhum produto encontrado.</h2><p className="mt-2 text-sm text-[var(--color-text-light)]">Experimente outro termo ou categoria.</p><button type="button" onClick={() => navegar({ busca: "", categoria: "todas" })} className={`${botao} mt-5`}>Limpar filtros</button></div> : <>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{dados.produtos.map(produto => <ProductCard key={produto.id} {...produto} />)}</div>
            <nav aria-label="Paginação dos produtos" className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <button type="button" className={botao} disabled={filtros.page <= 1} onClick={() => trocarPagina(filtros.page - 1)}>← Anterior</button>
              <span className="px-2 text-sm sm:hidden">{filtros.page} / {dados.paginas}</span>
              <div className="hidden items-center gap-2 sm:flex">{janelaPaginas(filtros.page, dados.paginas).map((p, i) => p === "…" ? <span key={`gap-${i}`} className="px-1" aria-hidden="true">…</span> : <button key={p} type="button" aria-label={`Página ${p}`} aria-current={p === filtros.page ? "page" : undefined} className={`${botao} min-w-11 ${p === filtros.page ? "border-[var(--color-primary)] bg-[var(--color-primary)] font-semibold text-[var(--color-black)]" : ""}`} onClick={() => trocarPagina(p)}>{p}</button>)}</div>
              <button type="button" className={botao} disabled={filtros.page >= dados.paginas} onClick={() => trocarPagina(filtros.page + 1)}>Próxima →</button>
            </nav>
          </>}
        </div>
      </div>
    </div>
  </section>;
}
