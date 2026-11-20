import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  Store,
  Shirt,
  Sparkle,
  Compass,
  SunMedium,
  Gem,
  Scissors,
  Palette,
  Loader2,
  ExternalLink,
  Copy,
  CheckCircle2,
  PartyPopper,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { supabase } from "@/integrations/supabase/client";
import { saveTheme, loadTheme } from "@/lib/theme-engine/defaults";
import type { ThemeConfig, Section, ThemeSettings } from "@/lib/theme-engine/schema";
import { nanoid } from "@/lib/theme-engine/nanoid";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { inventoryQuery } from "@/lib/db";
import { bulkActivateAll, patchShowcaseConfig } from "@/lib/showcase-store";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

interface QuickStoreWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export type NicheId = "autoral" | "festa" | "casual" | "praia" | "acessorios" | "atelie";

interface NicheOption {
  id: NicheId;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  heroHeading: string;
  heroSubheading: string;
  heroImage: string;
  palette: {
    background: string;
    foreground: string;
    primary: string;
    canvas: string;
    border: string;
  };
  fonts: {
    display: "Outfit" | "Playfair Display" | "Cormorant Garamond" | "Sora" | "Libre Baskerville";
    body: "Figtree" | "Manrope" | "Inter" | "DM Sans" | "Plus Jakarta Sans";
  };
  features: Array<{ title: string; description: string }>;
  faqs: Array<{ question: string; answer: string }>;
}

const NICHES: NicheOption[] = [
  {
    id: "autoral",
    title: "Moda Feminina Autoral",
    subtitle: "Linho, alfaiataria e elegância atemporal",
    icon: Shirt,
    tagline: "Moda autoral em pequenos lotes com caimento impecável",
    heroHeading: "O essencial,\nrefeito à mão.",
    heroSubheading: "Nova Coleção Exclusiva",
    heroImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80",
    palette: {
      background: "#FAFAF7",
      foreground: "#18181B",
      primary: "#18181B",
      canvas: "#F2EFE9",
      border: "#E2DDD3",
    },
    fonts: {
      display: "Outfit",
      body: "Figtree",
    },
    features: [
      { title: "Peças Autorais", description: "Design exclusivo em pequenos lotes selecionados." },
      { title: "1ª Troca Grátis", description: "30 dias para experimentar no conforto da sua casa." },
      { title: "Envio Expresso", description: "Despachamos em até 24h para todo o Brasil." },
      { title: "Atendimento VIP", description: "Consultoria personalizada direto no WhatsApp." },
    ],
    faqs: [
      { question: "Como descubro meu tamanho?", answer: "Cada produto conta com nossa tabela de medidas em centímetros. Se tiver dúvidas, clique no botão do WhatsApp que medimos a peça para você na hora!" },
      { question: "Como funciona a troca?", answer: "Sua primeira troca é 100% gratuita em até 7 dias corridos após a entrega. Basta nos avisar no WhatsApp." },
      { question: "Quais são as formas de pagamento?", answer: "Aceitamos Pix com aprovação imediata e cartão de crédito em até 6x sem juros." },
    ],
  },
  {
    id: "festa",
    title: "Festa & Alta Moda",
    subtitle: "Vestidos nobres, seda e sofisticação",
    icon: Sparkle,
    tagline: "Exclusividade e brilho para momentos inesquecíveis",
    heroHeading: "A elegância que\nnão pede licença.",
    heroSubheading: "Alta Costura & Eventos",
    heroImage: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=1600&q=80",
    palette: {
      background: "#FCFAF7",
      foreground: "#1C1917",
      primary: "#78350F",
      canvas: "#F7F2EA",
      border: "#E5DEC9",
    },
    fonts: {
      display: "Cormorant Garamond",
      body: "Manrope",
    },
    features: [
      { title: "Acabamento Nobre", description: "Tecidos finos com forro duplo e costura francesa." },
      { title: "Embalagem Especial", description: "Caixa presenteável aromatizada com carinho." },
      { title: "Ajuste Sob Medida", description: "Suporte especializado para o caimento perfeito." },
      { title: "Pagamento Seguro", description: "Até 6x sem juros ou desconto especial no Pix." },
    ],
    faqs: [
      { question: "O vestido precisa de ajustes?", answer: "Nossos modelos contam com margem interna de costura e tabela fiel. Auxiliamos você no WhatsApp com as medidas exatas." },
      { question: "Qual a antecedência recomendada para pedidos?", answer: "Recomendamos pedir com pelo menos 15 dias de antecedência do evento para envio e prova com tranquilidade." },
    ],
  },
  {
    id: "casual",
    title: "Casual & Streetwear",
    subtitle: "Conforto moderno, oversized e urbano",
    icon: Compass,
    tagline: "Roupas versáteis para quem vive a cidade com estilo",
    heroHeading: "Viva seu ritmo\nsem complicações.",
    heroSubheading: "Streetwear & Básico Premium",
    heroImage: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1600&q=80",
    palette: {
      background: "#FFFFFF",
      foreground: "#09090B",
      primary: "#2563EB",
      canvas: "#F4F4F5",
      border: "#E4E4E7",
    },
    fonts: {
      display: "Sora",
      body: "Inter",
    },
    features: [
      { title: "Algodão Premium", description: "Toque macio que não deforma após lavagens." },
      { title: "Entrega Rápida", description: "Rastreio em tempo real do seu pacote." },
      { title: "Troca sem Burocracia", description: "Processo ágil e direto pelo WhatsApp." },
      { title: "Pix com Desconto", description: "Ganhe desconto exclusivo pagando via Pix." },
    ],
    faqs: [
      { question: "A modelagem é oversized?", answer: "Sim! Indicamos seu tamanho habitual para um caimento mais solto e moderno, ou um número menor para ajuste slim." },
      { question: "Como acompanhar a entrega?", answer: "Assim que seu pedido for postado, enviamos o código de rastreio dos Correios/Transportadora diretamente no seu WhatsApp." },
    ],
  },
  {
    id: "praia",
    title: "Moda Praia & Resort",
    subtitle: "Biquínis, saídas de praia e sol",
    icon: SunMedium,
    tagline: "Sinta o verão o ano inteiro com frescor e conforto",
    heroHeading: "O sol é nosso\nmelhor acessório.",
    heroSubheading: "Coleção Verão Solar",
    heroImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80",
    palette: {
      background: "#FAFAF5",
      foreground: "#0F172A",
      primary: "#0D9488",
      canvas: "#F0F4EF",
      border: "#DFE5DE",
    },
    fonts: {
      display: "Outfit",
      body: "Plus Jakarta Sans",
    },
    features: [
      { title: "Proteção UV50+", description: "Tecidos tecnológicos que bloqueiam raios solares." },
      { title: "Secagem Rápida", description: "Tecnologia antibacteriana e alta durabilidade." },
      { title: "Troca Garantida", description: "Trocas de biquíni com lacre de higiene protegido." },
      { title: "Frete Sul & Sudeste", description: "Condições especiais e frete facilitado." },
    ],
    faqs: [
      { question: "Posso escolher tamanhos diferentes de top e calcinha?", answer: "Sim! Na nossa vitrine você pode montar o conjunto escolhendo o tamanho de cada peça individualmente." },
    ],
  },
  {
    id: "acessorios",
    title: "Acessórios & Semijoias",
    subtitle: "Bijuterias finas, bolsas e brilho",
    icon: Gem,
    tagline: "Detalhes preciosos que transformam qualquer look",
    heroHeading: "O detalhe que\nmuda tudo.",
    heroSubheading: "Semijoias & Curadoria de Acessórios",
    heroImage: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1600&q=80",
    palette: {
      background: "#FAF8F7",
      foreground: "#27272A",
      primary: "#D97706",
      canvas: "#F5EFEA",
      border: "#E9DFD8",
    },
    fonts: {
      display: "Playfair Display",
      body: "DM Sans",
    },
    features: [
      { title: "Banho Ouro 18k", description: "Semijoias hipoalergênicas com garantia de 1 ano." },
      { title: "Curadoria Fina", description: "Peças selecionadas a dedo para brilhar sempre." },
      { title: "Embalagem Presente", description: "Pronta para presentear quem você mais ama." },
      { title: "Envio Seguro", description: "Embalagem reforçada e envio protegido." },
    ],
    faqs: [
      { question: "As peças têm garantia?", answer: "Sim! Nossas semijoias contam com 1 ano de garantia no banho de ouro 18k e prata 925." },
    ],
  },
  {
    id: "atelie",
    title: "Ateliê & Sob Medida",
    subtitle: "Costura artesanal e alfaiataria afetiva",
    icon: Scissors,
    tagline: "Roupas feitas à mão com alma, paciência e caimento perfeito",
    heroHeading: "Feito à mão,\npara durar gerações.",
    heroSubheading: "Costura Afetiva & Autoral",
    heroImage: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1600&q=80",
    palette: {
      background: "#F7F5F0",
      foreground: "#292524",
      primary: "#57534E",
      canvas: "#EEEAE0",
      border: "#DCD5C6",
    },
    fonts: {
      display: "Libre Baskerville",
      body: "Figtree",
    },
    features: [
      { title: "100% Artesanal", description: "Cada ponto executado com dedicação e afeto." },
      { title: "Tecidos Puros", description: "Priorizamos linho puro, algodão cru e fibras nobres." },
      { title: "Caimento Garantido", description: "Ajustamos para suas medidas com amor." },
      { title: "Direto com a Estilista", description: "Converse pelo WhatsApp com quem fez a peça." },
    ],
    faqs: [
      { question: "Como funciona a encomenda sob medida?", answer: "Basta chamar no WhatsApp! Enviamos o guia de como tirar suas medidas e você escolhe a cor e o tecido." },
    ],
  },
];

function formatPhoneInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function sanitizeWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function QuickStoreWizard({ open, onOpenChange, onSuccess }: QuickStoreWizardProps) {
  const { store } = useStore();
  const queryClient = useQueryClient();
  const { data: rawInventory = [] } = useQuery(inventoryQuery());

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedNiche, setSelectedNiche] = useState<NicheId>("autoral");
  const [customStoreName, setCustomStoreName] = useState(store?.name || "");
  const [customWhatsApp, setCustomWhatsApp] = useState(store?.phone ? formatPhoneInput(store.phone) : "");
  const [phoneError, setPhoneError] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeNiche: NicheOption = useMemo(
    () => (NICHES.find((n) => n.id === selectedNiche) ?? NICHES[0]) as NicheOption,
    [selectedNiche]
  );

  const handleGenerate = async () => {
    setIsSubmitting(true);
    try {
      const resolvedStoreName = customStoreName.trim() || store?.name || "Minha Loja";
      const resolvedWhatsApp = sanitizeWhatsApp(customWhatsApp.trim() || store?.phone || "");

      // Preserva o templateId já escolhido pela lojista; usa template-02 como fallback do wizard
      const currentTheme = loadTheme();
      const storeMetadata = store?.metadata as Record<string, unknown> | null;
      const fallbackTemplate = "template-02" as const;
      const resolvedTemplateId: "template-01" | "template-02" | "template-03" | "template-04" | "template-05" | "catalogo-express" =
        (storeMetadata?.["templateId"] as "template-01" | "template-02" | "template-03" | "template-04" | "template-05" | "catalogo-express" | undefined) ||
        currentTheme.settings.templateId ||
        fallbackTemplate;

      // Paleta: usa a do nicho ou adapta com base na cor customizada escolhida
      const basePalette = { ...activeNiche.palette };
      if (customColor) {
        basePalette.primary = customColor;
      }

      // Cria a árvore de seções otimizada para conversão
      const sections: Section[] = [
        {
          id: `hero-${nanoid()}`,
          type: "hero",
          visible: true,
          settings: {
            heading: activeNiche.heroHeading,
            subheading: activeNiche.heroSubheading,
            buttonText: "Ver Novidades",
            imageUrl: activeNiche.heroImage,
            imageAlt: activeNiche.title,
            imagePosition: "center",
            overlayOpacity: 35,
          },
        },
        {
          id: `features-${nanoid()}`,
          type: "features",
          visible: true,
          settings: {
            items: activeNiche.features,
          },
        },
        {
          id: `category-bar-${nanoid()}`,
          type: "category_bar",
          visible: true,
          settings: { enabled: true },
        },
        {
          id: `grid-featured-${nanoid()}`,
          type: "product_grid",
          visible: true,
          settings: {
            kicker: "SELEÇÃO ESPECIAL",
            title: "Destaques da Coleção",
            source: "featured",
            count: 4,
            columns: 4,
            showViewAll: true,
          },
        },
        {
          id: `promo-${nanoid()}`,
          type: "promotional_banner",
          visible: true,
          settings: {
            badge: "CONDIÇÃO ESPECIAL",
            heading: "Frete Cortesia nas Compras de Hoje",
            subheading: "Aproveite para renovar suas peças favoritas com atendimento exclusivo.",
            buttonText: "Explorar Peças",
            endDateHours: 24,
          },
        },
        {
          id: `testimonials-${nanoid()}`,
          type: "testimonials",
          visible: true,
          settings: {
            kicker: "EXPERIÊNCIA REAL",
            title: "Quem comprou, amou",
            items: [
              {
                name: "Beatriz M.",
                city: "São Paulo, SP",
                rating: 5,
                comment: "A qualidade do tecido superou minhas expectativas! Muito elegante e cheirosa.",
              },
              {
                name: "Camila V.",
                city: "Rio de Janeiro, RJ",
                rating: 5,
                comment: "O suporte no WhatsApp me ajudou a escolher o tamanho certinho. Amei tudo!",
              },
              {
                name: "Juliana T.",
                city: "Belo Horizonte, MG",
                rating: 5,
                comment: "Peças exclusivas com caimento que abraça o corpo. Já virei cliente fiel.",
              },
            ],
          },
        },
        {
          id: `faq-${nanoid()}`,
          type: "faq",
          visible: true,
          settings: {
            kicker: "DÚVIDAS FREQUENTES",
            title: "Como podemos te ajudar?",
            items: activeNiche.faqs,
          },
        },
        {
          id: `newsletter-${nanoid()}`,
          type: "newsletter",
          visible: true,
          settings: {
            heading: "Ganhe 10% OFF na Primeira Compra",
            subheading: "Cadastre seu e-mail e receba na hora um cupom de desconto para usar hoje.",
            buttonText: "Quero meu desconto",
            couponBadge: "BEMVINDA10",
          },
        },
      ];

      const newTheme: ThemeConfig = {
        settings: {
          templateId: resolvedTemplateId,
          storeName: resolvedStoreName,
          tagline: activeNiche.tagline,
          freeShippingBanner: "Frete Grátis nas compras acima de R$ 399 · Trocas em até 30 dias",
          freeShippingBannerEnabled: true,
          checkoutMode: "whatsapp",
          storeWhatsApp: resolvedWhatsApp,
          storeDescription: activeNiche.tagline,
          politicaTroca: "A primeira troca é totalmente grátis em até 7 dias após o recebimento.",
          mostrarEstoque: false,
          colorBackground: basePalette.background,
          colorForeground: basePalette.foreground,
          colorPrimary: basePalette.primary,
          colorCanvas: basePalette.canvas,
          colorBorder: basePalette.border,
          fontDisplay: activeNiche.fonts.display,
          fontBody: activeNiche.fonts.body,
          borderRadius: "sm",
        },
        sections,
        order: sections.map((s) => s.id),
      };

      // 1. Grava no localStorage e dispara eventos locais
      saveTheme(newTheme);

      // 2. Persiste atômica e permanentemente no Supabase para a vitrine pública
      if (store?.id) {
        const currentMeta = (store.metadata as Record<string, unknown> | null) || {};
        await supabase
          .from("stores")
          .update({
            name: resolvedStoreName,
            phone: resolvedWhatsApp || store.phone,
            metadata: {
              ...currentMeta,
              theme: newTheme,
              templateId: resolvedTemplateId,
              vitrine_ativa: true,
            } as never,
          })
          .eq("id", store.id);

        void queryClient.invalidateQueries({ queryKey: ["active_store"] });
      }

      // 3. Ativação Inteligente do Estoque Real no Catálogo da Vitrine (Zero Redigitação)
      if (rawInventory.length > 0) {
        const itemIds = rawInventory.map((i) => i.id);
        bulkActivateAll(itemIds);

        // Seleciona até 4 peças com foto e estoque ativo para marcar em destaque na vitrine
        const itemsWithPhotos = rawInventory.filter(
          (i) => i.photo_url || Object.values(i.sizes || {}).some((q) => q > 0),
        );
        const topItems = (itemsWithPhotos.length > 0 ? itemsWithPhotos : rawInventory).slice(0, 4);
        topItems.forEach((item) => {
          patchShowcaseConfig(item.id, { destaque: true, ativo: true });
        });
      }

      toast.success("Sua loja foi construída com sucesso! 🎉", {
        description: "Estrutura profissional, paleta de cores e seções prontas para vender.",
      });

      window.dispatchEvent(new CustomEvent("wizard-completed", { detail: { theme: newTheme } }));
      window.dispatchEvent(new Event("theme-changed"));

      onSuccess?.();
      setStep(4);
    } catch (err) {
      console.error("Erro ao gerar loja:", err);
      toast.error("Ocorreu um erro ao gerar a loja. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0 rounded-3xl border-border bg-card">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4 border-b border-border/60">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Sparkles className="h-4 w-4" />
            Criador em 3 Cliques · Modo Expresso
          </div>
          <DialogTitle className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {step === 1 && "Qual é o DNA da sua loja?"}
            {step === 2 && "Personalize o Visual e Cores"}
            {step === 3 && "Sua Loja está Pronta para Vender!"}
            {step === 4 && "Sua Loja está Oficialmente no Ar! 🎉"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {step === 1 && "Selecione o nicho que melhor descreve suas peças para aplicarmos as seções ideais."}
            {step === 2 && "Ajuste o nome, WhatsApp e paleta visual da sua marca com 1 clique."}
            {step === 3 && "Revise a prévia e publique instantaneamente na nuvem com um clique."}
            {step === 4 && "Design impecável, seções criadas e canal de vendas ativo para receber clientes."}
          </DialogDescription>

          {/* Stepper Progress */}
          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* ── ETAPA 1: NICHOS ────────────────────────────────────────── */}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {NICHES.map((niche) => {
                const Icon = niche.icon;
                const isSelected = selectedNiche === niche.id;
                return (
                  <button
                    key={niche.id}
                    type="button"
                    onClick={() => setSelectedNiche(niche.id)}
                    className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 relative ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                        : "border-border/70 hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-card border border-border shadow-xs">
                        <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="mt-3 font-semibold text-sm text-foreground">{niche.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      {niche.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── ETAPA 2: DADOS & CORES ─────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nome da Loja</Label>
                  <Input
                    value={customStoreName}
                    onChange={(e) => setCustomStoreName(e.target.value)}
                    placeholder="Ex: Ateliê Aurora"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">WhatsApp para Pedidos</Label>
                    {phoneError && (
                      <span className="text-[10px] text-rose-500 font-medium">{phoneError}</span>
                    )}
                  </div>
                  <Input
                    value={customWhatsApp}
                    onChange={(e) => {
                      const formatted = formatPhoneInput(e.target.value);
                      setCustomWhatsApp(formatted);
                      if (phoneError) setPhoneError("");
                    }}
                    placeholder="Ex: (11) 99876-5432"
                    className={cn(
                      "h-10 rounded-xl",
                      phoneError && "border-rose-500 focus-visible:ring-rose-500"
                    )}
                  />
                </div>
              </div>

              {/* Reconhecimento Mágico do Estoque (Zero Redigitação) */}
              {rawInventory.length > 0 ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        <Shirt className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          {rawInventory.length} {rawInventory.length === 1 ? "peça pronta no seu acervo" : "peças prontas no seu acervo"}
                        </p>
                        <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80">
                          Preços, fotos e grade calculados no Vestui serão organizados na vitrine.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full shrink-0">
                      Auto-conectado
                    </span>
                  </div>

                  {/* Miniaturas das primeiras peças com preços calculados */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {rawInventory.slice(0, 4).map((item) => (
                      <div key={item.id} className="rounded-xl border border-border/80 bg-background/90 p-1.5 text-center overflow-hidden shadow-2xs">
                        <div className="aspect-square w-full rounded-lg bg-secondary/60 overflow-hidden mb-1 flex items-center justify-center">
                          {item.photo_url ? (
                            <img src={item.photo_url} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <Shirt className="h-4 w-4 text-muted-foreground/60" />
                          )}
                        </div>
                        <p className="truncate text-[10px] font-semibold text-foreground">{item.name}</p>
                        <p className="text-[10px] font-bold font-mono text-primary">{brl(item.sale_price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-secondary/30 p-3.5 flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-card text-muted-foreground shrink-0 border border-border">
                    <Shirt className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-semibold text-foreground">Sem peças cadastradas ainda?</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Sua vitrine nascerá com modelos demonstrativos de alto padrão. Quando você cadastrar suas peças no Estoque, elas entrarão na loja automaticamente.
                    </p>
                  </div>
                </div>
              )}

              {/* Visual Presets */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold">Paleta de Cores Recomendada</Label>
                <div className="p-4 rounded-2xl border border-border bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1.5">
                      <div
                        className="h-7 w-7 rounded-full border-2 border-background shadow-xs"
                        style={{ backgroundColor: activeNiche.palette.background }}
                      />
                      <div
                        className="h-7 w-7 rounded-full border-2 border-background shadow-xs"
                        style={{ backgroundColor: customColor || activeNiche.palette.primary }}
                      />
                      <div
                        className="h-7 w-7 rounded-full border-2 border-background shadow-xs"
                        style={{ backgroundColor: activeNiche.palette.canvas }}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Paleta {activeNiche.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Harmonizada com fontes {activeNiche.fonts.display} + {activeNiche.fonts.body}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Personalizar tom:</span>
                    <input
                      type="color"
                      value={customColor || activeNiche.palette.primary}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                      title="Escolher cor principal"
                    />
                  </div>
                </div>

                {/* Cores rápidas com 1 toque */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground mr-1">Tons populares:</span>
                  {[
                    { name: "Preto Nobre", hex: "#18181b" },
                    { name: "Rosa Rubi", hex: "#e11d48" },
                    { name: "Terracota", hex: "#c2410c" },
                    { name: "Ouro Bronze", hex: "#b45309" },
                    { name: "Verde Oliva", hex: "#4d7c0f" },
                    { name: "Azul Cobalto", hex: "#1d4ed8" },
                    { name: "Vinho Bordô", hex: "#881337" },
                    { name: "Areia Quente", hex: "#78716c" },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.name}
                      onClick={() => setCustomColor(c.hex)}
                      className={`h-6 w-6 rounded-full border transition-all ${
                        (customColor || activeNiche.palette.primary).toLowerCase() === c.hex.toLowerCase()
                          ? "ring-2 ring-primary ring-offset-1 scale-110"
                          : "border-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              {/* Informações Inclusas */}
              <div className="rounded-2xl border border-dashed border-border/80 p-3.5 bg-muted/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  O que já vem pré-configurado:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-foreground/80">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-primary" /> Banner de Alta Resolução
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-primary" /> Grade de Produtos Ativa
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-primary" /> 4 Diferenciais Comerciais
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-primary" /> Depoimentos & FAQ Prontos
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ETAPA 3: REVISÃO & CONFIRMAÇÃO ─────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border overflow-hidden bg-background shadow-xs">
                {/* Mini mockup banner */}
                <div
                  className="h-28 w-full relative flex items-center px-6 bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.65), rgba(0,0,0,0.2)), url(${activeNiche.heroImage})`,
                  }}
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white/80">
                      {customStoreName || store?.name || "Minha Loja"}
                    </span>
                    <h4 className="text-lg font-serif font-medium text-white leading-tight mt-0.5">
                      {activeNiche.heroHeading.replace("\n", " ")}
                    </h4>
                  </div>
                </div>

                <div className="p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Estilo Selecionado:</span>
                    <span className="font-semibold text-foreground">{activeNiche.title}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Checkout / Pagamento:</span>
                    <span className="font-semibold text-foreground">WhatsApp Automatizado + Pix Dinâmico</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Seções Criadas:</span>
                    <span className="font-semibold text-foreground">8 seções completas de alta conversão</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Status da Loja:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Pronta para Ativar
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Após a geração, você ainda poderá editar qualquer texto, foto ou cor individual no Modo Pro!
              </p>
            </div>
          )}

          {/* ── ETAPA 4: SUCESSO & ONBOARDING ─────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5 text-center py-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 shadow-glow">
                <PartyPopper className="h-8 w-8" />
              </div>

              <div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  Sua vitrine já está aberta para o mundo!
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Criamos seu layout profissional, conectamos o checkout no WhatsApp e sua loja já pode receber clientes agora mesmo.
                </p>
              </div>

              {/* Card do Link Oficial */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-left">
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Link Oficial da sua Loja:
                </p>
                <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-border bg-background p-2">
                  <span className="truncate text-xs font-mono font-medium text-foreground">
                    https://vestui.com.br/vitrine/{store?.slug || "sua-loja"}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 rounded-lg text-xs cursor-pointer"
                      onClick={() => {
                        const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://vestui.com.br";
                        const url = `${origin}/vitrine/${store?.slug || ""}`;
                        navigator.clipboard.writeText(url);
                        setCopiedLink(true);
                        toast.success("Link copiado para a área de transferência!");
                        setTimeout(() => setCopiedLink(false), 2500);
                      }}
                    >
                      {copiedLink ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedLink ? "Copiado!" : "Copiar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 rounded-lg text-xs"
                      asChild
                    >
                      <a
                        href={`/vitrine/${store?.slug || ""}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              {/* 3 Próximos Passos */}
              <div className="rounded-2xl border border-border bg-muted/20 p-4 text-left space-y-2.5">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Próximos passos recomendados:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Cadastre suas peças</p>
                      <p className="text-[11px] text-muted-foreground">Adicione fotos e preços no seu inventário para alimentar a vitrine.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Confirme sua Chave Pix</p>
                      <p className="text-[11px] text-muted-foreground">Cadastre em Configurações para receber pagamentos instantâneos com QR Code.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Divulgue na Bio do Instagram</p>
                      <p className="text-[11px] text-muted-foreground">Cole seu link no Instagram e envie no WhatsApp das suas clientes fiéis.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          {step === 4 ? (
            <Button
              type="button"
              size="default"
              className="w-full gradient-primary rounded-xl h-10 font-semibold shadow-glow cursor-pointer"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Concluir e Ir para o Painel 🛍️
            </Button>
          ) : (
            <>
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                  className="gap-1.5 rounded-xl h-9"
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (step === 2) {
                      const cleanDigits = customWhatsApp.replace(/\D/g, "");
                      if (cleanDigits && cleanDigits.length < 10) {
                        setPhoneError("Mínimo de 10 dígitos (DDD + número)");
                        toast.error("Por favor, informe um WhatsApp válido com DDD.");
                        return;
                      }
                    }
                    setStep((s) => (s + 1) as 2 | 3);
                  }}
                  className="gap-1.5 rounded-xl h-9 shadow-glow px-4 font-semibold"
                >
                  Avançar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isSubmitting}
                  className="gap-2 rounded-xl h-9 shadow-glow px-5 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publicando sua Loja...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Gerar e Publicar Minha Loja 🚀
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
