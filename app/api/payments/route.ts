import { paymentService } from "../../lib/payments";
import { authenticatedUser, paymentFailure, paymentResponse } from "../../lib/payments/http";
import { PaymentError } from "../../lib/payments/types";
import { validOrderId } from "../../lib/payments/service";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const uid = await authenticatedUser(request);
    const id = new URL(request.url).searchParams.get("orderId");
    validOrderId(id);
    return paymentResponse(await paymentService.getSession(id, uid));
  } catch (error) { return paymentFailure(error); }
}
export async function POST(request: Request) {
  try {
    const uid = await authenticatedUser(request);
    if (Number(request.headers.get("content-length")) > 16384) throw new PaymentError("Dados de pagamento excedem o limite.");
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > 16384) throw new PaymentError("Dados de pagamento excedem o limite.");
    let body;
    try { body = JSON.parse(text); } catch { throw new PaymentError("Dados de pagamento inválidos."); }
    validOrderId(body?.orderId);
    return paymentResponse(await paymentService.create(body.orderId, uid, body.paymentData));
  } catch (error) { return paymentFailure(error); }
}
