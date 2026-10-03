import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import {
  getAuth,
} from "firebase-admin/auth";

import {
  getFirestore,
} from "firebase-admin/firestore";

const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID;

const clientEmail =
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

const privateKey =
  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

if (
  !projectId ||
  !clientEmail ||
  !privateKey
) {
  throw new Error(
    "Variáveis do Firebase Admin não configuradas."
  );
}

const adminApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
    : getApps()[0];

export const adminAuth =
  getAuth(adminApp);

export const adminDb =
  getFirestore(adminApp);

export async function verificarAdmin(
  authorization: string | null
) {
  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    throw new Error(
      "Token não informado."
    );
  }

  const token =
    authorization.replace(
      "Bearer ",
      ""
    );

  const decodedToken =
    await adminAuth.verifyIdToken(
      token
    );

  const usuarioRef =
    adminDb
      .collection("users")
      .doc(decodedToken.uid);

  const usuarioSnapshot =
    await usuarioRef.get();

  if (!usuarioSnapshot.exists) {
    throw new Error(
      "Usuário não encontrado."
    );
  }

  const dados =
    usuarioSnapshot.data();

  if (
    dados?.role !== "admin"
  ) {
    throw new Error(
      "Acesso não autorizado."
    );
  }

  return decodedToken;
}