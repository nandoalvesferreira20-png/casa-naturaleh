# Pagamentos — Casa Naturaleh

Implementação da sprint de pagamentos. Integração externa ainda precisa ser homologada com as credenciais de teste do lojista. Nenhuma cobrança real ou alteração de estoque foi realizada durante o desenvolvimento.

## Arquitetura

`Checkout seguro → order no Firestore → PaymentPanel → API autenticada → PaymentService → PaymentProvider → MercadoPagoProvider`

O checkout existente continua validando produtos/estoque no Supabase e calculando preços no servidor. O único acréscimo na criação do pedido é `payment`, com provedor, método, status genérico e UUID da operação. O formulário de pagamento aparece dentro do site, em `/pedido-confirmado?id=...`, depois que o pedido seguro foi criado. O carrinho mantém o comportamento anterior.

`PaymentService` concentra propriedade do pedido, idempotência, associação e atualização de status. `PaymentStore` isola a persistência; sua implementação usa as transações do Firebase Admin já existente. `MercadoPagoProvider` concentra endpoints, autenticação externa, normalização e assinatura. `MercadoPagoForm` é o adaptador visual do SDK. Checkout, histórico e admin não chamam Mercado Pago diretamente.

Para outro gateway: implementar `PaymentProvider`, registrar em `provider.ts`, ampliar `PaymentProviderName`, adicionar seu adaptador visual e endpoint de webhook. O provedor fica registrado por pedido; pedidos antigos continuam associados ao gateway original. Não basta trocar a variável para um nome ainda não implementado.

### Fluxo e dados

- `POST /api/payments`: Firebase ID Token obrigatório; recebe `orderId` e dados mínimos tokenizados. Busca o pedido, confere `userId` e usa exclusivamente `order.total`. Campos como `amount` ou `transaction_amount` enviados pelo navegador não são usados.
- `GET /api/payments?orderId=...`: mesma autenticação e verificação de propriedade. Retorna apenas sessão, valor, método, status, chave pública quando necessária e instruções de pagamento. Respostas são `no-store`.
- O UUID persistido em `payment.operationId` vai no `X-Idempotency-Key` e em `metadata.payment_operation`; `external_reference` recebe o ID do pedido.
- Antes da chamada externa, uma transação reserva a operação e registra um hash dos dados normalizados. Não persiste o token de cartão nem o documento usado no pagamento. Pedidos já vinculados retornam a cobrança existente.
- Se a resposta externa se perder, a consulta procura a operação pela referência e metadata e busca o recurso individual. Não cria silenciosamente outra tentativa.
- Cartão é tokenizado pelo SDK oficial; nossa API não recebe PAN/CVV pelo formulário. Entradas extras são descartadas. Nenhum access token, secret, documento de pagamento ou token de cartão é gravado no pedido.
- `payment` guarda somente identificação da operação/cobrança, método, status genérico e bruto, timestamps, fase, hash e dados de apresentação. `updatedAt` é timestamp do Firestore; `providerUpdatedAt` ordena observações externas.

### Confirmação por webhook

`POST /api/webhooks/payments/mercado-pago`

A assinatura HMAC SHA-256 usa `data.id` da query string, `x-request-id`, timestamp de `x-signature` e secret privado, com comparação em tempo constante. O corpo da notificação não determina o status nem o ID consultado. Após validar a assinatura, o servidor consulta `/v1/payments/{id}` com credencial privada.

A atualização verifica provedor, ID da cobrança, referência, UUID da operação, método, BRL, ambiente e valor em centavos. O mesmo webhook reaplicado não causa outra escrita; observações antigas não desfazem observações recentes. Uma resposta de criação atrasada também não desfaz uma confirmação recebida antes dela.

Uma resposta `approved` à criação ainda aparece como pendente até a confirmação por webhook. Só então o pedido em `aguardando_pagamento` passa para `pagamento_aprovado`. A atualização preserva etapas posteriores de entrega. Reembolso/contestação são refletidos no status genérico do pagamento, sem redefinir automaticamente o fluxo logístico do pedido.

Há um TODO explícito para baixa de estoque idempotente na próxima sprint. Não há escrita no Supabase nesta camada nem side effects financeiros na recepção de notificações.

### Compatibilidade

`payment` é opcional em pedidos existentes. `/meus-pedidos` mantém o status do pedido e acrescenta o status genérico de pagamento quando disponível. `/pedido-confirmado` usa o status antigo como fallback. O painel admin mantém a estrutura de leitura e os status raiz existentes, sem alterações.

Pedidos sem `payment` não recebem cobrança automática: eles podem ter sido criados antes do checkout seguro. Não foi feita migração ou exclusão de dados.

## Integração oficial escolhida

Foi consultada a documentação atual do **Checkout Bricks / Payment Brick, fluxo Guest**. Esse fluxo continua documentando a criação por `POST /v1/payments`; não usamos exemplos de Card Form legado. A integração usa `https://sdk.mercadopago.com/js/v2` via `next/script` e `fetch` no backend. Nenhuma dependência npm foi instalada.

Meios implementados: Pix (`pix`), cartão de crédito e boleto (`bolbradesco`), sujeitos à habilitação da conta e disponibilidade do provedor. Não inclui carteira Mercado Pago, débito, assinatura, reembolso por API ou captura manual.

Referências oficiais consultadas:

- [Visão geral do Checkout Bricks](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/overview).
- [SDK oficial: Payment Brick Guest](https://github.com/mercadopago/sdk-js/blob/main/docs/bricks/payment-guest.md).
- [Envio de cartões](https://www.mercadopago.com.br/developers/es/docs/checkout-bricks/payment-brick/payment-submission/cards?scope=prod).
- [Envio de Pix](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/payment-submission/pix).
- [Boleto e demais meios offline](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/payment-submission/other-payment-methods).
- [Assinatura e configuração de Webhooks](https://www.mercadopago.com.br/developers/en/docs/links-and-debts/additional-content/your-integrations/notifications/webhooks).
- [Consultar pagamentos por referência](https://www.mercadopago.com.br/developers/en/reference/online-payments/subscriptions/search-payments/get).

## Configuração manual

Nenhum arquivo `.env`, secret, Firestore Rules ou política RLS foi alterado. Adicione manualmente, no ambiente de teste:

```dotenv
PAYMENT_PROVIDER=mercado_pago
PAYMENTS_ENVIRONMENT=test
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=<public-key-de-teste>
MERCADO_PAGO_ACCESS_TOKEN=<access-token-de-teste>
MERCADO_PAGO_WEBHOOK_SECRET=<assinatura-secreta-da-aplicacao>
MERCADO_PAGO_WEBHOOK_URL=https://SEU-HOST-HTTPS/api/webhooks/payments/mercado-pago
```

Somente a public key pode ser pública. Não crie variável `NEXT_PUBLIC_` para access token ou secret. Continue usando as configurações Firebase Admin e Supabase já existentes. Reinicie o servidor após configurar.

O padrão é `test`, com exigência de access token iniciado por `TEST-`. Isso bloqueia uso acidental de token de produção. A resposta também deve ter `live_mode=false`. Não mude para `production` para contornar um problema de configuração. Uma futura ativação real exige revisão e homologação separadas, não executadas nesta sprint.

### No painel Mercado Pago

1. Na conta real do vendedor, entre em **Suas integrações**, crie/selecione a aplicação de pagamentos online com Checkout Bricks.
2. Em **Detalhes da aplicação → Credenciais**, obtenha public key e access token **de teste**, pertencentes à mesma aplicação/conta. Copie manualmente para seu ambiente. Não envie essas credenciais pelo chat.
3. Para Pix, confira o cadastro/habilitação da chave Pix da conta. Confira também os meios disponíveis para a aplicação.
4. Disponibilize você mesmo um endereço HTTPS de homologação ou túnel de desenvolvimento. Nenhum deploy/túnel foi criado automaticamente.
5. Em **Webhooks → Configurar notificações**, configure a URL abaixo para testes e selecione eventos de **Pagamentos / Payments**. Não use IPN ou eventos de Orders para este adaptador.
6. Revele e copie a assinatura secreta da aplicação para `MERCADO_PAGO_WEBHOOK_SECRET`. A mesma URL é usada em `notification_url` ao criar o pagamento.
7. Use a ferramenta do painel para simular/reenviar a notificação de um pagamento de teste associado a um pedido desta aplicação. Um ID fictício ou de outro pedido é rejeitado; o simulador sozinho não representa aprovação válida.

URL: `https://SEU-HOST-HTTPS/api/webhooks/payments/mercado-pago`

`localhost` não é alcançável pelo Mercado Pago. A URL deve preservar a query string `data.id` e os headers de assinatura. Em caso de erro de assinatura ou consulta, a rota responde com erro sem aprovar o pedido. Não desative essa validação para fazer um teste passar.

## Como homologar sem cobrança real

Siga o [roteiro oficial de compra de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/integration-test/test-payment-flow). Para cartão e meios offline no Bricks, ele orienta usar credenciais de teste da conta real. Use um e-mail de pagador diferente do vendedor e não use e-mail de conta de teste no Brick. O e-mail efetivo da cobrança nesta implementação é o informado no pedido.

1. Faça login na Casa Naturaleh, adicione produto e conclua o checkout. O backend deve criar pedido pendente.
2. Na página do pedido, confirme que o método selecionado aparece no formulário seguro. Nenhum valor enviado pelo navegador deve mudar `order.total`.
3. **Pix:** preencha o documento solicitado. Após envio, confira QR, copia e cola e vencimento quando retornados. Recarregue: as instruções devem continuar disponíveis. Não pague o QR com banco real.
4. **Cartão:** use apenas um dos [cartões de teste oficiais](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/integration-test/test-cards), com os dados e nome de titular indicados na tabela para simular aprovação e recusa. Não use cartão real. Aguarde webhook válido para ver aprovação no site.
5. **Boleto:** preencha os dados de teste, confira URL, código e vencimento retornados. O endereço de cobrança vem do pedido. Não efetue pagamento bancário real.
6. Os meios offline geram pagamentos de teste pendentes. A transição aprovada é coberta por mocks; confirme com as ferramentas disponíveis da sua conta antes de afirmar homologação ponta a ponta.
7. Reenvie a mesma notificação de teste: não deve duplicar cobrança, pedido ou atualização. Altere a assinatura: deve receber 401 sem alterar dados.
8. Entre com outra conta: a API não deve permitir acessar/cobrar o pedido original. Confira `/meus-pedidos` e o admin com pedidos novos e antigos.

## Limitações desta sprint

- Sem credenciais não houve homologação real do SDK, teste visual autenticado ou integração ponta a ponta com Mercado Pago/Firestore. Os testes automatizados não usam rede, banco real ou cobranças reais.
- Uma operação de cobrança por pedido. Recusa, erro definitivo de dados ou tentativa com resultado incerto não gera automaticamente outra chave. A tela orienta consultar o status/atendimento; uma próxima sprint pode implementar tentativas novas após reconciliação segura.
- Idempotência de pagamento é por pedido/UUID. O checkout conserva seu bloqueio atual de duplo clique; pedidos distintos criados em abas diferentes continuam sendo operações distintas.
- Aprovação depende de webhook válido entregue. A consulta de status lê o estado confirmado e recupera cobrança cuja resposta de criação se perdeu; não substitui a confirmação por webhook. É necessário monitorar entregas/retries no painel.
- Sem fluxo adicional de desafio 3DS, antifraude próprio, reserva/baixa de estoque, expiração automática, checkout de assinaturas, frete ou conciliação agendada. Status desconhecido do gateway permanece pendente.
- Pedidos legados continuam visíveis, mas não são habilitados para cobrança automática.
- Firestore Rules e RLS permanecem sob sua configuração existente; nenhum acesso foi ampliado.

## Arquivos desta implementação

Criados:

- `app/lib/payments/types.ts`
- `app/lib/payments/provider.ts`
- `app/lib/payments/mercado-pago.ts`
- `app/lib/payments/service.ts`
- `app/lib/payments/firestore-store.ts`
- `app/lib/payments/http.ts`
- `app/lib/payments/index.ts`
- `app/api/payments/route.ts`
- `app/api/webhooks/payments/mercado-pago/route.ts`
- `app/components/payments/MercadoPagoForm.tsx`
- `app/components/payments/PaymentPanel.tsx`
- `tests/payments.test.mjs`
- `docs/pagamentos.md`

Alterados nesta sprint:

- `app/api/checkout/route.ts`: inicializa `payment`, preservando validações anteriores.
- `app/pedido-confirmado/page.tsx`: título sem falsa aprovação, pagamento opcional e painel seguro.
- `app/meus-pedidos/page.tsx`: status genérico opcional e tipagem string de IDs de produtos.
- `tests/checkout.test.mjs`: atualiza expectativa do pedido e mocks para a nova propriedade.

Há alterações anteriores no workspace de outras sprints. Esta lista descreve apenas o trabalho de pagamentos. CRUD/importação de produtos, estoque, carrinho, fontes, layout global e credenciais não foram modificados nesta sprint.

## Verificação local

Comandos reproduzíveis:

```powershell
npx tsc --noEmit
npx eslint app/lib/payments app/components/payments app/api/payments app/api/webhooks/payments app/api/checkout/route.ts app/pedido-confirmado/page.tsx app/meus-pedidos/page.tsx tests/payments.test.mjs tests/checkout.test.mjs
node --test tests/*.test.mjs
npm run lint
npm run build
```

Resultados da execução local:

- TypeScript: aprovado, `npx tsc --noEmit` sem erros.
- Lint dos arquivos desta sprint, incluindo os testes: aprovado, sem avisos.
- Testes: 59 aprovados, 0 falhas; inclui 20 novos testes de pagamentos e 12 do checkout seguro.
- Lint geral: continua bloqueado por problemas anteriores em `app/admin/page.tsx`, `app/admin/produtos/page.tsx`, `app/carrinho/page.tsx`, `app/loja/page.tsx` e `app/page.tsx`. Incluem regras de hooks, `any`, links internos com `<a>` e avisos de imagem. Não foram alterados por estarem fora do escopo. O apontamento encontrado no novo arquivo de teste foi corrigido e o lint específico foi executado novamente com sucesso.
- Build: falhou ao buscar Montserrat em `fonts.googleapis.com` por erro de conexão. A fonte/global layout não foi alterada. O build completo permanece não verificado; TypeScript e testes passaram independentemente.
- `git diff --check`: sem erros de whitespace.

Nenhuma chamada real ao gateway é feita pelos testes: o transporte HTTP é injetado e simulado, e Firebase/armazenamento são substituídos por stubs. O admin e o histórico foram inspecionados quanto à compatibilidade da estrutura, mas não houve teste visual autenticado contra o banco real.
