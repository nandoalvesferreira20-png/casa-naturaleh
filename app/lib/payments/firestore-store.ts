import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../firebase-admin";
import { PaymentError, type PaymentOrder } from "./types";
import type { PaymentStore } from "./service";

export const paymentStore: PaymentStore = {
  async get(id) {
    const snapshot = await adminDb.collection("orders").doc(id).get();
    return snapshot.exists ? snapshot.data() as PaymentOrder : null;
  },
  async update(id, change) {
    const ref = adminDb.collection("orders").doc(id);
    await adminDb.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new PaymentError("Pedido não encontrado.", 404);
      const patch = change(snapshot.data() as PaymentOrder);
      if (patch) transaction.update(ref, {
        ...patch,
        ...(patch.payment ? { payment: { ...patch.payment, updatedAt: FieldValue.serverTimestamp() } } : {}),
      });
    });
  },
};
