import { paymentService } from "../../../../lib/payments";
import { paymentFailure, paymentResponse } from "../../../../lib/payments/http";

export const runtime = "nodejs";

// Diagnóstico temporário de publicação; não processa notificações.
export function GET() {
  return Response.json(
    { ok: true, route: "mercado-pago-webhook" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    await paymentService.webhook("mercado_pago", request);
    return paymentResponse({ received: true });
  } catch (error) { return paymentFailure(error); }
}
