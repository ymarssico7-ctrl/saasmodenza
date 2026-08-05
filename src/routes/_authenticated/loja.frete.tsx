import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Package, Truck } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard } from "@/components/loja/section-card";
import { PlanoBadge } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PlanGuard } from "@/components/plan-guard";

export const Route = createFileRoute("/_authenticated/loja/frete")({
  head: () => ({
    meta: [
      { title: "Frete & Entrega — Modaly" },
      {
        name: "description",
        content: "Configure as opções de entrega da sua loja online: retirada, entrega local e Correios.",
      },
    ],
  }),
  component: FretePage,
});

type OpcaoEntrega = {
  id: string;
  label: string;
  descricao: string;
  ativa: boolean;
  prazo?: string;
  valor?: number;
  gratis?: boolean;
};

const opcoesIniciais: OpcaoEntrega[] = [
  {
    id: "retirada",
    label: "Retirada na loja",
    descricao: "Cliente busca no endereço da loja. Sem custo adicional.",
    ativa: true,
    gratis: true,
  },
  {
    id: "entrega_local",
    label: "Entrega local (moto/bike)",
    descricao: "Entrega feita por você ou motoboy em regiões próximas.",
    ativa: true,
    prazo: "No mesmo dia",
    valor: 10,
  },
  {
    id: "correios_pac",
    label: "Correios PAC",
    descricao: "Envio econômico pelos Correios. Calculado pelo CEP da cliente.",
    ativa: true,
    prazo: "5–8 dias úteis",
  },
  {
    id: "correios_sedex",
    label: "Correios SEDEX",
    descricao: "Envio rápido pelos Correios. Calculado pelo CEP da cliente.",
    ativa: false,
    prazo: "1–3 dias úteis",
  },
];

function FretePage() {
  const [opcoes, setOpcoes] = useState<OpcaoEntrega[]>(opcoesIniciais);
  const [cep, setCep] = useState("30112-000");
  const [enderecoLoja, setEnderecoLoja] = useState(
    "Rua Antônio de Albuquerque, 156 — Savassi, Belo Horizonte/MG",
  );
  const [freteGratisMinimoAtivo, setFreteGratisMinimoAtivo] = useState(false);
  const [freteGratisMinimo, setFreteGratisMinimo] = useState("250");

  function toggleOpcao(id: string) {
    setOpcoes((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ativa: !o.ativa } : o)),
    );
  }

  function salvar() {
    toast.success("Configurações de frete salvas!", {
      description: "As opções de entrega já estão visíveis na vitrine.",
    });
  }

  return (
    <PlanGuard
      requires="digital"
      featureName="Frete & Entrega"
      featureDescription="Configure as opções de entrega da sua loja online. Disponível no Plano Digital."
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Logística"
          title="Frete & Entrega"
          description="Escolha como suas clientes vão receber as peças. As opções ativas aparecem no checkout da loja."
          actions={
            <Button
              onClick={salvar}
              className="gradient-primary h-10 rounded-full text-sm shadow-glow"
            >
              Salvar alterações
            </Button>
          }
        />

        {/* Endereço da loja */}
        <SectionCard
          title="Endereço da loja"
          description="Usado para calcular fretes nos Correios e para retirada presencial."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="cep"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  className="h-11 rounded-xl pl-9"
                  placeholder="00000-000"
                />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="endereco">Endereço completo</Label>
              <Input
                id="endereco"
                value={enderecoLoja}
                onChange={(e) => setEnderecoLoja(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
        </SectionCard>

        {/* Opções de entrega */}
        <SectionCard
          title="Opções de entrega"
          description="Ative as modalidades disponíveis para suas clientes."
        >
          <div className="divide-y divide-border/70">
            {opcoes.map((op) => (
              <div
                key={op.id}
                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-secondary/50 text-muted-foreground">
                    {op.id === "retirada" ? (
                      <MapPin className="h-4 w-4" />
                    ) : op.id === "entrega_local" ? (
                      <Package className="h-4 w-4" />
                    ) : (
                      <Truck className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{op.label}</p>
                      {op.gratis && (
                        <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                          Grátis
                        </span>
                      )}
                      {op.prazo && (
                        <span className="text-xs text-muted-foreground">
                          {op.prazo}
                        </span>
                      )}
                      {op.valor !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          R$ {op.valor.toFixed(2).replace(".", ",")} fixo
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {op.descricao}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={op.ativa}
                  onCheckedChange={() => toggleOpcao(op.id)}
                  className="shrink-0"
                />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Frete grátis automático */}
        <SectionCard
          title="Frete grátis automático"
          description="Ofereça frete grátis para pedidos acima de um valor mínimo."
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Frete grátis por valor mínimo</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Aplica automaticamente no checkout quando o pedido atingir o valor.
                </p>
              </div>
              <Switch
                checked={freteGratisMinimoAtivo}
                onCheckedChange={setFreteGratisMinimoAtivo}
              />
            </div>
            {freteGratisMinimoAtivo && (
              <div className="space-y-2">
                <Label htmlFor="minimo">Valor mínimo do pedido (R$)</Label>
                <Input
                  id="minimo"
                  type="number"
                  value={freteGratisMinimo}
                  onChange={(e) => setFreteGratisMinimo(e.target.value)}
                  className="h-11 max-w-[200px] rounded-xl"
                  placeholder="250"
                />
              </div>
            )}
          </div>
        </SectionCard>

        {/* Plano crescimento badge */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary/30 px-5 py-4">
          <PlanoBadge plan="crescimento" />
          <p className="text-sm text-muted-foreground">
            <strong className="font-semibold text-foreground">Plano Crescimento:</strong>{" "}
            integração automática com tabela de preços dos Correios por CEP, rastreamento
            automático e múltiplas transportadoras.
          </p>
        </div>
      </div>
    </PlanGuard>
  );
}
