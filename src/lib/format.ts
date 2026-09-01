/** Formatação brasileira: R$ e DD/MM/AAAA. */

export const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(value) ? value : 0,
  );

export const brlCompact = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

export const pct = (value: number) =>
  `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
    Number.isFinite(value) ? value : 0,
  )}%`;

/** "2026-08-04" -> "04/08/2026" (sem deslocamento de fuso). */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

export function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

/** Primeiro dia do mês em ISO. offset = -1 é o mês anterior. */
export function monthStart(offset = 0, base = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function monthEnd(offset = 0, base = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth() + offset + 1, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function monthLabel(iso: string) {
  const [y, m] = iso.slice(0, 10).split("-");
  const name = MONTHS[Number(m) - 1] ?? "";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${y}`;
}

export function monthLabelShort(iso: string) {
  const [y, m] = iso.slice(0, 10).split("-");
  return `${(MONTHS[Number(m) - 1] ?? "").slice(0, 3)}/${y?.slice(2)}`;
}

/** Últimos N meses (mais recente primeiro), em ISO do primeiro dia. */
export function lastMonths(count: number) {
  return Array.from({ length: count }, (_, i) => monthStart(-i));
}

export function daysBetween(fromISO: string, toISO: string) {
  const a = new Date(`${fromISO.slice(0, 10)}T00:00:00`);
  const b = new Date(`${toISO.slice(0, 10)}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const str = String(value).trim().replace(/\s/g, "");
  if (!str) return 0;

  // Se tem vírgula, tratamos como padrão BR (ponto é milhar, vírgula é decimal: ex: "1.500,00" ou "49,90")
  if (str.includes(",")) {
    const normalized = str.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // Se não tem vírgula, verifica se tem um único ponto decimal (ex: "49.90" ou "1500.5")
  const dotCount = (str.match(/\./g) || []).length;
  if (dotCount === 1) {
    const parts = str.split(".");
    if (parts[1] && parts[1].length <= 2) {
      const parsed = Number(str.replace(/[^\d.-]/g, ""));
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  // Múltiplos pontos ou padrão de milhar sem vírgula (ex: "1.500")
  const normalized = str.replace(/\./g, "");
  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
