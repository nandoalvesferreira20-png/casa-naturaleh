import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import * as ipaddr from "ipaddr.js";
import { LIMITE_IMAGEM } from "./importacao-produtos";

export function enderecoPublico(endereco: string) {
  try { return ipaddr.process(endereco).range() === "unicast"; } catch { return false; }
}
export function validarConteudo(buffer: Buffer, tipo?: string) {
  const detectado = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 ? "image/jpeg"
    : buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png"
    : buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" ? "image/webp" : "";
  if (!detectado || (tipo && tipo !== detectado)) throw new Error("O conteúdo não corresponde a uma imagem JPEG, PNG ou WEBP.");
  if (!buffer.length || buffer.length > LIMITE_IMAGEM) throw new Error("Imagem vazia ou maior que 5 MB.");
  return { buffer, tipo: detectado, extensao: detectado === "image/jpeg" ? "jpg" : detectado.split("/")[1] };
}
export async function baixarImagem(endereco: string, redirects = 0): Promise<ReturnType<typeof validarConteudo>> {
  const url = new URL(endereco);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("URL de imagem inválida.");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) throw new Error("Endereço de imagem bloqueado.");
  // Resolve uma vez e fixa o endereço na conexão para impedir DNS rebinding.
  const enderecos = await lookup(hostname, { all: true });
  if (!enderecos.length || enderecos.some(e => !enderecoPublico(e.address))) throw new Error("Endereço de imagem bloqueado.");
  const destino = enderecos[0];
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => req.destroy(new Error("Timeout ao baixar imagem.")), 15000);
    const req = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      agent: false,
      lookup: (_host, options, callback) => {
        if (options.all) callback(null, [destino]);
        else callback(null, destino.address, destino.family);
      },
      headers: { Accept: "image/jpeg,image/png,image/webp" },
    }, res => {
      if ([301,302,303,307,308].includes(res.statusCode ?? 0)) {
        res.resume(); clearTimeout(timer);
        if (!res.headers.location || redirects >= 3) { reject(new Error("Redirecionamento de imagem inválido.")); return; }
        baixarImagem(new URL(res.headers.location, url).href, redirects + 1).then(resolve, reject); return;
      }
      const tipo = res.headers["content-type"]?.split(";")[0].trim().toLowerCase();
      if (res.statusCode !== 200 || !tipo || !["image/jpeg", "image/png", "image/webp"].includes(tipo)) { res.destroy(); reject(new Error("Falha no download: resposta não é uma imagem válida (HTTP 200).")); return; }
      if (Number(res.headers["content-length"]) > LIMITE_IMAGEM) { res.destroy(); reject(new Error("Imagem maior que 5 MB.")); return; }
      const partes: Buffer[] = []; let tamanho = 0;
      res.on("data", (parte: Buffer) => {
        tamanho += parte.length;
        if (tamanho > LIMITE_IMAGEM) res.destroy(new Error("Imagem maior que 5 MB.")); else partes.push(parte);
      });
      res.on("error", reject);
      res.on("end", () => { try { resolve(validarConteudo(Buffer.concat(partes), tipo)); } catch (e) { reject(e); } });
    });
    req.on("error", reject); req.on("close", () => clearTimeout(timer)); req.end();
  });
}
export async function concorrenciaLimitada<T>(itens: T[], tarefa: (item: T) => Promise<void>, limite = 4) {
  let indice = 0;
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (indice < itens.length) { const item = itens[indice++]; await tarefa(item); }
  }));
}
