import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Tempo de cache padronizado: 5 minutos
const STALE_TIME = 1000 * 60 * 5;
const GC_TIME = 1000 * 60 * 30;

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Dados ficam "frescos" por 5 minutos → navegação entre ferramentas
        // não dispara refetches nem oscilações visuais de loader.
        staleTime: STALE_TIME,
        gcTime: GC_TIME,
        // Foco na janela NÃO refaz queries automaticamente → sem flash de
        // recarregamento ao voltar para a aba do browser.
        refetchOnWindowFocus: false,
        // Retry apenas 1x em caso de falha de rede (padrão era 3x).
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preloading por intenção de hover: ao passar o mouse sobre qualquer
    // <Link>, o roteador pré-carrega o JS da rota e executa as queries.
    defaultPreload: "intent",
    // Dados pré-carregados permanecem válidos por 5 minutos.
    defaultPreloadStaleTime: STALE_TIME,
  });

  return router;
};
