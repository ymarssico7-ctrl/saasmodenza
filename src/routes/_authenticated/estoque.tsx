import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Boxes, Calculator, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "@/components/ui/image-uploader";
import { inventoryQuery, pricingsQuery } from "@/lib/db";
import { brl, toNumber } from "@/lib/format";
import { INVENTORY_CATEGORIES, SIZE_GRID, labelOf, computePricing } from "@/lib/finance";
import { getAutoPublish, patchShowcaseConfig } from "@/lib/showcase-store";
import { useStore } from "@/lib/store-context";
import { insertInventoryItem, deleteInventoryItem } from "@/lib/mutations";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque por grade — Vestuli" },
      {
        name: "description",
        content: "Controle peças, tamanhos, custo e preço de venda do estoque da sua loja.",
      },
      { property: "og:title", content: "Estoque por grade — Vestuli" },
      {
        property: "og:description",
        content: "Peças e tamanhos organizados, com valor total em estoque.",
      },
    ],
  }),
  component: Estoque,
});

type Sizes = Record<string, number>;

function Estoque() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { data: items = [] } = useQuery(inventoryQuery());
  const { data: pricings = [] } = useQuery(pricingsQuery());

  const [name, setName] = useState("");
  const [category, setCategory] = useState("vestido");
  const [color, setColor] = useState("");
  const [supplier, setSupplier] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [sizes, setSizes] = useState<Sizes>({ PP: 0, P: 0, M: 0, G: 0, GG: 0 });
  const [photoUrl, setPhotoUrl] = useState("");

  const totalUnits = items.reduce((acc, i) => {
    const s = (i.sizes ?? {}) as Sizes;
    return acc + Object.values(s).reduce((a, b) => a + (Math.round(toNumber(b)) || 0), 0);
  }, 0);
  const stockValue = items.reduce((acc, i) => {
    const s = (i.sizes ?? {}) as Sizes;
    const units = Object.values(s).reduce((a, b) => a + (Math.round(toNumber(b)) || 0), 0);
    const cost = toNumber(i.cost_price);
    return acc + (isNaN(cost) ? 0 : units * cost);
  }, 0);
  const potential = items.reduce((acc, i) => {
    const s = (i.sizes ?? {}) as Sizes;
    const units = Object.values(s).reduce((a, b) => a + (Math.round(toNumber(b)) || 0), 0);
    const salePrice = toNumber(i.sale_price);
    return acc + (isNaN(salePrice) ? 0 : units * salePrice);
  }, 0);

  const create = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Informe o nome da peça");
      const salePriceNum = toNumber(price);
      if (isNaN(salePriceNum) || salePriceNum <= 0) {
        throw new Error("Informe um preço de venda válido (maior que zero)");
      }
      const costNum = toNumber(cost);
      if (isNaN(costNum) || costNum < 0) {
        throw new Error("Informe um custo de aquisição válido");
      }
      return insertInventoryItem({
        storeId,
        name: name.trim(),
        category,
        color: color.trim() || null,
        supplier: supplier.trim() || null,
        cost_price: costNum,
        sale_price: salePriceNum,
        sizes,
        photo_url: photoUrl || null,
      });
    },
    onSuccess: (newId) => {
      toast.success("Peça adicionada ao estoque");
      setName("");
      setColor("");
      setCost("");
      setPrice("");
      setPhotoUrl("");
      setSizes({ PP: 0, P: 0, M: 0, G: 0, GG: 0 });
      // Auto-publicar na vitrine se a flag estiver ativa
      if (newId && getAutoPublish()) {
        patchShowcaseConfig(newId, { ativo: true });
        toast.info("Peça publicada automaticamente na vitrine", {
          description: "Você pode ajustar a visibilidade em Loja → Produtos.",
          duration: 4000,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteInventoryItem(storeId, id),
    onSuccess: () => {
      toast.success("Peça removida");
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Estoque"
        title="Suas peças, tamanho por tamanho"
        description="Saiba quanto você tem parado em estoque e quanto isso pode virar em vendas."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Peças em estoque"
          value={String(totalUnits)}
          icon={<Boxes className="size-4" />}
          tone="primary"
        />
        <StatCard label="Valor investido" value={brl(stockValue)} />
        <StatCard label="Potencial de venda" value={brl(potential)} tone="positive" />
      </div>

      <section className="panel p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Nova peça</h2>
            <p className="text-xs text-muted-foreground">
              Cadastre a peça com fotos, categoria e quantidade por tamanho.
            </p>
          </div>
          {pricings.length > 0 && (
            <Select
              value=""
              onValueChange={(pricingId) => {
                const p = pricings.find((item) => item.id === pricingId);
                if (p) {
                  const r = computePricing({
                    wholesale_cost: Number(p.wholesale_cost),
                    freight_cost: Number(p.freight_cost),
                    packaging_cost: Number(p.packaging_cost),
                    other_costs: Number(p.other_costs),
                    margin_pct: Number(p.margin_pct),
                    tax_pct: Number(p.tax_pct),
                    card_rate_pct: 3.5,
                  });
                  setName(p.name);
                  setCost(r.realCost.toFixed(2).replace(".", ","));
                  setPrice(r.suggestedPrice.toFixed(2).replace(".", ","));
                  toast.success(`Valores importados da precificação "${p.name}"! 💡`, {
                    description: `Custo: ${brl(r.realCost)} · Venda: ${brl(r.suggestedPrice)}`,
                  });
                }
              }}
            >
              <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full border-border bg-card px-3 text-xs font-semibold text-primary shadow-xs hover:border-primary">
                <Calculator className="size-3.5" /> Puxar da Precificação
              </SelectTrigger>
              <SelectContent>
                {pricings.map((p) => {
                  const r = computePricing({
                    wholesale_cost: Number(p.wholesale_cost),
                    freight_cost: Number(p.freight_cost),
                    packaging_cost: Number(p.packaging_cost),
                    other_costs: Number(p.other_costs),
                    margin_pct: Number(p.margin_pct),
                    tax_pct: Number(p.tax_pct),
                    card_rate_pct: 3.5,
                  });
                  return (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (Venda: {brl(r.suggestedPrice)})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nome">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vestido midi linho"
            />
          </Field>
          <Field label="Categoria">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
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
          </Field>
          <Field label="Cor">
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Off-white"
            />
          </Field>
          <Field label="Fornecedor">
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Bras Moda"
            />
          </Field>
          <Field label="Custo (R$)">
            <Input
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="59,90"
            />
          </Field>
          <Field label="Preço de venda (R$)">
            <Input
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="169,90"
            />
          </Field>
        </div>

        {/* ── Foto da peça ── */}
        <div className="mt-6">
          <Label className="text-xs font-semibold text-muted-foreground">
            Foto da peça (opcional)
          </Label>
          <div className="mt-3">
            <ImageUploader
              currentUrl={photoUrl || null}
              bucket="product-photos"
              folder="inventory"
              onUploaded={setPhotoUrl}
              placeholder="Clique para adicionar foto"
              aspect="portrait"
            />
          </div>
        </div>

        <div className="mt-6">
          <Label className="text-xs font-semibold text-muted-foreground">Grade de tamanhos</Label>
          <div className="mt-3 flex flex-wrap gap-3">
            {SIZE_GRID.map((s) => (
              <div key={s} className="w-20">
                <p className="text-center text-xs font-semibold text-muted-foreground">{s}</p>
                <Input
                  className="mt-1.5 text-center"
                  inputMode="numeric"
                  placeholder="0"
                  value={sizes[s] ? String(sizes[s]) : ""}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    const num = val === "" ? 0 : Math.max(0, Math.round(toNumber(val)));
                    setSizes((p) => ({ ...p, [s]: isNaN(num) ? 0 : num }));
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <Button
          className="mt-6 h-11 rounded-full px-6 font-semibold"
          disabled={create.isPending}
          onClick={() => create.mutate()}
        >
          <Plus className="size-4" /> Adicionar ao estoque
        </Button>
      </section>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Peças cadastradas</h2>
        {items.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<Boxes className="size-6" />}
            title="Estoque vazio"
            description="Cadastre suas peças para acompanhar grade, custo e potencial de venda."
          />
        ) : (
          <ul className="mt-5 space-y-3">
            {items.map((i) => {
              const s = (i.sizes ?? {}) as Sizes;
              const units = Object.values(s).reduce((a, b) => a + Number(b || 0), 0);
              return (
                <li key={i.id} className="rounded-3xl bg-surface-muted p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{i.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {labelOf(INVENTORY_CATEGORIES, i.category)}
                        {i.color ? ` · ${i.color}` : ""}
                        {i.supplier ? ` · ${i.supplier}` : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {SIZE_GRID.map((size) => (
                          <Badge
                            key={size}
                            variant="outline"
                            className="rounded-full text-[10px] font-semibold"
                          >
                            {size} · {Number(s[size] ?? 0)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="text-right">
                        <p className="numeric text-sm font-semibold text-primary">
                          {brl(Number(i.sale_price))}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          custo {brl(Number(i.cost_price))} · {units} un.
                        </p>
                      </div>
                      <ConfirmDelete
                        onConfirm={() => remove.mutate(i.id)}
                        description={`"${i.name}" será removida do estoque.`}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full text-muted-foreground"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
