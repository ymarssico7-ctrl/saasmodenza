import { useBuilder } from "@/lib/theme-engine/context";
import { ensureFontLoaded } from "@/lib/theme-engine/defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

      {/* ── Template / Modelo de Loja ──────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Modelo de Loja
        </p>
        <div className="grid grid-cols-2 gap-2">
          {/* Template 01 */}
          <button
            type="button"
            onClick={() => patch({ templateId: "template-01" })}
            className={`group relative overflow-hidden rounded-xl border-2 p-0 transition-all ${
              (s.templateId ?? "template-02") === "template-01"
                ? "border-primary shadow-glow"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div className="flex h-20 flex-col bg-[#f9f7f4]">
              {/* Mini mockup template 01 */}
              <div className="flex h-3 items-center bg-[#1a1a1a] px-1.5 gap-1">
                <div className="h-1 w-8 rounded-full bg-white/40" />
              </div>
              <div className="flex-1 p-1.5 space-y-1">
                <div className="h-5 rounded bg-[#d4c9b8]" />
                <div className="h-1.5 w-2/3 rounded bg-[#c0b5a3]" />
                <div className="flex gap-1">
                  <div className="h-4 flex-1 rounded bg-[#e8e2d9]" />
                  <div className="h-4 flex-1 rounded bg-[#e8e2d9]" />
                </div>
              </div>
            </div>
            <div className="px-2 py-1.5 text-left">
              <p className="text-[11px] font-semibold leading-tight">Atelier Nove</p>
              <p className="text-[10px] text-muted-foreground">Editorial · Minimalista</p>
            </div>
            {(s.templateId ?? "template-02") === "template-01" && (
              <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                ✓
              </div>
            )}
          </button>

          {/* Template 02 */}
          <button
            type="button"
            onClick={() => patch({ templateId: "template-02" })}
            className={`group relative overflow-hidden rounded-xl border-2 p-0 transition-all ${
              (s.templateId ?? "template-02") === "template-02"
                ? "border-primary shadow-glow"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div className="flex h-20 flex-col bg-[#faf7f2]">
              {/* Mini mockup template 02 */}
              <div className="flex h-3 items-center justify-between bg-[#faf7f2] px-1.5 border-b border-[#e8e0d4]">
                <div className="h-1.5 w-6 rounded-full bg-[#3b2f1e]" />
                <div className="flex gap-0.5">
                  <div className="h-1 w-3 rounded bg-[#c5a882]" />
                  <div className="h-1 w-3 rounded bg-[#c5a882]" />
                </div>
              </div>
              <div className="flex-1 p-1.5 space-y-1">
                <div className="h-5 rounded bg-gradient-to-r from-[#c5a882] to-[#a0845c]" />
                <div className="flex gap-1">
                  <div className="h-3 flex-1 rounded bg-[#e8e0d4]" />
                  <div className="h-3 flex-1 rounded bg-[#e8e0d4]" />
                  <div className="h-3 flex-1 rounded bg-[#e8e0d4]" />
                </div>
              </div>
            </div>
            <div className="px-2 py-1.5 text-left">
              <p className="text-[11px] font-semibold leading-tight">Boutique Chic</p>
              <p className="text-[10px] text-muted-foreground">Quente · Elegante</p>
            </div>
            {(s.templateId ?? "template-02") === "template-02" && (
              <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                ✓
              </div>
            )}
          </button>
        </div>
      </div>

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
        <Field label="Logotipo (URL)">
          <Input
            value={s.logoUrl ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                patch({ logoUrl: val });
              } else {
                const { logoUrl: _removed, ...rest } = s;
                dispatch({ type: "UPDATE_SETTINGS", patch: rest });
              }
            }}
            placeholder="https://sua-loja.com/logo.png"
            className="h-9 text-sm"
          />
          {s.logoUrl && (
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-secondary p-2">
              <img
                src={s.logoUrl}
                alt="Preview do logotipo"
                className="h-8 max-w-[120px] object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="text-xs text-muted-foreground">Preview do logo</span>
            </div>
          )}
        </Field>

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
    </div>
  );
}
