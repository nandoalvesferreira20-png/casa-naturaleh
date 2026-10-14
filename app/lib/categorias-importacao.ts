export const CATEGORIAS_OFICIAIS = [
  "Frutas", "Culinária", "Chás", "Oleaginosas", "Bebidas", "Temperos", "Mercearia",
  "Snacks", "Cereais", "Bomboniere", "Suplementos", "Especiarias", "Adoçantes",
  "Farinhas", "Sementes", "Açúcares", "Confeitaria", "Cafeteria",
] as const;
export type CategoriaProduto = typeof CATEGORIAS_OFICIAIS[number];
export type ClassificacaoCategoria = {
  categoria: CategoriaProduto | ""; confianca: number; motivo: string;
  status: "Categoria sugerida" | "Revisar categoria" | "Categoria incerta";
};
export type SinaisCategoria = {
  nome: string; descricao?: string; categoriaOriginal?: string; subCategoria?: string;
  marca?: string; sku?: string; unidade?: string;
};
export const ERRO_REVISAO_CATEGORIA = "Categoria incerta: escolha uma categoria oficial antes de importar";
export const ERRO_CATEGORIA_OFICIAL = "Escolha uma categoria da lista oficial";
export const categoriaOficial = (valor: unknown): valor is CategoriaProduto =>
  typeof valor === "string" && CATEGORIAS_OFICIAIS.some(c => c === valor);
const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
type Regra = { categoria: CategoriaProduto; expressao: RegExp; prioridade: number; confianca: number; motivo: string };
// Maior prioridade vence; a ordem desempata prioridades iguais.
export const REGRAS_CATEGORIA: Regra[] = [
  { categoria: "Farinhas", expressao: /\bfarinhas?\b/, prioridade: 120, confianca: .97, motivo: "Tipo explícito: farinha" },
  { categoria: "Confeitaria", expressao: /\b(granulado de chocolate|gotas de chocolate|chocolate em gotas|confeiteiro|confeito|cobertura de chocolate|chocolate para cobertura)\b/, prioridade: 119, confianca: .96, motivo: "Ingrediente para confeitaria" },
  { categoria: "Suplementos", expressao: /\b(whey|creatina|creatine|colageno|albumina|bcaa|glutamina|glutamine|pre treino|pos treino|proteina|protein|hipercalorico|suplemento|vitamina|biotina|omega 3|coenzima|coq 10|termogenico|psyllium|spirulina)\b/, prioridade: 118, confianca: .96, motivo: "Tipo explícito: suplemento" },
  { categoria: "Cafeteria", expressao: /\b(cafe|cappuccino|capuccino)\b/, prioridade: 117, confianca: .95, motivo: "Tipo explícito: café ou cappuccino" },
  { categoria: "Chás", expressao: /\b(chas?|infusao|desincha)\b/, prioridade: 116, confianca: .95, motivo: "Tipo explícito: chá ou infusão" },
  { categoria: "Chás", expressao: /\bcanela de velho\b/, prioridade: 119, confianca: .92, motivo: "Canela-de-velho é uma erva para infusão" },
  { categoria: "Açúcares", expressao: /^(acucar|demerara|mascavo)\b/, prioridade: 115, confianca: .95, motivo: "Tipo explícito: açúcar" },
  { categoria: "Adoçantes", expressao: /\b(adocante|xilitol|eritritol|stevia|sucralose)\b/, prioridade: 115, confianca: .96, motivo: "Tipo explícito: adoçante" },
  { categoria: "Temperos", expressao: /\b(tempero|chimichurri|lemon pepper|curry|garam masala|sal temperado|sal com|sal parrilla|sal parrilha|caldo de|vinagrete)\b/, prioridade: 114, confianca: .94, motivo: "Mistura pronta ou condimento composto" },
  { categoria: "Snacks", expressao: /\b(barras?|snacks?|chips|salgadinho|pipoca|pipocao|biscoito|bisc|bolacha|torrada|cookies)\b/, prioridade: 117.5, confianca: .92, motivo: "Tipo explícito: lanche pronto, independentemente do sabor" },
  { categoria: "Cereais", expressao: /\b(granola|aveia|musli|muesli)\b/, prioridade: 112, confianca: .95, motivo: "Tipo explícito: cereal" },
  { categoria: "Sementes", expressao: /\b(sementes?|chia|linhaca|gergelim)\b/, prioridade: 111, confianca: .95, motivo: "Tipo explícito: semente" },
  { categoria: "Bebidas", expressao: /\b(suco|refrigerante|kombucha|bebida|agua de coco|energetico)\b/, prioridade: 110, confianca: .93, motivo: "Tipo explícito: bebida" },
  { categoria: "Bomboniere", expressao: /\b(bombom|chocolate|choco|bala|balas|pirulito|chiclete|goma|pacoca|pe de moleque|alfajor|brigadeiro|brownie|doce de leite|goiabada|trident|tic tac|wafer|pastilha|drageado)\b/, prioridade: 109, confianca: .91, motivo: "Doce pronto para consumo" },
  { categoria: "Confeitaria", expressao: /\b(cacau|fermento|gelatina|coco ralado)\b|^granulado\b/, prioridade: 85, confianca: .89, motivo: "Ingrediente usado em confeitaria" },
  { categoria: "Oleaginosas", expressao: /\b(castanha|castanhas|amendoa|amendoas|noz|nozes|amendoim|pistache|macadamia|avela)\b/, prioridade: 84, confianca: .96, motivo: "Oleaginosa identificada pelo nome" },
  { categoria: "Especiarias", expressao: /\b(canela|curcuma|acafrao|cravo|noz moscada|cardamomo|pimenta|paprica|cominho|anis|mostarda em graos)\b/, prioridade: 86, confianca: .93, motivo: "Ingrediente aromático seco, sem mistura pronta" },
  { categoria: "Chás", expressao: /\b(hibisco|camomila|erva doce|boldo|cavalinha|carqueja|capim limao|cidreira|espinheira santa|sene|tansagem|barbatimao|uxi amarelo)\b/, prioridade: 83, confianca: .9, motivo: "Erva tradicionalmente usada em infusão" },
  { categoria: "Frutas", expressao: /\b(abacaxi|acai|banana|uva passa|damasco|tamara|ameixa|cranberry|goji berry|maca|manga|morango|figo|fruta)\b/, prioridade: 82, confianca: .88, motivo: "Fruta identificada pelo nome" },
  { categoria: "Cereais", expressao: /\b(flocos de milho|flocos de arroz|flocao|quinoa|quinua|amaranto|trigo|cevada|centeio|cereal)\b/, prioridade: 81, confianca: .87, motivo: "Grão ou cereal identificado" },
  { categoria: "Culinária", expressao: /\b(alho|cebola|salsa|cebolinha|louro|manjericao|oregano|alecrim|salvia|tomilho|bicarbonato|amido|polvilho|tapioca)\b/, prioridade: 80, confianca: .85, motivo: "Ingrediente culinário identificado" },
  { categoria: "Mercearia", expressao: /\b(arroz|feijao|lentilha|grao de bico|azeite|oleo|vinagre|mel|melado|sal marinho|sal rosa|sal de ouro|sal himalaia|sal grosso|massa|macarrao|conserva|pasta de amendoim)\b/, prioridade: 87, confianca: .86, motivo: "Item de mercearia identificado" },
];
function resultado(categoria: CategoriaProduto | "", confianca: number, motivo: string): ClassificacaoCategoria {
  return { categoria, confianca, motivo, status: confianca >= .8 ? "Categoria sugerida" : confianca >= .6 ? "Revisar categoria" : "Categoria incerta" };
}
export function classifyProductCategory(produto: SinaisCategoria): ClassificacaoCategoria {
  const nome = normalizar(produto.nome);
  const prioridadeNome = (r: Regra) => r.prioridade + (r.prioridade >= 100 && nome.match(r.expressao)?.index === 0 ? 30 : 0);
  // Tipo no início do nome vence sabor/ingrediente posterior: granola lemon pepper.
  const regras = REGRAS_CATEGORIA.filter(r => r.expressao.test(nome)).sort((a,b) => prioridadeNome(b) - prioridadeNome(a));
  const explicita = regras.find(r => r.prioridade >= 100);
  if (explicita) return resultado(explicita.categoria, explicita.confianca, explicita.motivo);
  const original = CATEGORIAS_OFICIAIS.find(c => normalizar(c) === normalizar(produto.categoriaOriginal ?? ""));
  if (original) return resultado(original, .9, "Categoria original corresponde à lista oficial");
  if (regras.length) return resultado(regras[0].categoria, regras[0].confianca, regras[0].motivo);
  const subcategoria = CATEGORIAS_OFICIAIS.find(c => normalizar(c) === normalizar(produto.subCategoria ?? ""));
  if (subcategoria) return resultado(subcategoria, .72, "Subcategoria original oficial; revisar o produto");
  if (/\b(caps|capsulas|cps)\b/.test(nome) && /\b(unilife|lauton|dux)\b/.test(normalizar(`${produto.marca ?? ""} ${nome}`))) return resultado("Suplementos", .82, "Apresentação em cápsulas combinada com marca de suplementos");
  const pistas = normalizar([produto.descricao, produto.categoriaOriginal, produto.subCategoria].filter(Boolean).join(" "));
  if (/\bsuplementacao esportiva\b/.test(pistas)) return resultado("Suplementos", .72, "Categoria original indica suplementação esportiva; revisar");
  const apoios = REGRAS_CATEGORIA.filter(r => r.expressao.test(pistas)).sort((a,b) => b.prioridade - a.prioridade);
  if (apoios.length) return resultado(apoios[0].categoria, new Set(apoios.map(r => r.categoria)).size > 1 ? .55 : .72, "Pista na descrição ou categoria/subcategoria original; revisar");
  // Marca, unidade e SKU são recebidos, mas não decidem sozinhos.
  return resultado("", 0, "Sem sinais suficientes para escolher uma categoria oficial");
}
