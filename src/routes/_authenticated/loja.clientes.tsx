import { createFileRoute, Navigate } from "@tanstack/react-router";

// Redirecionamento unificado: todos os clientes agora vivem na rota nobre /clientes
export const Route = createFileRoute("/_authenticated/loja/clientes")({
  component: () => <Navigate to="/clientes" replace />,
});
