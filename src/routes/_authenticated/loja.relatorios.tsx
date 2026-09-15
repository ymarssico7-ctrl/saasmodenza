import { createFileRoute, Navigate } from "@tanstack/react-router";

// Redirecionamento unificado: todos os relatórios agora vivem na rota nobre /relatorio
export const Route = createFileRoute("/_authenticated/loja/relatorios")({
  component: () => <Navigate to="/relatorio" replace />,
});
