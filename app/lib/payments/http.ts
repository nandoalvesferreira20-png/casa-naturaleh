import { NextResponse } from "next/server";
import { adminAuth } from "../firebase-admin";
import { PaymentError } from "./types";

export async function authenticatedUser(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) throw new PaymentError("Faça login para acessar o pagamento.", 401);
  try { return (await adminAuth.verifyIdToken(token, true)).uid; }
  catch { throw new PaymentError("Sessão inválida ou expirada. Faça login novamente.", 401); }
}
export function paymentResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export function paymentFailure(error: unknown) {
  return paymentResponse({ error: error instanceof PaymentError ? error.message : "Não foi possível processar o pagamento. Consulte o status em instantes." }, error instanceof PaymentError ? error.status : 500);
}
