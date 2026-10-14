# Paginação e categorias da loja

## Implementação

O hero, a paleta, as imagens, os preços e o ProductCard existente foram preservados. A busca/filtro/ordenação client-side do catálogo completo foi substituída por consulta paginada ao mesmo cliente Supabase existente.

Arquivos:

- `app/loja/page.tsx`: wrapper Server Component, hero existente e Suspense.
- `app/loja/LojaCatalogo.tsx`: filtros, sidebar, debounce, loading, paginação, navegação e proteção contra respostas antigas.
- `app/lib/catalogo-loja.ts`: parsing da URL e consultas paginadas.
- `tests/catalogo-loja.test.mjs`: consultas com cliente Supabase real e transporte simulado.
- `tests/loja-interacao.test.mjs`: eventos e ciclos de efeitos usando executor de hooks sem DOM.
- Este relatório.

## Consulta e contagem

`PAGE_SIZE = 12`. A consulta seleciona somente os campos consumidos pelo ProductCard, com `count: "exact"`, e aplica:

1. `ativo = true`;
2. busca com OR/ILIKE;
3. igualdade de categoria, exceto opção Todos;
4. ordenação escolhida, com ID como desempate estável;
5. `.range(from, to)`, com `from = (page - 1) * 12` e `to = from + 11`.

Exemplos: página 1 solicita 0–11; página 2, 12–23. Não há slice/filter/sort client-side dos produtos. O navegador recebe no máximo 12 produtos completos por consulta. A última página pode conter menos. Estoque zero continua aparecendo com o tratamento original do ProductCard; inativos são excluídos também da contagem.

O count da mesma consulta reflete busca + categoria + ativo, antes do range. Total de páginas: `Math.max(1, Math.ceil(count / 12))`. Uma resposta PGRST103 para uma página antiga fora do catálogo recupera somente a contagem via HEAD com os mesmos filtros e corrige a URL para a última página válida. Essa exceção não baixa produtos adicionais.

## Busca, categoria e ordem

Busca por nome, categoria, descrição e slug usando `ilike` com OR no banco, em todo o catálogo. Debounce de **350 ms**, sem consulta por tecla. Valores são colocados entre aspas para preservar a gramática PostgREST com pontuação; curingas de entrada são escapados. O slug usa também a forma sem acentos. A comparação dos demais campos segue o ILIKE do PostgreSQL, que não equivale a unaccent; busca sem acentos na descrição não é garantida sem mudança de banco, que não foi solicitada.

Categoria usa `.eq("categoria", categoria)`; Todos remove esse filtro. Mudanças de busca, categoria e ordem reiniciam a página em 1. Limpar filtros remove busca e categoria e volta à página 1.

Ordens preservadas: criado_em DESC, preco ASC e preco DESC. O desempate por ID evita que preços ou datas iguais desorganizem as páginas.

As categorias partem da lista oficial já existente no projeto e são verificadas no banco por disponibilidade ativa, independentemente dos 12 produtos atuais e da busca. Cada verificação baixa no máximo um ID, usando `.limit(1)`. Não há consulta do catálogo inteiro para montar a sidebar. Categorias sem produto ativo não são listadas. Categorias legadas fora da lista oficial continuam acessíveis por uma URL de filtro correspondente, mas não são criadas nem acrescentadas à sidebar como se fossem oficiais. A lista é carregada uma vez por montagem, sem repetir a cada página.

## Interface e URL

- Desktop: sidebar de **224px**, à esquerda, sem cards pesados ou sticky. Categoria ativa tem indicador lateral, fundo sutil, semibold e `aria-current`.
- Mobile/tablet abaixo de 1024px: categorias em **details/summary**, expansível, sem biblioteca adicional.
- Grid: uma coluna no mobile, duas a partir de 640px e três a partir de 1280px, mantendo largura adequada com a sidebar.
- Desktop/tablet: anterior, janela compacta com primeira/última página e reticências, próxima. Página atual destacada e `aria-current="page"`.
- Mobile abaixo de 640px: anterior, `página / total`, próxima.
- Botões de extremos desabilitados. Foco visível, labels de busca/ordenação, estado de loading anunciado e `aria-busy` na área de resultados.
- Loading usa 12 slots de skeleton, mantendo a sidebar disponível. Erro e catálogo vazio têm mensagens distintas. Vazio mostra “Nenhum produto encontrado”, orientação e botão Limpar filtros.
- Troca de página chama `scrollIntoView` no catálogo. Usa smooth, ou auto quando `prefers-reduced-motion: reduce` está ativo.

Query strings sincronizadas: **page, categoria, busca e ordenacao**. Parâmetros externos adicionais são preservados. Página/categoria/ordem usam push; busca com debounce usa replace para não criar histórico por palavra. Reload e Voltar recuperam os filtros da URL. Os links existentes da Home `/loja?categoria=...` continuam compatíveis sem mudar a Home.

`useSearchParams` fica no Client Component dentro de Suspense no wrapper, conforme a documentação instalada do Next.js. O carregamento usa AbortController e cleanup: respostas abortadas não atualizam o estado; cada resultado é associado aos filtros que o produziram. A busca pendente é cancelada quando a URL muda ou o componente desmonta.

## Verificação

**27 testes passaram**: oito de consulta, cinco de interação e 14 regressões existentes de carrinho/ProductActions. Cobrem 12 produtos por página, página 2, última página, inativos, estoque zero, count filtrado, busca além da página atual, filtros combinados, ordem global, restauração/reset da URL, página fora de range, pontuação na busca, debounce, request race, histórico, extremos e scroll reduzido.

O ProductCard foi inspecionado e não tem botão de adicionar ao carrinho: possui “Ver produto”, enquanto ProductActions na página individual trata a adição. Ambos foram preservados; nenhuma regra de carrinho mudou. As regressões automatizadas de adicionar/limitar/persistir itens passaram.

`npx.cmd tsc --noEmit`: passou. Lint dos arquivos alterados: passou.

`npm.cmd run build`: compilação e TypeScript passaram; o build completo falhou ao coletar `/produto/[slug]` com `supabaseUrl is required`, pois `NEXT_PUBLIC_SUPABASE_URL` não está configurada neste ambiente. Nenhuma credencial fictícia ou mudança na página individual foi usada para mascarar isso.

O ambiente não tem navegador conectado; reprodução visual em 375, 390, 430px, tablet e desktop, interação real com o catálogo conectado e abertura do produto continuam pendentes. Os testes de interação não substituem QA visual nem comprovam a disponibilidade do banco real. Nenhum teste consultou ou gravou banco real.

Não foram alterados Home, Nossa História, ProductCard, produto individual, carrinho, checkout, Pix, entrega, Geoapify, admin, importação, Firebase, Firestore, schema ou RLS.

Referências oficiais: [range](https://supabase.com/docs/reference/javascript/using-modifiers-range), [select/count](https://supabase.com/docs/reference/javascript/select) e [AbortSignal](https://supabase.com/docs/reference/javascript/using-modifiers-abortsignal).
