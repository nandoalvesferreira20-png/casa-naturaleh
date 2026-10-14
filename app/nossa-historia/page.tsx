import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./historia.module.css";

export const metadata: Metadata = {
  title: "Nossa história | Casa Naturaleh",
  description: "Um sonho familiar que ganhou forma em São Bernardo do Campo. Conheça a história da Casa Naturaleh, da primeira semente à inauguração em 30 de maio de 2026.",
};

const marcos = [
  { ano: "2022", titulo: "A semente", texto: "Nasce o desejo de levar uma alimentação mais pura, consciente e acessível para a comunidade." },
  { ano: "2024", titulo: "O conceito", texto: "A ideia ganha identidade: unir uma mercearia saudável à experiência acolhedora de uma cafeteria." },
  { ano: "2026", titulo: "O sonho ganha forma", texto: "Depois de planejamento, obras, escolha de fornecedores e uma curadoria cuidadosa de produtos, a Casa Naturaleh finalmente se torna realidade." },
];

export default function NossaHistoriaPage() {
  return (
    <div className={styles.page}>
      <section className={`${styles.container} ${styles.hero}`} aria-labelledby="historia-titulo">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Casa Naturaleh · São Bernardo do Campo</p>
          <h1 id="historia-titulo">Nossa <span>história.</span></h1>
          <p className={styles.heroLead}>Um sonho familiar que ganhou forma, endereço e propósito.</p>
          <a className={styles.readLink} href="#origem">Como tudo começou <span aria-hidden="true">↓</span></a>
        </div>
        <figure className={styles.heroFigure}>
          <div className={styles.heroPhoto}>
            <Image src="/images/hero/loja.jpg" alt="Prateleiras da Casa Naturaleh com produtos naturais em recipientes transparentes." fill preload sizes="(min-width: 1200px) 530px, (min-width: 768px) 46vw, calc(100vw - 40px)" className={styles.photo} />
          </div>
          <figcaption className={styles.caption}>Casa Naturaleh. Um lugar para fazer parte da rotina.</figcaption>
        </figure>
      </section>

      <section id="origem" className={`${styles.container} ${styles.origin}`} aria-labelledby="origem-titulo">
        <h2 id="origem-titulo" className={styles.eyebrow}>Nossa história</h2>
        <div className={styles.originCopy}>
          <p className={styles.opening}>A Casa Naturaleh nasceu de um sonho familiar: criar em São Bernardo do Campo um espaço onde saúde, sabor e acolhimento pudessem existir juntos.</p>
          <div className={styles.prose}>
            <p>Desde o início, a ideia nunca foi ser apenas uma loja. Queríamos construir um lugar para fazer parte da rotina das pessoas — com produtos naturais cuidadosamente selecionados, uma experiência próxima e um café preparado com carinho.</p>
            <p>A escolha da Avenida Francisco Prestes Maia também faz parte dessa história. Foi ali que encontramos o lugar para transformar planos em realidade e criar uma casa aberta para quem busca viver com mais equilíbrio, leveza e propósito.</p>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.journey}`} aria-labelledby="trajetoria-titulo">
        <p className={styles.eyebrow}>Nossas raízes</p>
        <h2 id="trajetoria-titulo" className={styles.heading}>De um sonho à Casa Naturaleh</h2>
        <ol className={styles.timeline}>
          {marcos.map(marco => (
            <li key={marco.ano}>
              <span className={styles.marker} aria-hidden="true" />
              <time className={styles.year} dateTime={marco.ano}>{marco.ano}</time>
              <h3>{marco.titulo}</h3>
              <p>{marco.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.inauguration} aria-labelledby="inauguracao-titulo">
        <div className={styles.container}>
          <p className={styles.eyebrow}>O dia em que abrimos as portas.</p>
          <h2 id="inauguracao-titulo" className={styles.date}><time dateTime="2026-05-30">30 de maio <span>de 2026</span></time></h2>
          <div className={styles.inaugurationGrid}>
            <video className={styles.inaugurationVideo} controls playsInline preload="metadata" aria-label="Vídeo da inauguração da Casa Naturaleh">
              <source src="/images/hero/naturaleh.mp4" type="video/mp4" />
              Seu navegador não suporta reprodução de vídeo.
            </video>
            <div className={styles.inaugurationCopy}>
              <div className={styles.prose}>
                <p>No dia 30 de maio de 2026, o que antes existia apenas em planos e ideias passou a ter endereço, prateleiras, aromas, encontros e histórias.</p>
                <p>Ver os primeiros clientes entrando na Casa Naturaleh foi a confirmação de que todo o esforço havia valido a pena.</p>
              </div>
              <p className={styles.closingLine}>A inauguração não representou a chegada. <span>Representou o começo.</span></p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.future}`} aria-labelledby="futuro-titulo">
        <div>
          <p className={styles.eyebrow}>Da nossa casa para a sua rotina</p>
          <h2 id="futuro-titulo" className={styles.heading}>Nossa história está só começando</h2>
          <div className={styles.prose}>
            <p>Queremos que a Casa Naturaleh continue crescendo junto com as pessoas que fazem parte dela.</p>
            <p>Nosso propósito é ser um ponto de encontro para quem busca uma rotina mais consciente, saborosa e leve — sempre com cuidado, qualidade e proximidade.</p>
          </div>
          <p className={styles.signature}>Casa Naturaleh.<span>Viva com leveza e propósito.</span></p>
          <Link href="/loja" className={styles.cta}>Conheça nossa loja <span aria-hidden="true">↗</span></Link>
        </div>
        <figure className={styles.futureFigure}>
          <div className={styles.futurePhoto}>
            <Image src="/images/hero/casa-naturaleh.jpg" alt="Xícara da Casa Naturaleh sobre uma mesa no espaço do café, diante da parede com a marca." fill sizes="(min-width: 1200px) 400px, (min-width: 768px) 36vw, calc(100vw - 40px)" className={styles.photo} />
          </div>
          <figcaption className={styles.caption}>Um café, uma pausa, um recomeço.</figcaption>
        </figure>
      </section>
    </div>
  );
}
