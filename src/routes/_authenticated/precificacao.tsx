import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calculator, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { pricingsQuery } from "@/lib/db";
import { brl, pct, toNumber } from "@/lib/format";
import { computePricing } from "@/lib/finance";
import { useStore } from "@/lib/store-context";
import { insertPricing, deletePricing } from "@/lib/mutations";

export const Route = createFileRoute("/_authenticated/precificacao")({
  head: () => ({
    meta: [
      { title: "Precificação com margem real — Modé" },
      {
        name: "description",
        content:
          "Calcule o preço de venda das suas peças considerando atacado, frete, embalagem, imposto e margem.",
      },
      { property: "og:title", content: "Precificação com margem real — Modé" },
      {
        property: "og:description",
        content: "Descubra o preço mínimo e o preço ideal de cada peça.",
      },
    ],
  }),
  component: Precificacao,
});

function Precificacao() {
  const queryClient = useQueryClient();
  const { storeId } = useStore();
  const { data: saved = [] } = useQuery(pricingsQuery());

  const [name, setName] = useState("");
  const [wholesale, setWholesale] = useState("");
  const [freight, setFreight] = useState("");
  const [packaging, setPackaging] = useState("");
  const [other, setOther] = useState("");
  const [margin, setMargin] = useState(80);
  const [tax, setTax] = useState(6);

  const input = {
    wholesale_cost: toNumber(wholesale),
    freight_cost: toNumber(freight),
    packaging_cost: toNumber(packaging),
    other_costs: toNumber(other),
    margin_pct: margin,
    tax_pct: tax,
  };
  const result = computePricing(input);

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Dê um nome para a peça");
      if (input.wholesale_cost <= 0) throw new Error("Informe o custo de atacado");
      return insertPricing({ storeId, name: name.trim(), ...input });
    },
    onSuccess: () => {
      toast.success("Precificação salva");
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

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Precificação"
        title="Quanto cobrar por essa peça?"
        description="Some todos os custos, escolha a margem e a Modé calcula o preço mínimo e o preço ideal."
      />

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <section className="panel p-6 sm:p-7">
          <h2 className="text-base font-semibold">Custos da peça</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Nome da peça" className="sm:col-span-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Vestido midi linho"
              />
            </Field>
            <Field label="Custo de atacado (R$)">
              <Input
                inputMode="decimal"
                value={wholesale}
                onChange={(e) => setWholesale(e.target.value)}
                placeholder="59,90"
              />
            </Field>
            <Field label="Frete rateado (R$)">
              <Input
                inputMode="decimal"
                value={freight}
                onChange={(e) => setFreight(e.target.value)}
                placeholder="6,00"
              />
            </Field>
            <Field label="Embalagem (R$)">
              <Input
                inputMode="decimal"
                value={packaging}
                onChange={(e) => setPackaging(e.target.value)}
                placeholder="3,50"
              />
            </Field>
            <Field label="Outros custos (R$)">
              <Input
                inputMode="decimal"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder="2,00"
              />
            </Field>
          </div>

          <div className="mt-8 space-y-7">
            <SliderRow
              label="Margem desejada"
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
            className="mt-8 h-11 rounded-full px-6 font-semibold"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            <Save className="size-4" /> Salvar precificação
          </Button>
        </section>

        <section className="panel flex flex-col gap-5 bg-primary p-6 text-primary-foreground sm:p-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/60">
              Preço sugerido
            </p>
            <p className="numeric mt-3 text-[2.75rem] font-semibold leading-none">
              {brl(result.suggestedPrice)}
            </p>
            <p className="mt-3 text-xs text-primary-foreground/70">
              Lucro de {brl(result.profit)} por peça
            </p>
          </div>

          {/* Dois indicadores distintos para clareza financeira */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-primary-foreground/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/50">
                Markup sobre o Custo
              </p>
              <p className="numeric mt-1.5 text-xl font-bold">{pct(result.markupOnCost)}</p>
              <p className="mt-1 text-[11px] text-primary-foreground/50">
                Quanto o preço sobe acima do custo
              </p>
            </div>
            <div className="rounded-xl bg-primary-foreground/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/50">
                Margem Real s/ Venda
              </p>
              <p className="numeric mt-1.5 text-xl font-bold">{pct(result.marginOnPrice)}</p>
              <p className="mt-1 text-[11px] text-primary-foreground/50">
                % do preço que vira lucro real
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl bg-primary-foreground/10 p-5 text-sm">
            <Row label="Custo real da peça" value={brl(result.realCost)} />
            <Row label="Preço mínimo (empata)" value={brl(result.minPrice)} />
            <Row label="Imposto estimado" value={brl(result.suggestedPrice * (tax / 100))} />
          </div>

          <p className="text-xs leading-relaxed text-primary-foreground/60">
            Preço mínimo é o valor em que você não perde dinheiro. Abaixo dele, cada venda tira do
            seu bolso.
          </p>
        </section>
      </div>

      <section className="panel p-6 sm:p-7">
        <h2 className="text-base font-semibold">Peças precificadas</h2>
        {saved.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<Calculator className="size-6" />}
            title="Nenhuma peça salva"
            description="Calcule e salve suas precificações para consultar depois na hora de etiquetar."
          />
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="pb-3 font-semibold">Peça</th>
                  <th className="pb-3 font-semibold">Custo real</th>
                  <th className="pb-3 font-semibold">Margem</th>
                  <th className="pb-3 font-semibold">Preço sugerido</th>
                  <th className="pb-3" />
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
                    <tr key={p.id}>
                      <td className="py-3.5 font-medium">{p.name}</td>
                      <td className="numeric py-3.5 text-muted-foreground">{brl(r.realCost)}</td>
                      <td className="numeric py-3.5 text-muted-foreground">
                        {pct(Number(p.margin_pct))}
                      </td>
                      <td className="numeric py-3.5 font-semibold text-primary">
                        {brl(r.suggestedPrice)}
                      </td>
                      <td className="py-3.5 text-right">
                        <ConfirmDelete
                          onConfirm={() => remove.mutate(p.id)}
                          description={`"${p.name}" será removida das suas precificações.`}
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
