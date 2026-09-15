import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  CheckCircle,
  Loader2,
  Wallet,
  ChevronRight,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/loja/page-header";
import { VitrineConfigNav } from "@/components/loja/vitrine-config-nav";
import { SectionCard } from "@/components/loja/section-card";
import { PlanoBadge } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";

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

// ─── Modal Vestui Pay Onboarding ──────────────────────────────────────────────
function ModalVestuiPayOnboarding({
  storeId,
  onClose,
  onSuccess,
}: {
  storeId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erroGlobal, setErroGlobal] = useState("");

  // Etapa 1 — Dados pessoais / empresariais
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState(""); // PF: data de nascimento

  // Etapa 2 — Endereço e conta bancária
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [province, setProvince] = useState(""); // bairro
  const [bankCode, setBankCode] = useState("341"); // Itaú default
  const [agency, setAgency] = useState("");
  const [account, setAccount] = useState("");
  const [accountDigit, setAccountDigit] = useState("");
  const [accountType, setAccountType] = useState<"CONTA_CORRENTE" | "CONTA_POUPANCA">("CONTA_CORRENTE");

  const isCNPJ = cpfCnpj.replace(/\D/g, "").length > 11;

  async function handleSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErroGlobal("");
    try {
      const supabaseUrl = (supabase as unknown as { supabaseUrl: string }).supabaseUrl ?? "";
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      const res = await fetch(`${supabaseUrl}/functions/v1/asaas-create-subaccount`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeId,
          name: nome.trim(),
          cpfCnpj: cpfCnpj.replace(/\D/g, ""),
          email: email.trim(),
          phone: phone.replace(/\D/g, ""),
          mobilePhone: phone.replace(/\D/g, ""),
          birthDate: isCNPJ ? undefined : birthDate,
          address: address.trim(),
          addressNumber: addressNumber.trim(),
          province: province.trim(),
          postalCode: cep.replace(/\D/g, ""),
          bankCode,
          agency: agency.trim(),
          account: account.trim(),
          accountDigit: accountDigit.trim(),
          accountType,
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string; message?: string };
      if (!res.ok || !data.success) {
        setErroGlobal(data.message ?? "Erro ao ativar Vestui Pay. Verifique os dados e tente novamente.");
        setIsSubmitting(false);
        return;
      }
      toast.success("Vestui Pay ativado! 🎉", {
        description: "Sua conta de recebimento está pronta. O Pix dinâmico já está disponível no checkout.",
      });
      onSuccess();
    } catch {
      setErroGlobal("Falha de conexão. Verifique sua internet e tente novamente.");
      setIsSubmitting(false);
    }
  }

  const stepLabels = ["Seus dados", "Conta bancária", "Revisão"];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <p className="font-bold text-white text-base">Ativar Vestui Pay</p>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/20">
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Steps indicator */}
          <div className="flex items-center gap-2">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold
                  ${i + 1 < step ? "bg-white text-emerald-700" : i + 1 === step ? "bg-white text-emerald-700 ring-2 ring-white/50" : "bg-white/30 text-white"}`}>
                  {i + 1 < step ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className={`text-[11px] font-medium ${i + 1 === step ? "text-white" : "text-white/60"}`}>{label}</span>
                {i < stepLabels.length - 1 && <div className="flex-1 h-px bg-white/30 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-4">
          {/* Etapa 1 */}
          {step === 1 && (
            <>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-800">
                <strong>Seus dados ficam protegidos.</strong> Usamos essas informações apenas para criar sua conta de recebimento. A Vestui nunca expõe seus dados às clientes.
              </div>
              <div className="grid gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Nome completo / Razão Social *</label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Maria das Flores LTDA" className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">CPF ou CNPJ *</label>
                  <Input value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} placeholder="000.000.000-00 ou 00.000.000/0001-00" className="font-mono text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">E-mail *</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="seu@email.com" className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">WhatsApp / Celular *</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="text-sm" />
                </div>
                {!isCNPJ && (
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Data de nascimento *</label>
                    <Input value={birthDate} onChange={(e) => setBirthDate(e.target.value)} type="date" className="text-sm" />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Etapa 2 */}
          {step === 2 && (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Endereço</p>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">CEP *</label>
                    <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" className="font-mono text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Número *</label>
                    <Input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} placeholder="123" className="text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Rua / Logradouro *</label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua das Flores" className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Bairro *</label>
                  <Input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Centro" className="text-sm" />
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Conta bancária para recebimento</p>
              <div className="grid gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Banco *</label>
                  <select value={bankCode} onChange={(e) => setBankCode(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="341">341 — Itaú</option>
                    <option value="237">237 — Bradesco</option>
                    <option value="033">033 — Santander</option>
                    <option value="001">001 — Banco do Brasil</option>
                    <option value="104">104 — Caixa Econômica</option>
                    <option value="077">077 — Inter</option>
                    <option value="260">260 — Nubank</option>
                    <option value="290">290 — PagBank</option>
                    <option value="336">336 — C6 Bank</option>
                    <option value="380">380 — PicPay</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Agência *</label>
                    <Input value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="0001" className="font-mono text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Conta *</label>
                    <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="12345" className="font-mono text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Dígito *</label>
                    <Input value={accountDigit} onChange={(e) => setAccountDigit(e.target.value)} placeholder="6" className="font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Tipo de conta</label>
                  <div className="flex gap-3">
                    {(["CONTA_CORRENTE", "CONTA_POUPANCA"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setAccountType(t)}
                        className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-all
                          ${accountType === t ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-gray-200 text-gray-600"}`}>
                        {t === "CONTA_CORRENTE" ? "Corrente" : "Poupança"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Etapa 3 — Revisão */}
          {step === 3 && (
            <>
              <div className="rounded-xl bg-gray-50 border border-gray-100 divide-y divide-gray-100">
                {[
                  { label: "Nome", value: nome },
                  { label: "CPF/CNPJ", value: cpfCnpj },
                  { label: "E-mail", value: email },
                  { label: "Celular", value: phone },
                  { label: "CEP", value: cep },
                  { label: "Endereço", value: `${address}, ${addressNumber} — ${province}` },
                  { label: "Banco", value: bankCode },
                  { label: "Agência/Conta", value: `${agency} / ${account}-${accountDigit} (${accountType === "CONTA_CORRENTE" ? "Corrente" : "Poupança"})` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-start px-4 py-2.5 text-xs gap-2">
                    <span className="text-gray-500 shrink-0">{label}</span>
                    <span className="font-semibold text-gray-900 text-right">{value}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-xs text-emerald-800 space-y-1">
                <p><strong>✅ Tudo certo!</strong> Ao confirmar:</p>
                <p>• Sua conta de recebimento será criada automaticamente</p>
                <p>• O Pix dinâmico fica disponível no checkout imediatamente</p>
                <p>• Os repasses caem na sua conta bancária em D+1</p>
              </div>
              {erroGlobal && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                  ⚠️ {erroGlobal}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          {step > 1 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} disabled={isSubmitting}>
              Voltar
            </Button>
          )}
          {step < 3 ? (
            <Button className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}>
              Próximo <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Ativando...</> : "✅ Ativar Vestui Pay"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
function IntegracoesPage() {
  const { storeId } = useStore();
  const [modalAberto, setModalAberto] = useState<string | null>(null);

  // ── Status do Vestui Pay (subconta Asaas) ────────────────────────────────
  // store_payment_accounts ainda não está nos tipos gerados (migration pendente).
  // O cast para any é temporário — remover após aplicar migration e rodar `supabase gen types`.
  const { data: payAccount, refetch: refetchPayAccount } = useQuery({
    queryKey: ["vestui-pay-account", storeId],
    queryFn: async (): Promise<{ status: string; account_id: string | null } | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("store_payment_accounts")
        .select("status, account_id, created_at")
        .eq("store_id", storeId)
        .maybeSingle();
      return data as { status: string; account_id: string | null } | null;
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });

  const vestuiPayStatus = payAccount?.status ?? "inativo"; // pendente | ativa | bloqueada | inativo


  const [statusMap, setStatusMap] = useState<Record<string, boolean>>(() => {
    const defaultMap = integracoesData.reduce<Record<string, boolean>>((acc, i) => {
      acc[i.id] = i.conectado;
      return acc;
    }, {});
    if (typeof localStorage === "undefined") return defaultMap;
    try {
      const raw =
        localStorage.getItem(`vestui_integrations_${storeId}`) ||
        localStorage.getItem(`vestui_integrations_${storeId}`) ||
        localStorage.getItem(`vestuli_integrations_${storeId}`);
      return raw ? { ...defaultMap, ...(JSON.parse(raw) as Record<string, boolean>) } : defaultMap;
    } catch {
      return defaultMap;
    }
  });

  // Sincroniza quando storeId é resolvido ou alterado
  useEffect(() => {
    if (!storeId) return;
    try {
      const raw =
        localStorage.getItem(`vestui_integrations_${storeId}`) ||
        localStorage.getItem(`vestui_integrations_${storeId}`) ||
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
        eyebrow="Configurar Vitrine"
        title="Integrações"
        description="Conecte sua loja com WhatsApp, Instagram, Pix e ferramentas de marketing."
      />

      <VitrineConfigNav />

      {/* ── Card Vestui Pay (destaque) ───────────────────────────────────── */}
      <div className={`rounded-2xl border-2 p-5 transition-all
        ${vestuiPayStatus === "ativa"
          ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50"
          : "border-dashed border-emerald-200 bg-emerald-50/40"}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-sm">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-gray-900">Vestui Pay</p>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full
                  bg-gradient-to-r from-emerald-500 to-teal-400 text-white">
                  Novo
                </span>
                {vestuiPayStatus === "ativa" && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle className="h-3 w-3" /> Ativo
                  </span>
                )}
                {vestuiPayStatus === "pendente" && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                    <Loader2 className="h-3 w-3 animate-spin" /> Em análise
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Pix dinâmico + cartão transparente diretamente no checkout — sem redirecionar para outra página. Confirmação automática via webhook. Repasse D+1.
              </p>
              {vestuiPayStatus === "ativa" && payAccount?.account_id && (
                <p className="mt-1 text-[10px] text-emerald-600 font-mono">
                  <Building2 className="h-3 w-3 inline mr-1" />
                  Conta: {payAccount.account_id.slice(0, 12)}...
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            {vestuiPayStatus === "ativa" ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                <CheckCircle className="h-4 w-4" /> Checkout ativo
              </div>
            ) : vestuiPayStatus === "pendente" ? (
              <div className="flex items-center gap-2 text-xs text-orange-600 font-semibold">
                <Loader2 className="h-4 w-4 animate-spin" /> Aguardando análise
              </div>
            ) : (
              <Button
                className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-sm"
                size="sm"
                onClick={() => setModalAberto("vestui_pay")}
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Ativar grátis
              </Button>
            )}
          </div>
        </div>

        {/* Benefícios */}
        {vestuiPayStatus !== "ativa" && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: "💠", text: "Pix dinâmico no checkout" },
              { icon: "✅", text: "Confirmação automática" },
              { icon: "🏦", text: "Repasse D+1 na conta" },
              { icon: "🔒", text: "100% seguro (BACEN)" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 rounded-xl bg-white/70 border border-emerald-100 px-3 py-2 text-[11px] font-medium text-emerald-800">
                <span>{icon}</span> {text}
              </div>
            ))}
          </div>
        )}
      </div>

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
            Shopee, Mercado Livre, Yampi e mais. Fale com a gente para priorizar.
          </p>
        </div>
      </div>

      {/* Modais */}
      {modalAberto === "mercadopago" && (
        <ModalConfiguracaoMercadoPago storeId={storeId} onClose={() => setModalAberto(null)} />
      )}
      {modalAberto === "cartao_assistido" && (
        <ModalConfiguracaoAssistido storeId={storeId} onClose={() => setModalAberto(null)} />
      )}
      {modalAberto === "vestui_pay" && (
        <ModalVestuiPayOnboarding
          storeId={storeId}
          onClose={() => setModalAberto(null)}
          onSuccess={() => {
            setModalAberto(null);
            void refetchPayAccount();
          }}
        />
      )}
    </div>
  );
}
