import Image from "next/image";
import Link from "next/link";
import HomeCatalogo from "./components/home/HomeCatalogo";
import CafeteriaSection from "./components/home/CafeteriaSection";
import styles from "./home.module.css";

const endereco = "Av. Francisco Prestes Maia, 561 - Centro, São Bernardo do Campo - SP, 09770-000";
const mapa = `https://www.google.com/maps?q=${encodeURIComponent(endereco)}&output=embed`;
const rota = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`;

export default function Home() {
  return <div className={styles.page}>
    <section className={`${styles.container} ${styles.hero}`} aria-labelledby="home-titulo">
      <div><p className={styles.eyebrow}>Casa Naturaleh · São Bernardo do Campo</p><h1 id="home-titulo">Bem-estar, saúde e escolhas mais naturais para o seu dia.</h1><p className={styles.description}>Produtos naturais selecionados, uma loja física acolhedora e uma cafeteria para a sua pausa. Viva com leveza e propósito.</p><div className={styles.actions}><Link href="/loja" className={styles.button}>Conheça nossos produtos <span aria-hidden="true">↗</span></Link><a href="#como-chegar" className={styles.textLink}>Como chegar <span aria-hidden="true">↓</span></a></div></div>
      <div className={styles.heroPhoto}><Image src="/images/hero/parede.jpg" alt="Mesa da cafeteria Casa Naturaleh, com uma xícara diante da parede com a marca." fill preload sizes="(min-width: 1280px) 568px, (min-width: 768px) 46vw, calc(100vw - 40px)" className={styles.photo} /></div>
    </section>

    <HomeCatalogo />

    <section className={`${styles.container} ${styles.about}`} aria-labelledby="essencia-home">
      <div><p className={styles.eyebrow}>Nossa essência</p><h2 id="essencia-home" className={styles.heading}>Cuidar de você começa nas escolhas do dia a dia.</h2><p className={styles.description}>A Casa Naturaleh nasceu de um sonho familiar: aproximar saúde, sabor e acolhimento em um espaço que faz parte da rotina de São Bernardo do Campo.</p><p className={styles.description}>Da curadoria dos produtos ao atendimento, cada detalhe reflete o cuidado com quem passa pela nossa casa.</p><Link href="/nossa-historia" className={styles.textLink}>Conheça nossa história <span aria-hidden="true">→</span></Link></div>
      <div className={styles.aboutPhoto}><Image src="/images/hero/loja.jpg" alt="Seleção de produtos naturais nas prateleiras da Casa Naturaleh." fill sizes="(min-width: 1280px) 560px, (min-width: 768px) 45vw, calc(100vw - 40px)" className={styles.photo} /></div>
    </section>

    <CafeteriaSection />

    <section id="como-chegar" className={styles.visit} aria-labelledby="visita-home">
      <div className={`${styles.container} ${styles.visitGrid}`}>
        <div><p className={styles.eyebrow}>Nossa casa está aberta para você</p><h2 id="visita-home" className={styles.heading}>Visite a Casa Naturaleh</h2><address><strong>Casa Naturaleh</strong>Av. Francisco Prestes Maia, 561 - Centro<br />São Bernardo do Campo - SP<br />09770-000</address><dl className={styles.hours}><div><dt>Segunda a sexta</dt><dd>08:00 às 19:00</dd></div><div><dt>Sábado</dt><dd>08:00 às 15:00</dd></div></dl><a href={rota} target="_blank" rel="noopener noreferrer" className={styles.button}>Traçar rota <span aria-hidden="true">↗</span><span className="sr-only"> no Google Maps (abre em nova aba)</span></a></div>
        <iframe src={mapa} title="Localização da Casa Naturaleh na Avenida Francisco Prestes Maia, 561, São Bernardo do Campo" className={styles.map} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
      </div>
    </section>

    <section className={`${styles.container} ${styles.final}`} aria-labelledby="convite-home"><p className={styles.eyebrow}>Casa Naturaleh</p><h2 id="convite-home" className={styles.heading}>Viva com leveza e propósito.</h2><p className={styles.description}>Encontre escolhas para a sua rotina ou venha viver essa experiência de perto.</p><Link href="/loja" className={styles.button}>Conheça nossos produtos <span aria-hidden="true">→</span></Link></section>
  </div>;
}
