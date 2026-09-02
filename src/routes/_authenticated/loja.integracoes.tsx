import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CreditCard,
  ExternalLink,
  Instagram,
  MessageCircle,
  Plug,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard } from "@/components/loja/section-card";
import { PlanoBadge } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store-context";

export const Route = createFileRoute("/_authenticated/loja/integracoes")({
  head: () => ({
    meta: [
      { title: "Integrações — Vestuli" },
      {
        name: "description",
        content: "Conecte sua loja com WhatsApp, Instagram, Pix e ferramentas de marketing.",
      },
    ],
  }),
  component: IntegracoesPage,
});

type Integracao = {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  conectado: boolean;
  plano: "digital" | "crescimento";
  icon: React.ComponentType<{ className?: string }>;
  cor: string;
};

const integracoesData: Integracao[] = [
  {
    id: "whatsapp",
    nome: "WhatsApp Business",
    descricao: "Notificações automáticas de pedido, confirmação e rastreamento via WhatsApp.",
    categoria: "Comunicação",
    conectado: true,
    plano: "digital",
    icon: MessageCircle,
    cor: "bg-success-soft text-success",
  },
  {
    id: "stripe",
    nome: "Stripe Payments",
    descricao:
      "Receba via Cartão de Crédito, Apple Pay e Google Pay diretamente no checkout da vitrine.",
    categoria: "Pagamentos",
    conectado: true,
    plano: "digital",
    icon: CreditCard,
    cor: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30",
  },
  {
    id: "kiwify",
    nome: "Kiwify Checkout",
    descricao:
      "Integração nativa com checkout de alta conversão, Pix automático e aprovação imediata.",
    categoria: "Pagamentos",
    conectado: false,
    plano: "digital",
    icon: ShieldCheck,
    cor: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30",
  },
  {
    id: "pix",
    nome: "Pix direto / Dinâmico",
    descricao: "Gere QR Code Pix dinâmico no checkout e confirme pagamentos em tempo real.",
    categoria: "Pagamentos",
    conectado: true,
    plano: "digital",
    icon: Zap,
    cor: "bg-primary-soft text-accent-foreground",
  },
  {
    id: "instagram",
    nome: "Instagram Shopping",
    descricao: "Marque produtos nas fotos e stories para redirecionar direto para o checkout.",
    categoria: "Redes sociais",
    conectado: false,
    plano: "crescimento",
    icon: Instagram,
    cor: "bg-pink-50 text-pink-500 dark:bg-pink-950/30",
  },
  {
    id: "google_analytics",
    nome: "Google Analytics 4",
    descricao: "Acompanhe o tráfego, conversões e funil de vendas da sua vitrine.",
    categoria: "Marketing",
    conectado: false,
    plano: "crescimento",
    icon: ExternalLink,
    cor: "bg-warning-soft text-warning",
  },
  {
    id: "meta_pixel",
    nome: "Meta Pixel",
    descricao: "Remarketing e audiências personalizadas para anúncios no Instagram e Facebook.",
    categoria: "Marketing",
    conectado: false,
    plano: "crescimento",
    icon: ExternalLink,
    cor: "bg-info-soft text-info",
  },
];

function IntegracoesPage() {
  const { storeId } = useStore();
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>(() => {
    const defaultMap = integracoesData.reduce<Record<string, boolean>>((acc, i) => {
      acc[i.id] = i.conectado;
      return acc;
    }, {});
    if (typeof localStorage === "undefined") return defaultMap;
    try {
      const raw =
        localStorage.getItem(`vestuli_integrations_${storeId}`) ||
        localStorage.getItem(`modaly_integrations_${storeId}`);
      return raw ? { ...defaultMap, ...(JSON.parse(raw) as Record<string, boolean>) } : defaultMap;
    } catch {
      return defaultMap;
    }
  });

  const toggleIntegracao = (integ: Integracao) => {
    const nextVal = !(statusMap[integ.id] ?? integ.conectado);
    const updated = { ...statusMap, [integ.id]: nextVal };
    setStatusMap(updated);
    try {
      localStorage.setItem(`vestuli_integrations_${storeId}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
    toast.success(
      nextVal ? `Integração "${integ.nome}" ativada!` : `Integração "${integ.nome}" desativada.`,
      { description: nextVal ? "Configuração aplicada na vitrine." : "Desconectada da vitrine." },
    );
  };

  const porCategoria = integracoesData.reduce<Record<string, Integracao[]>>((acc, item) => {
    if (!acc[item.categoria]) acc[item.categoria] = [];
    acc[item.categoria]!.push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conectividade"
        title="Integrações"
        description="Conecte sua loja com as ferramentas que você já usa. Cada integração ativa enriquece a experiência das suas clientes."
      />

      {Object.entries(porCategoria).map(([categoria, items]) => (
        <SectionCard
          key={categoria}
          title={categoria}
          description={`${items.length} ${items.length === 1 ? "integração" : "integrações"} disponíveis.`}
        >
          <div className="divide-y divide-border/70">
            {items.map((integ) => {
              const Icon = integ.icon;
              const precisaCrescimento = integ.plano === "crescimento";
              const isConectado = statusMap[integ.id] ?? integ.conectado;
              return (
                <div
                  key={integ.id}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${integ.cor}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{integ.nome}</p>
                        {precisaCrescimento && <PlanoBadge plan="crescimento" />}
                        {isConectado && (
                          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                            Conectado
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {integ.descricao}
                      </p>
                    </div>
                  </div>
                  {precisaCrescimento ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 rounded-full text-xs"
                      disabled
                    >
                      <Plug className="mr-1.5 h-3 w-3" />
                      Upgrade
                    </Button>
                  ) : (
                    <Switch
                      checked={isConectado}
                      onCheckedChange={() => toggleIntegracao(integ)}
                      className="shrink-0"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      ))}

      {/* Mais em breve */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-border/70 px-5 py-4">
        <span className="text-2xl">🔌</span>
        <div>
          <p className="text-sm font-semibold">Mais integrações em breve</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Shopee, Mercado Livre, Stripe, Yampi e mais. Fale com a gente para priorizar.
          </p>
        </div>
      </div>
    </div>
  );
}
