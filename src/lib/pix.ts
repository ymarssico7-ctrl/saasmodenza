/**
 * pix.ts — Gerador de BR Code (Pix Copia e Cola) padrão BACEN
 *
 * Implementação da especificação oficial EMV QRCPS-MPM do Banco Central
 * do Brasil. Gera o payload completo (Pix Copia e Cola) e a URL do QR Code.
 *
 * Referência: Manual de Padrões para Iniciação do Pix — BACEN
 */

// ─── CRC-16/CCITT-FALSE ──────────────────────────────────────────────────────
function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function field(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function normalizeText(text: string, maxLen: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^A-Za-z0-9 ]/g, "")   // Apenas alfanumérico e espaço
    .trim()
    .toUpperCase()
    .slice(0, maxLen);
}

function normalizePixKey(key: string): string {
  return key.replace(/[\s]/g, ""); // Remove espaços da chave
}

// ─── Interface pública ────────────────────────────────────────────────────────
export interface PixBrCodeParams {
  /** Chave Pix (CPF, CNPJ, email, telefone ou chave aleatória) */
  key: string;
  /** Valor do pagamento em reais (ex: 149.90). 0 = sem valor fixo */
  amount: number;
  /** Nome do beneficiário (máx 25 chars) */
  merchantName: string;
  /** Cidade do beneficiário (máx 15 chars) */
  merchantCity: string;
  /** ID da transação (opcional, máx 25 chars, sem espaços) */
  txId?: string;
  /** Descrição breve (opcional) */
  description?: string;
}

/**
 * Gera o payload oficial do Pix Copia e Cola (EMV BR Code).
 * O código resultante pode ser copiado e colado no app de qualquer banco.
 */
export function generatePixPayload(params: PixBrCodeParams): string {
  const { key, amount, merchantName, merchantCity, txId, description } = params;

  const normalizedKey = normalizePixKey(key);
  const normalizedName = normalizeText(merchantName || "Loja", 25);
  const normalizedCity = normalizeText(merchantCity || "Brasil", 15);
  const normalizedTxId = txId
    ? normalizeText(txId.replace(/\s/g, ""), 25)
    : "***";

  // Merchant Account Information (ID 26)
  const guiField = field("00", "br.gov.bcb.pix");
  const keyField = field("01", normalizedKey);
  const descField = description
    ? field("02", normalizeText(description, 40))
    : "";
  const merchantAccountInfo = field("26", `${guiField}${keyField}${descField}`);

  // Additional Data Field Template (ID 62)
  const additionalData = field("62", field("05", normalizedTxId));

  // Monta o payload sem o CRC
  const parts = [
    field("00", "01"),              // Payload Format Indicator
    merchantAccountInfo,            // Merchant Account Information
    field("52", "0000"),            // Merchant Category Code
    field("53", "986"),             // Transaction Currency (BRL)
    amount > 0 ? field("54", amount.toFixed(2)) : "", // Transaction Amount
    field("58", "BR"),              // Country Code
    field("59", normalizedName),    // Merchant Name
    field("60", normalizedCity),    // Merchant City
    additionalData,                 // Additional Data Field
    "6304",                         // CRC16 ID + length placeholder
  ];

  const payloadWithoutCrc = parts.join("");
  return payloadWithoutCrc + crc16(payloadWithoutCrc);
}

/**
 * Gera a URL do QR Code para exibição.
 * Retorna uma URL de imagem PNG pronta para uso em <img src={...} />.
 */
export function generatePixQrCodeUrl(
  payload: string,
  size: number = 200,
): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}&format=png&ecc=M`;
}
