import { useCallback, useState } from "react";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Maximize2,
  Minus,
  Monitor,
  Paintbrush,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
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

// ── Inner builder ─────────────────────────────────────────────────────────────
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

  // ── Zoom state (lifted from MobilePreviewFrame) ───────────────────────────
  // "auto" = ajusta automaticamente ao espaço disponível
  // number  = escala manual entre 0.3 e 1.0
  const [zoomMode, setZoomMode] = useState<"auto" | number>("auto");
  const [autoScale, setAutoScale] = useState(1);

  const effectiveScale = zoomMode === "auto" ? autoScale : zoomMode;
  const scalePercent = Math.round(effectiveScale * 100);

  const zoomIn = useCallback(() => {
    const base = zoomMode === "auto" ? autoScale : (zoomMode as number);
    setZoomMode(Math.min(1, parseFloat((base + 0.05).toFixed(2))));
  }, [zoomMode, autoScale]);

  const zoomOut = useCallback(() => {
    const base = zoomMode === "auto" ? autoScale : (zoomMode as number);
    setZoomMode(Math.max(0.3, parseFloat((base - 0.05).toFixed(2))));
  }, [zoomMode, autoScale]);

  const resetZoom = useCallback(() => setZoomMode("auto"), []);

  const handleSave = useCallback(() => {
    saveTheme(theme);
    dispatch({ type: "SAVE" });
    toast.success("Loja salva!", {
      description: "As alterações foram salvas com sucesso.",
    });
  }, [theme, dispatch]);

  const isMobile = previewMode === "mobile";

  return (
    <div className="fixed inset-0 z-[9999] flex overflow-hidden bg-background">

      {/* ════════════════════════════════════════════════════════════════════
          COLLAPSED STRIP — strip de 40px quando o sidebar está fechado
          Faz parte do layout (não absolute) → nunca sobrepõe o preview.
          ════════════════════════════════════════════════════════════════════ */}
      {!isSidebarOpen && (
        <div
          className="flex shrink-0 flex-col items-center border-r border-border bg-card pt-3 gap-2"
          style={{ width: 40 }}
        >
          <button
            onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
            title="Mostrar painel de edição"
            className="grid h-8 w-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          FULL SIDEBAR — colapsa para 0 via CSS width transition
          Mobile: 50% | Desktop: 320px | Fechado: 0px
          ════════════════════════════════════════════════════════════════════ */}
      <aside
        className="flex shrink-0 flex-col border-r border-border bg-card overflow-hidden"
        style={{
          width: isSidebarOpen ? (isMobile ? "50%" : 320) : 0,
          transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          minHeight: 0,
        }}
      >
        <div className="shrink-0 border-b border-border bg-card" style={{ minWidth: isMobile ? 0 : 320 }}>

          {/* ── Linha 1: Voltar + Título + Ver ao vivo (ícone) + Publicar ─────── */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0 rounded-xl">
              <Link to="/loja/configuracao">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">Personalizar Loja</p>
              <p className="truncate text-[11px] text-muted-foreground leading-tight">
                {theme.settings.storeName}
              </p>
            </div>

            {/* Ver ao vivo — ícone compacto */}
            <a
              href="/loja/preview"
              target="_blank"
              rel="noopener noreferrer"
              title="Ver ao vivo"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>

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

          {/* ════ Linha 2: Premium Modular Toolbar ══════════════════════════════════
              Layout: [Grupo A: Histórico] | [Grupo B: Viewport] | [Grupo C: Zoom*] ··· [Grupo D: Ações]
              * Grupo C só aparece no modo Mobile.
              Switch de viewport = ícone apenas (68px) → sem texto que encavala.
              ════════════════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-1.5 px-3 pb-3">

            {/* ── Grupo A: Histórico ───────────────────────────────────────────── */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => dispatch({ type: "UNDO" })}
                disabled={!canUndo}
                title="Desfazer (Ctrl+Z)"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-25 hover:enabled:bg-muted hover:enabled:text-foreground"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => dispatch({ type: "REDO" })}
                disabled={!canRedo}
                title="Refazer (Ctrl+Y)"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-25 hover:enabled:bg-muted hover:enabled:text-foreground"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Divisor A|B */}
            <div className="h-4 w-px shrink-0 bg-border" />

            {/* ── Grupo B: Viewport Switch (ícone apenas, 68px) ────────────────── */}
            <div
              className="flex shrink-0 items-center gap-0.5 rounded-xl p-[3px]"
              style={{ background: "var(--color-muted)", width: 68 }}
            >
              {/* Desktop */}
              <button
                onClick={() => dispatch({ type: "SET_PREVIEW", mode: "desktop" })}
                title="Visualização Desktop"
                className={`grid h-[22px] w-[28px] flex-1 place-items-center rounded-lg transition-all duration-150 ${
                  !isMobile
                    ? "bg-background text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              {/* Mobile */}
              <button
                onClick={() => dispatch({ type: "SET_PREVIEW", mode: "mobile" })}
                title="Visualização Mobile"
                className={`grid h-[22px] w-[28px] flex-1 place-items-center rounded-lg transition-all duration-150 ${
                  isMobile
                    ? "bg-background text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* ── Grupo C: Zoom (só aparece no modo Mobile) ────────────────────── */}
            {isMobile && (
              <>
                {/* Divisor B|C */}
                <div className="h-4 w-px shrink-0 bg-border" />

                <div className="flex items-center gap-0.5">
                  {/* Diminuir */}
                  <button
                    onClick={zoomOut}
                    title="Diminuir zoom"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
                  >
                    <Minus className="h-3 w-3" />
                  </button>

                  {/* Indicador — clica para Auto */}
                  <button
                    onClick={resetZoom}
                    title={zoomMode === "auto" ? "Auto-fit ativo" : "Voltar para Auto-fit"}
                    className="h-7 shrink-0 rounded-lg px-1.5 font-mono text-[10px] font-semibold transition-all duration-150 hover:bg-muted"
                    style={{
                      minWidth: 40,
                      color: zoomMode === "auto"
                        ? "var(--color-primary)"
                        : "var(--color-muted-foreground)",
                    }}
                  >
                    {zoomMode === "auto" ? `A ${scalePercent}%` : `${scalePercent}%`}
                  </button>

                  {/* Aumentar */}
                  <button
                    onClick={zoomIn}
                    title="Aumentar zoom"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                  </button>

                  {/* 100% real */}
                  <button
                    onClick={() => zoomMode === 1 ? resetZoom() : setZoomMode(1)}
                    title={zoomMode === 1 ? "Voltar para Auto" : "Tamanho real (100%)"}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-all duration-150 hover:bg-muted"
                    style={{
                      color: zoomMode === 1
                        ? "var(--color-primary)"
                        : "var(--color-muted-foreground)",
                    }}
                  >
                    <Maximize2 className="h-3 w-3" />
                  </button>
                </div>
              </>
            )}

            {/* Espaçador — empurra Grupo D para a extrema direita */}
            <div className="flex-1" />

            {/* ── Grupo D: Ações Globais ────────────────────────────────────────── */}
            <div className="flex items-center gap-0.5">
              {/* Redefinir — hover vermelho sutil, com confirmação */}
              <button
                onClick={() => {
                  const ok = window.confirm(
                    "Tem certeza que deseja redefinir o tema?\nTodas as personalizações serão perdidas."
                  );
                  if (ok) {
                    dispatch({ type: "RESET" });
                    toast.info("Tema redefinido para o padrão.");
                  }
                }}
                title="Redefinir tema"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-destructive/10 hover:text-destructive"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              {/* Ocultar painel */}
              <button
                onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
                title="Ocultar painel"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabs: Seções | Estilo Global ──────────────────────────────────── */}
        <div className="flex shrink-0 border-b border-border" style={{ minWidth: isMobile ? 0 : 320 }}>
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
          CANVAS DE PREVIEW — 100% altura livre, zero barras sobrepostas
          ════════════════════════════════════════════════════════════════════ */}
      {isMobile ? (
        <MobilePreviewFrame
          theme={theme}
          highlightId={selectedSection?.id ?? null}
          isSidebarOpen={isSidebarOpen}
          zoomMode={zoomMode}
          autoScale={autoScale}
          onAutoScaleChange={setAutoScale}
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
  );
}

// ── Public Export ─────────────────────────────────────────────────────────────
export function ThemeBuilder() {
  return (
    <BuilderProvider>
      <BuilderInner />
    </BuilderProvider>
  );
}
