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

export type VariantRow = {
  id: string;
  size: string;
  color: string;
  wholesaleCost: string; // custom cost string or "" (inherits baseWholesaleGrade)
  customSalePrice: string; // custom sale price string or "" (calculated by strategy)
};

const PRESET_OPTIONS = [
  { id: "letras", label: "Padrão (PP–GG)", sizes: ["PP", "P", "M", "G", "GG"] },
  { id: "numeros", label: "Numérica (36–46)", sizes: ["36", "38", "40", "42", "44", "46"] },
  { id: "plus", label: "Plus Size (GG–G3)", sizes: ["GG", "G1", "G2", "G3"] },
  { id: "calcas", label: "Jeans (34–48)", sizes: ["34", "36", "38", "40", "42", "44", "46", "48"] },
];

const COLOR_PRESETS = [
  { name: "Off-White", color: "#F8F6F0" },
  { name: "Preto", color: "#1A1A1A" },
  { name: "Areia", color: "#D8C7B5" },
  { name: "Terracota", color: "#C86D51" },
  { name: "Verde Oliva", color: "#556B2F" },
  { name: "Azul Marinho", color: "#1B2A4A" },
  { name: "Rosa Seco", color: "#D4A5A5" },
  { name: "Marsala", color: "#651C32" },
];

function getColorDot(col: string): string {
  const normalized = col.toLowerCase().trim();
  if (normalized.includes("branco") || normalized.includes("white")) return "bg-[#F8F6F0] border border-border";
  if (normalized.includes("preto") || normalized.includes("black")) return "bg-[#1A1A1A]";
  if (normalized.includes("areia") || normalized.includes("bege") || normalized.includes("nude")) return "bg-[#D8C7B5]";
  if (normalized.includes("terracota") || normalized.includes("caramelo") || normalized.includes("telha")) return "bg-[#C86D51]";
  if (normalized.includes("verde") || normalized.includes("militar") || normalized.includes("oliva")) return "bg-[#556B2F]";
  if (normalized.includes("azul") || normalized.includes("marinho") || normalized.includes("jeans")) return "bg-[#1B2A4A]";
  if (normalized.includes("rosa") || normalized.includes("pink") || normalized.includes("rose")) return "bg-[#D4A5A5]";
  if (normalized.includes("vermelho") || normalized.includes("vinho") || normalized.includes("marsala")) return "bg-[#651C32]";
  if (normalized.includes("cinza") || normalized.includes("grafite") || normalized.includes("mescla")) return "bg-[#707070]";
  if (normalized.includes("amarelo") || normalized.includes("mostarda")) return "bg-[#D4AF37]";
  if (normalized.includes("marrom") || normalized.includes("chocolate")) return "bg-[#5C4033]";
  if (normalized.includes("lilas") || normalized.includes("lavanda") || normalized.includes("roxo")) return "bg-[#8A6FDF]";
  return "bg-primary/40 border border-primary/20";
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

  // ── Modo 1: Precificação Rápida ───────────────────────────────────
  const [wholesale, setWholesale] = useState("49,90");

  // ── Modo 2: Grade Detalhada de Variantes ──────────────────────────
  const [baseWholesaleGrade, setBaseWholesaleGrade] = useState("49,90");

  // Lista Unificada de Variantes (SKUs)
  const [variants, setVariants] = useState<VariantRow[]>([
    { id: "v-p-off", size: "P", color: "Off-White", wholesaleCost: "", customSalePrice: "" },
    { id: "v-m-off", size: "M", color: "Off-White", wholesaleCost: "", customSalePrice: "" },
    { id: "v-m-preto", size: "M", color: "Preto", wholesaleCost: "", customSalePrice: "" },
    { id: "v-g-preto", size: "G", color: "Preto", wholesaleCost: "", customSalePrice: "" },
    { id: "v-gg-preto", size: "GG", color: "Preto", wholesaleCost: "", customSalePrice: "" },
  ]);

  // Seletor de geração rápida da grade
  const [genSizes, setGenSizes] = useState<string[]>(["P", "M", "G", "GG"]);
  const [genColors, setGenColors] = useState<string[]>(["Off-White", "Preto"]);
  const [activePreset, setActivePreset] = useState<string>("letras");
  const [customGenColor, setCustomGenColor] = useState("");
  const [showMatrixGenerator, setShowMatrixGenerator] = useState(false);
  const [editingColorOverride, setEditingColorOverride] = useState<string | null>(null);
  const [newCustomColor, setNewCustomColor] = useState("");

  // Inserção manual no rodapé da tabela
  const [manualSize, setManualSize] = useState("M");
  const [manualColor, setManualColor] = useState("Off-White");
  const [manualCost, setManualCost] = useState("");

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

  // ── Cálculo da Tabela Unificada de Variantes ───────────────────────
  const variantResults = useMemo(() => {
    const baseNum = toNumber(baseWholesaleGrade);
    return variants.map((v) => {
      const hasCustomCost = v.wholesaleCost !== undefined && v.wholesaleCost !== "" && toNumber(v.wholesaleCost) > 0;
      const wholesaleNum = hasCustomCost ? toNumber(v.wholesaleCost) : baseNum;
      const res = calculateItem(wholesaleNum, v.customSalePrice);
      return {
        ...v,
        wholesaleNum,
        isCustomCost: hasCustomCost && wholesaleNum !== baseNum,
        ...res,
      };
    });
  }, [variants, baseWholesaleGrade, calculateItem]);

  // ── Resumo Geral de Preços (Faixas e Médias) ───────────────────────
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
        marginHealth: getMarginHealth(0),
        hasMultiple: variants.length > 1,
      };
    }

    const prices = valid.map((v) => v.suggestedPrice);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const avgP = prices.reduce((a, b) => a + b, 0) / prices.length;
    const avgProf = valid.reduce((a, b) => a + b.profit, 0) / valid.length;
    const avgC = valid.reduce((a, b) => a + b.realCost, 0) / valid.length;
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

  // ── Ponto de Cobertura do Lote (Break-Even) ─────────────────────────
  const lotBreakEven = useMemo(() => {
    return computeLotBreakEven(
      summaryPrices.avgSuggested,
      summaryPrices.avgCost,
      lotUnits,
      tax,
      cardRate,
    );
  }, [summaryPrices.avgSuggested, summaryPrices.avgCost, lotUnits, tax, cardRate]);

  // ── Agrupamento por Cor (Fashion Matrix) ─────────────────────────
  const colorGroups = useMemo(() => {
    const map = new Map<string, typeof variantResults>();
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
      avgPrice: number;
      avgCost: number;
      avgProfit: number;
      avgMargin: number;
      health: MarginHealth;
    }[] = [];

    map.forEach((items, color) => {
      const avgPrice = items.reduce((a, b) => a + b.suggestedPrice, 0) / items.length;
      const avgCost = items.reduce((a, b) => a + b.realCost, 0) / items.length;
      const avgProfit = items.reduce((a, b) => a + b.profit, 0) / items.length;
      const avgMargin = avgPrice > 0 ? (avgProfit / avgPrice) * 100 : 0;
      groups.push({
        color,
        items,
        totalItems: items.length,
        avgPrice,
        avgCost,
        avgProfit,
        avgMargin,
        health: getMarginHealth(avgMargin),
      });
    });

    return groups;
  }, [variantResults]);

  // ── Ações de Manipulação da Grade por Cor & Tamanho ──────────────
  const toggleColorSize = (color: string, size: string) => {
    const existing = variants.find(
      (v) => v.color.toLowerCase() === color.toLowerCase() && v.size.toUpperCase() === size.toUpperCase(),
    );

    if (existing) {
      if (variants.length <= 1) {
        toast.error("Mantenha ao menos um tamanho na grade");
        return;
      }
      setVariants((prev) => prev.filter((v) => v.id !== existing.id));
      toast.success(`Tamanho ${size} removido da cor ${color}`);
    } else {
      const newId = `v-${size.toLowerCase()}-${color.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`;
      setVariants((prev) => [
        ...prev,
        {
          id: newId,
          size: size.toUpperCase(),
          color: color,
          wholesaleCost: "",
          customSalePrice: "",
        },
      ]);
      toast.success(`Tamanho ${size} adicionado à cor ${color}!`);
    }
  };

  const removeColor = (color: string) => {
    const remaining = variants.filter((v) => v.color.toLowerCase() !== color.toLowerCase());
    if (remaining.length === 0) {
      toast.error("Mantenha ao menos uma cor na grade");
      return;
    }
    setVariants(remaining);
    toast.success(`Cor "${color}" removida da grade`);
  };

  const addQuickColor = (colorName: string) => {
    const clean = colorName.trim();
    if (!clean) return;
    const exists = colorGroups.some((g) => g.color.toLowerCase() === clean.toLowerCase());
    if (exists) {
      toast.error(`A cor "${clean}" já está na grade`);
      return;
    }

    // Pega os tamanhos mais comuns já presentes na grade ou padrão PP-GG
    const currentSizes = Array.from(new Set(variants.map((v) => v.size)));
    const sizesToUse = currentSizes.length > 0 ? currentSizes : ["P", "M", "G", "GG"];

    const newRows: VariantRow[] = sizesToUse.map((sz) => ({
      id: `v-${sz.toLowerCase()}-${clean.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`,
      size: sz,
      color: clean,
      wholesaleCost: "",
      customSalePrice: "",
    }));

    setVariants((prev) => [...prev, ...newRows]);
    toast.success(`Cor "${clean}" adicionada com os tamanhos ${sizesToUse.join(", ")}!`);
  };

  const addCustomColor = () => {
    const clean = newCustomColor.trim();
    if (!clean) return;
    addQuickColor(clean);
    setNewCustomColor("");
  };

  // ── Ações de Manipulação da Tabela de Variantes ────────────────────
  const removeVariant = (id: string) => {
    if (variants.length <= 1) {
      toast.error("Mantenha ao menos uma variante na lista");
      return;
    }
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const updateVariantCost = (id: string, val: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, wholesaleCost: val } : v)),
    );
  };

  const updateVariantPrice = (id: string, val: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, customSalePrice: val } : v)),
    );
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

    const newRows: VariantRow[] = [];
    genSizes.forEach((sz) => {
      genColors.forEach((col) => {
        newRows.push({
          id: `v-${sz.toLowerCase()}-${col.toLowerCase().replace(/\s+/g, "-")}`,
          size: sz,
          color: col,
          wholesaleCost: "",
          customSalePrice: "",
        });
      });
    });

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

    // Quantidades por tamanho agregadas
    const initialSizes: Record<string, number> = {};
    variants.forEach((v) => {
      initialSizes[v.size] = (initialSizes[v.size] ?? 0) + 2;
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

        {/* ── Seletor da Estratégia de Cálculo (Apple Pill) ─────────── */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-secondary/50 p-1">
          <span className="px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Estratégia:
          </span>
          <button
            type="button"
            onClick={() => setStrategy("margin")}
            className={cn(
              "flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
              strategy === "margin"
                ? "bg-card text-primary shadow-xs border border-primary/20"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Target className="size-3" /> Margem Real %
          </button>
          <button
            type="button"
            onClick={() => setStrategy("markup")}
            className={cn(
              "flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
              strategy === "markup"
                ? "bg-card text-primary shadow-xs border border-primary/20"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <TrendingUp className="size-3" /> Markup %
          </button>
          <button
            type="button"
            onClick={() => setStrategy("direct_price")}
            className={cn(
              "flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
              strategy === "direct_price"
                ? "bg-card text-primary shadow-xs border border-primary/20"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Coins className="size-3" /> Preço Fixo R$
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] w-full min-w-0">
        {/* ── Painel Esquerdo: Jornada de Precificação em 3 Passos ──── */}
        <section className="panel p-6 sm:p-7 space-y-6 min-w-0 overflow-hidden">

          {/* ══════════════════════════════════════════════════════════
              PASSO 1: IDENTIFICAÇÃO & CUSTOS BÁSICOS
          ══════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  1
                </span>
                <h2 className="text-sm font-bold text-foreground">Identificação & Custo de Compra</h2>
              </div>
              <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                {mode === "rapida" ? "Preço Único" : `${variants.length} itens na lista`}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
              <Field label="Nome da peça ou modelo">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Vestido midi linho com fenda"
                  className="h-11 rounded-xl font-medium"
                />
              </Field>

              <Field label={mode === "rapida" ? "Custo de atacado (R$)" : "Custo base da grade (R$)"}>
                <Input
                  inputMode="decimal"
                  value={mode === "rapida" ? wholesale : baseWholesaleGrade}
                  onChange={(e) =>
                    mode === "rapida"
                      ? setWholesale(e.target.value)
                      : setBaseWholesaleGrade(e.target.value)
                  }
                  placeholder="49,90"
                  className="h-11 rounded-xl font-bold text-base bg-card text-foreground"
                />
              </Field>
            </div>

            {/* Rateio Operacional — Colapsável */}
            <div>
              <button
                type="button"
                onClick={() => setShowOverhead((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-secondary/30 px-3.5 py-2.5 text-left transition-all hover:bg-secondary/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Rateio por peça
                  </span>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    +{brl(toNumber(freight) + toNumber(packaging) + toNumber(other))} / peça
                  </span>
                </div>
                <ChevronDown
                  className={cn("size-4 text-muted-foreground transition-transform duration-200", showOverhead && "rotate-180")}
                />
              </button>

              {showOverhead && (
                <div className="mt-2 rounded-xl border border-border/60 bg-secondary/20 px-3.5 py-3 animate-in fade-in-50 slide-in-from-top-1 duration-150">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-[11px] text-muted-foreground block mb-1.5">Frete rateado</Label>
                      <Input
                        inputMode="decimal"
                        value={freight}
                        onChange={(e) => setFreight(e.target.value)}
                        placeholder="6,00"
                        className="h-9 rounded-lg bg-card text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground block mb-1.5">Embalagem/Tag</Label>
                      <Input
                        inputMode="decimal"
                        value={packaging}
                        onChange={(e) => setPackaging(e.target.value)}
                        placeholder="3,50"
                        className="h-9 rounded-lg bg-card text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground block mb-1.5">Outros custos</Label>
                      <Input
                        inputMode="decimal"
                        value={other}
                        onChange={(e) => setOther(e.target.value)}
                        placeholder="2,00"
                        className="h-9 rounded-lg bg-card text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* ══════════════════════════════════════════════════════════
              PASSO 2: ESTRATÉGIA DE LUCRO & MARGEM
          ══════════════════════════════════════════════════════════ */}
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <h2 className="text-sm font-bold text-foreground">Estratégia de Lucratividade</h2>
            </div>

            {strategy === "margin" && (
              <SliderRow
                label="Margem de Lucro Líquida Desejada (% sobre o preço de venda)"
                value={desiredMargin}
                max={85}
                onChange={setDesiredMargin}
                display={pct(desiredMargin)}
                hint="De cada R$ 1,00 que entra no caixa, quanto fica limpo de lucro real."
              />
            )}

            {strategy === "markup" && (
              <SliderRow
                label="Markup Desejado (% sobre o custo total)"
                value={markup}
                max={300}
                onChange={setMarkup}
                display={pct(markup)}
                hint="Multiplicador sobre o custo total da peça."
              />
            )}

            {strategy === "direct_price" && (
              <div className="rounded-xl bg-primary-soft p-3.5 text-xs text-primary flex items-start gap-2">
                <Info className="size-4 shrink-0 mt-0.5" />
                <span>
                  No modo <strong>Preço Fixo</strong>, digite o valor de venda desejado diretamente na lista abaixo para conferir a margem e o lucro líquido real de cada item.
                </span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 pt-1">
              <SliderRow
                label="Imposto estimado DAS / Simples (%)"
                value={tax}
                max={25}
                onChange={setTax}
                display={pct(tax)}
              />
              <SliderRow
                label="Taxa média de maquininha (%)"
                value={cardRate}
                max={15}
                onChange={setCardRate}
                display={pct(cardRate)}
              />
            </div>
          </div>


          {/* ══════════════════════════════════════════════════════════
              PASSO 3: MODO RÁPIDO OU TABELA UNIFICADA DE VARIANTES
          ══════════════════════════════════════════════════════════ */}
          {mode === "rapida" && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  3
                </span>
                <h2 className="text-sm font-bold text-foreground">Resultado da Precificação Rápida</h2>
              </div>

              {/* Card de Resultado Instantâneo */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Diagnóstico</span>
                  <span className={cn("text-xs font-semibold flex items-center gap-1", singleResult.marginHealth.color)}>
                    {singleResult.marginHealth.emoji} {singleResult.marginHealth.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-card p-3 border border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Custo Total</p>
                    <p className="numeric text-sm font-bold text-foreground">{brl(singleResult.realCost)}</p>
                  </div>
                  <div className="rounded-xl bg-primary p-3 shadow-glow">
                    <p className="text-[10px] font-semibold text-primary-foreground/70 uppercase tracking-wide mb-1">Preço Sugerido</p>
                    <p className="numeric text-sm font-bold text-white">{brl(singleResult.suggestedPrice)}</p>
                  </div>
                  <div className="rounded-xl bg-card p-3 border border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Lucro Líquido</p>
                    <p className={cn("numeric text-sm font-bold", singleResult.marginHealth.color)}>{brl(singleResult.profit)}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div className="flex justify-between rounded-lg bg-secondary/60 px-3 py-1.5">
                    <span>Margem Real</span>
                    <span className={cn("numeric font-bold", singleResult.marginHealth.color)}>{pct(singleResult.marginOnPrice)}</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-secondary/60 px-3 py-1.5">
                    <span>Markup</span>
                    <span className="numeric font-bold text-foreground">{pct(singleResult.markupOnCost)}</span>
                  </div>
                </div>
              </div>

              {/* Botão CTA para Avançar para a Grade */}
              <button
                type="button"
                onClick={promoteToGrade}
                className="group flex w-full items-center justify-between rounded-2xl border-2 border-primary/30 bg-primary/5 px-5 py-4 text-left transition-all hover:border-primary/60 hover:bg-primary/10 active:scale-[0.99]"
              >
                <div>
                  <p className="text-sm font-bold text-primary">Expandir para Grade Detalhada (Tamanho + Cor)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">O custo já vai pré-preenchido para você personalizar e dar entrada no estoque.</p>
                </div>
                <ArrowRight className="size-5 text-primary shrink-0 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}

          {mode === "grade" && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    3
                  </span>
                  <h2 className="text-sm font-bold text-foreground">Grade de Tamanhos & Cores</h2>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {variants.length} {variants.length === 1 ? "peça na grade" : "peças na grade"}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMatrixGenerator((prev) => !prev)}
                  className="h-8 rounded-full text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Wand2 className="size-3.5 mr-1.5" />
                  {showMatrixGenerator ? "Ocultar Gerador" : "⚡ Gerador de Grade Rápida"}
                </Button>
              </div>

              {/* ── Painel Expansível: Gerador de Matriz (Tamanhos × Cores) ── */}
              {showMatrixGenerator && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-4 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                      <Sparkles className="size-3.5" />
                      <span>Selecione os tamanhos e cores para gerar a grade automaticamente:</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {genSizes.length} tam. × {genColors.length} cores = {genSizes.length * genColors.length} peças
                    </Badge>
                  </div>

                  {/* Seleção de Tamanhos com Presets */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        1. Tamanhos Desejados:
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

                  {/* Seleção de Cores */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      2. Cores da Coleção:
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

                      {/* Cor Customizada no Gerador */}
                      <div className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-card px-2 py-0.5">
                        <Input
                          value={customGenColor}
                          onChange={(e) => setCustomGenColor(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && (e.preventDefault(), addCustomGenColor())
                          }
                          placeholder="＋ Outra cor"
                          className="h-6 w-24 border-0 bg-transparent px-1 text-xs font-medium shadow-none focus-visible:ring-0"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={addCustomGenColor}
                          className="size-5 rounded-full text-primary"
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Botão de Geração */}
                  <Button
                    type="button"
                    onClick={generateMatrix}
                    className="h-10 w-full rounded-xl gradient-primary text-xs font-bold shadow-glow"
                  >
                    <Wand2 className="size-3.5 mr-2" /> Gerar Grade com {genSizes.length * genColors.length} Peças
                  </Button>
                </div>
              )}

              {/* ── CARDS VISUAIS DE MODA AGRUPADOS POR COR (ZERO FADIGA) ── */}
              <div className="space-y-3">
                {colorGroups.map((group) => {
                  const isEditingOverrides = editingColorOverride === group.color;
                  const hasAnyOverride = group.items.some((v) => v.isCustomCost || v.isCustomPrice);
                  const activeSizeSet = new Set(group.items.map((i) => i.size));

                  // Combinar tamanhos ativos com opções comuns para toque rápido
                  const availableSizes = Array.from(
                    new Set([
                      ...group.items.map((i) => i.size),
                      ...["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "36", "38", "40", "42", "44", "46", "Único"].filter(
                        (s) =>
                          variants.some((v) => v.size === s) ||
                          ["P", "M", "G", "GG"].includes(s),
                      ),
                    ]),
                  );

                  return (
                    <div
                      key={group.color}
                      className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:border-primary/30"
                    >
                      {/* Cabeçalho da Cor */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={cn("size-3 rounded-full shadow-xs shrink-0", getColorDot(group.color))} />
                          <span className="text-sm font-bold text-foreground truncate">{group.color}</span>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground shrink-0">
                            {group.items.length} {group.items.length === 1 ? "tamanho" : "tamanhos"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Resumo Financeiro da Cor */}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="numeric text-muted-foreground">
                              Custo <strong className="text-foreground">{brl(group.avgCost)}</strong>
                            </span>
                            <span className="text-border">·</span>
                            <span className="numeric text-primary font-bold">
                              Venda {brl(group.avgPrice)}
                            </span>
                            <span className="text-border hidden sm:inline">·</span>
                            <span className={cn("numeric font-semibold hidden sm:inline-flex items-center gap-0.5", group.health.color)}>
                              {group.health.emoji} +{brl(group.avgProfit)} ({pct(group.avgMargin)})
                            </span>
                          </div>

                          {/* Botão de Excluir Cor */}
                          <button
                            type="button"
                            onClick={() => removeColor(group.color)}
                            className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title={`Remover cor ${group.color}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Corpo: Pills de Tamanhos Táteis */}
                      <div className="pt-3 space-y-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                            Tamanhos ativos:
                          </span>

                          {availableSizes.map((sz) => {
                            const isActive = activeSizeSet.has(sz);

                            return (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => toggleColorSize(group.color, sz)}
                                className={cn(
                                  "flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-150 active:scale-95",
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

                        {/* Opção para Personalizar Custo / Preço Específico por Tamanho */}
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setEditingColorOverride(isEditingOverrides ? null : group.color)}
                            className="text-primary hover:underline font-semibold flex items-center gap-1"
                          >
                            <span>{isEditingOverrides ? "Ocultar ajustes individuais" : "Personalizar valor de algum tamanho específico..."}</span>
                            <ChevronDown className={cn("size-3 transition-transform", isEditingOverrides && "rotate-180")} />
                          </button>
                          {hasAnyOverride && (
                            <span className="rounded bg-primary/10 px-2 py-0.5 font-bold text-primary text-[10px]">
                              ✦ Valores personalizados ativos
                            </span>
                          )}
                        </div>

                        {/* Painel de Ajuste Individual (Aparece apenas quando expandido) */}
                        {isEditingOverrides && (
                          <div className="rounded-xl border border-border/80 bg-secondary/20 p-3 space-y-2 animate-in fade-in-50 duration-150">
                            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground px-2">
                              <span>Tamanho</span>
                              <span className="w-24 text-right">Custo Atacado</span>
                              <span className="w-24 text-right">Preço Venda</span>
                            </div>
                            {group.items.map((v) => (
                              <div
                                key={v.id}
                                className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg bg-card p-2 border border-border/60 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="size-6 flex items-center justify-center rounded bg-secondary font-bold text-foreground text-[11px]">
                                    {v.size}
                                  </span>
                                  <span className="text-muted-foreground text-xs">{group.color}</span>
                                </div>
                                <input
                                  inputMode="decimal"
                                  value={v.wholesaleCost}
                                  onChange={(e) => updateVariantCost(v.id, e.target.value)}
                                  placeholder={baseWholesaleGrade || "49,90"}
                                  className="h-7 w-24 rounded-md border border-border bg-secondary/50 px-2 text-right text-xs font-semibold outline-none focus:border-primary focus:bg-card"
                                />
                                <input
                                  inputMode="decimal"
                                  value={v.customSalePrice}
                                  onChange={(e) => updateVariantPrice(v.id, e.target.value)}
                                  placeholder={
                                    v.suggestedPrice > 0
                                      ? String(v.suggestedPrice.toFixed(2)).replace(".", ",")
                                      : "0,00"
                                  }
                                  className="h-7 w-24 rounded-md border border-border bg-secondary/50 px-2 text-right text-xs font-bold text-primary outline-none focus:border-primary focus:bg-card"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* ── BARRA RÁPIDA: ADICIONAR NOVA COR NA GRADE ── */}
                <div className="rounded-2xl border border-dashed border-border bg-card/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Plus className="size-3.5 text-primary" />
                      Adicionar outra cor à grade:
                    </span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      Clique numa cor sugerida ou digite
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {COLOR_PRESETS.filter(
                      (cp) => !colorGroups.some((g) => g.color.toLowerCase() === cp.name.toLowerCase()),
                    ).map((cp) => (
                      <button
                        key={cp.name}
                        type="button"
                        onClick={() => addQuickColor(cp.name)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:bg-primary/5 transition-all active:scale-95 shadow-xs"
                      >
                        <span className={cn("size-2 rounded-full", getColorDot(cp.name))} />
                        <span>+ {cp.name}</span>
                      </button>
                    ))}

                    {/* Input de Cor Personalizada */}
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 shadow-xs">
                      <input
                        value={newCustomColor}
                        onChange={(e) => setNewCustomColor(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomColor())}
                        placeholder="Outra cor..."
                        className="h-6 w-24 text-xs font-medium outline-none bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={addCustomColor}
                        className="rounded-full gradient-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-xs"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>



        {/* ── Inspector Executivo da Peça (Painel Direito) ─────────── */}
        <section className="panel flex flex-col justify-between p-6 sm:p-7 space-y-5 min-w-0 overflow-hidden">
          <div className="space-y-5 min-w-0">

            {/* ── Preço Hero + Badge de Saúde ── */}
            <div className="space-y-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Preço Sugerido de Venda
              </p>

              {summaryPrices.hasMultiple ? (
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                    <span className="numeric text-3xl font-bold tracking-tight text-foreground truncate">
                      {brl(summaryPrices.minSuggested)}
                    </span>
                    <span className="text-muted-foreground font-light text-xl">–</span>
                    <span className="numeric text-3xl font-bold tracking-tight text-foreground truncate">
                      {brl(summaryPrices.maxSuggested)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Faixa de {variants.length} variantes
                  </p>
                </div>
              ) : (
                <div className="min-w-0">
                  <p className="numeric text-4xl font-bold tracking-tight text-foreground truncate">
                    {brl(summaryPrices.avgSuggested)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lucro líquido de <strong className="text-foreground">{brl(summaryPrices.avgProfit)}</strong> por peça
                  </p>
                </div>
              )}

              {/* Badge de Saúde Financeira */}
              <div className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                summaryPrices.marginHealth.color,
                summaryPrices.avgMargin >= 40
                  ? "bg-success/10"
                  : summaryPrices.avgMargin >= 25
                  ? "bg-warning/10"
                  : "bg-danger/10",
              )}>
                <span>{summaryPrices.marginHealth.emoji}</span>
                <span>{summaryPrices.marginHealth.label}</span>
              </div>
            </div>

            {/* ── Barra de Composição do Preço (Price Breakdown Bar) ── */}
            {summaryPrices.avgSuggested > 0 && (() => {
              const price = summaryPrices.avgSuggested;
              const cost = summaryPrices.avgCost;
              const profit = summaryPrices.avgProfit;
              const taxes = price - cost - profit;
              const costPct = Math.max((cost / price) * 100, 0);
              const taxPct = Math.max((taxes / price) * 100, 0);
              const profitPct = Math.max((profit / price) * 100, 0);
              return (
                <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Composição do Preço
                  </p>
                  {/* Barra Visual */}
                  <div className="flex h-3 w-full overflow-hidden rounded-full gap-0.5">
                    <div
                      className="bg-foreground/30 rounded-l-full"
                      style={{ width: `${costPct}%` }}
                      title={`Custo: ${Math.round(costPct)}%`}
                    />
                    <div
                      className="bg-warning/60"
                      style={{ width: `${taxPct}%` }}
                      title={`Impostos & Taxas: ${Math.round(taxPct)}%`}
                    />
                    <div
                      className="bg-success rounded-r-full"
                      style={{ width: `${profitPct}%` }}
                      title={`Lucro Líquido: ${Math.round(profitPct)}%`}
                    />
                  </div>
                  {/* Legenda */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-foreground/30 shrink-0" />
                      Custo {Math.round(costPct)}%
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-warning/60 shrink-0" />
                      Taxas {Math.round(taxPct)}%
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-success">
                      <span className="size-2 rounded-full bg-success shrink-0" />
                      Lucro {Math.round(profitPct)}%
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* ── 3 Métricas Compactas ── */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border bg-secondary/40 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Margem
                </p>
                <p className={cn("numeric mt-1 text-base font-bold", summaryPrices.marginHealth.color)}>
                  {pct(summaryPrices.avgMargin)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-primary/5 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Lucro
                </p>
                <p className="numeric mt-1 text-sm font-bold text-foreground">
                  {brl(summaryPrices.avgProfit)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Markup
                </p>
                <p className="numeric mt-1 text-base font-bold text-foreground">
                  {pct(summaryPrices.avgMarkup)}
                </p>
              </div>
            </div>

            {/* ── Diagnóstico de Lucratividade ── */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <ShieldCheck className={cn("size-4", summaryPrices.marginHealth.color)} />
                <span>Diagnóstico de Lucratividade</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {summaryPrices.marginHealth.description}
              </p>
            </div>

            {/* ── Resumo Compacto de Variantes (Modo Grade) ── */}
            {mode === "grade" && variantResults.length > 0 && (
              <div className="rounded-2xl border border-border bg-secondary/20 p-3.5 text-xs min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Variantes da Grade
                </p>
                <div className="space-y-0 divide-y divide-border/60 max-h-40 overflow-y-auto">
                  {variantResults.map((v) => (
                    <div key={v.id} className="py-2 space-y-0.5 min-w-0">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="flex items-center gap-1.5 font-semibold text-foreground truncate min-w-0">
                          <span className={cn("size-2 rounded-full shrink-0", getColorDot(v.color))} />
                          <span className="truncate">{v.size} · {v.color}</span>
                        </span>
                        <span className="numeric font-bold text-primary shrink-0">{brl(v.suggestedPrice)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="numeric">Custo {brl(v.realCost)}</span>
                        <span className={cn("numeric font-semibold", v.profit >= 0 ? "text-success" : "text-destructive")}>
                          +{brl(v.profit)} ({pct(v.marginOnPrice)})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Simulador de Meios de Pagamento ── */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-2.5 text-xs">
              <button
                type="button"
                onClick={() => setShowSimulator((prev) => !prev)}
                className="flex w-full items-center justify-between text-left font-bold text-foreground hover:text-primary transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <CreditCard className="size-3.5 text-primary" />
                  Sobra por meio de pagamento
                </span>
                <ChevronDown
                  className={cn("size-4 text-muted-foreground transition-transform", showSimulator && "rotate-180")}
                />
              </button>

              {showSimulator && (
                <div className="pt-1 divide-y divide-border space-y-1">
                  {paymentScenarios.map((sc) => (
                    <div key={sc.label} className="flex items-center justify-between pt-2 text-[11px]">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span>{sc.icon}</span>
                        <span>{sc.label}</span>
                      </span>
                      <span className={cn("numeric font-bold", sc.isViable ? "text-success" : "text-destructive")}>
                        {brl(sc.profit)} ({pct(sc.margin)})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Cobertura do Lote ── */}
            <div className="rounded-2xl border border-border bg-amber-50/50 dark:bg-amber-950/20 p-4 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Zap className="size-3.5 text-amber-500" />
                  Cobertura do Lote ({lotUnits} peças)
                </span>
                <span className="numeric text-amber-600 dark:text-amber-400 font-bold">
                  {lotBreakEven.unitsToBreakEven} un. ({pct(lotBreakEven.breakEvenPct)})
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Vendendo <strong className="text-foreground">{lotBreakEven.unitsToBreakEven} peças</strong> você quita o lote ({brl(lotBreakEven.totalLotCost)}). As outras {Math.max(lotUnits - lotBreakEven.unitsToBreakEven, 0)} são <strong className="text-success">100% lucro líquido</strong>.
              </p>
            </div>
          </div>

          {/* ── Ações Principais ── */}
          <div className="pt-4 border-t border-border space-y-2.5">
            {mode === "rapida" ? (
              <>
                <Button
                  type="button"
                  onClick={promoteToGrade}
                  className="h-12 w-full rounded-2xl gradient-primary font-bold shadow-glow transition-all active:scale-[0.98]"
                >
                  <Layers className="mr-2 size-4" /> Ir para Grade Detalhada & Estoque
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                  className="h-10 w-full rounded-2xl text-xs font-semibold"
                >
                  <Save className="mr-1.5 size-3.5" /> Salvar no Histórico
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={openEntryForCurrent}
                  className="h-12 w-full rounded-2xl gradient-primary font-bold shadow-glow transition-all active:scale-[0.98]"
                >
                  <PackagePlus className="mr-2 size-4" /> Dar Entrada no Estoque
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                  className="h-10 w-full rounded-2xl text-xs font-semibold"
                >
                  <Save className="mr-1.5 size-3.5" /> Salvar no Histórico
                </Button>
              </>
            )}
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
