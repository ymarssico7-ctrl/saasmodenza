import { useBuilder } from "@/lib/theme-engine/context";
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
  { value: "Playfair Display", label: "Playfair Display (Elegante)" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond (Refinado)" },
  { value: "DM Serif Display", label: "DM Serif Display (Moderno)" },
  { value: "Libre Baskerville", label: "Libre Baskerville (Clássico)" },
  { value: "Sora", label: "Sora (Sans-serif Moderno)" },
];

const FONTS_BODY: { value: FontBody; label: string }[] = [
  { value: "Manrope", label: "Manrope (Geométrico)" },
  { value: "Inter", label: "Inter (Neutro)" },
  { value: "DM Sans", label: "DM Sans (Friendly)" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans (Premium)" },
];

const BORDER_RADIUS: { value: BorderRadius; label: string }[] = [
  { value: "none", label: "Reto (0px) — Editorial" },
  { value: "sm", label: "Leve (4px)" },
  { value: "md", label: "Médio (8px)" },
  { value: "lg", label: "Arredondado (16px)" },
  { value: "full", label: "Pílula (totalmente redondo)" },
];

export function GlobalSettings() {
  const { theme, dispatch } = useBuilder();
  const s = theme.settings;

  const patch = (p: Partial<ThemeSettings>) =>
    dispatch({ type: "UPDATE_SETTINGS", patch: p });

  return (
    <div className="space-y-6">
      {/* Identity */}
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

      {/* Colors */}
      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Cores
        </p>
        <ColorField label="Fundo Principal" value={s.colorBackground} onChange={(v) => patch({ colorBackground: v })} />
        <ColorField label="Texto / Primeiro Plano" value={s.colorForeground} onChange={(v) => patch({ colorForeground: v })} />
        <ColorField label="Cor de Destaque" value={s.colorPrimary} onChange={(v) => patch({ colorPrimary: v })} />
        <ColorField label="Fundo Canvas (Secundário)" value={s.colorCanvas} onChange={(v) => patch({ colorCanvas: v })} />
        <ColorField label="Bordas" value={s.colorBorder} onChange={(v) => patch({ colorBorder: v })} />
      </div>

      {/* Typography */}
      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Tipografia
        </p>
        <SelectField
          label="Fonte de Títulos"
          value={s.fontDisplay}
          onChange={(v) => patch({ fontDisplay: v as FontDisplay })}
          options={FONTS_DISPLAY}
        />
        <SelectField
          label="Fonte de Texto"
          value={s.fontBody}
          onChange={(v) => patch({ fontBody: v as FontBody })}
          options={FONTS_BODY}
        />
      </div>

      {/* Shape */}
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
                s.borderRadius === r.value ? "border-primary" : "border-border"
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
