// V1: somente Pix manual. Preserva os adaptadores para uma futura reativação deliberada.
// Credenciais antigas ou chamadas diretas não devem reativar cobranças/webhooks.
export const GATEWAY_PAYMENTS_ENABLED = false;

export function gatewayPausedResponse() {
  return Response.json({ error: "Integração de pagamentos online pausada nesta versão." }, {
    status: 503, headers: { "Cache-Control": "no-store" },
  });
}
