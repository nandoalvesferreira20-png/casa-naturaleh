import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const requireNode = createRequire(import.meta.url);
const env = { GEOAPIFY_API_KEY: "SEGREDO_TESTE", STORE_LAT: "-23.7", STORE_LNG: "-46.55" };
const address = { rua: "Av. Francisco Prestes Maia", numero: "561", bairro: "Centro", cidade: "São Bernardo do Campo", estado: "SP", cep: "09770-000" };
function result() {
  return { results: [{ lat: -23.7, lon: -46.55, country_code: "br", state: "São Paulo", state_code: "SP", city: address.cidade,
    postcode: address.cep, street: "Avenida Francisco Prestes Maia", housenumber: "561", result_type: "building",
    rank: { confidence: 0.98, confidence_city_level: 1, confidence_street_level: 1, confidence_building_level: 0.95, match_type: "full_match" } }] };
}
function setup({ config = env, respond = () => Response.json(result()) } = {}) {
  const cache = new Map(), calls = [], logs = [];
  let now = 10000;
  function load(file) {
    const path = resolve(root, file);
    if (cache.has(path)) return cache.get(path);
    const loaded = { exports: {} };
    const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function("require", "module", "exports", "process", "fetch", "Date", "console", code)(name => name.startsWith(".") ? load(resolve(dirname(path), name + ".ts")) : requireNode(name),
      loaded, loaded.exports, { env: config }, async (url, options) => { calls.push({ url: new URL(url), options }); return respond(calls.length); },
      class extends Date { static now() { return now; } }, { info: (...args) => logs.push(args) });
    cache.set(path, loaded.exports); return loaded.exports;
  }
  return { load, calls, logs, advance: ms => { now += ms; }, geocode: load("app/lib/delivery/geocoding.ts").geocodeAddress, validate: load("app/lib/delivery/service.ts").validateDelivery };
}
test("Geoapify structured usa contrato oficial, chave somente no servidor e dados mínimos", async () => {
  const app = setup();
  assert.equal((await app.validate({ ...address, complemento: "PRIVADO", nome: "CLIENTE", email: "EMAIL" })).shippingFee, 15);
  assert.equal(app.calls.length, 1);
  const { url, options } = app.calls[0];
  assert.equal(url.origin + url.pathname, "https://api.geoapify.com/v1/geocode/search");
  assert.deepEqual(Object.fromEntries(url.searchParams), { housenumber: "561", street: address.rua, postcode: address.cep, city: address.cidade, state: "São Paulo", country: "Brazil", format: "json", filter: "countrycode:br", limit: "5", lang: "pt", apiKey: env.GEOAPIFY_API_KEY });
  assert.equal(options.cache, "no-store"); assert.ok(options.signal instanceof AbortSignal); assert.equal(options.redirect, "error");
  assert.equal(options.headers["User-Agent"], undefined);
  assert.doesNotMatch(url.href, /PRIVADO|CLIENTE|EMAIL/);
});
test("Haversine e raio continuam: dentro e exatamente 15 aceitos; 15,01 rejeitado", async () => {
  const distance = setup().load("app/lib/delivery/distance.ts");
  assert.equal(distance.calculateDistanceKm(0, 0, 0, 0), 0);
  assert.ok(Math.abs(distance.calculateDistanceKm(0, 0, 0, 1) - 111.19508) < 0.001);
  assert.throws(() => distance.calculateDistanceKm(91, 0, 0, 0));
  for (const km of [7, 15, 15.01]) {
    const data = result(); data.results[0].lat = km / 6371.0088 * 180 / Math.PI; data.results[0].lon = 0;
    const app = setup({ config: { ...env, STORE_LAT: "0", STORE_LNG: "0" }, respond: () => Response.json(data) });
    if (km <= 15) assert.equal((await app.validate(address)).shippingFee, 15);
    else await assert.rejects(app.validate(address), error => error.status === 422 && error.message.includes("15 km"));
  }
});
test("casas/prédios com building e match_by_building ou full_match são aceitos", async () => {
  for (const match_type of ["full_match", "match_by_building"]) {
    const data = result(); data.results[0].rank.match_type = match_type;
    delete data.results[0].rank.confidence_building_level; // Campo opcional na documentação.
    assert.equal((await setup({ respond: () => Response.json(data) }).geocode(address)).precision, "HIGH");
  }
});
test("rejeita precisão baixa, tipos genéricos, endereço divergente e coordenadas inválidas", async () => {
  const edits = [
    ...["postcode", "city", "state", "unknown"].map(type => r => { r.result_type = type; }),
    r => { r.rank.confidence_street_level = 0.5; },
    
    r => { delete r.lat; }, r => { r.lon = null; }, r => { r.lat = 91; }, r => { r.lon = -181; }, r => { r.lat = ""; },
    r => { r.country_code = "pt"; }, r => { r.state_code = "RJ"; }, r => { r.city = "Curitiba"; },
     r => { r.street = "Outra rua"; },
  ];
  for (const edit of edits) {
    const data = result(); edit(data.results[0]); const app = setup({ respond: () => Response.json(data) });
    await assert.rejects(app.validate(address), error => error.status === 422);
    assert.equal(app.calls.length, 6);
  }
});
test("resultado vazio ou ambíguo é 422; sem CEP retornado aceita endereço preciso", async () => {
  for (const data of [{ results: [] }, { results: [result().results[0], { ...result().results[0], lat: -23.8 }] }]) {
    await assert.rejects(setup({ respond: () => Response.json(data) }).geocode(address), error => error.status === 422);
  }
  const data = result(); delete data.results[0].postcode;
  assert.ok(await setup({ respond: () => Response.json(data) }).geocode(address));
});
test("timeout, JSON inválido, 401/403/429/5xx e chave ausente falham fechado sem revelar segredo", async () => {
  for (const status of [401, 403, 429, 500]) {
    const app = setup({ respond: () => new Response(env.GEOAPIFY_API_KEY, { status }) });
    await assert.rejects(app.geocode(address), e => e.status === 503 && !e.message.includes(env.GEOAPIFY_API_KEY) && (![401, 403].includes(status) || e.message.includes("configuração")));
    assert.equal(app.calls.length, 1);
  }
  for (const respond of [() => { throw new DOMException(env.GEOAPIFY_API_KEY, "TimeoutError"); }, () => new Response("oops"), () => Response.json({})]) {
    await assert.rejects(setup({ respond }).geocode(address), e => e.status === 503 && !e.message.includes(env.GEOAPIFY_API_KEY));
  }
  const missing = setup({ config: {} });
  await assert.rejects(missing.geocode(address), e => e.status === 503 && e.message.includes("configuração"));
  assert.equal(missing.calls.length, 0);
});
test("cache normalizado deduplica concorrência e mantém TTLs positivo e negativo", async () => {
  const app = setup();
  const variant = { ...address, rua: "  Avenida   Francisco Prestes Maia ", cidade: "Sao Bernardo do Campo", estado: " sp ", cep: "09770000" };
  const answers = await Promise.all(Array.from({ length: 10 }, (_, i) => app.geocode(i % 2 ? address : variant)));
  assert.equal(app.calls.length, 1); answers[0].lat = 90;
  assert.equal((await app.geocode(address)).lat, -23.7);
  app.advance(86400001); await app.geocode(address); assert.equal(app.calls.length, 2);
  const missing = setup({ respond: () => Response.json({ results: [] }) });
  for (let i = 0; i < 3; i++) await assert.rejects(missing.geocode(address));
  assert.equal(missing.calls.length, 6); missing.advance(300001);
  await assert.rejects(missing.geocode(address)); assert.equal(missing.calls.length, 12);
});
test("erro transitório não contamina cache; logs de desenvolvimento mostram endereço, mas não incluem chave", async () => {
  const app = setup({ config: { ...env, NODE_ENV: "development" }, respond: n => n === 1 ? new Response("", { status: 429 }) : Response.json(result()) });
  await assert.rejects(app.geocode(address)); await app.validate(address);
  assert.equal(app.calls.length, 2);
  const output = JSON.stringify(app.logs);
  assert.match(output, /geoapify/); assert.doesNotMatch(output, /SEGREDO|apiKey/);
});

test("fallbacks são sequenciais, paramétricos e param no primeiro resultado; cache usa endereço original", async () => {
  const names = ["structured", "free_form", "sem_bairro", "structured_cep_numerico", "sem_numero", "cep"];
  for (let success = 1; success <= names.length; success++) {
    const app = setup({ respond: n => Response.json(n === success ? result() : { results: [] }) });
    const match = await app.load("app/lib/delivery/geocoding.ts").diagnoseAddress(address);
    assert.equal(match.strategy, names[success - 1]);
    assert.equal(app.calls.length, success);
    await app.geocode(address); assert.equal(app.calls.length, success);
    for (const { url } of app.calls) {
      if (url.searchParams.has("text")) assert.equal(url.searchParams.has("street"), false);
      assert.equal(url.searchParams.get("filter"), "countrycode:br");
    }
    if (success >= 2) assert.match(app.calls[1].url.searchParams.get("text"), /Centro/);
    if (success >= 3) assert.doesNotMatch(app.calls[2].url.searchParams.get("text"), /Centro/);
    if (success >= 4) assert.equal(app.calls[3].url.searchParams.get("postcode"), "09770000");
  }
});


for (const [type, km, expected] of [["building",14.8,"allowed"],["street",8,"allowed"],["street",12.9,"allowed"],["street",13,"allowed"],["street",13.5,"inconclusive"],["street",15,"inconclusive"],["street",15.1,"outside"],["city",8,"inconclusive"]]) {
  test(type + " a " + km + " km: " + expected, async () => {
    const data = result(), r = data.results[0]; r.result_type = type;
    r.lat = km / 6371.0088 * 180 / Math.PI; r.lon = 0;
    if (type === "street") { delete r.housenumber; r.rank.confidence_building_level = 0; }
    const app = setup({ config: { ...env, STORE_LAT: "0", STORE_LNG: "0" }, respond: () => Response.json(data) });
    const location = await app.geocode(address);
    assert.equal(location.precision, type === "building" ? "HIGH" : type === "street" ? "MEDIUM" : "LOW");
    const assessment = app.load("app/lib/delivery/service.ts").assessDelivery(location);
    assert.equal(assessment.decision, expected);
    if (expected === "allowed") assert.equal((await app.validate(address)).shippingFee, 15);
    else await assert.rejects(app.validate(address), e => e.status === 422 && e.message === assessment.message);
  });
}

test("CEP divergente, número ausente/divergente ou confiança de prédio zero rebaixam para MEDIUM", async () => {
  for (const edit of [r => { r.postcode = "09780-120"; }, r => { delete r.housenumber; }, r => { r.housenumber = "999"; }, r => { r.rank.confidence_building_level = 0; r.rank.confidence = 0.45; }]) {
    const data = result(); edit(data.results[0]);
    assert.equal((await setup({ respond: () => Response.json(data) }).geocode(address)).precision, "MEDIUM");
  }
});

test("house e amenity corretos são HIGH; sem número pode retornar MEDIUM e produção não loga", async () => {
  for (const type of ["house", "amenity"]) {
    const data = result(); data.results[0].result_type = type;
    assert.equal((await setup({ respond: () => Response.json(data) }).geocode(address)).precision, "HIGH");
  }
  const data = result(); delete data.results[0].housenumber;
  const app = setup({ config: { ...env, NODE_ENV: "production" }, respond: n => Response.json(n < 5 ? { results: [] } : data) });
  assert.equal((await app.geocode(address)).precision, "MEDIUM");
  assert.equal(app.calls.length, 5); assert.deepEqual(app.logs, []);
});

test("Rua Pátria corresponde a Rua da Pátria; prédio sem precisão vira MEDIUM", async () => {
  const data = result(), r = data.results[0];
  r.street = "Rua da Pátria"; r.housenumber = "434"; r.postcode = "09780-120";
  r.rank.confidence = 0.45; r.rank.confidence_building_level = 0;
  const app = setup({ respond: () => Response.json(data) });
  assert.equal((await app.geocode({ ...address, rua: "Rua Pátria", numero: "434", cep: "09780-190" })).precision, "MEDIUM");
});

test("múltiplos candidatos MEDIUM só aprovam quando todos ficam até 13 km", async () => {
  const service = setup({ config: { ...env, STORE_LAT: "0", STORE_LNG: "0" } }).load("app/lib/delivery/service.ts");
  const point = km => ({ lat: km / 6371.0088 * 180 / Math.PI, lng: 0 });
  for (const [kms, decision] of [[[8,12],"allowed"],[[8,14],"inconclusive"],[[8,16],"inconclusive"],[[16,17],"outside"]]) {
    assert.equal(service.assessDelivery({ ...point(kms[0]), precision: "MEDIUM", alternatives: kms.map(point) }).decision, decision);
  }
});
