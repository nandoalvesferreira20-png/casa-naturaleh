import { paymentService } from "../../../../lib/payments";
import { paymentFailure, paymentResponse } from "../../../../lib/payments/http";
import { GATEWAY_PAYMENTS_ENABLED, gatewayPausedResponse } from "../../../../lib/payments/availability";

export const runtime = "nodejs";

// Diagnóstico temporário de publicação; não processa notificações.
export function GET() {
  return Response.json(
    { ok: true, route: "mercado-pago-webhook" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!GATEWAY_PAYMENTS_ENABLED) return gatewayPausedResponse();
  try {
    await paymentService.webhook("mercado_pago", request);
    return paymentResponse({ received: true });
  } catch (error) { return paymentFailure(error); }
}
