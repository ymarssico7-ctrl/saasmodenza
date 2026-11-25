import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/**
 * Injeta cabeçalhos de Edge Cache HTTP na resposta de rotas públicas da vitrine.
 *
 * ESTRATÉGIA DE CACHE ESCALONÁVEL (Cloudflare Workers / CDN):
 *
 *  /vitrine/*
 *    public, max-age=0, s-maxage=30, stale-while-revalidate=120
 *    → Cloudflare CDN serve a resposta cacheada por até 30s sem tocar o banco.
 *    → Após 30s, revalida em background (visitante não percebe lentidão).
 *    → Resultado: 10.000 acessos simultâneos à mesma vitrine → ~1-3 req/s ao banco (99% CDN hit rate).
 *
 *  /auth, /_authenticated, /api/*
 *    no-store — rotas autenticadas nunca são cacheadas.
 *
 *  Demais rotas
 *    must-revalidate sem s-maxage.
 */
function injectCacheHeaders(request: Request, response: Response): Response {
  const url = new URL(request.url);
  const pathname = url.pathname;

  const newHeaders = new Headers(response.headers);

  // Nunca cachear respostas de erro
  if (response.status >= 400) {
    newHeaders.set("Cache-Control", "no-store");
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }

  // Rotas públicas da vitrine: Edge Cache de 30s com revalidação transparente
  if (pathname.startsWith("/vitrine/")) {
    newHeaders.set(
      "Cache-Control",
      "public, max-age=0, s-maxage=30, stale-while-revalidate=120",
    );
    newHeaders.set("Vary", "Accept-Encoding");
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }

  // Rotas autenticadas do painel da lojista e APIs: nunca cachear
  if (
    pathname.startsWith("/_authenticated") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth")
  ) {
    newHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }

  // Demais rotas: sem cache no CDN, sem cache agressivo no browser
  newHeaders.set("Cache-Control", "public, max-age=0, s-maxage=0, must-revalidate");
  return new Response(response.body, { status: response.status, headers: newHeaders });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      // Injeta headers de Edge Cache para escalabilidade (Cloudflare CDN)
      return injectCacheHeaders(request, normalized);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
