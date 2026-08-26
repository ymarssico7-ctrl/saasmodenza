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
          "Calcule o preço de venda das suas peças com margem real, controle individual por grade de tamanhos, simulador de taxas de cartão e ponto de equilíbrio do lote.",
      },
      { property: "og:title", content: "Precificação Estratégica — Vestuli" },
      {
        property: "og:description",
        content: "Descubra o preço ideal por grade ou peça única, simulando perdas e margem real líquida.",
      },
    ],
  }),
  component: Precificacao,
});

type PricingMode = "grade" | "unico" | "cor_tamanho";
type PricingStrategy = "margin" | "markup" | "direct_price";

const PRESET_OPTIONS = [
  { id: "letras", label: "Padrão (PP–GG)", sizes: ["PP", "P", "M", "G", "GG"] },
  { id: "numeros", label: "Numérica (36–46)", sizes: ["36", "38", "40", "42", "44", "46"] },
  { id: "plus", label: "Plus Size (GG–G3)", sizes: ["GG", "G1", "G2", "G3"] },
  { id: "calcas", label: "Jeans (34–48)", sizes: ["34", "36", "38", "40", "42", "44", "46", "48"] },
];

function Precificacao() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { data: saved = [] } = useQuery(pricingsQuery());

  // ── Modo de Agrupamento ───────────────────────────────────────────
  const [mode, setMode] = useState<PricingMode>("grade");

  // ── Estratégia de Precificação (Como o lojista prefere calcular) ───
  const [strategy, setStrategy] = useState<PricingStrategy>("margin");

  // ── Dados Básicos da Peça ─────────────────────────────────────────
  const [name, setName] = useState("");

  // ── Modo 1: Preço Único ───────────────────────────────────────────
  const [wholesale, setWholesale] = useState("49,90");

  // ── Modo 2: Grade por Tamanho ─────────────────────────────────────
  const [activeSizes, setActiveSizes] = useState<string[]>(["P", "M", "G", "GG"]);
  const [baseWholesaleGrade, setBaseWholesaleGrade] = useState("49,90");
  const [sizeCosts, setSizeCosts] = useState<Record<string, string>>({});
  const [sizeSalePrices, setSizeSalePrices] = useState<Record<string, string>>({});
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [activePreset, setActivePreset] = useState<string>("letras");

  // ── Modo 3: Cor & Variação ────────────────────────────────────────
  const [colors, setColors] = useState<string[]>(["Off-White", "Preto"]);
  const [colorInput, setColorInput] = useState("");
  const [colorCosts, setColorCosts] = useState<Record<string, string>>({
    "Off-White": "",
    Preto: "",
  });
  const [colorSalePrices, setColorSalePrices] = useState<Record<string, string>>({});

  // ── Custos Operacionais Compartilhados ─────────────────────────────
  const [freight, setFreight] = useState("6,00");
  const [packaging, setPackaging] = useState("3,50");
  const [other, setOther] = useState("2,00");

  // ── Parâmetros de Margem, Markup e Deduções ────────────────────────
  const [desiredMargin, setDesiredMargin] = useState(50); // 50% de margem real líquida
  const [markup, setMarkup] = useState(80); // 80% de markup sobre custo
  const [directSalePrice, setDirectSalePrice] = useState("119,90"); // Preço de etiqueta direto
  const [tax, setTax] = useState(6); // 6% imposto
  const [cardRate, setCardRate] = useState(3.5); // 3.5% taxa média de maquininha

  // ── Simuladores & Lote ─────────────────────────────────────────────
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

      // 1. Se o item tem um preço de venda fixo personalizado ou estamos no modo direct_price
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

      // 2. Se a estratégia é Margem Real sobre a Venda (Recomendado)
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

      // 3. Se a estratégia é Markup sobre o Custo
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

  // ── Cálculo do Preço Único ────────────────────────────────────────
  const singleResult = useMemo(() => {
    return calculateItem(toNumber(wholesale));
  }, [wholesale, calculateItem]);

  // ── Cálculo da Grade por Tamanho com Granularidade Total ───────────
  const gradeResults = useMemo(() => {
    const baseNum = toNumber(baseWholesaleGrade);
    return activeSizes.map((size) => {
      const rawCost = sizeCosts[size];
      const hasCustomCost = rawCost !== undefined && rawCost !== "" && toNumber(rawCost) > 0;
      const wholesaleNum = hasCustomCost ? toNumber(rawCost) : baseNum;

      const rawSalePrice = sizeSalePrices[size];
      const res = calculateItem(wholesaleNum, rawSalePrice);

      return {
        size,
        wholesale_cost: wholesaleNum,
        isCustomCost: hasCustomCost && wholesaleNum !== baseNum,
        ...res,
      };
    });
  }, [activeSizes, sizeCosts, sizeSalePrices, baseWholesaleGrade, calculateItem]);

  // ── Cálculo de Cor & Variação ──────────────────────────────────────
  const colorResults = useMemo(() => {
    const baseNum = toNumber(baseWholesaleGrade || wholesale);
    return colors.map((color) => {
      const rawCost = colorCosts[color];
      const hasCustomCost = rawCost !== undefined && rawCost !== "" && toNumber(rawCost) > 0;
      const wholesaleNum = hasCustomCost ? toNumber(rawCost) : baseNum;

      const rawSalePrice = colorSalePrices[color];
      const res = calculateItem(wholesaleNum, rawSalePrice);

      return {
        color,
        wholesale_cost: wholesaleNum,
        isCustomCost: hasCustomCost && wholesaleNum !== baseNum,
        ...res,
      };
    });
  }, [colors, colorCosts, colorSalePrices, baseWholesaleGrade, wholesale, calculateItem]);

  // ── Resumo Geral de Preços (Faixas e Médias) ───────────────────────
  const summaryPrices = useMemo(() => {
    if (mode === "unico") {
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

    const items = mode === "grade" ? gradeResults : colorResults;
    const valid = items.filter((i) => i.wholesale_cost > 0);
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
        hasMultiple: items.length > 1,
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
  }, [mode, singleResult, gradeResults, colorResults]);

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

  // ── Ações da Grade de Tamanhos ────────────────────────────────────
  const toggleSize = (sz: string) => {
    if (activeSizes.includes(sz)) {
      if (activeSizes.length <= 1) {
        toast.error("Mantenha ao menos um tamanho na grade");
        return;
      }
      setActiveSizes((prev) => prev.filter((s) => s !== sz));
    } else {
      setActiveSizes((prev) => [...prev, sz]);
    }
  };

  const applyPreset = (presetId: string, sizes: string[]) => {
    setActivePreset(presetId);
    setActiveSizes(sizes);
    setSizeCosts({});
    setSizeSalePrices({});
    toast.success("Grade de tamanhos atualizada");
  };

  const resetSizeOverrides = (sz: string) => {
    setSizeCosts((prev) => {
      const next = { ...prev };
      delete next[sz];
      return next;
    });
    setSizeSalePrices((prev) => {
      const next = { ...prev };
      delete next[sz];
      return next;
    });
    toast.success(`Tamanho ${sz} restaurado para a regra padrão`);
  };

  const addCustomSize = () => {
    const clean = customSizeInput.trim().toUpperCase();
    if (!clean) return;
    if (activeSizes.includes(clean)) {
      toast.error(`O tamanho ${clean} já está na grade`);
      return;
    }
    setActiveSizes((prev) => [...prev, clean]);
    setCustomSizeInput("");
    toast.success(`Tamanho ${clean} adicionado à grade`);
  };

  // ── Ações de Cores & Variações ─────────────────────────────────────
  const addColor = () => {
    const clean = colorInput.trim();
    if (!clean) return;
    if (colors.includes(clean)) {
      toast.error(`A cor "${clean}" já foi adicionada`);
      return;
    }
    setColors((prev) => [...prev, clean]);
    setColorCosts((prev) => ({ ...prev, [clean]: "" }));
    setColorInput("");
    toast.success(`Cor "${clean}" adicionada`);
  };

  const removeColor = (c: string) => {
    if (colors.length <= 1) {
      toast.error("Mantenha ao menos uma cor ou variação");
      return;
    }
    setColors((prev) => prev.filter((col) => col !== c));
    setColorCosts((prev) => {
      const next = { ...prev };
      delete next[c];
      return next;
    });
    setColorSalePrices((prev) => {
      const next = { ...prev };
      delete next[c];
      return next;
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
    setEntryColor(mode === "cor_tamanho" ? colors[0] ?? "" : "");
    const initialSizes: Record<string, number> = {};
    activeSizes.forEach((sz) => {
      initialSizes[sz] = 2; // quantidade inicial sugerida
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
        description="Domine suas margens reais, simule taxas e precifique com total liberdade por grade de tamanhos, cores ou preço único."
      />

      {/* ── Segmented Control Apple (Seleção de Modo de Estrutura) ──── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl border border-border bg-surface p-1.5 shadow-soft">
          <button
            type="button"
            onClick={() => setMode("grade")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
              mode === "grade"
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Layers className="size-3.5" /> Grade por Tamanho
          </button>
          <button
            type="button"
            onClick={() => setMode("unico")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
              mode === "unico"
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Tag className="size-3.5" /> Preço Único
          </button>
          <button
            type="button"
            onClick={() => setMode("cor_tamanho")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
              mode === "cor_tamanho"
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Palette className="size-3.5" /> Cor & Variação
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

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        {/* ── Formulário de Custos & Grade (Painel Esquerdo) ─────────── */}
        <section className="panel p-6 sm:p-7 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-semibold">
                {mode === "grade" && "Precificação em Grade de Tamanhos"}
                {mode === "unico" && "Precificação em Preço Único"}
                {mode === "cor_tamanho" && "Precificação por Variação de Cores"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {mode === "grade" &&
                  "Defina o custo base e personalize custos ou preços de venda em qualquer tamanho individual."}
                {mode === "unico" && "Precifique a peça inteira com valor de atacado e venda unificados."}
                {mode === "cor_tamanho" &&
                  "Precifique variações com custos de tecido ou acabamentos distintos."}
              </p>
            </div>
            <Badge variant="outline" className="rounded-full text-xs font-semibold capitalize">
              {mode === "grade" && `${activeSizes.length} Tamanhos`}
              {mode === "unico" && "1 Preço"}
              {mode === "cor_tamanho" && `${colors.length} Cores`}
            </Badge>
          </div>

          <Field label="Nome da peça ou modelo">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vestido midi linho com fenda"
              className="h-11 rounded-xl font-medium"
            />
          </Field>

          {/* ── MODO 2: GRADE POR TAMANHO (PADRÃO APPLE ULTRA-REATIVO) ── */}
          {mode === "grade" && (
            <div className="space-y-5 rounded-2xl border border-border bg-secondary/30 p-5">
              {/* Presets de Grade */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Tipo de Grade de Tamanhos
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_OPTIONS.map((pr) => (
                    <button
                      key={pr.id}
                      type="button"
                      onClick={() => applyPreset(pr.id, pr.sizes)}
                      className={cn(
                        "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                        activePreset === pr.id
                          ? "border-primary bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50",
                      )}
                    >
                      {pr.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bloco de Destaque: Custo Base com Reatividade Automática */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    Custo Base de Atacado da Grade (R$)
                  </Label>
                  <span className="text-[11px] font-medium text-primary flex items-center gap-1">
                    <Sparkles className="size-3" /> Aplica automaticamente a todos
                  </span>
                </div>
                <Input
                  inputMode="decimal"
                  value={baseWholesaleGrade}
                  onChange={(e) => setBaseWholesaleGrade(e.target.value)}
                  placeholder="49,90"
                  className="h-11 rounded-xl bg-card text-base font-bold text-foreground"
                />
              </div>

              {/* Tiles Granulares dos Tamanhos da Grade */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tamanhos, Custos & Preços Granulares
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Digite o custo ou preço de venda de cada tamanho
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {activeSizes.map((sz) => {
                    const item = gradeResults.find((r) => r.size === sz);
                    const isCustomCost = item?.isCustomCost;
                    const isCustomPrice = item?.isCustomPrice;
                    const hasOverrides = isCustomCost || isCustomPrice;

                    return (
                      <div
                        key={sz}
                        className={cn(
                          "relative rounded-2xl border p-3.5 flex flex-col justify-between space-y-2.5 transition-all duration-200",
                          hasOverrides
                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                            : "border-border bg-card hover:border-border/80",
                        )}
                      >
                        {/* Header do Tile */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-secondary text-xs font-bold">
                              {sz}
                            </span>
                            {hasOverrides && (
                              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                                Personalizado
                              </span>
                            )}
                          </div>

                          {hasOverrides ? (
                            <button
                              type="button"
                              onClick={() => resetSizeOverrides(sz)}
                              title="Restaurar para a regra padrão"
                              className="text-primary hover:text-primary/70 text-[10px] font-semibold flex items-center gap-0.5"
                            >
                              <RotateCcw className="size-2.5" /> Padrão
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleSize(sz)}
                              title="Remover tamanho da grade"
                              className="text-muted-foreground hover:text-destructive size-5 rounded-md flex items-center justify-center"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>

                        {/* 2 Inputs: Custo Atacado & Preço Venda Direto */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="space-y-1">
                            <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">
                              Custo (R$)
                            </span>
                            <Input
                              inputMode="decimal"
                              value={sizeCosts[sz] ?? ""}
                              onChange={(e) =>
                                setSizeCosts((prev) => ({ ...prev, [sz]: e.target.value }))
                              }
                              placeholder={baseWholesaleGrade || "0,00"}
                              className="h-8 rounded-lg text-xs font-semibold text-right"
                            />
                          </div>

                          <div className="space-y-1">
                            <span className="font-semibold text-primary block text-[10px] uppercase tracking-wider">
                              Venda (R$)
                            </span>
                            <Input
                              inputMode="decimal"
                              value={sizeSalePrices[sz] ?? ""}
                              onChange={(e) =>
                                setSizeSalePrices((prev) => ({ ...prev, [sz]: e.target.value }))
                              }
                              placeholder={
                                item && item.suggestedPrice > 0
                                  ? brl(item.suggestedPrice).replace("R$", "").trim()
                                  : "0,00"
                              }
                              className={cn(
                                "h-8 rounded-lg text-xs font-bold text-right",
                                isCustomPrice && "text-primary border-primary",
                              )}
                            />
                          </div>
                        </div>

                        {/* Footer do Tile com Margem e Lucro em Tempo Real */}
                        <div className="border-t border-border/60 pt-2 flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">
                            Lucro:{" "}
                            <strong className="text-foreground">
                              {item ? brl(item.profit) : "R$ 0,00"}
                            </strong>
                          </span>
                          <span
                            className={cn(
                              "font-bold flex items-center gap-1",
                              item?.marginHealth.color ?? "text-muted-foreground",
                            )}
                          >
                            <span>{item?.marginHealth.emoji}</span>
                            <span>{pct(item?.marginOnPrice ?? 0)}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Tile para Adicionar Tamanho Personalizado */}
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-3 flex flex-col justify-center items-center gap-1.5">
                    <Input
                      value={customSizeInput}
                      onChange={(e) => setCustomSizeInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addCustomSize())
                      }
                      placeholder="+ Tam (ex: G4)"
                      className="h-8 rounded-lg text-xs text-center font-medium"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomSize}
                      className="h-7 w-full rounded-lg text-[11px] font-semibold"
                    >
                      <Plus className="size-3 mr-0.5" /> Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── MODO 1: PREÇO ÚNICO ─────────────────────────────────── */}
          {mode === "unico" && (
            <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Custo de atacado por peça (R$)">
                  <Input
                    inputMode="decimal"
                    value={wholesale}
                    onChange={(e) => setWholesale(e.target.value)}
                    placeholder="49,90"
                    className="h-11 rounded-xl bg-card font-semibold text-base"
                  />
                </Field>

                {strategy === "direct_price" && (
                  <Field label="Preço de venda desejado na etiqueta (R$)">
                    <Input
                      inputMode="decimal"
                      value={directSalePrice}
                      onChange={(e) => setDirectSalePrice(e.target.value)}
                      placeholder="119,90"
                      className="h-11 rounded-xl bg-card font-bold text-base text-primary"
                    />
                  </Field>
                )}
              </div>
            </div>
          )}

          {/* ── MODO 3: COR & VARIAÇÃO ──────────────────────────────── */}
          {mode === "cor_tamanho" && (
            <div className="space-y-4 rounded-2xl border border-border bg-secondary/30 p-5">
              <div className="flex items-center gap-2">
                <Input
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
                  placeholder="Nova cor ou variação (ex: Linho Cru)"
                  className="h-10 rounded-xl"
                />
                <Button
                  type="button"
                  onClick={addColor}
                  className="h-10 rounded-xl px-4 text-xs font-semibold"
                >
                  <Plus className="mr-1 size-3.5" /> Adicionar
                </Button>
              </div>

              <div className="space-y-2">
                {colors.map((c) => {
                  const item = colorResults.find((r) => r.color === c);
                  return (
                    <div
                      key={c}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{c}</span>
                        {item && item.suggestedPrice > 0 && (
                          <Badge
                            variant="secondary"
                            className="numeric text-[11px] font-semibold text-primary"
                          >
                            Venda: {brl(item.suggestedPrice)} · Lucro: {brl(item.profit)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-28">
                          <Input
                            inputMode="decimal"
                            value={colorCosts[c] ?? ""}
                            onChange={(e) =>
                              setColorCosts((prev) => ({ ...prev, [c]: e.target.value }))
                            }
                            placeholder={baseWholesaleGrade || wholesale || "Custo R$"}
                            className="h-8 rounded-lg text-right text-xs font-semibold"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeColor(c)}
                          className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Custos Operacionais Rateados por Peça ────────────────── */}
          <div className="border-t border-border pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Custos Operacionais Rateados (por peça)
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Frete rateado (R$)">
                <Input
                  inputMode="decimal"
                  value={freight}
                  onChange={(e) => setFreight(e.target.value)}
                  placeholder="6,00"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Embalagem (R$)">
                <Input
                  inputMode="decimal"
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value)}
                  placeholder="3,50"
                  className="h-10 rounded-xl"
                />
              </Field>
              <Field label="Outros custos (R$)">
                <Input
                  inputMode="decimal"
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  placeholder="2,00"
                  className="h-10 rounded-xl"
                />
              </Field>
            </div>
          </div>

          {/* ── Sliders e Controles da Estratégia de Precificação ─────── */}
          <div className="space-y-5 border-t border-border pt-4">
            {strategy === "margin" && (
              <SliderRow
                label="Margem de Lucro Líquida Desejada (% sobre a venda)"
                value={desiredMargin}
                max={85}
                onChange={setDesiredMargin}
                display={pct(desiredMargin)}
                hint="De cada R$ 1,00 que entra no caixa, quanto fica limpo no seu bolso."
              />
            )}

            {strategy === "markup" && (
              <SliderRow
                label="Markup Desejado (% sobre o custo total)"
                value={markup}
                max={300}
                onChange={setMarkup}
                display={pct(markup)}
                hint="Quanto o preço de venda sobe em cima do custo da peça."
              />
            )}

            {strategy === "direct_price" && mode === "grade" && (
              <div className="rounded-xl bg-primary-soft p-3 text-xs text-primary flex items-start gap-2">
                <Info className="size-4 shrink-0 mt-0.5" />
                <span>
                  No modo <strong>Preço Fixo</strong>, digite o valor de venda desejado diretamente em cada tamanho nos cards da grade acima para ver o lucro real de cada peça.
                </span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <SliderRow
                label="Imposto sobre a venda (%)"
                value={tax}
                max={25}
                onChange={setTax}
                display={pct(tax)}
                hint="Simples Nacional / DAS estimado."
              />

              <SliderRow
                label="Taxa média de cartão / maquininha (%)"
                value={cardRate}
                max={15}
                onChange={setCardRate}
                display={pct(cardRate)}
                hint="Taxa média cobrada pelas maquininhas no crédito/débito."
              />
            </div>
          </div>
        </section>

        {/* ── Dashboard Executivo da Peça (Painel Direito) ─────────── */}
        <section className="panel flex flex-col justify-between bg-primary p-6 text-primary-foreground sm:p-7 shadow-lift space-y-6">
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
                  Preço Sugerido de Venda
                </p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-white/20 text-white backdrop-blur-xs",
                  )}
                >
                  <span>{summaryPrices.marginHealth.emoji}</span>
                  <span>{summaryPrices.marginHealth.label}</span>
                </span>
              </div>

              {/* Preço Principal ou Faixa Dinâmica */}
              {summaryPrices.hasMultiple ? (
                <div className="mt-3">
                  <p className="numeric text-[2.25rem] font-bold leading-tight tracking-tight">
                    {brl(summaryPrices.minSuggested)} – {brl(summaryPrices.maxSuggested)}
                  </p>
                  <p className="mt-1 text-xs text-primary-foreground/70">
                    Faixa de venda calculada para os {activeSizes.length} tamanhos da grade
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="numeric text-[2.75rem] font-bold leading-none tracking-tight">
                    {brl(summaryPrices.avgSuggested)}
                  </p>
                  <p className="mt-2 text-xs text-primary-foreground/70">
                    Lucro líquido médio de <strong>{brl(summaryPrices.avgProfit)}</strong> por unidade
                  </p>
                </div>
              )}
            </div>

            {/* 3 Hero Metric Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl bg-primary-foreground/15 p-3 backdrop-blur-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/60">
                  Margem Real
                </p>
                <p className="numeric mt-1 text-lg font-bold">
                  {pct(summaryPrices.avgMargin)}
                </p>
              </div>
              <div className="rounded-xl bg-primary-foreground/25 p-3 backdrop-blur-xs shadow-inner">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/70">
                  Lucro Médio
                </p>
                <p className="numeric mt-1 text-base font-bold">
                  {brl(summaryPrices.avgProfit)}
                </p>
              </div>
              <div className="rounded-xl bg-primary-foreground/15 p-3 backdrop-blur-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/60">
                  Markup
                </p>
                <p className="numeric mt-1 text-lg font-bold">{pct(summaryPrices.avgMarkup)}</p>
              </div>
            </div>

            {/* Diagnóstico de Saúde Financeira */}
            <div className="rounded-2xl bg-black/20 p-3.5 backdrop-blur-sm text-xs leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-primary-foreground">
                <ShieldCheck className="size-4 text-white" />
                <span>Diagnóstico de Lucratividade</span>
              </div>
              <p className="text-primary-foreground/80">
                {summaryPrices.marginHealth.description}
              </p>
            </div>

            {/* Tabela de Variações da Grade */}
            {mode === "grade" && gradeResults.length > 0 && (
              <div className="space-y-2 rounded-2xl bg-primary-foreground/10 p-4 text-xs">
                <div className="flex items-center justify-between text-primary-foreground/80 font-semibold uppercase tracking-wider text-[10px]">
                  <span>Tamanho</span>
                  <span>Custo Real</span>
                  <span>Venda</span>
                  <span>Lucro Real</span>
                </div>
                <div className="divide-y divide-primary-foreground/15 max-h-40 overflow-y-auto pr-1">
                  {gradeResults.map((gr) => (
                    <div key={gr.size} className="flex items-center justify-between py-2">
                      <span className="font-bold flex items-center gap-1">
                        {gr.size}
                        {gr.isCustomPrice ? (
                          <span className="rounded-full bg-white/20 px-1 text-[8px]">Fixo</span>
                        ) : gr.isCustomCost ? (
                          <span className="rounded-full bg-white/20 px-1 text-[8px]">Custo</span>
                        ) : null}
                      </span>
                      <span className="text-primary-foreground/70">{brl(gr.realCost)}</span>
                      <span className="font-bold text-white">{brl(gr.suggestedPrice)}</span>
                      <span className="font-semibold text-primary-foreground">
                        {brl(gr.profit)} ({pct(gr.marginOnPrice)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Simulador de Meios de Pagamento & Perdas (Colapsável) */}
            <div className="rounded-2xl bg-primary-foreground/10 p-4 space-y-2.5 text-xs">
              <button
                type="button"
                onClick={() => setShowSimulator((prev) => !prev)}
                className="flex w-full items-center justify-between text-left font-bold text-primary-foreground hover:opacity-90"
              >
                <span className="flex items-center gap-1.5">
                  <CreditCard className="size-3.5" /> Simulador: Quanto sobra em cada meio?
                </span>
                <ChevronDown
                  className={cn("size-4 transition-transform", showSimulator && "rotate-180")}
                />
              </button>

              {showSimulator && (
                <div className="pt-2 divide-y divide-primary-foreground/15 space-y-2">
                  <p className="text-[11px] text-primary-foreground/70 pb-1">
                    Veja o dinheiro líquido que cai na conta após taxas de maquininha ou descontos:
                  </p>
                  {paymentScenarios.map((sc) => (
                    <div key={sc.label} className="flex items-center justify-between pt-1.5 text-[11px]">
                      <span className="flex items-center gap-1.5 text-primary-foreground/80">
                        <span>{sc.icon}</span>
                        <span>{sc.label}</span>
                      </span>
                      <span
                        className={cn(
                          "numeric font-bold",
                          sc.isViable ? "text-white" : "text-destructive font-black",
                        )}
                      >
                        {brl(sc.profit)} ({pct(sc.margin)})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ponto de Cobertura do Lote (Break-Even) */}
            <div className="rounded-2xl bg-primary-foreground/10 p-4 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <Zap className="size-3.5 text-amber-300" /> Cobertura do Lote ({lotUnits} peças)
                </span>
                <span className="numeric text-white font-bold">
                  {lotBreakEven.unitsToBreakEven} un. ({pct(lotBreakEven.breakEvenPct)})
                </span>
              </div>
              <p className="text-[11px] text-primary-foreground/80 leading-relaxed">
                Vendendo apenas <strong>{lotBreakEven.unitsToBreakEven} peças</strong>, você quita 100% dos custos do lote ({brl(lotBreakEven.totalLotCost)}). As outras {Math.max(lotUnits - lotBreakEven.unitsToBreakEven, 0)} peças serão <strong>100% lucro líquido ({brl(lotBreakEven.profitOnRemainder)})</strong>.
              </p>
            </div>
          </div>

          {/* Ações Principais no Rodapé do Dashboard */}
          <div className="pt-4 border-t border-primary-foreground/15 space-y-2.5">
            <Button
              type="button"
              onClick={openEntryForCurrent}
              className="h-12 w-full rounded-2xl bg-white text-primary hover:bg-white/90 font-bold shadow-soft transition-all active:scale-[0.98]"
            >
              <PackagePlus className="mr-2 size-4" /> Dar Entrada no Estoque
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="h-10 w-full rounded-2xl border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 text-xs font-semibold"
            >
              <Save className="mr-1.5 size-3.5" /> Salvar no Histórico
            </Button>
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
              <Label className="text-xs font-semibold text-muted-foreground">Cor</Label>
              <Input
                value={entryColor}
                onChange={(e) => setEntryColor(e.target.value)}
                placeholder="Ex: Off-White"
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
  display: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground">{label}</Label>
        <span className="numeric text-sm font-bold text-primary">{display}</span>
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

