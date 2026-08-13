/**
 * /loja/preview-frame — Rota exclusiva para o iframe de preview mobile.
 *
 * Esta página é carregada dentro de um <iframe> pelo ThemeBuilder.
 * Não tem chrome (sem nav, sem toolbar) e se comunica com o builder-pai
 * via BroadcastChannel para atualizações de tema em tempo real.
 *
 * Fluxo:
 *   1. Carrega o tema do localStorage na montagem inicial.
 *   2. Escuta o canal "modaly_theme_preview" para receber novas versões do tema.
 *   3. Envia eventos de interação (clique de seção, etc.) de volta ao builder.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ThemeRenderer } from "@/components/theme/theme-renderer";
import { loadTheme } from "@/lib/theme-engine/defaults";
import type { ThemeConfig } from "@/lib/theme-engine/schema";

const CHANNEL_NAME = "modaly_theme_preview";

export const Route = createFileRoute("/loja/preview-frame")({
  head: () => ({
    meta: [{ title: "Mobile Preview — Modaly Builder" }],
  }),
  component: PreviewFramePage,
});

function PreviewFramePage() {
  const [theme, setTheme] = useState<ThemeConfig>(() => loadTheme());
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Escuta mensagens do builder (tema atualizado, seção selecionada)
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (evt) => {
        const { type, payload } = evt.data ?? {};
        if (type === "THEME_UPDATE") {
          setTheme(payload as ThemeConfig);
        } else if (type === "SELECT_SECTION") {
          setHighlightId(payload as string | null);
        }
      };
    } catch {
      // BroadcastChannel não suportado — fallback: sem comunicação
    }
    return () => {
      channel?.close();
    };
  }, []);

  // Funções que enviam eventos de interação de volta ao builder
  const postToBuilder = (type: string, payload?: unknown) => {
    try {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ type, payload });
      ch.close();
    } catch {
      // silencioso
    }
  };

  return (
    // Remove estilos do admin. overflowX vai no html/body para não quebrar position:sticky.
    <div
      style={{
        margin: 0,
        padding: 0,
        minHeight: "100vh",
      }}
    >
      <style>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: clip; /* clip (NÃO hidden) bloqueia scroll horizontal SEM criar scroll-container, preservando position:sticky */
        }
        /* Scrollbar fina para visual limpo no mobile preview */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
      `}</style>
      <ThemeRenderer
        theme={theme}
        highlightId={highlightId}
        onSectionClick={(id) => postToBuilder("SECTION_CLICK", id)}
        onToggleSection={(id) => postToBuilder("TOGGLE_SECTION", id)}
        onDeleteSection={(id) => postToBuilder("DELETE_SECTION", id)}
      />
    </div>
  );
}
