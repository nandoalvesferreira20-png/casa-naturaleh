import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  verificarAdmin,
} from "../../../../lib/firebase-admin";

import {
  supabaseAdmin,
} from "../../../../lib/supabase-admin";

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

export async function POST(
  request: NextRequest
) {
  try {
    await verificarAdmin(
      request.headers.get(
        "authorization"
      )
    );

    const formData =
      await request.formData();

    const arquivo =
      formData.get(
        "imagem"
      );

    const nomeProduto =
      formData.get(
        "nome"
      );

    if (
      !(arquivo instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "Imagem não informada.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof nomeProduto !==
      "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Nome do produto não informado.",
        },
        {
          status: 400,
        }
      );
    }

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
      return NextResponse.json(
        {
          error:
            "Formato de imagem inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const limite =
      5 * 1024 * 1024;

    if (
      arquivo.size >
      limite
    ) {
      return NextResponse.json(
        {
          error:
            "Imagem maior que 5 MB.",
        },
        {
          status: 400,
        }
      );
    }

    const extensao =
      arquivo.name
        .split(".")
        .pop()
        ?.toLowerCase() ||
      "jpg";

    const nomeArquivo =
      `${Date.now()}-${gerarSlug(
        nomeProduto
      )}.${extensao}`;

    const caminho =
      `catalogo/${nomeArquivo}`;

    const arrayBuffer =
      await arquivo.arrayBuffer();

    const buffer =
      Buffer.from(
        arrayBuffer
      );

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .storage
        .from(
          "produtos"
        )
        .upload(
          caminho,
          buffer,
          {
            contentType:
              arquivo.type,

            cacheControl:
              "3600",

            upsert:
              false,
          }
        );

    if (error) {
      throw error;
    }

    const {
      data:
        publicData,
    } =
      supabaseAdmin
        .storage
        .from(
          "produtos"
        )
        .getPublicUrl(
          data.path
        );

    return NextResponse.json({
      url:
        publicData.publicUrl,

      caminho:
        data.path,
    });
  } catch (error) {
    console.error(
      "Erro upload imagem:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno.",
      },
      {
        status: 403,
      }
    );
  }
}