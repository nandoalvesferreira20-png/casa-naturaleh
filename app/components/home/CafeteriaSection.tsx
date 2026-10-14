import Image from "next/image";
import styles from "../../home.module.css";

// Substituir o aviso pelo menu somente quando o conteúdo oficial estiver disponível.
export default function CafeteriaSection() {
  return <section className={`${styles.container} ${styles.cafe}`} aria-labelledby="cafeteria-home">
    <div className={styles.cafePhoto}><Image src="/images/hero/cafeteria.jpg" alt="Balcão da cafeteria Casa Naturaleh com detalhes em madeira e plantas." fill sizes="(min-width: 1200px) 500px, (min-width: 768px) 45vw, calc(100vw - 40px)" className={styles.photo} /></div>
    <div><p className={styles.eyebrow}>Um café, uma pausa, um recomeço</p><h2 id="cafeteria-home" className={styles.heading}>Cafeteria Naturaleh</h2><p className={styles.description}>Uma pausa com sabor também faz parte da nossa experiência.</p><p className={styles.menuNotice}>Em breve, nosso menu completo por aqui.</p><a href="#como-chegar" className={styles.textLink}>Venha conhecer nosso espaço <span aria-hidden="true">→</span></a></div>
  </section>;
}
