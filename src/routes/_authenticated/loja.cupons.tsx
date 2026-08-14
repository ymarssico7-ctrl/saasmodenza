import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard, EmptyState } from "@/components/loja/section-card";
import { PlanoBadge, Tag } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { brl } from "@/lib/format";
import { useStore } from "@/lib/store-context";
import { dateBR, type Cupom } from "@/data/loja";

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

function cuponsKey(storeId: string) {
  return `modaly_cupons_${storeId}`;
}

function CuponsPage() {
  const { storeId } = useStore();
  const [lista, setLista] = useState<Cupom[]>([]);
  const [novo, setNovo] = useState(false);

  // Form state
  const [novoCodigo, setNovoCodigo] = useState("");
  const [novoTipo, setNovoTipo] = useState<"percentual" | "fixo">("percentual");
  const [novoValor, setNovoValor] = useState("10");
  const [novaValidade, setNovaValidade] = useState("");
  const [novoLimite, setNovoLimite] = useState("50");

  // Carrega cupons isolados por loja
  useEffect(() => {
    if (!storeId) return;
    try {
      const stored = localStorage.getItem(cuponsKey(storeId));
      setLista(stored ? (JSON.parse(stored) as Cupom[]) : []);
    } catch {
      setLista([]);
    }
  }, [storeId]);

  const persistir = (novaLista: Cupom[]) => {
    setLista(novaLista);
    localStorage.setItem(cuponsKey(storeId), JSON.stringify(novaLista));
  };

  const criarCupom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCodigo.trim()) {
      toast.error("Informe um código para o cupom.");
      return;
    }
    // Validação de data expirada: não permite criar cupom com validade no passado
    if (novaValidade) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataValidade = new Date(novaValidade + "T00:00:00");
      if (dataValidade < hoje) {
        toast.error("A validade não pode ser uma data passada.", {
          description: "Escolha uma data igual ou posterior a hoje.",
        });
        return;
      }
    }
    const limiteNum = Number(novoLimite);
    const cupom: Cupom = {
      id: crypto.randomUUID(),
      codigo: novoCodigo.trim().toUpperCase(),
      tipo: novoTipo,
      valor: Number(novoValor) || 10,
      usos: 0,
      ativo: true,
      ...(limiteNum > 0 ? { limite: limiteNum } : {}),
      ...(novaValidade ? { validade: novaValidade } : {}),
    };
    persistir([cupom, ...lista]);
    setNovoCodigo("");
    setNovoValor("10");
    setNovaValidade("");
    setNovoLimite("50");
    setNovo(false);
    toast.success("Cupom criado e pronto para usar!", { description: cupom.codigo });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vendas"
        title="Cupons de desconto"
        description="Ative campanhas pontuais sem mexer no preço das peças."
        actions={
          <>
            <PlanoBadge plan="crescimento" />
            <Button
              onClick={() => setNovo(true)}
              className="gradient-primary h-10 rounded-full shadow-glow"
            >
              <Plus className="mr-2 h-4 w-4" /> Novo cupom
            </Button>
          </>
        }
      />

      {lista.length === 0 ? (
        <EmptyState
          icon={<TagIcon className="h-7 w-7" />}
          title="Nenhum cupom criado ainda"
          description="Crie cupons de desconto para usar em promoções e campanhas da sua loja."
        />
      ) : (
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
                      {c.tipo === "percentual"
                        ? `${c.valor}% de desconto`
                        : `${brl(c.valor)} de desconto`}
                    </p>
                  </div>
                  <Switch
                    checked={c.ativo}
                    onCheckedChange={(v) => {
                      persistir(lista.map((x) => (x.id === c.id ? { ...x, ativo: v } : x)));
                      toast.success(v ? "Cupom ativado" : "Cupom desativado", {
                        description: c.codigo,
                      });
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
                  {(() => {
                    // Checa se o cupom já expirou pela data de validade
                    const expirado =
                      c.validade
                        ? new Date(c.validade + "T23:59:59") < new Date()
                        : false;
                    if (expirado) return <Tag tone="danger">Expirado</Tag>;
                    if (c.limite && uso >= 100) return <Tag tone="danger">Limite atingido</Tag>;
                    if (c.ativo) return <Tag tone="success">Ativo</Tag>;
                    return <Tag>Pausado</Tag>;
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SectionCard title="Como o cupom entra no caixa" description="Transparência total na gestão.">
        <p className="text-sm leading-relaxed text-muted-foreground">
          O desconto aparece separado no resumo do pedido e é registrado como abatimento na entrada
          do caixa, mantendo o preço base da peça intacto no estoque.
        </p>
      </SectionCard>

      <Sheet open={novo} onOpenChange={setNovo}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader className="text-left">
            <SheetTitle>Novo cupom</SheetTitle>
            <SheetDescription>Defina o código, o desconto e as regras de uso.</SheetDescription>
          </SheetHeader>
          <form className="space-y-4 px-4 pb-8" onSubmit={criarCupom}>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Código</Label>
              <Input
                placeholder="PRIMAVERA10"
                className="h-11 rounded-xl uppercase"
                value={novoCodigo}
                onChange={(e) => setNovoCodigo(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <Select
                  value={novoTipo}
                  onValueChange={(v) => setNovoTipo(v as "percentual" | "fixo")}
                >
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
                <Input
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                  className="h-11 rounded-xl"
                  type="number"
                  min="1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Validade</Label>
                <Input
                  type="date"
                  value={novaValidade}
                  onChange={(e) => setNovaValidade(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Limite de uso</Label>
                <Input
                  value={novoLimite}
                  onChange={(e) => setNovoLimite(e.target.value)}
                  className="h-11 rounded-xl"
                  type="number"
                  min="1"
                  placeholder="Ilimitado"
                />
              </div>
            </div>
            <Button type="submit" className="gradient-primary h-11 w-full rounded-xl shadow-glow">
              Criar cupom
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
