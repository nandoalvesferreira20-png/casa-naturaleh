import { createHash } from "node:crypto";
import { DeliveryError, INCONCLUSIVE_MESSAGE, type Precision, type Coordinates, type DeliveryAddress } from "./types";
import { distanceKm, validCoordinates } from "./distance";

const invalidAddress = () => new DeliveryError(INCONCLUSIVE_MESSAGE);
const unavailable = () => new DeliveryError("Não conseguimos validar seu endereço agora. Tente novamente em alguns instantes.", 503);
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const street = (value: string) => normalize(value.replace(/^\s*(av\.?|avenida)\s+/i, "avenida ").replace(/^\s*(r\.?|rua)\s+/i, "rua ").replace(/\b(de|da|do|das|dos)\b/gi, " "));
const states: Record<string, string> = { AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins" };
type GeocodingMatch = Coordinates & { precision: Precision; alternatives: Coordinates[]; strategy: string; formatted: string; confidence: number | null; resultType: string; street: string; city: string; state: string; postcode: string };
const cache = new Map<string, { expires: number; location: GeocodingMatch | null }>();
const pending = new Map<string, Promise<GeocodingMatch>>();

function cleanAddress(address: DeliveryAddress): DeliveryAddress {
  const clean = (value: string) => value.trim().replace(/\s+/g, " ");
  const cep = address.cep.replace(/\D/g, "");
  const estado = clean(address.estado).toUpperCase();
  if (cep.length !== 8 || estado !== "SP") throw invalidAddress();
  return { cep: `${cep.slice(0, 5)}-${cep.slice(5)}`, rua: clean(address.rua), numero: clean(address.numero),
    bairro: clean(address.bairro), cidade: clean(address.cidade), estado };
}

function remember(key: string, location: GeocodingMatch | null) {
  for (const [id, value] of cache) if (value.expires <= Date.now()) cache.delete(id);
  if (cache.size >= 500) cache.delete(cache.keys().next().value!);
  cache.set(key, { location, expires: Date.now() + (location ? 86400000 : 300000) });
}

function resultLocation(value: unknown, expected: DeliveryAddress): (Coordinates & { precision: Precision }) | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  if (typeof result.lat !== "number" || typeof result.lon !== "number") return null;
  const location = { lat: result.lat, lng: result.lon };
  if (!validCoordinates(location)) return null;
  const part = (name: string) => typeof result[name] === "string" ? result[name] as string : "";
  const city = part("city") || part("municipality");
  const uf = expected.estado.toUpperCase();
  if (uf !== "SP" || part("country_code").toLowerCase() !== "br" || normalize(city) !== normalize(expected.cidade) ||
    (part("state_code") ? ![uf, "BR-" + uf].includes(part("state_code").toUpperCase()) : normalize(part("state")) !== normalize(states[uf])) ||
    (part("state") && ![normalize(states[uf]), normalize(uf)].includes(normalize(part("state"))))) return null;
  const rank = result.rank && typeof result.rank === "object" ? result.rank as Record<string, unknown> : {};
  const confidence = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0.8 && value <= 1;
  const number = (value: string) => normalize(value).replace(/^0+(?=\d)/, "");
  const streetMatches = Boolean(part("street")) && street(part("street")) === street(expected.rua);
  const supportedType = ["building", "house", "amenity", "street"].includes(part("result_type"));
  // Confiança de prédio zero não invalida a correspondência da rua.
  const streetReliable = ["confidence_city_level", "confidence_street_level"].every(field => rank[field] === undefined || confidence(rank[field]));
  if (!streetMatches || !supportedType || !streetReliable) return { ...location, precision: "LOW" };
  const postcodeMatches = !part("postcode") || part("postcode").replace(/\D/g, "") === expected.cep.replace(/\D/g, "");
  const high = ["building", "house", "amenity"].includes(part("result_type")) &&
    Boolean(part("housenumber")) && number(part("housenumber")) === number(expected.numero) && postcodeMatches &&
    confidence(rank.confidence) && (rank.confidence_building_level === undefined || confidence(rank.confidence_building_level)) &&
    ["full_match", "inner_part", "match_by_building"].includes(String(rank.match_type));
  return { ...location, precision: high ? "HIGH" : "MEDIUM" };
}

// Somente servidor; consulta não inclui identidade, complemento ou pagamento.
export async function diagnoseAddress(address: DeliveryAddress): Promise<GeocodingMatch> {
  address = cleanAddress(address);
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim();
  if (!apiKey) throw new DeliveryError("A validação de entrega está indisponível por configuração. Escolha retirada ou tente novamente mais tarde.", 503);
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  const key = createHash("sha256").update([url.href, address.cep.replace(/\D/g, ""), street(address.rua), normalize(address.numero), normalize(address.bairro), normalize(address.cidade), normalize(address.estado)].join("|")).digest("hex");
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    if (!cached.location) throw invalidAddress();
    return structuredClone(cached.location);
  }
  const existing = pending.get(key);
  if (existing) return structuredClone(await existing);
  const request = async (): Promise<GeocodingMatch> => {
    try {
      const structured = {
        housenumber: address.numero, street: address.rua, postcode: address.cep,
        city: address.cidade, state: states[address.estado], country: "Brazil",
      };
      const region = [address.cidade, states[address.estado]];
      const attempts: { name: string; parameters: Record<string, string> }[] = [
        { name: "structured", parameters: structured },
        { name: "free_form", parameters: { text: [address.rua, address.numero, address.bairro, ...region, address.cep, "Brasil"].filter(Boolean).join(", ") } },
        { name: "sem_bairro", parameters: { text: [address.rua, address.numero, ...region, address.cep, "Brasil"].join(", ") } },
        { name: "structured_cep_numerico", parameters: { ...structured, postcode: address.cep.replace(/\D/g, "") } },
        { name: "sem_numero", parameters: { text: [address.rua, ...region, address.cep, "Brasil"].join(", ") } },
        { name: "cep", parameters: { text: [address.cep, ...region, "Brasil"].join(", ") } },
      ];
      const seen = new Set<string>();
      let low: GeocodingMatch | null = null;
      for (const attempt of attempts) {
        const signature = JSON.stringify(attempt.parameters);
        if (seen.has(signature)) continue;
        seen.add(signature);
        const parameters = { ...attempt.parameters, format: "json", filter: "countrycode:br", limit: "5", lang: "pt" };
        if (process.env.NODE_ENV === "development") console.info("[delivery:geocoding:params]", { estrategia: attempt.name, ...parameters });
        const requestUrl = new URL(url);
        requestUrl.search = new URLSearchParams({
          ...parameters, apiKey,
        }).toString();
        const response = await fetch(requestUrl, {
          headers: { Accept: "application/json" },
          cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
        });
        if (response.status === 401 || response.status === 403) throw new DeliveryError("A validação de entrega está indisponível por configuração. Escolha retirada ou tente novamente mais tarde.", 503);
        if (!response.ok) throw unavailable();
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("results" in data) || !Array.isArray(data.results)) throw unavailable();
        const records = data.results.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object");
        const safe = (value: unknown) => typeof value === "string" ? value.replaceAll(apiKey, "[redacted]").replace(/[\r\n]/g, " ").slice(0, 300) : typeof value === "number" ? value : null;
        if (process.env.NODE_ENV === "development") {
          console.info("[delivery:geocoding]", { provider: "geoapify", estrategia: attempt.name, resultados: data.results.length });
          for (const record of records.slice(0, 5)) {
            const rank = record.rank && typeof record.rank === "object" ? record.rank as Record<string, unknown> : {};
            console.info("[delivery:geocoding:result]", { estrategia: attempt.name,
              ...Object.fromEntries(["result_type", "formatted", "city", "state", "postcode", "housenumber", "street"].map(field => [field, safe(record[field])])),
              confidence: safe(rank.confidence), confidence_city: safe(rank.confidence_city_level), confidence_street: safe(rank.confidence_street_level), confidence_building: safe(rank.confidence_building_level), match_type: safe(rank.match_type) });
          }
        }
        const candidates = records.map(record => ({ record, location: resultLocation(record, address) })).filter((value): value is { record: Record<string, unknown>; location: Coordinates & { precision: Precision } } => value.location !== null);
        const preferred = candidates.filter(candidate => candidate.location.precision === "HIGH");
        const medium = candidates.filter(candidate => candidate.location.precision === "MEDIUM");
        const ranked = preferred.length ? preferred : medium.length ? medium : candidates;
        // HIGH exige candidatos próximos. MEDIUM preserva todos os pontos para avaliar a faixa de distâncias.
        const reliable = ranked.length > 0 && (ranked[0].location.precision !== "HIGH" || !ranked.some(value => distanceKm(ranked[0].location, value.location) > 0.05));
        if (!reliable) continue;
        const best = ranked[0];
        const location: GeocodingMatch = { ...best.location, alternatives: ranked.map(({ location }) => ({ lat: location.lat, lng: location.lng })), strategy: attempt.name, formatted: String(safe(best.record.formatted) ?? ""), confidence: typeof (best.record.rank as Record<string, unknown> | undefined)?.confidence === "number" ? (best.record.rank as Record<string, number>).confidence : null, resultType: String(best.record.result_type), street: String(safe(best.record.street) ?? ""), city: String(safe(best.record.city ?? best.record.municipality) ?? ""), state: String(safe(best.record.state) ?? ""), postcode: String(safe(best.record.postcode) ?? "") };
        if (location.precision === "LOW") { low ??= location; continue; }
        remember(key, location);
        return location;
      }
      if (low) { remember(key, low); return low; }
      remember(key, null); throw invalidAddress();
    } catch (error) {
      if (error instanceof DeliveryError) throw error;
      throw unavailable();
    }
  };
  const promise = request();
  pending.set(key, promise);
  try { return structuredClone(await promise); } finally { pending.delete(key); }
}

export async function geocodeAddress(address: DeliveryAddress): Promise<Coordinates & { precision: Precision; alternatives: Coordinates[] }> {
  const { lat, lng, precision, alternatives } = await diagnoseAddress(address);
  return { lat, lng, precision, alternatives };
}
