import { createFileRoute } from "@tanstack/react-router";
import { ThemeBuilder } from "@/components/theme/builder/theme-builder";

export const Route = createFileRoute("/_authenticated/loja/personalizar")({
  head: () => ({
    meta: [
      { title: "Personalizar Loja — Modaly" },
      {
        name: "description",
        content:
          "Monte e personalize o visual da sua vitrine online com o construtor de lojas Modaly.",
      },
    ],
  }),
  component: PersonalizarPage,
});

function PersonalizarPage() {
  // The ThemeBuilder takes over the full screen, so we render it directly
  return <ThemeBuilder />;
}
