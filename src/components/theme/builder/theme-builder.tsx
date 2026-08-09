import { useCallback } from "react";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Monitor,
  Paintbrush,
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
    <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-background">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-xl">
          <Link to="/loja/configuracao">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            Personalizar Loja
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            {theme.settings.storeName}
          </p>
        </div>

        {/* Preview mode toggle — centered */}
        <div className="mx-auto flex items-center gap-1 rounded-xl border border-border bg-secondary/40 p-1">
          <button
            onClick={() => dispatch({ type: "SET_PREVIEW", mode: "desktop" })}
            className={`flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all ${
              !isMobile
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            Desktop
          </button>
          <button
            onClick={() => dispatch({ type: "SET_PREVIEW", mode: "mobile" })}
            className={`flex h-7 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all ${
              isMobile
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Mobile
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* ── Undo / Redo ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-0.5 rounded-xl border border-border bg-secondary/40 p-1">
            <button
              onClick={() => dispatch({ type: "UNDO" })}
              disabled={!canUndo}
              title="Desfazer (Ctrl+Z)"
              className="grid h-7 w-7 place-items-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:enabled:bg-background hover:enabled:text-foreground hover:enabled:shadow-sm"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => dispatch({ type: "REDO" })}
              disabled={!canRedo}
              title="Refazer (Ctrl+Y)"
              className="grid h-7 w-7 place-items-center rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:enabled:bg-background hover:enabled:text-foreground hover:enabled:shadow-sm"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* "Ver ao vivo" — opens preview in new tab */}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 gap-1.5 rounded-xl text-xs"
          >
            <a href="/loja/preview" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
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
            className="h-9 gap-1.5 rounded-xl text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Redefinir
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty}
            className="h-9 gap-1.5 rounded-xl px-4 font-semibold shadow-glow"
          >
            <Check className="h-3.5 w-3.5" />
            {isDirty ? "Publicar" : "Publicado"}
          </Button>
        </div>
      </header>

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="flex w-80 shrink-0 flex-col border-r border-border bg-card">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => dispatch({ type: "SET_TAB", tab: "sections" })}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "sections"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Seções
            </button>
            <button
              onClick={() => dispatch({ type: "SET_TAB", tab: "global" })}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "global"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Paintbrush className="h-3.5 w-3.5" />
              Estilo Global
            </button>
          </div>

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

        {/* ── Preview Area ─────────────────────────────────────────────── */}
        {isMobile ? (
          /* MOBILE: centralised "phone" frame */
          <main className="flex flex-1 flex-col items-center justify-start overflow-auto bg-[#1c1c1e] py-8">
            <div
              className="relative overflow-hidden rounded-[2.5rem] shadow-2xl ring-4 ring-white/10 transition-all duration-300"
              style={{ width: 390, minHeight: 700 }}
            >
              {/* Phone status bar decoration */}
              <div className="absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-center bg-black">
                <div className="h-3.5 w-24 rounded-full bg-zinc-800" />
              </div>
              <div className="mt-8 overflow-y-auto bg-white" style={{ minHeight: 660 }}>
                <ThemeRenderer
                  theme={theme}
                  highlightId={selectedSection?.id ?? null}
                  onSectionClick={(id) =>
                    dispatch({ type: "SELECT_SECTION", id })
                  }
                  onToggleSection={(id) =>
                    dispatch({ type: "TOGGLE_VISIBLE", id })
                  }
                  onDeleteSection={(id) =>
                    dispatch({ type: "DELETE_SECTION", id })
                  }
                />
              </div>
            </div>
          </main>
        ) : (
          /* DESKTOP: full-bleed, no padding, true edge-to-edge */
          <main className="relative flex-1 overflow-auto bg-white">
            <ThemeRenderer
              theme={theme}
              highlightId={selectedSection?.id ?? null}
              onSectionClick={(id) =>
                dispatch({ type: "SELECT_SECTION", id })
              }
              onToggleSection={(id) =>
                dispatch({ type: "TOGGLE_VISIBLE", id })
              }
              onDeleteSection={(id) =>
                dispatch({ type: "DELETE_SECTION", id })
              }
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
