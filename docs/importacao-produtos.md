# Importação em lote de produtos

## Uso

Em `/admin/produtos`, abrir **Importar em lote**, selecionar CSV, XLS ou XLSX, revisar o preview e clicar em **Importar X produtos**. A seleção inicial não baixa imagens nem grava no Storage. A categoria padrão, opcional, é aplicada somente às linhas sem categoria; depois de preenchê-la, clicar em **Validar novamente**.

O CSV antigo e a seleção de imagens locais continuam disponíveis. O cadastro manual, edição, exclusão, ativação/desativação e upload manual não foram alterados.

## Análise da planilha real

Arquivo analisado: `produtos_2026-10-08-1.xls`, colocado pelo usuário na raiz do projeto. O arquivo original foi somente lido.

- Aba: `Produtos`.
- Cabeçalho: linha 1.
- 657 linhas preenchidas, incluindo o cabeçalho; 656 produtos.
- 655 URLs HTTP/HTTPS, sendo 653 distintas.
- Uma referência adicional é `blob:https://web.whatsapp.com/...`, inválida para download pelo servidor.
- 654 produtos válidos e 2 com erro, considerando catálogo existente vazio e nenhuma categoria padrão.
- Nenhuma linha está sem referência de imagem; uma referência é inválida.
- Não foram encontrados nomes ou SKUs duplicados na planilha.
- A consulta aos produtos existentes ocorre durante o preview autenticado e novamente na confirmação. Os totais locais acima não incluem duplicados que eventualmente existam no Supabase, nem falhas futuras nos downloads.

| Coluna real | Destino / tratamento |
| --- | --- |
| ID | Identificador do ERP, não persistido; o destino usa novo UUID |
| Código (SKU) | Diagnóstico no preview e apoio para duplicidade interna; não persistido |
| Produto | `nome`; também fornece o slug automático |
| Unidade | Não persistida; o schema não possui esse campo |
| Preço | `preco`, mantendo o valor numérico do Excel |
| GTIN/EAN | Não persistido |
| URL imagem 1 | Referência original para download; `imagem` recebe a URL pública do nosso Storage |
| Categoria | `categoria`, normalizando somente espaços |
| Sub-Categoria | Não persistida; não concatenada silenciosamente à categoria |
| Marca | Não persistida |

Não há colunas de descrição, estoque, situação/status, peso ou slug. Os padrões são `descricao = ""`, `estoque = 0` com aviso, `ativo = true` e slug gerado pelo nome. Há somente uma coluna de imagem; não há colunas de galeria sendo descartadas.

Pendências reais:

| Linha | Produto | Problema |
| --- | --- | --- |
| 258 | DESINCHA MORO CAIXA COM 30 SACHES | Categoria ausente; resolvível com categoria padrão no modal |
| 593 | TEMPERO PARRILLA BLACK POTE 130G | URL `blob:` do WhatsApp, não utilizável pelo backend |

Com categoria padrão preenchida, a validação local passa a 655 válidos e 1 inválido. Detalhes reproduzíveis em `tests/analise-planilha-real.json` e nos testes do importador.

## Normalização e duplicados

O adaptador centraliza os aliases de cabeçalho e identifica nome e preço nas primeiras 50 linhas, inclusive quando existe preâmbulo. CSV aceita vírgula ou ponto e vírgula. XLS/XLSX são lidos com SheetJS. São permitidos até 1.000 produtos e 5 MB de planilha por requisição.

Preços aceitam valores numéricos do Excel, vírgula decimal, ponto decimal, `R$` e milhares brasileiros, como `1.249,90`. Valores positivos com mais casas decimais já presentes no Excel são preservados, sem arredondamento silencioso. A apresentação monetária no preview usa BRL. Estoque precisa ser inteiro não negativo, dentro do intervalo do tipo integer do PostgreSQL. Valores inválidos geram erro.

O slug automático usa minúsculas, remove acentos e caracteres especiais, converte separadores em hífens e remove hífens nas extremidades. CSV antigo pode fornecer slug explicitamente. Colisões de slug entre nomes diferentes dentro da planilha recebem `-2`, `-3`, etc. Correspondência com slug ou nome normalizado de produto existente é marcada como **Possível produto já existente** e ignorada. Nomes repetidos e SKUs repetidos dentro da planilha também são ignorados. Não há comparação de SKU com o banco porque esse campo não existe em `products`.

## Imagens, segurança e rollback

Downloads são feitos no backend somente após confirmação, com quatro operações simultâneas. Aceitam HTTP/HTTPS sem credenciais; DNS é resolvido e todos os endereços devem ser públicos. A conexão usa o IP já validado, prevenindo DNS rebinding. IPs privados, loopback, link-local, metadata e IPv6 mapeado privado são bloqueados. Até três redirecionamentos são aceitos, com nova validação de URL e DNS em cada destino.

Cada requisição de imagem tem timeout de 15 segundos, exige HTTP 200 e MIME JPEG, PNG ou WebP, limita a leitura a 5 MB e verifica a assinatura do conteúdo. URLs repetidas reutilizam a mesma promessa de download/upload. Até 50 MB de imagens são permitidos por operação; excedentes aparecem como falha por linha.

O upload usa bucket `produtos`, pasta `catalogo/`, UUID e slug sanitizado, com extensão derivada do conteúdo validado. O nome vindo da URL não é utilizado. Só a URL pública gerada pelo Storage é gravada em `products.imagem`. Falha no download ou upload impede o cadastro daquela linha e aparece no resultado com a mensagem **Falha ao importar imagem**. Ausência de imagem é sinalizada explicitamente e permite importação com `imagem = ""`; nenhuma imagem placeholder é criada.

Os produtos preparados são inseridos em um único lote. Se o insert falhar, a rota consulta os UUIDs criados antes de remover os uploads, preservando imagens de produtos confirmados, inclusive imagens compartilhadas. A limpeza remove somente caminhos gerados pela tentativa, com até três tentativas. Se o resultado do banco estiver incerto, as imagens são preservadas para não quebrar um possível cadastro e a pendência é informada. Falha na limpeza é registrada e apresentada, sem ocultar possível arquivo órfão.

A rota conserva Firebase ID Token, verificação de admin e uso de Supabase service role exclusivamente no servidor. Nenhuma chave administrativa foi adicionada ao cliente; RLS e schema permanecem inalterados.

## Arquivos e dependências

Alterados por esta tarefa:

- `app/admin/produtos/page.tsx` — somente a função do modal de importação.
- `app/api/admin/produtos/importar/route.ts`.
- `app/lib/importacao-produtos.ts` — limites, tipos e representações de ativo.
- `tests/importacao-produtos.test.mjs`.
- `package.json` e `package-lock.json` — dependências da importação, preservando as alterações anteriores do usuário.

Criados:

- `app/lib/planilha-produtos.ts`.
- `app/lib/imagem-importacao.ts`.
- `tests/analise-planilha-real.json`.
- `docs/importacao-produtos.md`.

Dependências instaladas: SheetJS `xlsx` 0.20.3, distribuído pelo CDN oficial, e `ipaddr.js` 2.5.0. Referência de instalação: https://docs.sheetjs.com/docs/getting-started/installation/nodejs/.

## Validação

- `npm run build`: aprovado.
- `npx tsc --noEmit`: aprovado.
- `node --test tests/importacao-produtos.test.mjs`: 25 testes aprovados.
- Download de uma URL real da primeira linha: aprovado, WebP com 15.618 bytes.
- Testes cobrem XLS real, XLS/XLSX gerados, CSV antigo e brasileiro, cabeçalho, nome, preço, estoque, slug, acentos, colisões, duplicados, autenticação, download, MIME, tamanho, SSRF, redirecionamentos, concorrência, upload, URL própria, rollback e resultado incerto.
- Upload, insert e rollback são testados com doubles do Supabase; não foi executada uma importação no banco de produção.
- O corpo de `AdminProdutosPage`, a partir de sua declaração, foi comparado com o HEAD e permanece idêntico: cadastro manual e CRUD preservados. Não houve teste interativo com sessão admin no navegador.
- ESLint nos módulos da importação e na rota: aprovado. ESLint da página completa mantém dois erros e três avisos anteriores, fora do modal (efeito com setState, tipo any, dependência de efeito e imagens).

Nenhum código de checkout, Pix, Mercado Pago, carrinho, loja, Firestore, Firebase Rules, Supabase RLS, `.env` ou schema foi alterado por esta tarefa. Já existiam alterações do usuário em arquivos de pagamentos/checkout quando o trabalho começou; elas foram preservadas.

O modal mostra estado de processamento durante a importação; não fornece um contador de progresso por imagem em tempo real. O preview valida o formato das referências, sem thumbnail ou download antecipado. A disponibilidade de todas as 655 URLs não foi verificada; falhas são tratadas no momento da importação.
