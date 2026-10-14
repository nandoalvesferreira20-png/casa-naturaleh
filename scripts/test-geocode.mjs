// Diagnóstico local: não importa Firebase/checkout, não cria pedido nem escreve .env.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import nextEnv from "@next/env";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const requireNode = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
nextEnv.loadEnvConfig(root, true, { info() {}, error() {} });
process.env.NODE_ENV = "development";

function load(file) {
  const loaded = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", code)(name => name.startsWith(".") ? load(path.resolve(path.dirname(file), name + ".ts")) : requireNode(name), loaded, loaded.exports);
  return loaded.exports;
}

async function main() {
  const cep = (process.argv[2] || "").replace(/\D/g, "");
  const numero = (process.argv[3] || "").trim();
  if (cep.length !== 8 || !numero) throw new Error('Uso: npm run test:geocode -- "09780-190" "434"');
  if (!process.env.GEOAPIFY_API_KEY?.trim()) throw new Error("Configure GEOAPIFY_API_KEY localmente para executar o diagnóstico.");
  let response;
  try { response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(8000) }); }
  catch { throw new Error("ViaCEP indisponível para diagnóstico."); }
  if (!response.ok) throw new Error("ViaCEP indisponível para diagnóstico.");
  const data = await response.json();
  if (data.erro || !data.logradouro || !data.localidade || !data.uf) throw new Error("ViaCEP não retornou logradouro/município/UF. Confira o CEP.");
  const { diagnoseAddress } = load(path.join(root, "app/lib/delivery/geocoding.ts"));
  const result = await diagnoseAddress({ cep, numero, rua: data.logradouro, bairro: data.bairro || "", cidade: data.localidade, estado: data.uf });
  console.info("[delivery:diagnostic]", result);
  const { assessDelivery } = load(path.join(root, "app/lib/delivery/service.ts"));
  console.info("[delivery:decision]", assessDelivery(result));
}

main().catch(error => {
  // Nunca imprimir stack/URL/resposta do provedor ou sua chave.
  const key = process.env.GEOAPIFY_API_KEY?.trim();
  const message = error instanceof Error ? error.message : "Falha no diagnóstico.";
  console.error(key ? message.replaceAll(key, "[redacted]") : message);
  process.exitCode = 1;
});
