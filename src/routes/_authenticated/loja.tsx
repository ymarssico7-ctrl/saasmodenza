import { createFileRoute, Outlet } from "@tanstack/react-router";

// Rota pai de todas as sub-rotas /loja/*.
// No modelo unificado, o acesso é gerenciado pelo plano global.
// Não há mais paywall interno entre Gestão e Loja — são faces do mesmo sistema.
export const Route = createFileRoute("/_authenticated/loja")({
  component: LojaLayout,
});

function LojaLayout() {
  return <Outlet />;
}
