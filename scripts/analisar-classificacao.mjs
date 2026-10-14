import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const raiz = fileURLToPath(new URL('../', import.meta.url));
const cache = new Map();
function carregar(arquivo) {
  if (cache.has(arquivo)) return cache.get(arquivo).exports;
  const modulo = { exports: {} }; cache.set(arquivo, modulo);
  const output = ts.transpileModule(readFileSync(arquivo,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports',output)(n => n.startsWith('.') ? carregar(resolve(dirname(arquivo),`${n}.ts`)) : require(n),modulo,modulo.exports);
  return modulo.exports;
}
const categorias=carregar(resolve(raiz,'app/lib/categorias-importacao.ts'));
const planilha=carregar(resolve(raiz,'app/lib/planilha-produtos.ts'));
const revisao=carregar(resolve(raiz,'app/lib/revisao-categorias.ts'));
const arquivo=process.argv[2] ?? 'produtos_2026-10-08-1.xls';
const { linhas, relatorio }=planilha.analisarPlanilha(readFileSync(resolve(raiz,arquivo)));
const classificadas=revisao.classificarLinhas(linhas);
const produtos=classificadas.map(l=>({linha:l.linha,nome:l.produto.nome,categoriaOriginal:l.categoriaOriginal,subCategoria:l.subCategoria,...l.classificacao}));
const distribuicao=categorias.CATEGORIAS_OFICIAIS.map(categoria=>({categoria,total:produtos.filter(p=>p.categoria===categoria).length,automaticos:produtos.filter(p=>p.categoria===categoria&&p.confianca>=.8).length,revisao:produtos.filter(p=>p.categoria===categoria&&p.confianca<.8).length}));
const resumo={arquivo,total:produtos.length,automaticos:produtos.filter(p=>p.confianca>=.8).length,revisao:produtos.filter(p=>p.confianca<.8).length,revisaoRecomendada:produtos.filter(p=>p.confianca>=.6&&p.confianca<.8).length,revisaoObrigatoria:produtos.filter(p=>p.confianca<.6).length,semSugestao:produtos.filter(p=>!p.categoria).length};
const amostra=[];
for(const nome of [/^FARINHA DE AMENDOAS/,/^CASTANHA DE CAJU CRUA/,/^CHA VERDE/,/^CREATINA/,/^WHEY/,/^CANELA EM PO/,/^TEMPERO/,/^GRANOLA/,/^SEMENTE/,/^ACUCAR MASCAVO/,/^XILITOL/,/^CAFE/,/^CHOCOLATE/,/^CHIPS DE BANANA ACUCAR/,/^ALHO GRANULADO/,/^CANELA DE VELHO/,/^TRIDENT CANELA/,/^AGAR AGAR/,/^ARGILA BRANCA/,/^COCO CHIPS/]) {
  const p=produtos.find(p=>nome.test(p.nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'')));
  if(p&&!amostra.includes(p)) amostra.push(p);
}
for(const p of produtos) {if(amostra.length>=20)break;if(!amostra.includes(p))amostra.push(p);}
writeFileSync(resolve(raiz,'tests/classificacao-planilha-real.json'),JSON.stringify({resumo,distribuicao,amostra,produtos},null,2)+'\n');
const texto=`# Categorização automática na importação

## Resultado da planilha real

Arquivo: \`${arquivo}\`, aba \`${relatorio.aba}\`, cabeçalho na linha ${relatorio.linhaCabecalho}. A planilha original foi somente lida.

- Total de produtos: **${resumo.total}**.
- Classificados automaticamente com confiança >= 80%: **${resumo.automaticos}**.
- Para revisão: **${resumo.revisao}**.
- Revisão recomendada (60% a 79%): **${resumo.revisaoRecomendada}**.
- Revisão obrigatória (abaixo de 60%): **${resumo.revisaoObrigatoria}**.
- Sem sugestão de categoria: **${resumo.semSugestao}**.

| Categoria oficial | Total sugerido | Automáticos | Revisão |
| --- | ---: | ---: | ---: |
${distribuicao.map(d=>`| ${d.categoria} | ${d.total} | ${d.automaticos} | ${d.revisao} |`).join('\n')}
| Sem sugestão | ${resumo.semSugestao} | 0 | ${resumo.semSugestao} |

Os totais são classificações anteriores à revisão manual, sem consultar produtos existentes no Supabase ou testar downloads de todas as imagens. Sugestões incertas podem aparecer na distribuição, mas não são importadas sem confirmação.

## Amostra para revisão manual

| Produto real | Categoria sugerida | Confiança | Status |
| --- | --- | ---: | --- |
${amostra.map(p=>`| ${p.nome} | ${p.categoria||'Sem sugestão'} | ${Math.round(p.confianca*100)}% | ${p.status} |`).join('\n')}

Todas as ${resumo.total} classificações, com motivo e dados originais, estão em \`tests/classificacao-planilha-real.json\`. Para reproduzir: \`node scripts/analisar-classificacao.mjs\`.

## Regras e confiança

O classificador \`classifyProductCategory\` usa somente regras locais. Não há IA externa, novas chaves ou custo por produto. Os percentuais são pontuações heurísticas por regra, não probabilidades estatisticamente calibradas.

A comparação usa minúsculas, remove acentos e normaliza separadores; nome e categoria original são preservados para exibição. As regras estão centralizadas em \`categorias-importacao.ts\`. Tipos explícitos no início do nome ganham 30 pontos de prioridade, sem alterar sua confiança: granola com lemon pepper permanece em Cereais. A pista não oficial Suplementação Esportiva pode sugerir Suplementos com 72%.

Prioridade: tipo explícito (farinha, suplemento, chá, snack, etc.), categoria original que corresponda à lista oficial, ingrediente específico no nome e pistas na descrição/subcategoria. Termos específicos vencem genéricos: farinha de amêndoas fica em Farinhas, noz-moscada em Especiarias, granulado de chocolate em Confeitaria, alho granulado em Culinária e chips com açúcar/lemon pepper em Snacks. Canela-de-velho recebe Chás. Especiarias são ingredientes aromáticos secos; Temperos são misturas prontas e condimentos compostos.

Tipos e ingredientes explícitos recebem 85% a 97% conforme a regra. Categoria original oficial recebe 90%. Apresentação em cápsulas combinada com marca reconhecida de suplementos recebe 82%. Pistas únicas da descrição/categoria/subcategoria recebem 72%; pistas conflitantes recebem 55%; ausência de sinais recebe 0%. SKU e unidade são mantidos como contexto, mas não decidem uma categoria isoladamente.

Confiança >= 80%: Categoria sugerida. Entre 60% e 79%: Revisar categoria, com botão para confirmar a sugestão. Abaixo de 60%: Categoria incerta; a linha fica bloqueada até uma escolha manual oficial. Não existe fallback silencioso para Outros, Diversos, Geral ou Mercearia.

## Revisão e gravação

No modal existente de \`/admin/produtos\`, cada linha mostra categoria original, sugestão, motivo, confiança e select com as 18 categorias oficiais. O usuário pode trocar a categoria por linha, confirmar uma sugestão intermediária ou selecionar várias linhas e aplicar uma categoria em massa. O checkbox do cabeçalho seleciona todo o preview.

A categoria padrão opcional agora é um select oficial: confirma apenas sugestões incertas após clicar em Validar novamente. Escolhas individuais prevalecem sobre esse padrão e sobre a classificação automática. Revalidar o mesmo arquivo preserva as correções; selecionar outro arquivo elimina revisões do anterior.

A API recebe somente revisões por número da linha, relê a planilha original, recalcula a classificação e valida cada escolha contra a lista oficial. Rejeita valores forjados, Todos os produtos, linhas inexistentes e revisões duplicadas. \`products.categoria\` recebe a categoria final corrigida. Confiança, motivo, categoria original e SKU não criam campos no banco.

## Arquivos desta tarefa

Criados: \`app/lib/categorias-importacao.ts\`, \`app/lib/revisao-categorias.ts\`, \`tests/classificacao-produtos.test.mjs\`, \`scripts/analisar-classificacao.mjs\`, \`tests/classificacao-planilha-real.json\` e este relatório.

Alterados: \`app/lib/importacao-produtos.ts\` (tipos), \`app/lib/planilha-produtos.ts\` (contexto e validação), \`app/api/admin/produtos/importar/route.ts\` (classificação/revisões), \`app/admin/produtos/page.tsx\` (somente modal) e \`tests/importacao-produtos.test.mjs\` (integração).

Nenhuma dependência foi instalada. A lista oficial contém somente as 18 categorias da tabela; Todos os produtos é excluído. Nenhuma categoria nova pode ser criada pela importação, inclusive por requisição adulterada.

Não foram alterados cadastro manual, loja, catálogo, checkout, Pix, entrega, Geoapify, carrinho, Firestore, RLS, Firebase Rules, Mercado Pago, schema ou .env. As alterações anteriores do usuário nesses módulos foram preservadas.
`;
writeFileSync(resolve(raiz,'docs/classificacao-produtos.md'),texto);
console.log(JSON.stringify({resumo,distribuicao},null,2));
