import { createFileRoute } from "@tanstack/react-router";
import { loadTheme } from "@/lib/theme-engine/defaults";
import { ThemeRenderer } from "@/components/theme/theme-renderer";

export const Route = createFileRoute("/_authenticated/loja/preview")({
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
 * Full-screen, zero-UI live preview of the published theme.
 * Opened in a new browser tab from the Theme Builder.
 */
function PreviewPage() {
  // Always reads from the persisted (localStorage) theme so what you see here
  // is exactly what the customer will see after the merchant clicks "Publicar".
  const theme = loadTheme();

  return (
    <div className="min-h-screen w-full bg-white">
      <ThemeRenderer theme={theme} />
    </div>
  );
}
