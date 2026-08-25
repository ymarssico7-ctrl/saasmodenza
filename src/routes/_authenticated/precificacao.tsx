import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calculator,
  Copy,
  Layers,
  PackagePlus,
  Palette,
  Plus,
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
import { pricingsQuery } from "@/lib/db";
import { brl, pct, toNumber } from "@/lib/format";
import { computePricing } from "@/lib/finance";
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

const PRESETS_GRADE = {
  letras: ["PP", "P", "M", "G", "GG"],
  plus: ["GG", "G1", "G2", "G3"],
  numeros: ["36", "38", "40", "42", "44", "46"],
};

function Precificacao() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { data: saved = [] } = useQuery(pricingsQuery());

  // ── Modo de Precificação ───────────────────────────────────────────
  const [mode, setMode] = useState<PricingMode>("unico");

  // ── Dados Básicos da Peça ─────────────────────────────────────────
  const [name, setName] = useState("");

  // ── Modo 1: Preço Único ───────────────────────────────────────────
  const [wholesale, setWholesale] = useState("");

  // ── Modo 2: Grade por Tamanho ─────────────────────────────────────
  const [activeSizes, setActiveSizes] = useState<string[]>(["P", "M", "G", "GG"]);
  const [baseWholesaleGrade, setBaseWholesaleGrade] = useState("");
  const [sizeCosts, setSizeCosts] = useState<Record<string, string>>({
    P: "",
    M: "",
    G: "",
    GG: "",
  });
  const [customSizeInput, setCustomSizeInput] = useState("");

  // ── Modo 3: Cor & Tamanho ─────────────────────────────────────────
  const [colors, setColors] = useState<string[]>(["Off-White", "Preto"]);
  const [colorInput, setColorInput] = useState("");
  const [colorCosts, setColorCosts] = useState<Record<string, string>>({
    "Off-White": "",
    Preto: "",
  });

  // ── Custos Operacionais Compartilhados ─────────────────────────────
  const [freight, setFreight] = useState("");
  const [packaging, setPackaging] = useState("");
  const [other, setOther] = useState("");
  const [margin, setMargin] = useState(80);
  const [tax, setTax] = useState(6);

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

  // ── Cálculo da Grade por Tamanho ──────────────────────────────────
  const gradeResults = useMemo(() => {
    return activeSizes.map((size) => {
      const costStr = sizeCosts[size] || baseWholesaleGrade;
      const wholesaleNum = toNumber(costStr);
      const res = computePricing({
        wholesale_cost: wholesaleNum,
        ...sharedCosts,
      });
      return {
        size,
        wholesale_cost: wholesaleNum,
        ...res,
      };
    });
  }, [activeSizes, sizeCosts, baseWholesaleGrade, sharedCosts]);

  // ── Cálculo de Cor & Tamanho ──────────────────────────────────────
  const colorResults = useMemo(() => {
    const list: Array<{
      color: string;
      size?: string;
      wholesale_cost: number;
      realCost: number;
      minPrice: number;
      suggestedPrice: number;
      profit: number;
      marginOnPrice: number;
      markupOnCost: number;
    }> = [];

    colors.forEach((color) => {
      const wholesaleNum = toNumber(colorCosts[color] || baseWholesaleGrade || wholesale);
      const res = computePricing({
        wholesale_cost: wholesaleNum,
        ...sharedCosts,
      });
      list.push({
        color,
        wholesale_cost: wholesaleNum,
        ...res,
      });
    });

    return list;
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
  const replicarCustoBaseGrade = () => {
    if (!baseWholesaleGrade.trim()) {
      toast.error("Informe um custo base primeiro");
      return;
    }
    const updated: Record<string, string> = {};
    activeSizes.forEach((sz) => {
      updated[sz] = baseWholesaleGrade;
    });
    setSizeCosts(updated);
    toast.success("Custo replicado para todos os tamanhos da grade!");
  };

  const toggleSize = (sz: string) => {
    if (activeSizes.includes(sz)) {
      if (activeSizes.length <= 1) {
        toast.error("Mantenha ao menos um tamanho na grade");
        return;
      }
      setActiveSizes((prev) => prev.filter((s) => s !== sz));
    } else {
      setActiveSizes((prev) => [...prev, sz]);
      if (baseWholesaleGrade && !sizeCosts[sz]) {
        setSizeCosts((prev) => ({ ...prev, [sz]: baseWholesaleGrade }));
      }
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
    if (baseWholesaleGrade) {
      setSizeCosts((prev) => ({ ...prev, [trimmed]: baseWholesaleGrade }));
    }
    setCustomSizeInput("");
    toast.success(`Tamanho ${trimmed} adicionado à grade`);
  };

  const applyPresetGrade = (sizes: string[]) => {
    setActiveSizes(sizes);
    if (baseWholesaleGrade) {
      const updated: Record<string, string> = {};
      sizes.forEach((s) => {
        updated[s] = baseWholesaleGrade;
      });
      setSizeCosts(updated);
    }
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

  // ── Mutações ──────────────────────────────────────────────────────
  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Dê um nome para a peça");

      const primaryWholesale =
        mode === "unico"
          ? toNumber(wholesale)
          : mode === "grade"
            ? summaryPrices.avgCost - sharedCosts.freight_cost - sharedCosts.packaging_cost - sharedCosts.other_costs
            : toNumber(Object.values(colorCosts)[0] || wholesale || baseWholesaleGrade);

      if (primaryWholesale <= 0 && summaryPrices.avgCost <= 0) {
        throw new Error("Informe o custo de atacado das peças");
      }

      return insertPricing({
        storeId,
        name: name.trim(),
        wholesale_cost: Math.max(primaryWholesale, 0.01),
        ...sharedCosts,
      });
    },
    onSuccess: () => {
      toast.success("Precificação salva com sucesso!");
      setName("");
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

  const sendToInventory = useMutation({
    mutationFn: async ({
      name: itemName,
      costPrice,
      salePrice,
      customSizes,
    }: {
      name: string;
      costPrice: number;
      salePrice: number;
      customSizes?: Record<string, number>;
    }) => {
      const finalSizes: Record<string, number> =
        customSizes && Object.keys(customSizes).length > 0
          ? customSizes
          : mode === "grade"
            ? activeSizes.reduce((acc, sz) => ({ ...acc, [sz]: 1 }), {})
            : { P: 1, M: 1, G: 1, GG: 1 };

      return insertInventoryItem({
        storeId,
        name: itemName,
        category: "vestido",
        cost_price: costPrice,
        sale_price: salePrice,
        sizes: finalSizes,
      });
    },
    onSuccess: (_, vars) => {
      toast.success(`"${vars.name}" cadastrada no Estoque! 📦`, {
        description: `Custo: ${brl(vars.costPrice)} · Preço: ${brl(vars.salePrice)}`,
      });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Precificação Inteligente"
        title="Quanto cobrar por cada peça?"
        description="Some todos os custos, escolha a margem e precifique por peça única, por grade de tamanhos ou por variações de cor."
      />

      {/* ── Segmented Control Apple (Seleção de Modo) ─────────────── */}
      <div className="flex justify-center sm:justify-start">
        <div className="inline-flex rounded-2xl border border-border bg-surface p-1.5 shadow-soft">
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

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* ── Formulário de Custos ──────────────────────────────────── */}
        <section className="panel p-6 sm:p-7">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-semibold">
                {mode === "unico" && "Custos da peça (Preço Único)"}
                {mode === "grade" && "Custos por Grade de Tamanhos"}
                {mode === "cor_tamanho" && "Custos por Variação de Cores"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {mode === "unico" && "Mesmo custo e preço de venda para toda a peça."}
                {mode === "grade" && "Defina valores diferentes para tamanhos maiores ou especiais."}
                {mode === "cor_tamanho" && "Precifique variações com custos de tecido ou estampa diferentes."}
              </p>
            </div>
            <Badge variant="outline" className="rounded-full text-xs capitalize">
              {mode === "unico" && "1 Preço"}
              {mode === "grade" && `${activeSizes.length} Tamanhos`}
              {mode === "cor_tamanho" && `${colors.length} Cores`}
            </Badge>
          </div>

          <div className="mt-6 space-y-6">
            <Field label="Nome da peça / modelo">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Vestido midi linho com fenda"
                className="h-11 rounded-xl"
              />
            </Field>

            {/* ── MODO 1: Preço Único ─────────────────────────────────── */}
            {mode === "unico" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Custo de atacado (R$)" className="sm:col-span-2">
                  <Input
                    inputMode="decimal"
                    value={wholesale}
                    onChange={(e) => setWholesale(e.target.value)}
                    placeholder="59,90"
                    className="h-11 rounded-xl font-medium"
                  />
                </Field>
              </div>
            )}

            {/* ── MODO 2: Grade por Tamanho ───────────────────────────── */}
            {mode === "grade" && (
              <div className="space-y-5 rounded-2xl border border-border bg-secondary/30 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tamanhos Ativos na Grade
                  </span>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground mr-1">Presets:</span>
                    <button
                      type="button"
                      onClick={() => applyPresetGrade(PRESETS_GRADE.letras)}
                      className="rounded-lg border border-border bg-card px-2 py-1 hover:border-primary"
                    >
                      PP-GG
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetGrade(PRESETS_GRADE.plus)}
                      className="rounded-lg border border-border bg-card px-2 py-1 hover:border-primary"
                    >
                      Plus Size
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetGrade(PRESETS_GRADE.numeros)}
                      className="rounded-lg border border-border bg-card px-2 py-1 hover:border-primary"
                    >
                      36-46
                    </button>
                  </div>
                </div>

                {/* Chips de Tamanhos */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeSizes.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => toggleSize(sz)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary shadow-xs transition-colors hover:bg-destructive-soft hover:text-destructive"
                      title="Clique para remover tamanho"
                    >
                      {sz} <X className="size-3" />
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      value={customSizeInput}
                      onChange={(e) => setCustomSizeInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSize())}
                      placeholder="+ Tam"
                      className="h-8 w-20 rounded-xl text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={addCustomSize}
                      className="size-8 rounded-xl"
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Custo Base Rápido */}
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Field label="Custo base comum para a grade (R$)">
                    <Input
                      inputMode="decimal"
                      value={baseWholesaleGrade}
                      onChange={(e) => setBaseWholesaleGrade(e.target.value)}
                      placeholder="49,90"
                      className="h-10 rounded-xl"
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={replicarCustoBaseGrade}
                    className="h-10 rounded-xl text-xs"
                  >
                    <Copy className="mr-1.5 size-3.5" /> Replicar para todos
                  </Button>
                </div>

                {/* Grade Granular de Custos por Tamanho */}
                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Custos Específicos por Tamanho:
                  </Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activeSizes.map((sz) => {
                      const computedItem = gradeResults.find((r) => r.size === sz);
                      return (
                        <div
                          key={sz}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-secondary text-xs font-bold">
                              {sz}
                            </span>
                            {computedItem && computedItem.suggestedPrice > 0 && (
                              <span className="numeric text-[11px] font-semibold text-primary">
                                Venda: {brl(computedItem.suggestedPrice)}
                              </span>
                            )}
                          </div>
                          <div className="w-28">
                            <Input
                              inputMode="decimal"
                              value={sizeCosts[sz] ?? ""}
                              onChange={(e) =>
                                setSizeCosts((prev) => ({ ...prev, [sz]: e.target.value }))
                              }
                              placeholder={baseWholesaleGrade || "0,00"}
                              className="h-8 rounded-lg text-right text-xs"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── MODO 3: Cor & Variação ──────────────────────────────── */}
            {mode === "cor_tamanho" && (
              <div className="space-y-5 rounded-2xl border border-border bg-secondary/30 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cores / Variações de Tecido
                  </span>
                </div>

                {/* Adicionar Nova Cor */}
                <div className="flex items-center gap-2">
                  <Input
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
                    placeholder="Nome da cor / variação (ex: Linho Cru)"
                    className="h-10 rounded-xl"
                  />
                  <Button type="button" onClick={addColor} className="h-10 rounded-xl px-4 text-xs">
                    <Plus className="mr-1 size-3.5" /> Adicionar
                  </Button>
                </div>

                {/* Lista de Variações de Cores com Custo Individual */}
                <div className="space-y-2">
                  {colors.map((c) => {
                    const item = colorResults.find((r) => r.color === c);
                    return (
                      <div
                        key={c}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{c}</span>
                          {item && item.suggestedPrice > 0 && (
                            <Badge variant="secondary" className="numeric text-[11px] font-semibold text-primary">
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
                              placeholder="Custo R$"
                              className="h-8 rounded-lg text-right text-xs"
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
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Custos Operacionais Rateados (por peça)
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
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

            <Button
              className="mt-6 h-12 w-full rounded-2xl font-semibold shadow-glow gradient-primary"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              <Save className="mr-2 size-4" /> Salvar precificação
            </Button>
          </div>
        </section>

        {/* ── Painel de Resultados Inteligente (Dark / Indigo) ──────── */}
        <section className="panel flex flex-col justify-between bg-primary p-6 text-primary-foreground sm:p-7 shadow-lift">
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

              {/* Valor Principal ou Faixa de Preços */}
              {summaryPrices.hasMultiple ? (
                <div className="mt-3">
                  <p className="numeric text-[2.2rem] font-bold leading-tight">
                    {brl(summaryPrices.minSuggested)} – {brl(summaryPrices.maxSuggested)}
                  </p>
                  <p className="mt-1 text-xs text-primary-foreground/70">
                    Faixa de preços calculada para a grade de tamanhos/cores
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="numeric text-[2.75rem] font-semibold leading-none">
                    {brl(summaryPrices.avgSuggested)}
                  </p>
                  <p className="mt-2 text-xs text-primary-foreground/70">
                    Lucro líquido de {brl(summaryPrices.avgProfit)} por unidade vendida
                  </p>
                </div>
              )}
            </div>

            {/* Dois indicadores distintos para clareza financeira */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-primary-foreground/10 p-4 backdrop-blur-xs">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/60">
                  Markup sobre Custo
                </p>
                <p className="numeric mt-1.5 text-xl font-bold">{pct(margin)}</p>
                <p className="mt-1 text-[11px] text-primary-foreground/60">
                  Quanto o preço sobe acima do custo
                </p>
              </div>
              <div className="rounded-xl bg-primary-foreground/20 p-4 backdrop-blur-xs">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/60">
                  Margem Real s/ Venda
                </p>
                <p className="numeric mt-1.5 text-xl font-bold">
                  {pct(
                    summaryPrices.avgSuggested > 0
                      ? (summaryPrices.avgProfit / summaryPrices.avgSuggested) * 100
                      : 0,
                  )}
                </p>
                <p className="mt-1 text-[11px] text-primary-foreground/60">
                  % da venda que vira lucro líquido
                </p>
              </div>
            </div>

            {/* Tabela de Variações para Grade ou Cores */}
            {mode === "grade" && gradeResults.length > 0 && (
              <div className="space-y-2 rounded-2xl bg-primary-foreground/10 p-4 text-xs">
                <p className="font-semibold uppercase tracking-wider text-primary-foreground/80 mb-2">
                  Tabela da Grade por Tamanho
                </p>
                <div className="divide-y divide-primary-foreground/15 max-h-48 overflow-y-auto pr-1">
                  {gradeResults.map((gr) => (
                    <div key={gr.size} className="flex items-center justify-between py-2">
                      <span className="font-bold">{gr.size}</span>
                      <span className="text-primary-foreground/70">Custo: {brl(gr.realCost)}</span>
                      <span className="font-semibold text-primary-foreground">
                        {brl(gr.suggestedPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mode === "cor_tamanho" && colorResults.length > 0 && (
              <div className="space-y-2 rounded-2xl bg-primary-foreground/10 p-4 text-xs">
                <p className="font-semibold uppercase tracking-wider text-primary-foreground/80 mb-2">
                  Tabela por Variação de Cor
                </p>
                <div className="divide-y divide-primary-foreground/15 max-h-48 overflow-y-auto pr-1">
                  {colorResults.map((cr) => (
                    <div key={cr.color} className="flex items-center justify-between py-2">
                      <span className="font-bold">{cr.color}</span>
                      <span className="text-primary-foreground/70">Custo: {brl(cr.realCost)}</span>
                      <span className="font-semibold text-primary-foreground">
                        {brl(cr.suggestedPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumo de Custos e Impostos */}
            <div className="space-y-3 rounded-2xl bg-primary-foreground/10 p-4 text-sm">
              <Row label="Custo real médio" value={brl(summaryPrices.avgCost)} />
              <Row label="Imposto estimado por peça" value={brl(summaryPrices.avgSuggested * (tax / 100))} />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-primary-foreground/15">
            <p className="text-xs leading-relaxed text-primary-foreground/70">
              💡 <strong>Dica de Loja:</strong> Peças maiores (G1/G2) com custo adicional de tecido
              podem ter precificação diferenciada sem comprometer a sua margem de lucro.
            </p>
          </div>
        </section>
      </div>

      {/* ── Peças Precificadas (Histórico & 1-Clique Estoque) ─────── */}
      <section className="panel p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Peças precificadas</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Consulte seu histórico de cálculos e envie peças diretamente para o Estoque com 1 clique.
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
            description="Calcule e salve suas precificações para consultar depois na hora de etiquetar e enviar ao estoque."
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
                            size="icon"
                            title="Cadastrar esta peça no Estoque com este preço"
                            className="size-8 rounded-full text-muted-foreground hover:bg-primary-soft hover:text-primary"
                            disabled={sendToInventory.isPending}
                            onClick={() =>
                              sendToInventory.mutate({
                                name: p.name,
                                costPrice: r.realCost,
                                salePrice: r.suggestedPrice,
                              })
                            }
                          >
                            <PackagePlus className="size-4" />
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
