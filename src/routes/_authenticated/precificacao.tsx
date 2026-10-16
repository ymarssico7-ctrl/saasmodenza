import { useEffect, useMemo, useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  gradeStep = 1,
  onStepChange,
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
  gradeStep?: 1 | 2 | 3;
  onStepChange?: (step: 1 | 2 | 3) => void;
  onEntry: () => void;
  onSave: () => void;
  onReset?: () => void;
  saveDisabled: boolean;
  entryDisabled: boolean;
}) {
  const marginHealth = getMarginHealth(effectiveMargin);

  // ── ETAPA 1 NO MODO GRADE: Foco estrito em Lote e Custos de Aquisição (Padrão Consultoria Vértice) ──
  if (mode === "grade" && gradeStep === 1) {
    const hasWholesale = baseWholesaleCost > 0;
    const hasUnits = totalUnits > 0;
    const effectiveSharedCost = hasUnits && hasWholesale ? sharedCostsPerUnit : 0;
    const totalUnitAcquisition = hasWholesale ? baseWholesaleCost + effectiveSharedCost : 0;
    const totalLotInvestment = hasUnits && hasWholesale ? totalUnits * totalUnitAcquisition : 0;

    return (
      <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft space-y-4">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="size-3.5" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              Resumo do lote
            </span>
          </div>
          <Layers className="size-4 text-muted-foreground/35" />
        </div>

        {/* Métrica Herói: Volume de Peças na Grade */}
        <div className="pt-1">
          <div className="flex items-baseline gap-2.5">
            <span className="num-display text-5xl font-black text-foreground tracking-tight leading-none">
              {totalUnits}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {totalUnits === 1 ? "peça na grade" : "peças na grade"}
            </span>
          </div>
        </div>

        {/* Decomposição de Custos Unitários */}
        <div className="space-y-2.5 rounded-2xl bg-secondary/30 p-3.5 border border-border/50 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Custo de compra</span>
            <span className="num-display font-semibold text-foreground">
              {hasWholesale ? `${brl(baseWholesaleCost)} / peça` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Custos adicionais</span>
            <span className="num-display font-semibold text-foreground">
              {hasUnits && effectiveSharedCost > 0 ? `+${brl(effectiveSharedCost)} / peça` : "—"}
            </span>
          </div>
          <div className="border-t border-border/60 pt-2 flex items-center justify-between font-bold">
            <span className="text-foreground">Custo real por peça</span>
            <span className="num-display text-foreground text-sm font-extrabold">
              {totalUnitAcquisition > 0 ? brl(totalUnitAcquisition) : "—"}
            </span>
          </div>
        </div>

        {/* Investimento Estimado do Lote */}
        <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">Investimento estimado</p>
          <p className="num-display text-3xl font-black text-foreground tracking-tight leading-none">
            {totalLotInvestment > 0 ? brl(totalLotInvestment) : "R$ 0,00"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {totalUnits === 0
              ? "Preencha as quantidades na grade para calcular o lote"
              : "Compra + custos adicionais do lote"}
          </p>
        </div>

        {/* CTA Principal da Etapa 1 */}
        <div className="space-y-2 pt-2">
          <Button
            type="button"
            onClick={() => onStepChange?.(2)}
            disabled={totalUnits === 0 || baseWholesaleCost <= 0}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-glow text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <span>Continuar para custos</span>
            <ArrowRight className="size-4" />
          </Button>

          {onReset && (
            <Button
              type="button"
              variant="ghost"
              onClick={onReset}
              className="w-full h-8 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Limpar grade
            </Button>
          )}

          {totalUnits > 0 && (
            <p className="text-center text-[11px] text-muted-foreground pt-1">
              {totalUnits} {totalUnits === 1 ? "peça" : "peças"}{totalVariants > 1 ? ` · ${totalVariants} variações` : ""}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── ETAPAS 2 E 3 (OU MODO RÁPIDO): Formação de Preço e Fechamento ──
  return (
    <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft space-y-4">
      {/* ── Cabeçalho do Resumo ── */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Layers className="size-3.5" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            {mode === "grade"
              ? (gradeStep === 3 ? "Revisão do lote" : "Formação de preço")
              : "Resumo da peça"}
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
            {baseWholesaleCost > 0 ? `${brl(baseWholesaleCost)} / peça` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Custos adicionais</span>
          <span className="num-display font-semibold text-foreground">
            {sharedCostsPerUnit > 0 ? `+${brl(sharedCostsPerUnit)} / peça` : "—"}
          </span>
        </div>
        <div className="border-t border-border/60 pt-2 flex items-center justify-between font-bold">
          <span className="text-foreground">Custo real por peça</span>
          <span className="num-display text-foreground text-sm font-extrabold">
            {totalUnitCost > 0
              ? brl(totalUnitCost)
              : (baseWholesaleCost + sharedCostsPerUnit > 0 ? brl(baseWholesaleCost + sharedCostsPerUnit) : "—")}
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
        <p className="num-display text-4xl font-black text-foreground tracking-tight leading-none">
          {suggestedPrice > 0 ? brl(suggestedPrice) : "R$ —,——"}
        </p>
        {suggestedPrice > 0 && (
          <div className="flex items-center justify-center gap-2 text-xs pt-1">
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

      {/* ── Totais do Lote (quando totalUnits > 1 e etapa >= 2) ── */}
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

      {/* ── Botões de Ação por Contexto ── */}
      <div className="space-y-2 pt-1">
        {mode === "grade" && gradeStep === 2 && (
          <>
            <Button
              type="button"
              onClick={() => onStepChange?.(3)}
              disabled={suggestedPrice <= 0}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-glow text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span>Avançar para revisão</span>
              <ArrowRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onStepChange?.(1)}
              className="w-full h-9 rounded-xl text-xs font-semibold border-border/80 bg-background hover:bg-secondary cursor-pointer"
            >
              ← Voltar para grade
            </Button>
          </>
        )}

        {(mode === "rapida" || (mode === "grade" && gradeStep === 3)) && (
          <>
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
                {onStepChange && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onStepChange(2)}
                    className="h-9 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Voltar
                  </Button>
                )}
              </div>
            )}
          </>
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
  const [gradePricingMode, setGradePricingMode] = useState<"unified" | "per_unit">("unified");
  const [gradeStep, setGradeStep] = useState<1 | 2 | 3>(1);
  const [gradeViewMode, setGradeViewMode] = useState<"matrix" | "table">("matrix");
  const [resetAlertOpen, setResetAlertOpen] = useState(false);
  const [newMatrixColorInput, setNewMatrixColorInput] = useState("");
  const [appliedStrategySnapshot, setAppliedStrategySnapshot] = useState<{
    cost: number;
    mode: string;
    margin: string;
    markup: string;
    directPrice: string;
  } | null>(null);

  // Lista Unificada de Variantes (SKUs)
  const [variants, setVariants] = useState<VariantRow[]>([]);

  // Seletor de geração rápida da grade
  const [activeColors, setActiveColors] = useState<string[]>(["Off-White"]);
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
  const [freight, setFreight] = useState("6,00");
  const [packaging, setPackaging] = useState("3,50");
  const [other, setOther] = useState("2,00");

  // ── Modo de custo: por peça ou total do lote ─────────────────────
  const [freightMode, setFreightMode] = useState<"per_unit" | "lot_total">("per_unit");
  const [packagingMode, setPackagingMode] = useState<"per_unit" | "lot_total">("per_unit");
  const [otherMode, setOtherMode] = useState<"per_unit" | "lot_total">("per_unit");

  const [desiredMargin, setDesiredMargin] = useState(() => pricingSettings.defaultMargin); // Margem líquida padrão da loja
  const [markup, setMarkup] = useState(80); // 80% markup sobre custo
  const [directSalePrice, setDirectSalePrice] = useState("119,90");
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
    setAppliedStrategySnapshot({
      cost: toNumber(baseWholesaleGrade) || 0,
      mode: matrixGlobalMode,
      margin: matrixGlobalMarginStr,
      markup: matrixGlobalMarkupStr,
      directPrice: matrixGlobalDirectPrice,
    });
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

  // ── 2D Fashion Matrix Helpers (Shopify Polaris & Apple Grid) ──────
  const activeMatrixSizes = useMemo(() => {
    const fromActive = Array.from(activeModelSizes);
    if (fromActive.length > 0) {
      return sortCanonicalSizes(fromActive);
    }
    const fromVariants = Array.from(new Set(variants.map((v) => v.size)));
    if (fromVariants.length > 0) {
      return sortCanonicalSizes(fromVariants);
    }
    return matrixSizes.length > 0 ? sortCanonicalSizes(matrixSizes) : ["P", "M", "G", "GG"];
  }, [activeModelSizes, variants, matrixSizes]);

  const matrixColors = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    activeColors.forEach((c) => {
      const lower = c.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(c);
      }
    });
    variants.forEach((v) => {
      const lower = v.color.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(v.color);
      }
    });
    return list.length > 0 ? list : (variants.length > 0 ? ["Off-White"] : []);
  }, [activeColors, variants]);

  const getMatrixQty = (color: string, size: string): number => {
    const match = variants.find(
      (v) => v.color.toLowerCase() === color.toLowerCase() && v.size === size
    );
    return match ? (match.qty ?? 0) : 0;
  };

  const updateMatrixQty = (color: string, size: string, newQty: number) => {
    const qty = Math.max(0, Math.floor(newQty || 0));
    setVariants((prev) => {
      const idx = prev.findIndex(
        (v) => v.color.toLowerCase() === color.toLowerCase() && v.size === size
      );
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx]!, qty };
        return copy;
      }
      if (qty === 0) return prev;
      const newRow: VariantRow = {
        id: `v-${size.toLowerCase()}-${color.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`,
        size,
        color,
        wholesaleCost: baseWholesaleGrade || "",
        customSalePrice: "",
        qty,
      };
      return [...prev, newRow];
    });
  };

  const handleAddMatrixColor = (colorName: string) => {
    const clean = colorName.trim();
    if (!clean) return;
    if (!activeColors.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setActiveColors((prev) => [...prev, clean]);
    }
    const sizesToUse = activeMatrixSizes.length > 0 ? activeMatrixSizes : ["P", "M", "G", "GG"];
    setVariants((prev) => {
      const existingCombinations = new Set(prev.map((v) => `${v.color.toLowerCase()}::${v.size}`));
      const toAdd: VariantRow[] = [];
      sizesToUse.forEach((sz) => {
        const key = `${clean.toLowerCase()}::${sz}`;
        if (!existingCombinations.has(key)) {
          toAdd.push({
            id: `v-${sz.toLowerCase()}-${clean.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`,
            size: sz,
            color: clean,
            wholesaleCost: baseWholesaleGrade || "",
            customSalePrice: "",
            qty: matrixDefaultQtys[sz] ?? 2,
          });
        }
      });
      return [...prev, ...toAdd];
    });
    setNewMatrixColorInput("");
    toast.success(`Cor "${clean}" adicionada à grade!`);
  };

  const handleRemoveMatrixColor = (colorName: string) => {
    const clean = colorName.trim().toLowerCase();
    setActiveColors((prev) => prev.filter((c) => c.toLowerCase() !== clean));
    setVariants((prev) => prev.filter((v) => v.color.toLowerCase() !== clean));
    setColorStrategies((prev) => {
      const copy = { ...prev };
      delete copy[clean];
      return copy;
    });
    toast.success(`Cor "${colorName}" removida da grade.`);
  };

  // ── Alerta de Desatualização (Financial Trust) ─────────────────────
  const isStale = useMemo(() => {
    if (!appliedStrategySnapshot || variants.length === 0) return false;
    const currentCost = toNumber(baseWholesaleGrade) || 0;
    if (Math.abs(currentCost - appliedStrategySnapshot.cost) > 0.001) return true;
    if (matrixGlobalMode !== appliedStrategySnapshot.mode) return true;
    if (matrixGlobalMode === "margin" && matrixGlobalMarginStr !== appliedStrategySnapshot.margin) return true;
    if (matrixGlobalMode === "markup" && matrixGlobalMarkupStr !== appliedStrategySnapshot.markup) return true;
    if (matrixGlobalMode === "direct_price" && matrixGlobalDirectPrice !== appliedStrategySnapshot.directPrice) return true;
    return false;
  }, [
    appliedStrategySnapshot,
    variants.length,
    baseWholesaleGrade,
    matrixGlobalMode,
    matrixGlobalMarginStr,
    matrixGlobalMarkupStr,
    matrixGlobalDirectPrice,
  ]);

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

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb de Navegação ── */}
      <div className="flex items-center text-xs text-muted-foreground pb-0.5">
        <div className="flex items-center gap-1.5 font-medium">
          <span>Produtos</span>
          <ChevronRight className="size-3 text-muted-foreground/50" />
          <span className="text-foreground font-semibold">Precificação</span>
        </div>
      </div>

      <PageHeader
        title="Precificação"
        description="O preço certo. Uma grade de cada vez."
      />

      {/* ── Segmented Control Principal (Padrão Apple Studio / Shopify Polaris) ───────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-border/70 bg-secondary/60 p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setMode("rapida")}
            className={cn(
              "rounded-lg px-4 py-2 text-xs sm:text-sm transition-all duration-150 cursor-pointer font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              mode === "rapida"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Precificação rápida
          </button>
          <button
            type="button"
            onClick={() => setMode("grade")}
            className={cn(
              "rounded-lg px-4 py-2 text-xs sm:text-sm transition-all duration-150 cursor-pointer font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              mode === "grade"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Grade &amp; estoque
          </button>
          <button
            type="button"
            onClick={() => setMode("historico")}
            className={cn(
              "rounded-lg px-4 py-2 text-xs sm:text-sm transition-all duration-150 cursor-pointer flex items-center gap-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              mode === "historico"
                ? "bg-card text-foreground shadow-xs font-semibold"
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
          mode !== "historico" ? "lg:grid lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_368px] lg:items-start" : ""
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
                placeholder="Ex: Vestido Midi Linho com Fenda"
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
            MODO GRADE — FLUXO SEQUENCIAL CONTÍNUO (GRADE + CUSTOS & PRECIFICAÇÃO)
        ══════════════════════════════════════════════════════════════════ */}
        {mode === "grade" && (
          <>
            {/* ── Stepper de 3 Etapas Conectadas (Padrão Apple HIG / Vértice) ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-secondary/50 border border-border/80 shadow-2xs">
              <div className="grid grid-cols-3 gap-1 w-full sm:w-auto flex-1 max-w-xl">
                <button
                  type="button"
                  onClick={() => setGradeStep(1)}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    gradeStep === 1
                      ? "bg-card text-foreground shadow-xs border border-border/70"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  <span className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 transition-colors",
                    actualLotUnits > 0
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : gradeStep === 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  )}>
                    {actualLotUnits > 0 ? <Check className="size-3 stroke-[2.5]" /> : "1"}
                  </span>
                  <span className="truncate">Peça e grade</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGradeStep(2)}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    gradeStep === 2
                      ? "bg-card text-foreground shadow-xs border border-border/70"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  <span className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 transition-colors",
                    summaryPrices.avgSuggested > 0 && actualLotUnits > 0
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : gradeStep === 2
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  )}>
                    {summaryPrices.avgSuggested > 0 && actualLotUnits > 0 ? <Check className="size-3 stroke-[2.5]" /> : "2"}
                  </span>
                  <span className="truncate">Custos e preço</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGradeStep(3)}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    gradeStep === 3
                      ? "bg-card text-foreground shadow-xs border border-border/70"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  <span className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 transition-colors",
                    gradeStep === 3
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    3
                  </span>
                  <span className="truncate">Revisão</span>
                </button>
              </div>

              {(name.trim() !== "" || baseWholesaleGrade.trim() !== "" || variants.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setName("");
                    setBaseWholesaleGrade("");
                    setVariants([]);
                    setActiveColors([]);
                    setEntryPhotoUrl("");
                    toast.success("Grade limpa", { description: "Nome, custo base e todas as variações foram removidos." });
                  }}
                  className="h-8 px-3 rounded-xl border border-border/70 bg-card text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5 self-end sm:self-auto"
                  title="Limpar grade completa"
                >
                  <RotateCcw className="size-3" />
                  <span>Limpar tudo</span>
                </button>
              )}
            </div>

            {/* ── ETAPA 1: A PEÇA & SUA GRADE DE PRODUÇÃO ── */}
            {gradeStep === 1 && (
            <section className="panel p-5 sm:p-6 space-y-6">
              {/* Identificação da Peça (Padrão Vértice / Apple Studio — Sem molduras repetidas) */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
                <ImageUploader
                  compact
                  currentUrl={entryPhotoUrl || null}
                  bucket="product-photos"
                  folder="inventory"
                  onUploaded={(url) => setEntryPhotoUrl(url)}
                  placeholder="Foto da peça"
                  className="self-center sm:self-start shrink-0"
                />

                <div className="flex-1 w-full space-y-3.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Nome da peça
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Vestido midi de linho"
                      className="h-11 rounded-xl font-bold text-base bg-card shadow-2xs border-border/80 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Categoria
                      </Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-10 rounded-xl font-medium text-xs bg-card shadow-2xs border-border/80">
                          <SelectValue placeholder="Selecione categoria..." />
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

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Custo de compra / peça
                      </Label>
                      <div className="relative flex h-10 items-center rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <span className="pl-3 text-xs font-bold text-muted-foreground select-none">R$</span>
                        <input
                          inputMode="decimal"
                          value={baseWholesaleGrade}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBaseWholesaleGrade(val);
                            setVariants((prev) =>
                              prev.map((v) => ({
                                ...v,
                                wholesaleCost: val,
                                customSalePrice: "",
                              }))
                            );
                          }}
                          placeholder="0,00"
                          className="h-10 w-full bg-transparent px-2 text-xs font-bold text-foreground outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Grade de peças (Padrão Vértice / Apple HIG) ── */}
              <div className="space-y-4 pt-4 border-t border-border/60">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Grade de peças</h3>
                    <p className="text-xs text-muted-foreground">Cores, tamanhos e quantidades do lote.</p>
                  </div>
                  {actualLotUnits > 0 && (
                    <span className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-semibold text-muted-foreground border border-border/60">
                      {matrixColors.length} {matrixColors.length === 1 ? "cor" : "cores"} · {activeMatrixSizes.length} {activeMatrixSizes.length === 1 ? "tamanho" : "tamanhos"}
                    </span>
                  )}
                </div>

                {/* Linha enxuta de controle: Família (dropdown) + Tamanhos selecionáveis com checkmark */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Tamanhos</span>
                    <Select value={activeSizeFamily} onValueChange={(val) => {
                      setActiveSizeFamily(val as any);
                      const targetFam = SIZE_FAMILIES.find((f) => f.id === val);
                      if (targetFam) {
                        setMatrixSizes(targetFam.sizes.slice(0, 5));
                      }
                    }}>
                      <SelectTrigger className="h-9 w-auto min-w-[110px] rounded-xl border-border/80 bg-card text-xs font-bold gap-1 px-3 shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SIZE_FAMILIES.map((fam) => (
                          <SelectItem key={fam.id} value={fam.id} className="text-xs font-semibold">
                            {fam.shortLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pills táteis com checkmark ativo */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(SIZE_FAMILIES.find((f) => f.id === activeSizeFamily) ?? SIZE_FAMILIES[0]!).sizes.map((sz) => {
                      const isSzActive = matrixSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => toggleMatrixSize(sz)}
                          className={cn(
                            "flex items-center justify-center gap-1 min-w-[44px] h-9 px-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-2xs active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            isSzActive
                              ? "bg-primary/15 text-primary border border-primary/35 shadow-xs"
                              : "border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:border-border",
                          )}
                        >
                          {isSzActive && <Check className="size-3 stroke-[3]" />}
                          <span>{sz}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selecionar todos */}
                  <button
                    type="button"
                    onClick={() => {
                      const currentFam = SIZE_FAMILIES.find((f) => f.id === activeSizeFamily) ?? SIZE_FAMILIES[0]!;
                      setMatrixSizes(currentFam.sizes);
                    }}
                    className="rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/5 transition-all cursor-pointer shadow-2xs ml-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    + Selecionar todos
                  </button>
                </div>
              </div>

              {/* ── Alternância de visualização: Matriz 2D vs Tabela SKUs ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border border-border/70 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setGradeViewMode("matrix")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      gradeViewMode === "matrix"
                        ? "bg-card text-foreground shadow-xs border border-border/70"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    )}
                  >
                    <LayoutGrid className="size-3.5" />
                    <span>Matriz Rápida 2D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGradeViewMode("table")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      gradeViewMode === "table"
                        ? "bg-card text-foreground shadow-xs border border-border/70"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    )}
                  >
                    <Layers className="size-3.5" />
                    <span>Tabela Detalhada SKUs</span>
                  </button>
                </div>
              </div>

              {/* ── Visualização: Matriz 2D vs Tabela Completa ── */}
              {gradeViewMode === "matrix" ? (
                <div className="space-y-4">
                  {/* Tabela Matriz 2D: Cores (linhas) × Tamanhos (colunas) */}
                  {matrixColors.length > 0 && activeMatrixSizes.length > 0 ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-secondary/30 border-b border-border/60 text-muted-foreground">
                                <th className="py-2.5 px-4 text-left font-semibold text-[11px] uppercase tracking-wider text-muted-foreground min-w-[140px]">
                                  COR
                                </th>
                                {activeMatrixSizes.map((sz) => (
                                  <th key={sz} className="py-2.5 px-3 text-center min-w-[65px] font-bold text-foreground text-xs uppercase">
                                    {sz}
                                  </th>
                                ))}
                                <th className="py-2.5 px-4 text-right font-semibold text-[11px] uppercase tracking-wider text-muted-foreground min-w-[80px]">
                                  TOTAL
                                </th>
                                <th className="py-2.5 px-2 text-center w-10"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {matrixColors.map((color) => {
                                const cp = COLOR_PRESETS.find((p) => p.name.toLowerCase() === color.toLowerCase());
                                const rowTotal = activeMatrixSizes.reduce((acc, sz) => acc + getMatrixQty(color, sz), 0);
                                return (
                                  <tr key={color} className="hover:bg-secondary/20 transition-colors">
                                    <td className="py-2.5 px-4 font-semibold text-foreground">
                                      <div className="flex items-center gap-2.5">
                                        <span
                                          className="size-3.5 rounded-full border border-black/10 shrink-0"
                                          style={{ backgroundColor: cp?.color ?? "#888888" }}
                                        />
                                        <span className="font-medium text-foreground text-xs">{color}</span>
                                      </div>
                                    </td>
                                    {activeMatrixSizes.map((sz) => {
                                      const qty = getMatrixQty(color, sz);
                                      return (
                                        <td key={sz} className="py-2.5 px-2 text-center">
                                          <input
                                            inputMode="numeric"
                                            value={qty === 0 ? "" : qty}
                                            onChange={(e) => {
                                              const val = e.target.value.replace(/\D/g, "");
                                              updateMatrixQty(color, sz, val === "" ? 0 : Number(val));
                                            }}
                                            placeholder="0"
                                            className={cn(
                                              "h-9 w-12 rounded-lg text-center text-xs font-bold outline-none border transition-all",
                                              qty > 0
                                                ? "border-primary/40 bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
                                                : "border-border/60 bg-secondary/35 text-muted-foreground/60 hover:border-border hover:bg-card focus:border-primary focus:bg-card focus:text-foreground"
                                            )}
                                            title={`Quantidade de ${color} no tamanho ${sz}`}
                                          />
                                        </td>
                                      );
                                    })}
                                    <td className="py-2.5 px-4 text-right font-bold text-sm text-foreground">
                                      {rowTotal}
                                    </td>
                                    <td className="py-2.5 px-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMatrixColor(color)}
                                        className="size-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                        title={`Remover linha ${color}`}
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-secondary/30 border-t border-border/60 text-xs">
                                <td className="py-3 px-4 text-muted-foreground font-medium">
                                  Total por tamanho
                                </td>
                                {activeMatrixSizes.map((sz) => {
                                  const colTotal = matrixColors.reduce((acc, color) => acc + getMatrixQty(color, sz), 0);
                                  return (
                                    <td key={sz} className="py-3 px-2 text-center font-bold text-foreground">
                                      {colTotal}
                                    </td>
                                  );
                                })}
                                <td className="py-3 px-4 text-right font-black text-sm text-foreground">
                                  {actualLotUnits}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {/* Barra de ação inferior (Padrão Vértice Imagem 2) */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 px-0.5">
                        <div className="flex items-center gap-2">
                          <Input
                            value={newMatrixColorInput}
                            onChange={(e) => setNewMatrixColorInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddMatrixColor(newMatrixColorInput);
                                setNewMatrixColorInput("");
                              }
                            }}
                            placeholder="Nova cor (ex: Terracota)..."
                            className="h-9 w-48 rounded-xl text-xs bg-card border-border/80 shadow-2xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              handleAddMatrixColor(newMatrixColorInput);
                              setNewMatrixColorInput("");
                            }}
                            disabled={!newMatrixColorInput.trim()}
                            className="h-9 rounded-xl px-3 text-xs font-semibold text-primary border-primary/40 hover:bg-primary/5 cursor-pointer disabled:opacity-40"
                          >
                            <Plus className="size-3.5 mr-1" />
                            Adicionar cor
                          </Button>
                        </div>

                        <span className="text-xs font-bold text-foreground">
                          {actualLotUnits} {actualLotUnits === 1 ? "peça no lote" : "peças no lote"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border/70 bg-secondary/20 p-6 text-center space-y-3">
                      <Boxes className="size-8 text-muted-foreground mx-auto" />
                      <p className="text-xs font-bold text-foreground">
                        Adicione cores e selecione tamanhos acima para abrir a matriz de grade
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            handleAddMatrixColor("Off-White");
                            handleAddMatrixColor("Preto");
                            applyModelQuickPreset(SIZE_FAMILIES[0]!.sizes);
                          }}
                          className="rounded-xl gradient-primary text-xs font-bold shadow-glow"
                        >
                          <Sparkles className="size-3.5 mr-1.5" />
                          Iniciar com Grade Clássica (Off-White + Preto, P ao GG)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : variants.length > 0 ? (
                <div className="rounded-xl border border-border/80 bg-secondary/20 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <div className="min-w-[760px]">
                      {/* Cabeçalho da Tabela */}
                      <div className="grid grid-cols-[140px_60px_60px_1fr_1fr_1.1fr_1fr_1.1fr_36px] items-center gap-2.5 px-3.5 py-2.5 bg-secondary/60 text-[10px] font-semibold text-muted-foreground border-b border-border/60">
                        <span>Cor</span>
                        <span>Tam.</span>
                        <span>Qtd.</span>
                        <span>Custo atacado</span>
                        <span>Custo real</span>
                        <span>Preço de venda</span>
                        <span>Margem real</span>
                        <span className="text-right">Lucro líquido</span>
                        <span className="text-center"></span>
                      </div>

                      {/* Linhas de Cada Variante */}
                      <div className="divide-y divide-border/50 bg-card">
                        {displayedVariants.map((v) => (
                          <div
                            key={v.id}
                            className="grid grid-cols-[140px_60px_60px_1fr_1fr_1.1fr_1fr_1.1fr_36px] items-center gap-2.5 px-3.5 py-2.5 text-xs hover:bg-secondary/20 transition-colors"
                          >
                            <div>
                              <VariantColorPicker
                                color={v.color}
                                onChange={(newCol) => updateVariantColor(v.id, newCol)}
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="size-6 flex items-center justify-center rounded-lg bg-secondary font-bold text-foreground text-xs shadow-xs">
                                {v.size}
                              </span>
                              <button
                                type="button"
                                onClick={() => duplicateVariant(v)}
                                className="size-5 rounded-md flex items-center justify-center text-primary bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all cursor-pointer"
                                title={`Adicionar outra cor para o tamanho ${v.size}`}
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>

                            <div>
                              <input
                                inputMode="numeric"
                                value={v.qty ?? 1}
                                onChange={(e) => updateVariantQty(v.id, Number(e.target.value) || 1)}
                                className="h-7 w-12 rounded-md border border-border bg-secondary/40 px-1.5 text-center text-xs font-bold text-foreground outline-none focus:border-primary focus:bg-card shadow-2xs"
                                title="Quantidade desta variante no lote"
                              />
                            </div>

                            <div>
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-muted-foreground select-none">R$</span>
                                <input
                                  inputMode="decimal"
                                  value={v.wholesaleCost}
                                  onChange={(e) => updateVariantCost(v.id, e.target.value)}
                                  placeholder={baseWholesaleGrade || "0,00"}
                                  className={cn(
                                    "h-7 w-20 rounded-md border px-2 text-right text-xs font-semibold outline-none focus:border-primary focus:bg-card shadow-2xs transition-colors",
                                    v.wholesaleCost !== "" && baseWholesaleGrade !== "" && v.wholesaleCost !== baseWholesaleGrade
                                      ? "border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                                      : "border-border bg-secondary/40 text-foreground"
                                  )}
                                />
                              </div>
                            </div>

                            <div className="numeric text-muted-foreground font-medium text-xs">
                              {brl(v.realCost)}
                            </div>

                            <div>
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-muted-foreground">R$</span>
                                <input
                                  inputMode="decimal"
                                  value={v.customSalePrice !== "" ? v.customSalePrice : (v.suggestedPrice > 0 ? v.suggestedPrice.toFixed(2).replace(".", ",") : "")}
                                  onChange={(e) => updateVariantPrice(v.id, e.target.value)}
                                  placeholder={v.suggestedPrice > 0 ? v.suggestedPrice.toFixed(2).replace(".", ",") : "0,00"}
                                  className="h-7 w-20 rounded-md border border-primary/30 bg-secondary/30 px-2 text-right text-xs font-bold text-primary outline-none focus:border-primary focus:bg-card shadow-2xs"
                                />
                              </div>
                            </div>

                            <div>
                              <span className={cn("numeric font-bold text-xs", v.marginHealth.color)}>
                                {pct(v.marginOnPrice)}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className={cn("numeric font-bold text-xs inline-flex items-center gap-1", v.profit >= 0 ? "text-success" : "text-destructive")}>
                                <span>{v.marginHealth.emoji}</span>
                                <span>+{brl(v.profit)}</span>
                              </span>
                            </div>

                            <div className="text-center">
                              <button
                                type="button"
                                onClick={() => deleteVariantRow(v.id)}
                                className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                title="Remover esta variação"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Botões de Adicionar */}
                      <div className="p-2.5 bg-card border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                        <AddVariantPopover
                          defaultColor={variants[0]?.color || "Off-White"}
                          baseWholesale={baseWholesaleGrade}
                          onAdd={handleAddNewVariant}
                        />
                        <ReplicateGradeColorPicker onSelectColor={replicateGradeInColor} />
                      </div>

                      {/* Rodapé / Totais */}
                      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3 bg-secondary/40 border-t border-border/60 text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Totais da grade:</span>
                          <Badge variant="secondary" className="font-bold">
                            {actualLotUnits} {actualLotUnits === 1 ? "peça" : "peças"}
                          </Badge>
                          <span className="text-muted-foreground hidden sm:inline">
                            ({Array.from(new Set(variants.map((v) => v.color))).length} {Array.from(new Set(variants.map((v) => v.color))).length === 1 ? "cor" : "cores"} · {activeModelSizes.size} {activeModelSizes.size === 1 ? "tamanho" : "tamanhos"})
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            Faturamento estimado: <strong className="text-foreground font-bold">{brl(summaryPrices.totalRevenue)}</strong>
                          </span>
                          <span className="text-muted-foreground">
                            Lucro líquido total: <strong className="text-success font-bold">+{brl(summaryPrices.totalProfit)}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Boxes className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-foreground">
                          Grade pronta para montagem
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          Escolha um preset rápido ou clique nos tamanhos acima para montar o lote.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => applyModelQuickPreset(SIZE_FAMILIES[0]!.sizes)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl gradient-primary text-xs font-bold text-white shadow-glow hover:opacity-95 transition-all cursor-pointer active:scale-95"
                      >
                        <Plus className="size-3.5" />
                        <span>Grade P ao GG</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyModelQuickPreset(SIZE_FAMILIES[1]!.sizes)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/80 bg-card text-xs font-semibold text-foreground hover:bg-secondary/60 transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Plus className="size-3.5" />
                        <span>34 ao 50</span>
                      </button>
                      <AddVariantPopover
                        defaultColor="Off-White"
                        baseWholesale={baseWholesaleGrade}
                        onAdd={handleAddNewVariant}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Rodapé da Etapa 1: Ação de Continuidade (Padrão Apple / Polaris) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {actualLotUnits} {actualLotUnits === 1 ? "peça configurada" : "peças configuradas"}
                  </span>
                  <span>·</span>
                  <span>{matrixColors.length} {matrixColors.length === 1 ? "cor" : "cores"}</span>
                  <span>·</span>
                  <span>{matrixSizes.length} {matrixSizes.length === 1 ? "tamanho" : "tamanhos"}</span>
                </div>

                <Button
                  type="button"
                  onClick={() => setGradeStep(2)}
                  disabled={actualLotUnits === 0 && !name.trim()}
                  className="h-11 px-6 rounded-xl font-bold gradient-primary shadow-glow cursor-pointer text-xs sm:text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <span>Avançar para Custos &amp; Preço</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>

            </section>
            )}

            {/* ── ETAPA 2 & 3: CUSTOS, FORMAÇÃO DO PREÇO E FECHAMENTO ── */}
            {(() => {
              const freightVal = resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1);
              const packagingVal = resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1);
              const otherVal = resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1);
              const totalSharedCost = freightVal + packagingVal + otherVal;

                // Priority: grade average → first variant → wholesale field (Passo 1) → 0
                const baseCost = toNumber(baseWholesaleGrade) > 0
                  ? toNumber(baseWholesaleGrade)
                  : (variants.length > 0 && variants[0] && toNumber(variants[0].wholesaleCost) > 0
                    ? toNumber(variants[0].wholesaleCost)
                    : toNumber(wholesale));

                const totalUnitCost = baseCost + totalSharedCost;
                const freightPct = totalSharedCost > 0 ? (freightVal / totalSharedCost) * 100 : 0;
                const packagingPct = totalSharedCost > 0 ? (packagingVal / totalSharedCost) * 100 : 0;
                const otherPct = totalSharedCost > 0 ? (otherVal / totalSharedCost) * 100 : 0;

                // Live preview calculation for the single piece under current strategy
                let previewPrice = 0;
                let previewProfit = 0;
                let previewMargin = 0;

                const taxFrac = tax / 100;
                const cardFrac = cardRate / 100;
                const totalDeductionsFrac = taxFrac + cardFrac;
                const hasValidWholesale = baseCost > 0 || matrixGlobalMode === "direct_price";

                if (hasValidWholesale && totalUnitCost > 0) {
                  if (matrixGlobalMode === "margin") {
                    const m = toNumber(matrixGlobalMarginStr) || 50;
                    const div = 1 - (totalDeductionsFrac + m / 100);
                    previewPrice = div > 0.05 ? totalUnitCost / div : 0;
                    previewMargin = m;
                    previewProfit = previewPrice > 0 ? previewPrice * (1 - totalDeductionsFrac) - totalUnitCost : 0;
                  } else if (matrixGlobalMode === "markup") {
                    const mk = toNumber(matrixGlobalMarkupStr) || 100;
                    const base = totalUnitCost * (1 + mk / 100);
                    const div = 1 - totalDeductionsFrac;
                    previewPrice = div > 0.05 ? base / div : 0;
                    previewProfit = previewPrice > 0 ? previewPrice * (1 - totalDeductionsFrac) - totalUnitCost : 0;
                    previewMargin = previewPrice > 0 ? (previewProfit / previewPrice) * 100 : 0;
                  } else {
                    previewPrice = toNumber(matrixGlobalDirectPrice);
                    previewProfit = previewPrice > 0 ? previewPrice * (1 - totalDeductionsFrac) - totalUnitCost : 0;
                    previewMargin = previewPrice > 0 ? (previewProfit / previewPrice) * 100 : 0;
                  }
                }

                const renderInlineRateio = (target: "freight" | "packaging" | "other", targetLabel: string) => {
                  if (rateioTarget !== target) return null;
                  return (
                    <div className="mt-2.5 rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-2.5 animate-in fade-in-50 duration-200 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="size-5 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                            <Calculator className="size-3 text-primary" />
                          </div>
                          <span className="text-xs font-bold text-primary">
                            Assistente: Dividir {targetLabel}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setRateioTarget(null)}
                          className="size-6 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all text-xs cursor-pointer"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-[1fr_1fr_auto] items-end">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-muted-foreground">Valor Total na Nota</Label>
                          <div className="relative flex items-center rounded-lg border border-border/80 bg-card shadow-2xs focus-within:border-primary">
                            <span className="pl-2.5 text-xs font-bold text-muted-foreground select-none">R$</span>
                            <input
                              inputMode="decimal"
                              value={rateioTotal}
                              onChange={(e) => setRateioTotal(e.target.value)}
                              placeholder="120,00"
                              className="h-8 w-full bg-transparent px-2 text-xs font-bold text-foreground outline-none"
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-semibold text-muted-foreground">Total de Peças</Label>
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
                          <div className="relative flex items-center rounded-lg border border-border/80 bg-card shadow-2xs focus-within:border-primary">
                            <input
                              inputMode="numeric"
                              value={rateioPieces}
                              onChange={(e) => setRateioPieces(e.target.value)}
                              placeholder={actualLotUnits > 0 ? String(actualLotUnits) : "20"}
                              className="h-8 w-full bg-transparent px-2.5 text-xs font-bold text-foreground outline-none"
                            />
                            <span className="pr-2.5 text-[10px] font-semibold text-muted-foreground select-none">un.</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={applyRateio}
                          disabled={!toNumber(rateioTotal) || !Number(rateioPieces)}
                          className="h-8 rounded-lg gradient-primary text-xs font-bold shadow-glow shrink-0 cursor-pointer active:scale-95 transition-all"
                        >
                          {toNumber(rateioTotal) > 0 && Number(rateioPieces) > 0 ? (
                            <>Aplicar {brl(toNumber(rateioTotal) / Math.max(1, Number(rateioPieces)))} / un.</>
                          ) : (
                            <>Aplicar</>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {gradeStep === 2 && (
                      <section className="panel p-6 sm:p-7 space-y-6">
                        {/* Cabeçalho da Etapa 2 */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                          <div className="flex items-center gap-3">
                            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                              2
                            </span>
                            <div>
                              <h2 className="text-sm font-bold text-foreground">
                                Custos operacionais e formação do preço
                              </h2>
                              <p className="text-xs text-muted-foreground">
                                Despesas de transporte, embalagem, extras e taxas rateadas com inteligência sobre a grade ({actualLotUnits} un.)
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {actualLotUnits > 0 && (
                              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold">
                                Rateio ativo para {actualLotUnits} peças
                              </Badge>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setGradeStep(1)}
                              className="h-8 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                            >
                              <ArrowLeft className="size-3.5" />
                              <span>Voltar à Grade</span>
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-8">
                    {/* ── SEÇÃO 1: COMPOSIÇÃO DE CUSTO DA PEÇA ── */}
                    <div className="space-y-5">
                      {/* Cabeçalho da Lista Contábil */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/50">
                        <div>
                          <h3 className="text-base font-bold text-foreground">
                            Composição do Custo da Peça
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Do atacado ao estoque pronto para venda (frete, embalagem e extras rateados)
                          </p>
                        </div>
                        <span className="rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-xs font-extrabold text-primary shrink-0 shadow-2xs">
                          Custo real: {brl(totalUnitCost)} / peça
                        </span>
                      </div>

                      {/* Lista Contábil Nobre e Fluida */}
                      <div className="divide-y divide-border/50 rounded-2xl border border-border/60 bg-secondary/10 overflow-hidden">
                        {/* Linha 1: Custo no Atacado (Base) */}
                        <div className="flex items-center justify-between p-3.5 sm:px-4 transition-colors hover:bg-secondary/20">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Tag className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-bold text-foreground block">
                                Custo no Atacado (fornecedor)
                              </span>
                              <span className="text-[11px] text-muted-foreground block -mt-0.5">
                                Preço médio de compra por peça definido na grade do Passo 1
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-end shrink-0">
                            <span className="inline-flex h-9 min-w-28 items-center justify-end rounded-xl border border-border/60 bg-card px-3 numeric text-sm font-extrabold text-foreground shadow-2xs">
                              {brl(baseCost)}
                            </span>
                          </div>
                        </div>

                          {/* Linha 2: Frete por Peça */}
                          <div className="p-3.5 sm:px-4 transition-colors hover:bg-secondary/20 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                  <Truck className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs sm:text-sm font-bold text-foreground block">
                                    Frete de entrega
                                  </span>
                                  <span className="text-[11px] text-muted-foreground block -mt-0.5">
                                    Rateado automaticamente por peça no lote
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <Select value={freightMode} onValueChange={(v) => setFreightMode(v as "per_unit" | "lot_total")}>
                                  <SelectTrigger className="h-9 w-28 text-xs font-semibold rounded-xl border border-border/80 bg-card shadow-2xs">
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
                                      "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border",
                                      rateioTarget === "freight"
                                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                        : "border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary",
                                    )}
                                    title="Assistente com calculadora de nota fiscal"
                                  >
                                    <Calculator className="size-3" />
                                  </button>
                                  <div className="relative flex h-9 w-28 items-center shrink-0 rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                    <span className="pl-2.5 text-xs font-bold text-muted-foreground select-none">R$</span>
                                    <input
                                      inputMode="decimal"
                                      value={freight}
                                      onChange={(e) => setFreight(e.target.value)}
                                      placeholder="0,00"
                                      className="h-9 w-full bg-transparent px-2 text-xs font-bold text-foreground outline-none text-right pr-2.5"
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

                            {/* Linha 3: Embalagem & Tag */}
                            <div className="p-3.5 sm:px-4 transition-colors hover:bg-secondary/20 space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <Package className="size-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs sm:text-sm font-bold text-foreground block">
                                      Embalagem &amp; Tag
                                    </span>
                                    <span className="text-[11px] text-muted-foreground block -mt-0.5">
                                      Sacola, papel de seda, etiqueta e lacre
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Select value={packagingMode} onValueChange={(v) => setPackagingMode(v as "per_unit" | "lot_total")}>
                                    <SelectTrigger className="h-9 w-28 text-xs font-semibold rounded-xl border border-border/80 bg-card shadow-2xs">
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
                                      "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border",
                                      rateioTarget === "packaging"
                                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                        : "border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary",
                                    )}
                                    title="Assistente com calculadora de nota fiscal"
                                  >
                                    <Calculator className="size-3" />
                                  </button>
                                  <div className="relative flex h-9 w-28 items-center shrink-0 rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                    <span className="pl-2.5 text-xs font-bold text-muted-foreground select-none">R$</span>
                                    <input
                                      inputMode="decimal"
                                      value={packaging}
                                      onChange={(e) => setPackaging(e.target.value)}
                                      placeholder="0,00"
                                      className="h-9 w-full bg-transparent px-2 text-xs font-bold text-foreground outline-none text-right pr-2.5"
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

                            {/* Linha 4: Outros Custos Operacionais */}
                            <div className="p-3.5 sm:px-4 transition-colors hover:bg-secondary/20 space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                    <Coins className="size-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs sm:text-sm font-bold text-foreground block">
                                      Extras operacionais
                                    </span>
                                    <span className="text-[11px] text-muted-foreground block -mt-0.5">
                                      Costura, ajustes, fotos ou perdas operacionais
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Select value={otherMode} onValueChange={(v) => setOtherMode(v as "per_unit" | "lot_total")}>
                                    <SelectTrigger className="h-9 w-28 text-xs font-semibold rounded-xl border border-border/80 bg-card shadow-2xs">
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
                                      "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border",
                                      rateioTarget === "other"
                                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                        : "border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary",
                                    )}
                                    title="Assistente com calculadora de nota fiscal"
                                  >
                                    <Calculator className="size-3" />
                                  </button>
                                  <div className="relative flex h-9 w-28 items-center shrink-0 rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                    <span className="pl-2.5 text-xs font-bold text-muted-foreground select-none">R$</span>
                                    <input
                                      inputMode="decimal"
                                      value={other}
                                      onChange={(e) => setOther(e.target.value)}
                                      placeholder="0,00"
                                      className="h-9 w-full bg-transparent px-2 text-xs font-bold text-foreground outline-none text-right pr-2.5"
                                    />
                                  </div>
                                </div>
                              </div>
                              {otherMode === "lot_total" && toNumber(other) > 0 && actualLotUnits > 1 && (
                                <p className="text-[11px] text-primary font-medium text-right mt-1">
                                  ≈ {brl(toNumber(other) / actualLotUnits)} / peça ({actualLotUnits} un.)
                                </p>
                              )}
                              {renderInlineRateio("other", "Gastos Extras")}
                            </div>

                          {/* Linha de Síntese de Custo — Limpa e Legível */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 px-1 text-xs text-muted-foreground border-t border-border/40">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="size-2 rounded-full bg-primary/60 shrink-0" />
                              Atacado {baseCost > 0 ? brl(baseCost) : "—"}
                            </span>
                            {totalSharedCost > 0 && (
                              <span className="font-semibold text-foreground">
                                +{brl(totalSharedCost)} custos adicionais rateados
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Deduções da Venda: Síntese Compacta com Popover Progressivo (Apple HIG / Polaris) */}
                        <div className="pt-4 border-t border-border/60">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-border/70 bg-card shadow-2xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="size-8 sm:size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <CreditCard className="size-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs sm:text-sm font-bold text-foreground">
                                    Deduções da Venda
                                  </span>
                                  <Badge variant="secondary" className="font-bold text-[11px] px-2 py-0.5">
                                    {(tax + cardRate).toFixed(1).replace(".", ",")}% total
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  DAS ({tax.toFixed(1).replace(".", ",")}%) + Cartão ({cardRate.toFixed(1).replace(".", ",")}%)
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 sm:h-9 px-3 rounded-xl text-xs font-bold border-border/80 bg-background hover:bg-secondary/60 shadow-2xs cursor-pointer flex items-center gap-1.5"
                                  >
                                    <SlidersHorizontal className="size-3.5 text-primary" />
                                    <span>Ajustar Taxas</span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 sm:w-96 p-4 space-y-4 rounded-2xl shadow-lift" align="end">
                                  <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                                    <div>
                                      <h4 className="text-xs font-bold text-foreground">Deduções sobre a Venda</h4>
                                      <p className="text-[10px] text-muted-foreground">Configuração de impostos e taxas financeiras</p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      asChild
                                      className="h-7 px-2 text-[11px] font-semibold text-primary"
                                    >
                                      <Link to="/configuracoes" search={{ tab: "caixa" }}>
                                        <span>Padrões</span>
                                        <ArrowUpRight className="size-3 ml-0.5 opacity-60" />
                                      </Link>
                                    </Button>
                                  </div>

                                  {/* DAS */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-foreground">Imposto DAS</span>
                                      <div className="inline-flex items-center rounded-xl border border-border/80 bg-background p-0.5 shadow-2xs">
                                        <button
                                          type="button"
                                          disabled={tax <= 0}
                                          onClick={() => setTax(Math.max(0, Math.round(tax) - 1))}
                                          className="size-6 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary active:scale-90"
                                        >
                                          <Minus className="size-3" />
                                        </button>
                                        <input
                                          inputMode="decimal"
                                          value={String(tax).replace(".", ",")}
                                          onChange={(e) => {
                                            const val = e.target.value.replace(",", ".");
                                            if (/^\d*(\.\d*)?$/.test(val)) setTax(Number(val) || 0);
                                          }}
                                          className="w-10 text-center text-xs font-bold text-primary outline-none bg-transparent"
                                        />
                                        <span className="text-[10px] font-bold text-muted-foreground pr-1">%</span>
                                        <button
                                          type="button"
                                          disabled={tax >= 25}
                                          onClick={() => setTax(Math.min(25, Math.round(tax) + 1))}
                                          className="size-6 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary active:scale-90"
                                        >
                                          <Plus className="size-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {[
                                        { label: "MEI 0%", v: pricingSettings.taxPresets?.mei ?? 0 },
                                        { label: "F1 4%", v: pricingSettings.taxPresets?.simplesF1 ?? 4 },
                                        { label: "F2 7%", v: pricingSettings.taxPresets?.simplesF2 ?? 7 },
                                      ].map((p) => (
                                        <button
                                          key={p.label}
                                          type="button"
                                          onClick={() => setTax(p.v)}
                                          className={cn(
                                            "flex-1 rounded-lg py-1 text-xs font-semibold border transition-all cursor-pointer",
                                            tax === p.v ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs" : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
                                          )}
                                        >
                                          {p.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Taxa Cartão */}
                                  <div className="space-y-2 pt-2 border-t border-border/50">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-foreground">Taxa Cartão / Pix</span>
                                      <div className="inline-flex items-center rounded-xl border border-border/80 bg-background p-0.5 shadow-2xs">
                                        <button
                                          type="button"
                                          disabled={cardRate <= 0}
                                          onClick={() => setCardRate(Math.max(0, Number((cardRate - 0.5).toFixed(1))))}
                                          className="size-6 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary active:scale-90"
                                        >
                                          <Minus className="size-3" />
                                        </button>
                                        <input
                                          inputMode="decimal"
                                          value={String(cardRate).replace(".", ",")}
                                          onChange={(e) => {
                                            const val = e.target.value.replace(",", ".");
                                            if (/^\d*(\.\d*)?$/.test(val)) setCardRate(Number(val) || 0);
                                          }}
                                          className="w-10 text-center text-xs font-bold text-primary outline-none bg-transparent"
                                        />
                                        <span className="text-[10px] font-bold text-muted-foreground pr-1">%</span>
                                        <button
                                          type="button"
                                          disabled={cardRate >= 15}
                                          onClick={() => setCardRate(Math.min(15, Number((cardRate + 0.5).toFixed(1))))}
                                          className="size-6 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary active:scale-90"
                                        >
                                          <Plus className="size-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {[
                                        { label: "Pix 0,9%", v: pricingSettings.cardRates?.pix ?? 0.9 },
                                        { label: "Déb 1,5%", v: pricingSettings.cardRates?.debito ?? 1.5 },
                                        { label: "Créd 3,2%", v: pricingSettings.cardRates?.credito1x ?? 3.2 },
                                      ].map((p) => (
                                        <button
                                          key={p.label}
                                          type="button"
                                          onClick={() => setCardRate(p.v)}
                                          className={cn(
                                            "flex-1 rounded-lg py-1 text-xs font-semibold border transition-all cursor-pointer",
                                            cardRate === p.v ? "bg-primary text-primary-foreground font-bold border-primary shadow-xs" : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
                                          )}
                                        >
                                          {p.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── SEÇÃO 2: CENTRO DE COMANDO COMERCIAL & ESTRATÉGIA DE PRECIFICAÇÃO ── */}
                      <div className="pt-6 border-t border-border/60 space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-base font-bold text-foreground">
                              Estratégia de Precificação da Grade
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Defina sua meta comercial para formar o preço de venda sugerido de cada peça
                            </p>
                          </div>
                        </div>

                        {/* Segmented Control Apple: Margem / Markup / Preço Fixo */}
                        <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-border/80 bg-secondary/30 p-1.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setMatrixGlobalMode("margin")}
                              className={cn(
                                "flex items-center justify-center gap-2 rounded-xl py-2 px-2 text-xs font-bold transition-all cursor-pointer",
                                matrixGlobalMode === "margin"
                                  ? "bg-card text-foreground shadow-xs"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <Target className="size-4 shrink-0 text-primary" />
                              <span>Margem (%)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setMatrixGlobalMode("markup")}
                              className={cn(
                                "flex items-center justify-center gap-2 rounded-xl py-2 px-2 text-xs font-bold transition-all cursor-pointer",
                                matrixGlobalMode === "markup"
                                  ? "bg-card text-foreground shadow-xs"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <TrendingUp className="size-4 shrink-0 text-primary" />
                              <span>Markup (×)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setMatrixGlobalMode("direct_price")}
                              className={cn(
                                "flex items-center justify-center gap-2 rounded-xl py-2 px-2 text-xs font-bold transition-all cursor-pointer",
                                matrixGlobalMode === "direct_price"
                                  ? "bg-card text-foreground shadow-xs"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <Coins className="size-4 shrink-0 text-primary" />
                              <span>Preço Fixo</span>
                            </button>
                          </div>

                          {/* Controles por Modo de Estratégia */}
                          {matrixGlobalMode === "margin" && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Meta de margem líquida no bolso:
                                </span>
                                <div className="inline-flex items-center rounded-xl border border-border/80 bg-background p-1 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = toNumber(matrixGlobalMarginStr) || 50;
                                      setMatrixGlobalMarginStr(String(Math.max(1, Math.round(cur) - 1)));
                                    }}
                                    className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all cursor-pointer"
                                    title="−1%"
                                  >
                                    <Minus className="size-3.5" />
                                  </button>
                                  <div className="flex items-center px-2.5">
                                    <input
                                      inputMode="decimal"
                                      value={matrixGlobalMarginStr}
                                      onChange={(e) => { if (/^[\d,.]*$/.test(e.target.value)) setMatrixGlobalMarginStr(e.target.value); }}
                                      className="w-10 text-center text-sm font-bold outline-none bg-transparent text-primary"
                                    />
                                    <span className="text-xs font-bold text-muted-foreground">%</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = toNumber(matrixGlobalMarginStr) || 50;
                                      setMatrixGlobalMarginStr(String(Math.min(85, Math.round(cur) + 1)));
                                    }}
                                    className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all cursor-pointer"
                                    title="+1%"
                                  >
                                    <Plus className="size-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-5 gap-2">
                                {[30, 40, 50, 60, 70].map((mv) => (
                                  <button
                                    key={mv}
                                    type="button"
                                    onClick={() => setMatrixGlobalMarginStr(String(mv))}
                                    className={cn(
                                      "h-10 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                                      toNumber(matrixGlobalMarginStr) === mv
                                        ? "bg-primary text-primary-foreground shadow-xs border-primary"
                                        : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary",
                                    )}
                                  >
                                    {mv}%
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {matrixGlobalMode === "markup" && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Multiplicador sobre o custo:
                                </span>
                                <div className="inline-flex items-center rounded-xl border border-border/80 bg-background p-1 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = toNumber(matrixGlobalMarkupStr) || 100;
                                      setMatrixGlobalMarkupStr(String(Math.max(1, Math.round(cur) - 5)));
                                    }}
                                    className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all cursor-pointer"
                                    title="−5%"
                                  >
                                    <Minus className="size-3.5" />
                                  </button>
                                  <div className="flex items-center px-2.5">
                                    <input
                                      inputMode="decimal"
                                      value={matrixGlobalMarkupStr}
                                      onChange={(e) => { if (/^[\d,.]*$/.test(e.target.value)) setMatrixGlobalMarkupStr(e.target.value); }}
                                      className="w-12 text-center text-sm font-bold outline-none bg-transparent text-primary"
                                    />
                                    <span className="text-xs font-bold text-muted-foreground">%</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = toNumber(matrixGlobalMarkupStr) || 100;
                                      setMatrixGlobalMarkupStr(String(Math.min(300, Math.round(cur) + 5)));
                                    }}
                                    className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all cursor-pointer"
                                    title="+5%"
                                  >
                                    <Plus className="size-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-5 gap-2">
                                {[60, 80, 100, 120, 150].map((mk) => (
                                  <button
                                    key={mk}
                                    type="button"
                                    onClick={() => setMatrixGlobalMarkupStr(String(mk))}
                                    className={cn(
                                      "h-10 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                                      toNumber(matrixGlobalMarkupStr) === mk
                                        ? "bg-primary text-primary-foreground shadow-xs border-primary"
                                        : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary",
                                    )}
                                  >
                                    {mk}%
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {matrixGlobalMode === "direct_price" && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  Preço de venda direto:
                                </span>
                                <div className="relative flex items-center rounded-xl border border-border/80 bg-background px-3 py-1.5 shadow-2xs">
                                  <span className="text-xs text-muted-foreground mr-1.5 font-semibold">R$</span>
                                  <input
                                    inputMode="decimal"
                                    value={matrixGlobalDirectPrice}
                                    onChange={(e) => setMatrixGlobalDirectPrice(e.target.value)}
                                    placeholder="139,90"
                                    className="w-24 text-center text-sm font-bold outline-none bg-transparent text-primary"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                {[",90", ",00", ",50"].map((ending) => (
                                  <button
                                    key={ending}
                                    type="button"
                                    onClick={() => {
                                      const current = matrixGlobalDirectPrice || "139,90";
                                      const integerPart = Math.floor(toNumber(current));
                                      setMatrixGlobalDirectPrice(`${integerPart}${ending}`);
                                    }}
                                    className="h-10 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground bg-secondary/40 border border-border/60 hover:bg-secondary transition-all cursor-pointer"
                                  >
                                    Final {ending}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Feedback Inline de Simulação por Peça */}
                        {previewPrice > 0 ? (
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/5 border border-primary/20 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Sparkles className="size-4 text-primary shrink-0" />
                              <span className="text-xs text-muted-foreground">
                                Preço projetado por peça: <strong className="text-foreground font-bold">{brl(previewPrice)}</strong>
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                              +{brl(previewProfit)} lucro líquido ({Math.round(previewMargin)}%)
                            </span>
                          </div>
                        ) : (
                          <div className="rounded-xl bg-secondary/30 border border-border/50 px-3.5 py-2.5 text-xs text-muted-foreground">
                            {baseCost <= 0 ? "Informe o custo de atacado para visualizar a projeção de preço e lucro por peça." : "Ajuste os parâmetros acima para simular a formação de preço."}
                          </div>
                        )}

                        {/* Alerta de Desatualização (Financial Trust) */}
                        {isStale && (
                          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                              <span>Custo base ou parâmetros foram alterados após a última aplicação.</span>
                            </div>
                            <button
                              type="button"
                              onClick={applyStrategyToModel}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 text-amber-950 font-bold hover:bg-amber-400 transition-colors shrink-0 text-xs cursor-pointer shadow-xs"
                            >
                              Reaplicar preços
                            </button>
                          </div>
                        )}

                        {/* 3. BOTÃO DE AÇÃO MESTRE */}
                        <div className="pt-1">
                          <Button
                            type="button"
                            onClick={applyStrategyToModel}
                            disabled={actualLotUnits === 0}
                            className="h-12 rounded-2xl w-full text-xs sm:text-sm font-bold gradient-primary shadow-glow active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:shadow-none"
                          >
                            <Zap className="size-4 mr-2 shrink-0" />
                            <span>Aplicar a Toda a Grade{actualLotUnits > 0 ? ` (${actualLotUnits} variações)` : ""}</span>
                          </Button>
                        </div>

                        {/* Rodapé da Etapa 2: Navegação Conectada (Padrão Apple HIG / Polaris) */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setGradeStep(1)}
                            className="h-11 px-4 rounded-xl font-semibold border-border/80 bg-background hover:bg-secondary/60 cursor-pointer text-xs flex items-center gap-1.5"
                          >
                            <ArrowLeft className="size-4" />
                            <span>Voltar para Grade</span>
                          </Button>

                          <Button
                            type="button"
                            onClick={() => setGradeStep(3)}
                            className="h-11 px-6 rounded-xl font-bold gradient-primary shadow-glow cursor-pointer text-xs sm:text-sm flex items-center gap-2"
                          >
                            <span>Avançar para Revisão &amp; Lote</span>
                            <ArrowRight className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* ── ETAPA 3: REVISÃO CONSOLIDADA DO LOTE & ENTRADA NO ESTOQUE ── */}
                {gradeStep === 3 && (
                  <section className="panel p-6 sm:p-7 space-y-6">
                    {/* Cabeçalho da Etapa 3 */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                          3
                        </span>
                        <div>
                          <h2 className="text-sm font-bold text-foreground">
                            Revisão consolidada do lote e entrada no estoque
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            Confira a projeção financeira, faturamento total, lucro e ponto de equilíbrio antes de confirmar.
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setGradeStep(2)}
                        className="h-8 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="size-3.5" />
                        <span>Voltar aos Custos</span>
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {actualLotUnits === 0 ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="size-11 rounded-2xl bg-secondary/80 text-muted-foreground flex items-center justify-center shrink-0 border border-border/60">
                              <Boxes className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground">
                                Grade aguardando preenchimento no Passo 1
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Adicione quantidades e tamanhos na grade para projetar o faturamento total, investimento e lucro líquido do lote aqui.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={resetPricingModel}
                              className="h-10 rounded-xl text-xs font-semibold border-border/80 bg-background hover:bg-secondary/60 cursor-pointer flex items-center justify-center gap-1.5 px-4 transition-all"
                              title="Limpar campos e precificar outro modelo"
                            >
                              <RotateCcw className="size-3.5" />
                              <span>Resetar grade</span>
                            </Button>
                            <Button
                              type="button"
                              disabled
                              className="h-10 rounded-xl bg-muted text-muted-foreground font-semibold flex items-center justify-center gap-2 px-5 text-xs opacity-60 cursor-not-allowed"
                            >
                              <PackagePlus className="size-4" />
                              <span>Dar entrada no estoque (0 un.)</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Cabeçalho do Fechamento Ativo */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
                            <div className="flex items-center gap-2.5">
                              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                <TrendingUp className="size-4" />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-foreground">
                                  Projeção Financeira Consolidada do Lote
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Resultado financeiro previsto para a venda das {actualLotUnits} peças em estoque
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {lotBreakEven.unitsToBreakEven > 0 && (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-secondary/80 border border-border/70 text-foreground shadow-2xs">
                                  🎯 Quitado na <strong className="text-primary">{lotBreakEven.unitsToBreakEven}ª peça</strong>
                                </span>
                              )}
                              <span className={cn("px-3 py-1 rounded-full text-xs font-bold", summaryPrices.marginHealth.color, "bg-background border border-border/60 shadow-2xs")}>
                                {summaryPrices.marginHealth.emoji} {summaryPrices.marginHealth.label}
                              </span>
                            </div>
                          </div>

                          {/* 4 Cards de Métricas Estilo Air */}
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-2xl border border-border/70 bg-secondary/15 p-4 space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Faturamento Previsto
                              </span>
                              <div className="numeric text-2xl font-extrabold text-foreground">
                                {brl(summaryPrices.totalRevenue)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Média de <strong className="text-foreground">{brl(summaryPrices.avgSuggested)}</strong> / peça
                              </p>
                            </div>

                            <div className="rounded-2xl border border-border/70 bg-secondary/15 p-4 space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Custo Total do Lote
                              </span>
                              <div className="numeric text-2xl font-extrabold text-foreground">
                                {brl(summaryPrices.totalInvestment)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Investimento nas {actualLotUnits} peças
                              </p>
                            </div>

                            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                Sobra Líquida no Caixa
                              </span>
                              <div className="numeric text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                +{brl(summaryPrices.totalProfit)}
                              </div>
                              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                                Margem real de <strong className="text-emerald-700 dark:text-emerald-300">{pct(summaryPrices.avgMargin)}</strong>
                              </p>
                            </div>

                            <div className="rounded-2xl border border-border/70 bg-secondary/15 p-4 space-y-1">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Deduções (DAS + Taxas)
                              </span>
                              <div className="numeric text-2xl font-extrabold text-muted-foreground">
                                {brl(summaryPrices.totalRevenue * ((tax + cardRate) / 100))}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                DAS ({tax}%) + Cartão ({cardRate}%)
                              </p>
                            </div>
                          </div>

                          {/* Barra de Decomposição Contínua Fina e Elegante */}
                          {summaryPrices.totalRevenue > 0 && (() => {
                            const rev = summaryPrices.totalRevenue;
                            const costPct = (summaryPrices.totalInvestment / rev) * 100;
                            const taxPct = ((rev * (tax / 100)) / rev) * 100;
                            const cardPct = ((rev * (cardRate / 100)) / rev) * 100;
                            const profitPct = Math.max(0, 100 - costPct - taxPct - cardPct);

                            return (
                              <div className="space-y-2 pt-2 border-t border-border/40">
                                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary flex gap-0.5">
                                  <div style={{ width: `${costPct}%` }} className="h-full bg-slate-400 dark:bg-slate-500 transition-all duration-300" title={`Custos: ${Math.round(costPct)}%`} />
                                  <div style={{ width: `${taxPct}%` }} className="h-full bg-amber-500 transition-all duration-300" title={`DAS: ${Math.round(taxPct)}%`} />
                                  <div style={{ width: `${cardPct}%` }} className="h-full bg-blue-500 transition-all duration-300" title={`Cartão: ${Math.round(cardPct)}%`} />
                                  <div style={{ width: `${profitPct}%` }} className="h-full bg-emerald-500 transition-all duration-300" title={`Lucro: ${Math.round(profitPct)}%`} />
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-slate-400 shrink-0" />
                                    <span className="text-muted-foreground">Custo:</span>
                                    <span className="font-semibold text-foreground">{brl(summaryPrices.totalInvestment)} ({Math.round(costPct)}%)</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                                    <span className="text-muted-foreground">DAS:</span>
                                    <span className="font-semibold text-foreground">{brl(summaryPrices.totalRevenue * (tax / 100))} ({tax}%)</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                                    <span className="text-muted-foreground">Cartão:</span>
                                    <span className="font-semibold text-foreground">{brl(summaryPrices.totalRevenue * (cardRate / 100))} ({cardRate}%)</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="text-muted-foreground">Lucro Líquido:</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">+{brl(summaryPrices.totalProfit)} ({Math.round(profitPct)}%)</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Ponto de Equilíbrio */}
                          {lotBreakEven.unitsToBreakEven > 0 && (
                            <div className="rounded-2xl bg-secondary/30 border border-border/60 p-3.5 text-xs text-muted-foreground leading-relaxed">
                              🎯 Vendendo <strong className="text-foreground">{lotBreakEven.unitsToBreakEven} {lotBreakEven.unitsToBreakEven === 1 ? "peça" : "peças"}</strong> você quita todo o custo do lote ({brl(lotBreakEven.totalLotCost)}).{" "}
                              {lotBreakEven.totalLotProfit >= 0 ? (
                                Math.max(actualLotUnits - lotBreakEven.unitsToBreakEven, 0) > 0 ? (
                                  <>
                                    As outras <strong className="text-foreground">{Math.max(actualLotUnits - lotBreakEven.unitsToBreakEven, 0)} peças</strong> geram <strong className="text-emerald-600 dark:text-emerald-400 font-bold">+{brl(lotBreakEven.profitOnRemainder)}</strong> de puro lucro líquido no seu caixa.
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

                          {/* Barra de Ações Integrada */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/50">
                            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setResetAlertOpen(true)}
                                className="h-11 rounded-xl text-xs font-semibold border-border/80 bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer flex items-center justify-center gap-1.5 px-4 transition-all"
                                title="Limpar campos e precificar outro modelo"
                              >
                                <RotateCcw className="size-3.5" />
                                <span>Resetar grade</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => save.mutate()}
                                disabled={save.isPending || (actualLotUnits === 0 && !name.trim())}
                                className="h-11 rounded-xl text-xs font-semibold border-border/80 bg-background hover:bg-secondary/60 cursor-pointer flex items-center justify-center gap-1.5 px-4 transition-all disabled:opacity-50"
                                title={!name.trim() && actualLotUnits === 0 ? "Dê um nome para a peça antes de salvar" : "Salvar no histórico"}
                              >
                                <Save className="size-3.5" />
                                <span>Salvar no histórico</span>
                              </Button>
                            </div>

                            <div className="flex flex-col items-center sm:items-end w-full sm:w-auto">
                              <Button
                                type="button"
                                onClick={openEntryForCurrent}
                                disabled={actualLotUnits === 0 || summaryPrices.avgSuggested <= 0}
                                className="h-11 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-glow cursor-pointer flex items-center justify-center gap-2 px-6 transition-all active:scale-[0.98] text-xs sm:text-sm disabled:opacity-50 w-full sm:w-auto"
                              >
                                <PackagePlus className="size-4" />
                                <span>Dar entrada no estoque ({actualLotUnits} un.)</span>
                              </Button>
                              {actualLotUnits > 0 && (
                                <p className="text-[11px] text-muted-foreground text-center sm:text-right mt-1">
                                  {actualLotUnits} {actualLotUnits === 1 ? "peça" : "peças"} · {colorGroups.length} {colorGroups.length === 1 ? "variação será registrada" : "variações serão registradas"}
                                </p>
                              )}
                            </div>
                          </div>

                          <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed pt-2">
                            ⊙ Estimativa com as taxas informadas. Não representa orientação fiscal.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </>
            );
          })()}

          {/* Modal de Confirmação Segura para Resetar Grade (Financial Trust) */}
          <AlertDialog open={resetAlertOpen} onOpenChange={setResetAlertOpen}>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Resetar a grade completa?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todas as quantidades, tamanhos, cores e custos preenchidos deste modelo serão apagados. Tem certeza que deseja recomeçar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    resetPricingModel();
                    setGradeStep(1);
                  }}
                  className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, resetar grade
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </>
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

        {/* ── COLUNA DIREITA: Painel Sticky de Resumo ao Vivo (Padrão Vértice Imagem 5 / Shopify) ── */}
        {mode !== "historico" && (
          <div className="hidden lg:block sticky top-6 self-start">
            <LivePricingSummaryPanel
              name={name}
              category={category ? getCategoryLabel(storeCategories, category) : ""}
              photoUrl={entryPhotoUrl}
              baseWholesaleCost={
                mode === "grade"
                  ? toNumber(baseWholesaleGrade) > 0
                    ? toNumber(baseWholesaleGrade)
                    : variants[0] && toNumber(variants[0].wholesaleCost) > 0
                      ? toNumber(variants[0].wholesaleCost)
                      : toNumber(wholesale)
                  : toNumber(wholesale)
              }
              sharedCostsPerUnit={
                mode === "grade"
                  ? resolvePerUnit(freight, freightMode, actualLotUnits > 0 ? actualLotUnits : 1) +
                    resolvePerUnit(packaging, packagingMode, actualLotUnits > 0 ? actualLotUnits : 1) +
                    resolvePerUnit(other, otherMode, actualLotUnits > 0 ? actualLotUnits : 1)
                  : resolvePerUnit(freight, freightMode, 1) +
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
              totalVariants={mode === "grade" ? variants.length : 1}
              hasData={
                mode === "grade"
                  ? summaryPrices.avgSuggested > 0 && summaryPrices.avgCost > 0
                  : toNumber(wholesale) > 0 && summaryPrices.avgSuggested > 0
              }
              mode={mode}
              gradeStep={gradeStep}
              onStepChange={setGradeStep}
              onEntry={openEntryForCurrent}
              onSave={() => save.mutate()}
              onReset={resetPricingModel}
              saveDisabled={save.isPending || (mode === "grade" ? (actualLotUnits === 0 && !name.trim()) : !name.trim() || toNumber(wholesale) <= 0)}
              entryDisabled={actualLotUnits === 0 || summaryPrices.avgSuggested <= 0 || (mode === "grade" && gradeStep < 3)}
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
