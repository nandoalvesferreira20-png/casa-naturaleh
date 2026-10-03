"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AdminRoute from "../../components/AdminRoute";
import { useAuth } from "../../context/AuthContext";

type Produto = {
  id: string;
  nome: string;
  slug: string;
  categoria: string;
  preco: number;
  imagem: string;
  descricao: string | null;
  estoque: number;
  ativo: boolean;
  criado_em?: string;
};

type FormProduto = {
  nome: string;
  slug: string;
  categoria: string;
  preco: string;
  imagem: string;
  descricao: string;
  estoque: string;
  ativo: boolean;
};

const formularioInicial: FormProduto = {
  nome: "",
  slug: "",
  categoria: "",
  preco: "",
  imagem: "",
  descricao: "",
  estoque: "",
  ativo: true,
};

export default function AdminProdutosPage() {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [produtos, setProdutos] =
    useState<Produto[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState("");

  const [
    modalAberto,
    setModalAberto,
  ] = useState(false);

  const [
    produtoEditando,
    setProdutoEditando,
  ] = useState<Produto | null>(
    null
  );

  const [
    formulario,
    setFormulario,
  ] = useState<FormProduto>(
    formularioInicial
  );

  const [salvando, setSalvando] =
    useState(false);

  const [
    erroFormulario,
    setErroFormulario,
  ] = useState("");

  const [busca, setBusca] =
    useState("");

  const [filtro, setFiltro] =
    useState("todos");

  const [
    arquivoImagem,
    setArquivoImagem,
  ] = useState<File | null>(
    null
  );

  const [
    previewImagem,
    setPreviewImagem,
  ] = useState("");

  const [
    enviandoImagem,
    setEnviandoImagem,
  ] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setCarregando(false);
      return;
    }

    carregarProdutos();
  }, [user, authLoading]);

  async function obterToken() {
    if (!user) {
      throw new Error(
        "Usuário não autenticado."
      );
    }

    return await user.getIdToken();
  }

  async function lerResposta(
    response: Response
  ) {
    const contentType =
      response.headers.get(
        "content-type"
      );

    let dados: any = null;

    if (
      contentType?.includes(
        "application/json"
      )
    ) {
      dados =
        await response.json();
    } else {
      const texto =
        await response.text();

      dados = {
        error:
          texto ||
          "Resposta inválida do servidor.",
      };
    }

    if (!response.ok) {
      throw new Error(
        dados?.error ||
          "Não foi possível concluir a operação."
      );
    }

    return dados;
  }

  async function carregarProdutos() {
    try {
      setCarregando(true);
      setErro("");

      const token =
        await obterToken();

      const response =
        await fetch(
          "/api/admin/produtos",
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            cache:
              "no-store",
          }
        );

      const dados =
        await lerResposta(
          response
        );

      setProdutos(
        Array.isArray(dados)
          ? dados
          : []
      );
    } catch (error) {
      console.error(
        "Erro ao carregar produtos:",
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os produtos."
      );
    } finally {
      setCarregando(false);
    }
  }

  function gerarSlug(
    valor: string
  ) {
    return valor
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .trim()
      .replace(
        /[^a-z0-9\s-]/g,
        ""
      )
      .replace(
        /\s+/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      );
  }

  function handleNomeChange(
    valor: string
  ) {
    setFormulario(
      (atual) => ({
        ...atual,

        nome: valor,

        slug:
          produtoEditando
            ? atual.slug
            : gerarSlug(
                valor
              ),
      })
    );
  }

  function limparPreviewLocal() {
    if (
      previewImagem.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        previewImagem
      );
    }

    setArquivoImagem(null);
    setPreviewImagem("");
  }

  function resetarModal() {
    limparPreviewLocal();

    setModalAberto(false);

    setProdutoEditando(
      null
    );

    setFormulario(
      formularioInicial
    );

    setErroFormulario("");
  }

  function abrirNovoProduto() {
    limparPreviewLocal();

    setProdutoEditando(
      null
    );

    setFormulario(
      formularioInicial
    );

    setErroFormulario("");

    setModalAberto(true);
  }

  function abrirEdicao(
    produto: Produto
  ) {
    limparPreviewLocal();

    setProdutoEditando(
      produto
    );

    setFormulario({
      nome:
        produto.nome,

      slug:
        produto.slug,

      categoria:
        produto.categoria,

      preco:
        produto.preco.toString(),

      imagem:
        produto.imagem,

      descricao:
        produto.descricao ??
        "",

      estoque:
        produto.estoque.toString(),

      ativo:
        produto.ativo,
    });

    setErroFormulario("");

    setModalAberto(true);
  }

  function fecharModal() {
    if (
      salvando ||
      enviandoImagem
    ) {
      return;
    }

    resetarModal();
  }

  function handleImagemLocal(
    arquivo: File | null
  ) {
    if (!arquivo) {
      return;
    }

    setErroFormulario("");

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !tiposPermitidos.includes(
        arquivo.type
      )
    ) {
      setErroFormulario(
        "Selecione uma imagem JPG, PNG ou WEBP."
      );

      return;
    }

    const limite =
      5 * 1024 * 1024;

    if (
      arquivo.size >
      limite
    ) {
      setErroFormulario(
        "A imagem deve ter no máximo 5 MB."
      );

      return;
    }

    if (
      previewImagem.startsWith(
        "blob:"
      )
    ) {
      URL.revokeObjectURL(
        previewImagem
      );
    }

    const preview =
      URL.createObjectURL(
        arquivo
      );

    setArquivoImagem(
      arquivo
    );

    setPreviewImagem(
      preview
    );
  }

  async function fazerUploadImagem(
    arquivo: File,
    nomeProduto: string
  ) {
    const token =
      await obterToken();

    const formData =
      new FormData();

    formData.append(
      "imagem",
      arquivo
    );

    formData.append(
      "nome",
      nomeProduto
    );

    const response =
      await fetch(
        "/api/admin/produtos/imagem",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          body:
            formData,
        }
      );

    const dados =
      await lerResposta(
        response
      );

    if (!dados.url) {
      throw new Error(
        "O servidor não retornou a URL da imagem."
      );
    }

    return dados.url as string;
  }

  async function salvarProduto(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErroFormulario("");

    const nome =
      formulario.nome.trim();

    const slug =
      gerarSlug(
        formulario.slug.trim()
      );

    const categoria =
      formulario.categoria.trim();

    const descricao =
      formulario.descricao.trim();

    const preco =
      Number(
        formulario.preco
          .replace(
            /\./g,
            ""
          )
          .replace(
            ",",
            "."
          )
      );

    const estoque =
      Number(
        formulario.estoque
      );

    if (!nome) {
      setErroFormulario(
        "Informe o nome do produto."
      );

      return;
    }

    if (!slug) {
      setErroFormulario(
        "Informe o slug do produto."
      );

      return;
    }

    if (!categoria) {
      setErroFormulario(
        "Informe a categoria."
      );

      return;
    }

    if (
      Number.isNaN(
        preco
      ) ||
      preco <= 0
    ) {
      setErroFormulario(
        "Informe um preço válido."
      );

      return;
    }

    if (
      Number.isNaN(
        estoque
      ) ||
      estoque < 0
    ) {
      setErroFormulario(
        "Informe um estoque válido."
      );

      return;
    }

    if (
      !arquivoImagem &&
      !formulario.imagem
    ) {
      setErroFormulario(
        "Selecione uma imagem para o produto."
      );

      return;
    }

    const slugEmUso =
      produtos.some(
        (produto) =>
          produto.slug ===
            slug &&
          produto.id !==
            produtoEditando
              ?.id
      );

    if (slugEmUso) {
      setErroFormulario(
        "Já existe um produto com esse slug."
      );

      return;
    }

    try {
      setSalvando(true);

      let urlImagem =
        formulario.imagem;

      if (
        arquivoImagem
      ) {
        setEnviandoImagem(
          true
        );

        urlImagem =
          await fazerUploadImagem(
            arquivoImagem,
            nome
          );

        setEnviandoImagem(
          false
        );
      }

      const dadosProduto = {
        nome,
        slug,
        categoria,
        preco,

        imagem:
          urlImagem,

        descricao:
          descricao ||
          null,

        estoque,

        ativo:
          formulario.ativo,
      };

      const token =
        await obterToken();

      if (
        produtoEditando
      ) {
        const response =
          await fetch(
            "/api/admin/produtos",
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  id:
                    produtoEditando.id,

                  ...dadosProduto,
                }),
            }
          );

        const produtoAtualizado =
          await lerResposta(
            response
          );

        setProdutos(
          (atuais) =>
            atuais.map(
              (produto) =>
                produto.id ===
                produtoEditando.id
                  ? (
                      produtoAtualizado as Produto
                    )
                  : produto
            )
        );
      } else {
        const response =
          await fetch(
            "/api/admin/produtos",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify(
                  dadosProduto
                ),
            }
          );

        const novoProduto =
          await lerResposta(
            response
          );

        setProdutos(
          (atuais) => [
            novoProduto as Produto,

            ...atuais,
          ]
        );
      }

      resetarModal();
    } catch (error) {
      console.error(
        "Erro ao salvar produto:",
        error
      );

      setErroFormulario(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o produto."
      );
    } finally {
      setEnviandoImagem(
        false
      );

      setSalvando(
        false
      );
    }
  }

  async function alterarAtivo(
    produto: Produto
  ) {
    try {
      const novoEstado =
        !produto.ativo;

      const token =
        await obterToken();

      const response =
        await fetch(
          "/api/admin/produtos",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                id:
                  produto.id,

                nome:
                  produto.nome,

                slug:
                  produto.slug,

                categoria:
                  produto.categoria,

                preco:
                  produto.preco,

                imagem:
                  produto.imagem,

                descricao:
                  produto.descricao,

                estoque:
                  produto.estoque,

                ativo:
                  novoEstado,
              }),
          }
        );

      const produtoAtualizado =
        await lerResposta(
          response
        );

      setProdutos(
        (atuais) =>
          atuais.map(
            (item) =>
              item.id ===
              produto.id
                ? (
                    produtoAtualizado as Produto
                  )
                : item
          )
      );
    } catch (error) {
      console.error(
        "Erro ao alterar produto:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o status do produto."
      );
    }
  }

  async function excluirProduto(
    produto: Produto
  ) {
    const confirmou =
      window.confirm(
        `Deseja realmente excluir "${produto.nome}"?`
      );

    if (
      !confirmou
    ) {
      return;
    }

    try {
      const token =
        await obterToken();

      const response =
        await fetch(
          "/api/admin/produtos",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                id:
                  produto.id,

                imagem:
                  produto.imagem,
              }),
          }
        );

      await lerResposta(
        response
      );

      setProdutos(
        (atuais) =>
          atuais.filter(
            (item) =>
              item.id !==
              produto.id
          )
      );
    } catch (error) {
      console.error(
        "Erro ao excluir produto:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o produto."
      );
    }
  }

  const produtosFiltrados =
    useMemo(() => {
      let lista =
        produtos;

      if (
        filtro ===
        "ativos"
      ) {
        lista =
          lista.filter(
            (produto) =>
              produto.ativo
          );
      }

      if (
        filtro ===
        "inativos"
      ) {
        lista =
          lista.filter(
            (produto) =>
              !produto.ativo
          );
      }

      if (
        filtro ===
        "estoque_baixo"
      ) {
        lista =
          lista.filter(
            (produto) =>
              produto.estoque <=
              5
          );
      }

      const termo =
        busca
          .trim()
          .toLowerCase();

      if (termo) {
        lista =
          lista.filter(
            (produto) =>
              produto.nome
                .toLowerCase()
                .includes(
                  termo
                ) ||
              produto.categoria
                .toLowerCase()
                .includes(
                  termo
                ) ||
              produto.slug
                .toLowerCase()
                .includes(
                  termo
                )
          );
      }

      return lista;
    }, [
      produtos,
      filtro,
      busca,
    ]);

  const totalProdutos =
    produtos.length;

  const produtosAtivos =
    produtos.filter(
      (produto) =>
        produto.ativo
    ).length;

  const estoqueBaixo =
    produtos.filter(
      (produto) =>
        produto.estoque <=
        5
    ).length;

  const valorEstoque =
    produtos.reduce(
      (
        total,
        produto
      ) =>
        total +
        produto.preco *
          produto.estoque,
      0
    );

  return (
    <AdminRoute>
      <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <section className="border-b border-black/5">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-14 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--color-primary)]">
                Administração
              </span>

              <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
                Produtos
              </h1>

              <p className="mt-4 max-w-2xl text-[var(--color-text-light)]">
                Gerencie o catálogo,
                preços, estoque e
                disponibilidade dos
                produtos.
              </p>
            </div>

            <button
              type="button"
              onClick={
                abrirNovoProduto
              }
              className="cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              + Novo produto
            </button>
          </div>
        </section>

        <section className="py-10">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.5rem] bg-white p-6">
                <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                  Produtos
                </span>

                <p className="mt-3 text-3xl font-semibold">
                  {carregando
                    ? "..."
                    : totalProdutos}
                </p>

                <p className="mt-2 text-sm text-[var(--color-text-light)]">
                  Cadastrados
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-[var(--color-bg-soft)] p-6">
                <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-primary)]">
                  Ativos
                </span>

                <p className="mt-3 text-3xl font-semibold">
                  {carregando
                    ? "..."
                    : produtosAtivos}
                </p>

                <p className="mt-2 text-sm text-[var(--color-text-light)]">
                  Visíveis na loja
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-white p-6">
                <span className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                  Estoque baixo
                </span>

                <p className="mt-3 text-3xl font-semibold">
                  {carregando
                    ? "..."
                    : estoqueBaixo}
                </p>

                <p className="mt-2 text-sm text-[var(--color-text-light)]">
                  5 unidades ou menos
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-[var(--color-dark)] p-6 text-white">
                <span className="text-xs font-medium uppercase tracking-[0.15em] text-white/60">
                  Valor em estoque
                </span>

                <p className="mt-3 text-3xl font-semibold">
                  {carregando
                    ? "..."
                    : valorEstoque.toLocaleString(
                        "pt-BR",
                        {
                          style:
                            "currency",

                          currency:
                            "BRL",
                        }
                      )}
                </p>

                <p className="mt-2 text-sm text-white/60">
                  Preço × quantidade
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="w-full md:max-w-md">
                <label
                  htmlFor="buscaProduto"
                  className="text-sm font-medium"
                >
                  Buscar produto
                </label>

                <input
                  id="buscaProduto"
                  type="text"
                  value={busca}
                  onChange={(event) =>
                    setBusca(
                      event.target.value
                    )
                  }
                  placeholder="Nome, categoria ou slug..."
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label
                  htmlFor="filtroProduto"
                  className="text-sm font-medium"
                >
                  Filtrar
                </label>

                <select
                  id="filtroProduto"
                  value={filtro}
                  onChange={(event) =>
                    setFiltro(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none md:w-[220px]"
                >
                  <option value="todos">
                    Todos
                  </option>

                  <option value="ativos">
                    Ativos
                  </option>

                  <option value="inativos">
                    Inativos
                  </option>

                  <option value="estoque_baixo">
                    Estoque baixo
                  </option>
                </select>
              </div>
            </div>

            {erro && (
              <div className="mt-6 rounded-[1.5rem] bg-red-50 p-5 text-sm text-red-600">
                {erro}
              </div>
            )}

            <div className="mt-8">
              {carregando ? (
                <div className="rounded-[1.5rem] bg-white p-8 text-center">
                  Carregando produtos...
                </div>
              ) : produtosFiltrados.length ===
                0 ? (
                <div className="rounded-[1.5rem] bg-white p-8 text-center">
                  <h2 className="text-xl font-semibold">
                    Nenhum produto
                    encontrado.
                  </h2>

                  <p className="mt-2 text-sm text-[var(--color-text-light)]">
                    Cadastre seu primeiro
                    produto ou altere os
                    filtros.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {produtosFiltrados.map(
                    (produto) => (
                      <article
                        key={
                          produto.id
                        }
                        className="rounded-[1.5rem] bg-white p-5 md:p-6"
                      >
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-5">
                            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[1.25rem] bg-[var(--color-bg-soft)]">
                              {produto.imagem ? (
                                <img
                                  src={
                                    produto.imagem
                                  }
                                  alt={
                                    produto.nome
                                  }
                                  className="h-full w-full object-contain p-2"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center px-2 text-center text-xs text-[var(--color-text-light)]">
                                  Sem imagem
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-lg font-semibold">
                                  {
                                    produto.nome
                                  }
                                </h2>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    produto.ativo
                                      ? "bg-green-100 text-green-700"
                                      : "bg-black/5 text-[var(--color-text-light)]"
                                  }`}
                                >
                                  {produto.ativo
                                    ? "Ativo"
                                    : "Inativo"}
                                </span>
                              </div>

                              <p className="mt-1 text-sm text-[var(--color-text-light)]">
                                {
                                  produto.categoria
                                }
                              </p>

                              <p className="mt-1 text-xs text-[var(--color-text-light)]">
                                /
                                {
                                  produto.slug
                                }
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-6">
                            <div>
                              <span className="text-xs uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                                Preço
                              </span>

                              <p className="mt-1 font-semibold">
                                {produto.preco.toLocaleString(
                                  "pt-BR",
                                  {
                                    style:
                                      "currency",

                                    currency:
                                      "BRL",
                                  }
                                )}
                              </p>
                            </div>

                            <div>
                              <span className="text-xs uppercase tracking-[0.15em] text-[var(--color-text-light)]">
                                Estoque
                              </span>

                              <p
                                className={`mt-1 font-semibold ${
                                  produto.estoque <=
                                  5
                                    ? "text-amber-600"
                                    : ""
                                }`}
                              >
                                {
                                  produto.estoque
                                }
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  alterarAtivo(
                                    produto
                                  )
                                }
                                className="cursor-pointer rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5"
                              >
                                {produto.ativo
                                  ? "Desativar"
                                  : "Ativar"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  abrirEdicao(
                                    produto
                                  )
                                }
                                className="cursor-pointer rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-black/5"
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  excluirProduto(
                                    produto
                                  )
                                }
                                className="cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-8"
          onClick={
            fecharModal
          }
        >
          <div
            className="max-h-full w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-7 shadow-xl md:p-8"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  Produto
                </span>

                <h2 className="mt-2 text-2xl font-semibold">
                  {produtoEditando
                    ? "Editar produto"
                    : "Novo produto"}
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  fecharModal
                }
                disabled={
                  salvando ||
                  enviandoImagem
                }
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                salvarProduto
              }
              className="mt-7 space-y-5"
            >
              <div>
                <label
                  htmlFor="nomeProduto"
                  className="text-sm font-medium"
                >
                  Nome
                </label>

                <input
                  id="nomeProduto"
                  type="text"
                  value={
                    formulario.nome
                  }
                  onChange={(event) =>
                    handleNomeChange(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Creatina Monohidratada"
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none transition focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label
                  htmlFor="slugProduto"
                  className="text-sm font-medium"
                >
                  Slug
                </label>

                <input
                  id="slugProduto"
                  type="text"
                  value={
                    formulario.slug
                  }
                  onChange={(event) =>
                    setFormulario(
                      (atual) => ({
                        ...atual,

                        slug:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="creatina-monohidratada"
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none"
                />

                <p className="mt-2 text-xs text-[var(--color-text-light)]">
                  Usado na URL do produto.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="categoriaProduto"
                    className="text-sm font-medium"
                  >
                    Categoria
                  </label>

                  <input
                    id="categoriaProduto"
                    type="text"
                    value={
                      formulario.categoria
                    }
                    onChange={(event) =>
                      setFormulario(
                        (atual) => ({
                          ...atual,

                          categoria:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Suplementos"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="precoProduto"
                    className="text-sm font-medium"
                  >
                    Preço
                  </label>

                  <input
                    id="precoProduto"
                    type="text"
                    inputMode="decimal"
                    value={
                      formulario.preco
                    }
                    onChange={(event) =>
                      setFormulario(
                        (atual) => ({
                          ...atual,

                          preco:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="89,90"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="text-sm font-medium">
                  Imagem do produto
                </span>

                <label
                  htmlFor="imagemProduto"
                  className="mt-2 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-black/20 bg-[var(--color-bg)] px-6 py-8 text-center transition hover:border-[var(--color-primary)]"
                >
                  <div>
                    <p className="font-semibold">
                      {arquivoImagem
                        ? "Trocar imagem"
                        : produtoEditando
                          ? "Escolher nova imagem"
                          : "Escolher imagem"}
                    </p>

                    <p className="mt-1 text-xs text-[var(--color-text-light)]">
                      JPG, PNG ou WEBP • máximo 5 MB
                    </p>

                    {arquivoImagem && (
                      <p className="mt-2 text-xs font-medium text-[var(--color-primary)]">
                        {
                          arquivoImagem.name
                        }
                      </p>
                    )}
                  </div>
                </label>

                <input
                  id="imagemProduto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    handleImagemLocal(
                      event.target.files?.[0] ??
                        null
                    )
                  }
                  className="hidden"
                />

                {(previewImagem ||
                  formulario.imagem) && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs text-[var(--color-text-light)]">
                      Prévia
                    </p>

                    <div className="h-44 w-44 overflow-hidden rounded-[1.25rem] bg-[var(--color-bg-soft)]">
                      <img
                        src={
                          previewImagem ||
                          formulario.imagem
                        }
                        alt="Prévia do produto"
                        className="h-full w-full object-contain p-3"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="descricaoProduto"
                  className="text-sm font-medium"
                >
                  Descrição
                </label>

                <textarea
                  id="descricaoProduto"
                  value={
                    formulario.descricao
                  }
                  onChange={(event) =>
                    setFormulario(
                      (atual) => ({
                        ...atual,

                        descricao:
                          event.target.value,
                      })
                    )
                  }
                  rows={4}
                  placeholder="Descreva o produto..."
                  className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="estoqueProduto"
                    className="text-sm font-medium"
                  >
                    Estoque
                  </label>

                  <input
                    id="estoqueProduto"
                    type="number"
                    min="0"
                    value={
                      formulario.estoque
                    }
                    onChange={(event) =>
                      setFormulario(
                        (atual) => ({
                          ...atual,

                          estoque:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="10"
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-[var(--color-bg)] px-4 py-3 outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-[var(--color-bg)] px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={
                        formulario.ativo
                      }
                      onChange={(event) =>
                        setFormulario(
                          (atual) => ({
                            ...atual,

                            ativo:
                              event.target.checked,
                          })
                        )
                      }
                      className="h-4 w-4"
                    />

                    <span className="text-sm font-medium">
                      Produto ativo
                    </span>
                  </label>
                </div>
              </div>

              {erroFormulario && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {
                    erroFormulario
                  }
                </p>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={
                    salvando ||
                    enviandoImagem
                  }
                  className="flex-1 cursor-pointer rounded-full bg-[var(--color-primary)] px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enviandoImagem
                    ? "Enviando imagem..."
                    : salvando
                      ? "Salvando..."
                      : produtoEditando
                        ? "Salvar alterações"
                        : "Cadastrar produto"}
                </button>

                <button
                  type="button"
                  onClick={
                    fecharModal
                  }
                  disabled={
                    salvando ||
                    enviandoImagem
                  }
                  className="cursor-pointer rounded-full border border-black/10 px-6 py-3.5 text-sm font-semibold transition hover:bg-black/5 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminRoute>
  );
}