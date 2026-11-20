import { useBuilder } from "@/lib/theme-engine/context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2 } from "lucide-react";
import { ImageUploadField } from "./image-upload-field";
import type {
  HeroSettings,
  CategoryBarSettings,
  CategoryBarItem,
  ProductGridSettings,
  ImageTextSplitSettings,
  FeaturesSettings,
  Section,
  AnnouncementSettings,
  TestimonialsSettings,
  FaqSettings,
  PromotionalBannerSettings,
  InstagramFeedSettings,
  NewsletterSettings,
  CtaActionType,
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

// ── Campo Reutilizável de Destino e Ação do Botão ─────────────────────────────
function CtaActionFields({
  action,
  link,
  category,
  onChangeAction,
  onChangeLink,
  onChangeCategory,
}: {
  action?: CtaActionType | undefined;
  link?: string | undefined;
  category?: string | undefined;
  onChangeAction: (act: CtaActionType) => void;
  onChangeLink: (link: string) => void;
  onChangeCategory: (cat: string) => void;
}) {
  const currentAction = action || "vitrine";
  return (
    <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Ação do Botão (Destino ao Clicar)
      </Label>
      <select
        value={currentAction}
        onChange={(e) => onChangeAction(e.target.value as CtaActionType)}
        className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="vitrine">Rolar até a Vitrine / Catálogo (#vitrine)</option>
        <option value="categoria">Filtrar por Categoria Específica</option>
        <option value="whatsapp">Chamar no WhatsApp da Loja</option>
        <option value="link">Abrir Link Externo / Personalizado</option>
      </select>

      {currentAction === "categoria" && (
        <Field label="Nome da Categoria a Filtrar">
          <Input
            value={category || ""}
            onChange={(e) => onChangeCategory(e.target.value)}
            placeholder="Ex: Vestidos, Novidades, Linho..."
            className="h-9"
          />
        </Field>
      )}

      {currentAction === "link" && (
        <Field label="URL de Destino">
          <Input
            value={link || ""}
            onChange={(e) => onChangeLink(e.target.value)}
            placeholder="https://exemplo.com/pagina"
            className="h-9 font-mono text-xs"
          />
        </Field>
      )}

      {currentAction === "whatsapp" && (
        <p className="text-[11px] text-muted-foreground">
          Ao clicar, abre o WhatsApp da loja com mensagem contextual sobre a coleção.
        </p>
      )}
    </div>
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
        label="Título Principal"
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

      <CtaActionFields
        action={settings.buttonAction}
        link={settings.buttonLink}
        category={settings.buttonCategory}
        onChangeAction={(a) => patch({ buttonAction: a })}
        onChangeLink={(l) => patch({ buttonLink: l })}
        onChangeCategory={(c) => patch({ buttonCategory: c })}
      />

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Alinhamento"
          value={settings.textAlignment || "left"}
          onChange={(v) => patch({ textAlignment: v as "left" | "center" | "right" })}
          options={[
            { value: "left", label: "Esquerda" },
            { value: "center", label: "Centro" },
            { value: "right", label: "Direita" },
          ]}
        />
        <SelectField
          label="Altura do Banner"
          value={settings.bannerHeight || "medium"}
          onChange={(v) => patch({ bannerHeight: v as "compact" | "medium" | "full" })}
          options={[
            { value: "compact", label: "Compacto (55vh)" },
            { value: "medium", label: "Médio (78vh)" },
            { value: "full", label: "Tela Cheia (95vh)" },
          ]}
        />
      </div>

      {/* ── Upload de Imagem com compressão automática ─────────────────────── */}
      <ImageUploadField
        label="Imagem do Banner"
        hint="📐 Tamanho recomendado: 1920 × 800 px — Landscape (paisagem). JPEG ou WebP. Imagens serão comprimidas automaticamente."
        value={settings.imageUrl}
        onChange={(v) => patch({ imageUrl: v })}
        maxWidth={1920}
        maxHeight={1080}
        previewHeight={112}
      />

      <Field label={`Opacidade do Overlay — ${settings.overlayOpacity}%`}>
        <Slider
          min={0}
          max={90}
          step={5}
          value={[settings.overlayOpacity]}
          onValueChange={(vals) => patch({ overlayOpacity: vals[0] ?? 0 })}
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
        <Input
          value={settings.kicker}
          onChange={(e) => patch({ kicker: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Título">
        <Input
          value={settings.heading}
          onChange={(e) => patch({ heading: e.target.value })}
          className="h-9"
        />
      </Field>
      <TextareaField
        label="Texto"
        value={settings.body}
        onChange={(v) => patch({ body: v })}
        rows={3}
      />
      <Field label="Texto do Botão">
        <Input
          value={settings.buttonText}
          onChange={(e) => patch({ buttonText: e.target.value })}
          className="h-9"
        />
      </Field>

      <CtaActionFields
        action={settings.buttonAction}
        link={settings.buttonLink}
        category={settings.buttonCategory}
        onChangeAction={(a) => patch({ buttonAction: a })}
        onChangeLink={(l) => patch({ buttonLink: l })}
        onChangeCategory={(c) => patch({ buttonCategory: c })}
      />

      {/* ── Upload de Imagem com compressão automática ─────────────────────── */}
      <ImageUploadField
        label="Imagem da Seção"
        hint="📐 Recomendado: 800 × 800 px (quadrado) ou 800 × 1000 px (retrato). JPEG ou PNG."
        value={settings.imageUrl}
        onChange={(v) => patch({ imageUrl: v })}
        maxWidth={1000}
        maxHeight={1000}
        previewHeight={96}
      />

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
    const items = settings.items.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    patch({ items });
  };

  const deleteItem = (idx: number) => {
    patch({ items: settings.items.filter((_, i) => i !== idx) });
  };

  const addItem = () => {
    patch({
      items: [
        ...settings.items,
        { title: "Novo benefício", description: "Descrição do benefício." },
      ],
    });
  };

  return (
    <div className="space-y-3">
      {settings.items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border p-3">
          {/* Header do item com botão de excluir */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Item {i + 1}
            </p>
            <button
              type="button"
              onClick={() => deleteItem(i)}
              title="Excluir item"
              className="grid h-6 w-6 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <Field label="Título">
            <Input
              value={item.title}
              onChange={(e) => update(i, "title", e.target.value)}
              className="h-9"
            />
          </Field>
          <TextareaField
            label="Descrição"
            value={item.description}
            onChange={(v) => update(i, "description", v)}
            rows={2}
          />
        </div>
      ))}

      {/* Botão para adicionar novo item */}
      <button
        type="button"
        onClick={addItem}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar item
      </button>
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
        <Input
          value={settings.text}
          onChange={(e) => patch({ text: e.target.value })}
          className="h-9"
        />
      </Field>
      <ColorField
        label="Cor de Fundo"
        value={settings.backgroundColor}
        onChange={(v) => patch({ backgroundColor: v })}
      />
    </div>
  );
}

// ── Testimonials Inspector ──────────────────────────────────────────────────
function TestimonialsInspector({
  settings,
  patch,
}: {
  settings: TestimonialsSettings;
  patch: (p: Partial<TestimonialsSettings>) => void;
}) {
  const items = settings.items ?? [];

  const updateItem = (index: number, changes: Partial<(typeof items)[number]>) => {
    const updated = items.map((it, i) => (i === index ? { ...it, ...changes } : it));
    patch({ items: updated });
  };

  const addItem = () => {
    patch({
      items: [
        ...items,
        {
          name: "Nova Cliente",
          city: "Cidade, UF",
          rating: 5,
          comment: "Adorei as peças e o atendimento!",
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    patch({ items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <Field label="Kicker / Pré-título">
        <Input
          value={settings.kicker}
          onChange={(e) => patch({ kicker: e.target.value })}
          className="h-9"
          placeholder="Ex: QUEM COMPROU, AMOU"
        />
      </Field>
      <Field label="Título Principal">
        <Input
          value={settings.title}
          onChange={(e) => patch({ title: e.target.value })}
          className="h-9"
        />
      </Field>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Depoimentos ({items.length})
        </p>
        {items.map((item, idx) => (
          <div key={idx} className="space-y-2 rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Depoimento #{idx + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Input
              value={item.name}
              onChange={(e) => updateItem(idx, { name: e.target.value })}
              placeholder="Nome da cliente"
              className="h-8 text-xs"
            />
            <Input
              value={item.city}
              onChange={(e) => updateItem(idx, { city: e.target.value })}
              placeholder="Cidade, UF"
              className="h-8 text-xs"
            />
            <TextareaField
              label="Relato"
              value={item.comment}
              onChange={(v) => updateItem(idx, { comment: v })}
              rows={2}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar depoimento
        </button>
      </div>
    </div>
  );
}

// ── FAQ Inspector ───────────────────────────────────────────────────────────
function FaqInspector({
  settings,
  patch,
}: {
  settings: FaqSettings;
  patch: (p: Partial<FaqSettings>) => void;
}) {
  const items = settings.items ?? [];

  const updateItem = (index: number, changes: Partial<(typeof items)[number]>) => {
    const updated = items.map((it, i) => (i === index ? { ...it, ...changes } : it));
    patch({ items: updated });
  };

  const addItem = () => {
    patch({
      items: [
        ...items,
        {
          question: "Nova pergunta frequente",
          answer: "Resposta detalhada sobre o funcionamento da sua loja.",
        },
      ],
    });
  };

  const removeItem = (index: number) => {
    patch({ items: items.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <Field label="Kicker / Pré-título">
        <Input
          value={settings.kicker}
          onChange={(e) => patch({ kicker: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Título da FAQ">
        <Input
          value={settings.title}
          onChange={(e) => patch({ title: e.target.value })}
          className="h-9"
        />
      </Field>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Perguntas & Respostas ({items.length})
        </p>
        {items.map((item, idx) => (
          <div key={idx} className="space-y-2 rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Pergunta #{idx + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Input
              value={item.question}
              onChange={(e) => updateItem(idx, { question: e.target.value })}
              placeholder="Pergunta..."
              className="h-8 text-xs font-semibold"
            />
            <TextareaField
              label="Resposta"
              value={item.answer}
              onChange={(v) => updateItem(idx, { answer: v })}
              rows={2}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar pergunta
        </button>
      </div>
    </div>
  );
}

// ── Promotional Banner Inspector ────────────────────────────────────────────
function PromotionalBannerInspector({
  settings,
  patch,
}: {
  settings: PromotionalBannerSettings;
  patch: (p: Partial<PromotionalBannerSettings>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Badge / Selo de Urgência">
        <Input
          value={settings.badge}
          onChange={(e) => patch({ badge: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Título da Oferta">
        <Input
          value={settings.heading}
          onChange={(e) => patch({ heading: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Descrição">
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

      <CtaActionFields
        action={settings.buttonAction}
        link={settings.buttonLink}
        category={settings.buttonCategory}
        onChangeAction={(a) => patch({ buttonAction: a })}
        onChangeLink={(l) => patch({ buttonLink: l })}
        onChangeCategory={(c) => patch({ buttonCategory: c })}
      />
      <Field label="Horas do Cronômetro">
        <Input
          type="number"
          value={settings.endDateHours ?? 48}
          onChange={(e) => patch({ endDateHours: Number(e.target.value) || 24 })}
          className="h-9"
        />
      </Field>
    </div>
  );
}

// ── Instagram Feed Inspector ────────────────────────────────────────────────
function InstagramFeedInspector({
  settings,
  patch,
}: {
  settings: InstagramFeedSettings;
  patch: (p: Partial<InstagramFeedSettings>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Kicker / Pré-título">
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
      <Field label="Perfil do Instagram (@sualoja)">
        <Input
          value={settings.handle}
          onChange={(e) => patch({ handle: e.target.value })}
          className="h-9 font-mono text-xs"
        />
      </Field>
    </div>
  );
}

// ── Newsletter Inspector ────────────────────────────────────────────────────
function NewsletterInspector({
  settings,
  patch,
}: {
  settings: NewsletterSettings;
  patch: (p: Partial<NewsletterSettings>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Título de Chamada">
        <Input
          value={settings.heading}
          onChange={(e) => patch({ heading: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Subtítulo / Benefício">
        <Input
          value={settings.subheading}
          onChange={(e) => patch({ subheading: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Cupom de Desconto Revelado">
        <Input
          value={settings.couponBadge}
          onChange={(e) => patch({ couponBadge: e.target.value })}
          className="h-9 font-mono uppercase"
        />
      </Field>
      <Field label="Texto do Botão">
        <Input
          value={settings.buttonText}
          onChange={(e) => patch({ buttonText: e.target.value })}
          className="h-9"
        />
      </Field>
    </div>
  );
}

function CategoryBarInspector({
  settings,
  patch,
}: {
  settings: CategoryBarSettings;
  patch: (p: Partial<CategoryBarSettings>) => void;
}) {
  const mode = settings.mode || "auto";
  const layout = settings.layout || "grid";
  const items = settings.items || [];

  const handleAddItem = () => {
    const newItem: CategoryBarItem = {
      id: `cat-${Date.now()}`,
      label: "Nova Categoria",
      categorySlug: "nova-categoria",
      visible: true,
    };
    patch({ items: [...items, newItem] });
  };

  const handleUpdateItem = (idx: number, updated: Partial<CategoryBarItem>) => {
    const current = items[idx];
    if (!current) return;
    const next = [...items];
    next[idx] = { ...current, ...updated };
    patch({ items: next });
  };

  const handleRemoveItem = (idx: number) => {
    patch({ items: items.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
        <div>
          <p className="text-xs font-semibold text-foreground">Exibir Barra de Categorias</p>
          <p className="text-[11px] text-muted-foreground">Mostra coleções e atalhos na página inicial</p>
        </div>
        <input
          type="checkbox"
          checked={settings.enabled !== false}
          onChange={(e) => patch({ enabled: e.target.checked })}
          className="h-4 w-4 rounded accent-primary cursor-pointer"
        />
      </div>

      <Field label="Título da Seção (Opcional)">
        <Input
          value={settings.title || ""}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Ex: Compre por Categoria, Coleções..."
          className="h-9"
        />
      </Field>

      <SelectField
        label="Estilo Visual (Layout)"
        value={layout}
        onChange={(v) => patch({ layout: v as "grid" | "scroll" | "pills" })}
        options={[
          { value: "grid", label: "Grade de Cards (Visual Editorial)" },
          { value: "scroll", label: "Carrossel Horizontal Deslizável" },
          { value: "pills", label: "Pílulas / Chips Rápidos" },
        ]}
      />

      <SelectField
        label="Origem dos Dados"
        value={mode}
        onChange={(v) => patch({ mode: v as "auto" | "custom" })}
        options={[
          { value: "auto", label: "Automático (Sincronizado com os Produtos Reais)" },
          { value: "custom", label: "Personalizado (Escolher Fotos e Nomes Próprios)" },
        ]}
      />

      {mode === "auto" ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Sincronização Automática Ativa ✨</p>
          <p className="mt-1">
            As categorias exibidas na sua loja são geradas automaticamente a partir dos produtos cadastrados no seu inventário, usando a foto do produto mais recente de cada categoria.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Categorias Personalizadas ({items.length})
            </Label>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Adicionar
            </button>
          </div>

          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Nenhuma categoria personalizada criada ainda. Clique em "Adicionar" acima para criar a primeira com foto própria.
            </p>
          ) : (
            items.map((item, idx) => (
              <div key={item.id || idx} className="space-y-2.5 rounded-xl border border-border bg-card p-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    #{idx + 1} {item.label || "Sem nome"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    title="Excluir categoria"
                    className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Nome da Categoria">
                    <Input
                      value={item.label}
                      onChange={(e) => handleUpdateItem(idx, { label: e.target.value })}
                      placeholder="Ex: Vestidos"
                      className="h-8 text-xs"
                    />
                  </Field>
                  <Field label="Identificador / Filtro">
                    <Input
                      value={item.categorySlug}
                      onChange={(e) => handleUpdateItem(idx, { categorySlug: e.target.value.toLowerCase().trim() })}
                      placeholder="ex: vestidos"
                      className="h-8 font-mono text-xs"
                    />
                  </Field>
                </div>

                <ImageUploadField
                  label="Foto de Capa da Categoria"
                  hint="600×800 px recomendado"
                  value={item.imageUrl || ""}
                  onChange={(url) => handleUpdateItem(idx, { imageUrl: url })}
                  maxWidth={800}
                  maxHeight={1100}
                  previewHeight={80}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function SectionInspector({ section }: { section: Section }) {
  const { dispatch } = useBuilder();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch = (p: any) => dispatch({ type: "UPDATE_SECTION", id: section.id, patch: p });

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
      case "testimonials":
        return <TestimonialsInspector settings={section.settings} patch={patch} />;
      case "faq":
        return <FaqInspector settings={section.settings} patch={patch} />;
      case "promotional_banner":
        return <PromotionalBannerInspector settings={section.settings} patch={patch} />;
      case "instagram_feed":
        return <InstagramFeedInspector settings={section.settings} patch={patch} />;
      case "newsletter":
        return <NewsletterInspector settings={section.settings} patch={patch} />;
      case "category_bar":
        return <CategoryBarInspector settings={section.settings} patch={patch} />;
      default:
        return null;
    }
  })();

  return (
    <div className="mt-1 space-y-4">
      {/* ── Botão de excluir a seção inteira ─────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => dispatch({ type: "DELETE_SECTION", id: section.id })}
          className="flex items-center gap-1.5 rounded-xl border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Excluir seção
        </button>
      </div>

      {inner}
    </div>
  );
}
