import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ThemeRenderer } from "@/components/theme/theme-renderer";
import { loadTheme } from "@/lib/theme-engine/defaults";
import type { ThemeConfig } from "@/lib/theme-engine/schema";

const CHANNEL_NAME = "vestuli_theme_preview";

export const Route = createFileRoute("/loja/preview-frame")({
  head: () => ({
    meta: [{ title: "Mobile Preview — Vestuli Builder" }],
  }),
  component: PreviewFramePage,
});

function PreviewFramePage() {
  const [theme, setTheme] = useState<ThemeConfig>(() => loadTheme());
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // Canal reutilizável — evita criar/destruir uma instância a cada clique do usuário
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Abre o canal uma única vez ao montar e reutiliza para envio e recebimento
  useEffect(() => {
    try {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;
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
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, []);

  // Envia eventos de interação de volta ao builder pelo mesmo canal persistente
  const postToBuilder = (type: string, payload?: unknown) => {
    channelRef.current?.postMessage({ type, payload });
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
