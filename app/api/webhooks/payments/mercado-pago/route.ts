import { paymentService } from "../../../../lib/payments";
import { paymentFailure, paymentResponse } from "../../../../lib/payments/http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await paymentService.webhook("mercado_pago", request);
    return paymentResponse({ received: true });
  } catch (error) { return paymentFailure(error); }
}
