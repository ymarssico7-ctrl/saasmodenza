import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/fiado")({
  beforeLoad: () => {
    throw redirect({
      to: "/clientes",
      search: { tab: "fiado" },
    });
  },
  component: () => null,
});
