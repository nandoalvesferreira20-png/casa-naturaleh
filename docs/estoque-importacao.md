# Correção do estoque na importação

## Fonte real e diagnóstico

Arquivo da raiz: `produtos_2026-10-08-1.xls`, XLS binário, aba `Produtos`, cabeçalho na linha 1. A planilha foi apenas lida; a alteração local que já existia foi preservada.

Colunas: ID, Código (SKU), Produto, Unidade, Preço, Estoque, GTIN/EAN, URL imagem 1, Categoria, Sub-Categoria, Marca.

Unidades originais: **KG: 289**, **UN: 367**. Nenhuma outra unidade. Preços são células numéricas, inclusive `4.489` e `1.389`, sem arredondamento na leitura. Estoques são células numéricas com ponto decimal na representação JS, exceto sete células de texto `FORA DE LINHA`. Exemplos: 2.106, 0.934, 5.04, 13.43. Ponto é decimal neste arquivo, não milhar. Há seis estoques negativos, três deles decimais KG.

Reprodução local com a classificação atual, sem produtos existentes nem revisões manuais:

| Erro anterior | Linhas |
| --- | ---: |
| Estoque inválido | 291 |
| Categoria incerta | 39 |
| URL de imagem inválida | 1 |
| Preço inválido | 0 |
| Outros | 0 |

Os erros se sobrepõem: **325 linhas inválidas**, **331 válidas**. Não se deve somar os motivos como se fossem produtos distintos.

Das 291 linhas com estoque inválido, **282 são KG** e **9 são UN**. Das 325 linhas inválidas no total, 282 são KG e 43 UN.

**278** linhas possuem estoque decimal não negativo que era rejeitado exclusivamente pela regra inteira do estoque; todas são KG. Quatro também têm categoria incerta, portanto somente **274** produtos passam a válidos. Incluindo os negativos, existem **281 estoques fracionários**; os três negativos continuam inválidos.

## Exemplos reais anteriores à correção

Valores originais numéricos, sem formatação monetária ou conversão:

| Linha | Nome | Unidade | Estoque original | Preço original | Erro anterior |
| --- | --- | --- | ---: | ---: | --- |
| 2 | ABACAXI DESIDRATADO - 100g | KG | 2.106 | 14.9 | Estoque inválido |
| 3 | AÇAI EM PO DESIDRATADO - 100g | KG | 0.934 | 17.9 | Estoque inválido |
| 4 | AÇUCAR DE COCO - 100g | KG | 5.04 | 4.489 | Estoque inválido |
| 6 | AÇUCAR DEMERARA ORGANICO - 100g | KG | 2.918 | 1.9 | Estoque inválido |
| 7 | AÇUCAR MASCAVO - 100g | KG | 2.144 | 1.69 | Estoque inválido |
| 653 | XILITOL CRISTAL - 100g | KG | 13.43 | 4.99 | Estoque inválido |

Xilitol agora é válido: estoque interno **13430**, unidade comercial **KG**, preview **13,43 kg**, preço **4.99**, sem conversão de preço.

## Causa e implementação

Os dois validadores exigiam `/^\d+$/` para todo estoque e ignoravam Unidade. A leitura já preservava a unidade como contexto, mas a gravação descartava essa informação e fazia `Number(produto.estoque)`.

- Parsing separado: dinheiro (`parsePreco`), estoque unitário (`parseEstoqueUnitario`) e peso (`parsePeso`).
- UN, UND, UNIDADE e UNIDADES normalizam para UN e exigem inteiro. KG aceita decimal com ponto ou vírgula.
- Peso vira gramas por manipulação dos dígitos, sem multiplicação com arredondamento binário, arredondar ou truncar. Frações não representáveis em gramas são rejeitadas; zeros adicionais não alteram o valor.
- Tanto estoque unitário quanto gramas respeitam 0 a 2147483647.
- Estoque original é preservado. Validação produz `estoqueInterno` e `unidadeNormalizada`; revalidar não multiplica o estoque novamente.
- Importação grava estoque convertido e `unidade` no mesmo INSERT; relê e revalida o arquivo no servidor.
- Preview exibe kg ou unidades, mantém motivos reais de erro e o status ✓ Válido existente.
- Unidade explícita vazia ou desconhecida é inválida. Arquivos legados sem coluna Unidade continuam como UN. Coluna Peso não é mais confundida com Unidade.
- Estoque vazio em coluna existente é inválido. Ausência da coluna conserva o padrão legado 0 com aviso.

## Resultado após a correção

| Resultado | Antes | Depois |
| --- | ---: | ---: |
| Produtos encontrados | 656 | 656 |
| Válidos | 331 | **605** |
| Inválidos | 325 | **51** |

Erros remanescentes: 13 estoques inválidos (9 UN, 4 KG), 39 categorias incertas e 1 URL inválida, com sobreposição. Os 13 estoques são seis negativos e sete `FORA DE LINHA`. Há 655 URLs HTTP válidas na planilha atual; a linha com URL inválida permanece bloqueada. A indicação visual de 656 produtos com imagem não prova validade das 656 URLs.

Esses totais são validação local, não importação realizada. Revisões manuais de categoria, produtos existentes no banco e falhas de download podem modificar o resultado final.

## Schema e SQL manual

O projeto documenta estoque como PostgreSQL integer. Não há schema SQL, arquivo de ambiente ou variáveis Supabase disponíveis nesta sessão para comprovar o tipo no banco real ou a existência de `products.unidade`. Não é correto afirmar que essa coluna existe ou está ausente sem consultar o banco.

`products-unidade.sql` fornece a consulta a `information_schema.columns` para verificar ambos os campos e o ALTER condicional. Se unidade não existir, será necessário adicioná-la manualmente. Se já existir, a importação usa esse campo; conferir tipo e semântica existentes antes da implantação. Nenhuma alteração de banco foi executada.

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'products'
  AND column_name IN ('estoque', 'unidade');

-- Somente se unidade não existir:
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unidade text;
```

A migração proposta mantém produtos anteriores com unidade NULL, sem presumir UN nem converter estoque antigo. Antes de gravar produtos ou enviar imagens, a API consulta explicitamente `products.estoque` e `products.unidade`. Falha de consulta bloqueia a importação com mensagem de schema; o preview continua disponível. Essa consulta comprova existência das colunas na execução, mas não substitui a verificação do tipo via SQL.

## Validação

- **68 testes passaram**, nas suítes de importação e classificação.
- Cobertura: formatos KG e UN solicitados, `10.000 = 10 kg`, exemplos reais, unidades equivalentes/desconhecidas, negativos, texto, vazio obrigatório, fração de grama, limite integer, preview, revalidação idempotente, persistência conjunta unidade/gramas, preço preservado, contagem 605/51 e bloqueio sem unidade antes de qualquer upload.
- `npx.cmd tsc --noEmit`: **passou**. Foi usado o executável `.cmd` porque o PowerShell bloqueia o shim `.ps1` não assinado.
- `npm.cmd run build`: compilação e verificação TypeScript **passaram**. Build completo **falhou** na coleta de dados de `/produto/[slug]`: `supabaseUrl is required`, porque o ambiente não tem `NEXT_PUBLIC_SUPABASE_URL`. Não foram inventadas credenciais nem alterada a página de produto para mascarar o erro.
- Nenhum teste gravou banco real ou importou a planilha.

Reprodução: `node scripts/analisar-estoque.mjs tests/estoque-depois.json`. O script também reproduz a regra anterior para comparar os motivos e totais. `tests/estoque-antes.json` registra o diagnóstico realizado antes das alterações.

## Impacto para a próxima etapa

Carrinho, checkout, baixa de estoque, Pix, entrega, Geoapify, loja, ProductCard, admin de pedidos, Firebase e regras Firestore não foram alterados.

Antes de vender os produtos KG, será necessário definir quantidade comercial/peso vendido, confrontar gramas com a quantidade solicitada, calcular preços pela base correta e exibir unidade no catálogo e no carrinho. A planilha identifica KG mas muitos nomes dizem 100g, inclusive Xilitol a 4.99; ela não comprova sozinha que esses preços sejam por KG. Os preços foram preservados integralmente.

Também precisam de revisão posterior o formulário administrativo de edição, estoque baixo e valor em estoque: hoje usam números crus e cálculos por unidade. A importação passa a carregar a unidade necessária para corrigir esses usos. Produtos antigos NULL exigirão classificação e eventual conversão explícitas. Não foi feita migração ou conversão desses produtos.
