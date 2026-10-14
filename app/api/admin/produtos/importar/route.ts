import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verificarAdmin } from "../../../../lib/firebase-admin";
import {
  valorAtivo, LIMITE_CSV, LIMITE_LOTE,
  type ImagemImportacao, type ResultadoImportacao,
} from "../../../../lib/importacao-produtos";

import { analisarPlanilha, validarProdutos, urlImagemValida } from "../../../../lib/planilha-produtos";
import { baixarImagem, validarConteudo, concorrenciaLimitada } from "../../../../lib/imagem-importacao";
import { classificarLinhas, lerEdicoesCategoria } from "../../../../lib/revisao-categorias";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await verificarAdmin(request.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "Acesso restrito a administradores autenticados." }, { status: 403 });
  }

  try {
    if (Number(request.headers.get("content-length")) > LIMITE_LOTE + 2 * LIMITE_CSV) {
      return NextResponse.json({ error: "O lote excede 50 MB. Divida a importação." }, { status: 413 });
    }
    const form = await request.formData();
    const csv = form.get("csv");
    const acao = form.get("acao");
    if (!(csv instanceof File) || !/\.(csv|xls|xlsx)$/i.test(csv.name) || csv.size > LIMITE_CSV) {
      return NextResponse.json({ error: "Selecione CSV, XLS ou XLSX de até 5 MB." }, { status: 400 });
    }
    if (acao !== "validar" && acao !== "importar") {
      return NextResponse.json({ error: "Operação inválida." }, { status: 400 });
    }
    const { linhas: originais, relatorio } = analisarPlanilha(Buffer.from(await csv.arrayBuffer()));
    const edicoes = lerEdicoesCategoria(JSON.parse(String(form.get("categorias") ?? "[]")));
    const linhas = classificarLinhas(originais, edicoes, String(form.get("categoriaPadrao") ?? ""));
    const arquivos = form.getAll("imagens").filter((item): item is File => item instanceof File);
    let imagens: ImagemImportacao[] = arquivos;
    if (acao === "validar") {
      const manifesto: unknown = JSON.parse(String(form.get("manifesto") ?? "[]"));
      if (!Array.isArray(manifesto) || manifesto.length > 200 || !manifesto.every(item =>
        item && typeof item.name === "string" && typeof item.type === "string" && typeof item.size === "number"
      )) throw new Error("Lista de imagens inválida.");
      imagens = manifesto;
    }
    if (imagens.length > 200 || imagens.reduce((soma, imagem) => soma + imagem.size, 0) > LIMITE_LOTE) {
      return NextResponse.json({ error: "Selecione até 200 imagens, totalizando no máximo 50 MB por lote." }, { status: 413 });
    }

    // O cliente administrativo só é carregado depois da autenticação e autorização.
    const { supabaseAdmin } = await import("../../../../lib/supabase-admin");
    const existentes: { nome: string; slug: string }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabaseAdmin.from("products").select("nome,slug").order("id").range(offset, offset + 999);
      if (error) throw new Error("Não foi possível consultar os produtos existentes.");
      existentes.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    const validadas = validarProdutos(linhas, imagens, existentes);
    if (acao === "validar") return NextResponse.json({ linhas: validadas, relatorio });

    const validas = validadas.filter(linha => !linha.erros.length);
    const resultado: ResultadoImportacao = {
      importados: 0,
      ignorados: validadas.length - validas.length,
      erros: 0,
      detalhes: validadas.filter(linha => linha.erros.length).map(linha => ({ linha: linha.linha, mensagem: linha.erros.join("; ") })),
      avisos: [],
    };
    const storage = supabaseAdmin.storage.from("produtos");
    const preparados: {
      linha: number; caminho: string;
      dados: { id: string; nome: string; slug: string; categoria: string; preco: number; imagem: string; descricao: string | null; estoque: number; ativo: boolean };
    }[] = [];

    async function remover(caminhos: string[]) {
      if (!caminhos.length) return;
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        try { const { error } = await storage.remove(caminhos); if (!error) return; } catch { /* Tentar novamente. */ }
      }
      console.error("Importação: limpeza pendente no Storage", caminhos);
      resultado.avisos.push("Não foi possível remover algumas imagens após a falha. A limpeza precisa ser verificada pelo suporte; os caminhos foram registrados no servidor.");
    }

    const cache = new Map<string, Promise<{ caminho: string; url: string }>>();
    let bytesEnviados = 0;
    await concorrenciaLimitada(validas, async ({ linha, produto }) => {
      let caminho = "";
      try {
        let url = "";
        if (produto.imagem) {
          let promessa = cache.get(produto.imagem);
          if (!promessa) {
            promessa = (async () => {
              const arquivo = arquivos.find(item => item.name === produto.imagem);
              const conteudo = urlImagemValida(produto.imagem)
                ? await baixarImagem(produto.imagem)
                : validarConteudo(Buffer.from(await arquivo!.arrayBuffer()), arquivo!.type || undefined);
              bytesEnviados += conteudo.buffer.length;
              if (bytesEnviados > LIMITE_LOTE) throw new Error("As imagens excedem 50 MB. Divida a importação.");
              const path = `catalogo/${randomUUID()}-${produto.slug.slice(0, 80)}.${conteudo.extensao}`;
              try {
                const { error } = await storage.upload(path, conteudo.buffer, { contentType: conteudo.tipo, cacheControl: "3600", upsert: false });
                if (error) throw new Error("Falha ao enviar a imagem ao Storage.");
                return { caminho: path, url: storage.getPublicUrl(path).data.publicUrl };
              } catch (error) { await remover([path]); throw error; }
            })();
            cache.set(produto.imagem, promessa);
          }
          const imagem = await promessa; caminho = imagem.caminho; url = imagem.url;
        }
        preparados.push({ linha, caminho, dados: {
          id: randomUUID(), nome: produto.nome, slug: produto.slug, categoria: produto.categoria,
          preco: Number(produto.preco), estoque: Number(produto.estoque), ativo: valorAtivo(produto.ativo)!,
          descricao: produto.descricao, imagem: url,
        } });
      } catch (error) {
        resultado.erros++;
        resultado.detalhes.push({ linha, mensagem: `Falha ao importar imagem: ${error instanceof Error ? error.message : "erro desconhecido"}` });
      }
    });

    if (preparados.length) {
      try {
        const { error } = await supabaseAdmin.from("products").insert(preparados.map(item => item.dados));
        if (error) throw error;
        resultado.importados = preparados.length;
      } catch {
        // Uma resposta perdida não significa que o INSERT falhou: conferir UUIDs antes de apagar imagens.
        try {
          const confirmados = new Set<string>();
          for (let i = 0; i < preparados.length; i += 50) {
            const { data, error } = await supabaseAdmin.from("products").select("id").in("id", preparados.slice(i, i + 50).map(item => item.dados.id));
            if (error) throw error;
            for (const produto of data ?? []) confirmados.add(produto.id);
          }
          const falhos = preparados.filter(item => !confirmados.has(item.dados.id));
          resultado.importados = confirmados.size;
          const preservados = new Set(preparados.filter(item => confirmados.has(item.dados.id)).map(item => item.caminho));
          await remover([...new Set(falhos.map(item => item.caminho).filter(p => p && !preservados.has(p)))]);
          resultado.erros += falhos.length;
          resultado.detalhes.push(...falhos.map(item => ({ linha: item.linha, mensagem: "Falha ao cadastrar o lote. Verifique se o slug foi cadastrado por outro administrador e valide novamente." })));
        } catch {
          console.error("Importação: resultado do banco incerto", preparados.map(item => ({ id: item.dados.id, caminho: item.caminho })));
          resultado.erros += preparados.length;
          resultado.detalhes.push(...preparados.map(item => ({ linha: item.linha, mensagem: "Não foi possível confirmar o cadastro. Recarregue a listagem antes de tentar novamente." })));
          resultado.avisos.push("O banco não respondeu à confirmação. As imagens foram preservadas para não quebrar produtos possivelmente cadastrados; os caminhos foram registrados no servidor para conferência.");
        }
      }
    }
    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível processar a importação." }, { status: 400 });
  }
}
