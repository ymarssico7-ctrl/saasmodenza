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
  ChevronRight,
  Coins,
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
  wholesaleCost: string; // custom cost string or "" (inherits baseWholesaleGrade)
  customSalePrice: string; // custom sale price string or "" (calculated by strategy)
  qty?: number; // quantidade física da variante no lote
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentColors: string[];
  currentSizes: string[];
  storeCustomColors?: CustomColorOption[];
  storeCustomSizes?: CustomSizeOption[];
  onConfirm: (colors: string[], sizes: string[], defaultQty: number) => void;
}) {
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [defaultQty, setDefaultQty] = useState<number>(2);
  const [customColorInput, setCustomColorInput] = useState<string>("");
  const [customSizeInput, setCustomSizeInput] = useState<string>("");

  useEffect(() => {
    if (open) {
      setSelectedColors(currentColors.length > 0 ? currentColors : ["Preto", "Off-White"]);
      setSelectedSizes(currentSizes.length > 0 ? currentSizes : ["P", "M", "G", "GG"]);
      setDefaultQty(2);
      setCustomColorInput("");
      setCustomSizeInput("");
    }
  }, [open, currentColors, currentSizes]);

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
    setSelectedSizes(sortCanonicalSizes(presetSizes));
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
    { id: "alfaiataria", label: "Alfaiataria (36 a 46)", sizes: ["36", "38", "40", "42", "44", "46"] },
    { id: "plus", label: "Plus Size (GG a G3)", sizes: ["GG", "G1", "G2", "G3"] },
    { id: "jeans", label: "Jeans (34 a 48)", sizes: ["34", "36", "38", "40", "42", "44", "46", "48"] },
    { id: "unico", label: "Tamanho Único", sizes: ["Único"] },
  ];

  const ALL_AVAILABLE_SIZES = [
    "PP", "P", "M", "G", "GG", "G1", "G2", "G3",
    "34", "36", "38", "40", "42", "44", "46", "48", "Único",
  ];

  const totalVariations = selectedColors.length * selectedSizes.length;
  const totalPieces = totalVariations * defaultQty;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-3xl">
        <DialogHeader className="space-y-1 text-left pb-2 border-b border-border/60">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Boxes className="size-4" />
            </span>
            Gerador de Grade de Variações
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Selecione as cores e os tamanhos para montar a matriz de produção e precificação do lote.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 1. SELEÇÃO DE CORES */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>1. Cores deste modelo</span>
                <Badge variant="secondary" className="text-[10px] h-5 font-bold px-1.5">
                  {selectedColors.length} {selectedColors.length === 1 ? "cor" : "cores"}
                </Badge>
              </Label>
              {selectedColors.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedColors([])}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
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
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border shadow-2xs",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-xs font-bold"
                            : "border-border/80 bg-background text-foreground hover:bg-secondary"
                        )}
                      >
                        <span
                          className="size-2.5 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.label}</span>
                        {isSelected && <Check className="size-3 ml-0.5" />}
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
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border shadow-2xs",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-xs font-bold"
                          : "border-border/80 bg-background text-foreground hover:bg-secondary"
                      )}
                    >
                      <span className={cn("size-2.5 rounded-full shrink-0 shadow-2xs", getColorDot(c))} />
                      <span>{c}</span>
                      {isSelected && <Check className="size-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input de Adicionar Outra Cor */}
            <div className="flex items-center gap-1.5 pt-1">
              <div className="relative flex-1">
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
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddCustomColor}
                disabled={!customColorInput.trim()}
                className="h-8 px-3 text-xs font-semibold rounded-xl border-border shrink-0 cursor-pointer"
              >
                <Plus className="size-3 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* 2. SELEÇÃO DE TAMANHOS */}
          <div className="space-y-2.5 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>2. Grade de tamanhos</span>
                <Badge variant="secondary" className="text-[10px] h-5 font-bold px-1.5">
                  {selectedSizes.length} {selectedSizes.length === 1 ? "tamanho" : "tamanhos"}
                </Badge>
              </Label>
            </div>

            {/* Presets Rápidos */}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Presets Recomendados:</p>
              <div className="flex flex-wrap gap-1">
                {storeCustomSizes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => applyPreset(storeCustomSizes.map((s) => s.label))}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold border border-primary/40 bg-primary/10 text-primary transition-all cursor-pointer shadow-2xs"
                  >
                    ✨ Minha Loja ({storeCustomSizes.map((s) => s.label).join(", ")})
                  </button>
                )}
                {PRESETS_LIST.map((p) => {
                  const isFullyActive = p.sizes.every((sz) => selectedSizes.includes(sz)) && selectedSizes.length === p.sizes.length;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.sizes)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs",
                        isFullyActive
                          ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                          : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chips de Tamanhos Individuais */}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tamanhos Individuais:</p>
              <div className="flex flex-wrap gap-1">
                {ALL_AVAILABLE_SIZES.map((sz) => {
                  const isSelected = selectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => toggleSize(sz)}
                      className={cn(
                        "size-8 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center shadow-2xs",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground font-black shadow-xs"
                          : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary"
                      )}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Adicionar tamanho customizado */}
            <div className="flex items-center gap-1.5 pt-1">
              <div className="relative flex-1">
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
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddCustomSize}
                disabled={!customSizeInput.trim()}
                className="h-8 px-3 text-xs font-semibold rounded-xl border-border shrink-0 cursor-pointer"
              >
                <Plus className="size-3 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* 3. QUANTIDADE INICIAL SUGERIDA */}
          <div className="space-y-2 pt-3 border-t border-border/50">
            <Label className="text-xs font-bold text-foreground">
              3. Quantidade inicial por variação:
            </Label>
            <div className="flex items-center gap-1.5">
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

        {/* RODAPÉ COM RESUMO E AÇÃO */}
        <div className="space-y-3 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 border border-border/70 text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                Resumo da Grade
              </p>
              <p className="text-[11px] text-muted-foreground">
                {selectedColors.length} {selectedColors.length === 1 ? "cor" : "cores"} × {selectedSizes.length} {selectedSizes.length === 1 ? "tamanho" : "tamanhos"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-black text-sm text-foreground numeric">{totalVariations} variações</p>
              <p className="text-[10px] text-muted-foreground font-medium">{totalPieces} peças no lote</p>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs h-10 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm(selectedColors, selectedSizes, defaultQty)}
              disabled={totalVariations === 0}
              className="gradient-primary text-primary-foreground font-bold rounded-xl text-xs h-10 px-5 shadow-glow cursor-pointer disabled:opacity-50"
            >
              <Boxes className="size-4 mr-1.5" />
              Gerar Planilha do Lote ({totalVariations} variações)
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
  saveDisabled: boolean;
  entryDisabled: boolean;
}) {
  const marginHealth = getMarginHealth(effectiveMargin);

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft space-y-4">
      {/* ── Cabeçalho do Resumo (Padrão Vértice / Shopify) ── */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Layers className="size-3.5" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {mode === "grade" ? "Resumo do Lote" : "Resumo da Peça"}
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
      {mode === "grade" && (
        <div className="flex items-center justify-between py-1 border-b border-border/40">
          <span className="text-xs font-semibold text-muted-foreground">Volume no lote</span>
          <span className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-bold",
            totalUnits > 0 ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground"
          )}>
            {totalUnits} {totalUnits === 1 ? "peça na grade" : "peças na grade"}
          </span>
        </div>
      )}

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
            {name.trim() || (mode === "grade" ? "Modelo sem nome" : "Peça sem nome")}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {category || "Sem categoria"}
          </p>
        </div>
      </div>

      {/* ── Decomposição de Custos (Cascata Limpa) ── */}
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
        <div className="flex items-center justify-center gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Preço Sugerido de Venda
          </p>
          {totalUnits === 0 && suggestedPrice > 0 && (
            <span className="text-[9px] font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-full">
              Projeção
            </span>
          )}
        </div>
        <p className="num-display text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          {suggestedPrice > 0 ? brl(suggestedPrice) : "R$ —,——"}
        </p>
        {suggestedPrice > 0 && (
          <div className="flex items-center justify-center gap-2 text-xs pt-0.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              +{brl(profitPerUnit)} lucro
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground font-semibold">
              {Math.round(effectiveMargin)}% margem
            </span>
          </div>
        )}
      </div>

      {/* ── Totais do Lote (quando totalUnits > 1) ── */}
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
          onClick={mode === "grade" ? onEntry : onSave}
          disabled={mode === "grade" ? entryDisabled : saveDisabled}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-glow text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {mode === "grade" ? <PackagePlus className="size-4" /> : <Save className="size-4" />}
          <span>{mode === "grade" ? `Dar entrada no estoque (${totalUnits} un.)` : "Salvar no histórico"}</span>
        </Button>

        {mode === "grade" && (
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
                variant="ghost"
                onClick={onReset}
                className="h-9 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                title="Limpar campos"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            )}
          </div>
        )}

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

  // ── Modo Principal (Rápida | Grade | Histórico) ───────────────────
  const [mode, setMode] = useState<PricingMode>("rapida");

  // ── Estratégia de Precificação ────────────────────────────────────
  const [strategy, setStrategy] = useState<PricingStrategy>("margin");

  // ── Identificação da Peça ─────────────────────────────────────────
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  // ── Modo 1: Precificação Rápida ───────────────────────────────────
  const [wholesale, setWholesale] = useState("");
  const [rapidaQty, setRapidaQty] = useState("1");     // quantidade de peças no lote rápido
  const [rapidaColor, setRapidaColor] = useState("");   // cor opcional (identificação)
  const [rapidaSize, setRapidaSize] = useState("");     // tamanho opcional (identificação)

  // ── Modo 2: Grade Detalhada de Variantes ──────────────────────────
  const [baseWholesaleGrade, setBaseWholesaleGrade] = useState("");

  // Lista Unificada de Variantes (SKUs)
  const [variants, setVariants] = useState<VariantRow[]>([]);

  // Seletor de geração rápida da grade
  const [activeColors, setActiveColors] = useState<string[]>([]);
  const [genSizes, setGenSizes] = useState<string[]>([]);

  // ── Multi-Modelo / Modo Produção (v74) ────────────────────────────
  const [initialGradeModel] = useState<GradeModel>(() => createEmptyGradeModel(1));
  const [gradeModels, setGradeModels] = useState<GradeModel[]>([initialGradeModel]);
  const [activeModelId, setActiveModelId] = useState<string>(initialGradeModel.id);
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
  const [colorStrategies, setColorStrategies] = useState<Record<string, ColorStrategy>>({});

  // Inserção manual no rodapé da tabela
  const [manualSize, setManualSize] = useState("M");
  const [manualColor, setManualColor] = useState("Off-White");
  const [manualCost, setManualCost] = useState("");

  // ── Assistente de Rateio Rápido de Custos Operacionais ─────────────
  const [rateioTarget, setRateioTarget] = useState<"freight" | "packaging" | "other" | null>(null);
  const [rateioTotal, setRateioTotal] = useState("");
  const [rateioPieces, setRateioPieces] = useState("");

  // ── Custos Operacionais Rateados (por peça) ───────────────────────
  const [freight, setFreight] = useState("");
  const [packaging, setPackaging] = useState("");
  const [other, setOther] = useState("");

  // ── Modo de custo: por peça ou total do lote ─────────────────────
  const [freightMode, setFreightMode] = useState<"per_unit" | "lot_total">("lot_total");
  const [packagingMode, setPackagingMode] = useState<"per_unit" | "lot_total">("lot_total");
  const [otherMode, setOtherMode] = useState<"per_unit" | "lot_total">("lot_total");

  const [desiredMargin, setDesiredMargin] = useState(() => pricingSettings.defaultMargin); // Margem líquida padrão da loja
  const [markup, setMarkup] = useState(80); // 80% markup sobre custo
  const [directSalePrice, setDirectSalePrice] = useState("");
  const [tax, setTax] = useState(() => pricingSettings.defaultTax); // Imposto padrão da loja
  const [cardRate, setCardRate] = useState(() => pricingSettings.defaultCardRate); // Taxa de maquininha padrão da loja

  // Estados locais para digitação livre nos steppers
  const [marginInputVal, setMarginInputVal] = useState(() =>
    Number.isInteger(pricingSettings.defaultMargin)
      ? String(pricingSettings.defaultMargin)
      : String(pricingSettings.defaultMargin).replace(".", ","),
  );
  const [markupInputVal, setMarkupInputVal] = useState("80");

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
  const [sizePresetDropdown, setSizePresetDropdown] = useState("padrao");
  const [gradePricingMode, setGradePricingMode] = useState<"unified" | "isolated">("unified");
  const [showGradeModal, setShowGradeModal] = useState(false);

  const handleConfirmGradeModal = (
    colors: string[],
    sizes: string[],
    defaultQty: number,
  ) => {
    if (colors.length === 0 || sizes.length === 0) {
      toast.error("Selecione ao menos 1 cor e 1 tamanho para gerar a grade");
      return;
    }

    setActiveColors(colors);
    setMatrixSizes(sizes);

    const newRows: VariantRow[] = [];
    colors.forEach((col) => {
      sizes.forEach((sz) => {
        const existing = variants.find(
          (v) => v.color.toLowerCase() === col.toLowerCase() && v.size === sz,
        );
        newRows.push({
          id: existing?.id ?? `v-${sz.toLowerCase()}-${col.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          size: sz,
          color: col,
          wholesaleCost: existing?.wholesaleCost || baseWholesaleGrade || "",
          customSalePrice: existing?.customSalePrice ?? "",
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
    toast.success(`Grade gerada com sucesso! ${newRows.length} variações na planilha 🎉`);
  };

  // ── Simuladores & Lote ─────────────────────────────────────────
  const [lotUnits] = useState(20);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showGradeColorBreakdown, setShowGradeColorBreakdown] = useState(false);

  // ── Grid-First Matrix State ─────────────────────────────────────────
  const [matrixSizes, setMatrixSizes] = useState<string[]>(["P", "M", "G", "GG"]);
  const [matrixDefaultQtys, setMatrixDefaultQtys] = useState<Record<string, number>>({ PP: 1, P: 2, M: 4, G: 4, GG: 2, G1: 2, G2: 2, G3: 1 });
  const [matrixGlobalMode, setMatrixGlobalMode] = useState<PricingStrategy>("margin");
  const [matrixGlobalMarginStr, setMatrixGlobalMarginStr] = useState("50");
  const [matrixGlobalMarkupStr, setMatrixGlobalMarkupStr] = useState("100");
  const [matrixGlobalDirectPrice, setMatrixGlobalDirectPrice] = useState("");
  const [showAdvancedMatrix, setShowAdvancedMatrix] = useState(false);
  const [matrixSetupOpen, setMatrixSetupOpen] = useState(true);
  const [activeSizeFamily, setActiveSizeFamily] = useState<"padrao" | "numerica" | "plus" | "unico" | "todas">("padrao");

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
      const cs = colorStrategies[v.color.toLowerCase()] ?? DEFAULT_COLOR_STRATEGY;

      let customPriceStr = v.customSalePrice;
      const hasExplicitManualPrice = customPriceStr !== undefined && customPriceStr !== "" && toNumber(customPriceStr) > 0;

      if (!hasExplicitManualPrice) {
        if (cs.mode === "margin") {
          const targetMargin = typeof cs.margin === "number" ? cs.margin : (toNumber(cs.margin) || 50);
          const divisor = 1 - (targetMargin + tax + cardRate) / 100;
          const realCost = wholesaleNum + freightNum + packagingNum + otherNum;
          const price = divisor > 0 ? realCost / divisor : realCost * 2;
          customPriceStr = price > 0 ? price.toFixed(2).replace(".", ",") : "";
        } else if (cs.mode === "markup") {
          const targetMarkup = typeof cs.markup === "number" ? cs.markup : (toNumber(cs.markup) || 100);
          const totalDeductions = (tax + cardRate) / 100;
          const divisor = Math.max(1 - totalDeductions, 0.01);
          const realCost = wholesaleNum + freightNum + packagingNum + otherNum;
          const price = (realCost * (1 + targetMarkup / 100)) / divisor;
          customPriceStr = price > 0 ? price.toFixed(2).replace(".", ",") : "";
        } else if (cs.mode === "direct_price") {
          customPriceStr = cs.directPrice;
        }
      }

      const res = calculateItem(wholesaleNum, customPriceStr);
      const qty = v.qty && v.qty > 0 ? v.qty : 1;
      return {
        ...v,
        qty,
        wholesaleNum,
        isCustomCost: hasCustomCost && wholesaleNum !== baseNum,
        ...res,
      };
    });
  }, [variants, baseWholesaleGrade, freight, packaging, other, freightMode, packagingMode, otherMode, actualLotUnits, tax, cardRate, colorStrategies, calculateItem]);

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
        if (matrixGlobalMode === "margin") {
          const m = toNumber(matrixGlobalMarginStr) || 50;
          const div = 1 - (totalDeductionsFrac + m / 100);
          projPrice = div > 0.05 ? unitCost / div : 0;
          projMargin = m;
          projProfit = projPrice > 0 ? projPrice * (1 - totalDeductionsFrac) - unitCost : 0;
        } else if (matrixGlobalMode === "markup") {
          const mk = toNumber(matrixGlobalMarkupStr) || 100;
          const base = unitCost * (1 + mk / 100);
          const div = 1 - totalDeductionsFrac;
          projPrice = div > 0.05 ? base / div : 0;
          projProfit = projPrice > 0 ? projPrice * (1 - totalDeductionsFrac) - unitCost : 0;
          projMargin = projPrice > 0 ? (projProfit / projPrice) * 100 : 0;
        } else {
          projPrice = toNumber(matrixGlobalDirectPrice);
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
        hasMultiple: variants.length > 1,
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
      hasMultiple: minP !== maxP,
    };
  }, [mode, singleResult, variantResults, variants.length, baseWholesaleGrade, wholesale, freight, packaging, other, freightMode, packagingMode, otherMode, tax, cardRate, matrixGlobalMode, matrixGlobalMarginStr, matrixGlobalMarkupStr, matrixGlobalDirectPrice]);

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

  const resetPricingModel = () => {
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
    toast.success("Novo modelo iniciado!", {
      description: "Campos limpos para precificar a próxima peça.",
    });
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
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, customSalePrice: val } : v)),
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
    const freightNum = toNumber(freight);
    const packagingNum = toNumber(packaging);
    const otherNum = toNumber(other);
    const realCost = wholesaleCost + freightNum + packagingNum + otherNum;
    const divisor = 1 - (targetMargin + tax + cardRate) / 100;
    if (divisor <= 0) return 0;
    return realCost / divisor;
  };

  const updateVariantMargin = (id: string, marginPct: number) => {
    const target = variantResults.find((v) => v.id === id);
    if (!target) return;
    const price = computePriceForVariantMargin(target.wholesaleNum, marginPct);
    if (price > 0) {
      updateVariantPrice(id, price.toFixed(2).replace(".", ","));
      toast.success(`Tamanho ${target.size}: margem definida em ${marginPct}% (R$ ${price.toFixed(2).replace(".", ",")})`);
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
            Precificação rápida
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
            MODO RÁPIDO — PASSO 1: IDENTIFICAÇÃO E CUSTOS DA PEÇA
        ══════════════════════════════════════════════════════════════════ */}
        {mode === "rapida" && (
        <section className="panel p-6 sm:p-7 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                1
              </span>
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Identificação e custo da peça
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mode === "rapida"
                    ? "Informe o nome, categoria, valor de atacado e variantes da peça"
                    : "Frete, embalagem e taxas rateados entre todos os modelos. Nome e custo de cada peça ficam no Passo 2."}
                </p>
              </div>
            </div>
          </div>

          {/* Grid de Identificação da Peça — apenas no modo rápido */}
          {mode === "rapida" && (
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Nome da peça ou modelo
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Vestido Midi Linho"
                className="h-11 rounded-xl font-semibold text-sm bg-card shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Categoria
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 rounded-xl font-medium text-sm bg-card shadow-2xs border-border">
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
          </div>
          )}

          {/* Variantes do Modo Rápido: Custo de Atacado, Quantidade, Cor e Tamanho (4 colunas) */}
          {mode === "rapida" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              {/* 1. Custo no Atacado */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Custo de atacado
                </Label>
                <div className="relative flex h-11 items-center rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                  <span className="pl-3 text-xs font-bold text-muted-foreground select-none">R$</span>
                  <input
                    inputMode="decimal"
                    value={wholesale}
                    onChange={(e) => setWholesale(e.target.value)}
                    placeholder="49,90"
                    className="h-11 w-full bg-transparent px-2 text-sm font-bold text-foreground outline-none"
                  />
                </div>
              </div>

              {/* 2. Quantidade de Peças */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Quantidade no lote
                </Label>
                <div className="relative flex h-11 items-center rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseInt(rapidaQty, 10) || 1;
                      setRapidaQty(String(Math.max(1, cur - 1)));
                    }}
                    disabled={(parseInt(rapidaQty, 10) || 1) <= 1}
                    className="size-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer border-r border-border/50"
                    title="Diminuir 1 unidade"
                  >
                    <Minus className="size-3.5" />
                  </button>

                  <div className="relative flex-1 flex items-center justify-center">
                    <input
                      inputMode="numeric"
                      value={rapidaQty}
                      onChange={(e) => setRapidaQty(e.target.value.replace(/[^\d]/g, ""))}
                      className="h-11 w-full bg-transparent text-center text-sm font-bold text-foreground outline-none px-1"
                    />
                    <span className="absolute right-2.5 text-[11px] font-semibold text-muted-foreground select-none pointer-events-none">
                      un.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseInt(rapidaQty, 10) || 1;
                      setRapidaQty(String(cur + 1));
                    }}
                    className="size-11 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:scale-95 transition-all shrink-0 cursor-pointer border-l border-border/50"
                    title="Aumentar 1 unidade"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* 3. Cor da Peça (opcional) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span>Cor</span>
                  {rapidaColor ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                      <span className={cn("size-2 rounded-full", getColorDot(rapidaColor))} />
                      {rapidaColor}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-normal">(opcional)</span>
                  )}
                </Label>
                <div className="relative">
                  <div className="relative flex h-11 items-center rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                    {rapidaColor ? (
                      <span className={cn("size-3.5 rounded-full ml-3 shrink-0 shadow-2xs", getColorDot(rapidaColor))} />
                    ) : (
                      <Search className="size-3.5 text-muted-foreground ml-3 shrink-0 pointer-events-none" />
                    )}
                    <input
                      ref={rapidaColorInputRef}
                      value={showRapidaColorPopover ? rapidaColorSearchQuery : rapidaColor}
                      onChange={(e) => {
                        setRapidaColorSearchQuery(e.target.value);
                        setShowRapidaColorPopover(true);
                      }}
                      onFocus={() => {
                        setRapidaColorSearchQuery("");
                        setShowRapidaColorPopover(true);
                      }}
                      placeholder="Buscar cor..."
                      className="h-11 w-full bg-transparent px-2.5 text-sm font-semibold text-foreground outline-none placeholder:text-xs placeholder:text-muted-foreground"
                    />
                    {rapidaColor && (
                      <button
                        type="button"
                        onClick={() => {
                          setRapidaColor("");
                          setRapidaColorSearchQuery("");
                          setShowRapidaColorPopover(false);
                        }}
                        className="mr-2 size-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                        title="Limpar cor"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  {/* Popover Spotlight Flutuante */}
                  {showRapidaColorPopover && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowRapidaColorPopover(false)} />
                      <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-border/80 bg-card p-2 shadow-xl animate-in fade-in-50 zoom-in-95 space-y-1">
                        {matchingRapidaColorPresets.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">
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
              </div>

              {/* 4. Tamanho da Peça (opcional) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span>Tamanho</span>
                  {rapidaSize ? (
                    <span className="text-[10px] font-bold text-primary">
                      · {rapidaSize}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-normal">(opcional)</span>
                  )}
                </Label>
                <div className="relative">
                  <Select value={rapidaSize} onValueChange={(val) => setRapidaSize(val === "nenhum" ? "" : val)}>
                    <SelectTrigger className="h-11 w-full rounded-xl border border-border/80 bg-card px-3 text-sm font-semibold text-foreground shadow-2xs">
                      <SelectValue placeholder="Selecione o tamanho..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 rounded-xl border border-border/80 bg-card shadow-xl">
                      <SelectItem value="nenhum" className="text-xs font-medium text-muted-foreground">
                        — Sem tamanho definido —
                      </SelectItem>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground border-t border-border/40 mt-1">
                        Tamanhos padrão
                      </div>
                      {["PP", "P", "M", "G", "GG", "Único"].map((sz) => (
                        <SelectItem key={sz} value={sz} className="text-xs font-semibold">
                          Tamanho {sz}
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground border-t border-border/40 mt-1">
                        Numeração & calças
                      </div>
                      {["34", "36", "38", "40", "42", "44", "46", "48", "50"].map((sz) => (
                        <SelectItem key={sz} value={sz} className="text-xs font-semibold">
                          Tamanho {sz}
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground border-t border-border/40 mt-1">
                        Plus size
                      </div>
                      {["G1", "G2", "G3"].map((sz) => (
                        <SelectItem key={sz} value={sz} className="text-xs font-semibold">
                          Plus Size {sz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {rapidaSize && (
                    <button
                      type="button"
                      onClick={() => setRapidaSize("")}
                      className="absolute right-8 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Limpar tamanho"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ETAPA 1.2 — CUSTOS OPERACIONAIS & RECIBO AO VIVO (2 COLUNAS)
          ══════════════════════════════════════════════════════════════════ */}
          {(() => {
            const freightVal = resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1);
            const packagingVal = resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1);
            const otherVal = resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1);
            const totalSharedCost = freightVal + packagingVal + otherVal;
            const freightPct = totalSharedCost > 0 ? (freightVal / totalSharedCost) * 100 : 0;
            const packagingPct = totalSharedCost > 0 ? (packagingVal / totalSharedCost) * 100 : 0;
            const otherPct = totalSharedCost > 0 ? (otherVal / totalSharedCost) * 100 : 0;

            const baseCost = toNumber(mode === "rapida" ? wholesale : baseWholesaleGrade);
            const totalUnitCost = baseCost + totalSharedCost;

            const renderInlineRateio = (target: "freight" | "packaging" | "other", targetLabel: string) => {
              if (rateioTarget !== target) return null;
              return (
                <div className="mt-3 rounded-2xl border border-primary/25 bg-primary/5 p-3.5 sm:p-4 space-y-3 animate-in fade-in-50 duration-200 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <Calculator className="size-3.5 text-primary" />
                      </div>
                      <span className="text-xs font-bold text-primary">
                        Assistente: Dividir {targetLabel}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setRateioTarget(null)}
                      className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all text-xs cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Valor Total Pago na Nota (R$)</Label>
                      <div className="relative flex items-center rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary">
                        <span className="pl-3 text-xs font-bold text-muted-foreground select-none">R$</span>
                        <input
                          inputMode="decimal"
                          value={rateioTotal}
                          onChange={(e) => setRateioTotal(e.target.value)}
                          placeholder="120,00"
                          className="h-9 w-full bg-transparent px-2 text-xs font-bold text-foreground outline-none"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold text-muted-foreground">Total de Peças</Label>
                        {actualLotUnits > 0 && (
                          <button
                            type="button"
                            onClick={() => setRateioPieces(String(actualLotUnits))}
                            className="text-[10px] text-primary hover:text-primary/80 font-semibold cursor-pointer transition-colors"
                          >
                            Usar {actualLotUnits} un. da grade
                          </button>
                        )}
                      </div>
                      <div className="relative flex items-center rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary">
                        <input
                          inputMode="numeric"
                          value={rateioPieces}
                          onChange={(e) => setRateioPieces(e.target.value)}
                          placeholder="20"
                          className="h-9 w-full bg-transparent px-3 text-xs font-bold text-foreground outline-none"
                        />
                        <span className="pr-3 text-[11px] font-semibold text-muted-foreground select-none">un.</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={applyRateio}
                      disabled={!toNumber(rateioTotal) || !Number(rateioPieces)}
                      className="h-9 rounded-xl gradient-primary text-xs font-bold shadow-glow shrink-0 cursor-pointer active:scale-95 transition-all"
                    >
                      {toNumber(rateioTotal) > 0 && Number(rateioPieces) > 0 ? (
                        <>Aplicar {brl(toNumber(rateioTotal) / Math.max(1, Number(rateioPieces)))} / peça</>
                      ) : (
                        <>Calcular e Aplicar</>
                      )}
                    </Button>
                  </div>
                </div>
              );
            };

            return (
              <div className="grid gap-4 lg:grid-cols-12 items-stretch">
                {/* ── COLUNA DA ESQUERDA: CUSTOS ADICIONAIS POR PEÇA (7 colunas lg) ── */}
                <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Custos adicionais por peça
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Despesas operacionais rateadas para compor o custo real da peça
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {/* Frete */}
                    <div className="rounded-xl border border-border/70 bg-secondary/15 p-3 transition-all hover:border-border hover:bg-secondary/25">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/15 shadow-2xs">
                            <Truck className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <Label className="text-xs font-bold text-foreground cursor-pointer block truncate">
                              Frete por peça
                            </Label>
                            <span className="text-[10px] text-muted-foreground block -mt-0.5 truncate">
                              Transporte até o estoque
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Select value={freightMode} onValueChange={(v) => setFreightMode(v as "per_unit" | "lot_total")}>
                            <SelectTrigger className="h-10 w-28 text-xs font-semibold rounded-xl border border-border/80 bg-card shadow-2xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per_unit">Por peça</SelectItem>
                              <SelectItem value="lot_total">Total lote</SelectItem>
                            </SelectContent>
                          </Select>

                          <button
                            type="button"
                            onClick={() => {
                              if (rateioTarget === "freight") {
                                setRateioTarget(null);
                              } else {
                                openRateioAssistant("freight");
                              }
                            }}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border",
                              rateioTarget === "freight"
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/70 hover:border-border",
                            )}
                            title="Assistente com calculadora de nota fiscal"
                          >
                            <Calculator className="size-3.5" />
                          </button>
                          <div className="relative flex h-10 w-28 items-center shrink-0 rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
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
                      </div>
                      {freightMode === "lot_total" && toNumber(freight) > 0 && actualLotUnits > 1 && (
                        <p className="text-[11px] text-primary font-medium text-right mt-1">
                          ≈ {brl(toNumber(freight) / actualLotUnits)} / peça ({actualLotUnits} un.)
                        </p>
                      )}
                      {renderInlineRateio("freight", "Frete da Nota")}
                    </div>

                    {/* Embalagem & Tag */}
                    <div className="rounded-xl border border-border/70 bg-secondary/15 p-3 transition-all hover:border-border hover:bg-secondary/25">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/15 shadow-2xs">
                            <Package className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <Label className="text-xs font-bold text-foreground cursor-pointer block truncate">
                              Embalagem & Tag
                            </Label>
                            <span className="text-[10px] text-muted-foreground block -mt-0.5 truncate">
                              Sacola, etiqueta e seda
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Select value={packagingMode} onValueChange={(v) => setPackagingMode(v as "per_unit" | "lot_total")}>
                            <SelectTrigger className="h-10 w-28 text-xs font-semibold rounded-xl border border-border/80 bg-card shadow-2xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per_unit">Por peça</SelectItem>
                              <SelectItem value="lot_total">Total lote</SelectItem>
                            </SelectContent>
                          </Select>

                          <button
                            type="button"
                            onClick={() => {
                              if (rateioTarget === "packaging") {
                                setRateioTarget(null);
                              } else {
                                openRateioAssistant("packaging");
                              }
                            }}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border",
                              rateioTarget === "packaging"
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/70 hover:border-border",
                            )}
                            title="Assistente com calculadora de nota fiscal"
                          >
                            <Calculator className="size-3.5" />
                          </button>
                          <div className="relative flex h-10 w-28 items-center shrink-0 rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
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
                      </div>
                      {packagingMode === "lot_total" && toNumber(packaging) > 0 && actualLotUnits > 1 && (
                        <p className="text-[11px] text-primary font-medium text-right mt-1">
                          ≈ {brl(toNumber(packaging) / actualLotUnits)} / peça ({actualLotUnits} un.)
                        </p>
                      )}
                      {renderInlineRateio("packaging", "Embalagens & Tags")}
                    </div>

                    {/* Outros custos */}
                    <div className="rounded-xl border border-border/70 bg-secondary/15 p-3 transition-all hover:border-border hover:bg-secondary/25">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/15 shadow-2xs">
                            <Coins className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <Label className="text-xs font-bold text-foreground cursor-pointer block truncate">
                              Outros custos
                            </Label>
                            <span className="text-[10px] text-muted-foreground block -mt-0.5 truncate">
                              Ajustes, costura ou extras
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Select value={otherMode} onValueChange={(v) => setOtherMode(v as "per_unit" | "lot_total")}>
                            <SelectTrigger className="h-10 w-28 text-xs font-semibold rounded-xl border border-border/80 bg-card shadow-2xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per_unit">Por peça</SelectItem>
                              <SelectItem value="lot_total">Total lote</SelectItem>
                            </SelectContent>
                          </Select>

                          <button
                            type="button"
                            onClick={() => {
                              if (rateioTarget === "other") {
                                setRateioTarget(null);
                              } else {
                                openRateioAssistant("other");
                              }
                            }}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border",
                              rateioTarget === "other"
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/70 hover:border-border",
                            )}
                            title="Assistente com calculadora de nota fiscal"
                          >
                            <Calculator className="size-3.5" />
                          </button>
                          <div className="relative flex h-10 w-28 items-center shrink-0 rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
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
                      {otherMode === "lot_total" && toNumber(other) > 0 && actualLotUnits > 1 && (
                        <p className="text-[11px] text-primary font-medium text-right mt-1">
                          ≈ {brl(toNumber(other) / actualLotUnits)} / peça ({actualLotUnits} un.)
                        </p>
                      )}
                      {renderInlineRateio("other", "Outros Custos")}
                    </div>
                  </div>
                </div>

                {/* ── COLUNA DA DIREITA: RECIBO DO CUSTO REAL DA PEÇA (5 colunas lg) ── */}
                <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-5 shadow-2xs flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Custo Real da Peça
                      </span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        Base de precificação
                      </span>
                    </div>

                    <div>
                      <div className="numeric text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                        {brl(totalUnitCost)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">/ peça</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {brl(baseCost)} atacado + {brl(totalSharedCost)} adicionais
                      </p>
                    </div>

                    {/* Breakdown de Adicionais com Bullets Coloridos */}
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                          <span className="text-muted-foreground">Frete rateado</span>
                        </div>
                        <span className="numeric font-semibold text-foreground">
                          {brl(freightVal)}{" "}
                          <span className="text-muted-foreground font-normal">({Math.round(freightPct)}%)</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-muted-foreground">Embalagem e tag</span>
                        </div>
                        <span className="numeric font-semibold text-foreground">
                          {brl(packagingVal)}{" "}
                          <span className="text-muted-foreground font-normal">({Math.round(packagingPct)}%)</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-muted-foreground">Outros custos</span>
                        </div>
                        <span className="numeric font-semibold text-foreground">
                          {brl(otherVal)}{" "}
                          <span className="text-muted-foreground font-normal">({Math.round(otherPct)}%)</span>
                        </span>
                      </div>
                    </div>

                    {/* Barra segmentada colorida */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80 flex gap-0.5">
                      {freightPct > 0 && (
                        <div style={{ width: `${freightPct}%` }} className="h-full bg-blue-500 transition-all duration-300" />
                      )}
                      {packagingPct > 0 && (
                        <div style={{ width: `${packagingPct}%` }} className="h-full bg-emerald-500 transition-all duration-300" />
                      )}
                      {otherPct > 0 && (
                        <div style={{ width: `${otherPct}%` }} className="h-full bg-amber-500 transition-all duration-300" />
                      )}
                    </div>
                  </div>

                  {/* Caixa de Equação Explicativa */}
                  <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-secondary/35 p-3 text-xs text-muted-foreground shadow-2xs">
                    <Info className="size-4 shrink-0 text-primary/80" />
                    <span>
                      {totalSharedCost > 0 ? (
                        <>
                          Adicionais compõem{" "}
                          <strong className="text-foreground">
                            {Math.round(totalUnitCost > 0 ? (totalSharedCost / totalUnitCost) * 100 : 0)}%
                          </strong>{" "}
                          do custo desta peça
                        </>
                      ) : (
                        <>Sem custos adicionais · Custo real igual ao atacado</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Taxas Fiscais e de Cartão com Controles Híbridos Studio */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 px-0.5">
              <span className="text-xs font-bold text-foreground">
                Taxas e deduções da venda
              </span>

              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-7 rounded-full border-border/70 bg-card hover:bg-secondary px-3 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-all shadow-2xs gap-1.5 cursor-pointer"
              >
                <Link to="/configuracoes" search={{ tab: "caixa" }}>
                  <CreditCard className="size-3 text-primary" />
                  <span>Taxas da maquininha</span>
                  <ArrowUpRight className="size-3 opacity-60" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <HybridTaxControl
                label="Imposto DAS / Simples (%)"
                hint="Alíquota aplicada sobre faturamento bruto"
                value={tax}
                max={25}
                onChange={setTax}
                presets={[
                  { label: "MEI (0%)", value: pricingSettings.taxPresets?.mei ?? 0 },
                  { label: "Simples F1 (4%)", value: pricingSettings.taxPresets?.simplesF1 ?? 4 },
                  { label: "Simples F2 (7%)", value: pricingSettings.taxPresets?.simplesF2 ?? 7 },
                  { label: "Simples F3 (10%)", value: pricingSettings.taxPresets?.simplesF3 ?? 10 },
                ]}
              />
              <HybridTaxControl
                label="Taxa média de cartão (%)"
                hint="Média ponderada descontada pelas maquininhas"
                value={cardRate}
                max={15}
                onChange={setCardRate}
                presets={[
                  { label: `Pix (${(pricingSettings.cardRates?.pix ?? 0.9).toString().replace(".", ",")}%)`, value: pricingSettings.cardRates?.pix ?? 0.9 },
                  { label: `Débito (${(pricingSettings.cardRates?.debito ?? 1.5).toString().replace(".", ",")}%)`, value: pricingSettings.cardRates?.debito ?? 1.5 },
                  { label: `Crédito 1× (${(pricingSettings.cardRates?.credito1x ?? 3.2).toString().replace(".", ",")}%)`, value: pricingSettings.cardRates?.credito1x ?? 3.2 },
                  { label: `Parcelado (${(pricingSettings.cardRates?.parcelado ?? 4.5).toString().replace(".", ",")}%)`, value: pricingSettings.cardRates?.parcelado ?? 4.5 },
                ]}
              />
            </div>
          </div>
        </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MODO RÁPIDO — PASSO 2: FORMAÇÃO DO PREÇO DE VENDA
        ══════════════════════════════════════════════════════════════════ */}
        {mode === "rapida" && (
          <section className="panel p-5 sm:p-6 space-y-4">
            {/* ── CABEÇALHO INTEGRADO ── */}
            <div className="flex items-center gap-2.5 border-b border-border/50 pb-3">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary shrink-0">
                2
              </span>
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Formação do Preço de Venda
                </h2>
                <p className="text-xs text-muted-foreground">
                  Defina sua margem e visualize instantaneamente o preço comercial da peça
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {/* ── SELETOR DE ESTRATÉGIA PROEMINENTE & NOTÁVEL ── */}
              <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-secondary/40 border border-border/70 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setStrategy("margin")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer",
                    strategy === "margin"
                      ? "bg-background text-foreground shadow-xs font-bold border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40",
                  )}
                >
                  <Target className={cn("size-3.5 shrink-0", strategy === "margin" ? "text-primary" : "text-muted-foreground")} />
                  <span>Margem real</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStrategy("markup")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer",
                    strategy === "markup"
                      ? "bg-background text-foreground shadow-xs font-bold border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40",
                  )}
                >
                  <TrendingUp className={cn("size-3.5 shrink-0", strategy === "markup" ? "text-primary" : "text-muted-foreground")} />
                  <span>Markup</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStrategy("direct_price")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer",
                    strategy === "direct_price"
                      ? "bg-background text-foreground shadow-xs font-bold border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40",
                  )}
                >
                  <Tag className={cn("size-3.5 shrink-0", strategy === "direct_price" ? "text-primary" : "text-muted-foreground")} />
                  <span>Preço fixo</span>
                </button>
              </div>

              {/* ── FAIXA 1: CONTROLE DE ENTRADA UNIFICADO & HARMONIOSO (SEM VÁCUO) ── */}
              {strategy === "margin" && (() => {
                const maxMarginSafe = Math.max(10, Math.floor(100 - tax - cardRate - 2));
                const effectiveMargin = Math.min(desiredMargin, maxMarginSafe);
                return (
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-2 sm:p-2.5 rounded-xl bg-secondary/25 border border-border/60">
                    {/* Stepper com Rótulo */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                        Meta de margem líquida:
                      </span>

                      <div className="inline-flex items-center rounded-xl border border-border/80 bg-background shadow-soft focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden shrink-0">
                        <button
                          type="button"
                          disabled={effectiveMargin <= 5}
                          onClick={() => {
                            const next = Math.max(5, Number((effectiveMargin - 1).toFixed(1)));
                            setDesiredMargin(next);
                            setMarginInputVal(Number.isInteger(next) ? String(next) : String(next).replace(".", ","));
                          }}
                          className="flex size-8 items-center justify-center border-r border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all disabled:opacity-30 cursor-pointer"
                          aria-label="Diminuir margem em 1%"
                        >
                          <Minus className="size-3" />
                        </button>

                        <div className="flex items-baseline justify-center gap-0.5 px-2.5 py-1 min-w-[68px]">
                          <input
                            inputMode="decimal"
                            value={marginInputVal}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setMarginInputVal(raw);
                              const clean = raw.replace(",", ".");
                              const n = parseFloat(clean);
                              if (!isNaN(n)) {
                                setDesiredMargin(Math.min(maxMarginSafe, Math.max(5, n)));
                              }
                            }}
                            onBlur={() => {
                              const clean = marginInputVal.replace(",", ".");
                              const n = parseFloat(clean);
                              if (!isNaN(n)) {
                                const clamped = Math.min(maxMarginSafe, Math.max(5, Number(n.toFixed(1))));
                                setDesiredMargin(clamped);
                                setMarginInputVal(Number.isInteger(clamped) ? String(clamped) : String(clamped).replace(".", ","));
                              } else {
                                setDesiredMargin(50);
                                setMarginInputVal("50");
                              }
                            }}
                            className="w-13 text-center text-lg font-black text-foreground outline-none bg-transparent numeric tracking-tight"
                            placeholder="50"
                          />
                          <span className="text-[11px] font-bold text-muted-foreground select-none">%</span>
                        </div>

                        <button
                          type="button"
                          disabled={effectiveMargin >= maxMarginSafe}
                          onClick={() => {
                            const next = Math.min(maxMarginSafe, Number((effectiveMargin + 1).toFixed(1)));
                            setDesiredMargin(next);
                            setMarginInputVal(Number.isInteger(next) ? String(next) : String(next).replace(".", ","));
                          }}
                          className="flex size-8 items-center justify-center border-l border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all disabled:opacity-30 cursor-pointer"
                          aria-label="Aumentar margem em 1%"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>

                    {/* Divisor vertical sutil */}
                    <div className="hidden sm:block h-6 w-px bg-border/70 shrink-0" />

                    {/* Atalhos Rápidos */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { label: "35%", tag: "Varejo", val: 35 },
                        { label: "45%", tag: "Equilíbrio", val: 45 },
                        { label: "50%", tag: "Recomendada", val: 50 },
                        { label: "60%", tag: "Alta margem", val: 60 },
                      ].map((m) => {
                        const isActive = Math.abs(effectiveMargin - m.val) < 0.05;
                        return (
                          <button
                            key={m.val}
                            type="button"
                            onClick={() => {
                              const target = Math.min(m.val, maxMarginSafe);
                              setDesiredMargin(target);
                              setMarginInputVal(String(target));
                            }}
                            className={cn(
                              "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs transition-all duration-150 cursor-pointer border",
                              isActive
                                ? "border-primary/80 bg-primary/10 text-primary font-bold shadow-2xs"
                                : "border-border/60 bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <span className="numeric font-bold">{m.label}</span>
                            <span className={cn("text-[11px]", isActive ? "text-primary/90 font-medium" : "text-muted-foreground/75")}>
                              {m.tag}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {strategy === "markup" && (
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-2 sm:p-2.5 rounded-xl bg-secondary/25 border border-border/60">
                  {/* Lado Esquerdo: Rótulo + Cápsula de Markup */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                      Multiplicador de Markup:
                    </span>

                    <div className="inline-flex items-center rounded-xl border border-border/80 bg-background shadow-soft focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden shrink-0">
                      <button
                        type="button"
                        disabled={markup <= 10}
                        onClick={() => {
                          const next = Math.max(10, Number((markup - 5).toFixed(1)));
                          setMarkup(next);
                          setMarkupInputVal(Number.isInteger(next) ? String(next) : String(next).replace(".", ","));
                        }}
                        className="flex size-8 items-center justify-center border-r border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all disabled:opacity-30 cursor-pointer"
                        aria-label="Diminuir markup em 5%"
                      >
                        <Minus className="size-3" />
                      </button>
                      <div className="flex items-baseline justify-center gap-1 px-2.5 py-1 min-w-[88px]">
                        <input
                          inputMode="decimal"
                          value={markupInputVal}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setMarkupInputVal(raw);
                            const clean = raw.replace(",", ".");
                            const n = parseFloat(clean);
                            if (!isNaN(n)) setMarkup(Math.min(300, Math.max(10, n)));
                          }}
                          onBlur={() => {
                            const clean = markupInputVal.replace(",", ".");
                            const n = parseFloat(clean);
                            if (!isNaN(n)) {
                              const clamped = Math.min(300, Math.max(10, Number(n.toFixed(1))));
                              setMarkup(clamped);
                              setMarkupInputVal(Number.isInteger(clamped) ? String(clamped) : String(clamped).replace(".", ","));
                            } else {
                              setMarkup(100);
                              setMarkupInputVal("100");
                            }
                          }}
                          className="w-13 text-center text-lg font-black text-foreground outline-none bg-transparent numeric tracking-tight"
                          placeholder="100"
                        />
                        <span className="text-[11px] font-bold text-muted-foreground select-none">%</span>
                        <span className="text-[11px] font-bold text-primary numeric bg-primary/10 px-1 py-0.5 rounded select-none ml-1">
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
                        className="flex size-8 items-center justify-center border-l border-border/50 text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all disabled:opacity-30 cursor-pointer"
                        aria-label="Aumentar markup em 5%"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>

                  {/* Divisor vertical */}
                  <div className="hidden sm:block h-6 w-px bg-border/70 shrink-0" />

                  {/* Lado Direito: Atalhos Rápidos */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: "1.8x", tag: "Atacado", val: 80 },
                      { label: "2.0x", tag: "Varejo", val: 100 },
                      { label: "2.5x", tag: "Boutique", val: 150 },
                      { label: "3.0x", tag: "Marca", val: 200 },
                    ].map((m) => {
                      const isActive = Math.round(markup) === m.val;
                      return (
                        <button
                          key={m.val}
                          type="button"
                          onClick={() => {
                            setMarkup(m.val);
                            setMarkupInputVal(String(m.val));
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs transition-all duration-150 cursor-pointer border",
                            isActive
                              ? "border-primary/80 bg-primary/10 text-primary font-bold shadow-2xs"
                              : "border-border/60 bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <span className="numeric font-bold">{m.label}</span>
                          <span className={cn("text-[11px]", isActive ? "text-primary/90 font-medium" : "text-muted-foreground/75")}>
                            {m.tag}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {strategy === "direct_price" && (
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 p-2 sm:p-2.5 rounded-xl bg-secondary/25 border border-border/60">
                  {/* Lado Esquerdo: Preço Fixo */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                      Preço fixo de venda:
                    </span>

                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background shadow-soft px-2.5 py-1 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shrink-0">
                      <span className="text-xs font-bold text-muted-foreground select-none">R$</span>
                      <input
                        inputMode="decimal"
                        value={directSalePrice}
                        onChange={(e) => setDirectSalePrice(e.target.value)}
                        placeholder="149,90"
                        className="w-18 text-lg font-black text-foreground outline-none bg-transparent numeric tracking-tight"
                      />
                      <span className="text-[11px] font-semibold text-primary numeric bg-primary/10 px-1.5 py-0.5 rounded select-none">
                        {pct(summaryPrices.avgMargin)} margem
                      </span>
                    </div>
                  </div>

                  {/* Divisor vertical */}
                  <div className="hidden sm:block h-6 w-px bg-border/70 shrink-0" />

                  {/* Lado Direito: Sugestões de Preço */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: "R$ 99,90", val: "99,90", tag: "Entrada" },
                      { label: "R$ 119,90", val: "119,90", tag: "Médio" },
                      { label: "R$ 149,90", val: "149,90", tag: "Popular" },
                      { label: "R$ 199,90", val: "199,90", tag: "Premium" },
                    ].map((pVal) => {
                      const isActive = directSalePrice === pVal.val;
                      return (
                        <button
                          key={pVal.val}
                          type="button"
                          onClick={() => setDirectSalePrice(pVal.val)}
                          className={cn(
                            "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs transition-all duration-150 cursor-pointer border",
                            isActive
                              ? "border-primary/80 bg-primary/10 text-primary font-bold shadow-2xs"
                              : "border-border/60 bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <span className="numeric font-bold">{pVal.label}</span>
                          <span className={cn("text-[11px]", isActive ? "text-primary/90 font-medium" : "text-muted-foreground/75")}>
                            {pVal.tag}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── DEMONSTRATIVO COMERCIAL DA PEÇA (RECIBO HARMONIOSO) ── */}
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
                  <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-soft space-y-4">
                    {/* 1. Header do Demonstrativo: Preço Sugerido e Sobra no Caixa (Sem card-in-card) */}
                    <div className="grid sm:grid-cols-2 gap-4 pb-4 border-b border-border/60">
                      {/* Lado A: Preço sugerido na vitrine */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between sm:justify-start gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Tag className="size-3.5 text-primary" />
                            Preço sugerido na vitrine
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("text-[11px] font-semibold px-2 py-0.5 border shadow-2xs", summaryPrices.marginHealth.color)}
                          >
                            {summaryPrices.marginHealth.emoji} {summaryPrices.marginHealth.label}
                          </Badge>
                        </div>
                        <div className="flex items-baseline gap-1.5 pt-0.5">
                          <span className="numeric text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-none">
                            {brl(summaryPrices.avgSuggested)}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">/ peça</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground/80">
                          Valor final recomendado para venda na vitrine e loja.
                        </p>
                      </div>

                      {/* Lado B: Sobra líquida no caixa */}
                      <div className="space-y-1 sm:border-l sm:border-border/60 sm:pl-5">
                        <div className="flex items-center justify-between sm:justify-start gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            Sobra líquida no caixa
                          </span>
                          <span className="numeric text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full shadow-2xs">
                            {pct(summaryPrices.avgMargin)} de margem
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5 pt-0.5">
                          <span className="numeric text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 leading-none">
                            {brl(summaryPrices.avgProfit)}
                          </span>
                          <span className="text-xs font-medium text-emerald-700/70 dark:text-emerald-400/70">/ peça</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground/80">
                          Lucro limpo no bolso após abatimento de custos e taxas.
                        </p>
                      </div>
                    </div>

                    {/* 2. Barra Visual Proporcional Contínua */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          Decomposição do preço ({brl(total)})
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Para onde vai cada real cobrado
                        </span>
                      </div>
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary/80 gap-0.5">
                        <div
                          className="bg-slate-400 dark:bg-slate-500 rounded-l-full transition-all duration-300"
                          style={{ width: `${Math.max(costPct, 2)}%` }}
                          title={`Custo: ${brl(cost)} (${Math.round(costPct)}%)`}
                        />
                        <div
                          className="bg-amber-400 transition-all duration-300"
                          style={{ width: `${Math.max(taxPct, 2)}%` }}
                          title={`DAS: ${brl(taxes)} (${Math.round(taxPct)}%)`}
                        />
                        <div
                          className="bg-sky-400 transition-all duration-300"
                          style={{ width: `${Math.max(cardPct, 2)}%` }}
                          title={`Maquininha: ${brl(cardFees)} (${Math.round(cardPct)}%)`}
                        />
                        <div
                          className={cn(
                            "rounded-r-full transition-all duration-300",
                            profit < 0 ? "bg-rose-500" : "bg-emerald-500",
                          )}
                          style={{ width: `${Math.max(Math.abs(profitPct), 2)}%` }}
                          title={`Lucro: ${brl(profit)} (${Math.round(profitPct)}%)`}
                        />
                      </div>
                    </div>

                    {/* 3. A Tabela DRE em Lista (O Recibo Clássico Harmonioso) */}
                    <div className="rounded-xl border border-border/60 bg-background/90 overflow-hidden shadow-2xs">
                      {/* Cabeçalho do Recibo */}
                      <div className="grid grid-cols-[1fr_auto_auto] items-center text-[11px] font-medium text-muted-foreground py-2 px-3.5 bg-secondary/25 border-b border-border/50">
                        <span>Componente da formação</span>
                        <span className="text-right pr-6 sm:pr-8">Valor unitário</span>
                        <span className="text-right w-16 sm:w-20">% do total</span>
                      </div>

                      {/* Linha 1: Custo */}
                      <div className="grid grid-cols-[1fr_auto_auto] items-center py-2.5 px-3.5 text-xs border-b border-border/40 hover:bg-secondary/15 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                          <span className="font-medium text-foreground">Custo da Peça</span>
                          <span className="text-[11px] text-muted-foreground hidden sm:inline">· Preço atacado</span>
                        </div>
                        <span className="numeric font-semibold text-foreground text-right pr-6 sm:pr-8">{brl(cost)}</span>
                        <span className="numeric text-muted-foreground text-right w-16 sm:w-20">{Math.round(costPct)}%</span>
                      </div>

                      {/* Linha 2: Imposto DAS */}
                      <div className="grid grid-cols-[1fr_auto_auto] items-center py-2.5 px-3.5 text-xs border-b border-border/40 hover:bg-secondary/15 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-amber-400 shrink-0" />
                          <span className="font-medium text-foreground">Imposto DAS ({tax.toFixed(1)}%)</span>
                          <span className="text-[11px] text-muted-foreground hidden sm:inline">· Simples Nacional</span>
                        </div>
                        <span className="numeric font-semibold text-foreground text-right pr-6 sm:pr-8">{brl(taxes)}</span>
                        <span className="numeric text-muted-foreground text-right w-16 sm:w-20">{Math.round(taxPct)}%</span>
                      </div>

                      {/* Linha 3: Taxa de Cartão */}
                      <div className="grid grid-cols-[1fr_auto_auto] items-center py-2.5 px-3.5 text-xs border-b border-border/40 hover:bg-secondary/15 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-sky-400 shrink-0" />
                          <span className="font-medium text-foreground">Taxa de Cartão ({cardRate.toFixed(1)}%)</span>
                          <span className="text-[11px] text-muted-foreground hidden sm:inline">· Maquininha/gateway</span>
                        </div>
                        <span className="numeric font-semibold text-foreground text-right pr-6 sm:pr-8">{brl(cardFees)}</span>
                        <span className="numeric text-muted-foreground text-right w-16 sm:w-20">{Math.round(cardPct)}%</span>
                      </div>

                      {/* Linha 4: Lucro Líquido Real (Destaque Nobre Suave) */}
                      <div className={cn(
                        "grid grid-cols-[1fr_auto_auto] items-center py-2.5 px-3.5 text-xs font-semibold",
                        profit < 0
                          ? "bg-rose-500/10 text-rose-800 dark:text-rose-300"
                          : "bg-emerald-500/8 text-emerald-900 dark:text-emerald-300",
                      )}>
                        <div className="flex items-center gap-2">
                          <span className={cn("size-2 rounded-full shrink-0", profit < 0 ? "bg-rose-500" : "bg-emerald-500")} />
                          <span className="font-bold">
                            Lucro Líquido Real
                          </span>
                          <span className="text-[11px] opacity-75 hidden sm:inline">· Sobra limpa por peça</span>
                        </div>
                        <span className={cn("numeric font-bold text-sm text-right pr-6 sm:pr-8", profit < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
                          {brl(profit)}
                        </span>
                        <span className={cn("numeric font-semibold text-right w-16 sm:w-20", profit < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
                          {Math.round(profitPct)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="border-t border-border/50" />

              {/* ── AÇÕES FINAIS UNIFICADAS (RODAPÉ) ── */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-0.5">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    onClick={openEntryForCurrent}
                    className="h-10 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-glow cursor-pointer flex items-center justify-center gap-2 px-5 transition-all active:scale-[0.98] text-xs"
                  >
                    <PackagePlus className="size-4" />
                    <span>Dar entrada no estoque</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => save.mutate()}
                    disabled={save.isPending}
                    className="h-10 rounded-full text-xs font-semibold border-border/80 bg-background hover:bg-secondary/60 cursor-pointer flex items-center justify-center gap-1.5 px-4 transition-all"
                  >
                    <Save className="size-3.5" />
                    <span>Salvar no histórico</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetPricingModel}
                    className="h-10 rounded-full text-xs font-semibold border-border/80 bg-background hover:bg-secondary/60 cursor-pointer flex items-center justify-center gap-1.5 px-4 transition-all"
                    title="Limpar campos e precificar outro modelo"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Novo modelo</span>
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={promoteToGrade}
                  className="h-9 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer flex items-center justify-center gap-1.5 transition-all px-3.5"
                >
                  <span>Expandir para grade</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>

              {/* Disclaimer fiscal discreto */}
              <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
                ⊙ Estimativa com as taxas informadas. Não representa orientação fiscal.
              </p>

              {/* Ponto de Equilíbrio no Modo Rápido (quando qty > 1) */}
              {actualLotUnits > 1 && (
                <div className="rounded-xl bg-secondary/40 p-3.5 text-xs text-muted-foreground leading-relaxed border border-border/60">
                  Vendendo <strong className="text-foreground">{lotBreakEven.unitsToBreakEven} {lotBreakEven.unitsToBreakEven === 1 ? "peça" : "peças"}</strong> você quita todo o custo do lote ({brl(lotBreakEven.totalLotCost)}). {lotBreakEven.totalLotProfit >= 0 ? (
                    Math.max(actualLotUnits - lotBreakEven.unitsToBreakEven, 0) > 0 ? (
                      <>
                        As outras <strong className="text-foreground">{Math.max(actualLotUnits - lotBreakEven.unitsToBreakEven, 0)} peças</strong> geram <strong className="text-success">+{brl(lotBreakEven.profitOnRemainder)}</strong> líquidos no seu caixa (Lucro total do lote: <strong className="text-foreground">{brl(lotBreakEven.totalLotProfit)}</strong>).
                      </>
                    ) : (
                      "Lote quitado com margem saudável."
                    )
                  ) : (
                    <span className="text-destructive font-semibold">
                      Atenção: este preço resulta em prejuízo previsto de {brl(Math.abs(lotBreakEven.totalLotProfit))} no lote.
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

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

                  {/* Linha 2: Custos Extras e Custo Real Unificado */}
                  <div className="pt-3 border-t border-border/50 grid gap-3 sm:grid-cols-4 items-center">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Frete da nota</span>
                        <span className="text-[10px] text-muted-foreground/70">total</span>
                      </div>
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
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Embalagem</span>
                        <span className="text-[10px] text-muted-foreground/70">total</span>
                      </div>
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
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Outros extras</span>
                        <span className="text-[10px] text-muted-foreground/70">total</span>
                      </div>
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

                    {/* Destaque Custo Real Unitário Adaptativo */}
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 flex flex-col justify-center">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary">Custo real / peça</span>
                        <span className="text-[10px] font-bold text-primary px-1.5 py-0.2 rounded-full bg-primary/10">
                          {actualLotUnits > 0 ? `${actualLotUnits} un.` : "unitário base"}
                        </span>
                      </div>
                      <p className="text-base font-black text-foreground numeric mt-0.5">
                        {brl(
                          toNumber(baseWholesaleGrade) +
                          resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1) +
                          resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1) +
                          resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1)
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {actualLotUnits > 0 ? (
                          `${brl(toNumber(baseWholesaleGrade))} compra + ${brl(
                            resolvePerUnit(freight, freightMode, actualLotUnits) +
                            resolvePerUnit(packaging, packagingMode, actualLotUnits) +
                            resolvePerUnit(other, otherMode, actualLotUnits)
                          )} rateio`
                        ) : (
                          `${brl(toNumber(baseWholesaleGrade))} atacado (sem lote ativo)`
                        )}
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/* ── CARD RESUMO & CTA DO TOPO (DESKTOP) ── */}
              <aside className="hidden lg:flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft h-full gap-3">
                {/* 1. Preço sugerido por peça */}
                <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2.5">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Preço sugerido / peça</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl sm:text-3xl font-black text-foreground numeric tracking-tight">
                        {brl(summaryPrices.avgSuggested)}
                      </p>
                      {actualLotUnits > 0 && (
                        <span className="text-[11px] font-bold text-primary numeric">
                          (lote {actualLotUnits} un.)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground shrink-0 pt-0.5 space-y-0.5">
                    <p>Custo: <strong className="text-foreground numeric">{brl(summaryPrices.avgCost)}</strong></p>
                    <p>Lucro: <strong className={cn("numeric", summaryPrices.avgProfit >= 0 ? "text-success" : "text-destructive")}>
                      {summaryPrices.avgProfit >= 0 ? "+" : ""}{brl(summaryPrices.avgProfit)}
                    </strong></p>
                  </div>
                </div>

                {/* 2. Grid de 4 Métricas Financeiras Compactas */}
                <div className="grid grid-cols-4 gap-2 text-center py-0.5">
                  <div className="rounded-lg bg-secondary/35 px-1.5 py-1">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide truncate">Investimento</p>
                    <p className="text-xs font-black numeric text-foreground mt-0.5 truncate">{brl(summaryPrices.totalInvestment)}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/35 px-1.5 py-1">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide truncate">Faturamento</p>
                    <p className="text-xs font-black numeric text-foreground mt-0.5 truncate">{brl(summaryPrices.totalRevenue)}</p>
                  </div>
                  <div className="rounded-lg bg-secondary/35 px-1.5 py-1">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide truncate">Lucro líq.</p>
                    <p className={cn("text-xs font-black numeric mt-0.5 truncate", summaryPrices.totalProfit >= 0 ? "text-success" : "text-destructive")}>
                      {summaryPrices.totalProfit >= 0 ? "+" : ""}{brl(summaryPrices.totalProfit)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/35 px-1.5 py-1">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide truncate">Peças</p>
                    <p className="text-xs font-black numeric text-foreground mt-0.5 truncate">{actualLotUnits} un.</p>
                  </div>
                </div>

                {/* 3. Ações e Entrada no Estoque */}
                <div className="space-y-2 pt-0.5">
                  <Button
                    type="button"
                    onClick={openEntryForCurrent}
                    disabled={!canSubmitGrade}
                    className="w-full h-10 rounded-xl gradient-primary text-primary-foreground text-xs sm:text-sm font-bold shadow-glow disabled:opacity-40 hover:opacity-95 transition-all active:scale-[0.99] cursor-pointer"
                  >
                    <PackagePlus className="size-4 mr-2" />
                    <span>Dar entrada no estoque</span>
                  </Button>

                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    {!canSubmitGrade && validationMsg ? (
                      <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                        Falta: <span className="font-semibold text-foreground">{validationMsg}</span>
                      </p>
                    ) : (
                      <span className="text-[11px] text-muted-foreground font-medium">Pronto para dar entrada</span>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => save.mutate()}
                        disabled={save.isPending || !name.trim()}
                        className="h-7 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer px-1.5"
                      >
                        <Save className="size-3 mr-1" /> Salvar modelo
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetPricingModel}
                        className="h-7 text-[11px] font-semibold text-muted-foreground hover:text-destructive cursor-pointer px-1.5"
                      >
                        <RotateCcw className="size-3 mr-1" /> Limpar
                      </Button>
                    </div>
                  </div>
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
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
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
                <div className="rounded-xl border border-border/80 bg-secondary/30 p-2 sm:px-3 sm:py-2 flex flex-wrap items-center justify-between gap-2.5">
                  {/* BLOCO ESQUERDA: Grade (Editar Grade + Cores) */}
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    {/* Botão de Abrir Modal para Editar Grade Completa */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGradeModal(true)}
                      className="h-8 px-2.5 rounded-lg text-xs font-bold border-border bg-background hover:bg-secondary cursor-pointer shadow-2xs flex items-center gap-1.5"
                      title="Abrir gerador para alterar cores, tamanhos e quantidades"
                    >
                      <Boxes className="size-3.5 text-primary" />
                      <span>Editar Grade ({activeColors.length} {activeColors.length === 1 ? "cor" : "cores"} · {Array.from(new Set(variants.map((v) => v.size))).length} tam.)</span>
                    </Button>

                    {/* Cores */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Botão + Popover de Adicionar Cor */}
                      <div className="relative" ref={colorPopoverRef}>
                        <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowColorInput(!showColorInput)}
                        className="h-8 px-2.5 rounded-lg text-xs font-bold border-border bg-background hover:bg-secondary/60 cursor-pointer shadow-2xs"
                      >
                        <Plus className="size-3.5 mr-1 text-primary" />
                        <span>Cor</span>
                      </Button>

                      {showColorInput && (
                        <div className="absolute left-0 top-10 z-40 w-72 rounded-2xl border border-border bg-popover p-3 shadow-lift space-y-2.5">
                          <div className="flex items-center gap-1.5 border-b border-border/60 pb-2">
                            <Search className="size-3.5 text-muted-foreground" />
                            <input
                              autoFocus
                              type="text"
                              value={colorSearchQuery}
                              onChange={(e) => setColorSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && colorSearchQuery.trim()) {
                                  e.preventDefault();
                                  addColorToGrade(colorSearchQuery.trim());
                                  setColorSearchQuery("");
                                  setShowColorInput(false);
                                }
                              }}
                              placeholder="Buscar ou digitar cor..."
                              className="w-full bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground"
                            />
                            {colorSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setColorSearchQuery("")}
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <X className="size-3" />
                              </button>
                            )}
                          </div>

                          {/* Cores Personalizadas da Loja */}
                          {customOptions.customColors.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Cores da sua Loja</p>
                                <Link
                                  to="/configuracoes"
                                  search={{ tab: "catalogo" }}
                                  className="text-[10px] text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-0.5"
                                >
                                  <span>Gerenciar</span>
                                  <ArrowUpRight className="size-2.5" />
                                </Link>
                              </div>
                              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                                {customOptions.customColors
                                  .filter((c) => !activeColors.some((ac) => ac.toLowerCase() === c.label.toLowerCase()))
                                  .filter((c) => !colorSearchQuery || c.label.toLowerCase().includes(colorSearchQuery.toLowerCase()))
                                  .map((c) => (
                                    <button
                                      key={c.value}
                                      type="button"
                                      onClick={() => {
                                        addColorToGrade(c.label);
                                        setColorSearchQuery("");
                                        setShowColorInput(false);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold bg-primary/10 border border-primary/20 hover:bg-primary/20 text-foreground transition-colors cursor-pointer"
                                    >
                                      <span
                                        className="size-2 rounded-full border border-black/10 shrink-0"
                                        style={{ backgroundColor: c.hex }}
                                      />
                                      <span>{c.label}</span>
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Paleta Padrão da Coleção */}
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              {customOptions.customColors.length > 0 ? "Padrões de Fábrica" : "Paleta da Coleção"}
                            </p>
                            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                              {["Off-White", "Preto", "Areia", "Nude", "Terracota", "Caramelo", "Verde Oliva", "Azul Marinho", "Vinho", "Cinza Mescla"]
                                .filter((c) => !activeColors.some((ac) => ac.toLowerCase() === c.toLowerCase()))
                                .filter((c) => !colorSearchQuery || c.toLowerCase().includes(colorSearchQuery.toLowerCase()))
                                .map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => {
                                      addColorToGrade(c);
                                      setColorSearchQuery("");
                                      setShowColorInput(false);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-secondary/50 hover:bg-secondary text-foreground transition-colors cursor-pointer"
                                  >
                                    <span className={cn("size-2 rounded-full", getColorDot(c))} />
                                    <span>{c}</span>
                                  </button>
                                ))}
                            </div>
                          </div>

                          {colorSearchQuery.trim() && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                addColorToGrade(colorSearchQuery.trim());
                                setColorSearchQuery("");
                                setShowColorInput(false);
                              }}
                              className="w-full h-8 text-xs font-bold gradient-primary text-primary-foreground rounded-xl"
                            >
                              Adicionar &quot;{colorSearchQuery.trim()}&quot;
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Chips das Cores Ativas */}
                    {activeColors.map((color) => (
                      <span
                        key={color}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full border border-border/80 bg-background shadow-2xs text-xs font-semibold text-foreground shrink-0"
                      >
                        <span className={cn("size-2.5 rounded-full shrink-0 shadow-2xs", getColorDot(color))} />
                        <span className="whitespace-nowrap">{color}</span>
                        <button
                          type="button"
                          onClick={() => removeColorFromGrade(color)}
                          className="size-4 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          aria-label={`Remover cor ${color}`}
                        >
                          <X className="size-2.5" />
                        </button>
                      </span>
                    ))}

                    {/* Se não houver cores ativas, exibir 3 atalhos rápidos de 1 clique */}
                    {activeColors.length === 0 && (
                      <div className="flex items-center gap-1">
                        {["Preto", "Off-White", "Areia"].map((cor) => (
                          <button
                            key={cor}
                            type="button"
                            onClick={() => addColorToGrade(cor)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-border/60 bg-background hover:bg-secondary/80 text-foreground transition-all cursor-pointer shadow-2xs"
                          >
                            <span className={cn("size-1.5 rounded-full shrink-0", getColorDot(cor))} />
                            <span>+{cor}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Divisor vertical */}
                  <div className="h-5 w-px bg-border/70 shrink-0 hidden sm:block" />

                  {/* Grade de Tamanhos */}
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={sizePresetDropdown}
                      onValueChange={(val) => {
                        setSizePresetDropdown(val);
                        if (val === "loja" && customOptions.customSizes.length > 0) {
                          applySizePreset(customOptions.customSizes.map((s) => s.label));
                          return;
                        }
                        const PRESETS_MAP: Record<string, string[]> = {
                          padrao: ["P", "M", "G", "GG"],
                          alfaiataria: ["36", "38", "40", "42", "44", "46"],
                          plus: ["GG", "G1", "G2", "G3"],
                          jeans: ["34", "36", "38", "40", "42", "44", "46", "48"],
                          infantil: ["2", "4", "6", "8", "10", "12", "14", "16"],
                          unico: ["Único"],
                        };
                        if (PRESETS_MAP[val]) {
                          applySizePreset(PRESETS_MAP[val]);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-32 sm:w-36 rounded-lg text-xs font-semibold bg-background border-border shadow-2xs">
                        <SelectValue placeholder="Grade..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customOptions.customSizes.length > 0 && (
                          <SelectItem value="loja" className="text-xs font-bold text-primary">
                            ✨ Loja ({customOptions.customSizes.map((s) => s.label).join(", ")})
                          </SelectItem>
                        )}
                        <SelectItem value="padrao" className="text-xs">P ao GG</SelectItem>
                        <SelectItem value="alfaiataria" className="text-xs">Alfaiataria (36 a 46)</SelectItem>
                        <SelectItem value="plus" className="text-xs">Plus Size (GG a G3)</SelectItem>
                        <SelectItem value="jeans" className="text-xs">Jeans (34 a 48)</SelectItem>
                        <SelectItem value="infantil" className="text-xs">Infantil (2 a 16)</SelectItem>
                        <SelectItem value="unico" className="text-xs">Tamanho Único</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Chips compactos dos tamanhos */}
                    <div className="flex items-center gap-0.5">
                      {(() => {
                        const activeVariantSizes = Array.from(new Set(variants.map((v) => v.size)));
                        const sizesToShow = activeVariantSizes.length > 0 ? activeVariantSizes : (matrixSizes.length > 0 ? matrixSizes : ["P", "M", "G", "GG"]);
                        const isPreview = activeVariantSizes.length === 0;

                        return sizesToShow.map((sz) => (
                          <span
                            key={sz}
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-bold shrink-0 transition-all",
                              isPreview
                                ? "border-dashed border-border bg-secondary/30 text-muted-foreground"
                                : "border-border/80 bg-background text-foreground shadow-2xs",
                            )}
                          >
                            <span>{sz}</span>
                            {!isPreview && (
                              <button
                                type="button"
                                onClick={() => toggleSizeInGrade(sz)}
                                className="size-3.5 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                aria-label={`Remover tamanho ${sz}`}
                              >
                                <X className="size-2" />
                              </button>
                            )}
                          </span>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                {/* BLOCO DIREITA: Estratégia de Precificação & Quantidade */}
                <div className="flex flex-wrap items-center gap-2">
                  {gradePricingMode === "unified" ? (
                    <div className="flex items-center gap-2">
                      {/* Divisor vertical */}
                      <div className="h-5 w-px bg-border/70 shrink-0 hidden md:block" />

                      {/* Mini seletor de estratégia */}
                      <div className="inline-flex rounded-lg border border-border/80 bg-background p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setStrategy("margin")}
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
                          onClick={() => setStrategy("markup")}
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
                          onClick={() => setStrategy("direct_price")}
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

                      {/* Controles da Estratégia inline */}
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

                          {/* Presets compactos de margem */}
                          <div className="hidden lg:flex items-center gap-1">
                            {[
                              { val: 35, label: "35%" },
                              { val: 45, label: "45%" },
                              { val: 50, label: "50%" },
                              { val: 60, label: "60%" },
                            ].map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => {
                                  setDesiredMargin(preset.val);
                                  setMatrixGlobalMarginStr(String(preset.val));
                                }}
                                className={cn(
                                  "px-1.5 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer",
                                  Math.abs(desiredMargin - preset.val) < 0.5
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                    : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                                )}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
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

                          <div className="hidden lg:flex items-center gap-1">
                            {[
                              { val: 100, label: "100%" },
                              { val: 150, label: "150%" },
                              { val: 200, label: "200%" },
                            ].map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => {
                                  setMarkup(preset.val);
                                  setMatrixGlobalMarkupStr(String(preset.val));
                                }}
                                className={cn(
                                  "px-1.5 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer",
                                  Math.abs(markup - preset.val) < 0.5
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                    : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                                )}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {strategy === "direct_price" && (
                        <div className="relative flex h-8 w-28 items-center rounded-lg border border-border/80 bg-background shadow-2xs focus-within:border-primary transition-all">
                          <span className="pl-2 text-xs font-bold text-muted-foreground select-none">R$</span>
                          <input
                            inputMode="decimal"
                            value={directSalePrice}
                            onChange={(e) => setDirectSalePrice(e.target.value)}
                            placeholder="0,00"
                            className="h-8 w-full bg-transparent px-1.5 text-xs font-black text-foreground outline-none numeric"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Modo Isolado: Ação rápida para replicar custo base */
                    baseWholesaleGrade && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setVariants((prev) => prev.map((v) => ({ ...v, wholesaleCost: baseWholesaleGrade })));
                          toast.success(`Custo base R$ ${baseWholesaleGrade} aplicado a todas as variações`);
                        }}
                        className="h-8 text-xs font-semibold rounded-lg border-border bg-background cursor-pointer shadow-2xs"
                      >
                        ⚡ Replicar custo ({brl(toNumber(baseWholesaleGrade))})
                      </Button>
                    )
                  )}

                  {/* Qtd em todas (quando há variações) */}
                  {variants.length > 0 && (
                    <div className="flex items-center gap-1 pl-1">
                      <div className="h-5 w-px bg-border/70 shrink-0" />
                      <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider pl-1">Qtd:</span>
                      {[1, 2, 3, 4, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => applyBulkQty(num)}
                          className="size-6 rounded-md border border-border/60 bg-background hover:bg-secondary text-foreground text-[11px] font-bold numeric transition-colors cursor-pointer shadow-2xs"
                          title={`Definir ${num} peças para todas as variações`}
                        >
                          {num}
                        </button>
                      ))}
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

                    {/* Sugestões rápidas de início com 1 clique */}
                    <div className="pt-1 flex flex-wrap items-center justify-center gap-2 text-xs">
                      <span className="text-muted-foreground text-[11px] font-semibold">Início rápido:</span>
                      {["Preto", "Off-White", "Areia", "Terracota"].map((cor) => (
                        <button
                          key={cor}
                          type="button"
                          onClick={() => {
                            addColorToGrade(cor);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/70 bg-card hover:bg-secondary text-foreground text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:border-primary/40"
                        >
                          <span className={cn("size-2 rounded-full", getColorDot(cor))} />
                          <span>+ {cor}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                <div className="overflow-x-auto rounded-xl border border-border/70 bg-background">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-secondary/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                        <th className="py-2.5 pl-4 w-28">Tamanho</th>
                        <th className="py-2.5 px-3 text-center w-28">Qtd.</th>
                        <th className="py-2.5 px-3 text-right w-28">Custo Atacado</th>
                        <th className="py-2.5 px-3 text-right w-28">Custo Real</th>
                        <th className="py-2.5 px-3 text-right w-32">Preço de Venda</th>
                        <th className="py-2.5 px-3 text-center w-24">Margem</th>
                        <th className="py-2.5 px-3 text-right w-28">Lucro Líquido</th>
                        <th className="py-2.5 pr-4 text-center w-12"><span className="sr-only">Ações</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {colorGroups.map((group) => {
                        if (group.items.length === 0) return null;
                        return (
                          <Fragment key={group.color}>
                            {/* Header do Grupo de Cor */}
                            <tr className="bg-secondary/40 border-y border-border/60">
                              <td colSpan={7} className="py-2 pl-4">
                                <div className="flex items-center gap-2">
                                  <span className={cn("size-2.5 rounded-full shrink-0 shadow-2xs", getColorDot(group.color))} />
                                  <span className="text-xs font-bold text-foreground">{group.color}</span>
                                  <span className="text-[11px] text-muted-foreground font-medium">
                                    · {group.totalUnits} {group.totalUnits === 1 ? "unidade" : "unidades"}
                                  </span>
                                  {group.avgPrice > 0 && (
                                    <span className="text-[11px] text-muted-foreground font-medium">
                                      · Média {brl(group.avgPrice)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 pr-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeColorFromGrade(group.color)}
                                  className="text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                >
                                  Remover cor
                                </button>
                              </td>
                            </tr>

                            {/* Linhas dos Tamanhos desta Cor */}
                            {group.items.map((v) => {
                              const effectiveWholesale = v.wholesaleCost !== "" ? v.wholesaleCost : baseWholesaleGrade;
                              const marginHealthy = v.marginOnPrice >= 30;
                              const marginModerate = v.marginOnPrice > 0 && v.marginOnPrice < 30;

                              return (
                                <tr key={v.id} className="hover:bg-secondary/20 transition-colors">
                                  {/* Tamanho */}
                                  <td className="py-2.5 pl-4 font-black text-xs text-foreground">
                                    <span className="inline-block px-2 py-0.5 rounded-md bg-secondary/60">
                                      {v.size}
                                    </span>
                                  </td>

                                  {/* Stepper QTD */}
                                  <td className="py-2.5 px-3 text-center">
                                    <div className="inline-flex items-center rounded-lg border border-border/70 bg-secondary/30 overflow-hidden shadow-2xs">
                                      <button
                                        type="button"
                                        onClick={() => updateVariantQty(v.id, Math.max(1, (v.qty || 1) - 1))}
                                        className="h-7 w-6 flex items-center justify-center text-muted-foreground hover:bg-card hover:text-foreground transition-colors border-r border-border/50 cursor-pointer"
                                      >
                                        <Minus className="size-3" />
                                      </button>
                                      <span className="w-8 text-center text-xs font-bold numeric">{v.qty || 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => updateVariantQty(v.id, (v.qty || 1) + 1)}
                                        className="h-7 w-6 flex items-center justify-center text-muted-foreground hover:bg-card hover:text-foreground transition-colors border-l border-border/50 cursor-pointer"
                                      >
                                        <Plus className="size-3" />
                                      </button>
                                    </div>
                                  </td>

                                  {/* Custo de Atacado */}
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="relative inline-flex items-center">
                                      <input
                                        inputMode="decimal"
                                        value={effectiveWholesale}
                                        onChange={(e) => updateVariantCost(v.id, e.target.value)}
                                        placeholder="0,00"
                                        className="h-7 w-20 text-right font-medium numeric text-xs rounded border border-border/60 bg-transparent px-1.5 focus:bg-background focus:border-primary outline-none"
                                      />
                                    </div>
                                  </td>

                                  {/* Custo Real */}
                                  <td className="py-2.5 px-3 text-right font-semibold numeric text-muted-foreground text-xs">
                                    {brl(v.realCost)}
                                  </td>

                                  {/* Preço de Venda */}
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="relative inline-flex items-center">
                                      <input
                                        inputMode="decimal"
                                        value={v.customSalePrice !== "" ? v.customSalePrice : (v.suggestedPrice > 0 ? v.suggestedPrice.toFixed(2).replace(".", ",") : "")}
                                        onChange={(e) => updateVariantPrice(v.id, e.target.value)}
                                        placeholder="0,00"
                                        className="h-7 w-24 text-right font-bold numeric text-xs rounded border border-border/60 bg-transparent px-1.5 text-foreground focus:bg-background focus:border-primary outline-none"
                                      />
                                    </div>
                                  </td>

                                  {/* Margem */}
                                  <td className="py-2.5 px-3 text-center">
                                    {v.wholesaleNum > 0 && v.suggestedPrice > 0 ? (
                                      <span
                                        className={cn(
                                          "text-xs font-bold numeric",
                                          marginHealthy && "text-success",
                                          marginModerate && "text-amber-500",
                                          v.marginOnPrice <= 0 && "text-destructive",
                                        )}
                                      >
                                        {pct(v.marginOnPrice)}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground/40">—</span>
                                    )}
                                  </td>

                                  {/* Lucro Líquido */}
                                  <td className="py-2.5 px-3 text-right font-bold numeric text-xs">
                                    <span className={v.profit >= 0 ? "text-success" : "text-destructive"}>
                                      {v.profit >= 0 ? "+" : ""}{brl(v.profit)}
                                    </span>
                                  </td>

                                  {/* Excluir Variação */}
                                  <td className="py-2.5 pr-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removeVariant(v.id)}
                                      className="text-muted-foreground/60 hover:text-destructive transition-colors p-1 rounded cursor-pointer"
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
                      <tr className="border-t-2 border-primary/20 bg-secondary/30 font-bold text-xs">
                        <td className="py-3 pl-4 uppercase tracking-wider text-[11px] text-muted-foreground">
                          Total do lote
                        </td>
                        <td className="py-3 px-3 text-center text-primary font-black numeric text-sm">
                          {actualLotUnits} un.
                        </td>
                        <td className="py-3 px-3 text-right numeric text-muted-foreground">
                          {brl(summaryPrices.totalInvestment)}
                        </td>
                        <td className="py-3 px-3 text-right numeric text-muted-foreground">
                          —
                        </td>
                        <td className="py-3 px-3 text-right numeric text-foreground font-black">
                          Média {brl(summaryPrices.avgSuggested)}
                        </td>
                        <td className="py-3 px-3 text-center numeric text-foreground font-bold">
                          {pct(summaryPrices.avgMargin)}
                        </td>
                        <td className="py-3 px-3 text-right numeric font-black">
                          <span className={summaryPrices.totalProfit >= 0 ? "text-success" : "text-destructive"}>
                            {summaryPrices.totalProfit >= 0 ? "+" : ""}{brl(summaryPrices.totalProfit)}
                          </span>
                        </td>
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
                currentSizes={Array.from(new Set(variants.map((v) => v.size)))}
                storeCustomColors={customOptions.customColors}
                storeCustomSizes={customOptions.customSizes}
                onConfirm={handleConfirmGradeModal}
              />
            </section>

            {/* ── BARRA INFERIOR COMPACTA PARA MOBILE (LG:HIDDEN) ── */}
            <div className="fixed bottom-0 inset-x-0 lg:hidden z-30 border-t border-border/80 bg-background/95 backdrop-blur-md px-4 py-3 shadow-lift">
              <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Preço sugerido</p>
                  <p className="text-xl font-black text-foreground numeric leading-tight">
                    {brl(summaryPrices.avgSuggested)}
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
