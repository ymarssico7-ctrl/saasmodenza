import { createFileRoute } from "@tanstack/react-router";
import { ThemeRenderer } from "@/components/theme/theme-renderer";
import { loadTheme } from "@/lib/theme-engine/defaults";

export const Route = createFileRoute("/loja/preview")({
  head: () => ({
    meta: [
      { title: "Preview da Loja — Vestuli" },
      { name: "description", content: "Visualização ao vivo da sua loja Vestuli." },
    ],
  }),
  component: PreviewPage,
});

function PreviewPage() {
  const theme = loadTheme();
  return <ThemeRenderer theme={theme} />;
}
