import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Package, Truck, Sparkles, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard } from "@/components/loja/section-card";
import { PlanoBadge } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { brl, toNumber } from "@/lib/format";
import { useStore } from "@/lib/store-context";
import { useAccess } from "@/lib/useAccess";
import { profileQuery } from "@/lib/db";

function freteKey(storeId: string) {
  return `vestui_frete_config_${storeId}`;
}

function legacyFreteKey(storeId: string) {
  return `vestuli_frete_config_${storeId}`;
}

const GLOBAL_FRETE_KEY = "vestui_frete_config";

type FreteConfig = {
  cep: string;
  endereco: string;
  opcoes: OpcaoEntrega[];
  freteGratisMinimoAtivo: boolean;
  freteGratisMinimo: string;
};

export const Route = createFileRoute("/_authenticated/loja/frete")({
  head: () => ({
    meta: [
      { title: "Frete & Entrega — Vestui" },
      {
        name: "description",
        content:
          "Configure as opções de entrega da sua loja online: retirada, entrega local e Correios.",
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

// ─── Gate: Plano Gratuito não possui cálculo e regras de frete customizadas ──
function FreteGatePresentation() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16 text-center">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/10 mb-6">
        <Truck className="size-10 text-primary" />
      </div>

      <h1 className="font-display text-2xl font-bold text-foreground mb-3">
        Regras de Frete & Entrega
      </h1>
      <p className="text-muted-foreground text-sm max-w-sm mb-2 leading-relaxed">
        No Plano Gratuito, seu catálogo digital permite que os clientes combinem a entrega ou retirada diretamente no WhatsApp.
      </p>
      <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
        No <strong>Vestui Pro</strong>, você configura taxas de entrega local, retirada na loja, frete grátis por valor mínimo e prazos estimados automáticos na vitrine online.
      </p>

      <div className="w-full max-w-sm rounded-3xl border border-border/70 bg-card shadow-soft p-5 mb-8 text-left space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          O que você desbloqueia no Vestui Pro
        </p>
        {[
          "Opções customizadas de Retirada no Balcão",
          "Taxa e raio de Entrega Local (moto/bike)",
          "Faixa de Frete Grátis com valor mínimo de pedido",
          "Cálculo e instruções transparentes na sacola online",
        ].map((item) => (
          <div key={item} className="flex items-start gap-2.5">
            <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
            <span className="text-sm text-foreground">{item}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <a
          href="/configuracoes/plano"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full h-11 px-6 text-sm font-semibold bg-primary text-primary-foreground shadow-glow hover:opacity-90 transition-all"
        >
          <Sparkles className="size-4" />
          Conhecer Vestui Pro — R$ 19,90/mês
        </a>
      </div>
    </div>
  );
}

function FretePage() {
  const queryClient = useQueryClient();
  const { storeId, store } = useStore();
  const { data: profile } = useQuery(profileQuery());
  const access = useAccess(profile, store);

  const [opcoes, setOpcoes] = useState<OpcaoEntrega[]>(opcoesIniciais);
  const [cep, setCep] = useState("");
  const [enderecoLoja, setEnderecoLoja] = useState("");
  const [freteGratisMinimoAtivo, setFreteGratisMinimoAtivo] = useState(false);
  const [freteGratisMinimo, setFreteGratisMinimo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Carrega configurações: prioriza o Supabase (nuvem) e faz fallback para o cache local
  useEffect(() => {
    if (!storeId) return;
    try {
      const cloudFrete = (store?.metadata as Record<string, unknown> | null)?.["frete"] as
        | Partial<FreteConfig>
        | undefined;

      if (cloudFrete) {
        if (cloudFrete.cep) setCep(cloudFrete.cep);
        if (cloudFrete.endereco) setEnderecoLoja(cloudFrete.endereco);
        if (cloudFrete.opcoes) setOpcoes(cloudFrete.opcoes);
        if (cloudFrete.freteGratisMinimoAtivo !== undefined)
          setFreteGratisMinimoAtivo(cloudFrete.freteGratisMinimoAtivo);
        if (cloudFrete.freteGratisMinimo) setFreteGratisMinimo(cloudFrete.freteGratisMinimo);
        localStorage.setItem(freteKey(storeId), JSON.stringify(cloudFrete));
        return;
      }

      const raw =
        localStorage.getItem(freteKey(storeId)) ||
        localStorage.getItem(legacyFreteKey(storeId));
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<FreteConfig>;
      if (saved.cep) setCep(saved.cep);
      if (saved.endereco) setEnderecoLoja(saved.endereco);
      if (saved.opcoes) setOpcoes(saved.opcoes);
      if (saved.freteGratisMinimoAtivo !== undefined)
        setFreteGratisMinimoAtivo(saved.freteGratisMinimoAtivo);
      if (saved.freteGratisMinimo) setFreteGratisMinimo(saved.freteGratisMinimo);
    } catch {
      // localStorage indisponível ou corrompido — iniciar vazio
    }
  }, [storeId, store?.metadata]);

  function toggleOpcao(id: string) {
    setOpcoes((prev) => prev.map((o) => (o.id === id ? { ...o, ativa: !o.ativa } : o)));
  }

  async function salvar() {
    if (!storeId) return;
    if (freteGratisMinimoAtivo) {
      const minVal = toNumber(freteGratisMinimo);
      if (isNaN(minVal) || minVal <= 0) {
        toast.error("Informe um valor mínimo válido para o frete grátis (maior que zero).");
        return;
      }
    }
    setIsSaving(true);
    try {
      const config: FreteConfig = {
        cep,
        endereco: enderecoLoja,
        opcoes,
        freteGratisMinimoAtivo,
        freteGratisMinimo: freteGratisMinimo.trim(),
      };

      // 1. Salva no cache local
      localStorage.setItem(freteKey(storeId), JSON.stringify(config));

      // 2. Persiste na nuvem do Supabase (stores.metadata.frete)
      const currentMeta = (store?.metadata as Record<string, unknown> | null) || {};
      await supabase
        .from("stores")
        .update({
          metadata: {
            ...currentMeta,
            frete: config,
          } as never,
        })
        .eq("id", storeId);

      void queryClient.invalidateQueries({ queryKey: ["active_store"] });
      void queryClient.invalidateQueries({ queryKey: ["vitrine-store"] });

      toast.success("Configurações de frete salvas na nuvem!", {
        description: "As opções de entrega já estão ativas para seus clientes na vitrine.",
      });
    } catch (err) {
      console.error("Erro ao salvar frete no Supabase:", err);
      toast.error("Erro ao sincronizar com o servidor. Salvo localmente.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Logística & Entregas"
        title="Frete & Entrega"
        description="Escolha como suas clientes vão receber as peças. As opções ativas aparecem no checkout da loja."
        actions={
          <Button
            onClick={salvar}
            disabled={isSaving}
            className="gradient-primary h-10 rounded-full text-sm shadow-glow cursor-pointer"
          >
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </Button>
        }
      />

      {access.isFree && (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground">
          <Info className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-foreground">Modo Demonstração de Frete Ativo</p>
            <p className="text-muted-foreground mt-0.5">
              Suas opções configuradas aqui são sincronizadas com sua vitrine. No plano Pro, o cálculo por CEP dos Correios e faixas de frete grátis ficam 100% automatizados.
            </p>
          </div>
        </div>
      )}

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
                    {op.prazo && <span className="text-xs text-muted-foreground">{op.prazo}</span>}
                    {op.valor !== undefined && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-medium text-muted-foreground">Taxa fixa:</span>
                        <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-0.5">
                          <span className="text-xs text-muted-foreground">R$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={op.valor}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              setOpcoes((prev) =>
                                prev.map((o) => (o.id === op.id ? { ...o, valor: isNaN(v) ? 0 : v } : o)),
                              );
                            }}
                            className="w-16 bg-transparent text-xs font-semibold focus:outline-none"
                          />
                        </div>
                      </div>
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
            <Switch checked={freteGratisMinimoAtivo} onCheckedChange={setFreteGratisMinimoAtivo} />
          </div>
          {freteGratisMinimoAtivo && (
            <div className="space-y-2">
              <Label htmlFor="minimo">Valor mínimo do pedido (R$)</Label>
              <Input
                id="minimo"
                inputMode="decimal"
                value={freteGratisMinimo}
                onChange={(e) => setFreteGratisMinimo(e.target.value)}
                className="h-11 max-w-[200px] rounded-xl"
                placeholder="250,00"
              />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Plano crescimento badge */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary/30 px-5 py-4">
        <PlanoBadge plan="crescimento" />
        <p className="text-sm text-muted-foreground">
          <strong className="font-semibold text-foreground">Plano Crescimento:</strong> integração
          automática com tabela de preços dos Correios por CEP, rastreamento automático e múltiplas
          transportadoras.
        </p>
      </div>
    </div>
  );
}
