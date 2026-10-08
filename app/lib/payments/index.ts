import { PaymentService } from "./service";
import { paymentStore } from "./firestore-store";
import { getPaymentProvider } from "./provider";

export const paymentService = new PaymentService(paymentStore, getPaymentProvider);
