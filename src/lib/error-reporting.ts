/**
 * Modaly 2.0 — Resilient Application Error Reporting
 *
 * Captura e formata erros em tempo de execução com contexto semântico.
 * Em desenvolvimento, registra logs estruturados no console.
 * Em produção, atua como ponto único de extensão para telemetria (ex: Sentry, Cloudflare Analytics).
 */

export type AppErrorContext = {
  boundary?: string;
  route?: string;
  [key: string]: unknown;
};

export function reportAppError(error: unknown, context: AppErrorContext = {}): void {
  if (typeof window === "undefined") return;

  const route = context.route ?? window.location.pathname;
  const timestamp = new Date().toISOString();

  const formattedMessage =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  const stack = error instanceof Error ? error.stack : undefined;

  // Log estruturado padronizado
  if (import.meta.env?.DEV) {
    console.groupCollapsed(`[Modaly Error Boundary] ${formattedMessage}`);
    console.error("Timestamp:", timestamp);
    console.error("Route:", route);
    console.error("Context:", context);
    if (stack) console.error("Stack:", stack);
    console.groupEnd();
  } else {
    // Em produção, registra de forma limpa e resiliente
    console.error(`[Modaly App Error] (${route}):`, formattedMessage);
  }
}
