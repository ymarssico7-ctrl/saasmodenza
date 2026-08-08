import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ExternalLink,
  MoreHorizontal,
  Paintbrush,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { Button } from "@/components/ui/button";
import { loadTheme } from "@/lib/theme-engine/defaults";

export const Route = createFileRoute("/_authenticated/loja/configuracao")({
  head: () => ({
    meta: [
      { title: "Layout da loja — Modaly" },
      {
        name: "description",
        content: "Gerencie o layout e a aparência da sua vitrine online.",
      },
    ],
  }),
  component: LayoutPage,
});

function LayoutPage() {
  const activeTheme = loadTheme();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Loja online"
        title="Layout"
        description="Escolha e customize o layout da sua vitrine."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Left: Layouts ──────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Active Layout Card */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            {/* Mockup preview */}
            <div className="relative select-none overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 p-6">
              {/* Browser chrome mockup */}
              <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-stone-300/60 bg-white shadow-lift">
                {/* Browser bar */}
                <div className="flex h-8 items-center gap-2 border-b border-stone-200 bg-stone-50 px-3">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="mx-auto flex h-4 w-48 items-center rounded-full border border-stone-200 bg-white px-2">
                    <span className="truncate text-[9px] text-stone-400">minhaloja.modaly.com.br</span>
                  </div>
                </div>

                {/* Store preview */}
                <div className="relative overflow-hidden" style={{ backgroundColor: activeTheme.settings.colorBackground }}>
                  {/* Store header */}
                  <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: activeTheme.settings.colorBorder }}>
                    <span className="text-[11px] font-bold" style={{ color: activeTheme.settings.colorForeground, fontFamily: activeTheme.settings.fontDisplay }}>
                      {activeTheme.settings.storeName}
                    </span>
                    <div className="flex gap-3 text-[9px]" style={{ color: activeTheme.settings.colorForeground + "99" }}>
                      <span>Início</span>
                      <span>Produtos</span>
                      <span>Contato</span>
                    </div>
                  </div>

                  {/* Hero banner */}
                  <div
                    className="relative flex h-28 items-center justify-center text-center"
                    style={{ backgroundColor: activeTheme.settings.colorCanvas }}
                  >
                    <div>
                      <p className="text-[9px] font-medium uppercase tracking-widest mb-1" style={{ color: activeTheme.settings.colorPrimary + "bb" }}>
                        Coleção Nova
                      </p>
                      <p className="text-base font-bold leading-tight" style={{ color: activeTheme.settings.colorForeground, fontFamily: activeTheme.settings.fontDisplay }}>
                        O essencial,<br />refeito à mão
                      </p>
                      <div className="mt-2 inline-block rounded px-3 py-1 text-[9px] font-semibold text-white" style={{ backgroundColor: activeTheme.settings.colorPrimary }}>
                        Ver a coleção
                      </div>
                    </div>
                  </div>

                  {/* Product grid preview */}
                  <div className="grid grid-cols-3 gap-2 p-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="overflow-hidden rounded" style={{ backgroundColor: activeTheme.settings.colorCanvas }}>
                        <div className="h-10 w-full" style={{ backgroundColor: activeTheme.settings.colorBorder }} />
                        <div className="p-1">
                          <div className="h-1.5 w-10 rounded-full mb-1" style={{ backgroundColor: activeTheme.settings.colorForeground + "40" }} />
                          <div className="h-1.5 w-6 rounded-full" style={{ backgroundColor: activeTheme.settings.colorPrimary + "60" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold">Atelier Mod</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Layout atual
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="gradient-primary h-9 gap-1.5 rounded-xl px-4 text-sm font-semibold shadow-glow"
                  asChild
                >
                  <Link to="/loja/personalizar">
                    <Paintbrush className="h-3.5 w-3.5" />
                    Editar layout atual
                  </Link>
                </Button>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-5 text-center">
            <p className="text-sm font-semibold text-foreground">Mais layouts em breve</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Novos templates serão adicionados. Você será avisado assim que estiverem disponíveis.
            </p>
          </div>
        </div>

        {/* ── Right sidebar ──────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Logo upload */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-1 text-sm font-bold">Logotipo da sua marca</h3>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              Suba o logotipo e mostre a imagem da sua marca na sua loja.
            </p>

            {logoUrl ? (
              <div className="mb-3 flex items-center gap-3">
                <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-xl object-contain border border-border bg-secondary/40 p-1" />
                <div>
                  <p className="text-xs font-medium">Logo carregada</p>
                  <button
                    onClick={() => setLogoUrl(null)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ) : null}

            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoUrl(URL.createObjectURL(file));
                    toast.success("Logo carregada!");
                  }
                }}
              />
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40">
                <Upload className="h-4 w-4" />
                Subir logotipo
              </div>
            </label>
          </div>

          {/* Value proposition */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            {/* Decorative header */}
            <div className="h-24 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 flex items-end">
              <p className="text-xs font-semibold text-primary">Atelier Mod</p>
            </div>

            <div className="p-5">
              <h3 className="mb-1 text-sm font-bold leading-snug">
                Sua loja, única.<br />Como a sua marca.
              </h3>
              <ul className="mt-3 space-y-2">
                {[
                  "Crie sem depender de ninguém",
                  "Sua paleta, tipografia e identidade visual",
                  "Editor visual com pré-visualização em tempo real",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full gap-1.5 rounded-xl text-xs"
                asChild
              >
                <a href="/loja/preview" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver loja ao vivo
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
