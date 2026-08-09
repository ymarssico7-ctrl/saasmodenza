/**
 * MobilePreviewFrame — componente que encapsula o iframe do preview mobile.
 *
 * Responsabilidades:
 *   1. Renderizar um frame de "celular" visual (borda, notch, botões laterais).
 *   2. Carregar /loja/preview-frame em um iframe para que as media queries
 *      do Tailwind leiam corretamente a largura de 390px.
 *   3. AUTO-SCALING: Calcular dinamicamente a escala para que o celular
 *      sempre caiba na tela sem scroll externo, via ResizeObserver.
 *   4. ZOOM MANUAL: Controles de zoom (Auto, 100%, +, -) na barra inferior.
 *   5. Propagar mudanças de `theme` e `highlightId` para o iframe em tempo
 *      real via BroadcastChannel (sem reload).
 *   6. Escutar eventos de interação vindos do iframe e repassar ao builder
 *      via callbacks (onSectionClick, onToggleSection, onDeleteSection).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus, PanelLeftOpen } from "lucide-react";
import type { ThemeConfig } from "@/lib/theme-engine/schema";

const CHANNEL_NAME = "modaly_theme_preview";
// Dimensões reais do iPhone 14 Pro — mantidas fixas para breakpoints corretos
const FRAME_W = 390;
const FRAME_H = 844;
// Padding vertical de respiro (topo + base)
const VERTICAL_PADDING = 56;
// Altura da barra de controles de zoom abaixo do celular
const ZOOM_BAR_H = 44;

interface MobilePreviewFrameProps {
  theme: ThemeConfig;
  highlightId?: string | null;
  isSidebarOpen?: boolean;
  onSectionClick?: (id: string) => void;
  onToggleSection?: (id: string) => void;
  onDeleteSection?: (id: string) => void;
  onOpenSidebar?: () => void;
}

export function MobilePreviewFrame({
  theme,
  highlightId,
  isSidebarOpen = true,
  onSectionClick,
  onToggleSection,
  onDeleteSection,
  onOpenSidebar,
}: MobilePreviewFrameProps) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLElement>(null);

  // "auto" = auto-fit; número = escala manual (0.5 … 1)
  const [zoomMode, setZoomMode] = useState<"auto" | number>("auto");
  const [autoScale, setAutoScale] = useState(1);

  const effectiveScale = zoomMode === "auto" ? autoScale : zoomMode;
  const PHONE_TOTAL_H = FRAME_H + 48; // moldura completa

  // ── Auto-Scaling: observa o container e recalcula ──────────────────────────
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const recalculate = () => {
      const availableH = container.clientHeight - VERTICAL_PADDING - ZOOM_BAR_H;
      const availableW = container.clientWidth - 32; // respiro lateral
      const scaleByH = availableH / PHONE_TOTAL_H;
      const scaleByW = availableW / (FRAME_W + 24);
      const newScale = Math.min(1, scaleByH, scaleByW);
      setAutoScale(newScale);
    };

    recalculate();
    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Controles de Zoom ──────────────────────────────────────────────────────
  const zoomIn = useCallback(() => {
    const base = zoomMode === "auto" ? autoScale : zoomMode;
    setZoomMode(Math.min(1, parseFloat((base + 0.05).toFixed(2))));
  }, [zoomMode, autoScale]);

  const zoomOut = useCallback(() => {
    const base = zoomMode === "auto" ? autoScale : zoomMode;
    setZoomMode(Math.max(0.3, parseFloat((base - 0.05).toFixed(2))));
  }, [zoomMode, autoScale]);

  const resetToAuto = useCallback(() => setZoomMode("auto"), []);

  // ── Canal de comunicação com o iframe ─────────────────────────────────────
  useEffect(() => {
    try {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = ch;
      ch.onmessage = (evt) => {
        const { type, payload } = evt.data ?? {};
        if (type === "SECTION_CLICK") onSectionClick?.(payload as string);
        else if (type === "TOGGLE_SECTION") onToggleSection?.(payload as string);
        else if (type === "DELETE_SECTION") onDeleteSection?.(payload as string);
      };
    } catch {
      // BroadcastChannel não disponível
    }
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    channelRef.current?.postMessage({ type: "THEME_UPDATE", payload: theme });
  }, [theme]);

  useEffect(() => {
    channelRef.current?.postMessage({
      type: "SELECT_SECTION",
      payload: highlightId ?? null,
    });
  }, [highlightId]);

  const scalePercent = Math.round(effectiveScale * 100);

  return (
    <main
      ref={containerRef}
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#111114]"
      style={{ minHeight: 0 }}
    >
      {/* ── Botão flutuante para reabrir o painel quando oculto ────────────── */}
      {!isSidebarOpen && (
        <button
          onClick={onOpenSidebar}
          title="Mostrar painel de edição"
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            color: "rgba(255,255,255,0.6)",
            fontSize: 11,
            fontWeight: 500,
            padding: "6px 10px",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            transition: "background 150ms",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.15)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.08)")
          }
        >
          <PanelLeftOpen style={{ width: 14, height: 14 }} />
          Painel
        </button>
      )}

      {/* ── Wrapper escalável ─────────────────────────────────────────────── */}
      <div
        style={{
          transform: `scale(${effectiveScale})`,
          transformOrigin: "center center",
          width: FRAME_W + 24,
          height: PHONE_TOTAL_H,
          flexShrink: 0,
          transition: "transform 240ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Moldura externa do celular */}
        <div className="relative select-none" style={{ width: FRAME_W + 24 }}>
          {/* Corpo do telefone */}
          <div
            className="relative overflow-hidden rounded-[3rem] bg-zinc-900"
            style={{
              width: FRAME_W + 24,
              height: PHONE_TOTAL_H,
              boxShadow:
                "0 0 0 2px #3a3a3c, 0 0 0 4px #1c1c1e, 0 40px 80px -20px rgba(0,0,0,0.8)",
            }}
          >
            {/* Botões laterais esquerdos */}
            <div className="absolute -left-[5px] rounded-l-sm bg-zinc-700" style={{ top: 100, width: 5, height: 32 }} />
            <div className="absolute -left-[5px] rounded-l-sm bg-zinc-700" style={{ top: 145, width: 5, height: 56 }} />
            <div className="absolute -left-[5px] rounded-l-sm bg-zinc-700" style={{ top: 215, width: 5, height: 56 }} />
            {/* Botão lateral direito */}
            <div className="absolute -right-[5px] rounded-r-sm bg-zinc-700" style={{ top: 155, width: 5, height: 80 }} />

            {/* Tela — borda interna preta */}
            <div className="absolute inset-[10px] overflow-hidden rounded-[2.4rem] bg-black">
              {/* Status bar */}
              <div className="relative z-10 flex h-12 items-start justify-between px-6 pt-3 bg-black">
                <span className="text-white text-[11px] font-semibold">9:41</span>
                {/* Dynamic Island */}
                <div
                  className="absolute left-1/2 top-2.5 -translate-x-1/2 rounded-full bg-black"
                  style={{ width: 120, height: 34, zIndex: 20, boxShadow: "0 0 0 2px #1a1a1a" }}
                />
                {/* Ícones de status */}
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 16 12" className="h-3 w-3.5 fill-white">
                    <rect x="0" y="3" width="3" height="9" rx="0.5" />
                    <rect x="4.5" y="2" width="3" height="10" rx="0.5" />
                    <rect x="9" y="0" width="3" height="12" rx="0.5" />
                    <rect x="13.5" y="0" width="2" height="12" rx="0.5" opacity="0.3" />
                  </svg>
                  <svg viewBox="0 0 16 12" className="h-3 w-3 fill-white">
                    <path d="M8 2 C5 2, 2.5 4, 2.5 6.5 C2.5 8 3.5 9.5 5 10 L8 12 L11 10 C12.5 9.5 13.5 8 13.5 6.5 C13.5 4 11 2 8 2Z" opacity="0.4"/>
                    <path d="M8 3.5 C6 3.5, 4.5 5, 4.5 6.5 C4.5 7.5 5 8.5 6.5 9 L8 10.5 L9.5 9 C11 8.5 11.5 7.5 11.5 6.5 C11.5 5 10 3.5 8 3.5Z" opacity="0.7"/>
                    <circle cx="8" cy="6.5" r="2"/>
                  </svg>
                  <div className="flex items-center gap-0.5">
                    <div className="h-2.5 w-6 rounded-sm border border-white/60 p-px">
                      <div className="h-full w-3/4 rounded-[1px] bg-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Conteúdo do iframe — dimensões REAIS do iPhone para media queries */}
              <iframe
                ref={iframeRef}
                src="/loja/preview-frame"
                title="Mobile Preview"
                style={{
                  width: FRAME_W,
                  height: FRAME_H - 48,
                  border: "none",
                  display: "block",
                  background: "white",
                }}
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Barra de controles de zoom ─────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: "4px 6px",
          backdropFilter: "blur(12px)",
          zIndex: 40,
        }}
      >
        {/* Botão − */}
        <button
          onClick={zoomOut}
          title="Diminuir zoom"
          style={zoomBtnStyle}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.15)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
        >
          <Minus style={{ width: 12, height: 12 }} />
        </button>

        {/* Indicador percentual — clica para voltar ao Auto */}
        <button
          onClick={resetToAuto}
          title="Ajustar à tela (Auto)"
          style={{
            ...zoomBtnStyle,
            minWidth: 56,
            fontFamily: "monospace",
            fontSize: 11,
            letterSpacing: "0.04em",
            color: zoomMode === "auto" ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.7)",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
        >
          {zoomMode === "auto" ? `Auto · ${scalePercent}%` : `${scalePercent}%`}
        </button>

        {/* Botão + */}
        <button
          onClick={zoomIn}
          title="Aumentar zoom"
          style={zoomBtnStyle}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.15)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
        >
          <Plus style={{ width: 12, height: 12 }} />
        </button>

        {/* Divisor */}
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)", margin: "0 2px" }} />

        {/* Botão Fit / 100% real */}
        <button
          onClick={() => {
            if (zoomMode === 1) resetToAuto();
            else setZoomMode(1);
          }}
          title={zoomMode === 1 ? "Voltar para Auto" : "100% — Tamanho real"}
          style={{
            ...zoomBtnStyle,
            color: zoomMode === 1 ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.5)",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
        >
          <Maximize2 style={{ width: 12, height: 12 }} />
        </button>
      </div>
    </main>
  );
}

// ── Estilo base dos botões da barra de zoom ───────────────────────────────────
const zoomBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  background: "transparent",
  border: "none",
  borderRadius: 7,
  color: "rgba(255,255,255,0.55)",
  padding: "5px 7px",
  cursor: "pointer",
  transition: "background 120ms, color 120ms",
};
