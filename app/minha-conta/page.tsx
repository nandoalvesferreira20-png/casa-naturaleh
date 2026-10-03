"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from "firebase/auth";

import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../lib/firebase";

type Endereco = {
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
};

type Perfil = {
  nome?: string;
  email?: string;
  telefone?: string;
  endereco?: Endereco;
};

export default function MinhaContaPage() {
  const { user, sair } = useAuth();
  const router = useRouter();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);

  // Dados pessoais
  const [editando, setEditando] = useState(false);
  const [nomeEditado, setNomeEditado] = useState("");
  const [telefoneEditado, setTelefoneEditado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroEdicao, setErroEdicao] = useState("");

  // Segurança
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState("");
  const [sucessoSenha, setSucessoSenha] = useState("");

  // Endereço
  const [editandoEndereco, setEditandoEndereco] = useState(false);

  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");

  const [salvandoEndereco, setSalvandoEndereco] = useState(false);
  const [erroEndereco, setErroEndereco] = useState("");

  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cepEncontrado, setCepEncontrado] = useState(false);

  useEffect(() => {
    async function carregarPerfil() {
      if (!user) {
        return;
      }

      try {
        setCarregandoPerfil(true);

        const referencia = doc(
          db,
          "users",
          user.uid
        );

        const snapshot = await getDoc(referencia);

        if (snapshot.exists()) {
          const dados =
            snapshot.data() as Perfil;

          setPerfil(dados);

          setNomeEditado(
            dados.nome ||
              user.displayName ||
              ""
          );

          setTelefoneEditado(
            dados.telefone || ""
          );

          if (dados.endereco) {
            setCep(
              dados.endereco.cep || ""
            );

            setRua(
              dados.endereco.rua || ""
            );

            setNumero(
              dados.endereco.numero || ""
            );

            setComplemento(
              dados.endereco.complemento || ""
            );

            setBairro(
              dados.endereco.bairro || ""
            );

            setCidade(
              dados.endereco.cidade || ""
            );

            setEstado(
              dados.endereco.estado || ""
            );

            if (
              dados.endereco.cidade &&
              dados.endereco.estado
            ) {
              setCepEncontrado(true);
            }
          }
        } else {
          setPerfil(null);

          setNomeEditado(
            user.displayName ||
              user.email?.split("@")[0] ||
              ""
          );

          setTelefoneEditado("");
        }
      } catch (error) {
        console.error(
          "Erro ao carregar perfil:",
          error
        );
      } finally {
        setCarregandoPerfil(false);
      }
    }

    carregarPerfil();
  }, [user]);

  const nome =
    perfil?.nome ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Cliente";

  const email =
    perfil?.email ||
    user?.email ||
    "Não informado";

  const telefone =
    carregandoPerfil
      ? "Carregando..."
      : perfil?.telefone ||
        "Ainda não informado";

  const possuiEndereco =
    !!perfil?.endereco?.cep &&
    !!perfil?.endereco?.rua &&
    !!perfil?.endereco?.numero;

  const possuiLoginComSenha =
    user?.providerData.some(
      (provider) =>
        provider.providerId === "password"
    ) ?? false;

  async function handleLogout() {
    try {
      await sair();

      router.push("/login");
    } catch (error) {
      console.error(
        "Erro ao sair da conta:",
        error
      );
    }
  }

  async function handleSalvarDados() {
    if (!user) {
      return;
    }

    setErroEdicao("");

    if (!nomeEditado.trim()) {
      setErroEdicao("Informe seu nome.");
      return;
    }

    try {
      setSalvando(true);

      await setDoc(
        doc(db, "users", user.uid),
        {
          nome: nomeEditado.trim(),
          email:
            user.email ||
            perfil?.email ||
            "",
          telefone:
            telefoneEditado.trim(),
        },
        {
          merge: true,
        }
      );

      if (auth.currentUser) {
        await updateProfile(
          auth.currentUser,
          {
            displayName:
              nomeEditado.trim(),
          }
        );
      }

      setPerfil((perfilAtual) => ({
        ...perfilAtual,
        nome: nomeEditado.trim(),
        email:
          perfilAtual?.email ||
          user.email ||
          "",
        telefone:
          telefoneEditado.trim(),
      }));

      setEditando(false);
    } catch (error) {
      console.error(
        "Erro ao atualizar dados:",
        error
      );

      setErroEdicao(
        "Não foi possível atualizar seus dados."
      );
    } finally {
      setSalvando(false);
    }
  }

  function handleCancelarEdicao() {
    setEditando(false);
    setErroEdicao("");

    setNomeEditado(nome);

    setTelefoneEditado(
      perfil?.telefone || ""
    );
  }

  async function handleAlterarSenha() {
    if (!user || !auth.currentUser) {
      return;
    }

    setErroSenha("");
    setSucessoSenha("");

    if (!user.email) {
      setErroSenha(
        "Não foi possível identificar o e-mail da sua conta."
      );
      return;
    }

    if (!senhaAtual) {
      setErroSenha(
        "Informe sua senha atual."
      );
      return;
    }

    if (!novaSenha) {
      setErroSenha(
        "Informe a nova senha."
      );
      return;
    }

    if (novaSenha.length < 6) {
      setErroSenha(
        "A nova senha deve ter pelo menos 6 caracteres."
      );
      return;
    }

    if (
      novaSenha !==
      confirmarNovaSenha
    ) {
      setErroSenha(
        "A confirmação da nova senha não corresponde."
      );
      return;
    }

    if (senhaAtual === novaSenha) {
      setErroSenha(
        "A nova senha deve ser diferente da senha atual."
      );
      return;
    }

    try {
      setSalvandoSenha(true);

      const credencial =
        EmailAuthProvider.credential(
          user.email,
          senhaAtual
        );

      await reauthenticateWithCredential(
        auth.currentUser,
        credencial
      );

      await updatePassword(
        auth.currentUser,
        novaSenha
      );

      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");

      setSucessoSenha(
        "Senha alterada com sucesso."
      );

      setTimeout(() => {
        setAlterandoSenha(false);
        setSucessoSenha("");
      }, 2000);
    } catch (error: unknown) {
      console.error(
        "Erro ao alterar senha:",
        error
      );

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error
      ) {
        const codigo = String(
          (
            error as {
              code: string;
            }
          ).code
        );

        if (
          codigo ===
            "auth/wrong-password" ||
          codigo ===
            "auth/invalid-credential"
        ) {
          setErroSenha(
            "A senha atual está incorreta."
          );
          return;
        }

        if (
          codigo === "auth/weak-password"
        ) {
          setErroSenha(
            "A nova senha é muito fraca."
          );
          return;
        }

        if (
          codigo ===
          "auth/too-many-requests"
        ) {
          setErroSenha(
            "Muitas tentativas. Aguarde alguns minutos e tente novamente."
          );
          return;
        }
      }

      setErroSenha(
        "Não foi possível alterar sua senha."
      );
    } finally {
      setSalvandoSenha(false);
    }
  }

  function handleCancelarSenha() {
    setAlterandoSenha(false);
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmarNovaSenha("");
    setErroSenha("");
    setSucessoSenha("");
  }

  function handleCepChange(valor: string) {
    const apenasNumeros = valor
      .replace(/\D/g, "")
      .slice(0, 8);

    const cepFormatado =
      apenasNumeros.replace(
        /^(\d{5})(\d)/,
        "$1-$2"
      );

    setCep(cepFormatado);

    setCepEncontrado(false);
    setErroEndereco("");
  }

  async function buscarCep() {
    const cepLimpo =
      cep.replace(/\D/g, "");

    if (cepLimpo.length !== 8) {
      setCepEncontrado(false);

      if (cepLimpo.length > 0) {
        setErroEndereco(
          "Informe um CEP válido."
        );
      }

      return;
    }

    try {
      setBuscandoCep(true);
      setErroEndereco("");

      const resposta = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`
      );

      if (!resposta.ok) {
        throw new Error(
          "Erro ao consultar CEP."
        );
      }

      const dados =
        await resposta.json();

      if (dados.erro) {
        setCepEncontrado(false);

        setErroEndereco(
          "CEP não encontrado."
        );

        return;
      }

      setRua(
        dados.logradouro || ""
      );

      setBairro(
        dados.bairro || ""
      );

      setCidade(
        dados.localidade || ""
      );

      setEstado(
        dados.uf || ""
      );

      setCepEncontrado(true);
    } catch (error) {
      console.error(
        "Erro ao buscar CEP:",
        error
      );

      setCepEncontrado(false);

      setErroEndereco(
        "Não foi possível consultar o CEP."
      );
    } finally {
      setBuscandoCep(false);
    }
  }

  function carregarEnderecoNoFormulario() {
    setCep(
      perfil?.endereco?.cep || ""
    );

    setRua(
      perfil?.endereco?.rua || ""
    );

    setNumero(
      perfil?.endereco?.numero || ""
    );

    setComplemento(
      perfil?.endereco?.complemento || ""
    );

    setBairro(
      perfil?.endereco?.bairro || ""
    );

    setCidade(
      perfil?.endereco?.cidade || ""
    );

    setEstado(
      perfil?.endereco?.estado || ""
    );

    setCepEncontrado(
      !!perfil?.endereco?.cidade &&
        !!perfil?.endereco?.estado
    );

    setErroEndereco("");
    setEditandoEndereco(true);
  }

  function handleCancelarEndereco() {
    setEditandoEndereco(false);
    setErroEndereco("");

    setCep(
      perfil?.endereco?.cep || ""
    );

    setRua(
      perfil?.endereco?.rua || ""
    );

    setNumero(
      perfil?.endereco?.numero || ""
    );

    setComplemento(
      perfil?.endereco?.complemento || ""
    );

    setBairro(
      perfil?.endereco?.bairro || ""
    );

    setCidade(
      perfil?.endereco?.cidade || ""
    );

    setEstado(
      perfil?.endereco?.estado || ""
    );

    setCepEncontrado(
      !!perfil?.endereco?.cidade &&
        !!perfil?.endereco?.estado
    );
  }

  async function handleSalvarEndereco() {
    if (!user) {
      return;
    }

    setErroEndereco("");

    if (!cep.trim()) {
      setErroEndereco(
        "Informe o CEP."
      );
      return;
    }

    if (!rua.trim()) {
      setErroEndereco(
        "Informe a rua."
      );
      return;
    }

    if (!numero.trim()) {
      setErroEndereco(
        "Informe o número."
      );
      return;
    }

    if (!bairro.trim()) {
      setErroEndereco(
        "Informe o bairro."
      );
      return;
    }

    if (!cidade.trim()) {
      setErroEndereco(
        "Informe a cidade."
      );
      return;
    }

    if (!estado.trim()) {
      setErroEndereco(
        "Informe o estado."
      );
      return;
    }

    const enderecoAtualizado: Endereco = {
      cep: cep.trim(),
      rua: rua.trim(),
      numero: numero.trim(),
      complemento:
        complemento.trim(),
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      estado:
        estado.trim().toUpperCase(),
    };

    try {
      setSalvandoEndereco(true);

      await setDoc(
        doc(db, "users", user.uid),
        {
          nome:
            perfil?.nome ||
            user.displayName ||
            user.email?.split("@")[0] ||
            "",
          email:
            perfil?.email ||
            user.email ||
            "",
          endereco:
            enderecoAtualizado,
        },
        {
          merge: true,
        }
      );

      setPerfil((perfilAtual) => ({
        ...perfilAtual,
        endereco:
          enderecoAtualizado,
      }));

      setEditandoEndereco(false);
    } catch (error) {
      console.error(
        "Erro ao salvar endereço:",
        error
      );

      setErroEndereco(
        "Não foi possível salvar o endereço."
      );
    } finally {
      setSalvandoEndereco(false);
    }
  }

  return (
    <ProtectedRoute>
      <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
        {/* Cabeçalho */}
        <section className="border-b border-black/5">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
            <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
              Minha conta
            </span>

            <h1 className="mt-3 text-4xl font-semibold md:text-6xl">
              Olá, {nome}
            </h1>

            <p className="mt-4 max-w-2xl text-[var(--color-text-light)]">
              Gerencie seus dados,
              endereços e acompanhe suas
              compras.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[280px_1fr]">
            {/* Menu lateral */}
            <aside className="h-fit rounded-[1.5rem] bg-white p-4">
              <nav className="flex flex-col gap-2">
                <Link
                  href="/minha-conta"
                  className="rounded-xl bg-[var(--color-bg-soft)] px-4 py-3 text-sm font-semibold"
                >
                  Meus dados
                </Link>

                <Link
                  href="/meus-pedidos"
                  className="rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-black/5"
                >
                  Meus pedidos
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="cursor-pointer rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Sair da conta
                </button>
              </nav>
            </aside>

            <div className="space-y-8">
              {/* Dados pessoais */}
              <section className="rounded-[1.5rem] bg-white p-6 md:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      Dados pessoais
                    </h2>

                    <p className="mt-2 text-sm text-[var(--color-text-light)]">
                      Atualize suas
                      principais
                      informações.
                    </p>
                  </div>

                  {!editando ? (
                    <button
                      type="button"
                      onClick={() =>
                        setEditando(true)
                      }
                      className="cursor-pointer text-sm font-semibold text-[var(--color-primary)] transition hover:opacity-70"
                    >
                      Editar dados
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={
                        handleCancelarEdicao
                      }
                      className="cursor-pointer text-sm font-semibold text-[var(--color-text-light)] transition hover:opacity-70"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                {editando ? (
                  <div className="mt-8 space-y-5">
                    <div>
                      <label
                        htmlFor="nome"
                        className="text-sm font-medium"
                      >
                        Nome
                      </label>

                      <input
                        id="nome"
                        type="text"
                        value={nomeEditado}
                        onChange={(event) =>
                          setNomeEditado(
                            event.target.value
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="telefone"
                        className="text-sm font-medium"
                      >
                        Telefone
                      </label>

                      <input
                        id="telefone"
                        type="tel"
                        value={telefoneEditado}
                        onChange={(event) =>
                          setTelefoneEditado(
                            event.target.value
                          )
                        }
                        placeholder="(00) 00000-0000"
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                      />
                    </div>

                    <div>
                      <span className="text-sm font-medium">
                        E-mail
                      </span>

                      <p className="mt-2 rounded-2xl bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text-light)]">
                        {email}
                      </p>
                    </div>

                    {erroEdicao && (
                      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                        {erroEdicao}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={
                        handleSalvarDados
                      }
                      disabled={salvando}
                      className="cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {salvando
                        ? "Salvando..."
                        : "Salvar alterações"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-8 grid gap-6 sm:grid-cols-2">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                        Nome
                      </span>

                      <p className="mt-2 font-medium">
                        {carregandoPerfil
                          ? "Carregando..."
                          : nome}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                        E-mail
                      </span>

                      <p className="mt-2 font-medium">
                        {carregandoPerfil
                          ? "Carregando..."
                          : email}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                        Telefone
                      </span>

                      <p
                        className={`mt-2 font-medium ${
                          perfil?.telefone
                            ? ""
                            : "text-[var(--color-text-light)]"
                        }`}
                      >
                        {telefone}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                        Senha
                      </span>

                      {possuiLoginComSenha ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAlterandoSenha(
                              true
                            );
                            setErroSenha("");
                            setSucessoSenha("");
                          }}
                          className="mt-2 block cursor-pointer font-medium text-[var(--color-primary)] transition hover:opacity-70"
                        >
                          Alterar senha
                        </button>
                      ) : (
                        <p className="mt-2 text-sm text-[var(--color-text-light)]">
                          Sua conta utiliza
                          login com Google.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Alterar senha */}
                {alterandoSenha && (
                  <div className="mt-8 border-t border-black/5 pt-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold">
                          Alterar senha
                        </h3>

                        <p className="mt-2 text-sm text-[var(--color-text-light)]">
                          Confirme sua senha
                          atual antes de criar
                          uma nova.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={
                          handleCancelarSenha
                        }
                        className="cursor-pointer text-sm font-semibold text-[var(--color-text-light)] transition hover:opacity-70"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div className="mt-6 space-y-5">
                      <div>
                        <label
                          htmlFor="senhaAtual"
                          className="text-sm font-medium"
                        >
                          Senha atual
                        </label>

                        <input
                          id="senhaAtual"
                          type="password"
                          value={senhaAtual}
                          onChange={(event) =>
                            setSenhaAtual(
                              event.target.value
                            )
                          }
                          autoComplete="current-password"
                          placeholder="Digite sua senha atual"
                          className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                        />
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="novaSenha"
                            className="text-sm font-medium"
                          >
                            Nova senha
                          </label>

                          <input
                            id="novaSenha"
                            type="password"
                            value={novaSenha}
                            onChange={(
                              event
                            ) =>
                              setNovaSenha(
                                event.target
                                  .value
                              )
                            }
                            autoComplete="new-password"
                            placeholder="Mínimo de 6 caracteres"
                            className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="confirmarNovaSenha"
                            className="text-sm font-medium"
                          >
                            Confirmar nova senha
                          </label>

                          <input
                            id="confirmarNovaSenha"
                            type="password"
                            value={
                              confirmarNovaSenha
                            }
                            onChange={(
                              event
                            ) =>
                              setConfirmarNovaSenha(
                                event.target
                                  .value
                              )
                            }
                            autoComplete="new-password"
                            placeholder="Digite novamente"
                            className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                          />
                        </div>
                      </div>

                      {erroSenha && (
                        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                          {erroSenha}
                        </p>
                      )}

                      {sucessoSenha && (
                        <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                          {sucessoSenha}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={
                          handleAlterarSenha
                        }
                        disabled={
                          salvandoSenha
                        }
                        className="cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {salvandoSenha
                          ? "Alterando..."
                          : "Alterar senha"}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Endereço */}
              <section className="rounded-[1.5rem] bg-white p-6 md:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      Endereço de entrega
                    </h2>

                    <p className="mt-2 text-sm text-[var(--color-text-light)]">
                      Usaremos este endereço
                      para facilitar suas
                      próximas compras.
                    </p>
                  </div>

                  {!editandoEndereco ? (
                    <button
                      type="button"
                      onClick={
                        carregarEnderecoNoFormulario
                      }
                      className="cursor-pointer text-sm font-semibold text-[var(--color-primary)] transition hover:opacity-70"
                    >
                      {possuiEndereco
                        ? "Editar endereço"
                        : "Adicionar endereço"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={
                        handleCancelarEndereco
                      }
                      className="cursor-pointer text-sm font-semibold text-[var(--color-text-light)] transition hover:opacity-70"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                {editandoEndereco ? (
                  <div className="mt-8 space-y-5">
                    {/* CEP */}
                    <div>
                      <label
                        htmlFor="cep"
                        className="text-sm font-medium"
                      >
                        CEP
                      </label>

                      <div className="relative mt-2">
                        <input
                          id="cep"
                          type="text"
                          inputMode="numeric"
                          value={cep}
                          onChange={(event) =>
                            handleCepChange(
                              event.target.value
                            )
                          }
                          onBlur={buscarCep}
                          placeholder="00000-000"
                          maxLength={9}
                          className="w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 pr-28 outline-none transition focus:border-[var(--color-primary)]"
                        />

                        {buscandoCep && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-light)]">
                            Buscando...
                          </span>
                        )}

                        {!buscandoCep &&
                          cepEncontrado && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--color-primary)]">
                              Encontrado ✓
                            </span>
                          )}
                      </div>
                    </div>

                    {/* Rua */}
                    <div>
                      <label
                        htmlFor="rua"
                        className="text-sm font-medium"
                      >
                        Rua
                      </label>

                      <input
                        id="rua"
                        type="text"
                        value={rua}
                        onChange={(event) =>
                          setRua(
                            event.target.value
                          )
                        }
                        placeholder="Rua, avenida, estrada..."
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                      />
                    </div>

                    {/* Número e complemento */}
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="numero"
                          className="text-sm font-medium"
                        >
                          Número
                        </label>

                        <input
                          id="numero"
                          type="text"
                          value={numero}
                          onChange={(event) =>
                            setNumero(
                              event.target
                                .value
                            )
                          }
                          placeholder="123"
                          className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="complemento"
                          className="text-sm font-medium"
                        >
                          Complemento
                        </label>

                        <input
                          id="complemento"
                          type="text"
                          value={complemento}
                          onChange={(event) =>
                            setComplemento(
                              event.target
                                .value
                            )
                          }
                          placeholder="Apartamento, bloco..."
                          className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                        />
                      </div>
                    </div>

                    {/* Bairro */}
                    <div>
                      <label
                        htmlFor="bairro"
                        className="text-sm font-medium"
                      >
                        Bairro
                      </label>

                      <input
                        id="bairro"
                        type="text"
                        value={bairro}
                        onChange={(event) =>
                          setBairro(
                            event.target.value
                          )
                        }
                        placeholder="Seu bairro"
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                      />
                    </div>

                    {/* Cidade e estado */}
                    <div className="grid gap-5 sm:grid-cols-[1fr_160px]">
                      <div>
                        <label
                          htmlFor="cidade"
                          className="text-sm font-medium"
                        >
                          Cidade
                        </label>

                        <input
                          id="cidade"
                          type="text"
                          value={cidade}
                          onChange={(event) =>
                            setCidade(
                              event.target
                                .value
                            )
                          }
                          disabled={
                            cepEncontrado
                          }
                          placeholder="Sua cidade"
                          className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="estado"
                          className="text-sm font-medium"
                        >
                          Estado
                        </label>

                        <input
                          id="estado"
                          type="text"
                          value={estado}
                          onChange={(event) =>
                            setEstado(
                              event.target.value.toUpperCase()
                            )
                          }
                          disabled={
                            cepEncontrado
                          }
                          placeholder="SP"
                          maxLength={2}
                          className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 uppercase outline-none transition focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    </div>

                    {erroEndereco && (
                      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                        {erroEndereco}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={
                        handleSalvarEndereco
                      }
                      disabled={
                        salvandoEndereco ||
                        buscandoCep
                      }
                      className="cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {salvandoEndereco
                        ? "Salvando..."
                        : "Salvar endereço"}
                    </button>
                  </div>
                ) : possuiEndereco ? (
                  <div className="mt-8 rounded-[1.25rem] bg-[var(--color-bg)] p-5">
                    <p className="font-semibold">
                      Endereço principal
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-light)]">
                      {perfil?.endereco?.rua},{" "}
                      {perfil?.endereco?.numero}

                      {perfil?.endereco
                        ?.complemento && (
                        <>
                          {" "}
                          -{" "}
                          {
                            perfil.endereco
                              .complemento
                          }
                        </>
                      )}

                      <br />

                      {
                        perfil?.endereco
                          ?.bairro
                      }

                      <br />

                      {
                        perfil?.endereco
                          ?.cidade
                      }{" "}
                      -{" "}
                      {
                        perfil?.endereco
                          ?.estado
                      }

                      <br />

                      CEP{" "}
                      {
                        perfil?.endereco
                          ?.cep
                      }
                    </p>
                  </div>
                ) : (
                  <div className="mt-8 rounded-[1.25rem] bg-[var(--color-bg)] p-5">
                    <p className="font-semibold">
                      Nenhum endereço
                      cadastrado
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-light)]">
                      Adicione um endereço
                      para agilizar suas
                      próximas compras.
                    </p>
                  </div>
                )}
              </section>

              {/* Atalhos */}
              <section className="grid gap-6 md:grid-cols-2">
                <Link
                  href="/meus-pedidos"
                  className="rounded-[1.5rem] bg-[var(--color-bg-soft)] p-6 transition hover:-translate-y-1"
                >
                  <span className="text-sm font-medium uppercase tracking-[0.15em] text-[var(--color-primary)]">
                    Pedidos
                  </span>

                  <h2 className="mt-3 text-xl font-semibold">
                    Acompanhar minhas
                    compras
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-light)]">
                    Veja seus pedidos
                    recentes e acompanhe o
                    status de cada compra.
                  </p>

                  <span className="mt-5 inline-block text-sm font-semibold text-[var(--color-primary)]">
                    Ver pedidos →
                  </span>
                </Link>

                <Link
                  href="/loja"
                  className="rounded-[1.5rem] bg-[var(--color-dark)] p-6 text-white transition hover:-translate-y-1"
                >
                  <span className="text-sm font-medium uppercase tracking-[0.15em] text-white/60">
                    Casa Naturaleh
                  </span>

                  <h2 className="mt-3 text-xl font-semibold">
                    Continuar comprando
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Explore novos produtos
                    para complementar sua
                    rotina.
                  </p>

                  <span className="mt-5 inline-block text-sm font-semibold">
                    Ir para a loja →
                  </span>
                </Link>
              </section>
            </div>
          </div>
        </section>
      </main>
    </ProtectedRoute>
  );
}