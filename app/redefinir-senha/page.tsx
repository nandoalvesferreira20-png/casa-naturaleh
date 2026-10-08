import { Suspense } from "react";
import RedefinirSenhaClient from "./RedefinirSenhaClient";

export default function RedefinirSenhaPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
          <section className="flex min-h-[calc(100vh-120px)] items-center justify-center px-6 py-16">
            <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-sm">
              <div className="bg-[var(--color-bg-soft)] px-8 py-10 text-center md:px-12">
                <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
                  Casa Naturaleh
                </span>
                <h1 className="mt-4 text-3xl font-semibold md:text-4xl">
                  Redefinir sua senha
                </h1>
                <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--color-text-light)]">
                  Crie uma nova senha para acessar sua conta com segurança.
                </p>
              </div>
              <div className="p-8 md:p-12">
                <div className="py-8 text-center">
                  <p className="text-sm text-[var(--color-text-light)]">
                    Validando seu link...
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      }
    >
      <RedefinirSenhaClient />
    </Suspense>
  );
}
