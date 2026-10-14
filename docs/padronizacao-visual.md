# Padronização visual da Casa Naturaleh

## Resultado e limites

O site passa a compartilhar tokens de cor, tipografia, bordas, raios, sombras, botões e formulários. A paleta base continua exatamente **#F7F7F2, #E4E6C3, #899878, #222725 e #121113**. Branco já existente continua como superfície neutra; tons suaves e bordas são misturas/transparências dessas cores, sem outra paleta institucional.

Black Mango agora usa o arquivo oficial **`app/fonts/BlackMango-Regular.ttf`**, configurado com `next/font/local` no layout. A variável `--font-black-mango` é aplicada ao html junto à Montserrat, com peso 400, estilo normal e `display: swap`. O token `--font-heading` usa essa variável; o fallback temporário de Georgia/Times New Roman foi removido do token. Nenhuma fonte externa foi baixada ou convertida. Configuração documentada em `app/fonts/README.md`.

Montserrat continua em `next/font/google`, com variável `--font-montserrat`, subset latin e `display: swap`. Textos, navegação, formulários, tabelas, botões, preços e títulos funcionais permanecem em Montserrat. h1/h2 institucionais e destaques da história usam a fonte de títulos; títulos de produtos, categorias, footer e interfaces administrativas têm tratamento de UI para manter legibilidade. O admin usa a fonte de impacto somente nos títulos principais.

## Tokens e padrões

| Papel | Token / padrão |
| --- | --- |
| Fundo principal | `--color-bg`, #F7F7F2 |
| Fundo suave | `--color-bg-soft`, #E4E6C3 |
| Destaque / botão principal | `--color-primary`, #899878 |
| Texto / fundo escuro | `--color-dark`, #222725 |
| Contraste profundo | `--color-black`, #121113 |
| Superfície e fundo intermediário | `--color-surface`, `--color-surface-muted` |
| Texto secundário | `--color-text-light`, mistura da cor escura com o creme |
| Bordas | `--color-border`, `--color-border-strong` |
| Foco | `--color-focus`, verde oficial, outline visível de 2px |
| Fontes | `--font-body`, `--font-heading`, utilitário `font-display` |
| Raios | inputs 16px, cards 24px, botões pill |
| Sombras | `--shadow-soft`, `--shadow-dialog`; utilitários Tailwind sm/md/xl reutilizam esses tokens |
| Espaçamento | `--space-section`, `--space-gutter` |
| Largura | `--content-max`, 80rem; formulários conservam suas larguras menores |

Classes compartilhadas em `globals.css`: `cn-button-primary`, `cn-button-secondary`, `cn-input`, `cn-card`, `cn-ui-title`, `cn-brand-text`, `cn-admin`, `cn-nav-link` e contexto `cn-on-dark`.

Botão primário: verde oficial, texto #121113, altura mínima 44px, radius pill, hover #222725 com texto creme. A sugestão de texto branco foi ajustada por contraste: **6,12:1** com texto escuro contra **3,08:1** com branco sobre #899878. Secundário: borda verde, texto escuro, hover suave; em fundo escuro usa texto claro e mantém contraste no hover. Estados disabled e ações destrutivas continuam com seu comportamento e cores semânticas anteriores.

Cards: superfície clara, borda sutil, radius 24px e sombra discreta. Formulários: Montserrat, altura mínima 44px, radius 16px, borda neutra, foco verde visível. Checkbox, radio, range e upload não recebem dimensões indevidas do padrão de input textual. Erros, alertas e estados de pedido continuam com suas cores semânticas e mensagens; não foram confundidos com a paleta de marca. A cor do símbolo de login de terceiro também foi preservada.

## Header, Footer e páginas

Header mantém logo oficial, usuário, rotas e quantidade do carrinho. Login recebeu o botão primário. Conta e carrinho têm dimensões mais adequadas a telas pequenas; nome longo continua truncado. Navegação horizontal aparece a partir de 1280px para evitar aperto; abaixo disso, Menu usa details/summary e os mesmos links existentes, acessível por teclado, sem nova biblioteca ou lógica de autenticação. Não foi adicionado sticky. O logo usa `preload`, substituindo `priority` depreciado na versão instalada do Next.js.

Footer preserva integralmente logo, slogan, contato, endereço, horários, CNPJ, copyright e links. Fundo #222725, links claros e títulos de UI em Montserrat; botão secundário tem variante adequada ao fundo escuro. Grid responsivo anterior foi preservado.

Home e Nossa História usam as mesmas cores derivadas de tokens, raios e padrões de CTA. Títulos têm fonte de impacto; categorias e textos têm Montserrat. Foram removidos valores hex dispersos dessas folhas CSS em favor dos tokens. Mapa, imagens e vídeo mantêm fontes, proporções e controles. O vídeo permanece vertical, inteiro, máximo 460px no desktop e largura disponível no mobile.

Loja/produto: cards, botões, busca, categorias, paginação e título seguem os padrões. Carrinho/checkout: inputs, resumo, cards, botões e títulos padronizados. Auth/conta/pedidos/confirmação: formulários, cards e botões padronizados. Admin: fundo e superfícies da marca, UI sóbria, títulos principais de impacto, controles Montserrat e ações destrutivas preservadas.

## Arquivos alterados

- Base: `app/globals.css`, `app/layout.tsx`, `app/fonts/README.md`.
- Globais: `app/components/Header.tsx`, `app/components/Footer.tsx`.
- Home e história: `app/home.module.css`, `app/nossa-historia/historia.module.css` (as páginas herdam os estilos globais).
- Catálogo: `app/loja/page.tsx`, `app/loja/LojaCatalogo.tsx`, `app/produto/[slug]/page.tsx`, `app/components/ProductCard.tsx`, `app/components/ProductActions.tsx`.
- Compra: `app/carrinho/page.tsx`, `app/checkout/page.tsx`, `app/components/payments/ManualPixPanel.tsx`, `app/components/payments/PaymentPanel.tsx`.
- Auth: `app/login/page.tsx`, `app/cadastro/page.tsx`, `app/redefinir-senha/page.tsx`, `app/redefinir-senha/RedefinirSenhaClient.tsx`.
- Conta/pedidos: `app/minha-conta/page.tsx`, `app/meus-pedidos/page.tsx`, `app/pedido-confirmado/PedidoConfirmadoClient.tsx`.
- Administração: `app/admin/page.tsx`, `app/admin/produtos/page.tsx`.
- Este relatório.

Componentes existentes foram reutilizados: ProductCard, ProductActions, painéis de pagamento, Header/Footer e formulários. Nenhuma API, cliente Supabase, schema, RLS, contexto de carrinho/Auth ou regra de negócio foi alterada. Também não mudaram filtros, paginação, cálculos, Pix, entrega, estoque, pedidos ou importação. Comparação AST com a versão anterior confirmou que **19 arquivos TSX** diferem apenas em classes visuais; Header foi revisado à parte por ter novos elementos de navegação mobile, e layout recebeu somente `display: swap` na fonte.

## Verificação

- **179 testes passaram**, zero falhas. Incluem checkout, carrinho, Pix, entrega, Geoapify, pedidos, importação, Home, paginação, busca e request race.
- **`npx.cmd tsc --noEmit` passou.**
- Lint comparado à versão anterior: **nenhum problema novo**. Permanecem quatro erros e três avisos preexistentes: admin (immutability), admin produtos (set-state-in-effect, any, exhaustive-deps e dois no-img-element), carrinho (immutability). Não foram alteradas rotinas de negócio para resolver débitos anteriores durante esta tarefa visual. Header, Footer e layout passam no lint específico.
- **`npm.cmd run build`**: compilação e TypeScript passaram. O build completo continua falhando na coleta de `/produto/[slug]` com `supabaseUrl is required`, pois o ambiente não tem `NEXT_PUBLIC_SUPABASE_URL`. A página não foi alterada para mascarar a falta de configuração.
- Responsividade mantida nas grades e nos formulários; correção preventiva de espaço no Header, targets de pelo menos 44px nos controles padronizados, foco visível e respeito a movimento reduzido nos botões compartilhados.

## Pendências

1. A fonte Black Mango oficial já foi adicionada e ativada. O asset gerado respondeu HTTP 200 (`font/ttf`, 89868 bytes), com hash SHA-256 idêntico ao original. O Next mantém seu fallback interno ajustado apenas durante o carregamento, com preload automático. A verificação visual de fonte efetivamente renderizada e CLS ainda requer navegador.
2. Configurar o ambiente Supabase/Firebase para executar o site e concluir o build integral.
3. Fazer QA visual em 375, 390, 430px, tablet e desktop, incluindo formulários/admin e menu do Header. O inventário de computer-use desta sessão não tem navegadores conectados; não é correto afirmar aprovação visual dessas telas. Também revisar novamente quebras de títulos quando Black Mango substituir o fallback.

Os testes e a revisão de código comprovam regressões automatizadas e escopo, não substituem a revisão visual nem a homologação com dados reais.
