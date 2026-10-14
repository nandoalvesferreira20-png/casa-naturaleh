import { createHash } from "node:crypto";
import type { ManualPixPayment } from "./types";

export type PixOptions = { key: string; receiverName: string; receiverCity: string; amount: number; txid: string; description?: string };

function field(id: string, value: string) {
  const length = Buffer.byteLength(value, "utf8");
  if (length === 0 || length > 99) throw new Error("Campo Pix fora do limite EMV.");
  return id + String(length).padStart(2, "0") + value;
}

export function crc16(value: string): string {
  let crc = 0xffff;
  for (const byte of Buffer.from(value, "utf8")) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function receiverText(value: string, limit: number) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit).trim();
  if (!normalized) throw new Error("Nome/cidade Pix inválido.");
  return normalized;
}

function validKey(key: string) {
  // Não transformar dígitos nem remover pontuação silenciosamente de uma chave financeira.
  return /^[0-9]{11}$/.test(key) || /^[0-9]{14}$/.test(key) || /^\+[1-9][0-9]{1,14}$/.test(key) ||
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(key) ||
    (key.length <= 77 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(key));
}

// QR estático Pix: TLV EMV + CRC16/CCITT-FALSE, conforme manual do Banco Central.
export function generatePixPayload(options: PixOptions): string {
  const { key, amount, txid } = options;
  if (!validKey(key)) throw new Error("Formato da chave Pix inválido.");
  if (!/^[A-Za-z0-9]{1,25}$/.test(txid)) throw new Error("Txid Pix inválido.");
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(cents) || Math.abs(amount * 100 - cents) > 0.000001) throw new Error("Valor Pix inválido.");
  const formatted = (cents / 100).toFixed(2);
  if (formatted.length > 13) throw new Error("Valor Pix excede o limite EMV.");
  let account = field("00", "br.gov.bcb.pix") + field("01", key);
  if (options.description) {
    const description = receiverText(options.description, 72);
    // Nunca truncar a chave para acomodar uma descrição opcional.
    account += field("02", description);
  }
  const payload = field("00", "01") + field("26", account) + field("52", "0000") + field("53", "986") +
    field("54", formatted) + field("58", "BR") + field("59", receiverText(options.receiverName, 25)) +
    field("60", receiverText(options.receiverCity, 15)) + field("62", field("05", txid)) + "6304";
  return payload + crc16(payload);
}

export function pixTxid(orderId: string, prefix = ""): string {
  if (!orderId || !/^[A-Za-z0-9]{0,5}$/.test(prefix)) throw new Error("Referência/prefixo Pix inválido.");
  // Hash evita colisões triviais por remoção de caracteres e mantém referência determinística.
  return prefix + createHash("sha256").update(orderId).digest("hex").slice(0, 25 - prefix.length);
}

export class PixConfigurationError extends Error {
  constructor() { super("Pagamento Pix indisponível no momento. Tente novamente mais tarde."); }
}

export function createManualPixPayment(orderId: string, total: number): ManualPixPayment {
  // Leitura somente no checkout backend, nunca durante import/build ou no navegador.
  try {
    const txid = pixTxid(orderId, process.env.PIX_TXID_PREFIX ?? "");
    const pixCopyPaste = generatePixPayload({
      key: (process.env.PIX_KEY ?? "").trim(), receiverName: process.env.PIX_RECEIVER_NAME ?? "",
      receiverCity: process.env.PIX_RECEIVER_CITY ?? "", amount: total, txid,
    });
    return { provider: "pix_manual", method: "pix", status: "pending", txid, pixCopyPaste };
  } catch { throw new PixConfigurationError(); }
}
