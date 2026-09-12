import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CreditCard,
  ExternalLink,
  Instagram,
  MessageCircle,
  Plug,
  ShieldCheck,
  Zap,
  X,
  Save,
  Link,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { SectionCard } from "@/components/loja/section-card";
import { PlanoBadge } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store-context";

export const Route = createFileRoute("/_authenticated/loja/integracoes")({
  head: () => ({
    meta: [
      { title: "Integrações — Vestui" },
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
  configuravel?: boolean;
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
    id: "mercadopago",
    nome: "Mercado Pago",
    descricao:
      "Receba via Cartão de Crédito com parcelamento diretamente no checkout. Configure sua Public Key e Access Token.",
    categoria: "Pagamentos",
    conectado: false,
    plano: "digital",
    icon: CreditCard,
    cor: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30",
    configuravel: true,
  },
  {
    id: "cartao_assistido",
    nome: "Cartão — Modo Assistido",
    descricao:
      "Sem gateway: envie um link de pagamento próprio (Mercado Pago, PayPal, PagSeguro…) ou combine na maquininha após o pedido.",
    categoria: "Pagamentos",
    conectado: true,
    plano: "digital",
    icon: Link,
    cor: "bg-violet-50 text-violet-600 dark:bg-violet-950/30",
    configuravel: true,
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

// ─── Modal de Configuração ─────────────────────────────────────────────────
const LS_KEY_MP = (storeId: string) => `vestui_mp_config_${storeId}`;
const LS_KEY_ASSISTIDO = (storeId: string) => `vestui_cartao_assistido_${storeId}`;

function ModalConfiguracaoMercadoPago({
  storeId,
  onClose,
}: {
  storeId: string;
  onClose: () => void;
}) {
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_MP(storeId)) ?? "{}") as Record<string, string>; }
    catch { return {}; }
  })();
  const [publicKey, setPublicKey] = useState<string>(saved["publicKey"] ?? "");
  const [accessToken, setAccessToken] = useState<string>(saved["accessToken"] ?? "");
  const [parcelas, setParcelas] = useState<string>(saved["parcelas"] ?? "12");

  const salvar = () => {
    const config = { publicKey: publicKey.trim(), accessToken: accessToken.trim(), parcelas: parcelas.trim() };
    localStorage.setItem(LS_KEY_MP(storeId), JSON.stringify(config));
    toast.success("Mercado Pago configurado!", { description: "As credenciais foram salvas localmente." });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-5">
          <p className="text-base font-bold text-gray-900">Configurar Mercado Pago</p>
          <p className="mt-1 text-xs text-gray-500">
            Acesse{" "}
            <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
              mercadopago.com.br/developers
            </a>{" "}
            para obter as credenciais da sua aplicação.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Public Key <span className="font-normal text-gray-400">(frontend)</span>
            </label>
            <Input
              placeholder="APP_USR-abc123..."
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Access Token <span className="font-normal text-gray-400">(backend / webhook)</span>
            </label>
            <Input
              placeholder="APP_USR-1234..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              type="password"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Máx. de parcelas
            </label>
            <select
              value={parcelas}
              onChange={(e) => setParcelas(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[1, 2, 3, 6, 12, 18].map((n) => (
                <option key={n} value={String(n)}>{n}x</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1 gap-1.5" onClick={salvar}>
            <Save className="h-3.5 w-3.5" />
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModalConfiguracaoAssistido({
  storeId,
  onClose,
}: {
  storeId: string;
  onClose: () => void;
}) {
  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_ASSISTIDO(storeId)) ?? "{}") as Record<string, string>; }
    catch { return {}; }
  })();
  const [linkPagamento, setLinkPagamento] = useState<string>(saved["linkPagamento"] ?? "");
  const [instrucao, setInstrucao] = useState<string>(
    saved["instrucao"] ?? "A loja entrará em contato via WhatsApp para combinar o pagamento.",
  );

  const salvar = () => {
    const config = { linkPagamento: linkPagamento.trim(), instrucao: instrucao.trim() };
    localStorage.setItem(LS_KEY_ASSISTIDO(storeId), JSON.stringify(config));
    toast.success("Modo Assistido configurado!", { description: "Link e instrução salvos." });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-5">
          <p className="text-base font-bold text-gray-900">Cartão — Modo Assistido</p>
          <p className="mt-1 text-xs text-gray-500">
            Defina o link de pagamento que será compartilhado após o pedido, ou deixe em branco para combinar via maquininha no WhatsApp.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Link de pagamento <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <Input
              placeholder="https://mpago.la/seu-link..."
              value={linkPagamento}
              onChange={(e) => setLinkPagamento(e.target.value)}
              className="text-xs"
            />
            <p className="mt-1 text-[10px] text-gray-400">Mercado Pago, PagSeguro, PayPal, etc.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Instrução exibida no checkout
            </label>
            <textarea
              value={instrucao}
              onChange={(e) => setInstrucao(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1 gap-1.5" onClick={salvar}>
            <Save className="h-3.5 w-3.5" />
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
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
        localStorage.getItem(`vestui_integrations_${storeId}`) ||
        localStorage.getItem(`modaly_integrations_${storeId}`) ||
        localStorage.getItem(`vestuli_integrations_${storeId}`);
      return raw ? { ...defaultMap, ...(JSON.parse(raw) as Record<string, boolean>) } : defaultMap;
    } catch {
      return defaultMap;
    }
  });

  const [modalAberto, setModalAberto] = useState<string | null>(null);

  // Sincroniza quando storeId é resolvido ou alterado
  useEffect(() => {
    if (!storeId) return;
    try {
      const raw =
        localStorage.getItem(`vestui_integrations_${storeId}`) ||
        localStorage.getItem(`modaly_integrations_${storeId}`) ||
        localStorage.getItem(`vestuli_integrations_${storeId}`);
      if (raw) {
        setStatusMap((prev) => ({ ...prev, ...(JSON.parse(raw) as Record<string, boolean>) }));
      }
    } catch {
      // ignore
    }
  }, [storeId]);

  const toggleIntegracao = (integ: Integracao) => {
    const nextVal = !(statusMap[integ.id] ?? integ.conectado);
    const updated = { ...statusMap, [integ.id]: nextVal };
    setStatusMap(updated);
    try {
      localStorage.setItem(`vestui_integrations_${storeId}`, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent("integrations-changed", { detail: { storeId, integrations: updated } }),
      );
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

                  <div className="flex shrink-0 items-center gap-2">
                    {/* Botão Configurar (apenas para integrações configuráveis) */}
                    {integ.configuravel && !precisaCrescimento && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full px-3 text-xs"
                        onClick={() => setModalAberto(integ.id)}
                      >
                        Configurar
                      </Button>
                    )}

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
            Shopee, Mercado Livre, Asaas, Yampi e mais. Fale com a gente para priorizar.
          </p>
        </div>
      </div>

      {/* Modais de configuração */}
      {modalAberto === "mercadopago" && (
        <ModalConfiguracaoMercadoPago storeId={storeId} onClose={() => setModalAberto(null)} />
      )}
      {modalAberto === "cartao_assistido" && (
        <ModalConfiguracaoAssistido storeId={storeId} onClose={() => setModalAberto(null)} />
      )}
    </div>
  );
}
