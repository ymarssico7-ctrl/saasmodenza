import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Boxes,
  Calculator,
  Check,
  ChevronRight,
  Layers,
  Minus,
  PackagePlus,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Tag,
  Trash2,
  X,
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
import { computePricing, INVENTORY_CATEGORIES } from "@/lib/finance";
import { useStore } from "@/lib/store-context";
import { insertPricing, deletePricing, insertInventoryItem } from "@/lib/mutations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/precificacao")({
  head: () => ({
    meta: [
      { title: "Precificação com margem real — Vestuli" },
      {
        name: "description",
        content:
          "Calcule o preço de venda das suas peças considerando atacado, frete, embalagem, imposto, grade de tamanhos e variações de cores.",
      },
      { property: "og:title", content: "Precificação com margem real — Vestuli" },
      {
        property: "og:description",
        content: "Descubra o preço mínimo e o preço ideal de cada peça por grade ou preço único.",
      },
    ],
  }),
  component: Precificacao,
});

type PricingMode = "unico" | "grade" | "cor_tamanho";

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

  // ── Modo de Precificação ───────────────────────────────────────────
  const [mode, setMode] = useState<PricingMode>("grade");

  // ── Dados Básicos da Peça ─────────────────────────────────────────
  const [name, setName] = useState("");

  // ── Modo 1: Preço Único ───────────────────────────────────────────
  const [wholesale, setWholesale] = useState("");

  // ── Modo 2: Grade por Tamanho ─────────────────────────────────────
  const [activeSizes, setActiveSizes] = useState<string[]>(["P", "M", "G", "GG"]);
  const [baseWholesaleGrade, setBaseWholesaleGrade] = useState("49,90");
  const [sizeCosts, setSizeCosts] = useState<Record<string, string>>({});
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [activePreset, setActivePreset] = useState<string>("letras");

  // ── Modo 3: Cor & Tamanho ─────────────────────────────────────────
  const [colors, setColors] = useState<string[]>(["Off-White", "Preto"]);
  const [colorInput, setColorInput] = useState("");
  const [colorCosts, setColorCosts] = useState<Record<string, string>>({
    "Off-White": "",
    Preto: "",
  });

  // ── Custos Operacionais Compartilhados ─────────────────────────────
  const [freight, setFreight] = useState("6,00");
  const [packaging, setPackaging] = useState("3,50");
  const [other, setOther] = useState("2,00");
  const [margin, setMargin] = useState(80);
  const [tax, setTax] = useState(6);

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

  // ── Custos Compartilhados Numéricos ────────────────────────────────
  const sharedCosts = useMemo(
    () => ({
      freight_cost: toNumber(freight),
      packaging_cost: toNumber(packaging),
      other_costs: toNumber(other),
      margin_pct: margin,
      tax_pct: tax,
    }),
    [freight, packaging, other, margin, tax],
  );

  // ── Cálculo do Preço Único ────────────────────────────────────────
  const singleResult = useMemo(
    () =>
      computePricing({
        wholesale_cost: toNumber(wholesale),
        ...sharedCosts,
      }),
    [wholesale, sharedCosts],
  );

  // ── Cálculo da Grade por Tamanho com REATIVIDADE AUTOMÁTICA ────────
  // Se o lojista não digitou custo individual, usa o CUSTO BASE automaticamente!
  const gradeResults = useMemo(() => {
    const baseNum = toNumber(baseWholesaleGrade);
    return activeSizes.map((size) => {
      const rawCost = sizeCosts[size];
      const hasCustom = rawCost !== undefined && rawCost !== "" && toNumber(rawCost) > 0;
      const wholesaleNum = hasCustom ? toNumber(rawCost) : baseNum;

      const res = computePricing({
        wholesale_cost: wholesaleNum,
        ...sharedCosts,
      });
      return {
        size,
        wholesale_cost: wholesaleNum,
        isCustom: hasCustom && wholesaleNum !== baseNum,
        ...res,
      };
    });
  }, [activeSizes, sizeCosts, baseWholesaleGrade, sharedCosts]);

  // ── Cálculo de Cor & Variação ──────────────────────────────────────
  const colorResults = useMemo(() => {
    const baseNum = toNumber(baseWholesaleGrade || wholesale);
    return colors.map((color) => {
      const rawCost = colorCosts[color];
      const hasCustom = rawCost !== undefined && rawCost !== "" && toNumber(rawCost) > 0;
      const wholesaleNum = hasCustom ? toNumber(rawCost) : baseNum;

      const res = computePricing({
        wholesale_cost: wholesaleNum,
        ...sharedCosts,
      });
      return {
        color,
        wholesale_cost: wholesaleNum,
        isCustom: hasCustom && wholesaleNum !== baseNum,
        ...res,
      };
    });
  }, [colors, colorCosts, baseWholesaleGrade, wholesale, sharedCosts]);

  // ── Resumo Geral de Preços (Range / Médias) ───────────────────────
  const summaryPrices = useMemo(() => {
    if (mode === "unico") {
      return {
        minSuggested: singleResult.suggestedPrice,
        maxSuggested: singleResult.suggestedPrice,
        avgSuggested: singleResult.suggestedPrice,
        avgProfit: singleResult.profit,
        avgCost: singleResult.realCost,
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
        hasMultiple: items.length > 1,
      };
    }

    const prices = valid.map((v) => v.suggestedPrice);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const avgP = prices.reduce((a, b) => a + b, 0) / prices.length;
    const avgProf = valid.reduce((a, b) => a + b.profit, 0) / valid.length;
    const avgC = valid.reduce((a, b) => a + b.realCost, 0) / valid.length;

    return {
      minSuggested: minP,
      maxSuggested: maxP,
      avgSuggested: avgP,
      avgProfit: avgProf,
      avgCost: avgC,
      hasMultiple: minP !== maxP,
    };
  }, [mode, singleResult, gradeResults, colorResults]);

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

  const addCustomSize = () => {
    const trimmed = customSizeInput.trim().toUpperCase();
    if (!trimmed) return;
    if (activeSizes.includes(trimmed)) {
      toast.error("Tamanho já está na grade");
      return;
    }
    setActiveSizes((prev) => [...prev, trimmed]);
    setCustomSizeInput("");
    setActivePreset("custom");
    toast.success(`Tamanho ${trimmed} adicionado à grade`);
  };

  const applyPreset = (presetId: string, sizes: string[]) => {
    setActivePreset(presetId);
    setActiveSizes(sizes);
    toast.success(`Grade "${PRESET_OPTIONS.find((p) => p.id === presetId)?.label}" ativada!`);
  };

  const resetSizeCost = (sz: string) => {
    setSizeCosts((prev) => {
      const next = { ...prev };
      delete next[sz];
      return next;
    });
    toast.info(`Tamanho ${sz} restaurado para o custo base (${brl(toNumber(baseWholesaleGrade))})`);
  };

  // ── Ações de Cores ────────────────────────────────────────────────
  const addColor = () => {
    const trimmed = colorInput.trim();
    if (!trimmed) return;
    if (colors.includes(trimmed)) {
      toast.error("Cor já adicionada");
      return;
    }
    setColors((prev) => [...prev, trimmed]);
    setColorInput("");
    toast.success(`Cor "${trimmed}" adicionada`);
  };

  const removeColor = (c: string) => {
    if (colors.length <= 1) {
      toast.error("Mantenha ao menos uma cor");
      return;
    }
    setColors((prev) => prev.filter((col) => col !== c));
  };

  // ── Abrir Ficha de Entrada no Estoque ─────────────────────────────
  const openEntryForCurrent = () => {
    const pieceName = name.trim() || "Nova Peça Precificada";
    setEntryName(pieceName);
    setEntryCostPrice(summaryPrices.avgCost || 0);
    setEntrySalePrice(summaryPrices.avgSuggested || 0);
    setEntryColor(colors[0] || "");
    setEntrySupplier("");
    const initialSizes: Record<string, number> = {};
    if (mode === "grade") {
      activeSizes.forEach((sz) => {
        initialSizes[sz] = 2;
      });
    } else {
      ["P", "M", "G", "GG"].forEach((sz) => {
        initialSizes[sz] = 2;
      });
    }
    setEntrySizes(initialSizes);
    setEntryPhotoUrl("");
    setEntrySheetOpen(true);
  };

  const openEntryForSaved = (p: (typeof saved)[0], realCost: number, suggestedPrice: number) => {
    setEntryName(p.name);
    setEntryCostPrice(realCost);
    setEntrySalePrice(suggestedPrice);
    setEntryColor("");
    setEntrySupplier("");
    setEntrySizes({ P: 2, M: 4, G: 4, GG: 2 });
    setEntryPhotoUrl("");
    setEntrySheetOpen(true);
  };

  // ── Totais do Lote na Ficha de Entrada ─────────────────────────────
  const entryTotalUnits = Object.values(entrySizes).reduce(
    (acc, val) => acc + Number(val || 0),
    0,
  );
  const entryTotalCost = entryTotalUnits * entryCostPrice;
  const entryTotalRevenue = entryTotalUnits * entrySalePrice;

  // ── Mutações ──────────────────────────────────────────────────────
  const save = useMutation({
    mutationFn: async () => {
      const pieceName = name.trim() || "Peça sem nome";

      const primaryWholesale =
        mode === "unico"
          ? toNumber(wholesale)
          : mode === "grade"
            ? toNumber(baseWholesaleGrade) || summaryPrices.avgCost
            : toNumber(Object.values(colorCosts)[0] || wholesale || baseWholesaleGrade);

      if (primaryWholesale <= 0 && summaryPrices.avgCost <= 0) {
        throw new Error("Informe o custo de atacado das peças");
      }

      return insertPricing({
        storeId,
        name: pieceName,
        wholesale_cost: Math.max(primaryWholesale, 0.01),
        ...sharedCosts,
      });
    },
    onSuccess: () => {
      toast.success("Precificação salva no seu histórico! 📋");
      void queryClient.invalidateQueries({ queryKey: ["pricings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deletePricing(storeId, id),
    onSuccess: () => {
      toast.success("Precificação excluída");
      void queryClient.invalidateQueries({ queryKey: ["pricings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmEntryMutation = useMutation({
    mutationFn: async () => {
      if (!entryName.trim()) throw new Error("Informe o nome da peça");
      if (entryTotalUnits <= 0) throw new Error("Adicione ao menos 1 unidade na grade de tamanhos");

      return insertInventoryItem({
        storeId,
        name: entryName.trim(),
        category: entryCategory,
        color: entryColor.trim() || null,
        supplier: entrySupplier.trim() || null,
        cost_price: entryCostPrice,
        sale_price: entrySalePrice,
        sizes: entrySizes,
        photo_url: entryPhotoUrl || null,
      });
    },
    onSuccess: () => {
      setEntrySheetOpen(false);
      toast.success(`"${entryName}" cadastrada no Estoque! 📦`, {
        description: `Grade com ${entryTotalUnits} unidades disponível para venda.`,
        duration: 5000,
      });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Calculadora Estratégica"
        title="Quanto cobrar por cada peça?"
        description="Calcule custos reais, margem ideal e precifique por grade de tamanhos, cores ou preço único."
      />

      {/* ── Segmented Control Apple (Seleção de Modo) ─────────────── */}
      <div className="flex justify-center sm:justify-start">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        {/* ── Formulário de Custos (Painel Esquerdo) ────────────────── */}
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
                  "Defina o custo base comum e ajuste apenas os tamanhos que custarem diferente."}
                {mode === "unico" && "Um único valor de custo e preço de venda para a peça inteira."}
                {mode === "cor_tamanho" &&
                  "Precifique variações com custos de tecido ou estampa distintos."}
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

          {/* ── MODO 2: GRADE POR TAMANHO (PADRÃO APPLE) ────────────── */}
          {mode === "grade" && (
            <div className="space-y-5 rounded-2xl border border-border bg-secondary/30 p-5">
              {/* Seletor de Presets de Grade em Pills */}
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

              {/* Bloco de Destaque: Custo Base com Reatividade Total */}
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

              {/* Tiles Interativos dos Tamanhos da Grade */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tamanhos & Custos Individuais
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Edite apenas se algum tamanho custar mais
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {activeSizes.map((sz) => {
                    const item = gradeResults.find((r) => r.size === sz);
                    const isCustom =
                      sizeCosts[sz] !== undefined &&
                      sizeCosts[sz] !== "" &&
                      toNumber(sizeCosts[sz]) !== toNumber(baseWholesaleGrade);

                    return (
                      <div
                        key={sz}
                        className={cn(
                          "relative rounded-2xl border p-3 flex flex-col justify-between space-y-2 transition-all duration-200",
                          isCustom
                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                            : "border-border bg-card hover:border-border/80",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-secondary text-xs font-bold">
                            {sz}
                          </span>
                          {isCustom ? (
                            <button
                              type="button"
                              onClick={() => resetSizeCost(sz)}
                              title="Restaurar ao custo base"
                              className="text-primary hover:text-primary/70 text-[10px] font-semibold flex items-center gap-0.5"
                            >
                              <RotateCcw className="size-2.5" /> Base
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleSize(sz)}
                              title="Remover tamanho"
                              className="text-muted-foreground hover:text-destructive size-5 rounded-md flex items-center justify-center"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                            {isCustom ? "Custo Especial" : "Custo (R$)"}
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

                        <div className="border-t border-border/60 pt-1.5 flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Venda:</span>
                          <span className="numeric font-bold text-primary">
                            {item && item.suggestedPrice > 0
                              ? brl(item.suggestedPrice)
                              : "R$ 0,00"}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Tile para Adicionar Tamanho Personalizado */}
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-2.5 flex flex-col justify-center items-center gap-1.5">
                    <Input
                      value={customSizeInput}
                      onChange={(e) => setCustomSizeInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addCustomSize())
                      }
                      placeholder="+ Tam (ex: G4)"
                      className="h-7 rounded-lg text-xs text-center font-medium"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomSize}
                      className="h-6 w-full rounded-lg text-[11px] font-semibold"
                    >
                      <Plus className="size-3 mr-0.5" /> Incluir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── MODO 1: PREÇO ÚNICO ─────────────────────────────────── */}
          {mode === "unico" && (
            <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-4">
              <Field label="Custo de atacado por peça (R$)">
                <Input
                  inputMode="decimal"
                  value={wholesale}
                  onChange={(e) => setWholesale(e.target.value)}
                  placeholder="59,90"
                  className="h-11 rounded-xl bg-card font-semibold text-base"
                />
              </Field>
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
                  placeholder="Nova cor ou variação de tecido (ex: Linho Cru)"
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
                            Venda: {brl(item.suggestedPrice)}
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

          {/* ── Sliders de Margem e Impostos ────────────────────────── */}
          <div className="space-y-6 border-t border-border pt-4">
            <SliderRow
              label="Margem desejada (Markup sobre o custo)"
              value={margin}
              max={300}
              onChange={setMargin}
              display={pct(margin)}
            />
            <SliderRow
              label="Imposto / taxas sobre a venda"
              value={tax}
              max={30}
              onChange={setTax}
              display={pct(tax)}
            />
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
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground">
                  <Sparkles className="size-3" /> Margem Otimizada
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
                    Lucro líquido médio de {brl(summaryPrices.avgProfit)} por unidade vendida
                  </p>
                </div>
              )}
            </div>

            {/* 3 Hero Metric Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl bg-primary-foreground/10 p-3 backdrop-blur-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/60">
                  Markup
                </p>
                <p className="numeric mt-1 text-lg font-bold">{pct(margin)}</p>
              </div>
              <div className="rounded-xl bg-primary-foreground/20 p-3 backdrop-blur-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/60">
                  Margem Real
                </p>
                <p className="numeric mt-1 text-lg font-bold">
                  {pct(
                    summaryPrices.avgSuggested > 0
                      ? (summaryPrices.avgProfit / summaryPrices.avgSuggested) * 100
                      : 0,
                  )}
                </p>
              </div>
              <div className="rounded-xl bg-primary-foreground/10 p-3 backdrop-blur-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/60">
                  Lucro Médio
                </p>
                <p className="numeric mt-1 text-base font-bold">
                  {brl(summaryPrices.avgProfit)}
                </p>
              </div>
            </div>

            {/* Tabela de Variações da Grade */}
            {mode === "grade" && gradeResults.length > 0 && (
              <div className="space-y-2 rounded-2xl bg-primary-foreground/10 p-4 text-xs">
                <div className="flex items-center justify-between text-primary-foreground/80 font-semibold uppercase tracking-wider text-[10px]">
                  <span>Tamanho</span>
                  <span>Custo Real</span>
                  <span>Preço Sugerido</span>
                </div>
                <div className="divide-y divide-primary-foreground/15 max-h-48 overflow-y-auto pr-1">
                  {gradeResults.map((gr) => (
                    <div key={gr.size} className="flex items-center justify-between py-2">
                      <span className="font-bold flex items-center gap-1.5">
                        {gr.size}
                        {gr.isCustom && (
                          <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[9px] font-normal">
                            Especial
                          </span>
                        )}
                      </span>
                      <span className="text-primary-foreground/70">{brl(gr.realCost)}</span>
                      <span className="font-bold text-primary-foreground">
                        {brl(gr.suggestedPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumo de Custos e Impostos */}
            <div className="space-y-2.5 rounded-2xl bg-primary-foreground/10 p-4 text-sm">
              <Row label="Custo real médio da peça" value={brl(summaryPrices.avgCost)} />
              <Row
                label="Imposto estimado por venda"
                value={brl(summaryPrices.avgSuggested * (tax / 100))}
              />
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
                  <th className="pb-3 font-semibold">Markup</th>
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
                      <td className="numeric py-3.5 text-muted-foreground">
                        {pct(Number(p.margin_pct))}
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

          {/* ── Foto da Peça ── */}
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

          {/* ── Categoria, Cor e Fornecedor ── */}
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

          {/* ── Grade de Quantidades Recebidas ── */}
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

          {/* ── Card Resumo Financeiro do Lote ── */}
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

          {/* ── Botão de Confirmação ── */}
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
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
        <span className="numeric text-sm font-semibold">{display}</span>
      </div>
      <Slider
        className="mt-4"
        value={[value]}
        max={max}
        step={1}
        onValueChange={(v) => onChange(v[0] ?? 0)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-primary-foreground/70">{label}</span>
      <span className="numeric font-semibold">{value}</span>
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
