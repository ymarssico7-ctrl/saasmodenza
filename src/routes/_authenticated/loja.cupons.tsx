import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard } from "@/components/loja/section-card";
import { PlanoBadge, Tag } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { brl } from "@/lib/format";
import { cupons as cuponsBase, dateBR, type Cupom } from "@/data/loja";
import { PlanGuard } from "@/components/plan-guard";

export const Route = createFileRoute("/_authenticated/loja/cupons")({
  head: () => ({
    meta: [
      { title: "Cupons de desconto — Modenza" },
      {
        name: "description",
        content: "Crie cupons em percentual ou valor fixo, com validade e limite de uso.",
      },
    ],
  }),
  component: CuponsPage,
});

function CuponsPage() {
  const [lista, setLista] = useState<Cupom[]>(cuponsBase);
  const [novo, setNovo] = useState(false);

  return (
    <PlanGuard requires="crescimento" featureName="Cupons de Desconto" featureDescription="Crie campanhas de desconto sem alterar o preço base das peças. Disponível no Plano Crescimento.">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Vendas"
          title="Cupons de desconto"
          description="Ative campanhas pontuais sem mexer no preço das peças."
          actions={
            <>
              <PlanoBadge plan="crescimento" />
              <Button onClick={() => setNovo(true)} className="gradient-primary h-10 rounded-full shadow-glow">
                <Plus className="mr-2 h-4 w-4" /> Novo cupom
              </Button>
            </>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((c) => {
            const limite = c.limite ?? 100;
            const uso = (c.usos / limite) * 100;
            return (
              <div key={c.id} className="surface-card surface-card-hover p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="num-display truncate text-lg font-semibold">{c.codigo}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {c.tipo === "percentual" ? `${c.valor}% de desconto` : `${brl(c.valor)} de desconto`}
                    </p>
                  </div>
                  <Switch
                    checked={c.ativo}
                    onCheckedChange={(v) => {
                      setLista((prev) => prev.map((x) => (x.id === c.id ? { ...x, ativo: v } : x)));
                      toast.success(v ? "Cupom ativado" : "Cupom desativado", { description: c.codigo });
                    }}
                  />
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  {c.validade ? <p>Válido até {dateBR(c.validade)}</p> : null}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Histórico de uso</span>
                    <span className="num-display">
                      {c.usos}/{c.limite ?? "∞"}
                    </span>
                  </div>
                  <Progress value={c.limite ? uso : 0} className="mt-2 h-2" />
                </div>

                <div className="mt-4">
                  {c.limite && uso >= 100 ? (
                    <Tag tone="danger">Limite atingido</Tag>
                  ) : c.ativo ? (
                    <Tag tone="success">Ativo</Tag>
                  ) : (
                    <Tag>Pausado</Tag>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <SectionCard title="Como o cupom entra no caixa" description="Transparência total na gestão.">
          <p className="text-sm leading-relaxed text-muted-foreground">
            O desconto aparece separado no resumo do pedido e é registrado como abatimento na entrada do
            caixa, mantendo o preço base da peça intacto no estoque.
          </p>
        </SectionCard>

        <Sheet open={novo} onOpenChange={setNovo}>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader className="text-left">
              <SheetTitle>Novo cupom</SheetTitle>
              <SheetDescription>Defina o código, o desconto e as regras de uso.</SheetDescription>
            </SheetHeader>
            <form
              className="space-y-4 px-4 pb-8"
              onSubmit={(e) => {
                e.preventDefault();
                setNovo(false);
                toast.success("Cupom criado e pronto para usar");
              }}
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Código</Label>
                <Input placeholder="PRIMAVERA10" className="h-11 rounded-xl uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <Select defaultValue="percentual">
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentual">Percentual (%)</SelectItem>
                      <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Valor</Label>
                  <Input defaultValue="10" className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Validade</Label>
                  <Input type="date" defaultValue="2026-09-30" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Limite de uso</Label>
                  <Input defaultValue="50" className="h-11 rounded-xl" />
                </div>
              </div>
              <Button type="submit" className="gradient-primary h-11 w-full rounded-xl shadow-glow">
                Criar cupom
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </PlanGuard>
  );
}

