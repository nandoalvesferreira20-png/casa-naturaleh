"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";

type AdminRouteProps = {
  children: ReactNode;
};

export default function AdminRoute({
  children,
}: AdminRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [verificandoAdmin, setVerificandoAdmin] =
    useState(true);

  const [admin, setAdmin] =
    useState(false);

  useEffect(() => {
    async function verificarAdmin() {
      if (loading) {
        return;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        setVerificandoAdmin(true);

        const referencia = doc(
          db,
          "users",
          user.uid
        );

        const snapshot =
          await getDoc(referencia);

        if (!snapshot.exists()) {
          router.replace("/");
          return;
        }

        const dados =
          snapshot.data();

        if (dados.role !== "admin") {
          router.replace("/");
          return;
        }

        setAdmin(true);
      } catch (error) {
        console.error(
          "Erro ao verificar administrador:",
          error
        );

        router.replace("/");
      } finally {
        setVerificandoAdmin(false);
      }
    }

    verificarAdmin();
  }, [user, loading, router]);

  if (
    loading ||
    verificandoAdmin
  ) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[var(--color-bg)]">
        <p className="text-sm text-[var(--color-text-light)]">
          Verificando acesso...
        </p>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return <>{children}</>;
}