# Categorização automática na importação

## Resultado da planilha real

Arquivo: `produtos_2026-10-08-1.xls`, aba `Produtos`, cabeçalho na linha 1. A planilha original foi somente lida.

- Total de produtos: **656**.
- Classificados automaticamente com confiança >= 80%: **512**.
- Para revisão: **144**.
- Revisão recomendada (60% a 79%): **105**.
- Revisão obrigatória (abaixo de 60%): **39**.
- Sem sugestão de categoria: **39**.

| Categoria oficial | Total sugerido | Automáticos | Revisão |
| --- | ---: | ---: | ---: |
| Frutas | 37 | 27 | 10 |
| Culinária | 37 | 23 | 14 |
| Chás | 48 | 24 | 24 |
| Oleaginosas | 32 | 32 | 0 |
| Bebidas | 34 | 34 | 0 |
| Temperos | 33 | 23 | 10 |
| Mercearia | 56 | 40 | 16 |
| Snacks | 46 | 45 | 1 |
| Cereais | 25 | 23 | 2 |
| Bomboniere | 101 | 94 | 7 |
| Suplementos | 85 | 75 | 10 |
| Especiarias | 21 | 21 | 0 |
| Adoçantes | 4 | 4 | 0 |
| Farinhas | 21 | 15 | 6 |
| Sementes | 17 | 12 | 5 |
| Açúcares | 5 | 5 | 0 |
| Confeitaria | 10 | 10 | 0 |
| Cafeteria | 5 | 5 | 0 |
| Sem sugestão | 39 | 0 | 39 |

Os totais são classificações anteriores à revisão manual, sem consultar produtos existentes no Supabase ou testar downloads de todas as imagens. Sugestões incertas podem aparecer na distribuição, mas não são importadas sem confirmação.

## Amostra para revisão manual

| Produto real | Categoria sugerida | Confiança | Status |
| --- | --- | ---: | --- |
| FARINHA DE AMENDOAS - 100g | Farinhas | 97% | Categoria sugerida |
| CASTANHA DE CAJU CRUA - 100g | Oleaginosas | 96% | Categoria sugerida |
| CHA VERDE EM FOLHAS - 100g | Chás | 95% | Categoria sugerida |
| CREATINA 100% PURA EMANA 200G | Suplementos | 96% | Categoria sugerida |
| WHEY 100% PROFIT 900G | Suplementos | 96% | Categoria sugerida |
| CANELA EM PO PREMIUM PURA - 100g | Especiarias | 93% | Categoria sugerida |
| TEMPERO ANA MARIA S/ GLUTAMATO - 100g | Temperos | 94% | Categoria sugerida |
| GRANOLA  SALGADA LEMON PEPPER - 100g | Cereais | 95% | Categoria sugerida |
| SEMENTE DE ABÓBORA COM CASCA SAL - 100g | Sementes | 95% | Categoria sugerida |
| AÇUCAR MASCAVO - 100g | Açúcares | 95% | Categoria sugerida |
| XILITOL CRISTAL - 100g | Adoçantes | 96% | Categoria sugerida |
| CAFÉ GOURMET GRÃO - 100g | Cafeteria | 95% | Categoria sugerida |
| CHOCOLATE BLOCK ARCOR 38G | Bomboniere | 91% | Categoria sugerida |
| CHIPS DE BANANA ACUCAR E CANELA - 100g | Snacks | 92% | Categoria sugerida |
| ALHO GRANULADO DESIDRATADO - 100g | Culinária | 85% | Categoria sugerida |
| CANELA DE VELHO RASURADA - 100g | Chás | 92% | Categoria sugerida |
| TRIDENT CANELA 8G | Bomboniere | 91% | Categoria sugerida |
| AGAR AGAR - 100g | Culinária | 72% | Revisar categoria |
| ARGILA BRANCA - 100g | Sem sugestão | 0% | Categoria incerta |
| COCO CHIPS SEM AÇUCAR - 100g | Snacks | 92% | Categoria sugerida |

Todas as 656 classificações, com motivo e dados originais, estão em `tests/classificacao-planilha-real.json`. Para reproduzir: `node scripts/analisar-classificacao.mjs`.

## Regras e confiança

O classificador `classifyProductCategory` usa somente regras locais. Não há IA externa, novas chaves ou custo por produto. Os percentuais são pontuações heurísticas por regra, não probabilidades estatisticamente calibradas.

A comparação usa minúsculas, remove acentos e normaliza separadores; nome e categoria original são preservados para exibição. As regras estão centralizadas em `categorias-importacao.ts`. Tipos explícitos no início do nome ganham 30 pontos de prioridade, sem alterar sua confiança: granola com lemon pepper permanece em Cereais. A pista não oficial Suplementação Esportiva pode sugerir Suplementos com 72%.

Prioridade: tipo explícito (farinha, suplemento, chá, snack, etc.), categoria original que corresponda à lista oficial, ingrediente específico no nome e pistas na descrição/subcategoria. Termos específicos vencem genéricos: farinha de amêndoas fica em Farinhas, noz-moscada em Especiarias, granulado de chocolate em Confeitaria, alho granulado em Culinária e chips com açúcar/lemon pepper em Snacks. Canela-de-velho recebe Chás. Especiarias são ingredientes aromáticos secos; Temperos são misturas prontas e condimentos compostos.

Tipos e ingredientes explícitos recebem 85% a 97% conforme a regra. Categoria original oficial recebe 90%. Apresentação em cápsulas combinada com marca reconhecida de suplementos recebe 82%. Pistas únicas da descrição/categoria/subcategoria recebem 72%; pistas conflitantes recebem 55%; ausência de sinais recebe 0%. SKU e unidade são mantidos como contexto, mas não decidem uma categoria isoladamente.

Confiança >= 80%: Categoria sugerida. Entre 60% e 79%: Revisar categoria, com botão para confirmar a sugestão. Abaixo de 60%: Categoria incerta; a linha fica bloqueada até uma escolha manual oficial. Não existe fallback silencioso para Outros, Diversos, Geral ou Mercearia.

## Revisão e gravação

No modal existente de `/admin/produtos`, cada linha mostra categoria original, sugestão, motivo, confiança e select com as 18 categorias oficiais. O usuário pode trocar a categoria por linha, confirmar uma sugestão intermediária ou selecionar várias linhas e aplicar uma categoria em massa. O checkbox do cabeçalho seleciona todo o preview.

A categoria padrão opcional agora é um select oficial: confirma apenas sugestões incertas após clicar em Validar novamente. Escolhas individuais prevalecem sobre esse padrão e sobre a classificação automática. Revalidar o mesmo arquivo preserva as correções; selecionar outro arquivo elimina revisões do anterior.

A API recebe somente revisões por número da linha, relê a planilha original, recalcula a classificação e valida cada escolha contra a lista oficial. Rejeita valores forjados, Todos os produtos, linhas inexistentes e revisões duplicadas. `products.categoria` recebe a categoria final corrigida. Confiança, motivo, categoria original e SKU não criam campos no banco.

## Arquivos desta tarefa

Criados: `app/lib/categorias-importacao.ts`, `app/lib/revisao-categorias.ts`, `tests/classificacao-produtos.test.mjs`, `scripts/analisar-classificacao.mjs`, `tests/classificacao-planilha-real.json` e este relatório.

Alterados: `app/lib/importacao-produtos.ts` (tipos), `app/lib/planilha-produtos.ts` (contexto e validação), `app/api/admin/produtos/importar/route.ts` (classificação/revisões), `app/admin/produtos/page.tsx` (somente modal) e `tests/importacao-produtos.test.mjs` (integração).

Nenhuma dependência foi instalada. A lista oficial contém somente as 18 categorias da tabela; Todos os produtos é excluído. Nenhuma categoria nova pode ser criada pela importação, inclusive por requisição adulterada.

Não foram alterados cadastro manual, loja, catálogo, checkout, Pix, entrega, Geoapify, carrinho, Firestore, RLS, Firebase Rules, Mercado Pago, schema ou .env. As alterações anteriores do usuário nesses módulos foram preservadas.

## Validação executada

- `npm run build`: aprovado.
- `npx tsc --noEmit`: aprovado.
- `node --test tests/importacao-produtos.test.mjs tests/classificacao-produtos.test.mjs`: **63 testes aprovados**.
- ESLint dos módulos, rota, script de análise e testes novos: aprovado.
- O corpo de `AdminProdutosPage`, que contém cadastro manual e CRUD, foi comparado com o HEAD: permanece idêntico.
- A gravação da categoria corrigida, rejeição de categorias forjadas e bloqueio de produtos incertos foram verificados nos testes da API, com Supabase simulado. Nenhuma importação em produção foi executada.
- Não foi feito teste interativo em navegador com sessão admin autenticada.

Os testes também preservam a cobertura anterior de XLS/XLSX/CSV, preço, estoque, imagens, autenticação, duplicados, concorrência e rollback.
