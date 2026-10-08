import { Suspense } from "react";
import PedidoConfirmadoClient from "./PedidoConfirmadoClient";

export default function PedidoConfirmadoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-[var(--color-text-light)]">
            Carregando...
          </p>
        </div>
      }
    >
      <PedidoConfirmadoClient />
    </Suspense>
  );
}
