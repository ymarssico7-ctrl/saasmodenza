import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ThemeRenderer } from "@/components/theme/theme-renderer";
import { loadTheme } from "@/lib/theme-engine/defaults";
import { useStore } from "@/lib/store-context";
import { inventoryQuery } from "@/lib/db";
import { mergeInventoryWithShowcase } from "@/lib/showcase-store";
import type { ThemeConfig } from "@/lib/theme-engine/schema";

export const Route = createFileRoute("/loja/preview")({
  head: () => ({
    meta: [
      { title: "Preview da Loja — Vestui" },
      { name: "description", content: "Visualização ao vivo da sua loja Vestui." },
    ],
  }),
  component: PreviewPage,
});

function PreviewPage() {
  const { store } = useStore();
  const [theme, setTheme] = useState<ThemeConfig>(() => loadTheme());

  const { data: rawInventory = [] } = useQuery(inventoryQuery());
  const allProducts = useMemo(() => {
    return mergeInventoryWithShowcase(
      rawInventory as Parameters<typeof mergeInventoryWithShowcase>[0],
    );
  }, [rawInventory]);

  // Atualiza o preview em tempo real quando o builder envia alterações
  useEffect(() => {
    const onThemeChanged = (evt: Event) => {
      const custom = evt as CustomEvent<ThemeConfig>;
      if (custom.detail && typeof custom.detail === "object") {
        setTheme(custom.detail);
      } else {
        setTheme(loadTheme());
      }
    };

    // Escuta mudanças via storage (outras abas) e via CustomEvent (mesma aba)
    const onStorage = (evt: StorageEvent) => {
      if (evt.key === "vestui_theme_config" || evt.key === "modaly_theme_config") {
        setTheme(loadTheme());
      }
    };

    window.addEventListener("theme-changed", onThemeChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("theme-changed", onThemeChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return (
    <ThemeRenderer
      theme={theme}
      showcaseProducts={allProducts}
      storeName={store?.name}
      {...(store?.phone ? { storePhone: store.phone } : {})}
    />
  );
}
