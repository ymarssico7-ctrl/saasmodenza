import { useCallback } from "react";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Monitor,
  Paintbrush,
  PanelLeftClose,
  PanelLeftOpen,
  Redo2,
  RotateCcw,
  Smartphone,
  Undo2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BuilderProvider, useBuilder } from "@/lib/theme-engine/context";
import { saveTheme } from "@/lib/theme-engine/defaults";
import { ThemeRenderer } from "@/components/theme/theme-renderer";
import { MobilePreviewFrame } from "./mobile-preview-frame";
import { SectionList } from "./section-list";
import { SectionInspector } from "./section-inspector";
import { GlobalSettings } from "./global-settings";

// ── Inner builder (needs access to context) ───────────────────────────────────
function BuilderInner() {
  const {
    theme,
    selectedSection,
    activeTab,
    previewMode,
    isDirty,
    canUndo,
    canRedo,
    isSidebarOpen,
    dispatch,
  } = useBuilder();

  const handleSave = useCallback(() => {
    saveTheme(theme);
    dispatch({ type: "SAVE" });
    toast.success("Loja salva!", {
      description: "As alterações foram salvas com sucesso.",
    });
  }, [theme, dispatch]);

  const isMobile = previewMode === "mobile";

  // Cores adaptadas ao modo (dark para Mobile, light para Desktop)
  const pillBg = isMobile ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const pillBorder = isMobile ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.10)";
  const dividerColor = isMobile ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const iconColor = isMobile ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";

  return (
    // Layout raiz: full-screen, sem header, layout horizontal
    <div className="fixed inset-0 z-[9999] flex overflow-hidden bg-background">

      {/* ════════════════════════════════════════════════════════════════════
          LEFT SIDEBAR — colapsa via CSS width transition
          Mobile mode: 50% | Desktop mode: 320px | Fechado: 0px
          ════════════════════════════════════════════════════════════════════ */}
      <aside
        className="flex shrink-0 flex-col border-r border-border bg-card overflow-hidden"
        style={{
          width: !isSidebarOpen ? 0 : isMobile ? "50%" : 320,
          transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          minHeight: 0,
        }}
      >
        {/* ── Cabeçalho do Sidebar ─────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-border bg-card">
          {/* Linha 1: Voltar + Info da loja + Publicar */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-xl shrink-0">
              <Link to="/loja/configuracao">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                Personalizar Loja
              </p>
              <p className="truncate text-[11px] text-muted-foreground leading-tight">
                {theme.settings.storeName}
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty}
              className="h-8 shrink-0 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-glow"
            >
              <Check className="h-3.5 w-3.5" />
              {isDirty ? "Publicar" : "Publicado"}
            </Button>
          </div>

          {/* Linha 2: Undo / Redo / Ver ao vivo / Redefinir */}
          <div className="flex items-center gap-1 px-3 pb-2.5">
            <button
              onClick={() => dispatch({ type: "UNDO" })}
              disabled={!canUndo}
              title="Desfazer (Ctrl+Z)"
              className="grid h-7 w-7 place-items-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:enabled:bg-secondary hover:enabled:text-foreground"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => dispatch({ type: "REDO" })}
              disabled={!canRedo}
              title="Refazer (Ctrl+Y)"
              className="grid h-7 w-7 place-items-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:enabled:bg-secondary hover:enabled:text-foreground"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>

            <div className="mx-1 h-4 w-px bg-border shrink-0" />

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <a href="/loja/preview" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                Ver ao vivo
              </a>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                dispatch({ type: "RESET" });
                toast.info("Tema redefinido para o padrão.");
              }}
              className="h-7 gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Redefinir
            </Button>
          </div>
        </div>

        {/* ── Tabs (Seções | Estilo Global) ─────────────────────────────────── */}
        <div className="flex shrink-0 border-b border-border">
          <button
            onClick={() => dispatch({ type: "SET_TAB", tab: "sections" })}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "sections"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Seções
          </button>
          <button
            onClick={() => dispatch({ type: "SET_TAB", tab: "global" })}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "global"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Paintbrush className="h-3.5 w-3.5" />
            Estilo Global
          </button>
        </div>

        {/* ── Conteúdo scrollável ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {activeTab === "sections" && (
            <div className="space-y-4">
              <SectionList />
              {selectedSection && (
                <div className="rounded-2xl border border-border bg-background p-3">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Editar Seção
                  </p>
                  <SectionInspector section={selectedSection} />
                </div>
              )}
            </div>
          )}
          {activeTab === "global" && <GlobalSettings />}
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          CANVAS DE PREVIEW
          Estrutura:
            1. Faixa Top-Offset de 44px → pill de controles (Desktop/Mobile/Toggle)
            2. Preview → ThemeRenderer (desktop) ou MobilePreviewFrame (mobile)
          A pill é PARTE DO FLUXO — nunca sobrep\u00f5e o conteúdo do site.
          ════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* ── Faixa de 44px com os controles de visualização ──────────────────
            Desktop: fundo branco (blend com o site) + controles em cinza escuro
            Mobile: fundo escuro (blend com o frame do phone) + controles brancos
            Transição suave ao trocar de modo. */}
        <div
          className="flex h-11 shrink-0 items-center justify-center"
          style={{
            background: isMobile ? "#111114" : "#ffffff",
            borderBottom: isMobile
              ? "1px solid rgba(255,255,255,0.06)"
              : "1px solid rgba(0,0,0,0.07)",
            transition: "background 300ms ease",
          }}
        >
          {/* Pill de controles */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              background: pillBg,
              border: pillBorder,
              borderRadius: 14,
              padding: 4,
            }}
          >
            {/* Toggle Sidebar */}
            <button
              onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
              title={isSidebarOpen ? "Ocultar painel" : "Mostrar painel"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 28,
                borderRadius: 9,
                background: "transparent",
                border: "none",
                color: iconColor,
                cursor: "pointer",
                transition: "background 150ms, color 150ms",
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = isMobile ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
                b.style.color = isMobile ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = "transparent";
                b.style.color = iconColor;
              }}
            >
              {isSidebarOpen
                ? <PanelLeftClose style={{ width: 14, height: 14 }} />
                : <PanelLeftOpen style={{ width: 14, height: 14 }} />
              }
            </button>

            {/* Divisor */}
            <div style={{ width: 1, height: 16, background: dividerColor, margin: "0 2px" }} />

            {/* Desktop */}
            <button
              onClick={() => dispatch({ type: "SET_PREVIEW", mode: "desktop" })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                height: 28,
                padding: "0 10px",
                borderRadius: 9,
                border: "none",
                background: !isMobile
                  ? (isMobile ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.09)")
                  : "transparent",
                color: !isMobile
                  ? (isMobile ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.80)")
                  : (isMobile ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)"),
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 150ms, color 150ms",
              }}
            >
              <Monitor style={{ width: 13, height: 13 }} />
              Desktop
            </button>

            {/* Mobile */}
            <button
              onClick={() => dispatch({ type: "SET_PREVIEW", mode: "mobile" })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                height: 28,
                padding: "0 10px",
                borderRadius: 9,
                border: "none",
                background: isMobile ? "rgba(255,255,255,0.18)" : "transparent",
                color: isMobile ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.35)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 150ms, color 150ms",
              }}
            >
              <Smartphone style={{ width: 13, height: 13 }} />
              Mobile
            </button>
          </div>
        </div>

        {/* ── Preview — começa estritamente ABAIXO da faixa de 44px ─────────── */}
        {isMobile ? (
          <MobilePreviewFrame
            theme={theme}
            highlightId={selectedSection?.id ?? null}
            isSidebarOpen={isSidebarOpen}
            onSectionClick={(id) => dispatch({ type: "SELECT_SECTION", id })}
            onToggleSection={(id) => dispatch({ type: "TOGGLE_VISIBLE", id })}
            onDeleteSection={(id) => dispatch({ type: "DELETE_SECTION", id })}
            onOpenSidebar={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
          />
        ) : (
          <main className="relative flex-1 overflow-auto bg-white">
            <ThemeRenderer
              theme={theme}
              highlightId={selectedSection?.id ?? null}
              onSectionClick={(id) => dispatch({ type: "SELECT_SECTION", id })}
              onToggleSection={(id) => dispatch({ type: "TOGGLE_VISIBLE", id })}
              onDeleteSection={(id) => dispatch({ type: "DELETE_SECTION", id })}
            />
          </main>
        )}
      </div>
    </div>
  );
}

// ── Public Export (wraps in Provider) ────────────────────────────────────────
export function ThemeBuilder() {
  return (
    <BuilderProvider>
      <BuilderInner />
    </BuilderProvider>
  );
}
