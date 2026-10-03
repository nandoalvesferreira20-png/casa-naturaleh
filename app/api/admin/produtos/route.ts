import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  verificarAdmin,
} from "../../../lib/firebase-admin";

import {
  supabaseAdmin,
} from "../../../lib/supabase-admin";

export async function GET(
  request: NextRequest
) {
  try {
    await verificarAdmin(
      request.headers.get(
        "authorization"
      )
    );

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("products")
        .select("*")
        .order(
          "criado_em",
          {
            ascending: false,
          }
        );

    if (error) {
      throw error;
    }

    return NextResponse.json(
      data
    );
  } catch (error) {
    console.error(
      "Erro GET produtos:",
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

export async function POST(
  request: NextRequest
) {
  try {
    await verificarAdmin(
      request.headers.get(
        "authorization"
      )
    );

    const body =
      await request.json();

    const {
      nome,
      slug,
      categoria,
      preco,
      imagem,
      descricao,
      estoque,
      ativo,
    } = body;

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("products")
        .insert({
          nome,
          slug,
          categoria,
          preco,
          imagem,
          descricao,
          estoque,
          ativo,
        })
        .select()
        .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      data,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Erro POST produto:",
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
        status: 400,
      }
    );
  }
}

export async function PUT(
  request: NextRequest
) {
  try {
    await verificarAdmin(
      request.headers.get(
        "authorization"
      )
    );

    const body =
      await request.json();

    const {
      id,
      nome,
      slug,
      categoria,
      preco,
      imagem,
      descricao,
      estoque,
      ativo,
    } = body;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "ID do produto não informado.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("products")
        .update({
          nome,
          slug,
          categoria,
          preco,
          imagem,
          descricao,
          estoque,
          ativo,
        })
        .eq(
          "id",
          id
        )
        .select()
        .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      data
    );
  } catch (error) {
    console.error(
      "Erro PUT produto:",
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
        status: 400,
      }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    await verificarAdmin(
      request.headers.get(
        "authorization"
      )
    );

    const body =
      await request.json();

    const {
      id,
      imagem,
    } = body;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "ID do produto não informado.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error,
    } =
      await supabaseAdmin
        .from("products")
        .delete()
        .eq(
          "id",
          id
        );

    if (error) {
      throw error;
    }

    if (imagem) {
      const marcador =
        "/storage/v1/object/public/produtos/";

      const indice =
        imagem.indexOf(
          marcador
        );

      if (
        indice !== -1
      ) {
        const caminho =
          decodeURIComponent(
            imagem.substring(
              indice +
                marcador.length
            )
          );

        await supabaseAdmin
          .storage
          .from(
            "produtos"
          )
          .remove([
            caminho,
          ]);
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Erro DELETE produto:",
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
        status: 400,
      }
    );
  }
}