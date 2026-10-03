"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  GoogleAuthProvider,
} from "firebase/auth";

import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";

import { auth } from "../lib/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;

  cadastrar: (
    nome: string,
    email: string,
    senha: string,
    telefone: string,
  ) => Promise<void>;

  entrar: (
    email: string,
    senha: string
  ) => Promise<void>;

  entrarComGoogle: () => Promise<void>;

  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (usuario) => {
        setUser(usuario);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  async function cadastrar(
  nome: string,
  email: string,
  telefone: string,
  senha: string
) {
  const credencial =
    await createUserWithEmailAndPassword(
      auth,
      email,
      senha
    );

  await updateProfile(credencial.user, {
    displayName: nome,
  });

  await setDoc(
    doc(db, "users", credencial.user.uid),
    {
      nome,
      email,
      telefone,
      criadoEm: serverTimestamp(),
    }
  );

  setUser({
    ...credencial.user,
    displayName: nome,
  });
}

  async function entrar(
    email: string,
    senha: string
  ) {
    await signInWithEmailAndPassword(
      auth,
      email,
      senha
    );
  }

  async function entrarComGoogle() {
    const provider = new GoogleAuthProvider();

    await signInWithPopup(
      auth,
      provider
    );
  }

  async function sair() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        cadastrar,
        entrar,
        entrarComGoogle,
        sair,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth precisa ser usado dentro de AuthProvider"
    );
  }

  return context;
}