import { createFileRoute } from "@tanstack/react-router";
import { AtelierModStore } from "@/components/theme/atelier-mod-store";

export const Route = createFileRoute("/loja/preview")({
  head: () => ({
    meta: [
      { title: "Preview da Loja — Modaly" },
      {
        name: "description",
        content: "Visualização ao vivo da sua loja Modaly.",
      },
    ],
  }),
  component: PreviewPage,
});

/**
 * Full-screen, zero-UI live preview of the Atelier Mod store template.
 * Lives outside _authenticated so the admin shell is never rendered.
 * The customer sees exactly what the merchant published.
 */
function PreviewPage() {
  return <AtelierModStore />;
}
