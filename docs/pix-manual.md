# Pix manual — Casa Naturaleh V1

## Fluxo ativo

`/loja → carrinho → checkout seguro → pedido Firestore + BR Code → QR local + copia e cola → confirmação manual pelo admin`

`/loja` continua sendo o catálogo oficial, com os mesmos produtos, imagens, busca e filtros. Não há catálogo separado.

O checkout oferece somente Pix. A API continua verificando Firebase ID Token com Firebase Admin, consultando produtos/estoque no Supabase e recalculando os preços em centavos. Dados de pagamento, preço, total, identidade e status enviados pelo navegador não controlam o pedido.

O servidor aloca o ID do pedido, calcula o payload com o mesmo total salvo em `order.total` e grava pedido e pagamento juntos. Se a configuração Pix estiver ausente ou inválida, retorna 503 com mensagem amigável, sem gravar pedido parcial. O carrinho é preservado nesse erro, conforme o fluxo anterior.

```text
status: aguardando_pagamento
pagamento: pix
payment:
  provider: pix_manual
  method: pix
  status: pending
  txid: referência determinística do pedido
  pixCopyPaste: BR Code completo
  createdAt: timestamp do servidor
```

O txid usa SHA-256 do orderId, truncado para caber em 25 caracteres, com prefixo opcional. Evita colisões simples que surgiriam ao apenas remover hífens/truncar IDs. A referência fica salva e visível no pedido. Não é garantia matemática de unicidade absoluta após truncamento; a conferência usa também pedido, valor e recebimento bancário.

O payload inclui chave, nome, cidade, BRL, valor com duas casas, txid e CRC16/CCITT-FALSE. O gerador também aceita descrição opcional e valida o tamanho total do campo EMV; a V1 usa o txid como referência sem adicionar descrição ao template da chave.

O frontend apenas desenha o payload persistido usando `qrcode` em um canvas, após montagem. Não calcula um novo total/payload nem consulta serviço externo de QR. Copiar o código não altera o pagamento. O botão mostra “Código Pix copiado!” ou permite cópia manual se o clipboard não estiver disponível.

## Configuração manual

Adicione no ambiente local e no ambiente correspondente da Vercel, sem prefixo `NEXT_PUBLIC_`:

```dotenv
PIX_KEY=<chave-Pix-cadastrada-do-recebedor>
PIX_RECEIVER_NAME=<nome-do-recebedor>
PIX_RECEIVER_CITY=<cidade-do-recebedor>
PIX_TXID_PREFIX=CN
```

`PIX_TXID_PREFIX` é opcional: vazio ou até 5 letras/números ASCII, sem espaços. As três primeiras variáveis são obrigatórias para finalizar pedidos. Nenhum `.env` foi editado nesta implementação. Reinicie o servidor local após configurar; aplique as variáveis no ambiente do deploy e publique a versão atualizada.

Formato da chave:

| Tipo | Formato esperado |
| --- | --- |
| CPF | 11 dígitos, sem pontos ou hífen |
| CNPJ | 14 dígitos, sem pontos, barra ou hífen |
| Telefone | E.164: `+` e código do país/DDD/número, sem espaços; exemplo de formato brasileiro: `+5511999999999` |
| E-mail | Em minúsculas, até 77 caracteres |
| Aleatória | UUID em minúsculas com hífens |

Use a chave exata registrada no banco, pertencente ao recebedor pretendido. O gerador valida formato; não consulta DICT nem confirma cadastro ou titularidade. Não altera silenciosamente a chave. Nome/cidade são normalizados para ASCII maiúsculo, sem acentos, limitados a 25/15 caracteres. Confira o recebedor apresentado pelo banco antes de qualquer pagamento real.

A chave não é incluída no bundle como variável pública, mas necessariamente está no BR Code entregue ao comprador e salvo no pedido. Chave Pix não equivale a access token ou senha bancária; não coloque credenciais nessas variáveis.

## Confirmação manual e pedidos antigos

O admin de pedidos existente continua alterando `order.status` de `aguardando_pagamento` para `pagamento_aprovado` depois de conferir o recebimento no banco. Não foi alterado o painel nem sua lógica de autorização/escrita.

Para Pix manual, a interface deriva a confirmação do status raiz: aprovado, em preparação/separação, enviado e entregue exibem pagamento aprovado. Cancelado não oferece QR. `payment.status` nasce `pending` e não é atualizado pelo painel atual; o status raiz é a fonte da confirmação manual nesta V1. Atualize a página do cliente para consultar o status após a alteração do admin; não há polling/webhook.

Não há comprovação automática, botão “já paguei”, reserva/baixa de estoque, expiração automática, recibo ou conciliação bancária. Confira valor e referência efetivamente recebidos antes de aprovar; gerar/copiar/escanear um QR não comprova pagamento.

Pedidos sem `payment` continuam usando seu status anterior. Pedidos com pagamento Mercado Pago continuam legíveis e exibem o status salvo, com orientação de contato quando pendentes. Não são convertidos em Pix manual e não recebem nova cobrança. Não houve migração de documentos. Pagamentos antigos em aberto exigem conferência da loja, pois o webhook antigo está pausado.

## Mercado Pago preservado, fora do fluxo

- `mercado-pago.ts`, serviço, provider, PaymentPanel e MercadoPagoForm permanecem para uma integração futura.
- Nenhum deles é importado pelo fluxo ativo de checkout/confirmado. Não há Payment Brick, script MercadoPago.js ou chamada client a `/api/payments`.
- GET e POST de `/api/payments` e POST de `/api/webhooks/payments/mercado-pago` retornam 503 antes de consultar autenticação/provedor ou atualizar pedidos. Isso vale mesmo que existam credenciais antigas.
- O GET de diagnóstico do webhook permanece retornando JSON estático; não processa notificações.
- O bloqueio está em `app/lib/payments/availability.ts`. Não é controlado por credenciais/variáveis antigas. Uma reativação futura exige revisão de fluxo e tipos de pedidos e homologação própria; apenas mudar a flag não constitui uma integração completa.
- Nenhuma credencial Mercado Pago é necessária para a V1. As APIs e os testes da arquitetura futura foram preservados.

## Dependências

- `qrcode`: codificador de QR local, com suporte ao navegador. Evita implementar codificação/correção de erros de QR artesanalmente. O payload financeiro é gerado internamente, sem API externa.
- `@types/qrcode`: tipos TypeScript, somente desenvolvimento.

O override anterior de `jose` para `jwks-rsa` foi preservado.

## Testar

1. Configure as variáveis Pix e faça login. Adicione produtos pela `/loja` e finalize o checkout com Pix.
2. Confira pedido pendente, total calculado pelo servidor e a presença de `payment.provider = pix_manual`, `method = pix`, `status = pending`, txid e payload.
3. Abra `/pedido-confirmado?id=...`: confira valor, referência, QR e copia e cola. Copie e compare a string inteira. Recarregue para confirmar que o payload continua igual.
4. Sem confirmar transferência, leia o QR no banco e confira recebedor/valor. Essa homologação bancária depende da chave real configurada pela loja e não foi executada automaticamente.
5. Confirme que gerar/copiar o QR deixa o pedido pendente. No admin de pedidos, altere o status manualmente e recarregue o pedido/histórico: deve mostrar aprovação sem oferecer novo pagamento.
6. Confira pedido legado sem pagamento e pedido antigo Mercado Pago: ambos continuam legíveis, sem carregar o Brick.
7. Na aba Network, não deve haver chamada a Mercado Pago ou `/api/payments`. Chamadas diretas às rotas antigas devem retornar 503.
8. Os testes automatizados cobrem falta de autenticação, carrinho/produtos/estoque inválidos, adulteração de preço/pagamento, falta de configuração Pix, valor/txid/CRC, QR completo, cópia e fallback, status manual, legado e isolamento do gateway. Nenhum teste faz pagamento ou grava banco real.

## Arquivos

Criados: `app/lib/pix/pix.ts`, `app/lib/pix/types.ts`, `app/lib/payments/availability.ts`, `app/components/payments/ManualPixPanel.tsx`, `tests/pix.test.mjs`, `docs/pix-manual.md`.

Alterados: `app/api/checkout/route.ts`, `app/checkout/page.tsx`, `app/pedido-confirmado/PedidoConfirmadoClient.tsx`, `app/meus-pedidos/page.tsx`, `app/api/payments/route.ts`, `app/api/webhooks/payments/mercado-pago/route.ts`, `tests/checkout.test.mjs`, `tests/payments.test.mjs`, `package.json`, `package-lock.json`, `docs/pagamentos.md`.

Admin de produtos/importação CSV, catálogo, CRUD, Storage, Supabase products, Rules/RLS e estoque não foram alterados. Os wrappers Server Component + Suspense permanecem intactos.

## Validação desta entrega

- `npm run build`: aprovado, 22/22 páginas. A primeira tentativa foi bloqueada pelo sandbox Windows ao resolver o caminho do projeto; a execução autorizada fora do sandbox passou sem alteração da configuração Next.js.
- `npx tsc --noEmit`: aprovado.
- `node --test tests/*.test.mjs`: 73 testes aprovados, zero falhas (inclui checkout, Pix, arquitetura de gateway preservada, carrinho e testes de importação existentes).
- Lint dos arquivos de código/testes alterados: aprovado.
- Nenhum teste realizou pagamento, chamou Mercado Pago ou escreveu em banco/estoque real. Homologação no aplicativo bancário com a chave da loja ainda é manual.

## Referências oficiais

- [Manual oficial do Banco Central — padrões para iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf): QR estático, txid, TLV e CRC.
- [Documentação do qrcode](https://github.com/soldair/node-qrcode): geração local em canvas e codificação do texto completo.
