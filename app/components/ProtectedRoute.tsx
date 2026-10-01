"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const router = useRouter();

  const usuarioLogado = false;

  useEffect(() => {
    if (!usuarioLogado) {
      router.replace("/login");
    }
  }, [usuarioLogado, router]);

  if (!usuarioLogado) {
    return null;
  }

  return <>{children}</>;
}