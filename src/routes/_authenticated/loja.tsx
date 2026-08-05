import { createFileRoute, Outlet } from "@tanstack/react-router";

// This file acts as the layout parent for all /loja/* sub-routes.
// The dashboard (visão geral) lives in loja.index.tsx.
export const Route = createFileRoute("/_authenticated/loja")({
  component: LojaLayout,
});

function LojaLayout() {
  return <Outlet />;
}
