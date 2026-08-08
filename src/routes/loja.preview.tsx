import { createFileRoute } from "@tanstack/react-router";
import { loadTheme } from "@/lib/theme-engine/defaults";
import { ThemeRenderer } from "@/components/theme/theme-renderer";

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
 * Full-screen, zero-UI live preview of the published theme.
 * Opened in a new browser tab from the Appearance page.
 * Lives outside _authenticated so the admin shell (sidebar/topbar)
 * is never rendered — the customer sees exactly what the merchant published.
 */
function PreviewPage() {
  const theme = loadTheme();

  return (
    <div className="min-h-screen w-full bg-white">
      <ThemeRenderer theme={theme} />
    </div>
  );
}
