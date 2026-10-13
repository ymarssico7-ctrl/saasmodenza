import { useEffect, useMemo, useState, useRef } from "react";
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

type PricingMode = "rapida" | "grade";
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

  // ── Modo Principal (2 Modos Estratégicos) ─────────────────────────
  const [mode, setMode] = useState<PricingMode>("rapida");

  // ── Estratégia de Precificação ────────────────────────────────────
  const [strategy, setStrategy] = useState<PricingStrategy>("margin");

  // ── Identificação da Peça ─────────────────────────────────────────
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  // ── Modo 1: Precificação Rápida ───────────────────────────────────
  const [wholesale, setWholesale] = useState("49,90");
  const [rapidaQty, setRapidaQty] = useState("1");     // quantidade de peças no lote rápido
  const [rapidaColor, setRapidaColor] = useState("");   // cor opcional (identificação)
  const [rapidaSize, setRapidaSize] = useState("");     // tamanho opcional (identificação)

  // ── Modo 2: Grade Detalhada de Variantes ──────────────────────────
  const [baseWholesaleGrade, setBaseWholesaleGrade] = useState("49,90");
  const [gradePricingMode, setGradePricingMode] = useState<"unified" | "per_unit">("unified");

  // Lista Unificada de Variantes (SKUs)
  const [variants, setVariants] = useState<VariantRow[]>([
    { id: "v-p-off", size: "P", color: "Off-White", wholesaleCost: "", customSalePrice: "", qty: 2 },
    { id: "v-m-off", size: "M", color: "Off-White", wholesaleCost: "", customSalePrice: "", qty: 4 },
    { id: "v-m-preto", size: "M", color: "Preto", wholesaleCost: "", customSalePrice: "", qty: 4 },
    { id: "v-g-preto", size: "G", color: "Preto", wholesaleCost: "", customSalePrice: "", qty: 4 },
    { id: "v-gg-preto", size: "GG", color: "Preto", wholesaleCost: "", customSalePrice: "", qty: 2 },
  ]);

  // Seletor de geração rápida da grade
  const [activeColors, setActiveColors] = useState<string[]>(["Off-White", "Preto"]);
  const [genSizes, setGenSizes] = useState<string[]>(["P", "M", "G", "GG"]);
  const [genColors, setGenColors] = useState<string[]>(["Off-White", "Preto"]);
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

  // ── Função Central de Cálculo de Item ──────────────────────────────
  const calculateItem = useMemo(() => {
    const freightNum = toNumber(freight);
    const packagingNum = toNumber(packaging);
    const otherNum = toNumber(other);

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
  }, [freight, packaging, other, strategy, desiredMargin, markup, directSalePrice, tax, cardRate]);

  // ── Cálculo do Preço Único (Modo Rápido) ───────────────────────────
  const singleResult = useMemo(() => {
    return calculateItem(toNumber(wholesale));
  }, [wholesale, calculateItem]);

  // ── Cálculo da Tabela Unificada de Variantes (Totalmente Reativo) ───
  const variantResults = useMemo(() => {
    const baseNum = toNumber(baseWholesaleGrade);
    const freightNum = toNumber(freight);
    const packagingNum = toNumber(packaging);
    const otherNum = toNumber(other);

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
  }, [variants, baseWholesaleGrade, freight, packaging, other, tax, cardRate, colorStrategies, calculateItem]);

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
  }, [mode, singleResult, variantResults, variants.length]);

  // ── Simulador de Meios de Pagamento & Perdas ───────────────────────
  const paymentScenarios = useMemo(() => {
    return computePaymentScenarios(
      summaryPrices.avgSuggested,
      summaryPrices.avgCost,
      tax,
      cardRate,
    );
  }, [summaryPrices.avgSuggested, summaryPrices.avgCost, tax, cardRate]);

  // ── Total Real de Unidades do Lote (Dinâmico e Preciso) ─────────────
  const actualLotUnits = useMemo(() => {
    if (mode !== "grade") return Math.max(1, Number(rapidaQty.replace(",", ".")) || 1);
    return variantResults.reduce((acc, v) => acc + v.qty, 0);
  }, [mode, variantResults, rapidaQty]);

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
        wholesaleCost: "",
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
          wholesaleCost: existing?.wholesaleCost ?? "",
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

  const addNewVariantRow = () => {
    const defaultColor = variants[0]?.color || "Off-White";
    const defaultSize = "M";
    const newId = `v-${defaultSize.toLowerCase()}-${Date.now().toString(36)}`;
    setVariants((prev) => [
      ...prev,
      {
        id: newId,
        size: defaultSize,
        color: defaultColor,
        wholesaleCost: "",
        customSalePrice: "",
        qty: 2,
      },
    ]);
    toast.success("Nova variação adicionada à planilha!");
  };

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
          wholesaleCost: matchingOriginal?.wholesaleCost ?? "",
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
    setVariants((cur) => cur.map((v) => ({ ...v, customSalePrice: "" })));
    const label =
      matrixGlobalMode === "margin"
        ? `Margem ${matrixGlobalMarginStr}%`
        : matrixGlobalMode === "markup"
          ? `Markup ${matrixGlobalMarkupStr}%`
          : `Preço R$ ${matrixGlobalDirectPrice}`;
    toast.success(`${label} aplicado(a) ao modelo!`);
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
      wholesaleCost: "",
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
      const pieceName = name.trim();
      if (!pieceName) throw new Error("Dê um nome para a peça antes de salvar no histórico");

      const wholesaleNum =
        mode === "grade"
          ? toNumber(baseWholesaleGrade)
          : toNumber(wholesale);

      if (isNaN(wholesaleNum) || wholesaleNum <= 0) {
        throw new Error("Informe o custo no atacado da peça (maior que zero) antes de salvar");
      }

      return insertPricing({
        storeId,
        name: pieceName,
        wholesale_cost: wholesaleNum,
        freight_cost: toNumber(freight),
        packaging_cost: toNumber(packaging),
        other_costs: toNumber(other),
        margin_pct: strategy === "markup" ? markup : desiredMargin,
        tax_pct: tax,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricings"] });
      toast.success("Precificação salva no histórico!", {
        description: "Você pode consultá-la ou dar entrada no estoque a qualquer momento.",
      });
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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Inteligência de Precificação & Vendas"
        title="Quanto cobrar por cada peça?"
        description="Descubra o preço de venda ideal, proteja seu lucro e envie a peça direto para o estoque."
      />

      {/* ── Segmented Control Principal (Padrão Apple Studio / Shopify Polaris) ───────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-border/60 bg-secondary/70 p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setMode("rapida")}
            className={cn(
              "rounded-lg px-4 py-2 text-xs sm:text-sm transition-all duration-150 cursor-pointer",
              mode === "rapida"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground font-medium",
            )}
          >
            Precificação rápida
          </button>
          <button
            type="button"
            onClick={() => setMode("grade")}
            className={cn(
              "rounded-lg px-4 py-2 text-xs sm:text-sm transition-all duration-150 cursor-pointer",
              mode === "grade"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground font-medium",
            )}
          >
            Grade & estoque
          </button>
        </div>
      </div>

      {/* ── CANVAS UNIFICADO & MINIMALISTA (PADRÃO APPLE STUDIO - FLUXO SEQUENCIAL NATURAL) ──── */}
      <div className="space-y-6 max-w-5xl mx-auto w-full">

        {/* ══════════════════════════════════════════════════════════════════
            PASSO 1: IDENTIFICAÇÃO DA PEÇA & CUSTOS OPERACIONAIS COMPARTILHADOS
        ══════════════════════════════════════════════════════════════════ */}
        <section className="panel p-6 sm:p-7 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                1
              </span>
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  {mode === "rapida" ? "Identificação e custo da peça" : "Identificação e custos operacionais compartilhados"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mode === "rapida"
                    ? "Informe o nome, categoria, valor de atacado e variantes da peça"
                    : "Custos de frete, embalagem e taxas que se aplicam a todas as variantes da coleção"}
                </p>
              </div>
            </div>
          </div>

          {/* Grid de Identificação da Peça */}
          <div className={cn("grid gap-3", mode === "grade" ? "sm:grid-cols-[1fr_200px_170px]" : "sm:grid-cols-[1fr_220px]")}>
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

            {mode === "grade" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Custo atacado base</span>
                  <span className="text-[10px] text-muted-foreground font-normal">(padrão)</span>
                </Label>
                <div className="relative flex h-11 items-center rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                  <span className="pl-3 text-xs font-bold text-muted-foreground select-none">R$</span>
                  <input
                    inputMode="decimal"
                    value={baseWholesaleGrade}
                    onChange={(e) => setBaseWholesaleGrade(e.target.value)}
                    placeholder="49,90"
                    className="h-11 w-full bg-transparent px-2 text-sm font-bold text-foreground outline-none"
                    title="Custo unitário base no fornecedor (usado para compor o custo real e alimentar variações da grade)"
                  />
                </div>
              </div>
            )}
          </div>

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
            const freightVal = toNumber(freight);
            const packagingVal = toNumber(packaging);
            const otherVal = toNumber(other);
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

                        <div className="flex items-center gap-2 shrink-0">
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
                          >
                            <Calculator className="size-3.5" />
                            <span>Ratear</span>
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

                        <div className="flex items-center gap-2 shrink-0">
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
                          >
                            <Calculator className="size-3.5" />
                            <span>Ratear</span>
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

                        <div className="flex items-center gap-2 shrink-0">
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
                          >
                            <Calculator className="size-3.5" />
                            <span>Ratear</span>
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


        {/* ══════════════════════════════════════════════════════════════════
            PASSO 2: CORES & TAMANHOS DA COLEÇÃO (A CONSOLE MESTRE DE PRECIFICAÇÃO)
        ══════════════════════════════════════════════════════════════════ */}
        {/* ══════════════════════════════════════════════════════════════════
            PASSO 2: CORES & TAMANHOS DO MODELO (CONSOLE MESTRE DA PEÇA - v68)
        ══════════════════════════════════════════════════════════════════ */}
        {mode === "grade" && (
          <section className="panel p-6 sm:p-7 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                  2
                </span>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Cores &amp; Tamanhos da Coleção</h2>
                  <p className="text-xs text-muted-foreground">
                    Configure as variações, grade de produção e precificação do modelo
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                  {actualLotUnits} {actualLotUnits === 1 ? "peça" : "peças"} no lote
                </Badge>
              </div>
            </div>

            {/* ── CARD PRINCIPAL DA PEÇA / MODELO (PADRÃO IMAGEM 2) ── */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft space-y-5 transition-all duration-200">
              {/* Cabeçalho do Card (No lugar da cor, o Nome/Modelo da Peça) */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 shadow-2xs text-base">
                    👗
                  </span>
                  <div className="min-w-0">
                    <span className="text-base font-bold text-foreground truncate block sm:inline">
                      {name.trim() || "Vestido Midi Linho com Fenda"}
                    </span>
                    {category && (
                      <span className="text-xs text-muted-foreground font-medium sm:ml-2">
                        · {getCategoryLabel(storeCategories, category)}
                      </span>
                    )}
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground shrink-0">
                    {activeModelSizes.size} {activeModelSizes.size === 1 ? "tamanho" : "tamanhos"} · {actualLotUnits} {actualLotUnits === 1 ? "peça" : "peças"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {summaryPrices.avgSuggested > 0 && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Média do modelo: <strong className="text-foreground">{brl(summaryPrices.avgSuggested)}</strong> (Margem <strong className={summaryPrices.marginHealth.color}>{pct(summaryPrices.avgMargin)}</strong>)
                    </span>
                  )}
                  {variants.length > 0 && (
                    <button
                      type="button"
                      onClick={clearModelSizes}
                      className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title="Limpar grade do modelo"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* ── 1. GRADE DE TAMANHOS DESTE MODELO ── */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Tamanhos deste modelo:
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {SIZE_QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyModelQuickPreset(preset.sizes)}
                        className="rounded-lg border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                        title={`Aplicar grade ${preset.label}`}
                      >
                        + {preset.label}
                      </button>
                    ))}
                    {activeModelSizes.size > 0 && (
                      <button
                        type="button"
                        onClick={clearModelSizes}
                        className="rounded-lg border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:border-destructive/40 hover:text-destructive hover:bg-destructive/5 transition-all cursor-pointer"
                        title="Limpar todos os tamanhos"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                {/* Botões de Tamanho do Modelo */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {availableModelSizes.map((sz) => {
                    const isActive = activeModelSizes.has(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => toggleModelSize(sz)}
                        className={cn(
                          "flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer",
                          isActive
                            ? "gradient-primary text-primary-foreground shadow-xs ring-1 ring-primary/30"
                            : "border border-border/80 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/60",
                        )}
                      >
                        <span>{sz}</span>
                        {isActive && <Check className="size-3 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── 2. ESTRATÉGIA DE PREÇO DO MODELO (BARRA PRO TÁTIL) ── */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-secondary/30 px-3 py-2 text-xs shadow-2xs">
                {/* Lado Esquerdo: Abas de modo e steppers */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-lg border border-border/80 bg-card p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setMatrixGlobalMode("margin")}
                      className={cn(
                        "flex items-center justify-center gap-1 rounded-md py-1 px-2.5 text-[11px] font-bold transition-all cursor-pointer",
                        matrixGlobalMode === "margin"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                      )}
                    >
                      <Target className="size-3 shrink-0" />
                      <span>Margem</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatrixGlobalMode("markup")}
                      className={cn(
                        "flex items-center justify-center gap-1 rounded-md py-1 px-2.5 text-[11px] font-bold transition-all cursor-pointer",
                        matrixGlobalMode === "markup"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                      )}
                    >
                      <TrendingUp className="size-3 shrink-0" />
                      <span>Markup</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatrixGlobalMode("direct_price")}
                      className={cn(
                        "flex items-center justify-center gap-1 rounded-md py-1 px-2.5 text-[11px] font-bold transition-all cursor-pointer",
                        matrixGlobalMode === "direct_price"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                      )}
                    >
                      <Coins className="size-3 shrink-0" />
                      <span>Preço Fixo</span>
                    </button>
                  </div>

                  <div className="h-5 w-px bg-border/80 hidden sm:block" />

                  {/* Controles Margem */}
                  {matrixGlobalMode === "margin" && (
                    <div className="flex items-center gap-1.5">
                      <div className="inline-flex items-center rounded-lg border border-border/80 bg-card p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = toNumber(matrixGlobalMarginStr) || 50;
                            const next = Math.max(1, Math.round(cur) - 1);
                            setMatrixGlobalMarginStr(String(next));
                          }}
                          className="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all text-xs font-bold cursor-pointer"
                          title="Diminuir 1% na margem do modelo"
                        >
                          <Minus className="size-3" />
                        </button>
                        <div className="flex items-center px-1.5">
                          <input
                            inputMode="decimal"
                            value={matrixGlobalMarginStr}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (/^[\d,.]*$/.test(raw)) setMatrixGlobalMarginStr(raw);
                            }}
                            className="w-9 text-center text-xs font-bold outline-none bg-transparent text-primary"
                          />
                          <span className="text-[11px] font-semibold text-muted-foreground">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = toNumber(matrixGlobalMarginStr) || 50;
                            const next = Math.min(85, Math.round(cur) + 1);
                            setMatrixGlobalMarginStr(String(next));
                          }}
                          className="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all text-xs font-bold cursor-pointer"
                          title="Aumentar 1% na margem do modelo"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      <div className="inline-flex rounded-lg border border-border/70 bg-card p-0.5 shadow-2xs">
                        {[30, 40, 50, 60, 70].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMatrixGlobalMarginStr(String(m))}
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-all cursor-pointer",
                              toNumber(matrixGlobalMarginStr) === m
                                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                            )}
                          >
                            {m}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Controles Markup */}
                  {matrixGlobalMode === "markup" && (
                    <div className="flex items-center gap-1.5">
                      <div className="inline-flex items-center rounded-lg border border-border/80 bg-card p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = toNumber(matrixGlobalMarkupStr) || 100;
                            const next = Math.max(1, Math.round(cur) - 5);
                            setMatrixGlobalMarkupStr(String(next));
                          }}
                          className="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all text-xs font-bold cursor-pointer"
                          title="Diminuir 5% no markup do modelo"
                        >
                          <Minus className="size-3" />
                        </button>
                        <div className="flex items-center px-1.5">
                          <input
                            inputMode="decimal"
                            value={matrixGlobalMarkupStr}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (/^[\d,.]*$/.test(raw)) setMatrixGlobalMarkupStr(raw);
                            }}
                            className="w-9 text-center text-xs font-bold outline-none bg-transparent text-primary"
                          />
                          <span className="text-[11px] font-semibold text-muted-foreground">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = toNumber(matrixGlobalMarkupStr) || 100;
                            const next = Math.min(300, Math.round(cur) + 5);
                            setMatrixGlobalMarkupStr(String(next));
                          }}
                          className="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all text-xs font-bold cursor-pointer"
                          title="Aumentar 5% no markup do modelo"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      <div className="inline-flex rounded-lg border border-border/70 bg-card p-0.5 shadow-2xs">
                        {[60, 80, 100, 120, 150].map((mk) => (
                          <button
                            key={mk}
                            type="button"
                            onClick={() => setMatrixGlobalMarkupStr(String(mk))}
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-all cursor-pointer",
                              toNumber(matrixGlobalMarkupStr) === mk
                                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                            )}
                          >
                            {mk}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Controles Preço Fixo */}
                  {matrixGlobalMode === "direct_price" && (
                    <div className="flex items-center gap-1.5">
                      <div className="inline-flex items-center rounded-lg border border-border/80 bg-card p-0.5 shadow-2xs">
                        <div className="flex items-center px-1.5">
                          <span className="text-[11px] text-muted-foreground mr-0.5 font-semibold">R$</span>
                          <input
                            inputMode="decimal"
                            value={matrixGlobalDirectPrice}
                            onChange={(e) => setMatrixGlobalDirectPrice(e.target.value)}
                            placeholder="139,90"
                            className="w-16 text-center text-xs font-bold outline-none bg-transparent text-primary"
                          />
                        </div>
                      </div>

                      <div className="inline-flex rounded-lg border border-border/70 bg-card p-0.5 shadow-2xs">
                        {[",90", ",00", ",50"].map((ending) => (
                          <button
                            key={ending}
                            type="button"
                            onClick={() => {
                              const current = matrixGlobalDirectPrice || "139,90";
                              const integerPart = Math.floor(toNumber(current));
                              setMatrixGlobalDirectPrice(`${integerPart}${ending}`);
                            }}
                            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer"
                          >
                            {ending}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lado Direito: Botão Aplicar à Grade do Modelo */}
                <Button
                  type="button"
                  size="sm"
                  onClick={applyStrategyToModel}
                  className="h-7.5 rounded-lg px-3 text-[11px] font-bold gradient-primary shadow-glow shrink-0 active:scale-95 transition-all cursor-pointer ml-auto"
                >
                  <Zap className="size-3 mr-1" />
                  Aplicar ao Modelo
                </Button>
              </div>

              {/* ── 3. PLANILHA DE DETALHES COM OPÇÃO DE COR (PADRÃO IMAGEM 2) ── */}
              {variants.length > 0 ? (
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

                      {/* Linhas de Cada Variante com a Opção de Cor */}
                      <div className="divide-y divide-border/50 bg-card">
                        {displayedVariants.map((v) => (
                          <div
                            key={v.id}
                            className="grid grid-cols-[140px_60px_60px_1fr_1fr_1.1fr_1fr_1.1fr_36px] items-center gap-2.5 px-3.5 py-2.5 text-xs hover:bg-secondary/20 transition-colors"
                          >
                            {/* Coluna Cor: Seletor Interativo com Bolinha e Popover */}
                            <div>
                              <VariantColorPicker
                                color={v.color}
                                onChange={(newCol) => updateVariantColor(v.id, newCol)}
                              />
                            </div>

                            {/* Tamanho com botão [+] de duplicar linha para outra cor */}
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

                            {/* Quantidade no Lote */}
                            <div>
                              <input
                                inputMode="numeric"
                                value={v.qty ?? 1}
                                onChange={(e) => updateVariantQty(v.id, Number(e.target.value) || 1)}
                                className="h-7 w-12 rounded-md border border-border bg-secondary/40 px-1.5 text-center text-xs font-bold text-foreground outline-none focus:border-primary focus:bg-card shadow-2xs"
                                title="Quantidade desta variante no lote"
                              />
                            </div>

                            {/* Custo Fornecedor (Input Direto) */}
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-muted-foreground">R$</span>
                                <input
                                  inputMode="decimal"
                                  value={v.wholesaleCost}
                                  onChange={(e) => updateVariantCost(v.id, e.target.value)}
                                  placeholder={baseWholesaleGrade || "49,90"}
                                  className="h-7 w-20 rounded-md border border-border bg-secondary/40 px-2 text-right text-xs font-semibold outline-none focus:border-primary focus:bg-card shadow-2xs"
                                />
                              </div>
                            </div>

                            {/* Custo Real Total Calculado (Atacado + Rateio) */}
                            <div className="numeric text-muted-foreground font-medium text-xs">
                              {brl(v.realCost)}
                            </div>

                            {/* Preço de Venda (Input Direto com Preço Sugerido Reativo) */}
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

                            {/* Margem Real */}
                            <div>
                              <span className={cn("numeric font-bold text-xs", v.marginHealth.color)}>
                                {pct(v.marginOnPrice)}
                              </span>
                            </div>

                            {/* Lucro Líquido Real */}
                            <div className="text-right">
                              <span className={cn("numeric font-bold text-xs inline-flex items-center gap-1", v.profit >= 0 ? "text-success" : "text-destructive")}>
                                <span>{v.marginHealth.emoji}</span>
                                <span>+{brl(v.profit)}</span>
                              </span>
                            </div>

                            {/* Ação: Excluir linha */}
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

                      {/* Botões de Adicionar Nova Variação & Replicar Grade */}
                      <div className="p-2.5 bg-card border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={addNewVariantRow}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-primary/5"
                        >
                          <Plus className="size-3.5" />
                          <span>Adicionar variação</span>
                        </button>

                        <ReplicateGradeColorPicker onSelectColor={replicateGradeInColor} />
                      </div>

                      {/* Rodapé / Totais da Planilha */}
                      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3 bg-secondary/40 border-t border-border/60 text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Totais do lote:</span>
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
                <div className="rounded-xl border border-dashed border-border/80 bg-secondary/20 p-8 text-center space-y-2">
                  <Package className="size-8 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-foreground">
                    Nenhum tamanho ativo neste modelo
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Clique em um preset como <strong className="text-primary font-bold">+ P-GG</strong> acima para preencher automaticamente as variações.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}



        {/* ══════════════════════════════════════════════════════════════════
            PASSO 3: RESUMO EXECUTIVO DO LOTE & FECHAMENTO (OU RESULTADO MODO RÁPIDO)
        ══════════════════════════════════════════════════════════════════ */}
        <section className="panel p-5 sm:p-6 space-y-4">
          {/* ── CABEÇALHO INTEGRADO ── */}
          <div className="flex items-center gap-2.5 border-b border-border/50 pb-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary shrink-0">
              {mode === "rapida" ? "2" : "3"}
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                {mode === "rapida" ? "Formação do Preço de Venda" : "Resumo executivo do lote e fechamento"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {mode === "rapida"
                  ? "Defina sua margem e visualize instantaneamente o preço comercial da peça"
                  : "Visão consolidada do lote — faturamento potencial, investimento total e ponto de equilíbrio"}
              </p>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              MODO RÁPIDO: SIMULADOR EXECUTIVO DE PREÇO
          ═══════════════════════════════════════════════════════════════ */}
          {mode === "rapida" ? (
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
          ) : (
            /* ═══════════════════════════════════════════════════════════════
               MODO GRADE: RESUMO EXECUTIVO CONSOLIDADO DO LOTE
            ═══════════════════════════════════════════════════════════════ */
            (() => {
              const hasItems = summaryPrices.avgSuggested > 0 && actualLotUnits > 0;
              const lotRevenue = summaryPrices.totalRevenue;
              const lotCost = summaryPrices.totalInvestment;
              const lotProfit = summaryPrices.totalProfit;
              const lotTaxes = Math.max(lotRevenue * (tax / 100), 0);
              const lotCardFees = Math.max(lotRevenue * (cardRate / 100), 0);

              const lotCostPct = lotRevenue > 0 ? (lotCost / lotRevenue) * 100 : 0;
              const lotTaxPct = lotRevenue > 0 ? (lotTaxes / lotRevenue) * 100 : 0;
              const lotCardPct = lotRevenue > 0 ? (lotCardFees / lotRevenue) * 100 : 0;
              const lotProfitPct = lotRevenue > 0 ? (lotProfit / lotRevenue) * 100 : 0;

              const unitPrice = summaryPrices.avgSuggested;
              const unitCost = summaryPrices.avgCost;
              const unitProfit = summaryPrices.avgProfit;
              const unitTaxes = Math.max(unitPrice * (tax / 100), 0);
              const unitCardFees = Math.max(unitPrice * (cardRate / 100), 0);
              const isPrejuizo = lotProfit < 0;

              return (
                <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-soft space-y-4">
                  {!hasItems ? (
                    /* ESTADO ZERO ELEGANTE (QUANDO NÃO HÁ ITENS/CUSTOS PREENCHIDOS NA GRADE) */
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-border/80 bg-secondary/15 space-y-3">
                      <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                        <Boxes className="size-6" />
                      </div>
                      <div className="max-w-md space-y-1">
                        <h3 className="text-sm font-bold text-foreground">
                          Resumo executivo do lote
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Adicione o custo de atacado e selecione os tamanhos na grade acima para gerar a decomposição financeira completa e o faturamento previsto do lote.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMode("rapida")}
                        className="rounded-full text-xs font-semibold cursor-pointer"
                      >
                        Ou use a precificação rápida
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* 1. HEADER DO DEMONSTRATIVO DO LOTE (DUPLO DESTAQUE SEM CARD-IN-CARD) */}
                      <div className="grid sm:grid-cols-2 gap-4 pb-4 border-b border-border/60">
                        {/* Lado A: Faturamento Total Previsto do Lote */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between sm:justify-start gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                              <Tag className="size-3.5 text-primary" />
                              Faturamento total previsto
                            </span>
                            <Badge
                              variant="outline"
                              className={cn("text-[11px] font-semibold px-2 py-0.5 border shadow-2xs", summaryPrices.marginHealth.color)}
                            >
                              {summaryPrices.marginHealth.emoji} {summaryPrices.marginHealth.label}
                            </Badge>
                          </div>
                          <div className="flex items-baseline gap-2 pt-0.5 flex-wrap">
                            <span className="numeric text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-none">
                              {brl(lotRevenue)}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              ({actualLotUnits} {actualLotUnits === 1 ? "peça" : "peças"} no lote)
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground/80">
                            {summaryPrices.hasMultiple ? (
                              <>
                                Média de <strong className="text-foreground">{brl(unitPrice)}</strong> / peça (faixa {brl(summaryPrices.minSuggested)} – {brl(summaryPrices.maxSuggested)}). Receita bruta total estimada.
                              </>
                            ) : (
                              <>
                                Média de <strong className="text-foreground">{brl(unitPrice)}</strong> / peça na vitrine. Receita bruta total ao vender o lote.
                              </>
                            )}
                          </p>
                        </div>

                        {/* Lado B: Sobra Líquida no Caixa do Lote */}
                        <div className="space-y-1 sm:border-l sm:border-border/60 sm:pl-5">
                          <div className="flex items-center justify-between sm:justify-start gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                              <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                              Sobra líquida no caixa
                            </span>
                            <span className={cn(
                              "numeric text-[11px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs",
                              isPrejuizo
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
                            )}>
                              {pct(summaryPrices.avgMargin)} de margem consolidada
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 pt-0.5 flex-wrap">
                            <span className={cn(
                              "numeric text-2xl sm:text-3xl font-black tracking-tight leading-none",
                              isPrejuizo ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
                            )}>
                              {lotProfit >= 0 ? "+" : ""}{brl(lotProfit)}
                            </span>
                            <span className={cn(
                              "text-xs font-medium",
                              isPrejuizo ? "text-rose-700/70 dark:text-rose-400/70" : "text-emerald-700/70 dark:text-emerald-400/70",
                            )}>
                              no caixa do lote
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground/80">
                            Média de <strong className={isPrejuizo ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}>
                              {unitProfit >= 0 ? "+" : ""}{brl(unitProfit)}
                            </strong> limpos / peça após abater custos, DAS e maquininha.
                          </p>
                        </div>
                      </div>

                      {/* 2. BARRA VISUAL PROPORCIONAL CONTÍNUA DO LOTE */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">
                            Decomposição do faturamento ({brl(lotRevenue)})
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Para onde vai a receita das {actualLotUnits} peças
                          </span>
                        </div>
                        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary/80 gap-0.5">
                          <div
                            className="bg-slate-400 dark:bg-slate-500 rounded-l-full transition-all duration-300"
                            style={{ width: `${Math.max(lotCostPct, 2)}%` }}
                            title={`Custo total das peças: ${brl(lotCost)} (${Math.round(lotCostPct)}%)`}
                          />
                          <div
                            className="bg-amber-400 transition-all duration-300"
                            style={{ width: `${Math.max(lotTaxPct, 2)}%` }}
                            title={`Imposto DAS total: ${brl(lotTaxes)} (${Math.round(lotTaxPct)}%)`}
                          />
                          <div
                            className="bg-sky-400 transition-all duration-300"
                            style={{ width: `${Math.max(lotCardPct, 2)}%` }}
                            title={`Taxas de maquininha total: ${brl(lotCardFees)} (${Math.round(lotCardPct)}%)`}
                          />
                          <div
                            className={cn(
                              "rounded-r-full transition-all duration-300",
                              isPrejuizo ? "bg-rose-500" : "bg-emerald-500",
                            )}
                            style={{ width: `${Math.max(Math.abs(lotProfitPct), 2)}%` }}
                            title={`Lucro líquido do lote: ${brl(lotProfit)} (${Math.round(lotProfitPct)}%)`}
                          />
                        </div>
                      </div>

                      {/* 3. A TABELA DRE DO LOTE EM 4 COLUNAS (RECIBO HARMONIOSO CONSOLIDADO) */}
                      <div className="rounded-xl border border-border/60 bg-background/90 overflow-hidden shadow-2xs">
                        {/* Cabeçalho do Recibo */}
                        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center text-[11px] font-medium text-muted-foreground py-2 px-3.5 bg-secondary/25 border-b border-border/50">
                          <span>Componente da formação</span>
                          <span className="text-right pr-4 sm:pr-6">Média / peça</span>
                          <span className="text-right pr-6 sm:pr-8">Total do lote</span>
                          <span className="text-right w-14 sm:w-16">% do total</span>
                        </div>

                        {/* Linha 1: Custo das Peças */}
                        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center py-2.5 px-3.5 text-xs border-b border-border/40 hover:bg-secondary/15 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                            <span className="font-medium text-foreground">Custo das Peças</span>
                            <span className="text-[11px] text-muted-foreground hidden sm:inline">· Atacado + rateio</span>
                          </div>
                          <span className="numeric text-muted-foreground text-right pr-4 sm:pr-6">{brl(unitCost)}</span>
                          <span className="numeric font-semibold text-foreground text-right pr-6 sm:pr-8">{brl(lotCost)}</span>
                          <span className="numeric text-muted-foreground text-right w-14 sm:w-16">{Math.round(lotCostPct)}%</span>
                        </div>

                        {/* Linha 2: Imposto DAS */}
                        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center py-2.5 px-3.5 text-xs border-b border-border/40 hover:bg-secondary/15 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-amber-400 shrink-0" />
                            <span className="font-medium text-foreground">Imposto DAS ({tax.toFixed(1)}%)</span>
                            <span className="text-[11px] text-muted-foreground hidden sm:inline">· Simples Nacional</span>
                          </div>
                          <span className="numeric text-muted-foreground text-right pr-4 sm:pr-6">{brl(unitTaxes)}</span>
                          <span className="numeric font-semibold text-foreground text-right pr-6 sm:pr-8">{brl(lotTaxes)}</span>
                          <span className="numeric text-muted-foreground text-right w-14 sm:w-16">{Math.round(lotTaxPct)}%</span>
                        </div>

                        {/* Linha 3: Taxa de Cartão */}
                        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center py-2.5 px-3.5 text-xs border-b border-border/40 hover:bg-secondary/15 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full bg-sky-400 shrink-0" />
                            <span className="font-medium text-foreground">Taxa de Cartão ({cardRate.toFixed(1)}%)</span>
                            <span className="text-[11px] text-muted-foreground hidden sm:inline">· Maquininha/gateway</span>
                          </div>
                          <span className="numeric text-muted-foreground text-right pr-4 sm:pr-6">{brl(unitCardFees)}</span>
                          <span className="numeric font-semibold text-foreground text-right pr-6 sm:pr-8">{brl(lotCardFees)}</span>
                          <span className="numeric text-muted-foreground text-right w-14 sm:w-16">{Math.round(lotCardPct)}%</span>
                        </div>

                        {/* Linha 4: Lucro Líquido Real Consolidado */}
                        <div className={cn(
                          "grid grid-cols-[1fr_auto_auto_auto] items-center py-2.5 px-3.5 text-xs font-semibold",
                          isPrejuizo
                            ? "bg-rose-500/10 text-rose-800 dark:text-rose-300"
                            : "bg-emerald-500/8 text-emerald-900 dark:text-emerald-300",
                        )}>
                          <div className="flex items-center gap-2">
                            <span className={cn("size-2 rounded-full shrink-0", isPrejuizo ? "bg-rose-500" : "bg-emerald-500")} />
                            <span className="font-bold">Lucro Líquido do Lote</span>
                            <span className="text-[11px] opacity-75 hidden sm:inline">· Sobra limpa no caixa</span>
                          </div>
                          <span className={cn("numeric font-semibold text-right pr-4 sm:pr-6", isPrejuizo ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
                            {unitProfit >= 0 ? "+" : ""}{brl(unitProfit)}
                          </span>
                          <span className={cn("numeric font-black text-sm text-right pr-6 sm:pr-8", isPrejuizo ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
                            {lotProfit >= 0 ? "+" : ""}{brl(lotProfit)}
                          </span>
                          <span className={cn("numeric font-semibold text-right w-14 sm:w-16", isPrejuizo ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
                            {Math.round(lotProfitPct)}%
                          </span>
                        </div>
                      </div>

                      {/* 4. O DESAFIO DA GRADE RESOLVIDO: CONTRIBUIÇÃO FINANCEIRA POR COR (DRILLDOWN DISCRETO) */}
                      {colorGroups.length > 1 ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setShowGradeColorBreakdown((prev) => !prev)}
                            className="w-full flex items-center justify-between p-3 rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs font-semibold text-foreground cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Palette className="size-3.5 text-primary" />
                              <span>Ver contribuição financeira por cor ({colorGroups.length} cores na grade)</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                              <span>{showGradeColorBreakdown ? "Ocultar detalhes" : "Expandir visão por cor"}</span>
                              <ChevronDown className={cn("size-3.5 transition-transform duration-200", showGradeColorBreakdown && "rotate-180")} />
                            </div>
                          </button>

                          {showGradeColorBreakdown && (
                            <div className="rounded-xl border border-border/60 bg-background/80 overflow-hidden divide-y divide-border/40 text-xs shadow-2xs">
                              <div className="grid grid-cols-[1.5fr_auto_auto_auto_auto] items-center gap-2 py-2 px-3 bg-secondary/30 text-[10px] font-semibold text-muted-foreground">
                                <span>Cor</span>
                                <span className="text-right">Qtd.</span>
                                <span className="text-right">Preço médio</span>
                                <span className="text-right">Faturamento</span>
                                <span className="text-right">Lucro líquido</span>
                              </div>
                              {colorGroups.map((cg) => (
                                <div key={cg.color} className="grid grid-cols-[1.5fr_auto_auto_auto_auto] items-center gap-2 py-2.5 px-3 hover:bg-secondary/15 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <span className={cn("size-2.5 rounded-full shrink-0 shadow-2xs", getColorDot(cg.color))} />
                                    <span className="font-semibold text-foreground">{cg.color}</span>
                                    <span className="text-[10px] text-muted-foreground">({cg.items.length} tam.)</span>
                                  </div>
                                  <span className="numeric text-muted-foreground text-right">{cg.totalUnits} un.</span>
                                  <span className="numeric font-medium text-foreground text-right">{brl(cg.avgPrice)}</span>
                                  <span className="numeric font-semibold text-foreground text-right">{brl(cg.totalRevenue)}</span>
                                  <div className="text-right">
                                    <span className={cn("numeric font-bold", cg.totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                                      {brl(cg.totalProfit)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground ml-1">({pct(cg.avgMargin)})</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/25 border border-border/50 text-[11px] text-muted-foreground">
                          <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Grade uniforme com 1 cor cadastrada ({colorGroups[0]?.color || "Padrão"}). Todas as variantes compartilham a mesma formação de preço.</span>
                        </div>
                      )}

                      {/* 5. PONTO DE EQUILÍBRIO DO LOTE (BREAK-EVEN) */}
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
                    </>
                  )}

                  <div className="border-t border-border/50" />

                  {/* 6. AÇÕES FINAIS UNIFICADAS DO MODO GRADE */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <Button
                        type="button"
                        onClick={openEntryForCurrent}
                        disabled={!hasItems}
                        className="h-10 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-glow cursor-pointer flex items-center justify-center gap-2 px-5 transition-all active:scale-[0.98] text-xs disabled:opacity-50"
                      >
                        <PackagePlus className="size-4" />
                        <span>Dar entrada no estoque ({actualLotUnits} un.)</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => save.mutate()}
                        disabled={save.isPending || !hasItems}
                        className="h-10 rounded-full text-xs font-semibold border-border/80 bg-background hover:bg-secondary/60 cursor-pointer flex items-center justify-center gap-1.5 px-4 transition-all disabled:opacity-50"
                      >
                        <Save className="size-3.5" />
                        <span>Salvar no histórico</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </section>
      </div>
{/* ── Peças Precificadas (Histórico & Ficha de Entrada) ─────── */}
      <section className="panel p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-3.5">
          <div>
            <h2 className="text-base font-semibold">Peças precificadas</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Histórico dos seus cálculos de precificação.
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
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Calcular peça ↑
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
