"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ProductCard from "../ProductCard";
import { carregarCatalogoHome } from "../../lib/catalogo-home";
import styles from "../../home.module.css";

export default function HomeCatalogo() {
  const [catalogo, setCatalogo] = useState<Awaited<ReturnType<typeof carregarCatalogoHome>> | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    let ativo = true;
    carregarCatalogoHome().then(dados => { if (ativo) setCatalogo(dados); }).catch(() => { if (ativo) setErro(true); });
    return () => { ativo = false; };
  }, []);

  return <>
    <section className={`${styles.container} ${styles.section}`} aria-labelledby="categorias-home">
      <p className={styles.eyebrow}>Explore a nossa seleção</p>
      <h2 id="categorias-home" className={styles.heading}>Encontre o que combina com a sua rotina</h2>
      {!catalogo && !erro && <p role="status" className={styles.notice}>Carregando categorias…</p>}
      {(erro || catalogo?.erroCategorias) && <p role="status" className={styles.notice}>Não foi possível carregar todas as categorias. Você pode explorar a loja completa.</p>}
      {catalogo && !catalogo.erroCategorias && !catalogo.categorias.length && <p className={styles.notice}>As categorias aparecerão aqui conforme os produtos forem disponibilizados.</p>}
      <div className={styles.categories}>
        {catalogo?.categorias.map(categoria => <Link key={categoria.nome} href={{ pathname: "/loja", query: { categoria: categoria.nome } }} className={styles.category}>
          <div className={styles.categoryPhoto}>
            {categoria.imagem ? <Image src={categoria.imagem} alt={`Imagem representativa da categoria ${categoria.nome}`} fill sizes="(min-width: 1200px) 270px, (min-width: 768px) 23vw, 45vw" className={styles.categoryImage} /> : <div className={styles.photoPending}><svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><rect x="3" y="5" width="22" height="18" rx="2" stroke="currentColor" /><path d="m3 20 7-7 6 6 4-4 5 5" stroke="currentColor" /><circle cx="19" cy="10" r="2" stroke="currentColor" /></svg><span>Foto de {categoria.nome}</span><small>A adicionar</small></div>}
          </div>
          <h3>{categoria.nome}<span aria-hidden="true">↗</span></h3>
        </Link>)}
      </div>
      <Link className={styles.textLink} href="/loja">Explorar todas as categorias <span aria-hidden="true">→</span></Link>
    </section>

    <section className={styles.featured} aria-labelledby="destaques-home">
      <div className={styles.container}>
        <p className={styles.eyebrow}>Novidades na nossa seleção</p>
        <h2 id="destaques-home" className={styles.heading}>Produtos em destaque</h2>
        <p className={styles.description}>Conheça os produtos mais recentes da Casa Naturaleh.</p>
        {!catalogo && !erro && <p role="status" className={styles.notice}>Carregando produtos…</p>}
        {(erro || catalogo?.erroProdutos) && <p role="status" className={styles.notice}>Não foi possível carregar os produtos em destaque. Acesse a loja para consultar o catálogo.</p>}
        {catalogo && !catalogo.erroProdutos && !catalogo.produtos.length && <p className={styles.notice}>Em breve, novos produtos por aqui.</p>}
        <div className={styles.products}>{catalogo?.produtos.map(produto => <ProductCard key={produto.id} {...produto} headingLevel={3} />)}</div>
        <Link href="/loja" className={styles.outlineButton}>Ver todos os produtos <span aria-hidden="true">→</span></Link>
      </div>
    </section>
  </>;
}
