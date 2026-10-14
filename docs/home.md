# Home da Casa Naturaleh

## Estrutura e fonte de dados

Hero → categorias → produtos em destaque → essência → cafeteria → como chegar → convite final. Header, Footer e metadata globais são preservados.

A Home não usa mais os quatro produtos estáticos (Creatina, Whey, Pasta de Amendoim e Chá Funcional), seus preços ou links de exemplo. Não há fallback de catálogo fictício. Home e `/loja` consultam `products` pelo mesmo cliente `app/lib/supabase.ts`, com a mesma configuração e permissões públicas.

Consulta dos destaques:

```ts
supabase.from("products")
  .select("id,nome,slug,categoria,preco,imagem,estoque")
  .eq("ativo", true)
  .order("criado_em", { ascending: false })
  .limit(4)
```

São até quatro produtos reais, sem criar campo de destaque. Cada consulta de categoria seleciona apenas um ID ativo: `.select("id").eq("ativo", true).eq("categoria", nome).limit(1)`. São oito consultas distintas de existência, em paralelo com a consulta de destaques: no máximo quatro produtos completos e oito IDs, sem carregar centenas de produtos ou baixar o catálogo inteiro. Requisições em andamento são compartilhadas no navegador para evitar duplicação durante o remount do Strict Mode; preços e estoque não recebem cache permanente.

Categorias candidatas oficiais: Chás, Suplementos, Farinhas, Oleaginosas, Cereais, Sementes, Temperos e Snacks. Apenas candidatas com produto ativo retornado são exibidas. Se menos de seis dessas categorias estiverem disponíveis, aparecem apenas as existentes; não se completam vagas com categorias vazias. Falhas são sinalizadas separadamente de catálogo vazio. Sem acesso ao banco real nesta sessão, a disponibilidade exata ainda depende da execução com as credenciais do projeto.

Links usam `/loja?categoria=...`, com codificação do nome. A loja lê o parâmetro ao abrir, mantém o dropdown e a limpeza de filtros sincronizados com a URL e responde ao botão Voltar. Outros parâmetros são preservados. A consulta original da loja continua sendo de produtos ativos. Seu efeito de carregamento foi organizado para atualizar estado nas respostas assíncronas e ignorar respostas após desmontagem, atendendo ao lint atual.

`ProductCard` é reutilizado com os mesmos preço, imagem, estoque e link. O componente não possui botão de adicionar ao carrinho; nenhum foi inventado. A única extensão é `headingLevel` opcional: h3 na Home e o h2 anterior como padrão nas outras páginas.

## Imagens

Assets reais da loja reaproveitados: `/images/hero/casa-naturaleh.jpg` no hero, `/images/hero/loja.jpg` na seção institucional e `/images/hero/cafeteria.avif` na cafeteria. Esta última apareceu no workspace durante o trabalho e foi inspecionada; é usada como foto do ambiente, sem transcrever ou cadastrar o menu/preços visíveis na parede. Imagens de produto existentes reaproveitadas apenas como representação visual de categoria: `/images/produtos/chá.jpg` em Chás e `/images/produtos/creatina.jpg` em Suplementos. Isso não significa que os produtos fotografados estejam em estoque; a disponibilidade vem do banco. Granola foi inspecionada e não reutilizada por ter baixa resolução. As demais categorias têm placeholders explicitamente identificados.

Lista para todas as categorias candidatas. Orientação quadrada, proporção **1:1**, mínimo **800×800 px** para todas. Pasta: **`public/images/categorias/`**.

| Categoria | Conteúdo ideal | Arquivo sugerido | Situação |
| --- | --- | --- | --- |
| Chás | Folhas, ervas ou potes de chá da loja | `chas.jpg` | Opcional: substituir imagem representativa atual |
| Suplementos | Seleção real de embalagens de suplementos | `suplementos.jpg` | Opcional: substituir imagem representativa atual |
| Farinhas | Farinhas em potes ou recipientes reais | `farinhas.jpg` | Placeholder; fornecer foto |
| Oleaginosas | Castanhas, nozes ou amêndoas | `oleaginosas.jpg` | Placeholder; fornecer foto |
| Cereais | Aveia, granola ou outros cereais da seleção real | `cereais.jpg` | Placeholder; fornecer foto |
| Sementes | Chia, linhaça ou sementes disponíveis na loja | `sementes.jpg` | Placeholder; fornecer foto |
| Temperos | Misturas de temperos e potes reais | `temperos.jpg` | Placeholder; fornecer foto |
| Snacks | Seleção de snacks reais comercializados | `snacks.jpg` | Placeholder; fornecer foto |

Ao receber as fotos, atualizar `imagem` nas entradas de `CATEGORIAS_HOME`. Não foram baixadas imagens externas nem geradas fotos artificiais. Os slots têm proporção reservada e `next/image` recebe `fill` e `sizes`; a foto do hero usa `preload`, conforme a documentação instalada do Next.

## Cafeteria e localização

`CafeteriaSection` isola o espaço para o futuro menu. Hoje mostra apenas a foto real do ambiente, “Uma pausa com sabor também faz parte da nossa experiência” e “Em breve, nosso menu completo por aqui”. Nenhum item, preço, combo ou categoria de menu foi inventado. O antigo botão sem destino para o menu foi removido.

Endereço: Av. Francisco Prestes Maia, 561 - Centro, São Bernardo do Campo - SP, 09770-000. Horários fornecidos: segunda a sexta 08:00–19:00 e sábado 08:00–15:00. Não foi inventado horário de domingo.

O iframe usa `https://www.google.com/maps?q=<endereço codificado>&output=embed`, lazy loading, título acessível, altura reservada e largura 100%. Não utiliza SDK, chave de API ou alterações em Geoapify. O endereço define a busca do mapa; o pin e o carregamento visual ainda precisam ser confirmados no navegador.

O botão do hero “Como chegar” leva a `#como-chegar`. “Traçar rota” abre `https://www.google.com/maps/dir/?api=1&destination=<endereço codificado>` em nova aba com `noopener noreferrer` e indicação acessível. A URL de rotas segue a [documentação oficial de Maps URLs](https://developers.google.com/maps/documentation/urls/get-started).

## Validação e limites

- Três testes de consulta passaram: somente ativos, ordem recente, limite de quatro, categorias vazias/inativas excluídas, ausência de fallback fictício e estados explícitos de erro.
- `npx.cmd tsc --noEmit`: passou.
- Lint dos arquivos TS/TSX/MJS alterados: passou.
- `npm.cmd run build`: compilação e verificação TypeScript passaram; build completo falhou na coleta de `/produto/[slug]` com `supabaseUrl is required`, pois `NEXT_PUBLIC_SUPABASE_URL` não está disponível neste ambiente. Nenhuma credencial fictícia foi criada.
- CSS: categorias em duas colunas no mobile e quatro no desktop; produtos em uma coluna até 599px, duas até 1100px e quatro acima disso; mapa empilhado abaixo de 768px, lado a lado no desktop. Botões têm ao menos 44px de altura e foco visível. Um h1 principal, títulos de seção h2 e produtos/categorias h3.
- Não foi possível confirmar visualmente 375, 390, 430px, tablet e desktop: o inventário de computer-use não tem navegadores conectados. A configuração Firebase global também está ausente nesta sessão, conforme a tentativa local anterior. Responsividade e funcionamento visual do mapa ficam pendentes de validação em navegador com o ambiente configurado.
- Não foi feita consulta real ao Supabase, gravação no banco ou modificação de schema. Resultados dos testes usam banco simulado; não comprovam quais produtos/categorias estão ativos no ambiente real.

Arquivos de implementação: `app/page.tsx`, `app/home.module.css`, `app/components/home/HomeCatalogo.tsx`, `app/components/home/CafeteriaSection.tsx`, `app/lib/catalogo-home.ts`, `app/loja/page.tsx` e a extensão semântica em `app/components/ProductCard.tsx`. Testes: `tests/catalogo-home.test.mjs`.

Checkout, Pix, entrega, Geoapify, carrinho, Auth, admin, importação, Firebase, Firestore, schema, baixa de estoque e `/nossa-historia` não foram alterados.
