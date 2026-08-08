import { createFileRoute } from "@tanstack/react-router";
import { AtelierModStore } from "@/components/theme/atelier-mod-store";

export const Route = createFileRoute("/loja/preview")({
  head: () => ({
    meta: [
      { title: "Preview da Loja — Modaly" },
      { name: "description", content: "Visualização ao vivo da sua loja Modaly." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500&family=Figtree:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  component: PreviewPage,
});

/**
 * Full-screen, zero-UI live preview of the Atelier Mod store template.
 * Lives outside _authenticated so the admin shell is never rendered.
 */
function PreviewPage() {
  return <AtelierModStore />;
}
