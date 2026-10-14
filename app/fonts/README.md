# Black Mango

Fonte local real: `app/fonts/BlackMango-Regular.ttf`.

Configurada em `app/layout.tsx` com `next/font/local`, peso 400, estilo normal, `display: swap` e variável `--font-black-mango`. A classe de variável é aplicada ao html junto à variável Montserrat.

O token `--font-heading` em `app/globals.css` usa a Black Mango real. Não há mais seleção temporária de Georgia/Times New Roman nesse token. O Next.js empacota e serve a fonte em `/_next/static/media/`, com preload automático e fallback interno ajustado pelo carregador durante a troca de fonte.

h1/h2 e destaques institucionais usam a fonte de títulos. Montserrat permanece em body, textos, preços, menus, botões, campos, tabelas, títulos de cards e interface técnica administrativa. As exceções `cn-ui-title` e `cn-admin` são preservadas.

O arquivo não foi convertido nem baixado. Não foi criado @font-face manual. Cores, dimensões e espaçamentos não foram alterados.
