import { useEffect, useMemo, useState, useRef, Fragment } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Coins,
  Copy,
  CreditCard,
  Flame,
  HelpCircle,
  Info,
  Layers,
  LayoutGrid,
  Minus,
  Package,
  PackagePlus,
  Palette,
  Pencil,
  Percent,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Target,
  Trash2,
  TrendingUp,
  Truck,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import {
  getPricingSettings,
  PRICING_SETTINGS_EVENT,
  type PricingSettings,
} from "@/lib/pricing-settings";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "@/components/ui/image-uploader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pricingsQuery } from "@/lib/db";
import { brl, pct, toNumber } from "@/lib/format";
import {
  computePaymentScenarios,
  computePricing,
  computePricingByMargin,
  computeReversePricing,
  computeLotBreakEven,
  getMarginHealth,
  type MarginHealth,
} from "@/lib/finance";
import { useStoreCategories, getCategoryLabel } from "@/lib/categories";
import { SupplierCombobox } from "@/components/supplier-combobox";
import { useStore } from "@/lib/store-context";
import { getCustomOptions, type CustomColorOption, type CustomSizeOption } from "@/lib/custom-options";
import { insertPricing, deletePricing, insertInventoryItem } from "@/lib/mutations";
import { getAutoPublish, patchShowcaseConfig } from "@/lib/showcase-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/precificacao")({
  head: () => ({
    meta: [
      { title: "Precificação Estratégica & Inteligência de Margem — Vestui" },
      {
        name: "description",
        content:
          "Calcule o preço de venda das suas peças com margem real, controle unificado por variante de tamanho e cor, simulador de taxas e ponto de equilíbrio do lote.",
      },
      { property: "og:title", content: "Precificação Estratégica — Vestui" },
      {
        name: "og:description",
        content: "Descubra o preço ideal por grade ou peça única, simulando perdas e margem real líquida.",
      },
    ],
  }),
  component: Precificacao,
});

type PricingMode = "rapida" | "grade" | "historico";
type PricingStrategy = "margin" | "markup" | "direct_price";

type ColorStrategy = {
  mode: PricingStrategy;
  margin: number | string; // 0–85 ou string enquanto digita livremente
  markup: number | string; // 0–300 ou string enquanto digita livremente
  directPrice: string; // e.g. "139,90"
};

const DEFAULT_COLOR_STRATEGY: ColorStrategy = { mode: "margin", margin: 50, markup: 100, directPrice: "" };

export type VariantRow = {
  id: string;
  size: string;
  color: string;
  wholesaleCost: string;             // custom cost string or "" (inherits baseWholesaleGrade)
  customSalePrice: string;           // custom sale price string or "" (calculated by strategy)
  customMargin?: string | undefined; // margem % individual no modo isolado (strategy=margin)
  customMarkup?: string | undefined; // markup % individual no modo isolado (strategy=markup)
  qty?: number | undefined;          // quantidade física da variante no lote
};

export type GradeModel = {
  id: string;
  name: string;
  category: string;
  baseWholesale: string;
  strategyMode: PricingStrategy;
  marginStr: string;
  markupStr: string;
  directPrice: string;
  variants: VariantRow[];
  activeColors: string[];
};

export const createEmptyGradeModel = (index = 1): GradeModel => ({
  id: `mod-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  name: "",
  category: "",
  baseWholesale: "",
  strategyMode: "margin",
  marginStr: "50",
  markupStr: "100",
  directPrice: "",
  variants: [],
  activeColors: [],
});

const PRESET_OPTIONS = [
  { id: "letras", label: "Padrão (PP–GG)", sizes: ["PP", "P", "M", "G", "GG"] },
  { id: "numeros", label: "Numérica (36–46)", sizes: ["36", "38", "40", "42", "44", "46"] },
  { id: "plus", label: "Plus Size (GG–G3)", sizes: ["GG", "G1", "G2", "G3"] },
  { id: "calcas", label: "Jeans (34–48)", sizes: ["34", "36", "38", "40", "42", "44", "46", "48"] },
];

// Todas as medidas do vestuário brasileiro em ordem canônica da moda
const ALL_FASHION_SIZES = [
  "PP", "P", "M", "G", "GG", "G1", "G2", "G3",
  "34", "36", "38", "40", "42", "44", "46", "48", "50",
  "Único",
];

// Atalhos rápidos de categoria para seleção em 1 clique no card da cor
const SIZE_QUICK_PRESETS = [
  { id: "padrao",   label: "P–GG",    sizes: ["PP", "P", "M", "G", "GG"] },
  { id: "numerico", label: "36–46",   sizes: ["36", "38", "40", "42", "44", "46"] },
  { id: "plus",     label: "Plus",    sizes: ["GG", "G1", "G2", "G3"] },
  { id: "jeans",    label: "Jeans",   sizes: ["34", "36", "38", "40", "42", "44", "46", "48"] },
];

export const SIZE_FAMILIES = [
  {
    id: "padrao" as const,
    label: "Letras (PP–GG)",
    shortLabel: "PP ao GG",
    sizes: ["PP", "P", "M", "G", "GG"],
  },
  {
    id: "numerica" as const,
    label: "Numérica (34–50)",
    shortLabel: "34 ao 50",
    sizes: ["34", "36", "38", "40", "42", "44", "46", "48", "50"],
  },
  {
    id: "plus" as const,
    label: "Plus Size (G1–G3)",
    shortLabel: "G1 ao G3",
    sizes: ["GG", "G1", "G2", "G3"],
  },
  {
    id: "unico" as const,
    label: "Tamanho Único",
    shortLabel: "Único",
    sizes: ["Único"],
  },
  {
    id: "todas" as const,
    label: "Todas as Medidas",
    shortLabel: "Todas",
    sizes: ALL_FASHION_SIZES,
  },
];

const COLOR_PRESETS = [
  // Neutros & Clássicos
  { name: "Off-White", color: "#F8F6F0" },
  { name: "Preto", color: "#1A1A1A" },
  { name: "Areia", color: "#D8C7B5" },
  { name: "Nude", color: "#E3BC9A" },
  { name: "Bege", color: "#E8D8C8" },
  { name: "Branco", color: "#FFFFFF" },
  { name: "Grafite", color: "#4A4A4A" },
  { name: "Cinza Mescla", color: "#9E9E9E" },

  // Terrosos & Quentes
  { name: "Terracota", color: "#C86D51" },
  { name: "Caramelo", color: "#A86538" },
  { name: "Marrom Chocolate", color: "#5C4033" },
  { name: "Telha", color: "#B85338" },
  { name: "Mostarda", color: "#D4AF37" },
  { name: "Amarelo Manteiga", color: "#F0E68C" },

  // Verdes
  { name: "Verde Oliva", color: "#556B2F" },
  { name: "Verde Militar", color: "#4B5320" },
  { name: "Verde Menta", color: "#98FF98" },
  { name: "Verde Esmeralda", color: "#046307" },
  { name: "Verde Sálvia", color: "#9DC183" },
  { name: "Verde Lima", color: "#32CD32" },

  // Azuis
  { name: "Azul Marinho", color: "#1B2A4A" },
  { name: "Azul Jeans", color: "#4B6B94" },
  { name: "Azul Céu", color: "#87CEEB" },
  { name: "Azul Royal", color: "#4169E1" },
  { name: "Azul Turquesa", color: "#40E0D0" },
  { name: "Índigo", color: "#3F51B5" },

  // Rosas & Vermelhos
  { name: "Rosa Seco", color: "#D4A5A5" },
  { name: "Rosa Bebê", color: "#FFB6C1" },
  { name: "Fúcsia", color: "#C71585" },
  { name: "Pink", color: "#FF1493" },
  { name: "Rosê", color: "#C98A7D" },
  { name: "Coral", color: "#FF7F50" },
  { name: "Vermelho", color: "#C41E3A" },
  { name: "Vinho", color: "#722F37" },
  { name: "Marsala", color: "#651C32" },

  // Roxos & Lilás
  { name: "Lilás", color: "#C8A2C8" },
  { name: "Lavanda", color: "#E6E6FA" },
  { name: "Roxo", color: "#800080" },

  // Estampas & Especiais
  { name: "Estampado", color: "#FF69B4" },
  { name: "Animal Print", color: "#C19A6B" },
  { name: "Floral", color: "#FFB7C5" },
  { name: "Dourado", color: "#FFD700" },
  { name: "Prata", color: "#C0C0C0" },
];

function getColorDot(col: string): string {
  const normalized = col.toLowerCase().trim();
  if (normalized.includes("branco") || normalized.includes("white")) return "bg-[#F8F6F0] border border-border";
  if (normalized.includes("preto") || normalized.includes("black")) return "bg-[#1A1A1A]";
  if (normalized.includes("areia") || normalized.includes("bege") || normalized.includes("nude")) return "bg-[#D8C7B5]";
  if (normalized.includes("terracota") || normalized.includes("caramelo") || normalized.includes("telha")) return "bg-[#C86D51]";
  if (normalized.includes("menta") || normalized.includes("sálvia") || normalized.includes("salvia")) return "bg-[#9DC183]";
  if (normalized.includes("militar") || normalized.includes("oliva") || normalized.includes("verde")) return "bg-[#556B2F]";
  if (normalized.includes("jeans") || normalized.includes("índigo") || normalized.includes("indigo")) return "bg-[#4B6B94]";
  if (normalized.includes("marinho") || normalized.includes("royal") || normalized.includes("azul") || normalized.includes("turquesa")) return "bg-[#1B2A4A]";
  if (normalized.includes("fúcsia") || normalized.includes("fucsia") || normalized.includes("pink")) return "bg-[#C71585]";
  if (normalized.includes("rosa") || normalized.includes("rose") || normalized.includes("rosê")) return "bg-[#D4A5A5]";
  if (normalized.includes("vinho") || normalized.includes("marsala")) return "bg-[#651C32]";
  if (normalized.includes("vermelho") || normalized.includes("coral") || normalized.includes("laranja")) return "bg-[#C41E3A]";
  if (normalized.includes("cinza") || normalized.includes("grafite") || normalized.includes("mescla")) return "bg-[#707070]";
  if (normalized.includes("amarelo") || normalized.includes("mostarda") || normalized.includes("manteiga")) return "bg-[#D4AF37]";
  if (normalized.includes("marrom") || normalized.includes("chocolate")) return "bg-[#5C4033]";
  if (normalized.includes("lilas") || normalized.includes("lilás") || normalized.includes("lavanda") || normalized.includes("roxo")) return "bg-[#8A6FDF]";
  if (normalized.includes("dourado") || normalized.includes("ouro")) return "bg-[#FFD700]";
  if (normalized.includes("prata")) return "bg-[#C0C0C0]";
  if (normalized.includes("estampa") || normalized.includes("floral") || normalized.includes("animal")) return "bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-500";
  return "bg-primary/40 border border-primary/20";
}

const CANONICAL_SIZE_ORDER = [
  "PP", "P", "M", "G", "GG", "G1", "G2", "G3",
  "34", "36", "38", "40", "42", "44", "46", "48", "50", "Único",
];

function sortCanonicalSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const idxA = CANONICAL_SIZE_ORDER.indexOf(a);
    const idxB = CANONICAL_SIZE_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

function VariantColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (newColor: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredPresets = COLOR_PRESETS.filter((cp) =>
    cp.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative inline-block w-full">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className="w-full flex items-center gap-1.5 rounded-lg border border-border/80 bg-card hover:bg-secondary/40 px-2 py-1 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs text-left"
        title="Clique para alterar a cor desta variação"
      >
        <span className={cn("size-2.5 rounded-full shrink-0 shadow-xs", getColorDot(color))} />
        <span className="truncate flex-1">{color}</span>
        <ChevronDown className="size-3 text-muted-foreground shrink-0 opacity-70" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-1 w-56 rounded-xl border border-border/80 bg-card p-2.5 shadow-xl animate-in fade-in-50 zoom-in-95 space-y-2">
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    e.preventDefault();
                    onChange(query.trim());
                    setOpen(false);
                    setQuery("");
                  } else if (e.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder="Buscar ou digitar cor..."
                className="h-7 w-full rounded-md border border-border bg-secondary/30 px-2 text-xs font-medium text-foreground outline-none focus:border-primary focus:bg-card"
              />
              {query.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(query.trim());
                    setOpen(false);
                    setQuery("");
                  }}
                  className="h-7 px-2 rounded-md gradient-primary text-[10px] font-bold text-white shrink-0 cursor-pointer"
                >
                  OK
                </button>
              )}
            </div>

            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {filteredPresets.map((cp) => (
                <button
                  key={cp.name}
                  type="button"
                  onClick={() => {
                    onChange(cp.name);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "w-full flex items-center justify-between rounded-md px-2 py-1 text-xs text-left transition-colors cursor-pointer",
                    color.toLowerCase() === cp.name.toLowerCase()
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-secondary/60 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("size-2 rounded-full shrink-0", getColorDot(cp.name))} />
                    <span className="truncate">{cp.name}</span>
                  </div>
                  {color.toLowerCase() === cp.name.toLowerCase() && (
                    <Check className="size-3 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ReplicateGradeColorPicker({
  onSelectColor,
}: {
  onSelectColor: (newColor: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredPresets = COLOR_PRESETS.filter((cp) =>
    cp.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground/85 hover:text-foreground bg-secondary/60 hover:bg-secondary px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs border border-border/70 active:scale-95"
        title="Replicar todos os tamanhos da grade para uma nova cor"
      >
        <Sparkles className="size-3.5 text-primary" />
        <span>Replicar grade em outra cor</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 bottom-full z-40 mb-1.5 w-60 rounded-xl border border-border/80 bg-card p-2.5 shadow-xl animate-in fade-in-50 zoom-in-95 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-border/50">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Palette className="size-3 text-primary" />
                Escolha a cor para replicar
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="size-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary text-xs"
              >
                <X className="size-3" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    e.preventDefault();
                    onSelectColor(query.trim());
                    setOpen(false);
                    setQuery("");
                  } else if (e.key === "Escape") {
                    setOpen(false);
                  }
                }}
                placeholder="Buscar ou digitar cor..."
                className="h-7 w-full rounded-md border border-border bg-secondary/30 px-2 text-xs font-medium text-foreground outline-none focus:border-primary focus:bg-card"
              />
              {query.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectColor(query.trim());
                    setOpen(false);
                    setQuery("");
                  }}
                  className="h-7 px-2 rounded-md gradient-primary text-[10px] font-bold text-white shrink-0 cursor-pointer"
                >
                  OK
                </button>
              )}
            </div>

            <div className="max-h-44 overflow-y-auto space-y-0.5">
              {filteredPresets.map((cp) => (
                <button
                  key={cp.name}
                  type="button"
                  onClick={() => {
                    onSelectColor(cp.name);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1 text-xs text-left transition-colors hover:bg-secondary/60 text-foreground cursor-pointer"
                >
                  <span className={cn("size-2 rounded-full shrink-0", getColorDot(cp.name))} />
                  <span className="truncate">{cp.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AddVariantPopover({
  defaultColor = "Off-White",
  baseWholesale = "",
  onAdd,
}: {
  defaultColor?: string;
  baseWholesale?: string;
  onAdd: (size: string, color: string, qty: number, wholesaleCost: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState("M");
  const [color, setColor] = useState(defaultColor || "Off-White");
  const [qty, setQty] = useState(2);
  const [cost, setCost] = useState(baseWholesale || "");
  const [colorQuery, setColorQuery] = useState("");
  const [showColorSearch, setShowColorSearch] = useState(false);

  const quickSizes = ["PP", "P", "M", "G", "GG", "36", "38", "40", "42", "44", "Único"];
  const filteredColors = COLOR_PRESETS.filter((c) =>
    c.name.toLowerCase().includes(colorQuery.toLowerCase()),
  );

  const handleConfirm = () => {
    const finalSize = size.trim() || "M";
    const finalColor = color.trim() || "Off-White";
    onAdd(finalSize, finalColor, Math.max(1, qty), cost);
    setOpen(false);
    setShowColorSearch(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (defaultColor) setColor(defaultColor);
          if (baseWholesale) setCost(baseWholesale);
        }}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-primary/5 border border-primary/20 bg-primary/5"
      >
        <Plus className="size-3.5" />
        <span>Adicionar variação</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setOpen(false);
              setShowColorSearch(false);
            }}
          />
          <div className="absolute left-0 bottom-full mb-2 z-50 w-80 rounded-2xl border border-border bg-card p-4 shadow-lift space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Plus className="size-3.5 text-primary" />
                Nova Variação (SKU)
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="size-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* 1. Escolha do Tamanho */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground">Tamanho</label>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {quickSizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSize(sz)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer border",
                      size === sz
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-secondary/40 border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary",
                    )}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Escolha da Cor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-muted-foreground">Cor da Peça</label>
                <button
                  type="button"
                  onClick={() => setShowColorSearch((prev) => !prev)}
                  className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  {showColorSearch ? "Fechar busca" : "Trocar / buscar cor"}
                </button>
              </div>

              <div className="flex items-center gap-2 p-1.5 rounded-lg border border-border bg-secondary/30">
                <span className={cn("size-3 rounded-full shrink-0 shadow-2xs", getColorDot(color))} />
                <span className="text-xs font-bold text-foreground flex-1 truncate">{color}</span>
              </div>

              {showColorSearch && (
                <div className="rounded-xl border border-border/80 bg-background p-2 space-y-2 shadow-xs">
                  <input
                    value={colorQuery}
                    onChange={(e) => setColorQuery(e.target.value)}
                    placeholder="Buscar ou digitar cor..."
                    className="h-7 w-full rounded-md border border-border bg-secondary/30 px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && colorQuery.trim()) {
                        e.preventDefault();
                        setColor(colorQuery.trim());
                        setShowColorSearch(false);
                        setColorQuery("");
                      }
                    }}
                  />
                  <div className="max-h-28 overflow-y-auto space-y-0.5">
                    {colorQuery.trim() && !filteredColors.some((c) => c.name.toLowerCase() === colorQuery.toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => {
                          setColor(colorQuery.trim());
                          setShowColorSearch(false);
                          setColorQuery("");
                        }}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-1 text-xs text-left text-primary font-bold hover:bg-primary/10 cursor-pointer"
                      >
                        <Plus className="size-3" />
                        <span>Usar cor &quot;{colorQuery.trim()}&quot;</span>
                      </button>
                    )}
                    {filteredColors.slice(0, 8).map((cp) => (
                      <button
                        key={cp.name}
                        type="button"
                        onClick={() => {
                          setColor(cp.name);
                          setShowColorSearch(false);
                          setColorQuery("");
                        }}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-1 text-xs text-left hover:bg-secondary/60 text-foreground cursor-pointer"
                      >
                        <span className={cn("size-2 rounded-full shrink-0", getColorDot(cp.name))} />
                        <span className="truncate">{cp.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Quantidade e Custo Atacado */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Quantidade</label>
                <div className="flex items-center rounded-lg border border-border bg-secondary/30 p-0.5">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="size-7 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Minus className="size-3" />
                  </button>
                  <input
                    inputMode="numeric"
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center text-xs font-bold text-foreground bg-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    className="size-7 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Custo Atacado</label>
                <div className="flex items-center rounded-lg border border-border bg-secondary/30 px-2 h-8">
                  <span className="text-[10px] text-muted-foreground mr-1 font-semibold">R$</span>
                  <input
                    inputMode="decimal"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder={baseWholesale || "0,00"}
                    className="w-full text-right text-xs font-bold text-foreground bg-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Botão Adicionar */}
            <Button
              type="button"
              onClick={handleConfirm}
              className="w-full h-8.5 rounded-xl gradient-primary text-xs font-bold shadow-glow text-white cursor-pointer"
            >
              <Plus className="size-3.5 mr-1" />
              Adicionar à Grade
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function GradeGeneratorModal({
  open,
  onOpenChange,
  currentColors,
  currentSizes,
  storeCustomColors = [],
  storeCustomSizes = [],
  onConfirm,
  isEditing = false,
  initialDraft = null,
  onDraftChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentColors: string[];
  currentSizes: string[];
  storeCustomColors?: CustomColorOption[];
  storeCustomSizes?: CustomSizeOption[];
  onConfirm: (colors: string[], sizes: string[], defaultQty: number, colorSizesMap?: Record<string, string[]>) => void;
  isEditing?: boolean;
  initialDraft?: {
    selectedColors: string[];
    selectedSizes: string[];
    defaultQty: number;
    customSizesByColor?: boolean;
    colorSizesMap?: Record<string, string[]>;
  } | null;
  onDraftChange?: (draft: {
    selectedColors: string[];
    selectedSizes: string[];
    defaultQty: number;
    customSizesByColor?: boolean;
    colorSizesMap?: Record<string, string[]>;
  } | null) => void;
}) {
  const [selectedColors, setSelectedColors] = useState<string[]>(() => {
    if (initialDraft && initialDraft.selectedColors && initialDraft.selectedColors.length > 0) {
      return initialDraft.selectedColors;
    }
    return currentColors;
  });
  const [selectedSizes, setSelectedSizes] = useState<string[]>(() => {
    if (initialDraft && initialDraft.selectedSizes && initialDraft.selectedSizes.length > 0) {
      return initialDraft.selectedSizes;
    }
    return currentSizes;
  });
  const [defaultQty, setDefaultQty] = useState<number>(() => initialDraft?.defaultQty ?? 1);
  const [customSizesByColor, setCustomSizesByColor] = useState<boolean>(
    () => initialDraft?.customSizesByColor ?? false,
  );
  const [colorSizesMap, setColorSizesMap] = useState<Record<string, string[]>>(
    () => initialDraft?.colorSizesMap ?? {},
  );
  const [activeTabColor, setActiveTabColor] = useState<string>("");
  const [customColorInput, setCustomColorInput] = useState<string>("");
  const [customSizeInput, setCustomSizeInput] = useState<string>("");


  const prevOpenRef = useRef(open);

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    // Dispara APENAS quando o modal transiciona de fechado para aberto:
    if (!wasOpen && open) {
      if (initialDraft && (initialDraft.selectedColors?.length > 0 || initialDraft.selectedSizes?.length > 0)) {
        setSelectedColors(initialDraft.selectedColors || []);
        setSelectedSizes(initialDraft.selectedSizes || []);
        setDefaultQty(initialDraft.defaultQty ?? 1);
        setCustomSizesByColor(initialDraft.customSizesByColor ?? false);
        setColorSizesMap(initialDraft.colorSizesMap ?? {});
        setActiveTabColor(initialDraft.selectedColors?.[0] ?? "");
      } else {
        setSelectedColors(currentColors);
        setSelectedSizes(currentSizes);
        setDefaultQty(1);
        setCustomSizesByColor(false);
        setColorSizesMap({});
        setActiveTabColor(currentColors[0] ?? "");
      }
      setCustomColorInput("");
      setCustomSizeInput("");
    }
  }, [open, initialDraft, currentColors, currentSizes]);

  // Sincroniza rascunho em tempo real enquanto o modal estiver aberto:
  useEffect(() => {
    if (open) {
      onDraftChange?.({
        selectedColors,
        selectedSizes,
        defaultQty,
        customSizesByColor,
        colorSizesMap,
      });
    }

  }, [open, selectedColors, selectedSizes, defaultQty, customSizesByColor, colorSizesMap, onDraftChange]);


  const toggleColor = (c: string) => {
    setSelectedColors((prev) =>
      prev.some((item) => item.toLowerCase() === c.toLowerCase())
        ? prev.filter((item) => item.toLowerCase() !== c.toLowerCase())
        : [...prev, c]
    );
  };

  const toggleSize = (sz: string) => {
    setSelectedSizes((prev) =>
      prev.includes(sz) ? prev.filter((item) => item !== sz) : sortCanonicalSizes([...prev, sz])
    );
  };

  const applyPreset = (presetSizes: string[]) => {
    const isAllSelected = presetSizes.every((sz) => selectedSizes.includes(sz));
    if (isAllSelected) {
      setSelectedSizes((prev) => prev.filter((sz) => !presetSizes.includes(sz)));
    } else {
      setSelectedSizes((prev) => sortCanonicalSizes(Array.from(new Set([...prev, ...presetSizes]))));
    }
  };

  const handleAddCustomColor = () => {
    const clean = customColorInput.trim();
    if (!clean) return;
    if (!selectedColors.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setSelectedColors((prev) => [...prev, clean]);
    }
    setCustomColorInput("");
  };

  const handleAddCustomSize = () => {
    const clean = customSizeInput.trim().toUpperCase();
    if (!clean) return;
    if (!selectedSizes.includes(clean)) {
      setSelectedSizes((prev) => sortCanonicalSizes([...prev, clean]));
    }
    setCustomSizeInput("");
  };

  const FASHION_PALETTE = [
    "Preto",
    "Off-White",
    "Areia",
    "Terracota",
    "Verde Oliva",
    "Azul Marinho",
    "Vinho",
    "Cinza Mescla",
    "Rosa Seco",
    "Caramelo",
    "Fúcsia",
    "Mostarda",
  ];

  const PRESETS_LIST = [
    { id: "padrao", label: "P ao GG", sizes: ["P", "M", "G", "GG"] },
    { id: "alfaiataria", label: "Alfaiataria (36 a 44)", sizes: ["36", "38", "40", "42", "44"] },
    { id: "jeans", label: "Jeans (36 a 46)", sizes: ["36", "38", "40", "42", "44", "46"] },
    { id: "plus", label: "Plus Size (GG a G3)", sizes: ["GG", "G1", "G2", "G3"] },
    { id: "unico", label: "Tamanho Único", sizes: ["Único"] },
  ];

  // ── Funções auxiliares para modo assimétrico ──────────────────────────────

  /** Alterna um tamanho para uma cor específica no modo assimétrico */
  const toggleSizeForColor = (color: string, sz: string) => {
    setColorSizesMap((prev) => {
      const current = prev[color] ?? [...selectedSizes];
      const next = current.includes(sz)
        ? current.filter((s) => s !== sz)
        : sortCanonicalSizes([...current, sz]);
      return { ...prev, [color]: next };
    });
  };

  /** Aplica um preset para uma cor específica no modo assimétrico */
  const applyPresetForColor = (color: string, presetSizes: string[]) => {
    setColorSizesMap((prev) => {
      const current = prev[color] ?? [...selectedSizes];
      const isAllSelected = presetSizes.every((sz) => current.includes(sz));
      const next = isAllSelected
        ? current.filter((sz) => !presetSizes.includes(sz))
        : sortCanonicalSizes(Array.from(new Set([...current, ...presetSizes])));
      return { ...prev, [color]: next };
    });
  };

  /** Adiciona tamanho customizado para uma cor específica */
  const handleAddCustomSizeForColor = (color: string) => {
    const clean = customSizeInput.trim().toUpperCase();
    if (!clean) return;
    setColorSizesMap((prev) => {
      const current = prev[color] ?? [...selectedSizes];
      if (current.includes(clean)) return prev;
      return { ...prev, [color]: sortCanonicalSizes([...current, clean]) };
    });
    setCustomSizeInput("");
  };

  /** Copia os tamanhos da cor ativa para todas as cores selecionadas */
  const copySizesToAllColors = (sourceColor: string) => {
    const sizes = colorSizesMap[sourceColor] ?? selectedSizes;
    const newMap: Record<string, string[]> = {};
    selectedColors.forEach((col) => {
      newMap[col] = [...sizes];
    });
    setColorSizesMap(newMap);
  };

  /** Inicializa o colorSizesMap ao ativar o modo assimétrico */
  const activateCustomSizesByColor = () => {
    const newMap: Record<string, string[]> = {};
    selectedColors.forEach((col) => {
      newMap[col] = colorSizesMap[col] ?? [...selectedSizes];
    });
    setColorSizesMap(newMap);
    setActiveTabColor(selectedColors[0] ?? "");
    setCustomSizesByColor(true);
  };

  // ── Cálculo de variações (dinâmico conforme modo) ─────────────────────────

  const totalVariations = customSizesByColor
    ? selectedColors.reduce((sum, col) => sum + (colorSizesMap[col] ?? selectedSizes).length, 0)
    : selectedColors.length * selectedSizes.length;
  const totalPieces = totalVariations * defaultQty;

  // Cor ativa válida (garante que sempre aponta para uma cor selecionada)
  const resolvedActiveTab =
    selectedColors.includes(activeTabColor) ? activeTabColor : (selectedColors[0] ?? "");
  const activeSizesForTab = colorSizesMap[resolvedActiveTab] ?? selectedSizes;


  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onDraftChange?.(null);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[88vh] h-[88vh] sm:h-auto flex flex-col p-0 rounded-3xl overflow-hidden border border-border/80 shadow-lift bg-card gap-0">
        {/* ── HEADER FIXO (NUNCA ROLA) ── */}
        <DialogHeader className="p-5 pb-3.5 border-b border-border/60 shrink-0 text-left pr-10">
          <div className="flex items-start gap-3">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <Boxes className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  {isEditing ? "Ajustar Grade do Modelo" : "Gerador de Grade de Variações"}
                </DialogTitle>
                {isEditing && (
                  <Badge variant="secondary" className="text-[10px] h-5 font-bold px-2 bg-secondary text-muted-foreground border-border/60">
                    Grade existente
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 leading-normal">
                {isEditing
                  ? "Altere cores e tamanhos. As variações já existentes manterão seus custos e quantidades intactos."
                  : "Selecione as cores e os tamanhos para montar a matriz de produção e precificação do lote."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── CORPO ROLÁVEL COM SCROLL SUAVE ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-thin">
          {/* 1. SELEÇÃO DE CORES */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <span>1. Cores deste modelo</span>
                <Badge variant="secondary" className="text-[10px] h-5 font-bold px-2">
                  {selectedColors.length} {selectedColors.length === 1 ? "cor" : "cores"}
                </Badge>
              </Label>
              {selectedColors.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedColors([])}
                  className="text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-destructive/10"
                >
                  Limpar cores
                </button>
              )}
            </div>

            {/* Cores da Loja (se houver) */}
            {storeCustomColors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Cores da sua Loja:</p>
                <div className="flex flex-wrap gap-1.5">
                  {storeCustomColors.map((c) => {
                    const isSelected = selectedColors.some((sc) => sc.toLowerCase() === c.label.toLowerCase());
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => toggleColor(c.label)}
                        className={cn(
                          "group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer border select-none",
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground font-bold shadow-2xs ring-1 ring-primary/40"
                            : "border-border/80 bg-background text-foreground/80 hover:bg-secondary/70 hover:border-border"
                        )}
                      >
                        <span
                          className="size-3 rounded-full shrink-0 border border-black/15 shadow-xs"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.label}</span>
                        {isSelected && <Check className="size-3.5 text-primary stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Paleta Padrão */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Paleta da Coleção:</p>
              <div className="flex flex-wrap gap-1.5">
                {FASHION_PALETTE.map((c) => {
                  const isSelected = selectedColors.some((sc) => sc.toLowerCase() === c.toLowerCase());
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleColor(c)}
                      className={cn(
                        "group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer border select-none",
                        isSelected
                          ? "border-primary bg-primary/10 text-foreground font-bold shadow-2xs ring-1 ring-primary/40"
                          : "border-border/80 bg-background text-foreground/80 hover:bg-secondary/70 hover:border-border"
                      )}
                    >
                      <span className={cn("size-3 rounded-full shrink-0 shadow-xs ring-1 ring-black/10", getColorDot(c))} />
                      <span>{c}</span>
                      {isSelected && <Check className="size-3.5 text-primary stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input de Adicionar Outra Cor */}
            <div className="flex items-center gap-2 pt-1 max-w-md">
              <Input
                value={customColorInput}
                onChange={(e) => setCustomColorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomColor();
                  }
                }}
                placeholder="Digitar outra cor (ex: Azul Tiffany, Marsala)..."
                className="h-8 text-xs rounded-xl bg-background border-border/80"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddCustomColor}
                disabled={!customColorInput.trim()}
                className="h-8 px-3 text-xs font-semibold rounded-xl border-border shrink-0 cursor-pointer"
              >
                <Plus className="size-3.5 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* 2. SELEÇÃO DE TAMANHOS */}
          <div className="space-y-3 pt-3 border-t border-border/50">
            {/* Header + segmentador de modo */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span>2. Grade de tamanhos</span>
                  <Badge variant="secondary" className="text-[10px] h-5 font-bold px-2">
                    {customSizesByColor
                      ? `${totalVariations} variações`
                      : `${selectedSizes.length} ${selectedSizes.length === 1 ? "tamanho" : "tamanhos"}`}
                  </Badge>
                </Label>
                {!customSizesByColor && selectedSizes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSizes([])}
                    className="text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-destructive/10"
                  >
                    Limpar tamanhos
                  </button>
                )}
              </div>

              {/* Segmentador Simétrico / Assimétrico — visível apenas com 2+ cores */}
              {selectedColors.length > 1 && (
                <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/60 border border-border/60 w-fit">
                  <button
                    type="button"
                    onClick={() => setCustomSizesByColor(false)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none",
                      !customSizesByColor
                        ? "bg-card shadow-xs text-foreground border border-border/80"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Check className={cn("size-3", !customSizesByColor ? "text-primary" : "opacity-0")} />
                    Mesmos tamanhos para todas
                  </button>
                  <button
                    type="button"
                    onClick={activateCustomSizesByColor}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none",
                      customSizesByColor
                        ? "bg-card shadow-xs text-foreground border border-border/80"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Check className={cn("size-3", customSizesByColor ? "text-primary" : "opacity-0")} />
                    Personalizar por cor
                  </button>
                </div>
              )}
            </div>

            {/* ── MODO ASSIMÉTRICO: abas por cor ───────────────────────────────── */}
            {customSizesByColor && selectedColors.length > 1 ? (
              <div className="space-y-3">
                {/* Abas de cores */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedColors.map((col) => {
                    const sizesCount = (colorSizesMap[col] ?? selectedSizes).length;
                    const isActive = resolvedActiveTab === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setActiveTabColor(col)}
                        className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 cursor-pointer select-none",
                          isActive
                            ? "border-primary bg-primary/10 text-foreground font-bold shadow-2xs ring-1 ring-primary/30"
                            : "border-border/80 bg-background text-muted-foreground hover:bg-secondary/70 hover:border-border",
                        )}
                      >
                        <span className={cn("size-2.5 rounded-full shrink-0 ring-1 ring-black/10", getColorDot(col))} />
                        <span>{col}</span>
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-bold min-w-[18px] text-center">
                          {sizesCount}
                        </Badge>
                      </button>
                    );
                  })}
                </div>

                {/* Botão de ação rápida: copiar para todas */}
                {resolvedActiveTab && (
                  <button
                    type="button"
                    onClick={() => copySizesToAllColors(resolvedActiveTab)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
                  >
                    <Copy className="size-3 shrink-0" />
                    Copiar tamanhos de <strong className="text-foreground">{resolvedActiveTab}</strong> para todas as cores
                  </button>
                )}

                {/* Atalhos Recomendados (para a cor ativa) */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Atalhos para {resolvedActiveTab}:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {storeCustomSizes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => applyPresetForColor(resolvedActiveTab, storeCustomSizes.map((s) => s.label))}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-primary/40 bg-primary/10 text-primary transition-all cursor-pointer shadow-2xs"
                      >
                        ✨ Minha Loja ({storeCustomSizes.map((s) => s.label).join(", ")})
                      </button>
                    )}
                    {PRESETS_LIST.map((p) => {
                      const isAllSelected = p.sizes.every((sz) => activeSizesForTab.includes(sz));
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPresetForColor(resolvedActiveTab, p.sizes)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs select-none",
                            isAllSelected
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary",
                          )}
                        >
                          {isAllSelected && <Check className="size-3 text-primary stroke-[2.5]" />}
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chips de tamanhos para a cor ativa */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tamanhos para {resolvedActiveTab}:</p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-muted-foreground w-16 shrink-0">Padrão:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {["PP", "P", "M", "G", "GG"].map((sz) => {
                        const isSelected = activeSizesForTab.includes(sz);
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => toggleSizeForColor(resolvedActiveTab, sz)}
                            className={cn(
                              "h-8 min-w-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center shadow-2xs select-none",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground font-black shadow-xs scale-102"
                                : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary",
                            )}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-muted-foreground w-16 shrink-0">Números:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {["34", "36", "38", "40", "42", "44", "46", "48"].map((sz) => {
                        const isSelected = activeSizesForTab.includes(sz);
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => toggleSizeForColor(resolvedActiveTab, sz)}
                            className={cn(
                              "h-8 min-w-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center shadow-2xs select-none",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground font-black shadow-xs scale-102"
                                : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary",
                            )}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-muted-foreground w-16 shrink-0">Especiais:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {["G1", "G2", "G3", "Único"].map((sz) => {
                        const isSelected = activeSizesForTab.includes(sz);
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => toggleSizeForColor(resolvedActiveTab, sz)}
                            className={cn(
                              "h-8 min-w-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center shadow-2xs select-none",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground font-black shadow-xs scale-102"
                                : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary",
                            )}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Adicionar tamanho customizado para a cor ativa */}
                <div className="flex items-center gap-2 pt-1 max-w-md">
                  <Input
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomSizeForColor(resolvedActiveTab);
                      }
                    }}
                    placeholder={`Outro tamanho para ${resolvedActiveTab} (ex: 50, G4)...`}
                    className="h-8 text-xs rounded-xl bg-background border-border/80"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddCustomSizeForColor(resolvedActiveTab)}
                    disabled={!customSizeInput.trim()}
                    className="h-8 px-3 text-xs font-semibold rounded-xl border-border shrink-0 cursor-pointer"
                  >
                    <Plus className="size-3.5 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            ) : (
              /* ── MODO SIMÉTRICO (padrão): igual ao original ──────────────────── */
              <>
                {/* Presets Rápidos */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Atalhos Recomendados:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {storeCustomSizes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => applyPreset(storeCustomSizes.map((s) => s.label))}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border border-primary/40 bg-primary/10 text-primary transition-all cursor-pointer shadow-2xs"
                      >
                        ✨ Minha Loja ({storeCustomSizes.map((s) => s.label).join(", ")})
                      </button>
                    )}
                    {PRESETS_LIST.map((p) => {
                      const isAllSelected = p.sizes.every((sz) => selectedSizes.includes(sz));
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPreset(p.sizes)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs select-none",
                            isAllSelected
                              ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                              : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary",
                          )}
                        >
                          {isAllSelected && <Check className="size-3 text-primary stroke-[2.5]" />}
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chips de Tamanhos Organizados por Famílias */}
                <div className="space-y-2.5 pt-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tamanhos Individuais:</p>

                  {/* Família Letras */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-muted-foreground w-16 shrink-0">Padrão:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {["PP", "P", "M", "G", "GG"].map((sz) => {
                        const isSelected = selectedSizes.includes(sz);
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => toggleSize(sz)}
                            className={cn(
                              "h-8 min-w-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center shadow-2xs select-none",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground font-black shadow-xs scale-102"
                                : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary",
                            )}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Família Numérica */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-muted-foreground w-16 shrink-0">Números:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {["34", "36", "38", "40", "42", "44", "46", "48"].map((sz) => {
                        const isSelected = selectedSizes.includes(sz);
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => toggleSize(sz)}
                            className={cn(
                              "h-8 min-w-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center shadow-2xs select-none",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground font-black shadow-xs scale-102"
                                : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary",
                            )}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Família Especiais */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-muted-foreground w-16 shrink-0">Especiais:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {["G1", "G2", "G3", "Único"].map((sz) => {
                        const isSelected = selectedSizes.includes(sz);
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => toggleSize(sz)}
                            className={cn(
                              "h-8 min-w-8 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center shadow-2xs select-none",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground font-black shadow-xs scale-102"
                                : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary",
                            )}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Adicionar tamanho customizado */}
                <div className="flex items-center gap-2 pt-1 max-w-md">
                  <Input
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomSize();
                      }
                    }}
                    placeholder="Outro tamanho (ex: 50, 52, G4)..."
                    className="h-8 text-xs rounded-xl bg-background border-border/80"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddCustomSize}
                    disabled={!customSizeInput.trim()}
                    className="h-8 px-3 text-xs font-semibold rounded-xl border-border shrink-0 cursor-pointer"
                  >
                    <Plus className="size-3.5 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </>
            )}
          </div>


          {/* 3. QUANTIDADE INICIAL SUGERIDA */}
          <div className="space-y-2 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">
                3. Quantidade inicial por variação:
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Padrão para novas variações
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[1, 2, 3, 4, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setDefaultQty(num)}
                  className={cn(
                    "h-8 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-2xs",
                    defaultQty === num
                      ? "border-primary bg-primary text-primary-foreground font-black shadow-xs"
                      : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  {num} {num === 1 ? "peça" : "peças"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RODAPÉ FIXO COM RESUMO E AÇÃO (STICKY) ── */}
        <div className="p-4 sm:p-5 pt-3.5 border-t border-border/60 bg-card/95 backdrop-blur-xs shrink-0 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 border border-border/70 text-xs">
            <div className="space-y-0.5 min-w-0">
              <p className="font-bold text-foreground flex items-center gap-1.5 truncate">
                <Sparkles className="size-3.5 text-primary shrink-0" />
                <span>Resumo da Matriz</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {customSizesByColor && selectedColors.length > 1 ? (
                  totalVariations > 0 ? (
                    <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {selectedColors.map((col) => {
                        const count = (colorSizesMap[col] ?? selectedSizes).length;
                        return (
                          <span key={col}>
                            <strong className="text-foreground font-semibold">{col}</strong>
                            {": "}
                            <strong className="text-foreground font-semibold">{count}</strong>
                            {" tam."}
                          </span>
                        );
                      })}
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Defina tamanhos para cada cor</span>
                  )
                ) : (
                  selectedColors.length > 0 && selectedSizes.length > 0 ? (
                    <>
                      <strong className="text-foreground font-semibold">{selectedColors.length}</strong> {selectedColors.length === 1 ? "cor" : "cores"}
                      {" × "}
                      <strong className="text-foreground font-semibold">{selectedSizes.length}</strong> {selectedSizes.length === 1 ? "tamanho" : "tamanhos"}
                    </>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Selecione ao menos 1 cor e 1 tamanho</span>
                  )
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-black text-sm text-foreground numeric">{totalVariations} variações</p>
              <p className="text-[10px] text-muted-foreground font-medium numeric">{totalPieces} peças no lote</p>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onDraftChange?.(null);
                onOpenChange(false);
              }}
              className="rounded-xl text-xs h-10 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                onConfirm(
                  selectedColors,
                  selectedSizes,
                  defaultQty,
                  customSizesByColor && selectedColors.length > 1 ? colorSizesMap : undefined,
                );
                onDraftChange?.(null);
              }}
              disabled={totalVariations === 0}
              className="gradient-primary text-primary-foreground font-bold rounded-xl text-xs sm:text-sm h-10 px-5 shadow-glow cursor-pointer disabled:opacity-40"
            >
              <Boxes className="size-4 mr-1.5" />
              <span>
                {isEditing
                  ? `Atualizar Grade (${totalVariations} variações)`
                  : `Gerar Planilha do Lote (${totalVariations} variações)`}
              </span>
            </Button>
          </DialogFooter>
        </div>

      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAINEL LATERAL STICKY — Resumo ao vivo de precificação (Apple / Lovable UX)
// ─────────────────────────────────────────────────────────────────────────────
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="num-display font-semibold text-foreground">{value}</span>
    </div>
  );
}

function LivePricingSummaryPanel({
  name,
  category,
  photoUrl,
  baseWholesaleCost,
  sharedCostsPerUnit,
  totalUnitCost,
  suggestedPrice,
  profitPerUnit,
  effectiveMargin,
  lotRevenue,
  lotProfit,
  totalUnits,
  totalVariants,
  hasData,
  mode,
  onEntry,
  onSave,
  onReset,
  onPromoteToGrade,
  saveDisabled,
  entryDisabled,
}: {
  name: string;
  category: string;
  photoUrl?: string;
  baseWholesaleCost: number;
  sharedCostsPerUnit: number;
  totalUnitCost: number;
  suggestedPrice: number;
  profitPerUnit: number;
  effectiveMargin: number;
  lotRevenue: number;
  lotProfit: number;
  totalUnits: number;
  totalVariants: number;
  hasData: boolean;
  mode: PricingMode;
  onEntry: () => void;
  onSave: () => void;
  onReset?: () => void;
  onPromoteToGrade?: () => void;
  saveDisabled: boolean;
  entryDisabled: boolean;
}) {
  const marginHealth = getMarginHealth(effectiveMargin);

  // Feedback inteligente de o que falta preencher (modo peça única)
  const missingParts: string[] = [];
  if (mode === "rapida") {
    if (!name.trim()) missingParts.push("nome");
    if (baseWholesaleCost <= 0) missingParts.push("custo");
  }
  const missingMsg = missingParts.length > 0 ? `Falta: ${missingParts.join(", ")}` : null;

  // Modo peça única: layout fiel à imagem de referência
  if (mode === "rapida") {
    return (
      <div className="rounded-2xl border border-border/80 bg-card shadow-soft overflow-hidden flex flex-col gap-0">
        {/* ── Cabeçalho: Avatar + Identificação ── */}
        <div className="flex items-center gap-3 p-4 pb-3.5 border-b border-border/50">
          <div className="size-10 rounded-xl border border-border/70 bg-secondary/40 flex items-center justify-center shrink-0 overflow-hidden">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="size-full object-cover" />
            ) : (
              <Shirt className="size-5 text-muted-foreground/50" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate leading-tight">
              {name.trim() || "Peça sem nome"}
            </p>
            <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
              {category || "Sem categoria"} · {totalUnits > 0 ? `${totalUnits} un.` : "1 un."}
            </p>
          </div>
        </div>

        {/* ── Preço sugerido ── */}
        <div className="px-4 pt-3.5 pb-3 border-b border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Preço sugerido</p>
          {suggestedPrice > 0 ? (
            <p className="num-display text-xl font-black text-foreground tracking-tight">
              {brl(suggestedPrice)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/70 italic">
              Informe o custo para ver o preço.
            </p>
          )}
        </div>

        {/* ── DRE Flat ── */}
        <div className="px-4 py-3 border-b border-border/50 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Custo de compra</span>
            <span className="num-display font-medium text-foreground">{brl(baseWholesaleCost)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Custos extras</span>
            <span className="num-display font-medium text-foreground">{brl(sharedCostsPerUnit)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Deduções</span>
            <span className="num-display font-medium text-foreground">
              {suggestedPrice > 0
                ? brl(suggestedPrice - totalUnitCost - profitPerUnit)
                : "R$ 0,00"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-foreground pt-1 border-t border-border/50">
            <span>Custo real</span>
            <span className="num-display">{brl(totalUnitCost > 0 ? totalUnitCost : baseWholesaleCost + sharedCostsPerUnit)}</span>
          </div>
        </div>

        {/* ── CTA + Ações ── */}
        <div className="px-4 py-3.5 flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              onClick={onEntry}
              disabled={entryDisabled}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-glow text-sm cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <PackagePlus className="size-4" />
              <span>Dar entrada no estoque</span>
            </Button>
            {missingMsg && (
              <p className="text-center text-[11px] text-muted-foreground/70">
                {missingMsg}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onSave}
              disabled={saveDisabled}
              className="flex-1 h-8 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer gap-1.5"
            >
              <Save className="size-3.5" />
              <span>Salvar histórico</span>
            </Button>
            {onReset && (
              <Button
                type="button"
                variant="ghost"
                onClick={onReset}
                className="flex-1 h-8 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer flex items-center justify-center gap-1.5"
                title="Limpar campos e nova peça"
              >
                <RotateCcw className="size-3.5" />
                <span>Nova peça</span>
              </Button>
            )}
          </div>

          {onPromoteToGrade && (
            <button
              type="button"
              onClick={onPromoteToGrade}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border/70 bg-secondary/20 hover:bg-secondary/50 text-xs font-semibold text-foreground transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <LayoutGrid className="size-3.5 text-primary" />
                <span>Expandir para grade</span>
              </div>
              <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          )}

          <p className="text-center text-[10px] text-muted-foreground/50 leading-relaxed">
            ⓘ Estimativa com as taxas informadas. Não é orientação fiscal.
          </p>
        </div>
      </div>
    );
  }

  // Modo grade: layout existente completo
  return (
    <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft space-y-4">
      {/* ── Cabeçalho do Resumo ── */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Layers className="size-3.5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Resumo do Lote
          </span>
        </div>
        {hasData && suggestedPrice > 0 && (
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
              marginHealth.status === "healthy" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
              marginHealth.status === "premium" && "bg-primary/10 text-primary border-primary/20",
              marginHealth.status === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
              marginHealth.status === "danger" && "bg-destructive/10 text-destructive border-destructive/20",
            )}
          >
            {marginHealth.emoji} {marginHealth.label}
          </span>
        )}
      </div>

      {/* ── Métrica: Peças na Grade ── */}
      <div className="flex items-center justify-between py-1 border-b border-border/40">
        <span className="text-xs font-semibold text-muted-foreground">Volume no lote</span>
        <span className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-bold",
          totalUnits > 0 ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground"
        )}>
          {totalUnits} {totalUnits === 1 ? "peça na grade" : "peças na grade"}
        </span>
      </div>

      {/* Identificação da Peça */}
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-xl border border-border/80 bg-secondary/30 flex items-center justify-center shrink-0 overflow-hidden">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="size-full object-cover" />
          ) : (
            <Shirt className="size-5 text-muted-foreground/60" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground truncate">
            {name.trim() || "Modelo sem nome"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {category || "Sem categoria"}
          </p>
        </div>
      </div>

      {/* ── Decomposição de Custos ── */}
      <div className="space-y-2 rounded-2xl bg-secondary/30 p-3.5 border border-border/50 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Custo de compra</span>
          <span className="num-display font-semibold text-foreground">
            {baseWholesaleCost > 0 ? `${brl(baseWholesaleCost)} / peça` : "R$ 0,00"}
          </span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Custos adicionais</span>
          <span className="num-display font-semibold text-foreground">
            {sharedCostsPerUnit > 0 ? `+${brl(sharedCostsPerUnit)} / peça` : "R$ 0,00"}
          </span>
        </div>
        <div className="border-t border-border/60 pt-2 flex items-center justify-between font-bold">
          <span className="text-foreground">Custo real por peça</span>
          <span className="num-display text-foreground text-sm font-extrabold">
            {totalUnitCost > 0
              ? brl(totalUnitCost)
              : (baseWholesaleCost + sharedCostsPerUnit > 0 ? brl(baseWholesaleCost + sharedCostsPerUnit) : "R$ 0,00")}
          </span>
        </div>
      </div>

      {/* ── Preço Sugerido Herói ── */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-4 text-center space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Preço Sugerido de Venda
        </p>
        <p className="num-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          {suggestedPrice > 0 ? brl(suggestedPrice) : "R$ 0,00"}
        </p>
        <div className="flex items-center justify-center gap-2 text-xs pt-0.5">
          <span className={cn(
            "font-bold flex items-center gap-1.5",
            profitPerUnit > 0 ? "text-emerald-600 dark:text-emerald-400" : profitPerUnit < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
          )}>
            <span className={cn(
              "size-1.5 rounded-full shrink-0",
              profitPerUnit > 0 ? "bg-emerald-500" : profitPerUnit < 0 ? "bg-rose-500" : "bg-muted-foreground/40"
            )} />
            {profitPerUnit >= 0 ? `+${brl(profitPerUnit)}` : brl(profitPerUnit)} lucro
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground font-semibold">
            {Math.round(effectiveMargin)}% margem
          </span>
        </div>
      </div>

      {/* ── Totais do Lote ── */}
      {hasData && totalUnits > 1 && (
        <div className="space-y-2 rounded-2xl bg-secondary/40 p-3 border border-border/60 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Faturamento previsto</span>
            <span className="num-display font-bold text-foreground">{brl(lotRevenue)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Lucro líquido total</span>
            <span className="num-display font-extrabold text-emerald-600 dark:text-emerald-400">
              +{brl(lotProfit)}
            </span>
          </div>
        </div>
      )}

      {/* ── Botões de Ação ── */}
      <div className="space-y-2 pt-1">
        <Button
          type="button"
          onClick={onEntry}
          disabled={entryDisabled}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-glow text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <PackagePlus className="size-4" />
          <span>Dar entrada no estoque ({totalUnits} un.)</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSave}
            disabled={saveDisabled}
            className="flex-1 h-9 rounded-xl text-xs font-semibold border-border/80 bg-background hover:bg-secondary cursor-pointer gap-1.5"
          >
            <Save className="size-3.5" />
            <span>Salvar histórico</span>
          </Button>
          {onReset && (
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              className="h-9 px-3 rounded-xl text-xs font-semibold border-border/80 bg-background hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
              title="Limpar campos e novo modelo"
            >
              <RotateCcw className="size-3.5" />
              <span className="text-xs">Novo</span>
            </Button>
          )}
        </div>

        {totalUnits > 0 && (
          <p className="text-center text-[11px] text-muted-foreground">
            {totalUnits} {totalUnits === 1 ? "peça" : "peças"}{totalVariants > 1 ? ` · ${totalVariants} variações` : ""}
          </p>
        )}

        <p className="text-center text-[10px] text-muted-foreground/60 leading-relaxed pt-0.5">
          ⊙ Estimativa com as taxas informadas. Não representa orientação fiscal.
        </p>
      </div>
    </div>
  );
}

interface SmartTableNumericInputProps {
  value: string;
  onChange: (val: string) => void;
  mode?: "percentage" | "currency" | "multiplier" | "plain";
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  isCustom?: boolean;
  min?: number;
  max?: number;
  step?: number;
  shiftStep?: number;
  altStep?: number;
  onReset?: (() => void) | undefined;
  resetTitle?: string;
}

function SmartTableNumericInput({
  value,
  onChange,
  mode = "plain",
  placeholder = "0",
  className,
  inputClassName,
  isCustom = false,
  min = 0,
  max = 999999,
  step = 1,
  shiftStep = 5,
  altStep = 0.5,
  onReset,
  resetTitle = "Resetar para padrão",
}: SmartTableNumericInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const applyDelta = (delta: number) => {
    const currentNum = toNumber(value);
    const nextNum = Math.min(max, Math.max(min, Math.round((currentNum + delta) * 100) / 100));

    if (mode === "currency") {
      onChange(nextNum.toFixed(2).replace(".", ","));
    } else if (mode === "percentage") {
      if (Number.isInteger(nextNum)) {
        onChange(String(nextNum));
      } else {
        onChange(nextNum.toFixed(1).replace(".", ","));
      }
    } else {
      if (Number.isInteger(nextNum)) {
        onChange(String(nextNum));
      } else {
        onChange(nextNum.toFixed(2).replace(".", ","));
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const delta = e.shiftKey ? shiftStep : (e.altKey || e.ctrlKey ? altStep : step);
      applyDelta(delta);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const delta = e.shiftKey ? shiftStep : (e.altKey || e.ctrlKey ? altStep : step);
      applyDelta(-delta);
    }
  };

  return (
    <div className={cn("relative inline-flex items-center gap-1", className)}>
      <div
        className={cn(
          "group relative inline-flex items-center rounded-lg border h-8 transition-all overflow-hidden",
          isCustom
            ? "border-primary/60 bg-primary/5 shadow-2xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25"
            : "border-border/90 bg-background hover:border-foreground/30 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 shadow-2xs",
        )}
      >
        {mode === "currency" && (
          <span className="pl-2 text-[11px] font-bold text-muted-foreground select-none">
            R$
          </span>
        )}
        <input
          ref={inputRef}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "bg-transparent font-bold numeric text-xs outline-none text-foreground px-2 h-full tabular-nums",
            mode === "currency" ? "w-20 text-right pr-2" : "w-14 text-center",
            inputClassName,
          )}
        />
        {mode === "percentage" && (
          <span className="pr-2 text-[11px] font-bold text-muted-foreground select-none">
            %
          </span>
        )}
      </div>

      {isCustom && onReset && (
        <button
          type="button"
          onClick={onReset}
          title={resetTitle}
          className="text-muted-foreground/60 hover:text-primary transition-colors p-1 rounded-md hover:bg-secondary cursor-pointer shrink-0"
        >
          <RotateCcw className="size-3" />
        </button>
      )}
    </div>
  );
}

function Precificacao() {

  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { categories: storeCategories } = useStoreCategories();
  const { data: saved = [] } = useQuery(pricingsQuery());

  // ── Predefinições da Loja (Configuradas em /configuracoes) ───────────
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(() => getPricingSettings(storeId));

  useEffect(() => {
    const handler = () => {
      const updated = getPricingSettings(storeId);
      setPricingSettings(updated);
      setTax(updated.defaultTax);
      setCardRate(updated.defaultCardRate);
      setDesiredMargin(updated.defaultMargin);
    };
    window.addEventListener(PRICING_SETTINGS_EVENT, handler);
    return () => window.removeEventListener(PRICING_SETTINGS_EVENT, handler);
  }, [storeId]);

  // ── Cores e Tamanhos da Loja (Configuradas em /configuracoes?tab=catalogo) ──
  const [customOptions, setCustomOptions] = useState(() => getCustomOptions(storeId));

  useEffect(() => {
    const handler = () => {
      setCustomOptions(getCustomOptions(storeId));
    };
    window.addEventListener("custom-options-changed", handler);
    return () => window.removeEventListener("custom-options-changed", handler);
  }, [storeId]);

  // ── Persistência de Rascunho (localStorage) ──────────────────────
  const DRAFT_KEY = `modaly_precificacao_draft_${storeId}`;

  const loadDraft = <T,>(key: string, fallback: T): T => {
    try {
      if (typeof window === "undefined") return fallback;
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return (parsed && key in parsed && parsed[key] !== undefined ? parsed[key] : fallback) as T;
    } catch {
      return fallback;
    }
  };

  // ── Modo Principal (Rápida | Grade | Histórico) ───────────────────
  const [mode, setMode] = useState<PricingMode>(() => loadDraft("mode", "rapida"));

  // ── Estratégia de Precificação ────────────────────────────────────
  const [strategy, setStrategy] = useState<PricingStrategy>(() => loadDraft("strategy", "margin"));

  // ── Identificação da Peça ─────────────────────────────────────────
  const [name, setName] = useState(() => loadDraft("name", ""));
  const [category, setCategory] = useState(() => loadDraft("category", ""));

  // ── Modo 1: Precificação Rápida ───────────────────────────────────
  const [wholesale, setWholesale] = useState(() => loadDraft("wholesale", ""));
  const [rapidaQty, setRapidaQty] = useState(() => loadDraft("rapidaQty", "1"));     // quantidade de peças no lote rápido
  const [rapidaColor, setRapidaColor] = useState(() => loadDraft("rapidaColor", ""));   // cor opcional (identificação)
  const [rapidaSize, setRapidaSize] = useState(() => loadDraft("rapidaSize", ""));     // tamanho opcional (identificação)

  // ── Modo 2: Grade Detalhada de Variantes ──────────────────────────
  const [baseWholesaleGrade, setBaseWholesaleGrade] = useState(() => loadDraft("baseWholesaleGrade", ""));

  // Lista Unificada de Variantes (SKUs)
  const [variants, setVariants] = useState<VariantRow[]>(() => loadDraft("variants", []));

  // Seletor de geração rápida da grade
  const [activeColors, setActiveColors] = useState<string[]>(() => loadDraft("activeColors", []));
  const [genSizes, setGenSizes] = useState<string[]>(() => loadDraft("genSizes", []));

  // ── Multi-Modelo / Modo Produção (v74) ────────────────────────────
  const [initialGradeModel] = useState<GradeModel>(() => createEmptyGradeModel(1));
  const [gradeModels, setGradeModels] = useState<GradeModel[]>(() =>
    loadDraft("gradeModels", [initialGradeModel]),
  );
  const [activeModelId, setActiveModelId] = useState<string>(() =>
    loadDraft("activeModelId", initialGradeModel.id),
  );
  const isSwitchingModelRef = useRef(false);

  const [genColors, setGenColors] = useState<string[]>([]);
  const [activePreset, setActivePreset] = useState<string>("letras");
  const [customGenColor, setCustomGenColor] = useState("");
  const [showMatrixGenerator, setShowMatrixGenerator] = useState(false);
  const [newCustomColor, setNewCustomColor] = useState("");
  const [tableColorFilter, setTableColorFilter] = useState<string>("all");
  const [showVariantCustomizer, setShowVariantCustomizer] = useState(false);

  // Busca Spotlight de Cores (Apple Level - Modo Grade)
  const [colorSearchQuery, setColorSearchQuery] = useState("");
  const [showColorPopover, setShowColorPopover] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Busca Spotlight de Cores & Seletor de Tamanhos (Apple Level - Modo Rápido)
  const [rapidaColorSearchQuery, setRapidaColorSearchQuery] = useState("");
  const [showRapidaColorPopover, setShowRapidaColorPopover] = useState(false);
  const rapidaColorInputRef = useRef<HTMLInputElement>(null);
  const [showRapidaMoreSizes, setShowRapidaMoreSizes] = useState(false);

  // Estratégia de precificação por cor (independente por card de cor)
  const [colorStrategies, setColorStrategies] = useState<Record<string, ColorStrategy>>(() =>
    loadDraft("colorStrategies", {}),
  );

  // Inserção manual no rodapé da tabela
  const [manualSize, setManualSize] = useState("M");
  const [manualColor, setManualColor] = useState("Off-White");
  const [manualCost, setManualCost] = useState("");

  // ── Assistente de Rateio Rápido de Custos Operacionais ─────────────
  const [rateioTarget, setRateioTarget] = useState<"freight" | "packaging" | "other" | null>(null);
  const [rateioTotal, setRateioTotal] = useState("");
  const [rateioPieces, setRateioPieces] = useState("");

  // ── Custos Operacionais Rateados (por peça) ───────────────────────
  const [freight, setFreight] = useState(() => loadDraft("freight", ""));
  const [packaging, setPackaging] = useState(() => loadDraft("packaging", ""));
  const [other, setOther] = useState(() => loadDraft("other", ""));

  // ── Modo de custo: por peça ou total do lote ─────────────────────
  const [freightMode, setFreightMode] = useState<"per_unit" | "lot_total">(() =>
    loadDraft("freightMode", "lot_total"),
  );
  const [packagingMode, setPackagingMode] = useState<"per_unit" | "lot_total">(() =>
    loadDraft("packagingMode", "lot_total"),
  );
  const [otherMode, setOtherMode] = useState<"per_unit" | "lot_total">(() =>
    loadDraft("otherMode", "lot_total"),
  );

  const [desiredMargin, setDesiredMargin] = useState<number>(() =>
    loadDraft("desiredMargin", pricingSettings.defaultMargin),
  ); // Margem líquida padrão da loja
  const [markup, setMarkup] = useState<number>(() => loadDraft("markup", 80)); // 80% markup sobre custo
  const [directSalePrice, setDirectSalePrice] = useState(() => loadDraft("directSalePrice", ""));
  const [tax, setTax] = useState<number>(() => loadDraft("tax", pricingSettings.defaultTax)); // Imposto padrão da loja
  const [cardRate, setCardRate] = useState<number>(() => loadDraft("cardRate", pricingSettings.defaultCardRate)); // Taxa de maquininha padrão da loja

  // Estados locais para digitação livre nos steppers
  const [marginInputVal, setMarginInputVal] = useState(() =>
    Number.isInteger(desiredMargin)
      ? String(desiredMargin)
      : String(desiredMargin).replace(".", ","),
  );
  const [markupInputVal, setMarkupInputVal] = useState(() =>
    Number.isInteger(markup)
      ? String(markup)
      : String(markup).replace(".", ","),
  );

  useEffect(() => {
    const numInState = typeof desiredMargin === "number" ? desiredMargin : 0;
    const formatted = Number.isInteger(numInState)
      ? String(numInState)
      : String(Number(numInState.toFixed(1))).replace(".", ",");
    setMarginInputVal(formatted);
  }, [desiredMargin]);

  useEffect(() => {
    const numInState = typeof markup === "number" ? markup : 0;
    const formatted = Number.isInteger(numInState)
      ? String(numInState)
      : String(Number(numInState.toFixed(1))).replace(".", ",");
    setMarkupInputVal(formatted);
  }, [markup]);

  // ── Rateio Operacional: Colapsável ───────────────────────────
  const [showOverhead, setShowOverhead] = useState(false);
  const [showColorInput, setShowColorInput] = useState(false);
  const [quickAddColor, setQuickAddColor] = useState<string>("");
  const [quickAddSizes, setQuickAddSizes] = useState<string[]>([]);
  const colorPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showColorInput) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPopoverRef.current && !colorPopoverRef.current.contains(e.target as Node)) {
        setShowColorInput(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColorInput]);
  const [showDeducoes, setShowDeducoes] = useState(false);
  const [gradePricingMode, setGradePricingMode] = useState<"unified" | "isolated">(() =>
    loadDraft("gradePricingMode", "unified"),
  );
  const [editingMarginVariantId, setEditingMarginVariantId] = useState<string | null>(null);
  const [inlineMarginInput, setInlineMarginInput] = useState<string>("");
  const [showGradeModal, setShowGradeModal] = useState<boolean>(() =>
    loadDraft("showGradeModal", false),
  );
  const [gradeModalDraft, setGradeModalDraft] = useState<{
    selectedColors: string[];
    selectedSizes: string[];
    defaultQty: number;
    customSizesByColor?: boolean;
    colorSizesMap?: Record<string, string[]>;
  } | null>(() => loadDraft("gradeModalDraft", null));


  const handleConfirmGradeModal = (
    colors: string[],
    sizes: string[],
    defaultQty: number,
    colorSizesMap?: Record<string, string[]>,
  ) => {
    // Validação: grade simétrica precisa de sizes; grade assimétrica precisa que pelo menos 1 cor tenha tamanhos
    const isAsymmetric = !!colorSizesMap && Object.keys(colorSizesMap).length > 0;
    if (colors.length === 0) {
      toast.error("Selecione ao menos 1 cor para gerar a grade");
      return;
    }
    if (!isAsymmetric && sizes.length === 0) {
      toast.error("Selecione ao menos 1 tamanho para gerar a grade");
      return;
    }
    if (isAsymmetric && colors.every((col) => (colorSizesMap[col] ?? []).length === 0)) {
      toast.error("Defina ao menos 1 tamanho para ao menos 1 cor");
      return;
    }

    setActiveColors(colors);

    // Na grade assimétrica os tamanhos globais são a união de todos os tamanhos por cor
    const allSizes = isAsymmetric
      ? Array.from(new Set(colors.flatMap((col) => colorSizesMap[col] ?? [])))
      : sizes;
    setMatrixSizes(allSizes);

    const newRows: VariantRow[] = [];
    colors.forEach((col) => {
      const sizesForColor = isAsymmetric
        ? (colorSizesMap[col] ?? sizes)
        : sizes;
      sizesForColor.forEach((sz) => {
        const existing = variants.find(
          (v) => v.color.toLowerCase() === col.toLowerCase() && v.size === sz,
        );
        newRows.push({
          id: existing?.id ?? `v-${sz.toLowerCase()}-${col.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          size: sz,
          color: col,
          wholesaleCost: existing?.wholesaleCost || baseWholesaleGrade || "",
          customSalePrice: existing?.customSalePrice ?? "",
          customMargin: existing?.customMargin,
          customMarkup: existing?.customMarkup,
          qty: existing?.qty ?? defaultQty,
        });
      });
    });

    newRows.sort((a, b) => {
      const colComp = a.color.localeCompare(b.color);
      if (colComp !== 0) return colComp;
      const idxA = CANONICAL_SIZE_ORDER.indexOf(a.size);
      const idxB = CANONICAL_SIZE_ORDER.indexOf(b.size);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.size.localeCompare(b.size);
    });

    setVariants(newRows);
    setShowGradeModal(false);
    setGradeModalDraft(null);
    toast.success(`Grade gerada com sucesso! ${newRows.length} variações na planilha 🎉`);
  };


  // ── Simuladores & Lote ─────────────────────────────────────────
  const [lotUnits] = useState(20);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showGradeColorBreakdown, setShowGradeColorBreakdown] = useState(false);

  // ── Grid-First Matrix State ─────────────────────────────────────────
  const [matrixSizes, setMatrixSizes] = useState<string[]>(() =>
    loadDraft("matrixSizes", ["P", "M", "G", "GG"]),
  );
  const [matrixDefaultQtys, setMatrixDefaultQtys] = useState<Record<string, number>>(() =>
    loadDraft("matrixDefaultQtys", { PP: 1, P: 2, M: 4, G: 4, GG: 2, G1: 2, G2: 2, G3: 1 }),
  );
  const [matrixGlobalMode, setMatrixGlobalMode] = useState<PricingStrategy>("margin");
  const [matrixGlobalMarginStr, setMatrixGlobalMarginStr] = useState("50");
  const [matrixGlobalMarkupStr, setMatrixGlobalMarkupStr] = useState("100");
  const [matrixGlobalDirectPrice, setMatrixGlobalDirectPrice] = useState("");
  const [showAdvancedMatrix, setShowAdvancedMatrix] = useState(false);
  const [matrixSetupOpen, setMatrixSetupOpen] = useState(true);
  const [activeSizeFamily, setActiveSizeFamily] = useState<"padrao" | "numerica" | "plus" | "unico" | "todas">("padrao");

  // ── Auto-save Draft para localStorage (Debounced 500ms) ───────────
  useEffect(() => {
    if (isSwitchingModelRef.current) return;

    const timer = setTimeout(() => {
      try {
        if (typeof window === "undefined") return;
        const draft = {
          mode,
          strategy,
          name,
          category,
          wholesale,
          rapidaQty,
          rapidaColor,
          rapidaSize,
          baseWholesaleGrade,
          variants,
          activeColors,
          genSizes,
          gradeModels,
          activeModelId,
          colorStrategies,
          freight,
          packaging,
          other,
          freightMode,
          packagingMode,
          otherMode,
          desiredMargin,
          markup,
          directSalePrice,
          tax,
          cardRate,
          matrixSizes,
          matrixDefaultQtys,
          gradePricingMode,
          showGradeModal,
          gradeModalDraft,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Ignora silenciosamente se ultrapassar cota
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    DRAFT_KEY,
    mode,
    strategy,
    name,
    category,
    wholesale,
    rapidaQty,
    rapidaColor,
    rapidaSize,
    baseWholesaleGrade,
    variants,
    activeColors,
    genSizes,
    gradeModels,
    activeModelId,
    colorStrategies,
    freight,
    packaging,
    other,
    freightMode,
    packagingMode,
    otherMode,
    desiredMargin,
    markup,
    directSalePrice,
    tax,
    cardRate,
    matrixSizes,
    matrixDefaultQtys,
    gradePricingMode,
    showGradeModal,
    gradeModalDraft,
  ]);

  // ── Modal Sheet: Ficha de Entrada no Estoque ──────────────────────
  const [entrySheetOpen, setEntrySheetOpen] = useState(false);
  const [entryName, setEntryName] = useState("");
  const [entryCategory, setEntryCategory] = useState("vestido");
  const [entryColor, setEntryColor] = useState("");
  const [entrySupplier, setEntrySupplier] = useState("");
  const [entryCostPrice, setEntryCostPrice] = useState(0);
  const [entrySalePrice, setEntrySalePrice] = useState(0);
  const [entryPhotoUrl, setEntryPhotoUrl] = useState("");
  const [entrySizes, setEntrySizes] = useState<Record<string, number>>({
    P: 2,
    M: 4,
    G: 4,
    GG: 2,
  });

  // ── Total Real de Unidades do Lote (Dinâmico e Preciso) ─────────────
  const actualLotUnits = useMemo(() => {
    if (mode !== "grade") return Math.max(1, Number(rapidaQty.replace(",", ".")) || 1);
    return variants.reduce((acc, v) => acc + (v.qty || 1), 0);
  }, [mode, variants, rapidaQty]);

  // Lista única e estável de tamanhos para props do modal gerador
  const modalCurrentSizes = useMemo(
    () => Array.from(new Set(variants.map((v) => v.size))),
    [variants],
  );

  // ── Helper: resolve custo real por peça considerando o modo (por peça ou lote total) ──
  const resolvePerUnit = (valueStr: string, mode: "per_unit" | "lot_total", units: number): number => {
    const v = toNumber(valueStr);
    if (mode === "per_unit") return v;
    return units > 0 ? v / units : 0;
  };

  // ── Função Central de Cálculo de Item ──────────────────────────────
  const calculateItem = useMemo(() => {
    const freightNum = resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const packagingNum = resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const otherNum = resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1);

    return (
      wholesaleCost: number,
      customSalePriceStr?: string,
    ): {
      realCost: number;
      suggestedPrice: number;
      profit: number;
      marginOnPrice: number;
      markupOnCost: number;
      deductions: number;
      isCustomPrice: boolean;
      marginHealth: MarginHealth;
    } => {
      const realCost = wholesaleCost + freightNum + packagingNum + otherNum;
      const customPriceNum = customSalePriceStr ? toNumber(customSalePriceStr) : 0;
      const hasCustomPrice = customPriceNum > 0;

      // 1. Preço de venda fixo personalizado ou estratégia direct_price
      if (hasCustomPrice || strategy === "direct_price") {
        const targetPrice = hasCustomPrice ? customPriceNum : toNumber(directSalePrice);
        const res = computeReversePricing({
          wholesale_cost: wholesaleCost,
          freight_cost: freightNum,
          packaging_cost: packagingNum,
          other_costs: otherNum,
          sale_price: targetPrice,
          tax_pct: tax,
          card_rate_pct: cardRate,
        });
        return {
          realCost: res.realCost,
          suggestedPrice: res.salePrice,
          profit: res.profit,
          marginOnPrice: res.marginOnPrice,
          markupOnCost: res.markupOnCost,
          deductions: res.deductions,
          isCustomPrice: hasCustomPrice,
          marginHealth: res.marginHealth,
        };
      }

      // 2. Margem Real Líquida sobre a Venda
      if (strategy === "margin") {
        const res = computePricingByMargin({
          wholesale_cost: wholesaleCost,
          freight_cost: freightNum,
          packaging_cost: packagingNum,
          other_costs: otherNum,
          desired_margin_pct: desiredMargin,
          tax_pct: tax,
          card_rate_pct: cardRate,
        });
        return {
          realCost: res.realCost,
          suggestedPrice: res.suggestedPrice,
          profit: res.profit,
          marginOnPrice: res.marginOnPrice,
          markupOnCost: res.markupOnCost,
          deductions: res.deductions,
          isCustomPrice: false,
          marginHealth: res.marginHealth,
        };
      }

      // 3. Markup sobre o Custo Total
      const res = computePricing({
        wholesale_cost: wholesaleCost,
        freight_cost: freightNum,
        packaging_cost: packagingNum,
        other_costs: otherNum,
        margin_pct: markup,
        tax_pct: tax,
        card_rate_pct: cardRate,
      });
      const totalDeductions = res.suggestedPrice * ((tax + cardRate) / 100);

      return {
        realCost: res.realCost,
        suggestedPrice: res.suggestedPrice,
        profit: res.profit,
        marginOnPrice: res.marginOnPrice,
        markupOnCost: res.markupOnCost,
        deductions: totalDeductions,
        isCustomPrice: false,
        marginHealth: getMarginHealth(res.marginOnPrice),
      };
    };
  }, [freight, packaging, other, freightMode, packagingMode, otherMode, actualLotUnits, strategy, desiredMargin, markup, directSalePrice, tax, cardRate]);

  // ── Cálculo do Preço Único (Modo Rápido) ───────────────────────────
  const singleResult = useMemo(() => {
    return calculateItem(toNumber(wholesale));
  }, [wholesale, calculateItem]);

  // ── Cálculo da Tabela Unificada de Variantes (Totalmente Reativo) ───
  const variantResults = useMemo(() => {
    const baseNum = toNumber(baseWholesaleGrade);
    const freightNum = resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const packagingNum = resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const otherNum = resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1);

    return variants.map((v) => {
      const hasCustomCost = v.wholesaleCost !== undefined && v.wholesaleCost !== "" && toNumber(v.wholesaleCost) > 0;
      const wholesaleNum = hasCustomCost ? toNumber(v.wholesaleCost) : baseNum;
      const qty = v.qty && v.qty > 0 ? v.qty : 1;

      // Decide qual ramificação usar com base na estratégia + modo isolado
      if (strategy === "margin") {
        const effectiveMargin =
          gradePricingMode === "isolated" &&
          v.customMargin !== undefined && v.customMargin !== "" &&
          toNumber(v.customMargin) > 0
            ? toNumber(v.customMargin)
            : desiredMargin;

        const res = computePricingByMargin({
          wholesale_cost: wholesaleNum,
          freight_cost: freightNum,
          packaging_cost: packagingNum,
          other_costs: otherNum,
          desired_margin_pct: effectiveMargin,
          tax_pct: tax,
          card_rate_pct: cardRate,
        });
        return {
          ...v, qty, wholesaleNum,
          isCustomCost: hasCustomCost && wholesaleNum !== baseNum,
          realCost: res.realCost,
          suggestedPrice: res.suggestedPrice,
          profit: res.profit,
          marginOnPrice: res.marginOnPrice,
          markupOnCost: res.markupOnCost,
          deductions: res.deductions,
          isCustomPrice: false,
          marginHealth: res.marginHealth,
        };

      } else if (strategy === "markup") {
        const effectiveMarkup =
          gradePricingMode === "isolated" &&
          v.customMarkup !== undefined && v.customMarkup !== "" &&
          toNumber(v.customMarkup) > 0
            ? toNumber(v.customMarkup)
            : markup;

        const res = computePricing({
          wholesale_cost: wholesaleNum,
          freight_cost: freightNum,
          packaging_cost: packagingNum,
          other_costs: otherNum,
          margin_pct: effectiveMarkup,
          tax_pct: tax,
          card_rate_pct: cardRate,
        });
        const totalDeductions = res.suggestedPrice * ((tax + cardRate) / 100);
        return {
          ...v, qty, wholesaleNum,
          isCustomCost: hasCustomCost && wholesaleNum !== baseNum,
          realCost: res.realCost,
          suggestedPrice: res.suggestedPrice,
          profit: res.profit,
          marginOnPrice: res.marginOnPrice,
          markupOnCost: res.markupOnCost,
          deductions: totalDeductions,
          isCustomPrice: false,
          marginHealth: getMarginHealth(res.marginOnPrice),
        };

      } else {
        // direct_price: usa customSalePrice individual (isolado) ou preço fixo global
        const hasExplicitManualPrice =
          gradePricingMode === "isolated" &&
          v.customSalePrice !== undefined && v.customSalePrice !== "" &&
          toNumber(v.customSalePrice) > 0;
        const targetPriceStr = hasExplicitManualPrice ? v.customSalePrice : directSalePrice;
        const res = computeReversePricing({
          wholesale_cost: wholesaleNum,
          freight_cost: freightNum,
          packaging_cost: packagingNum,
          other_costs: otherNum,
          sale_price: toNumber(targetPriceStr),
          tax_pct: tax,
          card_rate_pct: cardRate,
        });
        return {
          ...v, qty, wholesaleNum,
          isCustomCost: hasCustomCost && wholesaleNum !== baseNum,
          realCost: res.realCost,
          suggestedPrice: res.salePrice,
          profit: res.profit,
          marginOnPrice: res.marginOnPrice,
          markupOnCost: res.markupOnCost,
          deductions: res.deductions,
          isCustomPrice: hasExplicitManualPrice,
          marginHealth: res.marginHealth,
        };
      }
    });
  }, [variants, baseWholesaleGrade, gradePricingMode, strategy, desiredMargin, markup, directSalePrice,
      freight, freightMode, packaging, packagingMode, other, otherMode, actualLotUnits, tax, cardRate]);

  // ── Resumo Geral de Preços (Faixas, Médias e Totais do Lote) ───────
  const summaryPrices = useMemo(() => {
    if (mode === "rapida") {
      return {
        minSuggested: singleResult.suggestedPrice,
        maxSuggested: singleResult.suggestedPrice,
        avgSuggested: singleResult.suggestedPrice,
        avgProfit: singleResult.profit,
        avgCost: singleResult.realCost,
        avgMargin: singleResult.marginOnPrice,
        avgMarkup: singleResult.markupOnCost,
        totalRevenue: singleResult.suggestedPrice,
        totalInvestment: singleResult.realCost,
        totalProfit: singleResult.profit,
        marginHealth: singleResult.marginHealth,
        hasMultiple: false,
      };
    }

    const valid = variantResults.filter((i) => i.wholesaleNum > 0);
    if (!valid.length) {
      if (actualLotUnits === 0 && !toNumber(baseWholesaleGrade)) {
        return {
          minSuggested: 0,
          maxSuggested: 0,
          avgSuggested: 0,
          avgProfit: 0,
          avgCost: 0,
          avgMargin: 0,
          avgMarkup: 0,
          totalRevenue: 0,
          totalInvestment: 0,
          totalProfit: 0,
          marginHealth: getMarginHealth(0),
          hasMultiple: false,
        };
      }
      // Projeção contábil unitária para quando ainda não há variantes com quantidade no lote
      const effectiveWholesale = toNumber(baseWholesaleGrade) > 0
        ? toNumber(baseWholesaleGrade)
        : (variants.length > 0 && variants[0] && toNumber(variants[0].wholesaleCost) > 0
          ? toNumber(variants[0].wholesaleCost)
          : toNumber(wholesale));
      const sharedPerUnit =
        resolvePerUnit(freight, freightMode, 1) +
        resolvePerUnit(packaging, packagingMode, 1) +
        resolvePerUnit(other, otherMode, 1);
      const unitCost = effectiveWholesale + sharedPerUnit;

      const totalDeductionsFrac = (tax + cardRate) / 100;
      let projPrice = 0;
      let projProfit = 0;
      let projMargin = 0;

      if (unitCost > 0) {
        if (strategy === "margin") {
          const m = desiredMargin || 50;
          const div = 1 - (totalDeductionsFrac + m / 100);
          projPrice = div > 0.05 ? unitCost / div : 0;
          projMargin = m;
          projProfit = projPrice > 0 ? projPrice * (1 - totalDeductionsFrac) - unitCost : 0;
        } else if (strategy === "markup") {
          const mk = markup || 100;
          const base = unitCost * (1 + mk / 100);
          const div = 1 - totalDeductionsFrac;
          projPrice = div > 0.05 ? base / div : 0;
          projProfit = projPrice > 0 ? projPrice * (1 - totalDeductionsFrac) - unitCost : 0;
          projMargin = projPrice > 0 ? (projProfit / projPrice) * 100 : 0;
        } else {
          projPrice = toNumber(directSalePrice);
          projProfit = projPrice > 0 ? projPrice * (1 - totalDeductionsFrac) - unitCost : 0;
          projMargin = projPrice > 0 ? (projProfit / projPrice) * 100 : 0;
        }
      }

      return {
        minSuggested: projPrice,
        maxSuggested: projPrice,
        avgSuggested: projPrice,
        avgProfit: projProfit,
        avgCost: unitCost,
        avgMargin: projMargin,
        avgMarkup: unitCost > 0 ? (projProfit / unitCost) * 100 : 0,
        totalRevenue: 0,
        totalInvestment: 0,
        totalProfit: 0,
        marginHealth: getMarginHealth(projMargin),
        hasMultiple: false,
      };
    }

    const prices = valid.map((v) => v.suggestedPrice);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const totalQty = valid.reduce((a, b) => a + b.qty, 0) || 1;
    const totalRev = valid.reduce((a, b) => a + b.suggestedPrice * b.qty, 0);
    const totalInv = valid.reduce((a, b) => a + b.realCost * b.qty, 0);
    const totalProf = valid.reduce((a, b) => a + b.profit * b.qty, 0);

    const avgP = totalRev / totalQty;
    const avgProf = totalProf / totalQty;
    const avgC = totalInv / totalQty;
    const avgMarg = avgP > 0 ? (avgProf / avgP) * 100 : 0;
    const avgMark = avgC > 0 ? (avgProf / avgC) * 100 : 0;

    return {
      minSuggested: minP,
      maxSuggested: maxP,
      avgSuggested: avgP,
      avgProfit: avgProf,
      avgCost: avgC,
      avgMargin: avgMarg,
      avgMarkup: avgMark,
      totalRevenue: totalRev,
      totalInvestment: totalInv,
      totalProfit: totalProf,
      marginHealth: getMarginHealth(avgMarg),
      hasMultiple: valid.length > 1 && Math.abs(minP - maxP) > 0.05,
    };
  }, [mode, singleResult, variantResults, variants.length, baseWholesaleGrade, wholesale, freight, packaging, other, freightMode, packagingMode, otherMode, tax, cardRate, strategy, desiredMargin, markup, directSalePrice]);

  // ── Detecção Adaptativa de Faixas de Custo Real ───────────────────
  const variantRealCosts = useMemo(() => {
    const baseShared =
      resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1) +
      resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1) +
      resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const baseTotalCost = toNumber(baseWholesaleGrade) + baseShared;

    if (mode !== "grade" || variantResults.length === 0) {
      return { minCost: baseTotalCost, maxCost: baseTotalCost, hasMultipleCosts: false, baseShared };
    }

    const validCosts = variantResults
      .map((v) => v.realCost)
      .filter((c) => c > 0);

    if (validCosts.length <= 1) {
      return { minCost: baseTotalCost, maxCost: baseTotalCost, hasMultipleCosts: false, baseShared };
    }

    const minC = Math.min(...validCosts);
    const maxC = Math.max(...validCosts);
    return {
      minCost: minC,
      maxCost: maxC,
      hasMultipleCosts: Math.abs(minC - maxC) > 0.05,
      baseShared,
    };
  }, [mode, variantResults, baseWholesaleGrade, freight, packaging, other, freightMode, packagingMode, otherMode, actualLotUnits]);

  // ── Simulador de Meios de Pagamento & Perdas ───────────────────────
  const paymentScenarios = useMemo(() => {
    return computePaymentScenarios(
      summaryPrices.avgSuggested,
      summaryPrices.avgCost,
      tax,
      cardRate,
    );
  }, [summaryPrices.avgSuggested, summaryPrices.avgCost, tax, cardRate]);


  // Total consolidado de peças de TODOS os modelos do lote (v74)
  const totalLoteUnits = useMemo(() => {
    if (mode !== "grade") return actualLotUnits;
    return gradeModels.reduce((acc, m) => {
      const modelUnits = (m.id === activeModelId ? variants : m.variants).reduce((sum, v) => sum + (v.qty || 1), 0);
      return acc + modelUnits;
    }, 0);
  }, [gradeModels, mode, actualLotUnits, activeModelId, variants]);

  // ── Ponto de Cobertura do Lote (Break-Even Dinâmico) ────────────────
  const lotBreakEven = useMemo(() => {
    return computeLotBreakEven(
      summaryPrices.avgSuggested,
      summaryPrices.avgCost,
      actualLotUnits,
      tax,
      cardRate,
    );
  }, [summaryPrices.avgSuggested, summaryPrices.avgCost, actualLotUnits, tax, cardRate]);

  // ── Agrupamento por Cor com Ordenação Canônica de Tamanhos ──────────
  const colorGroups = useMemo(() => {
    const map = new Map<string, typeof variantResults>();

    // Inicializa o mapa com todas as cores ativas cadastradas
    activeColors.forEach((c) => {
      map.set(c, []);
    });

    variantResults.forEach((v) => {
      if (!map.has(v.color)) {
        map.set(v.color, []);
      }
      map.get(v.color)!.push(v);
    });

    const groups: {
      color: string;
      items: typeof variantResults;
      totalItems: number;
      totalUnits: number;
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
      avgPrice: number;
      avgCost: number;
      avgProfit: number;
      avgMargin: number;
      health: MarginHealth;
    }[] = [];

    map.forEach((items, color) => {
      // Ordena os itens da cor na sequência canônica da moda (PP -> GG -> G1 -> 36 -> 38... -> Único)
      const sortedItems = [...items].sort((a, b) => {
        const idxA = CANONICAL_SIZE_ORDER.indexOf(a.size);
        const idxB = CANONICAL_SIZE_ORDER.indexOf(b.size);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.size.localeCompare(b.size);
      });

      const groupTotalQty = sortedItems.reduce((a, b) => a + (b.qty || 1), 0);
      const groupTotalRev = sortedItems.reduce((a, b) => a + b.suggestedPrice * (b.qty || 1), 0);
      const groupTotalCost = sortedItems.reduce((a, b) => a + b.realCost * (b.qty || 1), 0);
      const groupTotalProf = sortedItems.reduce((a, b) => a + b.profit * (b.qty || 1), 0);
      const avgPrice = groupTotalQty > 0 ? groupTotalRev / groupTotalQty : 0;
      const avgCost = groupTotalQty > 0 ? groupTotalCost / groupTotalQty : 0;
      const avgProfit = groupTotalQty > 0 ? groupTotalProf / groupTotalQty : 0;
      const avgMargin = avgPrice > 0 ? (avgProfit / avgPrice) * 100 : 0;

      groups.push({
        color,
        items: sortedItems,
        totalItems: sortedItems.length,
        totalUnits: groupTotalQty,
        totalRevenue: groupTotalRev,
        totalCost: groupTotalCost,
        totalProfit: groupTotalProf,
        avgPrice,
        avgCost,
        avgProfit,
        avgMargin,
        health: getMarginHealth(avgMargin),
      });
    });

    return groups;
  }, [activeColors, variantResults]);

  // ── Ações de Manipulação da Grade por Peça / Modelo (v68) ────────
  const activeModelSizes = useMemo(() => {
    return new Set(variants.map((v) => v.size));
  }, [variants]);

  const availableModelSizes = useMemo(() => {
    const allKnown = Array.from(new Set([...ALL_FASHION_SIZES, ...variants.map((v) => v.size)]));
    return sortCanonicalSizes(allKnown);
  }, [variants]);

  const toggleModelSize = (size: string) => {
    const isAlreadyActive = variants.some((v) => v.size === size);
    if (isAlreadyActive) {
      setVariants((prev) => prev.filter((v) => v.size !== size));
      toast.success(`Tamanho ${size} removido`);
    } else {
      const distinctColors = Array.from(new Set(variants.map((v) => v.color)));
      const colorsToUse = distinctColors.length > 0 ? distinctColors : (activeColors.length > 0 ? activeColors : ["Off-White"]);
      const qty = matrixDefaultQtys[size] ?? 2;
      const newRows: VariantRow[] = colorsToUse.map((color) => ({
        id: `v-${size.toLowerCase()}-${color.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`,
        size,
        color,
        wholesaleCost: baseWholesaleGrade || "",
        customSalePrice: "",
        qty,
      }));
      setVariants((prev) => {
        const next = [...prev, ...newRows];
        return next.sort((a, b) => {
          const idxA = CANONICAL_SIZE_ORDER.indexOf(a.size);
          const idxB = CANONICAL_SIZE_ORDER.indexOf(b.size);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.color.localeCompare(b.color);
        });
      });
      toast.success(`Tamanho ${size} adicionado!`);
    }
  };

  const applyModelQuickPreset = (presetSizes: string[]) => {
    const distinctColors = Array.from(new Set(variants.map((v) => v.color)));
    const colorsToUse = distinctColors.length > 0 ? distinctColors : (activeColors.length > 0 ? activeColors : ["Off-White"]);
    const newRows: VariantRow[] = [];
    colorsToUse.forEach((color) => {
      presetSizes.forEach((size) => {
        const existing = variants.find(
          (v) => v.color.toLowerCase() === color.toLowerCase() && v.size === size,
        );
        newRows.push({
          id: existing?.id ?? `v-${size.toLowerCase()}-${color.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`,
          size,
          color,
          wholesaleCost: existing?.wholesaleCost || baseWholesaleGrade || "",
          customSalePrice: existing?.customSalePrice ?? "",
          qty: existing?.qty ?? (matrixDefaultQtys[size] ?? 2),
        });
      });
    });
    setVariants(newRows);
    toast.success(`Grade de tamanhos aplicada ao modelo!`);
  };

  const clearModelSizes = () => {
    setVariants([]);
    toast.success("Tamanhos removidos do modelo");
  };

  const updateVariantColor = (id: string, newColor: string) => {
    const clean = newColor.trim() || "Padrão";
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, color: clean } : v)));
    setActiveColors((prev) => (prev.some((c) => c.toLowerCase() === clean.toLowerCase()) ? prev : [...prev, clean]));
  };

  const duplicateVariant = (v: VariantRow) => {
    const newId = `v-${v.size.toLowerCase()}-${Date.now().toString(36)}`;
    const newRow: VariantRow = {
      id: newId,
      size: v.size,
      color: v.color,
      wholesaleCost: v.wholesaleCost,
      customSalePrice: v.customSalePrice,
      qty: v.qty ?? 1,
    };
    setVariants((prev) => {
      const next = [...prev, newRow];
      return next.sort((a, b) => {
        const idxA = CANONICAL_SIZE_ORDER.indexOf(a.size);
        const idxB = CANONICAL_SIZE_ORDER.indexOf(b.size);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.color.localeCompare(b.color);
      });
    });
    toast.success(`Nova linha para o tamanho ${v.size} adicionada!`);
  };

  const deleteVariantRow = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleAddNewVariant = (newSize: string, newColor: string, newQty: number, newCost: string) => {
    const cleanColor = newColor.trim() || "Padrão";
    const newId = `v-${newSize.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    setVariants((prev) => [
      ...prev,
      {
        id: newId,
        size: newSize,
        color: cleanColor,
        wholesaleCost: newCost,
        customSalePrice: "",
        qty: newQty,
      },
    ]);
    setActiveColors((prev) => (prev.some((c) => c.toLowerCase() === cleanColor.toLowerCase()) ? prev : [...prev, cleanColor]));
    toast.success(`Variação ${newSize} ${cleanColor} (${newQty} un.) adicionada!`);
  };

  const addNewVariantRow = () => {
    const defaultColor = variants[0]?.color || "Off-White";
    handleAddNewVariant("M", defaultColor, 2, "");
  };

  const resetPricingModel = (opts?: boolean | { silent?: boolean } | React.MouseEvent) => {
    const isSilent = opts === true || (typeof opts === "object" && opts !== null && "silent" in opts && Boolean((opts as { silent?: boolean }).silent));
    setName("");
    setCategory("");
    setWholesale("");
    setBaseWholesaleGrade("");
    setVariants([]);
    setActiveColors([]);
    setGenSizes([]);
    setGenColors([]);
    setCustomGenColor("");
    setColorStrategies({});
    setTableColorFilter("all");
    setRapidaColor("");
    setRapidaSize("");
    setRapidaQty("1");
    setShowGradeModal(false);
    setGradeModalDraft(null);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    if (!isSilent) {
      toast.success("Novo modelo iniciado!", {
        description: "Campos limpos para precificar a próxima peça.",
      });
    }
  };

  // ── Helpers de gerenciamento de múltiplos modelos (v74) ──────────
  const addNewGradeModel = () => {
    // 1. Snapshot do modelo ativo atual
    const currentSnapshot: GradeModel = {
      id: activeModelId,
      name,
      category,
      baseWholesale: baseWholesaleGrade,
      strategyMode: strategy,
      marginStr: desiredMargin.toString(),
      markupStr: markup.toString(),
      directPrice: "",
      variants,
      activeColors,
    };

    const nextIndex = gradeModels.length + 1;
    const newModel = createEmptyGradeModel(nextIndex);

    setGradeModels((prev) => {
      const updated = prev.map((m) => (m.id === activeModelId ? currentSnapshot : m));
      return [...updated, newModel];
    });

    isSwitchingModelRef.current = true;
    setActiveModelId(newModel.id);
    setName("");
    setBaseWholesaleGrade("");
    setVariants([]);
    setActiveColors([]);
    setTimeout(() => {
      isSwitchingModelRef.current = false;
    }, 50);

    toast.success(`Modelo ${nextIndex} adicionado ao lote! ✨`, {
      description: "Preencha o nome da peça e monte a grade abaixo.",
    });
  };

  const switchActiveModel = (targetId: string) => {
    if (targetId === activeModelId) return;
    const target = gradeModels.find((m) => m.id === targetId);
    if (!target) return;

    isSwitchingModelRef.current = true;
    // 1. Salvar dados do atual
    setGradeModels((prev) =>
      prev.map((m) =>
        m.id === activeModelId
          ? {
              ...m,
              name,
              category,
              baseWholesale: baseWholesaleGrade,
              variants,
              activeColors,
            }
          : m
      )
    );

    // 2. Carregar dados do selecionado
    setActiveModelId(targetId);
    setName(target.name);
    setCategory(target.category);
    setBaseWholesaleGrade(target.baseWholesale);
    setVariants(target.variants);
    setActiveColors(target.activeColors);

    setTimeout(() => {
      isSwitchingModelRef.current = false;
    }, 50);
  };

  const removeGradeModel = (id: string) => {
    if (gradeModels.length <= 1) {
      const fresh = createEmptyGradeModel(1);
      setGradeModels([fresh]);
      isSwitchingModelRef.current = true;
      setActiveModelId(fresh.id);
      setName("");
      setCategory("");
      setBaseWholesaleGrade("");
      setVariants([]);
      setActiveColors([]);
      setTimeout(() => {
        isSwitchingModelRef.current = false;
      }, 50);
      toast.success("Modelo limpo");
      return;
    }

    const remaining = gradeModels.filter((m) => m.id !== id);
    setGradeModels(remaining);

    if (activeModelId === id) {
      const next = remaining[0]!;
      isSwitchingModelRef.current = true;
      setActiveModelId(next.id);
      setName(next.name);
      setCategory(next.category);
      setBaseWholesaleGrade(next.baseWholesale);
      setVariants(next.variants);
      setActiveColors(next.activeColors);
      setTimeout(() => {
        isSwitchingModelRef.current = false;
      }, 50);
    }

    toast.success("Modelo removido do lote");
  };

  // Sincronização reativa do modelo ativo para o array gradeModels
  useEffect(() => {
    if (mode !== "grade" || !activeModelId || isSwitchingModelRef.current) return;
    setGradeModels((prev) =>
      prev.map((m) =>
        m.id === activeModelId
          ? {
              ...m,
              name,
              category,
              baseWholesale: baseWholesaleGrade,
              variants,
              activeColors,
            }
          : m
      )
    );
  }, [name, category, baseWholesaleGrade, variants, activeColors, mode, activeModelId]);

  const replicateGradeInColor = (newColor: string) => {
    const cleanColor = newColor.trim();
    if (!cleanColor) return;

    // Obtém todos os tamanhos únicos atualmente na grade (ou os presets padrão)
    const existingSizes = Array.from(new Set(variants.map((v) => v.size)));
    const sizesToReplicate = existingSizes.length > 0 ? sortCanonicalSizes(existingSizes) : ["P", "M", "G", "GG"];

    const newRows: VariantRow[] = [];
    sizesToReplicate.forEach((sz) => {
      const alreadyExists = variants.some(
        (v) => v.size === sz && v.color.toLowerCase() === cleanColor.toLowerCase(),
      );
      if (!alreadyExists) {
        const matchingOriginal = variants.find((v) => v.size === sz);
        const qty = matchingOriginal?.qty ?? matrixDefaultQtys[sz] ?? 2;
        newRows.push({
          id: `v-${sz.toLowerCase()}-${cleanColor.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          size: sz,
          color: cleanColor,
          wholesaleCost: matchingOriginal?.wholesaleCost || baseWholesaleGrade || "",
          customSalePrice: matchingOriginal?.customSalePrice ?? "",
          qty,
        });
      }
    });

    if (newRows.length === 0) {
      toast.info(`A grade já possui todas as variações para a cor "${cleanColor}".`);
      return;
    }

    setVariants((prev) => {
      const combined = [...prev, ...newRows];
      return combined.sort((a, b) => {
        const colCompare = a.color.localeCompare(b.color);
        if (colCompare !== 0) return colCompare;
        const idxA = CANONICAL_SIZE_ORDER.indexOf(a.size);
        const idxB = CANONICAL_SIZE_ORDER.indexOf(b.size);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.size.localeCompare(b.size);
      });
    });

    setActiveColors((prev) => {
      if (prev.some((c) => c.toLowerCase() === cleanColor.toLowerCase())) return prev;
      return [...prev, cleanColor];
    });

    toast.success(`Grade replicada na cor ${cleanColor}! ✨`, {
      description: `${newRows.length} novas variações adicionadas à tabela.`,
    });
  };

  const applyStrategyToModel = () => {
    const margin = toNumber(matrixGlobalMarginStr) || 50;
    const markupVal = toNumber(matrixGlobalMarkupStr) || 100;
    const trimmedCost = baseWholesaleGrade.trim();
    const distinctColors = Array.from(new Set(variants.map((v) => v.color)));
    const colorsToSet = distinctColors.length > 0 ? distinctColors : ["Off-White"];
    setColorStrategies((prev) => {
      const updated = { ...prev };
      colorsToSet.forEach((col) => {
        updated[col.toLowerCase()] = {
          ...DEFAULT_COLOR_STRATEGY,
          mode: matrixGlobalMode,
          margin,
          markup: markupVal,
          directPrice: matrixGlobalDirectPrice,
        };
      });
      return updated;
    });
    setVariants((cur) =>
      cur.map((v) => ({
        ...v,
        wholesaleCost: trimmedCost ? trimmedCost : v.wholesaleCost,
        customSalePrice: "",
      }))
    );
    const label =
      matrixGlobalMode === "margin"
        ? `Margem ${matrixGlobalMarginStr}%`
        : matrixGlobalMode === "markup"
          ? `Markup ${matrixGlobalMarkupStr}%`
          : `Preço R$ ${matrixGlobalDirectPrice}`;
    toast.success(`${label} e custo atacado aplicados ao modelo!`);
  };

  const displayedVariants = useMemo(() => {
    return [...variantResults].sort((a, b) => {
      const colCompare = a.color.localeCompare(b.color);
      if (colCompare !== 0) return colCompare;
      const idxA = CANONICAL_SIZE_ORDER.indexOf(a.size);
      const idxB = CANONICAL_SIZE_ORDER.indexOf(b.size);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.size.localeCompare(b.size);
    });
  }, [variantResults]);

  const filteredVariants = useMemo(() => {
    if (tableColorFilter === "all") return displayedVariants;
    return displayedVariants.filter(
      (v) => v.color.toLowerCase() === tableColorFilter.toLowerCase()
    );
  }, [displayedVariants, tableColorFilter]);

  const distinctModelColors = useMemo(() => {
    const fromVariants = Array.from(new Set(variants.map((v) => v.color)));
    const combined = Array.from(new Set([...activeColors, ...fromVariants]));
    return combined.filter(Boolean);
  }, [activeColors, variants]);

  const toggleSizeInGrade = (sz: string) => {
    const isCurrentlyActive = variants.some((v) => v.size === sz);
    if (isCurrentlyActive) {
      setVariants((prev) => prev.filter((v) => v.size !== sz));
      setMatrixSizes((prev) => prev.filter((s) => s !== sz));
      toast.success(`Tamanho ${sz} removido da grade`);
    } else {
      const colorsToUse = activeColors.length > 0 ? activeColors : ["Off-White"];
      if (activeColors.length === 0) {
        setActiveColors(["Off-White"]);
      }
      setMatrixSizes((prev) => sortCanonicalSizes([...prev, sz]));
      const newRows: VariantRow[] = colorsToUse.map((color) => ({
        id: `v-${sz.toLowerCase()}-${color.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        size: sz,
        color,
        wholesaleCost: baseWholesaleGrade || "",
        customSalePrice: "",
        qty: matrixDefaultQtys[sz] ?? 2,
      }));
      setVariants((prev) => {
        const combined = [...prev, ...newRows];
        return combined.sort((a, b) => {
          const colComp = a.color.localeCompare(b.color);
          if (colComp !== 0) return colComp;
          const idxA = CANONICAL_SIZE_ORDER.indexOf(a.size);
          const idxB = CANONICAL_SIZE_ORDER.indexOf(b.size);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.size.localeCompare(b.size);
        });
      });
      toast.success(`Tamanho ${sz} adicionado à grade`);
    }
  };

  const applySizePreset = (presetSizes: string[]) => {
    setMatrixSizes(presetSizes);
    const colorsToUse = activeColors.length > 0 ? activeColors : ["Off-White"];
    if (activeColors.length === 0) {
      setActiveColors(["Off-White"]);
    }
    const newRows: VariantRow[] = [];
    colorsToUse.forEach((color) => {
      presetSizes.forEach((sz) => {
        const existing = variants.find(
          (v) => v.color.toLowerCase() === color.toLowerCase() && v.size === sz
        );
        newRows.push({
          id: existing?.id ?? `v-${sz.toLowerCase()}-${color.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          size: sz,
          color,
          wholesaleCost: existing?.wholesaleCost || baseWholesaleGrade || "",
          customSalePrice: existing?.customSalePrice ?? "",
          qty: existing?.qty ?? (matrixDefaultQtys[sz] ?? 2),
        });
      });
    });
    setVariants(newRows);
    toast.success(`Grade de tamanhos aplicada: ${presetSizes.join(", ")}`);
  };

  const clearGradeSizes = () => {
    setMatrixSizes([]);
    setVariants([]);
    toast.success("Grade de tamanhos limpa");
  };

  const handleAddCustomVariations = (colorName: string, sizes: string[]) => {
    const cleanColor = colorName.trim();
    if (!cleanColor) {
      toast.error("Por favor, selecione ou digite uma cor.");
      return;
    }
    if (sizes.length === 0) {
      toast.error("Selecione ao menos um tamanho para esta cor.");
      return;
    }

    if (!activeColors.some((c) => c.toLowerCase() === cleanColor.toLowerCase())) {
      setActiveColors((prev) => [...prev, cleanColor]);
    }

    const existingSizesForThisColor = variants
      .filter((v) => v.color.toLowerCase() === cleanColor.toLowerCase())
      .map((v) => v.size);

    const sizesToAdd = sizes.filter((s) => !existingSizesForThisColor.includes(s));
    if (sizesToAdd.length === 0) {
      toast.error(`Todas as variações selecionadas (${cleanColor}: ${sizes.join(", ")}) já existem na grade.`);
      return;
    }

    const newRows: VariantRow[] = sizesToAdd.map((sz) => ({
      id: `v-${sz.toLowerCase()}-${cleanColor.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      size: sz,
      color: cleanColor,
      wholesaleCost: baseWholesaleGrade || "",
      customSalePrice: "",
      qty: matrixDefaultQtys[sz] ?? 1,
    }));

    setVariants((prev) => {
      const combined = [...prev, ...newRows];
      return combined.sort((a, b) => {
        const colComp = a.color.localeCompare(b.color);
        if (colComp !== 0) return colComp;
        const idxA = CANONICAL_SIZE_ORDER.indexOf(a.size);
        const idxB = CANONICAL_SIZE_ORDER.indexOf(b.size);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.size.localeCompare(b.size);
      });
    });

    toast.success(
      `${sizesToAdd.length} ${sizesToAdd.length === 1 ? "variação adicionada" : "variações adicionadas"} (${cleanColor}: ${sizesToAdd.join(", ")})`
    );

    setQuickAddColor("");
    setQuickAddSizes([]);
    setColorSearchQuery("");
    setShowColorInput(false);
  };

  const addColorToGrade = (colName: string) => {
    const clean = colName.trim();
    if (!clean) return;
    if (activeColors.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      toast.error(`Cor "${clean}" já está na grade`);
      return;
    }
    const newActiveColors = [...activeColors, clean];
    setActiveColors(newActiveColors);

    const currentSizes = Array.from(new Set(variants.map((v) => v.size)));
    const sizesToUse = currentSizes.length > 0 ? currentSizes : (matrixSizes.length > 0 ? matrixSizes : ["P", "M", "G", "GG"]);
    if (matrixSizes.length === 0) {
      setMatrixSizes(sizesToUse);
    }

    const newRows: VariantRow[] = sizesToUse.map((sz) => ({
      id: `v-${sz.toLowerCase()}-${clean.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      size: sz,
      color: clean,
      wholesaleCost: baseWholesaleGrade || "",
      customSalePrice: "",
      qty: matrixDefaultQtys[sz] ?? 2,
    }));

    setVariants((prev) => {
      const combined = [...prev, ...newRows];
      return combined.sort((a, b) => {
        const colComp = a.color.localeCompare(b.color);
        if (colComp !== 0) return colComp;
        const idxA = CANONICAL_SIZE_ORDER.indexOf(a.size);
        const idxB = CANONICAL_SIZE_ORDER.indexOf(b.size);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.size.localeCompare(b.size);
      });
    });
    toast.success(`Cor "${clean}" adicionada à grade`);
  };

  const removeColorFromGrade = (colName: string) => {
    setActiveColors((prev) => prev.filter((c) => c.toLowerCase() !== colName.toLowerCase()));
    setVariants((prev) => prev.filter((v) => v.color.toLowerCase() !== colName.toLowerCase()));
    if (tableColorFilter.toLowerCase() === colName.toLowerCase()) {
      setTableColorFilter("all");
    }
    toast.success(`Cor "${colName}" removida da grade`);
  };

  const addQuickColor = (colorName: string) => {
    const clean = colorName.trim();
    if (!clean) return;
    setActiveColors((prev) => (prev.some((c) => c.toLowerCase() === clean.toLowerCase()) ? prev : [...prev, clean]));
    const currentSizes = Array.from(new Set(variants.map((v) => v.size)));
    const sizesToUse = currentSizes.length > 0 ? currentSizes : ["P", "M", "G", "GG"];
    const newRows: VariantRow[] = sizesToUse.map((sz) => ({
      id: `v-${sz.toLowerCase()}-${clean.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`,
      size: sz,
      color: clean,
      wholesaleCost: baseWholesaleGrade || "",
      customSalePrice: "",
      qty: matrixDefaultQtys[sz] ?? 2,
    }));
    setVariants((prev) => [...prev, ...newRows]);
    toast.success(`Cor "${clean}" adicionada com grade completa!`);
  };

  // ── Handlers do Color Spotlight Autocomplete (Apple Level) ────────
  const matchingColorPresets = useMemo(() => {
    const q = colorSearchQuery.trim().toLowerCase();
    const available = COLOR_PRESETS.filter(
      (cp) => !activeColors.some((ac) => ac.toLowerCase() === cp.name.toLowerCase()),
    );
    if (!q) return available.slice(0, 12);
    return available.filter((cp) => cp.name.toLowerCase().includes(q));
  }, [colorSearchQuery, activeColors]);

  const handleSelectColorFromSpotlight = (colorName: string) => {
    addQuickColor(colorName);
    setColorSearchQuery("");
    setShowColorPopover(false);
  };

  const handleCreateCustomColorFromSpotlight = () => {
    const clean = colorSearchQuery.trim();
    if (!clean) return;
    addQuickColor(clean);
    setColorSearchQuery("");
    setShowColorPopover(false);
  };

  // ── Handlers do Color Spotlight no Modo Rápido (Apple Level) ───────
  const matchingRapidaColorPresets = useMemo(() => {
    const q = rapidaColorSearchQuery.trim().toLowerCase();
    if (!q) return COLOR_PRESETS.slice(0, 18);
    return COLOR_PRESETS.filter((cp) => cp.name.toLowerCase().includes(q));
  }, [rapidaColorSearchQuery]);

  const handleSelectRapidaColor = (colorName: string) => {
    setRapidaColor(colorName);
    setRapidaColorSearchQuery("");
    setShowRapidaColorPopover(false);
  };

  const handleCreateCustomRapidaColor = () => {
    const clean = rapidaColorSearchQuery.trim();
    if (!clean) return;
    setRapidaColor(clean);
    setRapidaColorSearchQuery("");
    setShowRapidaColorPopover(false);
  };

  // ── Ações de Manipulação da Tabela de Variantes ────────────────────
  const removeVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const updateVariantCost = (id: string, val: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, wholesaleCost: val, customSalePrice: "" } : v)),
    );
  };

  const updateVariantPrice = (id: string, val: string) => {
    if (gradePricingMode === "unified") {
      setGradePricingMode("isolated");
      toast.info("Modo Isolado ativado: personalizando preço desta variação.");
    }
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, customSalePrice: val } : v)),
    );
  };

  // Salva margem % individual para a variante (modo isolado, strategy=margin)
  const updateVariantCustomMargin = (id: string, marginPct: string) => {
    if (gradePricingMode === "unified") {
      setGradePricingMode("isolated");
      toast.info("Modo Isolado ativado: personalizando margem desta variação.");
    }
    setVariants((prev) =>
      prev.map((v) => v.id === id ? { ...v, customMargin: marginPct, customSalePrice: "" } : v)
    );
  };

  // Salva markup % individual para a variante (modo isolado, strategy=markup)
  const updateVariantCustomMarkup = (id: string, markupPct: string) => {
    if (gradePricingMode === "unified") {
      setGradePricingMode("isolated");
      toast.info("Modo Isolado ativado: personalizando markup desta variação.");
    }
    setVariants((prev) =>
      prev.map((v) => v.id === id ? { ...v, customMarkup: markupPct, customSalePrice: "" } : v)
    );
  };

  const applyBulkQty = (qty: number) => {
    const val = Math.max(1, qty);
    setVariants((prev) => prev.map((v) => ({ ...v, qty: val })));
    toast.success(`Quantidade ${val} un. aplicada a todas as variações`);
  };

  const updateVariantQty = (id: string, qty: number) => {
    const safeQty = Math.max(1, Math.floor(qty) || 1);
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, qty: safeQty } : v)),
    );
  };

  const openRateioAssistant = (target: "freight" | "packaging" | "other") => {
    setRateioTarget(target);
    setRateioTotal("");
    setRateioPieces(actualLotUnits > 0 ? String(actualLotUnits) : "20");
  };

  const applyRateio = () => {
    if (!rateioTarget) return;
    const total = toNumber(rateioTotal);
    const pieces = Math.max(1, Number(rateioPieces) || 1);
    if (total <= 0) {
      toast.error("Informe um valor total maior que zero");
      return;
    }
    const perUnit = total / pieces;
    const formatted = perUnit.toFixed(2).replace(".", ",");

    if (rateioTarget === "freight") {
      setFreight(formatted);
      toast.success(`Frete rateado: R$ ${formatted}/peça (R$ ${total.toFixed(2)} ÷ ${pieces} un.)`);
    } else if (rateioTarget === "packaging") {
      setPackaging(formatted);
      toast.success(`Embalagem rateada: R$ ${formatted}/peça (R$ ${total.toFixed(2)} ÷ ${pieces} un.)`);
    } else if (rateioTarget === "other") {
      setOther(formatted);
      toast.success(`Outros custos rateados: R$ ${formatted}/peça (R$ ${total.toFixed(2)} ÷ ${pieces} un.)`);
    }
    setRateioTarget(null);
  };

  const computePriceForVariantMargin = (wholesaleCost: number, targetMargin: number): number => {
    const freightNum = resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const packagingNum = resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const otherNum = resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const realCost = wholesaleCost + freightNum + packagingNum + otherNum;
    const divisor = 1 - (targetMargin + tax + cardRate) / 100;
    if (divisor <= 0) return 0;
    return realCost / divisor;
  };

  const computePriceForVariantMarkup = (wholesaleCost: number, targetMarkup: number): number => {
    const freightNum = resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const packagingNum = resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const otherNum = resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1);
    const realCost = wholesaleCost + freightNum + packagingNum + otherNum;
    const totalDeductions = (tax + cardRate) / 100;
    const divisor = Math.max(1 - totalDeductions, 0.01);
    return (realCost * (1 + targetMarkup / 100)) / divisor;
  };

  const updateVariantMargin = (id: string, marginPct: number) => {
    const target = variantResults.find((v) => v.id === id);
    if (!target) return;
    const price = computePriceForVariantMargin(target.wholesaleNum, marginPct);
    if (price > 0) {
      if (gradePricingMode === "unified") {
        setGradePricingMode("isolated");
      }
      updateVariantPrice(id, price.toFixed(2).replace(".", ","));
      toast.success(`Tamanho ${target.size}: margem definida em ${marginPct}% (R$ ${price.toFixed(2).replace(".", ",")})`);
    }
  };

  const updateVariantMarkup = (id: string, markupPct: number) => {
    const target = variantResults.find((v) => v.id === id);
    if (!target) return;
    const price = computePriceForVariantMarkup(target.wholesaleNum, markupPct);
    if (price > 0) {
      if (gradePricingMode === "unified") {
        setGradePricingMode("isolated");
      }
      updateVariantPrice(id, price.toFixed(2).replace(".", ","));
      toast.success(`Tamanho ${target.size}: markup definido em ${markupPct}% (R$ ${price.toFixed(2).replace(".", ",")})`);
    }
  };

  const applyCostToColor = (color: string, costStr: string) => {
    const v = toNumber(costStr);
    if (v <= 0) return;
    setVariants((prev) =>
      prev.map((vr) => (vr.color.toLowerCase() === color.toLowerCase() ? { ...vr, wholesaleCost: costStr, customSalePrice: "" } : vr))
    );
    toast.success(`Custo de R$ ${costStr} aplicado em todos os tamanhos de ${color}`);
  };

  const applyPriceToColor = (color: string, priceStr: string) => {
    const p = toNumber(priceStr);
    if (p <= 0) return;
    setVariants((prev) =>
      prev.map((vr) => (vr.color.toLowerCase() === color.toLowerCase() ? { ...vr, customSalePrice: priceStr } : vr))
    );
    toast.success(`Preço de R$ ${priceStr} aplicado em todos os tamanhos de ${color}`);
  };

  const applyMarginToColor = (color: string, marginPct: number) => {
    updateColorMargin(color, marginPct);
    toast.success(`Margem de ${marginPct}% aplicada a todos os tamanhos de ${color}`);
  };

  // ── Estratégia Completa por Cor com Live-Sync Reativo (Margem / Markup / Preço Fixo) ──────

  const getColorStrategy = (color: string): ColorStrategy =>
    colorStrategies[color.toLowerCase()] ?? DEFAULT_COLOR_STRATEGY;

  const setColorStrategy = (color: string, patch: Partial<ColorStrategy>) => {
    setColorStrategies((prev) => {
      const current = prev[color.toLowerCase()] ?? DEFAULT_COLOR_STRATEGY;
      return { ...prev, [color.toLowerCase()]: { ...current, ...patch } };
    });
  };

  const updateColorMargin = (color: string, marginVal: number | string) => {
    // Permite strings intermediárias com vírgula (ex: "13,", "13,5") durante digitação
    if (marginVal === "" || marginVal === undefined || marginVal === "," || marginVal === ".") {
      setColorStrategies((prev) => {
        const current = prev[color.toLowerCase()] ?? DEFAULT_COLOR_STRATEGY;
        return { ...prev, [color.toLowerCase()]: { ...current, mode: "margin", margin: "" } };
      });
      return;
    }
    // Se for string com vírgula ou ponto incompleto (ex: "13,"), guarda como string sem clampar
    const strVal = String(marginVal);
    if (strVal.endsWith(",") || strVal.endsWith(".")) {
      setColorStrategies((prev) => {
        const current = prev[color.toLowerCase()] ?? DEFAULT_COLOR_STRATEGY;
        return { ...prev, [color.toLowerCase()]: { ...current, mode: "margin", margin: strVal } };
      });
      return;
    }
    // Número completo: converte usando toNumber (aceita vírgula BR) e clampeia
    const num = typeof marginVal === "number" ? marginVal : toNumber(String(marginVal));
    if (isNaN(num) || num === 0) {
      // Guarda a string bruta para permitir edição contínua
      setColorStrategies((prev) => {
        const current = prev[color.toLowerCase()] ?? DEFAULT_COLOR_STRATEGY;
        return { ...prev, [color.toLowerCase()]: { ...current, mode: "margin", margin: strVal } };
      });
      return;
    }
    const safeMargin = Math.min(85, Math.max(1, num));
    setColorStrategies((prev) => {
      const current = prev[color.toLowerCase()] ?? DEFAULT_COLOR_STRATEGY;
      return { ...prev, [color.toLowerCase()]: { ...current, mode: "margin", margin: safeMargin } };
    });
    setVariants((prev) =>
      prev.map((vr) => (vr.color.toLowerCase() === color.toLowerCase() ? { ...vr, customSalePrice: "" } : vr))
    );
  };

  const updateColorMarkup = (color: string, markupVal: number | string) => {
    // Permite strings intermediárias com vírgula (ex: "115,", "115,5") durante digitação
    if (markupVal === "" || markupVal === undefined || markupVal === "," || markupVal === ".") {
      setColorStrategies((prev) => {
        const current = prev[color.toLowerCase()] ?? DEFAULT_COLOR_STRATEGY;
        return { ...prev, [color.toLowerCase()]: { ...current, mode: "markup", markup: "" } };
      });
      return;
    }
    // Se for string com vírgula ou ponto incompleto (ex: "115,"), guarda como string sem clampar
    const strVal = String(markupVal);
    if (strVal.endsWith(",") || strVal.endsWith(".")) {
      setColorStrategies((prev) => {
        const current = prev[color.toLowerCase()] ?? DEFAULT_COLOR_STRATEGY;
        return { ...prev, [color.toLowerCase()]: { ...current, mode: "markup", markup: strVal } };
      });
      return;
    }
    // Número completo: converte usando toNumber (aceita vírgula BR) e clampeia
    const num = typeof markupVal === "number" ? markupVal : toNumber(String(markupVal));
    if (isNaN(num) || num === 0) {
      // Guarda a string bruta para permitir edição contínua
      setColorStrategies((prev) => {
        const current = prev[color.toLowerCase()] ?? DEFAULT_COLOR_STRATEGY;
        return { ...prev, [color.toLowerCase()]: { ...current, mode: "markup", markup: strVal } };
      });
      return;
    }
    const safeMarkup = Math.min(300, Math.max(1, num));
    setColorStrategies((prev) => {
      const current = prev[color.toLowerCase()] ?? DEFAULT_COLOR_STRATEGY;
      return { ...prev, [color.toLowerCase()]: { ...current, mode: "markup", markup: safeMarkup } };
    });
    setVariants((prev) =>
      prev.map((vr) => (vr.color.toLowerCase() === color.toLowerCase() ? { ...vr, customSalePrice: "" } : vr))
    );
  };

  const updateColorDirectPrice = (color: string, priceStr: string) => {
    setColorStrategies((prev) => {
      const current = prev[color.toLowerCase()] ?? DEFAULT_COLOR_STRATEGY;
      return { ...prev, [color.toLowerCase()]: { ...current, mode: "direct_price", directPrice: priceStr } };
    });
    const p = toNumber(priceStr);
    if (p > 0) {
      setVariants((prev) =>
        prev.map((vr) =>
          vr.color.toLowerCase() === color.toLowerCase()
            ? { ...vr, customSalePrice: priceStr }
            : vr
        )
      );
    }
  };

  const applyStrategyToColor = (color: string) => {
    const cs = getColorStrategy(color);
    if (cs.mode === "margin") {
      const m = typeof cs.margin === "number" ? cs.margin : (toNumber(cs.margin) || 50);
      updateColorMargin(color, m);
    } else if (cs.mode === "markup") {
      const mk = typeof cs.markup === "number" ? cs.markup : (toNumber(cs.markup) || 100);
      updateColorMarkup(color, mk);
    } else if (cs.mode === "direct_price") {
      updateColorDirectPrice(color, cs.directPrice);
    }
    const label =
      cs.mode === "margin" ? `Margem ${cs.margin}%` :
      cs.mode === "markup" ? `Markup ${cs.markup}%` :
      `Preço Fixo R$ ${cs.directPrice}`;
    toast.success(`${label} aplicado(a) a todos os tamanhos de ${color}`);
  };

  const resetVariantOverrides = (id: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, wholesaleCost: "", customSalePrice: "" } : v)),
    );
    toast.success("Valores restaurados para o padrão da grade");
  };

  const addManualVariant = () => {
    const s = manualSize.trim().toUpperCase() || "M";
    const c = manualColor.trim() || "Padrão";
    const newId = `v-${s.toLowerCase()}-${c.toLowerCase()}-${Date.now().toString(36)}`;

    // Verificar se já existe exatamente essa combinação
    const exists = variants.some((v) => v.size === s && v.color.toLowerCase() === c.toLowerCase());
    if (exists) {
      toast.error(`A variante ${s} · ${c} já está na lista`);
      return;
    }

    setVariants((prev) => [
      ...prev,
      {
        id: newId,
        size: s,
        color: c,
        wholesaleCost: manualCost.trim(),
        customSalePrice: "",
      },
    ]);
    setManualCost("");
    toast.success(`Variante ${s} · ${c} adicionada à lista!`);
  };

  // Gerar Matriz Rápida (Tamanhos × Cores)
  const generateMatrix = () => {
    if (genSizes.length === 0) {
      toast.error("Selecione ao menos um tamanho");
      return;
    }
    if (genColors.length === 0) {
      toast.error("Selecione ao menos uma cor");
      return;
    }

    const canonicalSizes = sortCanonicalSizes(genSizes);
    const newRows: VariantRow[] = [];
    canonicalSizes.forEach((sz) => {
      genColors.forEach((col) => {
        newRows.push({
          id: `v-${sz.toLowerCase()}-${col.toLowerCase().replace(/\s+/g, "-")}`,
          size: sz,
          color: col,
          wholesaleCost: "",
          customSalePrice: "",
          qty: 2,
        });
      });
    });

    setActiveColors(genColors);
    setVariants(newRows);
    setShowMatrixGenerator(false);
    toast.success(`Grade gerada com sucesso! ${newRows.length} itens criados na lista.`);
  };

  const applyPreset = (presetId: string, sizes: string[]) => {
    setActivePreset(presetId);
    setGenSizes(sizes);
  };

  const toggleGenSize = (sz: string) => {
    if (genSizes.includes(sz)) {
      setGenSizes((prev) => prev.filter((s) => s !== sz));
    } else {
      setGenSizes((prev) => [...prev, sz]);
    }
  };

  const toggleGenColor = (col: string) => {
    if (genColors.includes(col)) {
      setGenColors((prev) => prev.filter((c) => c !== col));
    } else {
      setGenColors((prev) => [...prev, col]);
    }
  };

  const addCustomGenColor = () => {
    const clean = customGenColor.trim();
    if (!clean) return;
    if (genColors.includes(clean)) {
      toast.error(`A cor "${clean}" já está selecionada`);
      return;
    }
    setGenColors((prev) => [...prev, clean]);
    setCustomGenColor("");
  };

  // ── Grid-First Matrix Helpers ───────────────────────────────────────

  /** Builds / rebuilds the full Cores × Tamanhos matrix from current setup state */
  const applyGlobalGrade = () => {
    if (activeColors.length === 0) {
      toast.error("Adicione ao menos uma cor à coleção");
      return;
    }
    if (matrixSizes.length === 0) {
      toast.error("Selecione ao menos um tamanho para a grade");
      return;
    }

    const canonical = sortCanonicalSizes(matrixSizes);
    const newRows: VariantRow[] = [];
    activeColors.forEach((col) => {
      canonical.forEach((sz) => {
        const existing = variants.find(
          (v) => v.color.toLowerCase() === col.toLowerCase() && v.size === sz
        );
        newRows.push({
          id: `v-${sz.toLowerCase()}-${col.toLowerCase().replace(/\s+/g, "-")}`,
          size: sz,
          color: col,
          wholesaleCost: existing?.wholesaleCost ?? "",
          customSalePrice: "",
          qty: existing?.qty ?? (matrixDefaultQtys[sz] ?? 1),
        });
      });
    });

    setVariants(newRows);

    // Apply global pricing strategy to all active colors
    const margin = toNumber(matrixGlobalMarginStr) || 50;
    const markupVal = toNumber(matrixGlobalMarkupStr) || 100;
    setColorStrategies((prev) => {
      const updated = { ...prev };
      activeColors.forEach((col) => {
        updated[col.toLowerCase()] = {
          ...DEFAULT_COLOR_STRATEGY,
          mode: matrixGlobalMode,
          margin,
          markup: markupVal,
          directPrice: matrixGlobalDirectPrice,
        };
      });
      return updated;
    });

    const total = activeColors.length * matrixSizes.length;
    toast.success(`Matriz gerada: ${activeColors.length} cores × ${matrixSizes.length} tamanhos = ${total} SKUs`);
    setMatrixSetupOpen(false);
  };

  /** Toggle a size in matrixSizes and sync variants accordingly */
  const toggleMatrixSize = (sz: string) => {
    if (matrixSizes.includes(sz)) {
      setMatrixSizes((prev) => prev.filter((s) => s !== sz));
      setVariants((cur) => cur.filter((v) => v.size !== sz));
    } else {
      setMatrixSizes((prev) => sortCanonicalSizes([...prev, sz]));
      const qty = matrixDefaultQtys[sz] ?? 1;
      const newRows: VariantRow[] = activeColors
        .filter((col) => !variants.some((v) => v.color.toLowerCase() === col.toLowerCase() && v.size === sz))
        .map((col) => ({
          id: `v-${sz.toLowerCase()}-${col.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
          size: sz,
          color: col,
          wholesaleCost: "",
          customSalePrice: "",
          qty,
        }));
      if (newRows.length > 0) {
        setVariants((cur) => {
          const merged = [...cur, ...newRows];
          return merged.sort((a, b) => {
            const ai = CANONICAL_SIZE_ORDER.indexOf(a.size);
            const bi = CANONICAL_SIZE_ORDER.indexOf(b.size);
            if (ai !== bi) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
            return activeColors.indexOf(a.color) - activeColors.indexOf(b.color);
          });
        });
      }
    }
  };

  /** Update quantity for a specific Color × Size cell in the matrix */
  const updateMatrixCellQty = (color: string, size: string, qty: number) => {
    const safeQty = Math.max(0, Math.round(qty) || 0);
    setVariants((prev) => {
      const exists = prev.some(
        (v) => v.color.toLowerCase() === color.toLowerCase() && v.size === size
      );
      if (exists) {
        if (safeQty === 0) {
          return prev.filter(
            (v) => !(v.color.toLowerCase() === color.toLowerCase() && v.size === size)
          );
        }
        return prev.map((v) =>
          v.color.toLowerCase() === color.toLowerCase() && v.size === size
            ? { ...v, qty: safeQty }
            : v
        );
      } else if (safeQty > 0) {
        return [
          ...prev,
          {
            id: `v-${size.toLowerCase()}-${color.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
            size,
            color,
            wholesaleCost: "",
            customSalePrice: "",
            qty: safeQty,
          },
        ];
      }
      return prev;
    });
  };

  /** Apply global pricing strategy to ALL active colors at once */
  const applyGlobalStrategy = () => {
    if (activeColors.length === 0) {
      toast.error("Adicione ao menos uma cor antes de aplicar a estratégia");
      return;
    }
    const margin = toNumber(matrixGlobalMarginStr) || 50;
    const markupVal = toNumber(matrixGlobalMarkupStr) || 100;
    setColorStrategies((prev) => {
      const updated = { ...prev };
      activeColors.forEach((col) => {
        updated[col.toLowerCase()] = {
          ...DEFAULT_COLOR_STRATEGY,
          mode: matrixGlobalMode,
          margin,
          markup: markupVal,
          directPrice: matrixGlobalDirectPrice,
        };
      });
      return updated;
    });
    setVariants((cur) => cur.map((v) => ({ ...v, customSalePrice: "" })));
    const label =
      matrixGlobalMode === "margin"
        ? `Margem ${margin}%`
        : matrixGlobalMode === "markup"
          ? `Markup ${markupVal}%`
          : `Preço R$ ${matrixGlobalDirectPrice}`;
    toast.success(`${label} aplicado a todas as ${activeColors.length} cores`);
  };

  /** Add a color to activeColors and generate its rows in the matrix */
  const addColorToMatrix = (colName: string) => {
    const clean = colName.trim();
    if (!clean) return;
    if (activeColors.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      toast.error(`Cor "${clean}" já está na grade`);
      return;
    }
    const newActiveColors = [...activeColors, clean];
    setActiveColors(newActiveColors);
    if (matrixSizes.length > 0) {
      const newRows: VariantRow[] = sortCanonicalSizes(matrixSizes).map((sz) => ({
        id: `v-${sz.toLowerCase()}-${clean.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        size: sz,
        color: clean,
        wholesaleCost: "",
        customSalePrice: "",
        qty: matrixDefaultQtys[sz] ?? 1,
      }));
      setVariants((cur) => [...cur, ...newRows]);
    }
    // Apply current global strategy to new color
    const margin = toNumber(matrixGlobalMarginStr) || 50;
    const markupVal = toNumber(matrixGlobalMarkupStr) || 100;
    setColorStrategies((prev) => ({
      ...prev,
      [clean.toLowerCase()]: {
        ...DEFAULT_COLOR_STRATEGY,
        mode: matrixGlobalMode,
        margin,
        markup: markupVal,
        directPrice: matrixGlobalDirectPrice,
      },
    }));
  };

  /** Remove a color from activeColors and its variants */
  const removeColorFromMatrix = (colName: string) => {
    setActiveColors((prev) => prev.filter((c) => c.toLowerCase() !== colName.toLowerCase()));
    setVariants((prev) => prev.filter((v) => v.color.toLowerCase() !== colName.toLowerCase()));
  };

  // Promoção fluida de Rápida para Grade
  const promoteToGrade = () => {
    setBaseWholesaleGrade(wholesale);
    setMode("grade");
    toast.success("Dados transferidos para a Grade Detalhada!", {
      description: "Agora você pode visualizar e personalizar cada variante por tamanho e cor.",
    });
  };

  // ── Mutações de Histórico (Salvar / Deletar) ────────────────────────
  const save = useMutation({
    mutationFn: async () => {
      if (mode === "grade") {
        // Garante que o modelo ativo atual está atualizado com o state local mais recente
        const synchronizedModels = gradeModels.map((m, idx) => {
          if (m.id === activeModelId) {
            return {
              ...m,
              name: name.trim() || m.name.trim(),
              category,
              baseWholesale: baseWholesaleGrade || m.baseWholesale,
              variants: variants.length > 0 ? variants : m.variants,
            };
          }
          return m;
        });

        // Coleta modelos que possuem nome ou variações
        const modelsWithData = synchronizedModels.filter(
          (m) => m.name.trim() || m.variants.length > 0
        );

        const listToSave = modelsWithData.length > 0 ? modelsWithData : [synchronizedModels[0]!];

        for (let i = 0; i < listToSave.length; i++) {
          const m = listToSave[i]!;
          const pieceName = m.name.trim() || `Modelo ${i + 1}`;
          let wholesaleNum = toNumber(m.baseWholesale);
          if (wholesaleNum <= 0 && m.variants.length > 0) {
            const firstValidCost = m.variants.find((v) => toNumber(v.wholesaleCost) > 0);
            if (firstValidCost) {
              wholesaleNum = toNumber(firstValidCost.wholesaleCost);
            }
          }

          await insertPricing({
            storeId,
            name: pieceName,
            wholesale_cost: wholesaleNum > 0 ? wholesaleNum : 1,
            freight_cost: toNumber(freight),
            packaging_cost: toNumber(packaging),
            other_costs: toNumber(other),
            margin_pct: strategy === "markup" ? markup : desiredMargin,
            tax_pct: tax,
          });
        }
        return listToSave.length;
      }

      // Modo rápido:
      const pieceName = name.trim();
      if (!pieceName) throw new Error("Dê um nome para a peça antes de salvar no histórico");

      const wholesaleNum = toNumber(wholesale);
      if (isNaN(wholesaleNum) || wholesaleNum <= 0) {
        throw new Error("Informe o custo no atacado da peça (maior que zero) antes de salvar");
      }

      await insertPricing({
        storeId,
        name: pieceName,
        wholesale_cost: wholesaleNum,
        freight_cost: toNumber(freight),
        packaging_cost: toNumber(packaging),
        other_costs: toNumber(other),
        margin_pct: strategy === "markup" ? markup : desiredMargin,
        tax_pct: tax,
      });
      return 1;
    },
    onSuccess: (savedCount) => {
      queryClient.invalidateQueries({ queryKey: ["pricings"] });
      toast.success(
        savedCount && savedCount > 1
          ? `${savedCount} modelos salvos no histórico com sucesso!`
          : "Precificação salva no histórico!",
        {
          description: "Você pode consultá-la ou dar entrada no estoque a qualquer momento.",
        }
      );
    },
    onError: (err: Error) => {
      toast.error("Erro ao salvar precificação", { description: err.message });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deletePricing(storeId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricings"] });
      toast.success("Peça removida do histórico");
    },
    onError: (err: Error) => {
      toast.error("Erro ao remover peça", { description: err.message });
    },
  });

  // ── Ações da Ficha de Entrada no Estoque ─────────────────────────────
  const openEntryForCurrent = () => {
    setEntryName(name.trim() || "Nova Peça");
    setEntryCostPrice(summaryPrices.avgCost);
    setEntrySalePrice(summaryPrices.avgSuggested);
    if (category) setEntryCategory(category);

    if (mode === "rapida") {
      // Modo Rápido: usar cor/tamanho/quantidade informados pelo lojista
      setEntryColor(rapidaColor.trim() || "");
      const sz = rapidaSize.trim() || "Único";
      const qty = Math.max(1, Number(rapidaQty.replace(",", ".")) || 1);
      setEntrySizes({ [sz]: qty });
    } else {
      // Modo Grade: agregar cores e quantidades reais da lista
      const uniqueColors = Array.from(new Set(variants.map((v) => v.color)));
      setEntryColor(uniqueColors.join(", ") || "");
      const initialSizes: Record<string, number> = {};
      variants.forEach((v) => {
        const q = v.qty && v.qty > 0 ? v.qty : 1;
        initialSizes[v.size] = (initialSizes[v.size] ?? 0) + q;
      });
      setEntrySizes(initialSizes);
    }
    setEntrySheetOpen(true);
  };

  const openEntryForSaved = (
    p: { name: string; wholesale_cost: number; freight_cost: number; packaging_cost: number; other_costs: number },
    realCost: number,
    suggestedPrice: number,
  ) => {
    setEntryName(p.name);
    setEntryCostPrice(realCost);
    setEntrySalePrice(suggestedPrice);
    setEntryColor("");
    setEntrySupplier("");
    setEntryPhotoUrl("");
    setEntrySizes({ P: 2, M: 4, G: 4, GG: 2 });
    setEntrySheetOpen(true);
  };

  const entryTotalUnits = useMemo(() => {
    return Object.values(entrySizes).reduce((acc, qty) => acc + (Number(qty) || 0), 0);
  }, [entrySizes]);

  const entryTotalCost = useMemo(() => {
    return entryTotalUnits * entryCostPrice;
  }, [entryTotalUnits, entryCostPrice]);

  const entryTotalRevenue = useMemo(() => {
    return entryTotalUnits * entrySalePrice;
  }, [entryTotalUnits, entrySalePrice]);

  const confirmEntryMutation = useMutation({
    mutationFn: async () => {
      if (mode === "grade" && colorGroups.length > 1) {
        const createdIds: string[] = [];
        for (const cg of colorGroups) {
          const colorSizes: Record<string, number> = {};
          cg.items.forEach((item) => {
            const q = item.qty && item.qty > 0 ? item.qty : 1;
            colorSizes[item.size] = (colorSizes[item.size] ?? 0) + q;
          });
          const id = await insertInventoryItem({
            storeId,
            name: entryName.trim() || "Peça sem nome",
            category: entryCategory,
            color: cg.color,
            supplier: entrySupplier.trim() || null,
            cost_price: cg.avgCost > 0 ? cg.avgCost : entryCostPrice,
            sale_price: cg.avgPrice > 0 ? cg.avgPrice : entrySalePrice,
            photo_url: entryPhotoUrl.trim() || null,
            sizes: colorSizes,
          });
          if (id) createdIds.push(id);
        }
        return { count: colorGroups.length, firstId: createdIds[0] ?? null };
      }

      const singleId = await insertInventoryItem({
        storeId,
        name: entryName.trim() || "Peça sem nome",
        category: entryCategory,
        color: entryColor.trim() || null,
        supplier: entrySupplier.trim() || null,
        cost_price: entryCostPrice,
        sale_price: entrySalePrice,
        photo_url: entryPhotoUrl.trim() || null,
        sizes: entrySizes,
      });
      return { count: 1, firstId: singleId };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setEntrySheetOpen(false);
      resetPricingModel(true);

      // Auto-publicar na vitrine se a flag estiver ativa (sincronizado com estoque.tsx)
      if (res?.firstId && getAutoPublish()) {
        patchShowcaseConfig(res.firstId, { ativo: true });
        toast.info("Peça publicada automaticamente na vitrine", {
          description: "Você pode ajustar a visibilidade em Loja → Produtos.",
          duration: 4000,
        });
      }

      if (res && res.count > 1) {
        toast.success(`Grade de ${res.count} cores cadastrada no Estoque! 📦`, {
          description: `${entryTotalUnits} unidades registradas individualmente por cor.`,
        });
      } else {
        toast.success("Peça cadastrada no Estoque com sucesso! 📦", {
          description: `${entryTotalUnits} unidades registradas na grade.`,
        });
      }
    },
    onError: (err: Error) => {
      toast.error("Erro ao dar entrada no estoque", { description: err.message });
    },
  });

  // ── Validação do CTA Principal (Apple-Level UX: feedback em tempo real do que falta) ──
  const validationParts: string[] = [];
  if (!name.trim()) validationParts.push("nome da peça");
  if (!baseWholesaleGrade || toNumber(baseWholesaleGrade) <= 0) validationParts.push("custo de atacado");
  if (variants.length === 0 || actualLotUnits === 0) validationParts.push("grade e quantidades");
  const validationMsg = validationParts.join(", ") || null;
  const canSubmitGrade =
    !validationMsg &&
    actualLotUnits > 0 &&
    summaryPrices.avgSuggested > 0 &&
    summaryPrices.avgCost > 0;

  return (
    <div className="space-y-6">
      {/* ── Header Unificado no Estilo Apple: Breadcrumbs + Título + Segmented Pills na Mesma Faixa ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Produtos &gt; Precificação</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Precificação
          </h1>
        </div>

        {/* ── Segmented Control em Pílula ── */}
        <div className="inline-flex rounded-full border border-border/80 bg-secondary/50 p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setMode("rapida")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              mode === "rapida"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Peça única
          </button>
          <button
            type="button"
            onClick={() => setMode("grade")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              mode === "grade"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Grade &amp; estoque
          </button>
          <button
            type="button"
            onClick={() => setMode("historico")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
              mode === "historico"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>Peças precificadas</span>
            {saved.length > 0 && (
              <span className="rounded-full bg-primary/10 text-primary text-[10px] font-extrabold px-1.5 py-0.5">
                {saved.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── CANVAS UNIFICADO & MINIMALISTA (PADRÃO APPLE STUDIO - FLUXO SEQUENCIAL NATURAL) ──── */}
      <div className="mx-auto w-full max-w-[1440px]">
        {/* Grade de 2 colunas no desktop: conteúdo principal fluido + painel lateral responsivo */}
        <div className={cn(
          "gap-5 xl:gap-6",
          mode === "rapida" ? "lg:grid lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_310px] lg:items-start" : ""
        )}>

        {/* ── COLUNA ESQUERDA: todo o conteúdo existente ── */}
        <div className="space-y-6 min-w-0">


        {/* ══════════════════════════════════════════════════════════════════
            MODO PEÇA ÚNICA — PASSO 1: IDENTIFICAÇÃO DA PEÇA
        ══════════════════════════════════════════════════════════════════ */}
        {mode === "rapida" && (
        <section className="panel p-5 sm:p-6 space-y-4">
          {/* ── Cabeçalho ── */}
          <div className="flex items-center gap-2.5 border-b border-border/60 pb-3.5">
            <span className="flex size-6 items-center justify-center rounded-full bg-secondary/80 text-xs font-bold text-foreground shrink-0">
              1
            </span>
            <h2 className="text-sm font-bold text-foreground">
              Identificação da peça
            </h2>
          </div>

          {/* ── Linha 1: Custo | Nome | Categoria ── */}
          <div className="grid gap-3 sm:grid-cols-[172px_1fr_180px]">
            {/* Custo de atacado — primeiro e em destaque */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Custo de atacado
              </Label>
              <div className="relative flex h-10 items-center rounded-xl border border-border/80 bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <span className="pl-3 text-xs font-bold text-muted-foreground select-none">R$</span>
                <input
                  inputMode="decimal"
                  value={wholesale}
                  onChange={(e) => setWholesale(e.target.value)}
                  placeholder="49,90"
                  className="h-10 w-full bg-transparent px-2 text-sm font-bold text-foreground outline-none"
                />
              </div>
            </div>

            {/* Nome da peça */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Nome da peça
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Vestido Midi Linho"
                className="h-10 rounded-xl font-medium text-sm bg-card border-border/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
              />
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Categoria
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 rounded-xl font-medium text-sm bg-card border-border/80">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {storeCategories.map((c) => (
                    <SelectItem key={c.id} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Linha 2: Quantidade | Cor | Tamanho (+ label opcionais) ── */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {/* Quantidade — stepper em pílula compacta */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground whitespace-nowrap">Quantidade</span>
                <div className="inline-flex items-center rounded-full border border-border/80 bg-card overflow-hidden shadow-2xs h-8">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseInt(rapidaQty, 10) || 1;
                      setRapidaQty(String(Math.max(1, cur - 1)));
                    }}
                    disabled={(parseInt(rapidaQty, 10) || 1) <= 1}
                    className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-r border-border/50"
                    aria-label="Diminuir"
                  >
                    <Minus className="size-3" />
                  </button>
                  <div className="flex items-center justify-center gap-1 px-2 min-w-[54px]">
                    <input
                      inputMode="numeric"
                      value={rapidaQty}
                      onChange={(e) => setRapidaQty(e.target.value.replace(/[^\d]/g, ""))}
                      className="w-8 text-center text-xs font-bold text-foreground outline-none bg-transparent"
                    />
                    <span className="text-[11px] text-muted-foreground font-medium">un.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseInt(rapidaQty, 10) || 1;
                      setRapidaQty(String(cur + 1));
                    }}
                    className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-90 transition-all cursor-pointer border-l border-border/50"
                    aria-label="Aumentar"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>

              {/* Cor — botão pílula estilo da referência */}
              <div className="flex items-center gap-2 relative">
                <span className="text-xs font-semibold text-foreground whitespace-nowrap">Cor</span>
                {rapidaColor ? (
                  <div className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-primary/40 bg-primary/5 text-xs font-semibold text-primary">
                    <span className={cn("size-2.5 rounded-full shrink-0", getColorDot(rapidaColor))} />
                    <span>{rapidaColor}</span>
                    <button
                      type="button"
                      onClick={() => { setRapidaColor(""); setRapidaColorSearchQuery(""); setShowRapidaColorPopover(false); }}
                      className="ml-0.5 size-3.5 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setRapidaColorSearchQuery(""); setShowRapidaColorPopover(true); setTimeout(() => rapidaColorInputRef.current?.focus(), 50); }}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-dashed border-border/80 bg-card hover:bg-secondary/50 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    <Plus className="size-3" />
                    <span>Adicionar cor</span>
                  </button>
                )}

                {/* Popover Spotlight */}
                {showRapidaColorPopover && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowRapidaColorPopover(false)} />
                    <div className="absolute left-0 top-full z-30 mt-1.5 w-64 max-h-60 overflow-y-auto rounded-2xl border border-border/80 bg-card p-2 shadow-xl animate-in fade-in-50 zoom-in-95 space-y-1">
                      <div className="relative flex h-8 items-center rounded-xl border border-border/70 bg-background px-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                        <Search className="size-3 text-muted-foreground shrink-0 mr-1.5" />
                        <input
                          ref={rapidaColorInputRef}
                          value={rapidaColorSearchQuery}
                          onChange={(e) => { setRapidaColorSearchQuery(e.target.value); }}
                          placeholder="Buscar cor..."
                          className="flex-1 text-xs font-medium text-foreground outline-none bg-transparent placeholder:text-muted-foreground"
                        />
                      </div>
                      {matchingRapidaColorPresets.length > 0 && (
                        <>
                          <div className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            Cores sugeridas ({matchingRapidaColorPresets.length})
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {matchingRapidaColorPresets.map((cp) => (
                              <button
                                key={cp.name}
                                type="button"
                                onClick={() => handleSelectRapidaColor(cp.name)}
                                className={cn(
                                  "flex items-center gap-1.5 rounded-lg p-1.5 text-left text-xs font-semibold transition-all hover:bg-secondary/80 cursor-pointer",
                                  rapidaColor.toLowerCase() === cp.name.toLowerCase() && "bg-primary/10 text-primary font-bold",
                                )}
                              >
                                <span className={cn("size-3 rounded-full shrink-0 shadow-2xs", getColorDot(cp.name))} />
                                <span className="truncate">{cp.name}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      {rapidaColorSearchQuery.trim() && (
                        <button
                          type="button"
                          onClick={handleCreateCustomRapidaColor}
                          className="flex w-full items-center gap-2 rounded-xl p-2 text-left text-xs font-bold text-primary hover:bg-primary/10 transition-colors cursor-pointer border-t border-border/50"
                        >
                          <Plus className="size-3.5" />
                          <span>Usar cor "{rapidaColorSearchQuery.trim()}"</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Tamanho — seletor inline compacto */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground whitespace-nowrap">Tamanho</span>
                <div className="relative flex items-center gap-1">
                  <Select value={rapidaSize} onValueChange={(val) => setRapidaSize(val === "nenhum" ? "" : val)}>
                    <SelectTrigger className="h-8 rounded-full border border-border/80 bg-card px-3 text-xs font-semibold shadow-2xs min-w-[130px]">
                      <SelectValue placeholder="Escolher grade" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 rounded-xl border border-border/80 bg-card shadow-xl">
                      <SelectItem value="nenhum" className="text-xs font-medium text-muted-foreground">
                        — Sem tamanho —
                      </SelectItem>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground border-t border-border/40 mt-1">Tamanhos</div>
                      {["PP", "P", "M", "G", "GG", "Único"].map((sz) => (
                        <SelectItem key={sz} value={sz} className="text-xs font-semibold">{sz}</SelectItem>
                      ))}
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground border-t border-border/40 mt-1">Numeração</div>
                      {["34", "36", "38", "40", "42", "44", "46", "48", "50"].map((sz) => (
                        <SelectItem key={sz} value={sz} className="text-xs font-semibold">{sz}</SelectItem>
                      ))}
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground border-t border-border/40 mt-1">Plus size</div>
                      {["G1", "G2", "G3"].map((sz) => (
                        <SelectItem key={sz} value={sz} className="text-xs font-semibold">Plus Size {sz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {rapidaSize && (
                    <button
                      type="button"
                      onClick={() => setRapidaSize("")}
                      className="size-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Limpar tamanho"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/60">opcionais</p>
          </div>
        </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MODO PEÇA ÚNICA — PASSO 2: CUSTOS E DEDUÇÕES
        ══════════════════════════════════════════════════════════════════ */}
        {mode === "rapida" && (
        <section className="panel p-5 sm:p-6 space-y-4">
          {/* ── Cabeçalho com toggle embutido ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-secondary/80 text-xs font-bold text-foreground shrink-0">
                2
              </span>
              <h2 className="text-sm font-bold text-foreground">Custos e deduções</h2>
            </div>
            {/* Toggle Total do lote / Por peça — no cabeçalho */}
            <div className="inline-flex rounded-full border border-border/70 bg-secondary/40 p-0.5 shadow-2xs">
              {(["total", "per_unit"] as const).map((m) => {
                const lbl = m === "total" ? "Total do lote" : "Por peça";
                const isActive = freightMode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setFreightMode(m); setPackagingMode(m); setOtherMode(m); }}
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer",
                      isActive ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Linha 1: Frete | Embalagem & tags | Outros ── */}
          {(() => {
            const freightVal = resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1);
            const packagingVal = resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1);
            const otherVal = resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1);
            const totalSharedCost = freightVal + packagingVal + otherVal;

            return (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Frete */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Frete</Label>
                    <div className="relative flex h-10 items-center rounded-xl border border-border/80 bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <span className="pl-3 text-xs font-bold text-muted-foreground select-none">R$</span>
                      <input
                        inputMode="decimal"
                        value={freight}
                        onChange={(e) => setFreight(e.target.value)}
                        placeholder="0,00"
                        className="h-10 w-full bg-transparent px-2 text-sm font-bold text-foreground outline-none"
                      />
                    </div>
                  </div>

                  {/* Embalagem & tags */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Embalagem & tags</Label>
                    <div className="relative flex h-10 items-center rounded-xl border border-border/80 bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <span className="pl-3 text-xs font-bold text-muted-foreground select-none">R$</span>
                      <input
                        inputMode="decimal"
                        value={packaging}
                        onChange={(e) => setPackaging(e.target.value)}
                        placeholder="0,00"
                        className="h-10 w-full bg-transparent px-2 text-sm font-bold text-foreground outline-none"
                      />
                    </div>
                  </div>

                  {/* Outros */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Outros</Label>
                    <div className="relative flex h-10 items-center rounded-xl border border-border/80 bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <span className="pl-3 text-xs font-bold text-muted-foreground select-none">R$</span>
                      <input
                        inputMode="decimal"
                        value={other}
                        onChange={(e) => setOther(e.target.value)}
                        placeholder="0,00"
                        className="h-10 w-full bg-transparent px-2 text-sm font-bold text-foreground outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Microcopy de custos */}
                <p className="text-[11px] text-muted-foreground/70">
                  {totalSharedCost > 0
                    ? `+${brl(totalSharedCost)} adicionais por peça`
                    : "Sem custos extras"}
                </p>

                {/* ── Linha 2: Deduções — controles compostos acoplados ── */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {/* Imposto DAS */}
                  <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-card overflow-hidden shadow-2xs h-9">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-1 h-9 pl-3 pr-2 text-xs font-semibold text-foreground hover:bg-secondary/50 transition-colors cursor-pointer border-r border-border/50 whitespace-nowrap"
                        >
                          Imposto DAS
                          <ChevronDown className="size-3 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="rounded-xl border border-border/80 bg-card shadow-xl text-xs min-w-[160px]">
                        {[
                          { label: `MEI (Fixo)`, value: pricingSettings.dasRates?.mei ?? 0 },
                          { label: `Faixa 1 – ${(pricingSettings.dasRates?.faixa1 ?? 4).toFixed(1)}%`, value: pricingSettings.dasRates?.faixa1 ?? 4 },
                          { label: `Faixa 2 – ${(pricingSettings.dasRates?.faixa2 ?? 6).toFixed(1)}%`, value: pricingSettings.dasRates?.faixa2 ?? 6 },
                          { label: `Faixa 3 – ${(pricingSettings.dasRates?.faixa3 ?? 8).toFixed(1)}%`, value: pricingSettings.dasRates?.faixa3 ?? 8 },
                        ].map((preset) => (
                          <DropdownMenuItem
                            key={preset.label}
                            onClick={() => setTax(preset.value)}
                            className={cn("cursor-pointer text-xs font-semibold rounded-lg", tax === preset.value && "bg-primary/10 text-primary")}
                          >
                            {preset.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                      type="button"
                      disabled={tax <= 0}
                      onClick={() => setTax(Math.max(0, Number((tax - 0.5).toFixed(1))))}
                      className="flex size-9 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-r border-border/50"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="numeric text-xs font-bold text-foreground px-2 min-w-[40px] text-center">{tax.toFixed(1).replace(".", ",")}%</span>
                    <button
                      type="button"
                      disabled={tax >= 20}
                      onClick={() => setTax(Math.min(20, Number((tax + 0.5).toFixed(1))))}
                      className="flex size-9 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-l border-border/50"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>

                  {/* Taxa de Cartão */}
                  <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-card overflow-hidden shadow-2xs h-9">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-1 h-9 pl-3 pr-2 text-xs font-semibold text-foreground hover:bg-secondary/50 transition-colors cursor-pointer border-r border-border/50 whitespace-nowrap"
                        >
                          Taxa de cartão
                          <ChevronDown className="size-3 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="rounded-xl border border-border/80 bg-card shadow-xl text-xs min-w-[180px]">
                        {[
                          { label: `Pix – ${(pricingSettings.cardRates?.pix ?? 0.9).toFixed(1).replace(".", ",")}%`, value: pricingSettings.cardRates?.pix ?? 0.9 },
                          { label: `Débito – ${(pricingSettings.cardRates?.debito ?? 1.5).toFixed(1).replace(".", ",")}%`, value: pricingSettings.cardRates?.debito ?? 1.5 },
                          { label: `Crédito 1× – ${(pricingSettings.cardRates?.credito1x ?? 3.2).toFixed(1).replace(".", ",")}%`, value: pricingSettings.cardRates?.credito1x ?? 3.2 },
                          { label: `Parcelado – ${(pricingSettings.cardRates?.parcelado ?? 4.5).toFixed(1).replace(".", ",")}%`, value: pricingSettings.cardRates?.parcelado ?? 4.5 },
                        ].map((preset) => (
                          <DropdownMenuItem
                            key={preset.label}
                            onClick={() => setCardRate(preset.value)}
                            className={cn("cursor-pointer text-xs font-semibold rounded-lg", cardRate === preset.value && "bg-primary/10 text-primary")}
                          >
                            {preset.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                      type="button"
                      disabled={cardRate <= 0}
                      onClick={() => setCardRate(Math.max(0, Number((cardRate - 0.1).toFixed(1))))}
                      className="flex size-9 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-r border-border/50"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="numeric text-xs font-bold text-foreground px-2 min-w-[40px] text-center">{cardRate.toFixed(1).replace(".", ",")}%</span>
                    <button
                      type="button"
                      disabled={cardRate >= 15}
                      onClick={() => setCardRate(Math.min(15, Number((cardRate + 0.1).toFixed(1))))}
                      className="flex size-9 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-l border-border/50"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>

                  {/* Chip Total */}
                  <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/70 bg-secondary/30 shadow-2xs">
                    <span className="text-xs text-muted-foreground font-medium">Total</span>
                    <span className="numeric text-xs font-black text-foreground">{(tax + cardRate).toFixed(1).replace(".", ",")}%</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MODO PEÇA ÚNICA — PASSO 3: PREÇO DE VENDA
        ══════════════════════════════════════════════════════════════════ */}
        {mode === "rapida" && (() => {
          const maxMarginSafe = Math.max(10, Math.floor(100 - tax - cardRate - 2));
          const effectiveMarginVal = Math.min(desiredMargin, maxMarginSafe);
          const hasCost = toNumber(wholesale) > 0;

          return (
          <section className="panel p-5 sm:p-6 space-y-4">
            {/* ── Cabeçalho com seletor de estratégia embutido ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-6 items-center justify-center rounded-full bg-secondary/80 text-xs font-bold text-foreground shrink-0">
                  3
                </span>
                <h2 className="text-sm font-bold text-foreground">Preço de venda</h2>
              </div>
              {/* Segmented switch inline no cabeçalho */}
              <div className="inline-flex rounded-full border border-border/70 bg-secondary/40 p-0.5 shadow-2xs">
                {([
                  { key: "margin", label: "Margem" },
                  { key: "markup", label: "Markup" },
                  { key: "direct_price", label: "Preço fixo" },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStrategy(key)}
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer",
                      strategy === key ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Controles de Estratégia ── */}
            <div className="space-y-3">
              {/* MARGEM */}
              {strategy === "margin" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-foreground whitespace-nowrap">Margem líquida</span>
                    <div className="inline-flex items-center rounded-full border border-border/80 bg-card overflow-hidden shadow-2xs h-8">
                      <button
                        type="button"
                        disabled={effectiveMarginVal <= 5}
                        onClick={() => {
                          const next = Math.max(5, Number((effectiveMarginVal - 1).toFixed(1)));
                          setDesiredMargin(next);
                          setMarginInputVal(Number.isInteger(next) ? String(next) : String(next).replace(".", ","));
                        }}
                        className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-r border-border/50"
                      >
                        <Minus className="size-3" />
                      </button>
                      <div className="flex items-baseline justify-center gap-0.5 px-3 min-w-[62px]">
                        <input
                          inputMode="decimal"
                          value={marginInputVal}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setMarginInputVal(raw);
                            const n = parseFloat(raw.replace(",", "."));
                            if (!isNaN(n)) setDesiredMargin(Math.min(maxMarginSafe, Math.max(5, n)));
                          }}
                          onBlur={() => {
                            const n = parseFloat(marginInputVal.replace(",", "."));
                            if (!isNaN(n)) {
                              const clamped = Math.min(maxMarginSafe, Math.max(5, Number(n.toFixed(1))));
                              setDesiredMargin(clamped);
                              setMarginInputVal(Number.isInteger(clamped) ? String(clamped) : String(clamped).replace(".", ","));
                            } else { setDesiredMargin(50); setMarginInputVal("50"); }
                          }}
                          className="w-10 text-center text-sm font-black text-foreground outline-none bg-transparent numeric"
                          placeholder="50"
                        />
                        <span className="text-xs font-bold text-muted-foreground">%</span>
                      </div>
                      <button
                        type="button"
                        disabled={effectiveMarginVal >= maxMarginSafe}
                        onClick={() => {
                          const next = Math.min(maxMarginSafe, Number((effectiveMarginVal + 1).toFixed(1)));
                          setDesiredMargin(next);
                          setMarginInputVal(Number.isInteger(next) ? String(next) : String(next).replace(".", ","));
                        }}
                        className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-l border-border/50"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                  {/* Chips de atalho */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "35% Varejo", val: 35 },
                      { label: "45% Equilíbrio", val: 45 },
                      { label: "50% Recomendada", val: 50 },
                      { label: "60% Alta margem", val: 60 },
                    ].map((m) => {
                      const isActive = Math.abs(effectiveMarginVal - m.val) < 0.05;
                      return (
                        <button
                          key={m.val}
                          type="button"
                          onClick={() => { const t = Math.min(m.val, maxMarginSafe); setDesiredMargin(t); setMarginInputVal(String(t)); }}
                          className={cn(
                            "h-7 px-3 rounded-full text-xs transition-all cursor-pointer border font-medium",
                            isActive
                              ? "border-primary bg-primary text-primary-foreground font-bold shadow-glow"
                              : "border-border/70 bg-card text-muted-foreground hover:text-foreground hover:border-border"
                          )}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MARKUP */}
              {strategy === "markup" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-foreground whitespace-nowrap">Multiplicador de Markup</span>
                    <div className="inline-flex items-center rounded-full border border-border/80 bg-card overflow-hidden shadow-2xs h-8">
                      <button
                        type="button"
                        disabled={markup <= 10}
                        onClick={() => {
                          const next = Math.max(10, Number((markup - 5).toFixed(1)));
                          setMarkup(next);
                          setMarkupInputVal(Number.isInteger(next) ? String(next) : String(next).replace(".", ","));
                        }}
                        className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-r border-border/50"
                      >
                        <Minus className="size-3" />
                      </button>
                      <div className="flex items-baseline justify-center gap-0.5 px-3 min-w-[72px]">
                        <input
                          inputMode="decimal"
                          value={markupInputVal}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setMarkupInputVal(raw);
                            const n = parseFloat(raw.replace(",", "."));
                            if (!isNaN(n)) setMarkup(Math.min(300, Math.max(10, n)));
                          }}
                          onBlur={() => {
                            const n = parseFloat(markupInputVal.replace(",", "."));
                            if (!isNaN(n)) {
                              const clamped = Math.min(300, Math.max(10, Number(n.toFixed(1))));
                              setMarkup(clamped);
                              setMarkupInputVal(Number.isInteger(clamped) ? String(clamped) : String(clamped).replace(".", ","));
                            } else { setMarkup(100); setMarkupInputVal("100"); }
                          }}
                          className="w-10 text-center text-sm font-black text-foreground outline-none bg-transparent numeric"
                          placeholder="100"
                        />
                        <span className="text-xs font-bold text-muted-foreground">%</span>
                        <span className="text-[11px] font-bold text-primary numeric bg-primary/10 px-1 py-0.5 rounded ml-1">
                          {(1 + markup / 100).toFixed(2)}x
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={markup >= 300}
                        onClick={() => {
                          const next = Math.min(300, Number((markup + 5).toFixed(1)));
                          setMarkup(next);
                          setMarkupInputVal(Number.isInteger(next) ? String(next) : String(next).replace(".", ","));
                        }}
                        className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border-l border-border/50"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "1.8x Atacado", val: 80 },
                      { label: "2.0x Varejo", val: 100 },
                      { label: "2.5x Boutique", val: 150 },
                      { label: "3.0x Marca", val: 200 },
                    ].map((m) => {
                      const isActive = Math.round(markup) === m.val;
                      return (
                        <button
                          key={m.val}
                          type="button"
                          onClick={() => { setMarkup(m.val); setMarkupInputVal(String(m.val)); }}
                          className={cn(
                            "h-7 px-3 rounded-full text-xs transition-all cursor-pointer border font-medium",
                            isActive
                              ? "border-primary bg-primary text-primary-foreground font-bold shadow-glow"
                              : "border-border/70 bg-card text-muted-foreground hover:text-foreground hover:border-border"
                          )}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PREÇO FIXO */}
              {strategy === "direct_price" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-foreground whitespace-nowrap">Preço de vitrine</span>
                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card shadow-soft px-2.5 py-1 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                      <span className="text-xs font-bold text-muted-foreground select-none">R$</span>
                      <input
                        inputMode="decimal"
                        value={directSalePrice}
                        onChange={(e) => setDirectSalePrice(e.target.value)}
                        placeholder="149,90"
                        className="w-20 text-lg font-black text-foreground outline-none bg-transparent numeric tracking-tight"
                      />
                      {summaryPrices.avgMargin > 0 && (
                        <span className="text-[11px] font-semibold text-primary numeric bg-primary/10 px-1.5 py-0.5 rounded select-none">
                          {pct(summaryPrices.avgMargin)} margem
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "R$ 99,90", val: "99,90" },
                      { label: "R$ 119,90", val: "119,90" },
                      { label: "R$ 149,90", val: "149,90" },
                      { label: "R$ 199,90", val: "199,90" },
                    ].map((pVal) => {
                      const isActive = directSalePrice === pVal.val;
                      return (
                        <button
                          key={pVal.val}
                          type="button"
                          onClick={() => setDirectSalePrice(pVal.val)}
                          className={cn(
                            "h-7 px-3 rounded-full text-xs transition-all cursor-pointer border font-medium",
                            isActive
                              ? "border-primary bg-primary text-primary-foreground font-bold shadow-glow"
                              : "border-border/70 bg-card text-muted-foreground hover:text-foreground hover:border-border"
                          )}
                        >
                          {pVal.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Área Dinâmica: Banner vazio ou resultado ── */}
              {!hasCost ? (
                <div className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground/80 italic">
                    Informe o custo de atacado para ver o preço.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {summaryPrices.avgSuggested > 0 && (() => {
                    const cost = summaryPrices.avgCost;
                    const profit = summaryPrices.avgProfit;
                    const taxes = Math.max(summaryPrices.avgSuggested * (tax / 100), 0);
                    const cardFees = Math.max(summaryPrices.avgSuggested * (cardRate / 100), 0);
                    const total = summaryPrices.avgSuggested;
                    const costPct = total > 0 ? (cost / total) * 100 : 0;
                    const taxPct = total > 0 ? (taxes / total) * 100 : 0;
                    const cardPct = total > 0 ? (cardFees / total) * 100 : 0;
                    const profitPct = total > 0 ? (profit / total) * 100 : 0;

                    return (
                      <div className="rounded-xl border border-border/70 bg-card p-4 space-y-4">
                        {/* Preço + Lucro */}
                        <div className="grid sm:grid-cols-2 gap-4 pb-4 border-b border-border/60">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                <Tag className="size-3.5 text-primary" />
                                Preço sugerido na vitrine
                              </span>
                              <Badge variant="outline" className={cn("text-[11px] font-semibold px-2 py-0.5 border shadow-2xs", summaryPrices.marginHealth.color)}>
                                {summaryPrices.marginHealth.emoji} {summaryPrices.marginHealth.label}
                              </Badge>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="numeric text-2xl font-black tracking-tight text-foreground">{brl(total)}</span>
                              <span className="text-xs text-muted-foreground">/ peça</span>
                            </div>
                          </div>
                          <div className="space-y-1 sm:border-l sm:border-border/60 sm:pl-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                Sobra líquida no caixa
                              </span>
                              <span className="numeric text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full shadow-2xs">
                                {pct(summaryPrices.avgMargin)} margem
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="numeric text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                                {profit > 0 ? `+${brl(profit)}` : brl(profit)}
                              </span>
                              <span className="text-xs text-muted-foreground">/ peça</span>
                            </div>
                          </div>
                        </div>

                        {/* Barra de decomposição */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">Decomposição do preço ({brl(total)})</span>
                            <span className="text-[11px] text-muted-foreground">Para onde vai cada real</span>
                          </div>
                          <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary/80 gap-0.5">
                            <div className="bg-slate-400 dark:bg-slate-500 rounded-l-full transition-all duration-300" style={{ width: `${Math.max(costPct, 2)}%` }} title={`Custo: ${brl(cost)} (${Math.round(costPct)}%)`} />
                            <div className="bg-amber-400 transition-all duration-300" style={{ width: `${Math.max(taxPct, 2)}%` }} title={`DAS: ${brl(taxes)} (${Math.round(taxPct)}%)`} />
                            <div className="bg-sky-400 transition-all duration-300" style={{ width: `${Math.max(cardPct, 2)}%` }} title={`Maquininha: ${brl(cardFees)} (${Math.round(cardPct)}%)`} />
                            <div className={cn("rounded-r-full transition-all duration-300", profit < 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${Math.max(Math.abs(profitPct), 2)}%` }} title={`Lucro: ${brl(profit)} (${Math.round(profitPct)}%)`} />
                          </div>
                        </div>

                        {/* DRE */}
                        <div className="rounded-xl border border-border/60 bg-background/90 overflow-hidden shadow-2xs">
                          <div className="grid grid-cols-[1fr_auto_auto] items-center text-[11px] font-medium text-muted-foreground py-2 px-3 bg-secondary/25 border-b border-border/50">
                            <span>Componente</span>
                            <span className="text-right pr-6 sm:pr-8">Valor</span>
                            <span className="text-right w-14">%</span>
                          </div>
                          {[
                            { dot: "bg-slate-400", label: "Custo da Peça", note: "Preço atacado", val: cost, pctVal: costPct },
                            { dot: "bg-amber-400", label: `Imposto DAS (${tax.toFixed(1)}%)`, note: "Simples Nacional", val: taxes, pctVal: taxPct },
                            { dot: "bg-sky-400", label: `Taxa de Cartão (${cardRate.toFixed(1)}%)`, note: "Maquininha", val: cardFees, pctVal: cardPct },
                          ].map((row) => (
                            <div key={row.label} className="grid grid-cols-[1fr_auto_auto] items-center py-2 px-3 text-xs border-b border-border/40 hover:bg-secondary/15 transition-colors">
                              <div className="flex items-center gap-2">
                                <span className={`size-2 rounded-full ${row.dot} shrink-0`} />
                                <span className="font-medium text-foreground">{row.label}</span>
                                <span className="text-[11px] text-muted-foreground hidden sm:inline">· {row.note}</span>
                              </div>
                              <span className="numeric font-semibold text-foreground text-right pr-6 sm:pr-8">{brl(row.val)}</span>
                              <span className="numeric text-muted-foreground text-right w-14">{Math.round(row.pctVal)}%</span>
                            </div>
                          ))}
                          <div className={cn("grid grid-cols-[1fr_auto_auto] items-center py-2 px-3 text-xs font-semibold", profit < 0 ? "bg-rose-500/10 text-rose-800 dark:text-rose-300" : "bg-emerald-500/8 text-emerald-900 dark:text-emerald-300")}>
                            <div className="flex items-center gap-2">
                              <span className={cn("size-2 rounded-full shrink-0", profit < 0 ? "bg-rose-500" : "bg-emerald-500")} />
                              <span className="font-bold">Lucro Líquido Real</span>
                              <span className="text-[11px] opacity-75 hidden sm:inline">· Sobra limpa por peça</span>
                            </div>
                            <span className={cn("numeric font-bold text-sm text-right pr-6 sm:pr-8", profit < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
                              {profit > 0 ? `+${brl(profit)}` : brl(profit)}
                            </span>
                            <span className={cn("numeric font-semibold text-right w-14", profit < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
                              {Math.round(profitPct)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Ponto de Equilíbrio */}
                  {actualLotUnits > 1 && (
                    <div className="rounded-xl bg-secondary/40 p-3.5 text-xs text-muted-foreground leading-relaxed border border-border/60">
                      Vendendo <strong className="text-foreground">{lotBreakEven.unitsToBreakEven} {lotBreakEven.unitsToBreakEven === 1 ? "peça" : "peças"}</strong> você quita todo o custo do lote ({brl(lotBreakEven.totalLotCost)}). {lotBreakEven.totalLotProfit >= 0 ? (
                        Math.max(actualLotUnits - lotBreakEven.unitsToBreakEven, 0) > 0 ? (
                          <>As outras <strong className="text-foreground">{Math.max(actualLotUnits - lotBreakEven.unitsToBreakEven, 0)} peças</strong> geram <strong className="text-success">+{brl(lotBreakEven.profitOnRemainder)}</strong> líquidos no seu caixa.</>
                        ) : "Lote quitado com margem saudável."
                      ) : (
                        <span className="text-destructive font-semibold">Atenção: este preço resulta em prejuízo previsto de {brl(Math.abs(lotBreakEven.totalLotProfit))} no lote.</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
          );
        })()}

        {/* ══════════════════════════════════════════════════════════════════
        {/* ══ MODO GRADE: Ficha Única Progressiva (Design System Modaly - Padrão Apple / Linear) ══ */}
        {mode === "grade" && (
          <div className="space-y-4 pb-16 lg:pb-2">
            {/* Grid de 2 colunas: Painel Principal + Sidebar com alturas harmonizadas */}
            <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] items-stretch">
              
              {/* ── COLUNA PRINCIPAL: Seção 1 (Ficha da Peça) ── */}
              <div className="min-w-0 h-full">

                {/* ── SEÇÃO 1: Ficha da Peça ── */}
                <section className="panel p-4 sm:p-5 border border-border/80 bg-card shadow-soft h-full flex flex-col justify-between gap-3 sm:gap-3.5">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                    <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-foreground text-xs font-bold">
                        1
                      </span>
                      <span>Ficha da peça</span>
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      Identificação e custo de atacado base
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[56px_1fr_180px_150px] items-center">
                    {/* Foto da peça */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="size-14 rounded-2xl border-2 border-dashed border-border/80 bg-secondary/30 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors relative group">
                        {entryPhotoUrl ? (
                          <div className="relative size-full">
                            <img src={entryPhotoUrl} alt="Foto da peça" className="size-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setEntryPhotoUrl("")}
                              className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold cursor-pointer"
                            >
                              Trocar
                            </button>
                          </div>
                        ) : (
                          <label className="size-full flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground">
                            <Shirt className="size-5 mb-0.5" />
                            <span className="text-[9px] font-semibold">Foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => setEntryPhotoUrl(reader.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Nome da Peça */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground">
                        Nome da peça
                      </Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Vestido Midi Linho com Fenda"
                        className="h-10 rounded-xl font-semibold text-sm bg-background shadow-2xs"
                      />
                    </div>

                    {/* Categoria */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground">
                        Categoria
                      </Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-10 rounded-xl font-medium text-xs bg-background shadow-2xs border-border">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {storeCategories.map((c) => (
                            <SelectItem key={c.id} value={c.slug} className="text-xs">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custo de Atacado */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground">
                        Custo atacado / un.
                      </Label>
                      <div className="relative flex h-10 items-center rounded-xl border border-border/80 bg-background shadow-2xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <span className="pl-3 text-xs font-bold text-muted-foreground select-none">R$</span>
                        <input
                          inputMode="decimal"
                          value={baseWholesaleGrade}
                          onChange={(e) => setBaseWholesaleGrade(e.target.value)}
                          placeholder="0,00"
                          className="h-10 w-full bg-transparent px-2 text-sm font-black text-foreground outline-none numeric"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Linha 2: Custos Extras da Nota */}
                  <div className="pt-3 border-t border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Custos extras da nota
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">
                        Rateados proporcionalmente entre as peças
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">Frete</span>
                        <div className="relative flex h-9 items-center rounded-lg border border-border/70 bg-background focus-within:border-primary transition-all">
                          <span className="pl-2.5 text-xs font-bold text-muted-foreground select-none">R$</span>
                          <input
                            inputMode="decimal"
                            value={freight}
                            onChange={(e) => setFreight(e.target.value)}
                            placeholder="0,00"
                            className="h-9 w-full bg-transparent px-2 text-xs font-bold text-foreground outline-none numeric"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">Embalagem</span>
                        <div className="relative flex h-9 items-center rounded-lg border border-border/70 bg-background focus-within:border-primary transition-all">
                          <span className="pl-2.5 text-xs font-bold text-muted-foreground select-none">R$</span>
                          <input
                            inputMode="decimal"
                            value={packaging}
                            onChange={(e) => setPackaging(e.target.value)}
                            placeholder="0,00"
                            className="h-9 w-full bg-transparent px-2 text-xs font-bold text-foreground outline-none numeric"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">Outros extras</span>
                        <div className="relative flex h-9 items-center rounded-lg border border-border/70 bg-background focus-within:border-primary transition-all">
                          <span className="pl-2.5 text-xs font-bold text-muted-foreground select-none">R$</span>
                          <input
                            inputMode="decimal"
                            value={other}
                            onChange={(e) => setOther(e.target.value)}
                            placeholder="0,00"
                            className="h-9 w-full bg-transparent px-2 text-xs font-bold text-foreground outline-none numeric"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Linha 3: Custo Real Unitário Adaptativo em Zona Dedicada */}
                  <div className="pt-2.5 border-t border-border/50">
                    <div className="flex items-center justify-between rounded-xl bg-secondary/40 border border-border/60 px-3.5 py-2.5 gap-4">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            {variantRealCosts.hasMultipleCosts ? "Custo real (faixa da grade)" : "Custo real / peça"}
                          </span>
                          <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                            {variantRealCosts.hasMultipleCosts
                              ? "custos variam"
                              : actualLotUnits > 0
                              ? `${actualLotUnits} un.`
                              : "unitário base"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {variantRealCosts.hasMultipleCosts ? (
                            <>
                              Custo de fábrica varia na grade · Rateio de extras <span className="font-semibold text-foreground/80">{brl(variantRealCosts.baseShared)}</span>/un
                            </>
                          ) : actualLotUnits > 0 ? (
                            <>
                              <span className="font-semibold text-foreground/80">{brl(toNumber(baseWholesaleGrade))}</span> compra +{" "}
                              <span className="font-semibold text-foreground/80">{brl(variantRealCosts.baseShared)}</span> rateio por peça
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-foreground/80">{brl(toNumber(baseWholesaleGrade))}</span> atacado (sem lote ativo para rateio)
                            </>
                          )}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={cn(
                          "font-black text-foreground numeric tracking-tight",
                          variantRealCosts.hasMultipleCosts ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
                        )}>
                          {variantRealCosts.hasMultipleCosts
                            ? `${brl(variantRealCosts.minCost)} a ${brl(variantRealCosts.maxCost)}`
                            : brl(variantRealCosts.minCost)}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* ── CARD RESUMO & CTA DO TOPO (DESKTOP) ── */}
              <aside className="hidden lg:flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft h-full gap-3">
                {/* 1. Cabeçalho Estável: Preço Sugerido */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Preço sugerido
                    </p>
                    {summaryPrices.avgSuggested > 0 && (
                      <span className="text-[10px] font-bold text-foreground/85 px-2.5 py-0.5 rounded-full bg-secondary/80 border border-border/60 numeric">
                        {summaryPrices.avgMargin.toFixed(0)}% margem
                      </span>
                    )}
                  </div>

                  <p className={cn(
                    "font-black text-foreground numeric tracking-tight",
                    summaryPrices.hasMultiple
                      ? "text-2xl sm:text-3xl"
                      : "text-3xl sm:text-4xl"
                  )}>
                    {summaryPrices.hasMultiple
                      ? `${brl(summaryPrices.minSuggested)} a ${brl(summaryPrices.maxSuggested)}`
                      : brl(summaryPrices.avgSuggested)}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {summaryPrices.avgSuggested > 0 ? (
                      summaryPrices.hasMultiple ? (
                        <span>Preço varia por tamanho na grade</span>
                      ) : (
                        <>
                          Lucro unitário{" "}
                          <span className={cn(
                            "font-bold numeric",
                            summaryPrices.avgProfit > 0
                              ? "text-success"
                              : summaryPrices.avgProfit < 0
                              ? "text-destructive"
                              : "text-foreground"
                          )}>
                            {summaryPrices.avgProfit > 0 ? "+" : ""}{brl(summaryPrices.avgProfit)}
                          </span>
                        </>
                      )
                    ) : (
                      <span>Preencha o atacado e a grade para calcular</span>
                    )}
                  </p>
                </div>

                {/* 2. Ilha Financeira do Lote (Padrão Apple Wallet) */}
                <div className="rounded-2xl bg-secondary/35 border border-border/50 p-3.5 space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Faturamento</p>
                      <p className="text-base sm:text-lg font-black text-foreground numeric mt-0.5">
                        {brl(summaryPrices.totalRevenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lucro líquido</p>
                      <p className={cn(
                        "text-base sm:text-lg font-black numeric mt-0.5",
                        summaryPrices.totalProfit > 0
                          ? "text-success"
                          : summaryPrices.totalProfit < 0
                          ? "text-destructive"
                          : "text-foreground"
                      )}>
                        {summaryPrices.totalProfit > 0 ? "+" : ""}{brl(summaryPrices.totalProfit)}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Investimento: <strong className="text-foreground font-semibold numeric">{brl(summaryPrices.totalInvestment)}</strong></span>
                    <span className="numeric">{actualLotUnits > 0 ? `${actualLotUnits} peças no lote` : "0 peças"}</span>
                  </div>
                </div>

                {/* 3. Ação Principal & Status */}
                <div className="space-y-1.5">
                  <Button
                    type="button"
                    onClick={openEntryForCurrent}
                    disabled={!canSubmitGrade}
                    className="w-full h-11 rounded-xl gradient-primary text-primary-foreground text-sm font-bold shadow-glow disabled:opacity-40 hover:opacity-95 transition-all active:scale-[0.99] cursor-pointer"
                  >
                    <PackagePlus className="size-4 mr-2" />
                    <span>
                      {actualLotUnits > 0
                        ? `Dar entrada no estoque (${actualLotUnits} un.)`
                        : "Dar entrada no estoque"}
                    </span>
                  </Button>

                  <div className="min-h-[1rem] flex items-center justify-center text-center">
                    {!canSubmitGrade && validationMsg && (
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Falta preencher: <span className="font-semibold text-foreground/80">{validationMsg}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Rodapé com Ações Secundárias */}
                <div className="border-t border-border/50 pt-2 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => save.mutate()}
                    disabled={save.isPending || !name.trim()}
                    className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer px-2"
                  >
                    <Save className="size-3.5 mr-1.5" /> Salvar modelo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetPricingModel}
                    className="h-8 text-xs font-semibold text-muted-foreground hover:text-destructive cursor-pointer px-2"
                  >
                    <RotateCcw className="size-3.5 mr-1.5" /> Limpar
                  </Button>
                </div>
              </aside>
            </div>

            {/* ── SEÇÃO 2: Planilha de Variações & Precificação da Grade ── */}
            <section id="secao-matriz-precificacao" className="panel p-4 sm:p-5 space-y-4 border border-border/80 bg-card shadow-soft">
              {/* ── LINHA 1: CABEÇALHO SEMÂNTICO & CONTROLES GLOBAIS ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-foreground text-xs font-bold shrink-0">
                    2
                  </span>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                      Planilha de variações &amp; precificação
                    </h2>
                    {actualLotUnits > 0 ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                        {actualLotUnits} un. no lote
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground hidden sm:inline">
                        · Defina cores e grade abaixo
                      </span>
                    )}
                  </div>
                </div>

                {variants.length > 0 && (
                  <div className="flex items-center gap-2.5">
                    {/* Seletor de Modo: Precificar isoladamente vs Preço unificado na grade */}
                    <div className="inline-flex rounded-full border border-border/80 bg-secondary/60 p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          setGradePricingMode("isolated");
                          toast.info("Modo Isolado ativado: personalize custos e preços linha por linha.");
                        }}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                          gradePricingMode === "isolated"
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span>🎛️ Isolado</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGradePricingMode("unified");
                          toast.info("Modo Preço Unificado ativado: toda a grade segue a mesma margem.");
                        }}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1",
                          gradePricingMode === "unified"
                            ? "bg-card text-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span>🔗 Preço unificado</span>
                      </button>
                    </div>

                    {/* Deduções em Popover flutuante limpo */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDeducoes(!showDeducoes)}
                        className={cn(
                          "h-8 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs",
                          showDeducoes
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/80 bg-background text-muted-foreground hover:text-foreground",
                        )}
                        title="Configurar impostos e taxa de cartão"
                      >
                        <span>Deduções {(tax + cardRate).toFixed(1).replace(".", ",")}%</span>
                        <ChevronDown className={cn("size-3 transition-transform duration-200", showDeducoes && "rotate-180")} />
                      </button>

                      {showDeducoes && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setShowDeducoes(false)} />
                          <div className="absolute right-0 top-10 z-40 w-72 rounded-2xl border border-border bg-card p-3.5 shadow-lift space-y-3 animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                              <span className="text-xs font-bold text-foreground">Deduções da venda</span>
                              <span className="text-[11px] font-bold text-primary">{(tax + cardRate).toFixed(1).replace(".", ",")}% total</span>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <Label className="text-xs font-medium text-muted-foreground">DAS / Simples</Label>
                                <span className="numeric font-bold">{tax}%</span>
                              </div>
                              <Slider
                                value={[tax]}
                                onValueChange={([val]) => setTax(val ?? 0)}
                                min={0}
                                max={25}
                                step={0.5}
                                className="py-1 cursor-pointer"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <Label className="text-xs font-medium text-muted-foreground">Taxa Cartão</Label>
                                <span className="numeric font-bold">{cardRate}%</span>
                              </div>
                              <Slider
                                value={[cardRate]}
                                onValueChange={([val]) => setCardRate(val ?? 0)}
                                min={0}
                                max={15}
                                step={0.5}
                                className="py-1 cursor-pointer"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── LINHA 2: TOOLBAR CONTÍNUA UNIFICADA (CORES, TAMANHOS & PRECIFICAÇÃO) ── */}
              {variants.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 py-2 border-b border-border/40">
                  {/* BLOCO ESQUERDA: Controle Mestre da Grade & Adicionar Cor */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Botão Mestre da Grade (Resumo elegante com 1 clique para editar) */}
                    {(() => {
                      const activeVariantSizes = Array.from(new Set(variants.map((v) => v.size)));
                      const sizesLabel = activeVariantSizes.length > 0 ? activeVariantSizes.join(", ") : "Grade";
                      const colorsSummary = activeColors.length > 0
                        ? `${activeColors.slice(0, 2).join(", ")}${activeColors.length > 2 ? ` +${activeColors.length - 2}` : ""}`
                        : "Sem cores";

                      return (
                        <button
                          type="button"
                          onClick={() => setShowGradeModal(true)}
                          className="h-8 px-2.5 rounded-lg border border-border/70 bg-background hover:bg-secondary/60 text-xs font-semibold text-foreground flex items-center gap-1.5 transition-all shadow-2xs hover:border-primary/40 group cursor-pointer"
                          title="Abrir gerador para alterar cores, tamanhos e quantidades da grade"
                        >
                          <Boxes className="size-3.5 text-primary group-hover:scale-105 transition-transform" />
                          <span className="text-muted-foreground font-normal">Grade:</span>
                          <span className="font-bold text-foreground">{colorsSummary}</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="font-semibold text-foreground">{sizesLabel}</span>
                          <Pencil className="size-2.5 text-muted-foreground group-hover:text-primary transition-colors ml-0.5" />
                        </button>
                      );
                    })()}

                    {/* Botão rápido + Cor */}
                    <div className="relative" ref={colorPopoverRef}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowColorInput(!showColorInput)}
                        className="h-8 px-2.5 rounded-lg text-xs font-semibold border-border/70 bg-background hover:bg-secondary/60 cursor-pointer shadow-2xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        title="Adicionar cor e tamanhos à grade"
                      >
                        <Plus className="size-3 text-primary" />
                        <span>Variação</span>
                        <ChevronDown className="size-3 text-muted-foreground/60" />
                      </Button>

                      {showColorInput && (() => {
                        const availableSizes = customOptions.customSizes.length > 0
                          ? customOptions.customSizes.map((s) => s.label)
                          : ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "Único"];

                        const isColorSelected = Boolean(quickAddColor.trim());
                        const existingSizesForSelectedColor = isColorSelected
                          ? variants.filter((v) => v.color.toLowerCase() === quickAddColor.trim().toLowerCase()).map((v) => v.size)
                          : [];

                        return (
                          <div className="absolute left-0 top-10 z-40 w-[350px] max-w-[92vw] rounded-2xl border border-border bg-popover p-3.5 shadow-lift space-y-3">
                            {/* Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-border/50">
                              <div className="flex items-center gap-1.5">
                                <Plus className="size-3.5 text-primary" />
                                <p className="text-xs font-bold text-foreground">Adicionar Variações à Grade</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowColorInput(false);
                                  setColorSearchQuery("");
                                }}
                                className="size-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                aria-label="Fechar"
                              >
                                <X className="size-3" />
                              </button>
                            </div>

                            {/* ETAPA 1: Escolha a Cor */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                  1 · Selecione a Cor
                                </p>
                                {quickAddColor && (
                                  <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                                    <span className={cn("size-2 rounded-full", getColorDot(quickAddColor))} />
                                    <span>{quickAddColor}</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2 py-1.5 focus-within:border-primary transition-all">
                                <Search className="size-3 text-muted-foreground shrink-0" />
                                <input
                                  autoFocus
                                  type="text"
                                  value={colorSearchQuery}
                                  onChange={(e) => setColorSearchQuery(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && colorSearchQuery.trim()) {
                                      e.preventDefault();
                                      setQuickAddColor(colorSearchQuery.trim());
                                    }
                                  }}
                                  placeholder="Buscar ou digitar nova cor..."
                                  className="w-full bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground"
                                />
                                {colorSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setColorSearchQuery("")}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                  >
                                    <X className="size-3" />
                                  </button>
                                )}
                              </div>

                              {/* Cores já na peça (para adicionar tamanhos a elas) */}
                              {activeColors.length > 0 && !colorSearchQuery && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground">Já na peça:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {activeColors.map((cor) => {
                                      const isSelected = quickAddColor.toLowerCase() === cor.toLowerCase();
                                      return (
                                        <button
                                          key={cor}
                                          type="button"
                                          onClick={() => setQuickAddColor(cor)}
                                          className={cn(
                                            "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                                            isSelected
                                              ? "bg-primary text-primary-foreground shadow-xs font-bold ring-2 ring-primary/40"
                                              : "bg-secondary/60 hover:bg-secondary text-foreground border border-border/60",
                                          )}
                                        >
                                          <span className={cn("size-2 rounded-full", getColorDot(cor))} />
                                          <span>{cor}</span>
                                          {isSelected && <Check className="size-2.5" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Paleta da Loja ou Fábrica */}
                              <div className="space-y-1">
                                <p className="text-[10px] font-semibold text-muted-foreground">
                                  {customOptions.customColors.length > 0 ? "Cores da Loja / Paleta:" : "Paleta da Coleção:"}
                                </p>
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5">
                                  {(customOptions.customColors.length > 0
                                    ? customOptions.customColors.map((c) => ({ label: c.label, hex: c.hex }))
                                    : ["Off-White", "Preto", "Areia", "Nude", "Terracota", "Caramelo", "Verde Oliva", "Azul Marinho", "Vinho", "Cinza Mescla"].map((name) => ({ label: name, hex: undefined }))
                                  )
                                    .filter((c) => !colorSearchQuery || c.label.toLowerCase().includes(colorSearchQuery.toLowerCase()))
                                    .map((c) => {
                                      const isSelected = quickAddColor.toLowerCase() === c.label.toLowerCase();
                                      return (
                                        <button
                                          key={c.label}
                                          type="button"
                                          onClick={() => setQuickAddColor(c.label)}
                                          className={cn(
                                            "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                                            isSelected
                                              ? "bg-primary text-primary-foreground shadow-xs font-bold ring-2 ring-primary/40"
                                              : "bg-secondary/40 hover:bg-secondary text-foreground border border-transparent hover:border-border/60",
                                          )}
                                        >
                                          {c.hex ? (
                                            <span className="size-2 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} />
                                          ) : (
                                            <span className={cn("size-2 rounded-full shrink-0", getColorDot(c.label))} />
                                          )}
                                          <span>{c.label}</span>
                                          {isSelected && <Check className="size-2.5" />}
                                        </button>
                                      );
                                    })}
                                </div>
                              </div>

                              {colorSearchQuery.trim() && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickAddColor(colorSearchQuery.trim());
                                    setColorSearchQuery("");
                                  }}
                                  className="w-full py-1 text-xs font-bold border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                                >
                                  <Plus className="size-3" />
                                  <span>Selecionar cor &quot;{colorSearchQuery.trim()}&quot;</span>
                                </button>
                              )}
                            </div>

                            {/* ETAPA 2: Selecione os Tamanhos */}
                            <div className="space-y-2 border-t border-border/40 pt-2.5">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                  2 · Tamanhos {quickAddColor ? `para ${quickAddColor}` : ""}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const std = ["P", "M", "G", "GG"];
                                      const available = std.filter((s) => !existingSizesForSelectedColor.includes(s));
                                      setQuickAddSizes(Array.from(new Set([...quickAddSizes, ...available])));
                                    }}
                                    className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                                  >
                                    + P ao GG
                                  </button>
                                  {quickAddSizes.length > 0 && (
                                    <>
                                      <span className="text-muted-foreground/40 text-[10px]">·</span>
                                      <button
                                        type="button"
                                        onClick={() => setQuickAddSizes([])}
                                        className="text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                                      >
                                        Limpar
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {availableSizes.map((sz) => {
                                  const alreadyExistsForThisColor = existingSizesForSelectedColor.includes(sz);
                                  const isSelected = quickAddSizes.includes(sz);

                                  if (alreadyExistsForThisColor) {
                                    return (
                                      <span
                                        key={sz}
                                        className="px-2 py-1 rounded-lg border border-dashed border-border/70 bg-secondary/30 text-muted-foreground/50 text-[11px] font-bold select-none flex items-center gap-1"
                                        title={`${sz} já existe para ${quickAddColor}`}
                                      >
                                        <Check className="size-2.5 text-muted-foreground/50" />
                                        <span>{sz}</span>
                                      </span>
                                    );
                                  }

                                  return (
                                    <button
                                      key={sz}
                                      type="button"
                                      onClick={() => {
                                        setQuickAddSizes((prev) =>
                                          prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]
                                        );
                                      }}
                                      className={cn(
                                        "px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer",
                                        isSelected
                                          ? "border-primary bg-primary text-primary-foreground shadow-xs font-black ring-1 ring-primary"
                                          : "border-border/70 bg-background text-foreground hover:bg-secondary/70 shadow-2xs",
                                      )}
                                      title={isSelected ? `Desmarcar ${sz}` : `Marcar tamanho ${sz}`}
                                    >
                                      {sz}
                                    </button>
                                  );
                                })}
                              </div>

                              {!isColorSelected && (
                                <p className="text-[10px] text-muted-foreground/70 italic">
                                  Dica: Escolha a cor no passo 1 para ver os tamanhos disponíveis.
                                </p>
                              )}
                            </div>

                            {/* ETAPA 3: Botão de Ação / Confirmação */}
                            <div className="border-t border-border/40 pt-2.5 space-y-2">
                              {isColorSelected && quickAddSizes.length > 0 ? (
                                <Button
                                  type="button"
                                  onClick={() => handleAddCustomVariations(quickAddColor, quickAddSizes)}
                                  className="w-full h-9 text-xs font-bold gradient-primary text-primary-foreground rounded-xl shadow-glow cursor-pointer gap-1.5 hover:opacity-95 transition-all"
                                >
                                  <Plus className="size-3.5" />
                                  <span>
                                    Adicionar {quickAddSizes.length} {quickAddSizes.length === 1 ? "variação" : "variações"} ({quickAddColor}: {quickAddSizes.join(", ")})
                                  </span>
                                </Button>
                              ) : !isColorSelected ? (
                                <Button
                                  type="button"
                                  disabled
                                  className="w-full h-8 text-xs font-medium rounded-xl opacity-50 bg-secondary text-muted-foreground"
                                >
                                  Selecione uma cor no passo 1
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  disabled
                                  className="w-full h-8 text-xs font-medium rounded-xl opacity-50 bg-secondary text-muted-foreground"
                                >
                                  Selecione ao menos 1 tamanho para {quickAddColor}
                                </Button>
                              )}

                              {/* Link para gerador completo */}
                              <button
                                type="button"
                                onClick={() => {
                                  setShowGradeModal(true);
                                  setShowColorInput(false);
                                  setColorSearchQuery("");
                                }}
                                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
                              >
                                <Pencil className="size-3" />
                                <span>Abrir gerador de grade completo</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* BLOCO DIREITA: Estratégia de Precificação & Quantidade */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      {/* Mini seletor de estratégia (Sempre visível em ambos os modos) */}
                      <div className="inline-flex rounded-lg border border-border/80 bg-background p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          setStrategy("margin");
                          setMatrixGlobalMode("margin");
                        }}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-semibold transition-all cursor-pointer",
                          strategy === "margin"
                            ? "bg-primary text-primary-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Margem
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStrategy("markup");
                          setMatrixGlobalMode("markup");
                        }}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-semibold transition-all cursor-pointer",
                          strategy === "markup"
                            ? "bg-primary text-primary-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Markup
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStrategy("direct_price");
                          setMatrixGlobalMode("direct_price");
                        }}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-semibold transition-all cursor-pointer",
                          strategy === "direct_price"
                            ? "bg-primary text-primary-foreground shadow-xs font-bold"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Preço fixo
                      </button>
                    </div>

                    {/* Controles da Estratégia inline com badges de resultado em tempo real */}
                    {gradePricingMode === "unified" ? (
                      <>
                        {strategy === "margin" && (
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center rounded-lg border border-border/80 bg-background shadow-2xs h-8 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = Math.max(5, desiredMargin - 5);
                                  setDesiredMargin(next);
                                  setMatrixGlobalMarginStr(String(next));
                                }}
                                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                              >
                                <Minus className="size-3" />
                              </button>
                              <span className="px-2 text-xs font-black numeric text-foreground">{desiredMargin}%</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = Math.min(95, desiredMargin + 5);
                                  setDesiredMargin(next);
                                  setMatrixGlobalMarginStr(String(next));
                                }}
                                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>



                            {summaryPrices.avgSuggested > 0 && (
                              <div className="hidden xl:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/80 text-[11px] font-semibold text-muted-foreground">
                                <span>→ Preço Médio</span>
                                <span className="text-foreground font-bold">{brl(summaryPrices.avgSuggested)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {strategy === "markup" && (
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center rounded-lg border border-border/80 bg-background shadow-2xs h-8 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = Math.max(10, markup - 10);
                                  setMarkup(next);
                                  setMatrixGlobalMarkupStr(String(next));
                                }}
                                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                              >
                                <Minus className="size-3" />
                              </button>
                              <span className="px-2 text-xs font-black numeric text-foreground">{markup}%</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = markup + 10;
                                  setMarkup(next);
                                  setMatrixGlobalMarkupStr(String(next));
                                }}
                                className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition-colors"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>


                            {summaryPrices.avgMargin > 0 && (
                              <div className="hidden xl:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-success/10 border border-success/20 text-[11px] font-semibold text-success">
                                <span>→ Margem Líquida</span>
                                <span className="font-bold">{pct(summaryPrices.avgMargin)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {strategy === "direct_price" && (
                          <div className="flex items-center gap-1.5">
                            <div className="relative flex h-8 w-28 items-center rounded-lg border border-border/80 bg-background shadow-2xs focus-within:border-primary transition-all">
                              <span className="pl-2 text-xs font-bold text-muted-foreground select-none">R$</span>
                              <input
                                inputMode="decimal"
                                value={directSalePrice}
                                onChange={(e) => {
                                  setDirectSalePrice(e.target.value);
                                  setMatrixGlobalDirectPrice(e.target.value);
                                }}
                                placeholder="0,00"
                                className="h-8 w-full bg-transparent px-1.5 text-xs font-black text-foreground outline-none numeric"
                              />
                            </div>


                            {summaryPrices.avgMargin > 0 && (
                              <div className="hidden xl:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-success/10 border border-success/20 text-[11px] font-semibold text-success">
                                <span>→ Margem</span>
                                <span className="font-bold">{pct(summaryPrices.avgMargin)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>

                  {/* Ações Específicas do Modo Isolado */}
                  {gradePricingMode === "isolated" && (
                    <div className="flex items-center gap-1.5">
                      {/* Utilitário Preenchimento Rápido / Preencher Todas */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-semibold rounded-lg border-border bg-background cursor-pointer shadow-2xs gap-1.5 hover:bg-secondary/60"
                          >
                            <Zap className="size-3 text-amber-500 fill-amber-500" />
                            <span>Preencher todas</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-68 p-3 rounded-xl border border-border bg-popover shadow-lift space-y-2.5">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-foreground">Preenchimento rápido do lote</p>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                              {strategy === "margin" && "Aplica uma margem base a todas as peças da tabela:"}
                              {strategy === "markup" && "Aplica um markup multiplicador a todas as peças:"}
                              {strategy === "direct_price" && "Aplica um preço de venda inicial a todas as peças:"}
                            </p>
                          </div>

                          {/* Opções por Estratégia */}
                          {strategy === "margin" && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-1.5">
                                {[
                                  { val: 35, label: "35%", desc: "Giro / Queima" },
                                  { val: 50, label: "50%", desc: "Padrão Saudável" },
                                  { val: 60, label: "60%", desc: "Meta de Crescimento" },
                                  { val: 70, label: "70%", desc: "Premium / Exclusivo" },
                                ].map((preset) => (
                                  <button
                                    key={preset.val}
                                    type="button"
                                    onClick={() => {
                                      setVariants((prev) => prev.map((v) => ({ ...v, customMargin: String(preset.val), customSalePrice: "" })));
                                      toast.success(`Margem ${preset.label} (${preset.desc}) aplicada a todas as variações.`);
                                    }}
                                    className="py-1.5 px-2 rounded-lg border border-border bg-secondary/50 hover:bg-primary hover:text-primary-foreground hover:border-primary text-xs transition-all text-left cursor-pointer"
                                  >
                                    <span className="font-black block">{preset.label}</span>
                                    <span className="text-[10px] font-medium opacity-70">{preset.desc}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {strategy === "markup" && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-1.5">
                                {[
                                  { val: 80, label: "1.8x" },
                                  { val: 100, label: "2.0x" },
                                  { val: 150, label: "2.5x" },
                                  { val: 200, label: "3.0x" },
                                ].map((mk) => (
                                  <button
                                    key={mk.val}
                                    type="button"
                                    onClick={() => {
                                      setVariants((prev) => prev.map((v) => ({ ...v, customMarkup: String(mk.val), customSalePrice: "" })));
                                      toast.success(`Markup de ${mk.label} (${mk.val}%) aplicado a todas as variações.`);
                                    }}
                                    className="py-1 px-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-primary hover:text-primary-foreground hover:border-primary text-xs font-bold transition-all text-center cursor-pointer"
                                  >
                                    {mk.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {strategy === "direct_price" && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-1.5">
                                {["49,90", "69,90", "89,90", "119,90"].map((pr) => (
                                  <button
                                    key={pr}
                                    type="button"
                                    onClick={() => {
                                      setVariants((prev) => prev.map((v) => ({ ...v, customSalePrice: pr })));
                                      toast.success(`Preço de R$ ${pr} aplicado a todas as variações.`);
                                    }}
                                    className="py-1 px-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-primary hover:text-primary-foreground hover:border-primary text-xs font-bold transition-all text-center cursor-pointer"
                                  >
                                    {pr}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Replicar custo de atacado dentro do menu se houver baseWholesaleGrade */}
                          {baseWholesaleGrade && (
                            <div className="pt-1.5 border-t border-border/60">
                              <button
                                type="button"
                                onClick={() => {
                                  setVariants((prev) => prev.map((v) => ({ ...v, wholesaleCost: baseWholesaleGrade })));
                                  toast.success(`Custo base R$ ${baseWholesaleGrade} replicado em todas as variações.`);
                                }}
                                className="w-full text-left py-1 px-2 rounded-lg hover:bg-secondary text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-between"
                              >
                                <span>Replicar custo de atacado</span>
                                <span className="font-bold text-foreground">{brl(toNumber(baseWholesaleGrade))}</span>
                              </button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>



                      {/* Limpar personalizações manuais (aparece somente se houver customizações ativas) */}
                      {variants.some((v) => (v.customSalePrice !== undefined && v.customSalePrice !== "") || v.customMargin !== undefined || v.customMarkup !== undefined) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setVariants((prev) => prev.map((v) => ({ ...v, customSalePrice: "", customMargin: undefined, customMarkup: undefined })));
                            toast.success("Personalizações limpas: todas as variações sincronizadas.");
                          }}
                          className="h-8 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground cursor-pointer gap-1"
                          title="Limpa margens, markups e preços manuais desta grade"
                        >
                          <RotateCcw className="size-3" />
                          <span>Limpar</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

              {/* ── CORPO DA PLANILHA DE VARIAÇÕES ── */}
              <div className="pt-1">
                {variants.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-border/80 bg-secondary/15 py-6 px-4 sm:py-7 sm:px-6 text-center space-y-3.5">
                    <div className="flex size-11 mx-auto items-center justify-center rounded-xl bg-primary/10 text-primary shadow-glow">
                      <Boxes className="size-5" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="text-sm sm:text-base font-bold text-foreground">
                        Monte a grade do modelo para precificar
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Defina as cores, os tamanhos e as quantidades do lote. A planilha com custos e lucros será gerada automaticamente.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                      <Button
                        type="button"
                        size="default"
                        onClick={() => setShowGradeModal(true)}
                        className="gradient-primary text-primary-foreground font-bold rounded-xl text-xs sm:text-sm h-10 sm:h-11 px-6 shadow-glow hover:opacity-95 transition-all cursor-pointer"
                      >
                        <Sparkles className="size-4 mr-2" />
                        <span>Gerar Grade de Variações</span>
                      </Button>
                    </div>


                  </div>
                ) : (
                <div className="overflow-x-auto rounded-xl border border-border/80 bg-background shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/70 bg-secondary/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                        <th className="py-3 pl-4 w-24">Tamanho</th>
                        <th className="py-3 px-3 text-center w-28">Qtd.</th>
                        <th className="py-3 px-3 text-right w-32">Custo Atacado</th>
                        <th className="py-3 px-3 text-right w-28">Custo Real</th>
                        {/* Coluna 5: Input Driver */}
                        {strategy === "margin" && (
                          <th className="py-3 px-3 text-center w-28 text-primary font-black">
                            Margem % ↓
                          </th>
                        )}
                        {strategy === "markup" && (
                          <th className="py-3 px-3 text-center w-32 text-primary font-black">
                            Markup % ↓
                          </th>
                        )}
                        {strategy === "direct_price" && (
                          <th className="py-3 px-3 text-right w-32 text-primary font-black">
                            Preço de Venda ↓
                          </th>
                        )}
                        {/* Coluna 6: Saída Principal */}
                        {(strategy === "margin" || strategy === "markup") && (
                          <th className="py-3 px-3 text-right w-32 font-black text-foreground">
                            Preço de Venda
                          </th>
                        )}
                        {strategy === "direct_price" && (
                          <th className="py-3 px-3 text-center w-24 font-bold text-foreground">
                            Margem ↑
                          </th>
                        )}
                        {/* Coluna 7: Feedback Secundário */}
                        {strategy === "margin" && (
                          <th className="py-3 px-3 text-right w-28 font-bold text-foreground">Lucro Líquido</th>
                        )}
                        {strategy === "markup" && (
                          <th className="py-3 px-3 text-center w-24 font-bold text-foreground">Margem Líquida</th>
                        )}
                        {strategy === "direct_price" && (
                          <th className="py-3 px-3 text-right w-28 font-bold text-foreground">Lucro Líquido</th>
                        )}
                        {/* Coluna 8: Ações */}
                        <th className="py-3 pr-4 text-center w-12"><span className="sr-only">Ações</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {colorGroups.map((group) => {
                        if (group.items.length === 0) return null;
                        return (
                          <Fragment key={group.color}>
                            {/* Header do Grupo de Cor */}
                            <tr className="bg-secondary/40 border-y border-border/60">
                              <td colSpan={7} className="py-2.5 pl-4">
                                <div className="flex items-center gap-2.5">
                                  <span className={cn("size-3 rounded-full shrink-0 ring-2 ring-background shadow-xs", getColorDot(group.color))} />
                                  <span className="text-xs font-bold text-foreground tracking-tight">{group.color}</span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-background text-muted-foreground border border-border/70 shadow-2xs">
                                    {group.totalUnits} {group.totalUnits === 1 ? "unidade" : "unidades"} no lote
                                  </span>
                                  {group.avgPrice > 0 && (
                                    <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                                      · Preço médio: <strong className="text-foreground">{brl(group.avgPrice)}</strong>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => removeColorFromGrade(group.color)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer whitespace-nowrap"
                                  title={`Excluir cor ${group.color} e suas variações`}
                                >
                                  <Trash2 className="size-3" />
                                  <span>Remover cor</span>
                                </button>
                              </td>
                            </tr>

                            {/* Linhas dos Tamanhos desta Cor */}
                            {group.items.map((v) => {
                              const effectiveWholesale = v.wholesaleCost !== "" ? v.wholesaleCost : baseWholesaleGrade;
                              const marginHealthy = v.marginOnPrice >= 30;
                              const marginModerate = v.marginOnPrice >= 15 && v.marginOnPrice < 30;
                              const marginCritical = v.profit <= 0 || v.marginOnPrice < 15;

                              const hasCost = v.wholesaleNum > 0 || (effectiveWholesale !== "" && toNumber(effectiveWholesale) > 0);

                              const effectiveMarginStr = (v.customMargin !== undefined && v.customMargin !== "")
                                ? v.customMargin : String(desiredMargin);
                              const effectiveMarkupStr = (v.customMarkup !== undefined && v.customMarkup !== "")
                                ? v.customMarkup : String(markup);
                              const effectivePriceStr = (v.customSalePrice !== undefined && v.customSalePrice !== "")
                                ? v.customSalePrice
                                : (directSalePrice || (v.suggestedPrice > 0 ? v.suggestedPrice.toFixed(2).replace(".", ",") : ""));
                              const hasCustomMargin = v.customMargin !== undefined && v.customMargin !== "" && gradePricingMode === "isolated";
                              const hasCustomMarkup = v.customMarkup !== undefined && v.customMarkup !== "" && gradePricingMode === "isolated";
                              const hasCustomPrice = v.customSalePrice !== undefined && v.customSalePrice !== "" && gradePricingMode === "isolated";
                              const hasCustomWholesale = v.wholesaleCost !== "" && gradePricingMode === "isolated";

                              return (
                                <tr key={v.id} className="hover:bg-secondary/15 transition-colors">
                                  {/* Tamanho */}
                                  <td className="py-2 pl-4">
                                    <span className="inline-flex items-center justify-center min-w-8 h-7 px-2 rounded-md bg-secondary/80 border border-border/70 text-foreground font-black text-xs shadow-2xs tracking-wide">
                                      {v.size}
                                    </span>
                                  </td>

                                  {/* Stepper QTD Refinado */}
                                  <td className="py-2 px-3 text-center">
                                    <div className="inline-flex items-center h-8 rounded-lg border border-border/80 bg-background shadow-2xs hover:border-foreground/30 transition-colors">
                                      <button
                                        type="button"
                                        onClick={() => updateVariantQty(v.id, Math.max(1, (v.qty || 1) - 1))}
                                        className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-l-md transition-colors cursor-pointer"
                                        title="Diminuir quantidade"
                                      >
                                        <Minus className="size-3" />
                                      </button>
                                      <span className="w-8 text-center text-xs font-black numeric text-foreground select-none">{v.qty || 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => updateVariantQty(v.id, (v.qty || 1) + 1)}
                                        className="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-r-md transition-colors cursor-pointer"
                                        title="Aumentar quantidade"
                                      >
                                        <Plus className="size-3" />
                                      </button>
                                    </div>
                                  </td>

                                  {/* Custo de Atacado */}
                                  <td className="py-2 px-3 text-right">
                                    <div className="inline-flex justify-end">
                                      <SmartTableNumericInput
                                        mode="currency"
                                        value={effectiveWholesale}
                                        onChange={(val) => updateVariantCost(v.id, val)}
                                        placeholder="0,00"
                                        isCustom={hasCustomWholesale}
                                        onReset={hasCustomWholesale ? () => {
                                          updateVariantCost(v.id, "");
                                          toast.success(`${v.size}: usando custo padrão da grade.`);
                                        } : undefined}
                                        resetTitle="Resetar para custo padrão da grade"
                                        min={0}
                                        step={1}
                                        shiftStep={5}
                                        altStep={0.5}
                                      />
                                    </div>
                                  </td>

                                  {/* Custo Real */}
                                  <td className="py-2 px-3 text-right font-bold numeric text-xs">
                                    {hasCost && v.realCost > 0 ? (
                                      <span className="text-foreground/90 font-bold">{brl(v.realCost)}</span>
                                    ) : (
                                      <span className="text-muted-foreground/60 font-semibold">R$ 0,00</span>
                                    )}
                                  </td>

                                  {/* ── COLUNA 5: INPUT DRIVER ── */}

                                  {/* strategy=margin → INPUT Margem % */}
                                  {strategy === "margin" && (
                                    <td className="py-2 px-3 text-center">
                                      <SmartTableNumericInput
                                        mode="percentage"
                                        value={effectiveMarginStr}
                                        onChange={(val) => updateVariantCustomMargin(v.id, val)}
                                        placeholder="50"
                                        isCustom={hasCustomMargin}
                                        onReset={hasCustomMargin ? () => {
                                          setVariants((prev) => prev.map((item) =>
                                            item.id === v.id ? { ...item, customMargin: undefined } : item
                                          ));
                                          toast.success(`${v.size}: usando margem padrão da grade.`);
                                        } : undefined}
                                        resetTitle="Resetar para margem padrão"
                                        min={1}
                                        max={99.9}
                                        step={1}
                                        shiftStep={5}
                                        altStep={0.5}
                                      />
                                    </td>
                                  )}

                                  {/* strategy=markup → INPUT Markup % */}
                                  {strategy === "markup" && (
                                    <td className="py-2 px-3 text-center">
                                      <div className="inline-flex items-center gap-1.5 justify-center">
                                        <SmartTableNumericInput
                                          mode="percentage"
                                          value={effectiveMarkupStr}
                                          onChange={(val) => updateVariantCustomMarkup(v.id, val)}
                                          placeholder="100"
                                          isCustom={hasCustomMarkup}
                                          onReset={hasCustomMarkup ? () => {
                                            setVariants((prev) => prev.map((item) =>
                                              item.id === v.id ? { ...item, customMarkup: undefined } : item
                                            ));
                                            toast.success(`${v.size}: usando markup padrão da grade.`);
                                          } : undefined}
                                          resetTitle="Resetar para markup padrão"
                                          min={0}
                                          step={5}
                                          shiftStep={20}
                                          altStep={1}
                                        />
                                        <span className="text-[10px] text-muted-foreground font-semibold numeric shrink-0">
                                          {(1 + toNumber(effectiveMarkupStr) / 100).toFixed(1)}x
                                        </span>
                                      </div>
                                    </td>
                                  )}

                                  {/* strategy=direct_price → INPUT Preço de Venda Individual */}
                                  {strategy === "direct_price" && (
                                    <td className="py-2 px-3 text-right">
                                      <div className="inline-flex justify-end">
                                        <SmartTableNumericInput
                                          mode="currency"
                                          value={effectivePriceStr}
                                          onChange={(val) => updateVariantPrice(v.id, val)}
                                          placeholder="0,00"
                                          isCustom={hasCustomPrice}
                                          onReset={hasCustomPrice ? () => {
                                            setVariants((prev) => prev.map((item) =>
                                              item.id === v.id ? { ...item, customSalePrice: "" } : item
                                            ));
                                            toast.success(`${v.size}: usando preço padrão da grade.`);
                                          } : undefined}
                                          resetTitle="Resetar para preço padrão"
                                          min={0}
                                          step={1}
                                          shiftStep={5}
                                          altStep={0.5}
                                        />
                                      </div>
                                    </td>
                                  )}

                                  {/* ── COLUNA 6: SAÍDA PRINCIPAL ── */}
                                  {(strategy === "margin" || strategy === "markup") && (
                                    <td className="py-2 px-3 text-right">
                                      {v.suggestedPrice > 0 ? (
                                        <span className="text-xs sm:text-sm font-black text-foreground tracking-tight tabular-nums">
                                          {brl(v.suggestedPrice)}
                                        </span>
                                      ) : (
                                        <span className="text-xs font-bold text-muted-foreground/60 tabular-nums">
                                          R$ 0,00
                                        </span>
                                      )}
                                    </td>
                                  )}

                                  {/* strategy=direct_price → Margem Resultante */}
                                  {strategy === "direct_price" && (
                                    <td className="py-2 px-3 text-center">
                                      {v.wholesaleNum > 0 && v.suggestedPrice > 0 ? (
                                        <span className={cn(
                                          "inline-flex items-center gap-1.5 text-xs font-bold numeric justify-center",
                                          marginHealthy && "text-emerald-600 dark:text-emerald-400",
                                          marginModerate && "text-amber-500",
                                          marginCritical && "text-destructive",
                                        )}>
                                          <span className={cn(
                                            "size-1.5 rounded-full shrink-0 shadow-xs",
                                            marginHealthy && "bg-emerald-500",
                                            marginModerate && "bg-amber-500",
                                            marginCritical && "bg-rose-500",
                                          )} />
                                          {pct(v.marginOnPrice)}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold numeric text-muted-foreground/60 justify-center">
                                          <span className="size-1.5 rounded-full shrink-0 bg-muted-foreground/40 shadow-xs" />
                                          <span>0,0%</span>
                                        </span>
                                      )}
                                    </td>
                                  )}

                                  {/* ── COLUNA 7: FEEDBACK SECUNDÁRIO ── */}

                                  {/* strategy=markup → Margem Líquida */}
                                  {strategy === "markup" && (
                                    <td className="py-2 px-3 text-center">
                                      {v.wholesaleNum > 0 && v.suggestedPrice > 0 ? (
                                        <span className={cn(
                                          "inline-flex items-center gap-1.5 text-xs font-bold numeric justify-center",
                                          marginHealthy && "text-emerald-600 dark:text-emerald-400",
                                          marginModerate && "text-amber-500",
                                          marginCritical && "text-destructive",
                                        )}>
                                          <span className={cn(
                                            "size-1.5 rounded-full shrink-0 shadow-xs",
                                            marginHealthy && "bg-emerald-500",
                                            marginModerate && "bg-amber-500",
                                            marginCritical && "bg-rose-500",
                                          )} />
                                          {pct(v.marginOnPrice)}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold numeric text-muted-foreground/60 justify-center">
                                          <span className="size-1.5 rounded-full shrink-0 bg-muted-foreground/40 shadow-xs" />
                                          <span>0,0%</span>
                                        </span>
                                      )}
                                    </td>
                                  )}

                                  {/* strategy=margin | direct_price → Lucro Líquido Sincronizado */}
                                  {(strategy === "margin" || strategy === "direct_price") && (
                                    <td className="py-2 px-3 text-right">
                                      {hasCost && v.suggestedPrice > 0 ? (
                                        <span className={cn(
                                          "inline-flex items-center gap-1.5 justify-end text-xs font-extrabold numeric",
                                          marginHealthy && "text-emerald-600 dark:text-emerald-400",
                                          marginModerate && "text-amber-500",
                                          marginCritical && "text-destructive",
                                        )}>
                                          <span className={cn(
                                            "size-1.5 rounded-full shrink-0 shadow-xs",
                                            marginHealthy && "bg-emerald-500",
                                            marginModerate && "bg-amber-500",
                                            marginCritical && "bg-rose-500",
                                          )} />
                                          <span>{v.profit > 0 ? "+" : ""}{brl(v.profit)}</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 justify-end text-xs font-semibold numeric text-muted-foreground/60">
                                          <span className="size-1.5 rounded-full shrink-0 bg-muted-foreground/40 shadow-xs" />
                                          <span>+R$ 0,00</span>
                                        </span>
                                      )}
                                    </td>
                                  )}

                                  {/* Excluir Variação */}
                                  <td className="py-2 pr-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removeVariant(v.id)}
                                      className="size-7 inline-flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                                      title={`Remover ${v.color} (${v.size})`}
                                      aria-label="Excluir variação"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border/80 bg-secondary/35 text-xs font-semibold">
                        <td className="py-3 pl-4 text-xs font-bold text-foreground uppercase tracking-wider">
                          Total do Lote
                        </td>
                        <td className="py-3 px-3 text-center text-xs font-black text-primary numeric">
                          {actualLotUnits} un.
                        </td>
                        <td className="py-3 px-3 text-right numeric font-bold text-foreground">
                          {summaryPrices.totalInvestment > 0 ? brl(summaryPrices.totalInvestment) : "R$ 0,00"}
                        </td>
                        <td className="py-3 px-3 text-right numeric font-semibold text-muted-foreground">
                          {summaryPrices.avgCost > 0 ? `Méd. ${brl(summaryPrices.avgCost)}` : "R$ 0,00"}
                        </td>
                        {/* Coluna 5: Resumo Margem % */}
                        {strategy === "margin" && (
                          <td className="py-3 px-3 text-center text-xs font-bold text-foreground">
                            {summaryPrices.totalInvestment > 0 && summaryPrices.avgMargin > 0
                              ? `Méd. ${summaryPrices.avgMargin.toFixed(1).replace(".", ",")}%`
                              : `Meta ${(desiredMargin || 50).toFixed(1).replace(".", ",")}%`}
                          </td>
                        )}
                        {strategy === "markup" && (
                          <td className="py-3 px-3 text-center text-xs font-bold text-foreground">
                            {summaryPrices.totalInvestment > 0 && summaryPrices.avgMarkup > 0
                              ? `Méd. ${summaryPrices.avgMarkup.toFixed(0)}%`
                              : `Meta ${(markup || 100).toFixed(0)}%`}
                          </td>
                        )}
                        {strategy === "direct_price" && (
                          <td className="py-3 px-3 text-right numeric font-black text-foreground">
                            {summaryPrices.avgSuggested > 0 ? `Méd. ${brl(summaryPrices.avgSuggested)}` : "Média R$ 0,00"}
                          </td>
                        )}
                        {/* Coluna 6: Resumo Saída Principal */}
                        {(strategy === "margin" || strategy === "markup") && (
                          <td className="py-3 px-3 text-right numeric text-foreground font-black">
                            {summaryPrices.avgSuggested > 0 ? `Méd. ${brl(summaryPrices.avgSuggested)}` : "Média R$ 0,00"}
                          </td>
                        )}
                        {strategy === "direct_price" && (
                          <td className="py-3 px-3 text-center numeric text-foreground font-bold">
                            {summaryPrices.avgMargin > 0 ? `${summaryPrices.avgMargin.toFixed(1).replace(".", ",")}%` : "0,0%"}
                          </td>
                        )}
                        {/* Coluna 7: Resumo Lucro Total do Lote */}
                        {strategy === "markup" && (
                          <td className="py-3 px-3 text-center numeric text-foreground font-bold">
                            {summaryPrices.avgMargin > 0 ? `${summaryPrices.avgMargin.toFixed(1).replace(".", ",")}%` : "0,0%"}
                          </td>
                        )}
                        {(strategy === "margin" || strategy === "direct_price") && (
                          <td className="py-3 px-3 text-right numeric font-black">
                            {summaryPrices.totalInvestment > 0 && summaryPrices.totalProfit !== 0 ? (
                              <span className={cn(
                                "inline-flex items-center gap-1.5 justify-end text-xs font-black numeric",
                                summaryPrices.totalProfit > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                              )}>
                                <span className={cn(
                                  "size-1.5 rounded-full shrink-0 shadow-xs",
                                  summaryPrices.totalProfit > 0 ? "bg-emerald-500" : "bg-rose-500"
                                )} />
                                <span>{summaryPrices.totalProfit > 0 ? "+" : ""}{brl(summaryPrices.totalProfit)}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 justify-end text-xs font-semibold numeric text-muted-foreground/60">
                                <span className="size-1.5 rounded-full shrink-0 bg-muted-foreground/40 shadow-xs" />
                                <span>+R$ 0,00</span>
                              </span>
                            )}
                          </td>
                        )}
                        {/* Coluna 8: Ações */}
                        <td className="py-3 pr-4" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              </div>

              {/* Modal Gerador de Grade */}
              <GradeGeneratorModal
                open={showGradeModal}
                onOpenChange={setShowGradeModal}
                currentColors={activeColors}
                currentSizes={modalCurrentSizes}
                storeCustomColors={customOptions.customColors}
                storeCustomSizes={customOptions.customSizes}
                onConfirm={handleConfirmGradeModal}
                isEditing={variants.length > 0}
                initialDraft={gradeModalDraft}
                onDraftChange={setGradeModalDraft}
              />
            </section>

            {/* ── BARRA INFERIOR COMPACTA PARA MOBILE (LG:HIDDEN) ── */}
            <div className="fixed bottom-0 inset-x-0 lg:hidden z-30 border-t border-border/80 bg-background/95 backdrop-blur-md px-4 py-3 shadow-lift">
              <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Preço sugerido</p>
                  <p className="text-xl font-black text-foreground numeric leading-tight">
                    {summaryPrices.hasMultiple
                      ? `${brl(summaryPrices.minSuggested)} a ${brl(summaryPrices.maxSuggested)}`
                      : brl(summaryPrices.avgSuggested)}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {actualLotUnits} un. · Lucro {brl(summaryPrices.totalProfit)}
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={openEntryForCurrent}
                  disabled={!canSubmitGrade}
                  className="h-11 px-5 rounded-xl gradient-primary text-primary-foreground text-xs font-bold shadow-glow hover:opacity-95 transition-all active:scale-[0.98] cursor-pointer shrink-0 disabled:opacity-40"
                >
                  <PackagePlus className="size-4 mr-1.5" />
                  <span>Dar entrada ({actualLotUnits} un.)</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Peças Precificadas (Histórico & Ficha de Entrada) ─────── */}
        {mode === "historico" && (
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-border/50 pb-3.5">
              <div>
                <h2 className="text-base font-semibold">Peças precificadas</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Histórico dos seus cálculos de precificação salvos no sistema.
                </p>
              </div>
              {saved.length > 0 && (
                <Badge variant="outline" className="rounded-full">
                  {saved.length} {saved.length === 1 ? "peça" : "peças"}
                </Badge>
              )}
            </div>

            {saved.length === 0 ? (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-dashed border-border/70 bg-secondary/20 p-3.5 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background border border-border/60 text-muted-foreground shadow-2xs">
                    <Tag className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Nenhuma peça salva ainda</p>
                    <p className="text-[11px] text-muted-foreground">
                      Calcule e clique em &ldquo;Salvar no histórico&rdquo; para consultar depois na hora de dar entrada.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full text-xs font-medium border-border/80 bg-background hover:bg-secondary shrink-0 cursor-pointer"
                  onClick={() => setMode("grade")}
                >
                  Calcular na grade →
                </Button>
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="pb-3 font-semibold">Peça</th>
                      <th className="pb-3 font-semibold">Custo real</th>
                      <th className="pb-3 font-semibold">Margem real</th>
                      <th className="pb-3 font-semibold">Preço sugerido</th>
                      <th className="pb-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {saved.map((p) => {
                      const r = computePricing({
                        wholesale_cost: Number(p.wholesale_cost),
                        freight_cost: Number(p.freight_cost),
                        packaging_cost: Number(p.packaging_cost),
                        other_costs: Number(p.other_costs),
                        margin_pct: Number(p.margin_pct),
                        tax_pct: Number(p.tax_pct),
                        card_rate_pct: cardRate,
                      });
                      return (
                        <tr key={p.id} className="transition-colors hover:bg-surface-muted/60">
                          <td className="py-3.5 font-medium">{p.name}</td>
                          <td className="numeric py-3.5 text-muted-foreground">{brl(r.realCost)}</td>
                          <td className="numeric py-3.5 font-semibold text-foreground">
                            {pct(r.marginOnPrice)}
                          </td>
                          <td className="numeric py-3.5 font-semibold text-primary">
                            {brl(r.suggestedPrice)}
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Dar entrada no Estoque com fotos e quantidades"
                                className="h-8 rounded-lg text-xs font-semibold text-primary hover:bg-primary-soft"
                                onClick={() => openEntryForSaved(p, r.realCost, r.suggestedPrice)}
                              >
                                <PackagePlus className="mr-1.5 size-3.5" /> Dar Entrada
                              </Button>
                              <ConfirmDelete
                                onConfirm={() => remove.mutate(p.id)}
                                description={`"${p.name}" será removida das suas precificações.`}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 rounded-full text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
        </div>

        {/* ── COLUNA DIREITA: Painel Sticky de Resumo ao Vivo (apenas no modo rápido de peça única) ── */}
        {mode === "rapida" && (
          <div className="hidden lg:block sticky top-6 self-start">
            <LivePricingSummaryPanel
              name={name}
              category={category ? getCategoryLabel(storeCategories, category) : ""}
              photoUrl={entryPhotoUrl}
              baseWholesaleCost={toNumber(wholesale)}
              sharedCostsPerUnit={
                resolvePerUnit(freight, freightMode, 1) +
                resolvePerUnit(packaging, packagingMode, 1) +
                resolvePerUnit(other, otherMode, 1)
              }
              totalUnitCost={summaryPrices.avgCost}
              suggestedPrice={summaryPrices.avgSuggested}
              profitPerUnit={summaryPrices.avgProfit}
              effectiveMargin={summaryPrices.avgMargin}
              lotRevenue={summaryPrices.totalRevenue}
              lotProfit={summaryPrices.totalProfit}
              totalUnits={actualLotUnits}
              totalVariants={1}
              hasData={toNumber(wholesale) > 0 && summaryPrices.avgSuggested > 0}
              mode={mode}
              onEntry={openEntryForCurrent}
              onSave={() => save.mutate()}
              onReset={resetPricingModel}
              onPromoteToGrade={promoteToGrade}
              saveDisabled={save.isPending || !name.trim() || toNumber(wholesale) <= 0}
              entryDisabled={actualLotUnits === 0 || summaryPrices.avgSuggested <= 0 || summaryPrices.avgCost <= 0 || !name.trim()}
            />
          </div>
        )}

        </div>
      </div>

      {/* ── Modal Sheet: Ficha de Entrada Operacional no Estoque ──── */}
      <Sheet open={entrySheetOpen} onOpenChange={setEntrySheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto p-6 space-y-6">
          <SheetHeader>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
              <Boxes className="size-4" /> Ficha de entrada no estoque
            </div>
            <SheetTitle className="text-xl font-bold">{entryName || "Nova peça"}</SheetTitle>
            <SheetDescription className="text-xs">
              Adicione fotos, categoria, fornecedor e as quantidades reais recebidas para liberar a
              peça para venda.
            </SheetDescription>
          </SheetHeader>

          {/* Foto da Peça */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Foto da Peça</Label>
            <ImageUploader
              currentUrl={entryPhotoUrl || null}
              bucket="product-photos"
              folder="inventory"
              onUploaded={setEntryPhotoUrl}
              placeholder="Adicionar foto (câmera ou galeria)"
              aspect="portrait"
            />
          </div>

          {/* Categoria, Cor e Fornecedor */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground">Categoria</Label>
              <Select value={entryCategory} onValueChange={setEntryCategory}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Selecione categoria..." />
                </SelectTrigger>
                <SelectContent>
                  {storeCategories.map((c) => (
                    <SelectItem key={c.id} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mode === "grade" && colorGroups.length > 1 ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-muted-foreground">Cores da Grade ({colorGroups.length})</Label>
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl border border-border bg-secondary/30">
                  {colorGroups.map((cg) => (
                    <span key={cg.color} className="inline-flex items-center gap-1.5 rounded-lg bg-card border border-border/80 px-2 py-1 text-xs font-bold text-foreground shadow-2xs">
                      <span className={cn("size-2 rounded-full", getColorDot(cg.color))} />
                      <span>{cg.color}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">({cg.totalUnits} un.)</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Cor da Peça</Label>
                <Input
                  value={entryColor}
                  onChange={(e) => setEntryColor(e.target.value)}
                  placeholder="Ex: Off-White"
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            )}

            <div className={cn("space-y-1.5", mode === "grade" && colorGroups.length > 1 ? "sm:col-span-2" : "")}>
              <Label className="text-xs font-semibold text-muted-foreground">Fornecedor</Label>
              <SupplierCombobox
                value={entrySupplier}
                onChange={setEntrySupplier}
                placeholder="Selecione ou busque parceiro..."
              />
            </div>
          </div>

          {/* Grade de Quantidades Recebidas */}
          {mode === "grade" && colorGroups.length > 1 ? (
            <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Boxes className="size-4" /> Entrada Multi-Cor Segmentada ({colorGroups.length} itens)
                </span>
                <span className="text-xs font-bold text-primary">{entryTotalUnits} un. no total</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Cada cor será criada no estoque como um item individual com sua própria grade de tamanhos, garantindo controle independente no catálogo e na vitrine:
              </p>
              <div className="space-y-2">
                {colorGroups.map((cg) => (
                  <div key={cg.color} className="rounded-xl border border-border/80 bg-card p-3 text-xs shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <span className={cn("size-2.5 rounded-full shrink-0 shadow-2xs", getColorDot(cg.color))} />
                        <span>{cg.color}</span>
                      </div>
                      <span className="font-semibold text-muted-foreground text-[11px]">
                        {cg.totalUnits} {cg.totalUnits === 1 ? "unidade" : "unidades"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {cg.items.map((it) => (
                        <span key={it.id} className="rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-semibold text-foreground border border-border/50">
                          {it.size}: <strong className="text-primary">{it.qty || 1} un.</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Quantidades por Tamanho:
                </Label>
                <span className="text-xs font-bold text-primary">{entryTotalUnits} un. no total</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {Object.keys(entrySizes).map((sz) => (
                  <div
                    key={sz}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-2"
                  >
                    <span className="font-bold text-xs pl-1">{sz}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg"
                        onClick={() =>
                          setEntrySizes((prev) => ({
                            ...prev,
                            [sz]: Math.max((prev[sz] ?? 0) - 1, 0),
                          }))
                        }
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="numeric w-6 text-center text-xs font-bold">
                        {entrySizes[sz] ?? 0}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg"
                        onClick={() =>
                          setEntrySizes((prev) => ({
                            ...prev,
                            [sz]: (prev[sz] ?? 0) + 1,
                          }))
                        }
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card Resumo Financeiro do Lote */}
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Custo Unitário de Entrada (CMV):</span>
              <span className="numeric font-semibold text-foreground">{brl(entryCostPrice)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Preço Sugerido de Venda:</span>
              <span className="numeric font-semibold text-primary">{brl(entrySalePrice)}</span>
            </div>
            <div className="border-t border-border/70 pt-2 flex justify-between font-semibold">
              <span>Investimento Total no Lote:</span>
              <span className="numeric">{brl(entryTotalCost)}</span>
            </div>
            <div className="flex justify-between font-bold text-primary">
              <span>Potencial de Faturamento:</span>
              <span className="numeric">{brl(entryTotalRevenue)}</span>
            </div>
            {entryTotalRevenue > entryTotalCost && (
              <div className="flex justify-between font-bold text-success pt-0.5">
                <span>Lucro Bruto Estimado:</span>
                <span className="numeric">+{brl(entryTotalRevenue - entryTotalCost)}</span>
              </div>
            )}
          </div>

          {/* Botão de Confirmação */}
          <Button
            type="button"
            className="h-12 w-full rounded-xl gradient-primary font-semibold shadow-glow cursor-pointer"
            disabled={confirmEntryMutation.isPending || entryTotalUnits <= 0}
            onClick={() => confirmEntryMutation.mutate()}
          >
            <PackagePlus className="mr-2 size-4" />
            {mode === "grade" && colorGroups.length > 1
              ? `Confirmar Entrada (${colorGroups.length} cores · ${entryTotalUnits} un.)`
              : "Confirmar Entrada no Estoque"}
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function HybridTaxControl({
  label,
  value,
  max,
  onChange,
  hint,
  presets,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  hint?: string;
  presets?: { label: string; value: number }[];
}) {
  // Estado interno de string: permite digitação livre com vírgula (ex: "3,19")
  const [rawValue, setRawValue] = useState<string>(String(value).replace(".", ","));

  // Sincroniza rawValue quando o valor externo muda (ex: slider ou preset)
  useEffect(() => {
    setRawValue(String(value).replace(".", ","));
  }, [value]);

  const displayVal = rawValue;

  return (
    <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0 flex-1">
          <Label className="text-xs font-bold text-foreground">{label}</Label>
          {hint && <p className="text-[11px] text-muted-foreground truncate sm:whitespace-normal">{hint}</p>}
        </div>

        {/* Pílula de Controle Triplo: [ − ] valor% [ + ] */}
        <div className="flex shrink-0 items-center overflow-hidden rounded-xl border border-border/80 bg-secondary/20 shadow-2xs">
          {/* Botão Decremento */}
          <button
            type="button"
            disabled={value <= 0}
            onClick={() => {
              const next = Math.max(0, Math.round(value) - 1);
              onChange(next);
              setRawValue(String(next));
            }}
            className="flex h-9 w-8 shrink-0 items-center justify-center border-r border-border/60 text-muted-foreground transition-all hover:bg-card hover:text-foreground active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
            aria-label="Diminuir"
          >
            <Minus className="size-3.5" />
          </button>

          {/* Campo Central */}
          <div className="flex items-center justify-center px-2 py-0.5">
            <input
              inputMode="decimal"
              value={displayVal}
              onChange={(e) => {
                const raw = e.target.value.replace(",", ".");
                setRawValue(e.target.value);
                const n = parseFloat(raw);
                if (!isNaN(n)) {
                  onChange(Math.min(max, Math.max(0, n)));
                } else if (e.target.value === "" || e.target.value === "0") {
                  onChange(0);
                }
              }}
              onBlur={() => {
                const raw = rawValue.replace(",", ".");
                const n = parseFloat(raw);
                if (!isNaN(n)) {
                  const clamped = Math.min(max, Math.max(0, n));
                  onChange(clamped);
                  setRawValue(String(clamped).replace(".", ","));
                } else {
                  onChange(0);
                  setRawValue("0");
                }
              }}
              className="w-11 text-center text-xs font-bold text-foreground outline-none bg-transparent"
            />
            <span className="text-xs font-bold text-muted-foreground select-none">%</span>
          </div>

          {/* Botão Incremento */}
          <button
            type="button"
            disabled={value >= max}
            onClick={() => {
              const next = Math.min(max, Math.round(value) + 1);
              onChange(next);
              setRawValue(String(next));
            }}
            className="flex h-9 w-8 shrink-0 items-center justify-center border-l border-border/60 text-muted-foreground transition-all hover:bg-card hover:text-foreground active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
            aria-label="Aumentar"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Chips Rápidos de Mercado (Presets) */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1 select-none">
            Atalhos:
          </span>
          {presets.map((p) => {
            const isSelected = Math.abs(value - p.value) < 0.05;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  onChange(p.value);
                }}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer border",
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs"
                    : "bg-secondary/40 border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SliderRow({
  label,
  value,
  max,
  onChange,
  display,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  display?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground">{label}</Label>
        {display && <span className="numeric text-sm font-semibold text-foreground">{display}</span>}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      <Slider
        className="pt-2"
        value={[value]}
        max={max}
        step={1}
        onValueChange={(v) => onChange(v[0] ?? 0)}
      />
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
