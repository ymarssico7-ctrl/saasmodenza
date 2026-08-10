import { useBuilder } from "@/lib/theme-engine/context";
import { ensureFontLoaded } from "@/lib/theme-engine/defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploadField } from "./image-upload-field";
import { Switch } from "@/components/ui/switch";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { ThemeSettings, FontDisplay, FontBody, BorderRadius } from "@/lib/theme-engine/schema";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 flex-1 font-mono text-xs"
        />
      </div>
    </Field>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

const FONTS_DISPLAY: { value: FontDisplay; label: string }[] = [
  { value: "Playfair Display", label: "Playfair Display — Elegante" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond — Refinado" },
  { value: "DM Serif Display", label: "DM Serif Display — Moderno" },
  { value: "Libre Baskerville", label: "Libre Baskerville — Clássico" },
  { value: "Sora", label: "Sora — Sans-serif Moderno" },
  { value: "Outfit", label: "Outfit — Editorial" },
];

const FONTS_BODY: { value: FontBody; label: string }[] = [
  { value: "Manrope", label: "Manrope — Geométrico" },
  { value: "Inter", label: "Inter — Neutro" },
  { value: "DM Sans", label: "DM Sans — Friendly" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans — Premium" },
  { value: "Figtree", label: "Figtree — Moderno" },
];

const BORDER_RADIUS: { value: BorderRadius; label: string }[] = [
  { value: "none", label: "Reto (0px) — Editorial" },
  { value: "sm", label: "Leve (4px)" },
  { value: "md", label: "Médio (8px)" },
  { value: "lg", label: "Arredondado (16px)" },
  { value: "full", label: "Pílula (totalmente redondo)" },
];

// ── Color Presets ─────────────────────────────────────────────────────────────
type ColorPreset = Pick<
  ThemeSettings,
  "colorBackground" | "colorForeground" | "colorPrimary" | "colorCanvas" | "colorBorder"
>;

const COLOR_PRESETS: { name: string; swatch: string; preset: ColorPreset }[] = [
  {
    name: "Minimalista",
    swatch: "#1a1a1a",
    preset: {
      colorBackground: "#fafaf9",
      colorForeground: "#1a1a1a",
      colorPrimary: "#1a1a1a",
      colorCanvas: "#f0efec",
      colorBorder: "#e2e0db",
    },
  },
  {
    name: "Índigo Luxo",
    swatch: "#4338ca",
    preset: {
      colorBackground: "#f8f7ff",
      colorForeground: "#1e1b4b",
      colorPrimary: "#4338ca",
      colorCanvas: "#ede9fe",
      colorBorder: "#c4b5fd",
    },
  },
  {
    name: "Terroso",
    swatch: "#92400e",
    preset: {
      colorBackground: "#fdf8f3",
      colorForeground: "#292524",
      colorPrimary: "#92400e",
      colorCanvas: "#fef3c7",
      colorBorder: "#d6c5a8",
    },
  },
  {
    name: "Dark Chic",
    swatch: "#e879f9",
    preset: {
      colorBackground: "#0f0f0f",
      colorForeground: "#fafafa",
      colorPrimary: "#e879f9",
      colorCanvas: "#1a1a1a",
      colorBorder: "#2a2a2a",
    },
  },
  {
    name: "Rosa Blush",
    swatch: "#be185d",
    preset: {
      colorBackground: "#fff7f9",
      colorForeground: "#3b0764",
      colorPrimary: "#be185d",
      colorCanvas: "#fce7f3",
      colorBorder: "#f9a8d4",
    },
  },
];

export function GlobalSettings() {
  const { theme, dispatch } = useBuilder();
  const s = theme.settings;

  const patch = (p: Partial<ThemeSettings>) =>
    dispatch({ type: "UPDATE_SETTINGS", patch: p });

  const handleFontDisplayChange = (v: string) => {
    ensureFontLoaded(v);
    patch({ fontDisplay: v as FontDisplay });
  };

  const handleFontBodyChange = (v: string) => {
    ensureFontLoaded(v);
    patch({ fontBody: v as FontBody });
  };

  return (
    <div className="space-y-7">

      {/* ── Identidade ────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Identidade
        </p>
        <Field label="Nome da Loja">
          <Input value={s.storeName} onChange={(e) => patch({ storeName: e.target.value })} className="h-9" />
        </Field>
        <Field label="Tagline">
          <Input value={s.tagline} onChange={(e) => patch({ tagline: e.target.value })} className="h-9" />
        </Field>

        {/* Logo */}
        <ImageUploadField
          label="Logotipo"
          hint="📐 Recomendado: 400 × 150 px — Fundo transparente (PNG ou WebP). O logo é exibido no cabeçalho da loja."
          value={s.logoUrl ?? ""}
          onChange={(v) => patch(v ? { logoUrl: v } : { logoUrl: undefined } as Record<string, unknown> as Partial<typeof s>)}
          maxWidth={800}
          maxHeight={300}
          previewHeight={64}
        />

        <div className="space-y-2 rounded-xl border border-border p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Faixa de Frete
            </Label>
            <Switch
              checked={s.freeShippingBannerEnabled}
              onCheckedChange={(v) => patch({ freeShippingBannerEnabled: v })}
            />
          </div>
          {s.freeShippingBannerEnabled && (
            <Input
              value={s.freeShippingBanner}
              onChange={(e) => patch({ freeShippingBanner: e.target.value })}
              className="mt-2 h-9 text-sm"
            />
          )}
        </div>
      </div>

      {/* ── Paletas de Cores Predefinidas ─────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Paleta de Cores
        </p>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((cp) => (
            <button
              key={cp.name}
              type="button"
              title={cp.name}
              onClick={() => patch(cp.preset)}
              className="group flex flex-col items-center gap-1 rounded-xl p-1 transition-all hover:bg-secondary/60"
            >
              <div
                className="h-7 w-7 rounded-lg border-2 border-border shadow-sm transition-transform group-hover:scale-110"
                style={{ background: cp.swatch }}
              />
              <span className="text-[9px] text-muted-foreground">{cp.name}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <ColorField label="Fundo Principal" value={s.colorBackground} onChange={(v) => patch({ colorBackground: v })} />
          <ColorField label="Texto / Primeiro Plano" value={s.colorForeground} onChange={(v) => patch({ colorForeground: v })} />
          <ColorField label="Cor de Destaque" value={s.colorPrimary} onChange={(v) => patch({ colorPrimary: v })} />
          <ColorField label="Fundo Canvas (Secundário)" value={s.colorCanvas} onChange={(v) => patch({ colorCanvas: v })} />
          <ColorField label="Bordas" value={s.colorBorder} onChange={(v) => patch({ colorBorder: v })} />
        </div>
      </div>

      {/* ── Tipografia ────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Tipografia
        </p>
        <SelectField
          label="Fonte de Títulos"
          value={s.fontDisplay}
          onChange={handleFontDisplayChange}
          options={FONTS_DISPLAY}
        />
        {/* Live font preview */}
        <div
          className="rounded-xl border border-border bg-secondary/30 px-3 py-2 text-base leading-snug text-foreground"
          style={{ fontFamily: `"${s.fontDisplay}", serif` }}
        >
          Aa — A moda começa aqui.
        </div>

        <SelectField
          label="Fonte de Texto"
          value={s.fontBody}
          onChange={handleFontBodyChange}
          options={FONTS_BODY}
        />
        {/* Live font preview */}
        <div
          className="rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm leading-relaxed text-muted-foreground"
          style={{ fontFamily: `"${s.fontBody}", sans-serif` }}
        >
          Peças únicas, qualidade atemporal e entrega rápida para todo o Brasil.
        </div>
      </div>

      {/* ── Formato dos Botões ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Formato dos Botões
        </p>
        <SelectField
          label="Arredondamento"
          value={s.borderRadius}
          onChange={(v) => patch({ borderRadius: v as BorderRadius })}
          options={BORDER_RADIUS}
        />
        {/* Visual preview of radius */}
        <div className="flex gap-2">
          {BORDER_RADIUS.slice(0, 4).map((r) => (
            <div
              key={r.value}
              onClick={() => patch({ borderRadius: r.value })}
              title={r.label}
              className={`h-8 w-8 cursor-pointer border-2 transition-all ${
                s.borderRadius === r.value ? "border-primary scale-110" : "border-border"
              }`}
              style={{
                background: s.colorPrimary,
                borderRadius: { none: "0", sm: "4px", md: "8px", lg: "16px", full: "9999px" }[r.value],
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Redefinir Tema — Ação destrutiva no rodapé (com confirmação) ─────
          Localização intencional: dentro das configurações globais, não no
          header do editor. O usuário precisa navegar até aqui para acionar,
          evitando resets acidentais. Um clique pede confirmação. */}
      <div className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-destructive/70">
          Zona de Risco
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          Redefinir o tema restaura todas as configurações para o padrão original.
          Esta ação não pode ser desfeita.
        </p>
        <button
          onClick={() => {
            const confirmed = window.confirm(
              "Tem certeza que deseja redefinir o tema?\nTodas as personalizações serão perdidas."
            );
            if (confirmed) {
              dispatch({ type: "RESET" });
              toast.info("Tema redefinido para o padrão.");
            }
          }}
          className="flex items-center gap-1.5 rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Redefinir Tema
        </button>
      </div>

      {/* ── Checkout & Contato ─────────────────────────────────────────────── */}
      <div className="border-t border-border pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Checkout &amp; Contato
        </p>

        {/* Checkout Mode */}
        <div className="space-y-1.5 mb-4">
          <label className="text-xs font-medium text-muted-foreground">Modo de Checkout</label>
          <div
            className="flex shrink-0 items-center gap-0.5 rounded-xl p-[3px] w-full"
            style={{ background: "var(--color-muted)" }}
          >
            <button
              type="button"
              onClick={() => dispatch({ type: "UPDATE_SETTINGS", patch: { checkoutMode: "whatsapp" } })}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                (s.checkoutMode ?? "whatsapp") === "whatsapp"
                  ? "bg-background text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              📱 WhatsApp
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "UPDATE_SETTINGS", patch: { checkoutMode: "site" } })}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                s.checkoutMode === "site"
                  ? "bg-background text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              💳 Checkout no site
            </button>
          </div>
        </div>

        {/* WhatsApp number — only shown in whatsapp mode */}
        {(s.checkoutMode ?? "whatsapp") === "whatsapp" && (
          <div className="space-y-1.5 mb-4">
            <label className="text-xs font-medium text-muted-foreground">Número do WhatsApp</label>
            <input
              type="tel"
              value={s.storeWhatsApp ?? ""}
              onChange={(e) => dispatch({ type: "UPDATE_SETTINGS", patch: { storeWhatsApp: e.target.value } })}
              placeholder="(31) 99812-4477"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        {/* Store Description */}
        <div className="space-y-1.5 mb-4">
          <label className="text-xs font-medium text-muted-foreground">Descrição da loja (rodapé)</label>
          <textarea
            value={s.storeDescription ?? ""}
            onChange={(e) => dispatch({ type: "UPDATE_SETTINGS", patch: { storeDescription: e.target.value } })}
            placeholder="Peças atemporais feitas em pequenos lotes…"
            rows={2}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Política de Troca */}
        <div className="space-y-1.5 mb-4">
          <label className="text-xs font-medium text-muted-foreground">Política de troca</label>
          <textarea
            value={s.politicaTroca ?? ""}
            onChange={(e) => dispatch({ type: "UPDATE_SETTINGS", patch: { politicaTroca: e.target.value } })}
            placeholder="Trocas em até 7 dias…"
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Mostrar estoque */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3">
          <div>
            <p className="text-xs font-semibold">Mostrar estoque disponível</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Exibe quantidade disponível nos cards de produto.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={s.mostrarEstoque ?? false}
            onClick={() => dispatch({ type: "UPDATE_SETTINGS", patch: { mostrarEstoque: !(s.mostrarEstoque ?? false) } })}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              s.mostrarEstoque ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                s.mostrarEstoque ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
