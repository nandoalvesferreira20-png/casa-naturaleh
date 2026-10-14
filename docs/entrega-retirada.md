# Entrega e retirada — Geoapify

## Fluxo e regras preservadas

ViaCEP no navegador preenche o endereço; `POST /api/checkout` valida dados/autenticação/produtos, chama `geocodeAddress` no servidor, calcula Haversine e grava o pedido. O navegador não define distância, frete, coordenadas ou total.

- Entrega: até 15 km em linha reta; frete R$ 15; apenas Pix; subtotal 100 gera total/Pix 115.
- Retirada: frete zero; Pix ou pagamento local; não consulta geocodificação.
- Nenhuma baixa de estoque, aprovação automática ou mudança no schema.
- Endereço da loja: Av. Francisco Prestes Maia, 561 - Centro, São Bernardo do Campo - SP, 09770-000.

## Provedor e contrato

Endpoint oficial: `https://api.geoapify.com/v1/geocode/search` (GET).

Busca estruturada com `housenumber`, `street`, `postcode`, `city`, `state=São Paulo`, `country=Brazil`, `filter=countrycode:br`, `format=json`, `lang=pt`, `limit=5` e `apiKey`. Parâmetros codificados por URLSearchParams. Resposta esperada: `{ results: [...] }`, com `lat` e `lon` numéricos e metadados de correspondência.

Bairro não é enviado como parâmetro estruturado inventado: o contrato documentado não inclui esse campo. O endereço e o bairro do pedido continuam preservados. Complemento, identidade, nome, telefone, e-mail, UID, orderId e pagamento não são enviados.

Até seis consultas sequenciais por endereço fora do cache: structured, free-form completo, sem bairro, structured com CEP numérico, sem número e CEP/cidade/estado. Não mistura text com campos estruturados. Para no primeiro resultado confiável, deduplica parâmetros iguais e não repete erros de rede/HTTP. Timeout HTTP de 8 segundos por tentativa, sem redirects. Logs temporários somente em desenvolvimento incluem parâmetros sem chave e os campos de endereço/confiança permitidos pelo diagnóstico. Não incluem identidade, contato ou pagamento. O log de distância do serviço foi preservado.

## Configuração manual

```dotenv
GEOAPIFY_API_KEY=<sua-chave-Geoapify>
STORE_LAT=-23.708271301528224
STORE_LNG=-46.546189538791445
```

`GEOAPIFY_API_KEY` é somente server-side. Não criar `NEXT_PUBLIC_GEOAPIFY_API_KEY`. Configure a chave no ambiente local e na Vercel; reinicie/republique após a configuração. Não registre URLs completas do provedor em ferramentas de observabilidade, pois a autenticação oficial utiliza parâmetro de query.

As coordenadas acima **já estavam configuradas localmente** e foram preservadas, não são resultado de nova consulta Geoapify. A chave local foi utilizada no diagnóstico de endereço desta revisão, sem homologar a posição da loja. Não foi necessário geocodificar novamente a loja, pois STORE_LAT/STORE_LNG já existem. Confirme com a loja a precisão dessas coordenadas antes de produção. Não há coordenadas fixas adicionadas ao código, nem geocodificação da loja em cada compra.

Nenhum `.env` foi editado. `NOMINATIM_URL` e `NOMINATIM_CONTACT` não são mais usados e podem ser removidos manualmente. Nenhuma chave Google é necessária. Cadastre/restrinja a chave Geoapify e acompanhe quotas conforme o plano escolhido; nenhum serviço pago foi contratado automaticamente.

## Precisão e decisão de entrega

A correspondência exige país BR, município e estado São Paulo compatíveis e coordenadas válidas. Rua é comparada sem acentos, com abreviações normalizadas e sem partículas de/da/do/das/dos (Rua Pátria corresponde a Rua da Pátria). O endereço exibido/enviado mantém acentos.

- HIGH: building/house/amenity, rua e número correspondentes, CEP compatível quando disponível, confiança geral >= 0,8 e confiança de prédio >= 0,8 quando retornada. Match full_match/inner_part/match_by_building. Permite até 15 km.
- MEDIUM: rua correspondente em building/house/amenity/street. Confiança de cidade/rua, quando retornada, >= 0,8. Não exige número nem confiança de prédio; confiança geral baixa por ausência de prédio não rejeita a rua. CEP ou número divergente impede HIGH, mas permite MEDIUM. Até 13 km permite; acima de 13 até 15 km é inconclusivo; acima de 15 km fica fora.
- LOW: CEP, bairro, cidade ou outro resultado genérico/sem correspondência suficiente. Nunca aprova automaticamente, mesmo perto da loja.

Prioriza HIGH sobre MEDIUM em cada resposta. Pontos HIGH divergentes em mais de 50 m continuam ambíguos. Para múltiplos candidatos MEDIUM, todos devem estar até 13 km para aprovar; todos acima de 15 km para rejeitar por distância. Caso contrário, inconclusivo. Distância reportada é a maior distância Haversine entre os candidatos considerados. Assim, não se escolhe arbitrariamente o ponto mais favorável. O cache preserva nível de precisão e candidatos, com cópias independentes.

Respostas:

- Permitido: “Entrega disponível — R$ 15,00”.
- Fora (422): “Este endereço está fora da nossa área de entrega de 15 km.”
- Inconclusivo (422): “Não conseguimos confirmar com precisão se esse endereço está dentro da área de entrega. Revise os dados ou escolha retirada na loja.”
- Chave ausente/401/403, timeout, rede, 429/5xx ou JSON inválido: 503 amigável, sem expor segredos e sem cache de indisponibilidade.

## Cache e remoção do Nominatim

Cache em memória de até 500 endereços, normalizado e identificado por SHA-256 (endpoint + CEP/rua/número/bairro/cidade/UF). TTL positivo 24 horas, negativo 5 minutos. Chamadas concorrentes iguais compartilham a mesma Promise. Resultado retornado é copiado para não permitir alteração acidental do cache. Cold starts/instâncias independentes possuem caches independentes. Nenhuma coordenada é persistida no pedido ou em nova coleção.

Nominatim e seu limitador específico foram removidos do fluxo e do código ativo. Nenhuma espera de 10 segundos nem transação em `deliveryServiceLimits/nominatim` é executada agora. Se existir esse documento de sprints anteriores, ele permanece sem uso; nenhum dado remoto foi removido. ViaCEP, Haversine, política comercial, Firebase Admin, Pix, WhatsApp e telas de pedidos continuam intactos. A atribuição da interface foi ajustada para Geoapify/OpenStreetMap.

## Arquivos da migração anterior

Alterados: `app/lib/delivery/geocoding.ts`, `app/checkout/page.tsx` (atribuição), `tests/delivery.test.mjs`, `docs/entrega-retirada.md`.

Criado: `tests/geoapify.test.mjs`.

Removido após verificar referências: `app/lib/delivery/nominatim-rate-limit.ts`.

Nenhuma alteração em admin/produtos, importação, Pix manual, Mercado Pago, Firestore Rules, RLS, schema, dependências, `.env`, Haversine ou frete. Alterações anteriores/paralelas foram preservadas.

## Validação

Testes automatizados usam mocks, sem chamadas Geoapify reais: contrato structured, prédio/casa, precisão, coordenadas/estado/país/CEP divergentes, timeout, 401/403/429, cache/deduplicação/TTL, limites Haversine, retirada sem API, frete adulterado, Pix com frete e pedidos antigos.

```text
node --test tests/geoapify.test.mjs tests/delivery.test.mjs tests/checkout.test.mjs tests/pix.test.mjs tests/whatsapp-pix.test.mjs
npm run build
npx tsc --noEmit
```

## Diagnóstico sem pedido

Execute `npm run test:geocode -- "09780-190" "434"`. O script consulta ViaCEP, utiliza a mesma validação do checkout e imprime estratégia, endereço, coordenadas, confiança e tipo quando aprovado. Não importa Firebase/checkout nem cria pedidos. Nunca imprime a chave. Em falha, termina com código 1 e mensagem amigável.

No diagnóstico real de 13/10/2026 para CEP 09780-190, número 434, a primeira consulta structured retornou Rua da Pátria, São Bernardo do Campo, São Paulo. O primeiro candidato tinha CEP 09780-120, result_type building, latitude -23.715642 e longitude -46.539768. O segundo tinha CEP 09770-250, latitude -23.7175194 e longitude -46.5414534. Ambos foram classificados MEDIUM: confiança da rua 0,9, do prédio zero e geral 0,45, além do CEP divergente. A maior distância até as coordenadas configuradas da loja foi 1,1357728059856338 km. Decisão: entrega disponível, R$ 15,00. Nenhum pedido foi criado.

Arquivos desta revisão: app/lib/delivery/geocoding.ts, service.ts e types.ts; scripts/test-geocode.mjs; tests/geoapify.test.mjs; este documento. Haversine, Pix, admin, importação e taxa de entrega preservados.

Testes: 61 aprovados, incluindo todos os cenários de HIGH/MEDIUM/LOW, limites 13/15 km, CEP divergente, confiança de prédio zero, múltiplos candidatos e retirada sem geocodificação.
