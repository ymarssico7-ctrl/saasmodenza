import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
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
  Minus,
  PackagePlus,
  Palette,
  Percent,
  Plus,
  RotateCcw,
  Sliders,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  Trash2,
  TrendingUp,
  Wand2,
  X,
  Zap,
} from "lucide-react";
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
  INVENTORY_CATEGORIES,
  type MarginHealth,
} from "@/lib/finance";
import { useStore } from "@/lib/store-context";
import { insertPricing, deletePricing, insertInventoryItem } from "@/lib/mutations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/precificacao")({
  head: () => ({
    meta: [
      { title: "Precificação Estratégica & Inteligência de Margem — Vestuli" },
      {
        name: "description",
        content:
          "Calcule o preço de venda das suas peças com margem real, controle unificado por variante de tamanho e cor, simulador de taxas e ponto de equilíbrio do lote.",
      },
      { property: "og:title", content: "Precificação Estratégica — Vestuli" },
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

function Precificacao() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { data: saved = [] } = useQuery(pricingsQuery());

  // ── Modo Principal (2 Modos Estratégicos) ─────────────────────────
  const [mode, setMode] = useState<PricingMode>("rapida");

  // ── Estratégia de Precificação ────────────────────────────────────
  const [strategy, setStrategy] = useState<PricingStrategy>("margin");

  // ── Identificação da Peça ─────────────────────────────────────────
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Vestidos");

  // ── Modo 1: Precificação Rápida ───────────────────────────────────
  const [wholesale, setWholesale] = useState("49,90");

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

  // Busca Spotlight de Cores (Apple Level)
  const [colorSearchQuery, setColorSearchQuery] = useState("");
  const [showColorPopover, setShowColorPopover] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

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

  // ── Parâmetros de Rentabilidade & Deduções ──────────────────────────
  const [desiredMargin, setDesiredMargin] = useState(50); // 50% de margem líquida
  const [markup, setMarkup] = useState(80); // 80% markup sobre custo
  const [directSalePrice, setDirectSalePrice] = useState("119,90");
  const [tax, setTax] = useState(6); // 6% imposto
  const [cardRate, setCardRate] = useState(3.5); // 3.5% taxa de maquininha

  // ── Rateio Operacional: Colapsável ───────────────────────────
  const [showOverhead, setShowOverhead] = useState(false);

  // ── Simuladores & Lote ─────────────────────────────────────────
  const [lotUnits] = useState(20);
  const [showSimulator, setShowSimulator] = useState(false);

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
      });
      const deductions = res.suggestedPrice * ((tax + cardRate) / 100);
      const profitAdjusted = res.suggestedPrice - res.realCost - deductions;
      const marginReal = res.suggestedPrice > 0 ? (profitAdjusted / res.suggestedPrice) * 100 : 0;

      return {
        realCost: res.realCost,
        suggestedPrice: res.suggestedPrice,
        profit: profitAdjusted,
        marginOnPrice: marginReal,
        markupOnCost: res.realCost > 0 ? (profitAdjusted / res.realCost) * 100 : 0,
        deductions,
        isCustomPrice: false,
        marginHealth: getMarginHealth(marginReal),
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
          const realCost = wholesaleNum + freightNum + packagingNum + otherNum;
          const price = realCost * (1 + targetMarkup / 100);
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
    );
  }, [summaryPrices.avgSuggested, summaryPrices.avgCost, tax]);

  // ── Total Real de Unidades do Lote (Dinâmico e Preciso) ─────────────
  const actualLotUnits = useMemo(() => {
    if (mode !== "grade") return 1;
    return variantResults.reduce((acc, v) => acc + v.qty, 0);
  }, [mode, variantResults]);

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

  // ── Ações de Manipulação da Grade por Cor & Tamanho ──────────────
  const toggleColorSize = (color: string, size: string) => {
    const existing = variants.find(
      (v) => v.color.toLowerCase() === color.toLowerCase() && v.size.toUpperCase() === size.toUpperCase(),
    );

    if (existing) {
      setVariants((prev) => prev.filter((v) => v.id !== existing.id));
      toast.success(`Tamanho ${size} removido da cor ${color}`);
    } else {
      const newId = `v-${size.toLowerCase()}-${color.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`;
      const newVariant: VariantRow = {
        id: newId,
        size: size.toUpperCase(),
        color: color,
        wholesaleCost: "",
        customSalePrice: "",
        qty: 2,
      };

      // Garante que a cor esteja em activeColors
      setActiveColors((prev) => (prev.some((c) => c.toLowerCase() === color.toLowerCase()) ? prev : [...prev, color]));

      // Adiciona e ordena na ordem canônica da moda
      setVariants((prev) => {
        const nextList = [...prev, newVariant];
        return nextList.sort((a, b) => {
          if (a.color.toLowerCase() === b.color.toLowerCase()) {
            const idxA = CANONICAL_SIZE_ORDER.indexOf(a.size);
            const idxB = CANONICAL_SIZE_ORDER.indexOf(b.size);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.size.localeCompare(b.size);
          }
          return a.color.localeCompare(b.color);
        });
      });
      toast.success(`Tamanho ${size} adicionado à cor ${color}!`);
    }
  };

  const removeColor = (color: string) => {
    setActiveColors((prev) => prev.filter((c) => c.toLowerCase() !== color.toLowerCase()));
    setVariants((prev) => prev.filter((v) => v.color.toLowerCase() !== color.toLowerCase()));
    toast.success(`Cor "${color}" removida da grade`);
  };

  const addQuickColor = (colorName: string) => {
    const clean = colorName.trim();
    if (!clean) return;
    const exists = activeColors.some((c) => c.toLowerCase() === clean.toLowerCase());
    if (exists) {
      toast.error(`A cor "${clean}" já está na grade`);
      return;
    }

    // Pega os tamanhos mais comuns já presentes na grade ou padrão P, M, G, GG
    const currentSizes = Array.from(new Set(variants.map((v) => v.size)));
    const sizesToUse = currentSizes.length > 0 ? currentSizes : ["P", "M", "G", "GG"];
    const canonicalSizesToUse = sortCanonicalSizes(sizesToUse);

    const newRows: VariantRow[] = canonicalSizesToUse.map((sz) => ({
      id: `v-${sz.toLowerCase()}-${clean.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`,
      size: sz,
      color: clean,
      wholesaleCost: "",
      customSalePrice: "",
      qty: 2,
    }));

    setActiveColors((prev) => [...prev, clean]);
    setVariants((prev) => [...prev, ...newRows]);
    toast.success(`Cor "${clean}" adicionada com os tamanhos ${canonicalSizesToUse.join(", ")}!`);
  };

  const addCustomColor = () => {
    const clean = newCustomColor.trim();
    if (!clean) return;
    addQuickColor(clean);
    setNewCustomColor("");
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
      const pieceName = name.trim() || "Peça sem nome";
      const wholesaleNum =
        mode === "grade"
          ? toNumber(baseWholesaleGrade)
          : toNumber(wholesale);

      return insertPricing(storeId, {
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

    // Cores únicas da lista
    const uniqueColors = Array.from(new Set(variants.map((v) => v.color)));
    setEntryColor(uniqueColors.join(", ") || "");

    // Quantidades por tamanho agregadas usando as quantidades REAIS de cada variante
    const initialSizes: Record<string, number> = {};
    variants.forEach((v) => {
      const q = v.qty && v.qty > 0 ? v.qty : 1;
      initialSizes[v.size] = (initialSizes[v.size] ?? 0) + q;
    });
    setEntrySizes(initialSizes);
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
      return insertInventoryItem(storeId, {
        name: entryName.trim() || "Peça sem nome",
        category: entryCategory,
        color: entryColor.trim() || null,
        supplier: entrySupplier.trim() || null,
        cost_price: entryCostPrice,
        sale_price: entrySalePrice,
        photo_url: entryPhotoUrl.trim() || null,
        sizes: entrySizes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setEntrySheetOpen(false);
      toast.success("Peça cadastrada no Estoque com sucesso! 📦", {
        description: `${entryTotalUnits} unidades registradas na grade.`,
      });
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
        description="Calcule margens reais, simule taxas e precifique de forma ágil ou com controle unificado por variante de tamanho e cor."
      />

      {/* ── Segmented Control Principal (2 Modos Estratégicos) ───────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl border border-border bg-surface p-1.5 shadow-soft">
          <button
            type="button"
            onClick={() => setMode("rapida")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200",
              mode === "rapida"
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Zap className="size-4" />
            ⚡ Precificação Rápida
          </button>
          <button
            type="button"
            onClick={() => setMode("grade")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200",
              mode === "grade"
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Layers className="size-4" />
            📦 Grade & Estoque
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
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                1
              </span>
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  {mode === "rapida" ? "Identificação & Custo da Peça" : "Identificação & Custos Operacionais Compartilhados"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mode === "rapida"
                    ? "Informe o nome e o custo pago ao fornecedor"
                    : "Custos de frete, embalagem e taxas que se aplicam a todas as variantes da coleção"}
                </p>
              </div>
            </div>
          </div>

          {/* Grid de Identificação da Peça (Nome + Categoria/Referência) */}
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="size-3.5 text-primary" />
                <span>Nome da peça ou modelo</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Vestido Midi Linho com Fenda"
                className="h-11 rounded-xl font-semibold text-sm bg-card shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                <span>Categoria / Referência</span>
              </Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Vestidos / REF-204"
                className="h-11 rounded-xl font-medium text-sm bg-card shadow-2xs"
              />
            </div>
          </div>

          {/* Custo Fornecedor apenas no Modo Rápido */}
          {mode === "rapida" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Custo Fornecedor (Atacado)</Label>
              <div className="relative flex items-center rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                <span className="pl-3.5 text-xs font-bold text-muted-foreground select-none">R$</span>
                <input
                  inputMode="decimal"
                  value={wholesale}
                  onChange={(e) => setWholesale(e.target.value)}
                  placeholder="49,90"
                  className="h-11 w-full bg-transparent px-2 text-sm font-bold text-foreground outline-none"
                />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              BENTO STUDIO: CUSTOS COMPARTILHADOS (ESQUERDA) + BENTO DASHBOARD (DIREITA)
          ══════════════════════════════════════════════════════════════════ */}
          {(() => {
            const freightVal = toNumber(freight);
            const packagingVal = toNumber(packaging);
            const otherVal = toNumber(other);
            const totalSharedCost = freightVal + packagingVal + otherVal;
            const freightPct = totalSharedCost > 0 ? (freightVal / totalSharedCost) * 100 : 0;
            const packagingPct = totalSharedCost > 0 ? (packagingVal / totalSharedCost) * 100 : 0;
            const otherPct = totalSharedCost > 0 ? (otherVal / totalSharedCost) * 100 : 0;

            return (
              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                {/* Coluna da Esquerda: Inputs dos 3 Custos com Botões Explícitos */}
                <div className="space-y-4 rounded-2xl border border-border/80 bg-secondary/20 p-4 sm:p-5 shadow-2xs">
                  <div className="space-y-0.5 border-b border-border/50 pb-3">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>📦 Custos Compartilhados por Peça</span>
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Valores de frete, embalagens e despesas fixas adicionadas a cada unidade do lote
                    </p>
                  </div>

                  {/* Assistente de Rateio Rápido Expandido (quando ativo) */}
                  {rateioTarget && (
                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-3.5 animate-in fade-in-50 duration-200 shadow-soft">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-lg bg-primary/15 flex items-center justify-center">
                            <Calculator className="size-3.5 text-primary" />
                          </div>
                          <span className="text-xs font-bold text-primary">
                            Assistente de Rateio:{" "}
                            {rateioTarget === "freight" ? "Dividir Frete da Nota" : rateioTarget === "packaging" ? "Dividir Embalagens & Tags" : "Dividir Outros Custos"}
                          </span>
                        </div>

                        {/* Abas Rápidas para trocar a despesa */}
                        <div className="flex items-center gap-1 rounded-lg bg-card border border-border/70 p-0.5">
                          <button
                            type="button"
                            onClick={() => openRateioAssistant("freight")}
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                              rateioTarget === "freight" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            Frete
                          </button>
                          <button
                            type="button"
                            onClick={() => openRateioAssistant("packaging")}
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                              rateioTarget === "packaging" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            Embalagem
                          </button>
                          <button
                            type="button"
                            onClick={() => openRateioAssistant("other")}
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                              rateioTarget === "other" ? "bg-primary text-primary-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            Outros
                          </button>
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
                              className="h-10 w-full bg-transparent px-2 text-xs font-bold text-foreground outline-none"
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
                                className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
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
                              className="h-10 w-full bg-transparent px-3 text-xs font-bold text-foreground outline-none"
                            />
                            <span className="pr-3 text-[11px] font-semibold text-muted-foreground select-none">un.</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={applyRateio}
                          disabled={!toNumber(rateioTotal) || !Number(rateioPieces)}
                          className="h-10 rounded-xl gradient-primary text-xs font-bold shadow-glow shrink-0 cursor-pointer active:scale-95 transition-all"
                        >
                          {toNumber(rateioTotal) > 0 && Number(rateioPieces) > 0 ? (
                            <>Aplicar {brl(toNumber(rateioTotal) / Math.max(1, Number(rateioPieces)))} / peça</>
                          ) : (
                            <>Calcular e Aplicar</>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Campo Frete com Botão Explícito */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">Frete por peça</Label>
                      <button
                        type="button"
                        onClick={() => openRateioAssistant("freight")}
                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 hover:bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary transition-all active:scale-95 cursor-pointer shadow-2xs"
                        title="Dividir o frete total pago pelo número de peças"
                      >
                        <Calculator className="size-3" />
                        <span>Dividir frete da nota</span>
                      </button>
                    </div>
                    <div className="relative flex items-center rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                      <span className="pl-3.5 text-xs font-bold text-muted-foreground select-none">R$</span>
                      <input
                        inputMode="decimal"
                        value={freight}
                        onChange={(e) => setFreight(e.target.value)}
                        placeholder="6,00"
                        className="h-11 w-full bg-transparent px-2 text-sm font-bold text-foreground outline-none"
                      />
                    </div>
                  </div>

                  {/* Campo Embalagem & Tag com Botão Explícito + Atalhos */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">Embalagem & Tag</Label>
                      <button
                        type="button"
                        onClick={() => openRateioAssistant("packaging")}
                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 hover:bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary transition-all active:scale-95 cursor-pointer shadow-2xs"
                        title="Dividir custo de embalagens pelo número de peças"
                      >
                        <Calculator className="size-3" />
                        <span>Dividir custo de tags</span>
                      </button>
                    </div>
                    <div className="relative flex items-center rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                      <span className="pl-3.5 text-xs font-bold text-muted-foreground select-none">R$</span>
                      <input
                        inputMode="decimal"
                        value={packaging}
                        onChange={(e) => setPackaging(e.target.value)}
                        placeholder="3,50"
                        className="h-11 w-full bg-transparent px-2 text-sm font-bold text-foreground outline-none"
                      />
                    </div>
                    {/* Atalhos Rápidos de Embalagem */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground">Atalhos:</span>
                      {[
                        { label: "Sacola + Tag (R$ 3,50)", val: "3,50" },
                        { label: "Caixa Sedex (R$ 5,00)", val: "5,00" },
                        { label: "Tag Simples (R$ 0,80)", val: "0,80" },
                      ].map((pr) => (
                        <button
                          key={pr.label}
                          type="button"
                          onClick={() => {
                            setPackaging(pr.val);
                            toast.success(`Embalagem definida como ${pr.label}`);
                          }}
                          className="rounded-md px-2 py-0.5 text-[10px] font-semibold bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary/80 cursor-pointer transition-all active:scale-95"
                        >
                          {pr.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campo Outros Custos com Botão Explícito */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">Outros custos por peça</Label>
                      <button
                        type="button"
                        onClick={() => openRateioAssistant("other")}
                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 hover:bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary transition-all active:scale-95 cursor-pointer shadow-2xs"
                        title="Dividir despesas extras pelo número de peças"
                      >
                        <Calculator className="size-3" />
                        <span>Dividir outros custos</span>
                      </button>
                    </div>
                    <div className="relative flex items-center rounded-xl border border-border/80 bg-card shadow-2xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
                      <span className="pl-3.5 text-xs font-bold text-muted-foreground select-none">R$</span>
                      <input
                        inputMode="decimal"
                        value={other}
                        onChange={(e) => setOther(e.target.value)}
                        placeholder="2,00"
                        className="h-11 w-full bg-transparent px-2 text-sm font-bold text-foreground outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Coluna da Direita: Bento Dashboard Operacional de Impacto (Padrão Apple Studio) */}
                <div className="flex flex-col justify-between rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-primary/5 p-5 shadow-soft space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Zap className="size-3.5 text-primary" />
                        <span>Impacto Operacional</span>
                      </span>
                      <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                        Por Peça
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="numeric text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                        +{brl(totalSharedCost)}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Custo operacional fixo somado a cada unidade da coleção
                      </p>
                    </div>

                    {/* Decomposição Visual com Porcentagens e Cores */}
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="size-2 rounded-full bg-primary" />
                          Frete Rateado
                        </span>
                        <span className="numeric font-bold text-foreground">
                          {brl(freightVal)} <span className="text-[10px] font-medium text-muted-foreground">({Math.round(freightPct)}%)</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          Embalagem & Tag
                        </span>
                        <span className="numeric font-bold text-foreground">
                          {brl(packagingVal)} <span className="text-[10px] font-medium text-muted-foreground">({Math.round(packagingPct)}%)</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="size-2 rounded-full bg-amber-500" />
                          Outros Custos
                        </span>
                        <span className="numeric font-bold text-foreground">
                          {brl(otherVal)} <span className="text-[10px] font-medium text-muted-foreground">({Math.round(otherPct)}%)</span>
                        </span>
                      </div>

                      {/* Multi-segment Progress Bar */}
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80 flex gap-0.5 mt-2.5">
                        {freightPct > 0 && (
                          <div
                            style={{ width: `${freightPct}%` }}
                            className="h-full bg-primary transition-all duration-300"
                            title={`Frete: ${Math.round(freightPct)}%`}
                          />
                        )}
                        {packagingPct > 0 && (
                          <div
                            style={{ width: `${packagingPct}%` }}
                            className="h-full bg-emerald-500 transition-all duration-300"
                            title={`Embalagem: ${Math.round(packagingPct)}%`}
                          />
                        )}
                        {otherPct > 0 && (
                          <div
                            style={{ width: `${otherPct}%` }}
                            className="h-full bg-amber-500 transition-all duration-300"
                            title={`Outros: ${Math.round(otherPct)}%`}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-card/80 border border-border/60 p-3 text-[11px] text-muted-foreground leading-relaxed">
                    💡 <strong>Visão CFO:</strong> Cada peça desta coleção já inicia com{" "}
                    <strong className="text-primary font-bold">{brl(totalSharedCost)}</strong> de despesa fixa antes do tecido.
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Taxas Fiscais e de Cartão com Controles Híbridos Studio */}
          <div className="grid gap-4 sm:grid-cols-2">
            <HybridTaxControl
              label="Imposto DAS / Simples (%)"
              hint="Alíquota aplicada sobre o faturamento de cada venda"
              value={tax}
              max={25}
              onChange={setTax}
              presets={[
                { label: "MEI (0%)", value: 0 },
                { label: "Simples F1 (4%)", value: 4 },
                { label: "Simples F2 (7%)", value: 7 },
                { label: "Simples F3 (10%)", value: 10 },
              ]}
            />
            <HybridTaxControl
              label="Taxa média de cartão (%)"
              hint="Taxa média ponderada descontada pelas maquininhas"
              value={cardRate}
              max={15}
              onChange={setCardRate}
              presets={[
                { label: "Pix (0%)", value: 0 },
                { label: "Débito (1.5%)", value: 1.5 },
                { label: "Crédito 1x (3.2%)", value: 3.2 },
                { label: "Parcelado (5.5%)", value: 5.5 },
              ]}
            />
          </div>
        </section>


        {/* ══════════════════════════════════════════════════════════════════
        {/* ══════════════════════════════════════════════════════════════════
            PASSO 2: CORES & TAMANHOS DA COLEÇÃO (A CONSOLE MESTRE DE PRECIFICAÇÃO)
        ══════════════════════════════════════════════════════════════════ */}
        {mode === "grade" && (
          <section className="panel p-6 sm:p-7 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                  2
                </span>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Cores & Tamanhos da Coleção</h2>
                  <p className="text-xs text-muted-foreground">
                    Cadastre suas cores e tamanhos, informe custos e defina preços por peça ou para a grade inteira
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
                  {actualLotUnits} {actualLotUnits === 1 ? "peça" : "peças"} no lote
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMatrixGenerator((prev) => !prev)}
                  className="h-8 rounded-full text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Wand2 className="size-3.5 mr-1.5" />
                  {showMatrixGenerator ? "Fechar Gerador" : "⚡ Gerador de Grade Rápida"}
                </Button>
              </div>
            </div>

            {/* Gerador de Matriz Expansível */}
            {showMatrixGenerator && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-4 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <Sparkles className="size-3.5" />
                    <span>Selecione tamanhos e cores para gerar a grade:</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {genSizes.length} tam. × {genColors.length} cores = {genSizes.length * genColors.length} peças
                  </Badge>
                </div>

                {/* Tamanhos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      1. Tamanhos:
                    </span>
                    <div className="flex gap-1">
                      {PRESET_OPTIONS.map((pr) => (
                        <button
                          key={pr.id}
                          type="button"
                          onClick={() => applyPreset(pr.id, pr.sizes)}
                          className={cn(
                            "rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-all",
                            activePreset === pr.id
                              ? "bg-primary text-primary-foreground border-transparent"
                              : "bg-card text-muted-foreground border-border hover:text-foreground",
                          )}
                        >
                          {pr.label.split(" ")[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "36", "38", "40", "42", "44", "46", "Único"].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => toggleGenSize(sz)}
                        className={cn(
                          "rounded-lg border px-3 py-1 text-xs font-bold transition-all",
                          genSizes.includes(sz)
                            ? "gradient-primary text-primary-foreground border-transparent shadow-xs"
                            : "bg-card text-muted-foreground border-border hover:text-foreground",
                        )}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cores */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    2. Cores:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {COLOR_PRESETS.map((cp) => (
                      <button
                        key={cp.name}
                        type="button"
                        onClick={() => toggleGenColor(cp.name)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                          genColors.includes(cp.name)
                            ? "bg-primary text-primary-foreground border-transparent font-semibold shadow-xs"
                            : "bg-card text-muted-foreground border-border hover:text-foreground",
                        )}
                      >
                        <span className={cn("size-2.5 rounded-full shadow-xs", getColorDot(cp.name))} />
                        <span>{cp.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={generateMatrix}
                  className="h-9 w-full rounded-xl gradient-primary text-xs font-bold shadow-glow"
                >
                  <Wand2 className="size-3.5 mr-2" /> Gerar Grade ({genSizes.length * genColors.length} peças)
                </Button>
              </div>
            )}

            {/* ── LISTA DE CORES COM A CONSOLE MESTRE DE CADA COR ── */}
            <div className="space-y-5">
              {colorGroups.map((group) => {
                const activeSizeSet = new Set(group.items.map((i) => i.size));
                const baseSizes = ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "36", "38", "40", "42", "44", "46", "Único"];
                const allKnownSizes = Array.from(new Set([...group.items.map((i) => i.size), ...baseSizes.slice(0, 6)]));
                const availableSizes = sortCanonicalSizes(allKnownSizes);

                return (
                  <div
                    key={group.color}
                    className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft space-y-4 transition-all duration-200 hover:border-primary/40"
                  >
                    {/* Cabeçalho da Cor */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("size-4 rounded-full shadow-xs shrink-0", getColorDot(group.color))} />
                        <span className="text-sm font-bold text-foreground uppercase tracking-wide">{group.color}</span>
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {group.items.length} {group.items.length === 1 ? "tamanho" : "tamanhos"} · {group.totalUnits || group.items.reduce((a, b) => a + (b.qty || 1), 0)} {(group.totalUnits || group.items.reduce((a, b) => a + (b.qty || 1), 0)) === 1 ? "peça" : "peças"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {group.avgPrice > 0 && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            Média da cor: <strong className="text-foreground">{brl(group.avgPrice)}</strong> (Margem <strong className={group.health.color}>{pct(group.avgMargin)}</strong>)
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeColor(group.color)}
                          className="size-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title={`Remover cor ${group.color}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    {/* Seletor de Tamanhos Ativos */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Tamanhos desta cor:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {availableSizes.map((sz) => {
                          const isActive = activeSizeSet.has(sz);
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => toggleColorSize(group.color, sz)}
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


                    {/* ══ BARRA DE ESTRATÉGIA PRO COM SMART PRECISION STEPPER (APPLE HIG) ══ */}
                    {group.items.length > 0 && (() => {
                      const cs = getColorStrategy(group.color);
                      return (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-secondary/30 px-3 py-2 text-xs shadow-2xs">
                          {/* LADO ESQUERDO: SELETOR DE MODO + CONTROLES ESPECÍFICOS DO MODO */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Abas de Modo (Margem / Markup / Preço) */}
                            <div className="inline-flex rounded-lg border border-border/80 bg-card p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setColorStrategy(group.color, { mode: "margin" });
                                  updateColorMargin(group.color, cs.margin);
                                }}
                                className={cn(
                                  "flex items-center justify-center gap-1 rounded-md py-1 px-2.5 text-[11px] font-bold transition-all cursor-pointer",
                                  cs.mode === "margin"
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                                )}
                              >
                                <Target className="size-3 shrink-0" />
                                <span>Margem</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setColorStrategy(group.color, { mode: "markup" });
                                  updateColorMarkup(group.color, cs.markup);
                                }}
                                className={cn(
                                  "flex items-center justify-center gap-1 rounded-md py-1 px-2.5 text-[11px] font-bold transition-all cursor-pointer",
                                  cs.mode === "markup"
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                                )}
                              >
                                <TrendingUp className="size-3 shrink-0" />
                                <span>Markup</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setColorStrategy(group.color, { mode: "direct_price" });
                                  if (cs.directPrice) updateColorDirectPrice(group.color, cs.directPrice);
                                }}
                                className={cn(
                                  "flex items-center justify-center gap-1 rounded-md py-1 px-2.5 text-[11px] font-bold transition-all cursor-pointer",
                                  cs.mode === "direct_price"
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                                )}
                              >
                                <Coins className="size-3 shrink-0" />
                                <span>Preço Fixo</span>
                              </button>
                            </div>

                            {/* Divisor vertical sutil */}
                            <div className="h-5 w-px bg-border/80 hidden sm:block" />

                            {/* CONTROLES DO MODO MARGEM */}
                            {cs.mode === "margin" && (
                              <div className="flex items-center gap-1.5">
                                {/* Stepper Tátil [- | 50% | +] */}
                                <div className="inline-flex items-center rounded-lg border border-border/80 bg-card p-0.5 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = typeof cs.margin === "number" ? cs.margin : (toNumber(cs.margin) || 50);
                                      const next = Math.max(1, Math.round(cur) - 1);
                                      updateColorMargin(group.color, next);
                                    }}
                                    className="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all text-xs font-bold cursor-pointer"
                                    title="Diminuir 1% na margem da cor"
                                  >
                                    <Minus className="size-3" />
                                  </button>
                                  <div className="flex items-center px-1.5">
                                    <input
                                      inputMode="decimal"
                                      value={cs.margin}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        if (/^[\d,\.]*$/.test(raw)) {
                                          updateColorMargin(group.color, raw);
                                        }
                                      }}
                                      onBlur={() => {
                                        const raw = String(cs.margin ?? "").trim();
                                        const n = toNumber(raw);
                                        if (raw === "" || isNaN(n) || n <= 0) {
                                          updateColorMargin(group.color, 50);
                                        } else {
                                          const clamped = Math.min(85, Math.max(1, n));
                                          updateColorMargin(group.color, String(clamped).replace(".", ","));
                                        }
                                      }}
                                      className="w-9 text-center text-xs font-bold outline-none bg-transparent text-primary"
                                    />
                                    <span className="text-[11px] font-semibold text-muted-foreground">%</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = typeof cs.margin === "number" ? cs.margin : (toNumber(cs.margin) || 50);
                                      const next = Math.min(85, Math.round(cur) + 1);
                                      updateColorMargin(group.color, next);
                                    }}
                                    className="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all text-xs font-bold cursor-pointer"
                                    title="Aumentar 1% na margem da cor"
                                  >
                                    <Plus className="size-3" />
                                  </button>
                                </div>

                                {/* Presets Rápidos */}
                                <div className="inline-flex rounded-lg border border-border/70 bg-card p-0.5 shadow-2xs">
                                  {[30, 40, 50, 60, 70].map((m) => (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => updateColorMargin(group.color, m)}
                                      className={cn(
                                        "rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-all cursor-pointer",
                                        toNumber(cs.margin) === m
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

                            {/* CONTROLES DO MODO MARKUP */}
                            {cs.mode === "markup" && (() => {
                              const sampleCost = group.avgCost || 50;
                              const mkNum = typeof cs.markup === "number" ? cs.markup : (toNumber(cs.markup) || 100);
                              const samplePrice = sampleCost * (1 + mkNum / 100);
                              const deductions = samplePrice * ((tax + cardRate) / 100);
                              const sampleProfit = samplePrice - sampleCost - deductions;
                              const realNetMargin = samplePrice > 0 ? (sampleProfit / samplePrice) * 100 : 0;
                              const health = getMarginHealth(realNetMargin);

                              return (
                                <div className="flex items-center gap-1.5">
                                  {/* Stepper Tátil [- | 100% | +] */}
                                  <div className="inline-flex items-center rounded-lg border border-border/80 bg-card p-0.5 shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cur = typeof cs.markup === "number" ? cs.markup : (toNumber(cs.markup) || 100);
                                        const next = Math.max(1, Math.round(cur) - 5);
                                        updateColorMarkup(group.color, next);
                                      }}
                                      className="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all text-xs font-bold cursor-pointer"
                                      title="Diminuir 5% no markup da cor"
                                    >
                                      <Minus className="size-3" />
                                    </button>
                                    <div className="flex items-center px-1.5">
                                      <input
                                        inputMode="decimal"
                                        value={cs.markup}
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          if (/^[\d,\.]*$/.test(raw)) {
                                            updateColorMarkup(group.color, raw);
                                          }
                                        }}
                                        onBlur={() => {
                                          const raw = String(cs.markup ?? "").trim();
                                          const n = toNumber(raw);
                                          if (raw === "" || isNaN(n) || n <= 0) {
                                            updateColorMarkup(group.color, 100);
                                          } else {
                                            const clamped = Math.min(300, Math.max(1, n));
                                            updateColorMarkup(group.color, String(clamped).replace(".", ","));
                                          }
                                        }}
                                        className="w-9 text-center text-xs font-bold outline-none bg-transparent text-primary"
                                      />
                                      <span className="text-[11px] font-semibold text-muted-foreground">%</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const cur = typeof cs.markup === "number" ? cs.markup : (toNumber(cs.markup) || 100);
                                        const next = Math.min(300, Math.round(cur) + 5);
                                        updateColorMarkup(group.color, next);
                                      }}
                                      className="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all text-xs font-bold cursor-pointer"
                                      title="Aumentar 5% no markup da cor"
                                    >
                                      <Plus className="size-3" />
                                    </button>
                                  </div>

                                  {/* Presets Rápidos Markup */}
                                  <div className="inline-flex rounded-lg border border-border/70 bg-card p-0.5 shadow-2xs">
                                    {[60, 80, 100, 120, 150].map((mk) => (
                                      <button
                                        key={mk}
                                        type="button"
                                        onClick={() => updateColorMarkup(group.color, mk)}
                                        className={cn(
                                          "rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-all cursor-pointer",
                                          toNumber(cs.markup) === mk
                                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                                        )}
                                      >
                                        {mk}%
                                      </button>
                                    ))}
                                  </div>

                                  {/* Transparência Financeira: Margem Real resultante */}
                                  <span
                                    className={cn("text-[11px] font-bold px-2 py-0.5 rounded-md bg-card border border-border/70 shadow-2xs whitespace-nowrap", health.color)}
                                    title="Margem líquida real que sobra no bolso após custos, impostos e taxas de cartão"
                                  >
                                    Margem: {pct(realNetMargin)}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* CONTROLES DO MODO PREÇO FIXO */}
                            {cs.mode === "direct_price" && (
                              <div className="flex items-center gap-1.5">
                                {/* Stepper de Moeda [-R$1 | R$ 139,90 | +R$1] */}
                                <div className="inline-flex items-center rounded-lg border border-border/80 bg-card p-0.5 shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = toNumber(cs.directPrice) || group.avgPrice || 100;
                                      const next = Math.max(1, current - 1);
                                      updateColorDirectPrice(group.color, next.toFixed(2).replace(".", ","));
                                    }}
                                    className="px-2 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all text-[10px] font-bold cursor-pointer"
                                    title="Diminuir R$ 1,00 no preço da cor"
                                  >
                                    -R$1
                                  </button>
                                  <div className="flex items-center px-1.5">
                                    <span className="text-[11px] text-muted-foreground mr-0.5 font-semibold">R$</span>
                                    <input
                                      inputMode="decimal"
                                      value={cs.directPrice}
                                      onChange={(e) => updateColorDirectPrice(group.color, e.target.value)}
                                      placeholder={group.items[0]?.customSalePrice || group.items[0]?.suggestedPrice?.toFixed(2)?.replace(".", ",") || "139,90"}
                                      className="w-14 text-center text-xs font-bold outline-none bg-transparent text-primary"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = toNumber(cs.directPrice) || group.avgPrice || 100;
                                      const next = current + 1;
                                      updateColorDirectPrice(group.color, next.toFixed(2).replace(".", ","));
                                    }}
                                    className="px-2 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-90 transition-all text-[10px] font-bold cursor-pointer"
                                    title="Aumentar R$ 1,00 no preço da cor"
                                  >
                                    +R$1
                                  </button>
                                </div>

                                {/* Terminações Psicológicas de Moda (,90 / ,00 / ,50) */}
                                <div className="inline-flex rounded-lg border border-border/70 bg-card p-0.5 shadow-2xs">
                                  {[",90", ",00", ",50"].map((ending) => (
                                    <button
                                      key={ending}
                                      type="button"
                                      onClick={() => {
                                        const current = cs.directPrice || group.items[0]?.customSalePrice || group.items[0]?.suggestedPrice?.toFixed(2)?.replace(".", ",") || "139,90";
                                        const integerPart = Math.floor(toNumber(current));
                                        const newPrice = `${integerPart}${ending}`;
                                        updateColorDirectPrice(group.color, newPrice);
                                      }}
                                      className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer"
                                      title={`Terminar em ${ending}`}
                                    >
                                      {ending}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* LADO DIREITO: BOTÃO DE AÇÃO */}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => applyStrategyToColor(group.color)}
                            className="h-7.5 rounded-lg px-3 text-[11px] font-bold gradient-primary shadow-glow shrink-0 active:scale-95 transition-all cursor-pointer ml-auto"
                          >
                            <Zap className="size-3 mr-1" />
                            Aplicar à Cor
                          </Button>
                        </div>
                      );
                    })()}

                    {/* ── TABELA VIVA INTEGRADA: CUSTO + PREÇO + MARGEM NA MESMA LINHA ── */}
                    {group.items.length > 0 && (
                      <div className="rounded-xl border border-border/80 bg-secondary/20 overflow-hidden shadow-2xs">
                        {/* Cabeçalho da Tabela */}
                        <div className="grid grid-cols-[45px_65px_1fr_1fr_1.1fr_1fr_1.1fr] items-center gap-2.5 px-3.5 py-2.5 bg-secondary/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60">
                          <span>Tam.</span>
                          <span>Qtd</span>
                          <span>Custo Atacado</span>
                          <span>Custo Real</span>
                          <span>Preço Venda</span>
                          <span>Margem Real</span>
                          <span className="text-right">Lucro Líquido</span>
                        </div>

                        {/* Linhas de Cada Tamanho */}
                        <div className="divide-y divide-border/50 bg-card">
                          {group.items.map((v) => (
                            <div
                              key={v.id}
                              className="grid grid-cols-[45px_65px_1fr_1fr_1.1fr_1fr_1.1fr] items-center gap-2.5 px-3.5 py-3 text-xs hover:bg-secondary/20 transition-colors"
                            >
                              {/* Tamanho */}
                              <div className="flex items-center gap-1">
                                <span className="size-6 flex items-center justify-center rounded-lg bg-secondary font-bold text-foreground text-xs shadow-xs">
                                  {v.size}
                                </span>
                                {(v.isCustomCost || v.isCustomPrice) && (
                                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-1 py-0.2 rounded" title="Valor personalizado para este tamanho">
                                    ✦
                                  </span>
                                )}
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

                              {/* Margem Real (Clean e Elegante) */}
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
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {group.items.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border/80 bg-secondary/20 p-5 text-center space-y-1">
                        <p className="text-xs font-semibold text-foreground">Nenhum tamanho selecionado para {group.color}</p>
                        <p className="text-[11px] text-muted-foreground">Clique nos botões de tamanho acima (PP, P, M, G...) para incluir na grade.</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── CARD BENTO DE ADIÇÃO DE CORES: SPOTLIGHT AUTOCOMPLETE + PALETA TÁTIL (APPLE HIG) ── */}
              <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-soft space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6.5 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-2xs">
                      <Sparkles className="size-3.5" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Adicionar Cores à Grade</h3>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    Busque na biblioteca de moda ou digite uma cor personalizada
                  </span>
                </div>

                {/* Campo Spotlight com Popover */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <input
                      ref={colorInputRef}
                      value={colorSearchQuery}
                      onChange={(e) => {
                        setColorSearchQuery(e.target.value);
                        setShowColorPopover(true);
                      }}
                      onFocus={() => setShowColorPopover(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (matchingColorPresets.length > 0 && matchingColorPresets[0]) {
                            handleSelectColorFromSpotlight(matchingColorPresets[0].name);
                          } else if (colorSearchQuery.trim()) {
                            handleCreateCustomColorFromSpotlight();
                          }
                        } else if (e.key === "Escape") {
                          setShowColorPopover(false);
                        }
                      }}
                      placeholder="Buscar ou cadastrar cor (ex: Terracota, Nude, Jeans, Fúcsia, Verde Oliva...)"
                      className="h-10.5 w-full rounded-xl border border-border/80 bg-secondary/30 pl-10 pr-26 text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
                    />
                    {colorSearchQuery.trim() && (
                      <button
                        type="button"
                        onClick={handleCreateCustomColorFromSpotlight}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7.5 rounded-lg gradient-primary px-3 text-[11px] font-bold text-white shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        + Adicionar
                      </button>
                    )}
                  </div>

                  {/* Menu Dropdown Spotlight Autocomplete de Cores */}
                  {showColorPopover && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setShowColorPopover(false)}
                      />
                      <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-border/80 bg-card p-2 shadow-xl animate-in fade-in-50 zoom-in-95 space-y-1">
                        {matchingColorPresets.length > 0 && (
                          <>
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              🎨 Cores Sugeridas da Moda ({matchingColorPresets.length})
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                              {matchingColorPresets.map((cp) => (
                                <button
                                  key={cp.name}
                                  type="button"
                                  onClick={() => handleSelectColorFromSpotlight(cp.name)}
                                  className="flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium transition-all hover:bg-primary-soft/60 hover:text-primary active:scale-98 cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={cn("size-3.5 rounded-full shadow-xs shrink-0", getColorDot(cp.name))} />
                                    <span className="truncate font-semibold text-foreground">{cp.name}</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                                    + Incluir
                                  </span>
                                </button>
                              ))}
                            </div>
                            <div className="my-1.5 h-px bg-border/60" />
                          </>
                        )}

                        {/* Atalho Inteligente para Cadastrar Cor Personalizada */}
                        {colorSearchQuery.trim() ? (
                          <button
                            type="button"
                            onClick={handleCreateCustomColorFromSpotlight}
                            className="flex w-full items-center justify-between gap-2 rounded-xl bg-primary/10 border border-primary/30 px-3.5 py-2.5 text-left text-xs font-bold text-primary transition-all hover:bg-primary/20 active:scale-98 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Plus className="size-4 shrink-0" />
                              <span>Cadastrar e adicionar <strong className="underline decoration-primary">"{colorSearchQuery.trim()}"</strong> à grade</span>
                            </div>
                            <span className="rounded-md bg-primary text-white text-[10px] px-2 py-0.5 shadow-2xs">
                              Enter ↵
                            </span>
                          </button>
                        ) : matchingColorPresets.length === 0 ? (
                          <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                            Digite o nome de uma cor para cadastrar
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>

                {/* Sugestões Rápidas em Pílulas Táteis */}
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    ✨ Sugestões Rápidas:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {COLOR_PRESETS.filter(
                      (cp) => !activeColors.some((ac) => ac.toLowerCase() === cp.name.toLowerCase()),
                    ).slice(0, 10).map((cp) => (
                      <button
                        key={cp.name}
                        type="button"
                        onClick={() => addQuickColor(cp.name)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-secondary/30 px-3 py-1 text-xs font-semibold text-foreground hover:border-primary hover:bg-primary/5 hover:text-primary transition-all shadow-2xs active:scale-95 cursor-pointer"
                      >
                        <span className={cn("size-2.5 rounded-full shadow-2xs", getColorDot(cp.name))} />
                        <span>+ {cp.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PASSO 3: RESUMO EXECUTIVO DO LOTE & FECHAMENTO (OU RESULTADO MODO RÁPIDO)
        ══════════════════════════════════════════════════════════════════ */}
        <section className="panel p-6 sm:p-7 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                {mode === "rapida" ? "2" : "3"}
              </span>
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  {mode === "rapida" ? "Estratégia, Resultado & Fechamento" : "Resumo Executivo do Lote & Fechamento"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mode === "rapida"
                    ? "Defina a meta de lucro desejada e confira o fechamento da peça"
                    : "Visão consolidada do lote — faturamento potencial, investimento total e ponto de equilíbrio"}
                </p>
              </div>
            </div>

            {summaryPrices.avgSuggested > 0 && (
              <div className="text-right">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Margem Real</span>
                <span className={cn("numeric text-base font-bold", summaryPrices.marginHealth.color)}>
                  {pct(summaryPrices.avgMargin)}
                </span>
              </div>
            )}
          </div>

          {/* Estratégia para o Modo Rápido */}
          {mode === "rapida" && (
            <div className="space-y-4 rounded-2xl border border-border/80 bg-secondary/30 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Estratégia de Precificação da Peça:
                </Label>
              </div>

              {/* Pílulas de Seleção de Estratégia */}
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-1.5 max-w-md sm:max-w-lg shadow-xs">
                <button
                  type="button"
                  onClick={() => setStrategy("margin")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all",
                    strategy === "margin"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                >
                  <Target className="size-3.5 shrink-0" />
                  <span className="truncate">Margem Real %</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStrategy("markup")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all",
                    strategy === "markup"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                >
                  <TrendingUp className="size-3.5 shrink-0" />
                  <span className="truncate">Markup %</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStrategy("direct_price")}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all",
                    strategy === "direct_price"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                >
                  <Coins className="size-3.5 shrink-0" />
                  <span className="truncate">Preço Fixo R$</span>
                </button>
              </div>

              {/* Controle Ativo da Estratégia */}
              <div className="pt-1">
                {strategy === "margin" && (
                  <SliderRow
                    label="Margem de Lucro Líquida Alvo (% sobre o preço de venda)"
                    value={desiredMargin}
                    max={85}
                    onChange={setDesiredMargin}
                    display={pct(desiredMargin)}
                    hint="Calcula o preço garantindo a margem líquida no bolso após custos e impostos."
                  />
                )}
                {strategy === "markup" && (
                  <SliderRow
                    label="Markup Desejado (% sobre o custo total)"
                    value={markup}
                    max={300}
                    onChange={setMarkup}
                    display={pct(markup)}
                    hint="Multiplicador direto sobre o custo total da peça."
                  />
                )}
                {strategy === "direct_price" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">
                        Preço de Venda Desejado (R$)
                      </Label>
                      <span className="text-xs font-bold text-primary numeric">
                        Margem resultante: {pct(summaryPrices.avgMargin)}
                      </span>
                    </div>
                    <Input
                      inputMode="decimal"
                      value={directSalePrice}
                      onChange={(e) => setDirectSalePrice(e.target.value)}
                      placeholder="119,90"
                      className="h-11 rounded-xl font-bold text-sm bg-card border-primary/30 text-primary shadow-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── RECIBO EXECUTIVO MASTER & FECHAMENTO DO LOTE ── */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card p-6 space-y-5 shadow-soft">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] items-center">
              {/* Lado Esquerdo do Recibo: Preço Hero & Composição */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                    Preço de Venda Sugerido
                  </span>
                  {summaryPrices.hasMultiple ? (
                    <div>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="numeric text-3xl font-bold tracking-tight text-foreground">
                          {brl(summaryPrices.minSuggested)}
                        </span>
                        <span className="text-muted-foreground font-light text-xl">–</span>
                        <span className="numeric text-3xl font-bold tracking-tight text-foreground">
                          {brl(summaryPrices.maxSuggested)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Faixa de preço para as {actualLotUnits} peças da coleção
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="numeric text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        {brl(summaryPrices.avgSuggested)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Lucro líquido médio de <strong className="text-foreground">{brl(summaryPrices.avgProfit)}</strong> por peça
                      </p>
                    </div>
                  )}
                </div>

                {/* Barra de Composição Limpa */}
                {summaryPrices.avgSuggested > 0 && (() => {
                  const price = summaryPrices.avgSuggested;
                  const cost = summaryPrices.avgCost;
                  const profit = summaryPrices.avgProfit;
                  const taxes = price - cost - profit;
                  const costPct = Math.max((cost / price) * 100, 0);
                  const taxPct = Math.max((taxes / price) * 100, 0);
                  const profitPct = Math.max((profit / price) * 100, 0);
                  return (
                    <div className="space-y-1.5 pt-1 border-t border-border/50">
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full gap-0.5 bg-secondary">
                        <div className="bg-foreground/30 rounded-l-full" style={{ width: `${costPct}%` }} title={`Custo: ${Math.round(costPct)}%`} />
                        <div className="bg-warning/70" style={{ width: `${taxPct}%` }} title={`Impostos: ${Math.round(taxPct)}%`} />
                        <div className="bg-success rounded-r-full" style={{ width: `${profitPct}%` }} title={`Lucro: ${Math.round(profitPct)}%`} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-foreground/30" />Custo {Math.round(costPct)}%</span>
                        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-warning/70" />Taxas {Math.round(taxPct)}%</span>
                        <span className="flex items-center gap-1 font-semibold text-success"><span className="size-1.5 rounded-full bg-success" />Lucro {Math.round(profitPct)}%</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Lado Direito do Recibo: 3 Métricas e Cobertura */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border/70 bg-card p-2.5 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Margem Média</p>
                    <p className={cn("numeric mt-0.5 text-sm font-bold", summaryPrices.marginHealth.color)}>
                      {pct(summaryPrices.avgMargin)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-2.5 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lucro Médio</p>
                    <p className="numeric mt-0.5 text-sm font-bold text-foreground">
                      {brl(summaryPrices.avgProfit)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-2.5 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Markup Médio</p>
                    <p className="numeric mt-0.5 text-sm font-bold text-foreground">
                      {pct(summaryPrices.avgMarkup)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground leading-relaxed border border-border/60">
                  Vendendo <strong className="text-foreground">{lotBreakEven.unitsToBreakEven} {lotBreakEven.unitsToBreakEven === 1 ? "peça" : "peças"}</strong> você quita todo o custo do lote ({brl(lotBreakEven.totalLotCost)}). {Math.max(actualLotUnits - lotBreakEven.unitsToBreakEven, 0) > 0 ? `As outras ${Math.max(actualLotUnits - lotBreakEven.unitsToBreakEven, 0)} são 100% lucro líquido.` : 'Lote quitado com margem saudável.'}
                </div>
              </div>
            </div>

            {/* Ações Finais */}
            <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
              {mode === "rapida" ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => save.mutate()}
                    disabled={save.isPending}
                    className="h-11 rounded-xl text-xs font-semibold"
                  >
                    <Save className="mr-1.5 size-3.5" /> Salvar no Histórico
                  </Button>
                  <Button
                    type="button"
                    onClick={promoteToGrade}
                    className="h-11 rounded-xl gradient-primary font-bold shadow-glow transition-all active:scale-[0.98]"
                  >
                    <Layers className="mr-2 size-4" /> Expandir para Grade Completa
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => save.mutate()}
                    disabled={save.isPending}
                    className="h-11 rounded-xl text-xs font-semibold"
                  >
                    <Save className="mr-1.5 size-3.5" /> Salvar no Histórico
                  </Button>
                  <Button
                    type="button"
                    onClick={openEntryForCurrent}
                    className="h-11 rounded-xl gradient-primary font-bold shadow-glow transition-all active:scale-[0.98]"
                  >
                    <PackagePlus className="mr-2 size-4" /> Dar Entrada no Estoque
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
{/* ── Peças Precificadas (Histórico & Ficha de Entrada) ─────── */}
      <section className="panel p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Peças precificadas</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Consulte seu histórico de cálculos e dê entrada no Estoque a qualquer momento.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full">
            {saved.length} {saved.length === 1 ? "peça" : "peças"}
          </Badge>
        </div>

        {saved.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<Calculator className="size-6" />}
            title="Nenhuma peça salva"
            description="Calcule e salve suas precificações para consultar depois na hora de etiquetar e dar entrada no estoque."
          />
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="pb-3 font-semibold">Peça</th>
                  <th className="pb-3 font-semibold">Custo real</th>
                  <th className="pb-3 font-semibold">Margem Real</th>
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
                  });
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-secondary/40">
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
            <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
              <Boxes className="size-4" /> Ficha de Entrada no Estoque
            </div>
            <SheetTitle className="text-xl font-bold">{entryName || "Nova Peça"}</SheetTitle>
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Cor(es)</Label>
              <Input
                value={entryColor}
                onChange={(e) => setEntryColor(e.target.value)}
                placeholder="Ex: Off-White, Preto"
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Fornecedor</Label>
              <Input
                value={entrySupplier}
                onChange={(e) => setEntrySupplier(e.target.value)}
                placeholder="Ex: Brás Moda"
                className="h-10 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Grade de Quantidades Recebidas */}
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

          {/* Card Resumo Financeiro do Lote */}
          <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Custo Unitário Calculado:</span>
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
          </div>

          {/* Botão de Confirmação */}
          <Button
            type="button"
            className="h-12 w-full rounded-xl gradient-primary font-semibold shadow-glow"
            disabled={confirmEntryMutation.isPending || entryTotalUnits <= 0}
            onClick={() => confirmEntryMutation.mutate()}
          >
            <PackagePlus className="mr-2 size-4" /> Confirmar Entrada no Estoque
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
  // sem travar o campo em estados intermediários como "3," ou "3."
  const [rawValue, setRawValue] = useState<string>(String(value));

  // Sincroniza rawValue quando o valor externo muda (ex: slider ou preset)
  const displayVal = rawValue;
  const syncExternal = (newVal: number) => {
    setRawValue(String(newVal));
  };

  return (
    <div className="space-y-2 rounded-2xl border border-border/80 bg-secondary/20 p-4 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <Label className="text-xs font-bold text-foreground">{label}</Label>
          {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
        </div>

        {/* Pílula de Controle Triplo Apple: [ − ] valor% [ + ] */}
        <div className="flex items-center overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xs">
          {/* Botão Decremento — step 1 */}
          <button
            type="button"
            disabled={value <= 0}
            onClick={() => {
              const next = Math.max(0, Math.round(value) - 1);
              onChange(next);
              setRawValue(String(next));
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center border-r border-border/60 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
            aria-label="Diminuir"
          >
            <Minus className="size-3" />
          </button>

          {/* Campo Central — aceita vírgula e ponto, trava no min/max só no blur */}
          <div className="flex items-center px-2.5 py-1">
            <input
              inputMode="decimal"
              value={displayVal}
              onChange={(e) => {
                // Permite digitação livre incluindo vírgula como separador decimal
                const raw = e.target.value.replace(",", ".");
                setRawValue(e.target.value); // mantém o que o usuário digitou (com vírgula)
                const n = parseFloat(raw);
                if (!isNaN(n)) {
                  onChange(Math.min(max, Math.max(0, n)));
                } else if (e.target.value === "" || e.target.value === "0") {
                  onChange(0);
                }
                // se for "3," ou "3." (incompleto) não faz nada — aguarda mais dígitos
              }}
              onBlur={(e) => {
                // No blur: sanitiza e formata o valor final
                const raw = e.target.value.replace(",", ".");
                const n = parseFloat(raw);
                if (!isNaN(n)) {
                  const clamped = Math.min(max, Math.max(0, n));
                  onChange(clamped);
                  setRawValue(String(clamped));
                } else {
                  onChange(0);
                  setRawValue("0");
                }
              }}
              className="w-10 text-center text-xs font-bold text-primary outline-none bg-transparent"
            />
            <span className="text-xs font-bold text-muted-foreground">%</span>
          </div>

          {/* Botão Incremento — step 1 */}
          <button
            type="button"
            disabled={value >= max}
            onClick={() => {
              const next = Math.min(max, Math.round(value) + 1);
              onChange(next);
              setRawValue(String(next));
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center border-l border-border/60 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
            aria-label="Aumentar"
          >
            <Plus className="size-3" />
          </button>
        </div>
      </div>

      {/* Slider Suave com precisão de 0.1% */}
      <Slider
        className="pt-1.5"
        value={[value]}
        max={max}
        step={0.1}
        onValueChange={(v) => {
          const next = v[0] ?? 0;
          onChange(next);
          syncExternal(next);
        }}
      />

      {/* Chips Rápidos de Mercado (Presets) */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-semibold text-muted-foreground mr-1">Atalhos:</span>
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                onChange(p.value);
                syncExternal(p.value);
              }}
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all cursor-pointer",
                Math.abs(value - p.value) < 0.05
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-secondary/60",
              )}
            >
              {p.label}
            </button>
          ))}
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
        {display && <span className="numeric text-sm font-bold text-primary">{display}</span>}
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
