import { useCallback } from "react";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Monitor,
  Paintbrush,
  PanelLeftOpen,
  Redo2,
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
          COLLAPSED SIDEBAR STRIP — visible when sidebar is closed
          A narrow 40px vertical strip with just the toggle icon.
          Part of the layout flow (not absolute) → never covers the preview.
          ════════════════════════════════════════════════════════════════════ */}
      {!isSidebarOpen && (
        <div
          className="flex shrink-0 flex-col items-center border-r border-border bg-card pt-3"
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
          FULL SIDEBAR — collapses to 0px via width transition
          ════════════════════════════════════════════════════════════════════ */}
      <aside
        className="flex shrink-0 flex-col border-r border-border bg-card overflow-hidden"
        style={{
          width: isSidebarOpen ? (isMobile ? "50%" : 320) : 0,
          transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          minHeight: 0,
        }}
      >
        {/* ── Cabeçalho — Linha 1: Voltar + Título + Publicar ─────────────────
            Layout: [← Voltar | Personalizar / Ateliê] [VerAoVivo] [Publicar]
            Mantém os elementos de navegação e publicação num só espaço limpo. */}
        <div className="shrink-0 border-b border-border bg-card" style={{ minWidth: isMobile ? 0 : 320 }}>

          {/* Linha 1 */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
            {/* Voltar */}
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0 rounded-xl">
              <Link to="/loja/configuracao">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

            {/* Título */}
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

            {/* Publicar */}
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

          {/* ── Linha 2: Undo/Redo | Alternador Desktop / Mobile ─────────────────
              Reorganização genial: histórico à esquerda, viewport à direita.
              Toda a lógica de troca de visualização vive aqui — canvas 100% livre. */}
          <div className="flex items-center gap-1 px-3 pb-2.5">
            {/* Undo */}
            <button
              onClick={() => dispatch({ type: "UNDO" })}
              disabled={!canUndo}
              title="Desfazer (Ctrl+Z)"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-30 hover:enabled:bg-secondary hover:enabled:text-foreground"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>

            {/* Redo */}
            <button
              onClick={() => dispatch({ type: "REDO" })}
              disabled={!canRedo}
              title="Refazer (Ctrl+Y)"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-30 hover:enabled:bg-secondary hover:enabled:text-foreground"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>

            {/* Divisor vertical */}
            <div className="mx-1.5 h-4 w-px shrink-0 bg-border" />

            {/* ── Segmented Switch: Desktop | Mobile ──────────────────────────── */}
            <div
              className="flex items-center gap-0.5 rounded-xl p-1"
              style={{ background: "var(--color-muted)", flex: 1 }}
            >
              {/* Desktop */}
              <button
                onClick={() => dispatch({ type: "SET_PREVIEW", mode: "desktop" })}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  !isMobile
                    ? "bg-background text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Monitor className="h-3 w-3" />
                Desktop
              </button>

              {/* Mobile */}
              <button
                onClick={() => dispatch({ type: "SET_PREVIEW", mode: "mobile" })}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  isMobile
                    ? "bg-background text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="h-3 w-3" />
                Mobile
              </button>
            </div>

            {/* Botão de colapsar sidebar */}
            <button
              onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
              title="Ocultar painel"
              className="ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {/* Icon: panel left close (represented by PanelLeftOpen rotated) */}
              <svg
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
                <polyline points="15 8 11 12 15 16"/>
              </svg>
            </button>
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
          CANVAS DE PREVIEW — 100% da altura disponível, zero barras fixas
          O seletor Desktop/Mobile foi movido para o Sidebar.
          Nenhum elemento sobreposto sobre o conteúdo da loja.
          ════════════════════════════════════════════════════════════════════ */}
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
