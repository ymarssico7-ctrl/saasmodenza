import { useBuilder } from "@/lib/theme-engine/context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type {
  HeroSettings,
  ProductGridSettings,
  ImageTextSplitSettings,
  FeaturesSettings,
  Section,
  AnnouncementSettings,
} from "@/lib/theme-engine/schema";

// ── Field helpers ─────────────────────────────────────────────────────────────
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

function TextareaField({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <Field label={label}>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring resize-none"
      />
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

// ── Hero Inspector ─────────────────────────────────────────────────────────────
function HeroInspector({
  settings,
  patch,
}: {
  settings: HeroSettings;
  patch: (p: Partial<HeroSettings>) => void;
}) {
  return (
    <div className="space-y-4">
      <TextareaField
        label="Título"
        value={settings.heading}
        onChange={(v) => patch({ heading: v })}
      />
      <Field label="Subtítulo">
        <Input
          value={settings.subheading}
          onChange={(e) => patch({ subheading: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Texto do Botão">
        <Input
          value={settings.buttonText}
          onChange={(e) => patch({ buttonText: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="URL da Imagem">
        <Input
          value={settings.imageUrl}
          onChange={(e) => patch({ imageUrl: e.target.value })}
          className="h-9 text-xs"
          placeholder="https://..."
        />
      </Field>
      {settings.imageUrl && (
        <div className="overflow-hidden rounded-xl border border-border">
          <img src={settings.imageUrl} alt="" className="h-28 w-full object-cover" />
        </div>
      )}
      <Field label={`Opacidade do Overlay — ${settings.overlayOpacity}%`}>
        <Slider
          min={0}
          max={90}
          step={5}
          value={[settings.overlayOpacity]}
          onValueChange={([v]) => patch({ overlayOpacity: v })}
        />
      </Field>
    </div>
  );
}

// ── ProductGrid Inspector ─────────────────────────────────────────────────────
function ProductGridInspector({
  settings,
  patch,
}: {
  settings: ProductGridSettings;
  patch: (p: Partial<ProductGridSettings>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Kicker (texto pequeno)">
        <Input
          value={settings.kicker}
          onChange={(e) => patch({ kicker: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Título da Seção">
        <Input
          value={settings.title}
          onChange={(e) => patch({ title: e.target.value })}
          className="h-9"
        />
      </Field>
      <SelectField
        label="Origem dos Produtos"
        value={settings.source}
        onChange={(v) => patch({ source: v as ProductGridSettings["source"] })}
        options={[
          { value: "newest", label: "Mais recentes" },
          { value: "featured", label: "Em destaque" },
          { value: "all", label: "Todos" },
        ]}
      />
      <SelectField
        label="Quantidade"
        value={String(settings.count)}
        onChange={(v) => patch({ count: Number(v) })}
        options={[4, 6, 8, 12].map((n) => ({ value: String(n), label: `${n} produtos` }))}
      />
      <SelectField
        label="Colunas"
        value={String(settings.columns)}
        onChange={(v) => patch({ columns: Number(v) as ProductGridSettings["columns"] })}
        options={[
          { value: "2", label: "2 colunas" },
          { value: "3", label: "3 colunas" },
          { value: "4", label: "4 colunas" },
          { value: "6", label: "6 colunas" },
        ]}
      />
    </div>
  );
}

// ── ImageTextSplit Inspector ───────────────────────────────────────────────────
function ImageTextSplitInspector({
  settings,
  patch,
}: {
  settings: ImageTextSplitSettings;
  patch: (p: Partial<ImageTextSplitSettings>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Kicker">
        <Input value={settings.kicker} onChange={(e) => patch({ kicker: e.target.value })} className="h-9" />
      </Field>
      <Field label="Título">
        <Input value={settings.heading} onChange={(e) => patch({ heading: e.target.value })} className="h-9" />
      </Field>
      <TextareaField label="Texto" value={settings.body} onChange={(v) => patch({ body: v })} rows={3} />
      <Field label="Texto do Botão">
        <Input value={settings.buttonText} onChange={(e) => patch({ buttonText: e.target.value })} className="h-9" />
      </Field>
      <Field label="URL da Imagem">
        <Input
          value={settings.imageUrl}
          onChange={(e) => patch({ imageUrl: e.target.value })}
          className="h-9 text-xs"
          placeholder="https://..."
        />
      </Field>
      {settings.imageUrl && (
        <div className="overflow-hidden rounded-xl border border-border">
          <img src={settings.imageUrl} alt="" className="h-24 w-full object-cover" />
        </div>
      )}
      <SelectField
        label="Posição da Imagem"
        value={settings.imagePosition}
        onChange={(v) => patch({ imagePosition: v as ImageTextSplitSettings["imagePosition"] })}
        options={[
          { value: "left", label: "Esquerda" },
          { value: "right", label: "Direita" },
        ]}
      />
      <SelectField
        label="Cor de Fundo"
        value={settings.backgroundColor}
        onChange={(v) => patch({ backgroundColor: v as ImageTextSplitSettings["backgroundColor"] })}
        options={[
          { value: "background", label: "Fundo principal" },
          { value: "canvas", label: "Fundo canvas (mais quente)" },
          { value: "foreground", label: "Escuro (invertido)" },
        ]}
      />
    </div>
  );
}

// ── Features Inspector ────────────────────────────────────────────────────────
function FeaturesInspector({
  settings,
  patch,
}: {
  settings: FeaturesSettings;
  patch: (p: Partial<FeaturesSettings>) => void;
}) {
  const update = (idx: number, field: "title" | "description", value: string) => {
    const items = settings.items.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item,
    );
    patch({ items });
  };

  return (
    <div className="space-y-5">
      {settings.items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Item {i + 1}
          </p>
          <Field label="Título">
            <Input value={item.title} onChange={(e) => update(i, "title", e.target.value)} className="h-9" />
          </Field>
          <TextareaField
            label="Descrição"
            value={item.description}
            onChange={(v) => update(i, "description", v)}
            rows={2}
          />
        </div>
      ))}
    </div>
  );
}

// ── Announcement Inspector ─────────────────────────────────────────────────────
function AnnouncementInspector({
  settings,
  patch,
}: {
  settings: AnnouncementSettings;
  patch: (p: Partial<AnnouncementSettings>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Texto do Anúncio">
        <Input value={settings.text} onChange={(e) => patch({ text: e.target.value })} className="h-9" />
      </Field>
      <ColorField label="Cor de Fundo" value={settings.backgroundColor} onChange={(v) => patch({ backgroundColor: v })} />
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function SectionInspector({ section }: { section: Section }) {
  const { dispatch } = useBuilder();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch = (p: any) =>
    dispatch({ type: "UPDATE_SECTION", id: section.id, patch: p });

  const inner = (() => {
    switch (section.type) {
      case "hero":
        return <HeroInspector settings={section.settings} patch={patch} />;
      case "product_grid":
        return <ProductGridInspector settings={section.settings} patch={patch} />;
      case "image_text_split":
        return <ImageTextSplitInspector settings={section.settings} patch={patch} />;
      case "features":
        return <FeaturesInspector settings={section.settings} patch={patch} />;
      case "announcement":
        return <AnnouncementInspector settings={section.settings} patch={patch} />;
      case "category_bar":
        return (
          <p className="text-sm text-muted-foreground">
            As categorias são geradas automaticamente a partir dos seus produtos cadastrados.
          </p>
        );
      default:
        return null;
    }
  })();

  return <div className="mt-1">{inner}</div>;
}
