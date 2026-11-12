import { useState, useMemo, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Copy,
  Download,
  ExternalLink,
  Instagram,
  Link2,
  MessageCircle,
  Printer,
  QrCode,
  Search,
  Share2,
  Sparkles,
  Ticket,
  Check,
  ShoppingBag,
  Smartphone,
  Eye,
  SlidersHorizontal,
  X,
  Palette,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/loja/page-header";
import { VitrineConfigNav } from "@/components/loja/vitrine-config-nav";
import { SectionCard } from "@/components/loja/section-card";
import { PlanoBadge } from "@/components/loja/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl, toNumber } from "@/lib/format";
import { useStore } from "@/lib/store-context";
import { inventoryQuery } from "@/lib/db";
import { loadShowcaseConfigs } from "@/lib/showcase-store";
import { generateQrMatrix, qrMatrixToDataUrl, qrMatrixToSvg } from "@/lib/qr-generator";

type CupomCompartilhar = {
  codigo: string;
  nome?: string;
  tipo: "percentual" | "fixo";
  valor: number;
  ativo: boolean;
  validade?: string | null;
  valor_minimo?: number;
};

export const Route = createFileRoute("/_authenticated/loja/compartilhar")({
  head: () => ({
    meta: [
      { title: "Divulgação & Redes — Marketing Vestui" },
      {
        name: "description",
        content:
          "Central de marketing omnichannel: links para bio, QR Code escaneável para balcão, gerador de Stories e roteiros para WhatsApp.",
      },
    ],
  }),
  component: CompartilharPage,
});

function CompartilharPage() {
  const { store, storeId } = useStore();

  // Slug e nome real da loja
  const slug = store?.slug ?? storeId ?? "minha-loja";
  const storeName = store?.name || "Minha Boutique";
  const baseUrl =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://vestui.com.br";
  const linkLojaBase = `${baseUrl}/vitrine/${slug}`;

  // Seletor de canal de marketing com UTM tags
  const [canalSelecionado, setCanalSelecionado] = useState<"geral" | "instagram" | "whatsapp" | "tiktok">("geral");

  const linkLoja = useMemo(() => {
    if (canalSelecionado === "instagram") return `${linkLojaBase}?utm_source=instagram_bio`;
    if (canalSelecionado === "whatsapp") return `${linkLojaBase}?utm_source=whatsapp_direct`;
    if (canalSelecionado === "tiktok") return `${linkLojaBase}?utm_source=tiktok_bio`;
    return linkLojaBase;
  }, [linkLojaBase, canalSelecionado]);

  // Produtos reais do inventário
  const { data: inventario = [] } = useQuery(inventoryQuery());
  const showcaseConfigs = useMemo(() => loadShowcaseConfigs(), []);

  // ── Filtro Inteligente de Produtos Ativos ──────────────────────────────
  // CORREÇÃO: Não exige showcaseConfigs local rígido — se o produto tem estoque
  // e não foi desativado explicitamente, ele fica disponível para divulgação!
  const produtosAtivos = useMemo(() => {
    return inventario.filter((item) => {
      const cfg = showcaseConfigs[item.id];
      if (cfg && cfg.ativo === false) return false;
      const s = (item.sizes ?? {}) as Record<string, number>;
      const units = Object.values(s).reduce((a, b) => a + (Math.round(toNumber(b)) || 0), 0);
      if (units <= 0) {
        return false;
      }
      return true;
    });
  }, [inventario, showcaseConfigs]);

  // Busca na lista de peças
  const [buscaPeca, setBuscaPeca] = useState("");
  const pecasFiltradas = useMemo(() => {
    if (!buscaPeca.trim()) return produtosAtivos;
    const termo = buscaPeca.toLowerCase();
    return produtosAtivos.filter(
      (p) =>
        p.name.toLowerCase().includes(termo) ||
        (p.category && p.category.toLowerCase().includes(termo)),
    );
  }, [produtosAtivos, buscaPeca]);

  // Peça selecionada para o Estúdio de Stories
  const [pecaStory, setPecaStory] = useState<(typeof produtosAtivos)[0] | null>(null);

  // Inicializa a peça do story com a primeira peça ativa
  useEffect(() => {
    if (!pecaStory && produtosAtivos.length > 0) {
      setPecaStory(produtosAtivos[0] ?? null);
    }
  }, [produtosAtivos, pecaStory]);

  // ── QR Code Real ────────────────────────────────────────────────────────
  const qrMatrix = useMemo(() => generateQrMatrix(linkLojaBase), [linkLojaBase]);
  const qrSvg = useMemo(() => qrMatrixToSvg(qrMatrix, "#09090b", "#ffffff"), [qrMatrix]);
  const [qrPngUrl, setQrPngUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = qrMatrixToDataUrl(qrMatrix, 1000, "#09090b", "#ffffff");
      setQrPngUrl(url);
    }
  }, [qrMatrix]);

  // Modal do Display de Balcão para Impressão
  const [modalDisplayBalcao, setModalDisplayBalcao] = useState(false);

  // Cupons ativos da loja na nuvem
  const cuponsAtivos = useMemo<CupomCompartilhar[]>(() => {
    const rawCupons = store?.metadata?.["cupons"];
    if (!Array.isArray(rawCupons)) return [];
    return (rawCupons as CupomCompartilhar[]).filter((c) => c.ativo !== false);
  }, [store?.metadata]);

  // Utilitário de Cópia
  const [copiadoTexto, setCopiadoTexto] = useState<string | null>(null);
  const copiar = (texto: string, mensagem: string) => {
    void navigator.clipboard?.writeText(texto);
    setCopiadoTexto(texto);
    toast.success(mensagem, { description: texto });
    setTimeout(() => setCopiadoTexto(null), 2500);
  };

  // ── Download do QR Code em Alta Resolução ───────────────────────────────
  const baixarQrCode = () => {
    if (!qrPngUrl) return;
    const a = document.createElement("a");
    a.href = qrPngUrl;
    a.download = `qrcode-vestui-${slug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("QR Code em alta definição baixado!", {
      description: "Pronto para enviar para a gráfica ou usar em adesivos de sacola.",
    });
  };

  // ── Motor do Estúdio de Stories (Canvas 1080x1920) ──────────────────────
  const [gerandoStory, setGerandoStory] = useState(false);
  const storyCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const baixarStoryPng = async () => {
    if (!pecaStory) {
      toast.error("Selecione uma peça para gerar o Story");
      return;
    }
    setGerandoStory(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível inicializar o canvas");

      // 1. Fundo Gradiente Luxury Dark
      const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
      grad.addColorStop(0, "#09090b");
      grad.addColorStop(0.5, "#18181b");
      grad.addColorStop(1, "#09090b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Efeito de iluminação suave superior
      const glow = ctx.createRadialGradient(540, 400, 50, 540, 400, 600);
      glow.addColorStop(0, "rgba(59, 130, 246, 0.15)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1080, 1920);

      // 2. Header do Story: Nome da Boutique e Tag de Coleção
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "600 28px sans-serif";
      ctx.textAlign = "center";
      ctx.letterSpacing = "6px";
      ctx.fillText(storeName.toUpperCase(), 540, 160);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px sans-serif";
      ctx.letterSpacing = "1px";
      ctx.fillText("NOVA COLEÇÃO", 540, 230);

      // Linha dourada/prata sutil
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(420, 265);
      ctx.lineTo(660, 265);
      ctx.stroke();

      // 3. Imagem da Peça Centralizada com Moldura Arredondada
      const cfg = showcaseConfigs[pecaStory.id];
      const fotoUrl = cfg?.vitrineFotos?.[0] || pecaStory.photo_url;

      if (fotoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => resolve(); // se der erro de CORS na foto externa, continua sem travar
            img.src = fotoUrl;
          });

          // Moldura arredondada para a foto
          const imgX = 140;
          const imgY = 320;
          const imgW = 800;
          const imgH = 960;
          const r = 40;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(imgX + r, imgY);
          ctx.lineTo(imgX + imgW - r, imgY);
          ctx.quadraticCurveTo(imgX + imgW, imgY, imgX + imgW, imgY + r);
          ctx.lineTo(imgX + imgW, imgY + imgH - r);
          ctx.quadraticCurveTo(imgX + imgW, imgY + imgH, imgX + imgW - r, imgY + imgH);
          ctx.lineTo(imgX + r, imgY + imgH);
          ctx.quadraticCurveTo(imgX, imgY + imgH, imgX, imgY + imgH - r);
          ctx.lineTo(imgX, imgY + r);
          ctx.quadraticCurveTo(imgX, imgY, imgX + r, imgY);
          ctx.closePath();
          ctx.clip();

          // Desenha a imagem mantendo a proporção (cover)
          const scale = Math.max(imgW / img.naturalWidth, imgH / img.naturalHeight);
          const drawW = img.naturalWidth * scale;
          const drawH = img.naturalHeight * scale;
          const drawX = imgX + (imgW - drawW) / 2;
          const drawY = imgY + (imgH - drawH) / 2;
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          ctx.restore();

          // Borda luxuosa ao redor da foto
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 2;
          ctx.stroke();
        } catch (e) {
          console.warn("Falha ao desenhar foto no Canvas:", e);
        }
      }

      // 4. Nome da Peça
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 52px sans-serif";
      ctx.textAlign = "center";
      ctx.letterSpacing = "0px";
      const nomeCortado = pecaStory.name.length > 30 ? `${pecaStory.name.slice(0, 30)}...` : pecaStory.name;
      ctx.fillText(nomeCortado, 540, 1370);

      // 5. Preço & Condição
      const preco = cfg?.precoPromocional ?? Number(pecaStory.sale_price ?? 0);
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 64px sans-serif";
      ctx.fillText(brl(preco), 540, 1460);

      if (preco > 80) {
        ctx.fillStyle = "#a1a1aa";
        ctx.font = "500 28px sans-serif";
        const parc = (preco / 3).toFixed(2).replace(".", ",");
        ctx.fillText(`ou 3x de R$ ${parc} sem juros`, 540, 1515);
      }

      // 6. Sticker / Adesivo Virtual de Link
      const btnX = 240;
      const btnY = 1600;
      const btnW = 600;
      const btnH = 120;
      const btnR = 60;

      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.moveTo(btnX + btnR, btnY);
      ctx.lineTo(btnX + btnW - btnR, btnY);
      ctx.quadraticCurveTo(btnX + btnW, btnY, btnX + btnW, btnY + btnR);
      ctx.lineTo(btnX + btnW, btnY + btnH - btnR);
      ctx.quadraticCurveTo(btnX + btnW, btnY + btnH, btnX + btnW - btnR, btnY + btnH);
      ctx.lineTo(btnX + btnR, btnY + btnH);
      ctx.quadraticCurveTo(btnX, btnY + btnH, btnX, btnY + btnH - btnR);
      ctx.lineTo(btnX, btnY + btnR);
      ctx.quadraticCurveTo(btnX, btnY, btnX + btnR, btnY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "#09090b";
      ctx.font = "bold 34px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🔗 TOQUE NO LINK PARA COMPRAR", 540, 1675);

      // 7. Rodapé do Story
      ctx.fillStyle = "#71717a";
      ctx.font = "400 24px sans-serif";
      ctx.fillText(linkLojaBase.replace(/^https?:\/\//, ""), 540, 1800);

      // Converte para blob e baixa
      canvas.toBlob((blob) => {
        if (!blob) throw new Error("Erro ao gerar imagem");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const nomeSlug = pecaStory.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        a.download = `story-${nomeSlug}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Story pronto em 1080x1920 (HD)!", {
          description: "Abra o Instagram e poste direto nos Stories.",
        });
      }, "image/png");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível gerar a imagem do Story automaticamente.");
    } finally {
      setGerandoStory(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* ── Header Padrão Quiet Luxury ──────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="Marketing & Crescimento"
          title="Divulgação & Redes"
          description="Seu centro de tração comercial: links para bio e redes, QR Code de balcão e gerador de Stories oficial da boutique."
        />
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-full text-xs gap-1.5 border-border/80 bg-card hover:bg-secondary/60 cursor-pointer"
          >
            <a href={linkLojaBase} target="_blank" rel="noopener noreferrer">
              <Eye className="h-3.5 w-3.5 text-primary" /> Ver Vitrine Online
            </a>
          </Button>
        </div>
      </div>

      <VitrineConfigNav />

      {/* ── BENTO GRID SUPERIOR: LINK OFICIAL + QR CODE DE BALCÃO ───────── */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Card 1: Link da Bio & Canais Sociais (7 Colunas) */}
        <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft lg:col-span-7 flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Canal Principal
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">1 clique para copiar</span>
            </div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Link Oficial da Loja
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Use este link na bio do Instagram, nos botões do WhatsApp e no TikTok para direcionar todas as suas clientes para a vitrine.
            </p>
          </div>

          {/* Seletor de Canal com Rastreamento UTM */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Personalizar link por canal de divulgação:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "geral", label: "Geral (Bio)", icon: Link2 },
                { id: "instagram", label: "Instagram Bio", icon: Instagram },
                { id: "whatsapp", label: "WhatsApp Direct", icon: MessageCircle },
              ].map((c) => {
                const Icon = c.icon;
                const active = canalSelecionado === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCanalSelecionado(c.id as typeof canalSelecionado)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campo de Link com Botão de Cópia */}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <Input
                readOnly
                value={linkLoja}
                className="h-11 rounded-2xl bg-secondary/40 font-mono text-xs pr-10 text-foreground"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                HTTPS
              </span>
            </div>
            <Button
              onClick={() => copiar(linkLoja, "Link da loja copiado com sucesso!")}
              className="gradient-primary h-11 shrink-0 rounded-2xl px-5 text-xs font-semibold text-primary-foreground shadow-glow cursor-pointer"
            >
              {copiadoTexto === linkLoja ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" /> Copiar link
                </>
              )}
            </Button>
          </div>

          {/* Ações Diretas para Redes Sociais */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full text-xs border-border/80 hover:bg-secondary/70"
              onClick={() => {
                copiar(linkLoja, "Link copiado! Cole na bio do seu perfil.");
                window.open("https://instagram.com", "_blank", "noopener,noreferrer");
              }}
            >
              <Instagram className="mr-1.5 h-3.5 w-3.5 text-pink-600" /> Colocar na bio do Instagram
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full text-xs border-border/80 hover:bg-secondary/70"
              onClick={() => {
                const msg = encodeURIComponent(
                  `Olá! Conheça nossa vitrine online oficial: ${linkLoja}\n\nPeças disponíveis a pronta entrega e atendimento pelo WhatsApp!`,
                );
                window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank", "noopener,noreferrer");
              }}
            >
              <MessageCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Divulgar no WhatsApp
            </Button>
          </div>
        </div>

        {/* Card 2: QR Code Real de Balcão & Sacola (5 Colunas) */}
        <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft lg:col-span-5 flex flex-col justify-between items-center text-center space-y-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Omnichannel Físico & Digital
            </span>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              QR Code do Balcão
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Imprima para colocar no acrílico do caixa e nos adesivos das sacolas.
            </p>
          </div>

          {/* Visualizador do QR Code Real (Vetor SVG Nítido) */}
          <div className="relative group p-3 rounded-2xl bg-white shadow-md border border-zinc-200">
            <div
              className="h-36 w-36 flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <div className="absolute inset-0 bg-black/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="bg-zinc-900/90 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-md">
                100% Escaneável
              </span>
            </div>
          </div>

          {/* Ações de Impressão e Download */}
          <div className="grid grid-cols-2 gap-2 w-full pt-2">
            <Button
              variant="outline"
              onClick={baixarQrCode}
              className="h-10 rounded-xl text-xs gap-1.5 border-border/80"
              title="Baixar imagem em PNG alta resolução"
            >
              <Download className="h-3.5 w-3.5" /> Baixar PNG
            </Button>
            <Button
              onClick={() => setModalDisplayBalcao(true)}
              className="h-10 rounded-xl text-xs gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            >
              <Printer className="h-3.5 w-3.5" /> Display Balcão
            </Button>
          </div>
        </div>
      </div>

      {/* ── CARD 3: ESTÚDIO DE STORIES DE ALTA CONVERSÃO (1080x1920) ──────── */}
      <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-secondary/30 p-6 shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                <Sparkles className="h-3 w-3" /> Estúdio de Vendas
              </span>
              <PlanoBadge plan="crescimento" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Gerador de Stories para Instagram
            </h3>
            <p className="text-xs text-muted-foreground max-w-xl">
              Crie em 1 clique um Story profissional no formato 1080x1920 (9:16) pronto para postar, com foto da peça, nome, valor e chamada para ação.
            </p>
          </div>

          <Button
            onClick={baixarStoryPng}
            disabled={gerandoStory || !pecaStory}
            className="gradient-primary h-11 shrink-0 rounded-2xl px-6 text-xs font-semibold text-primary-foreground shadow-glow gap-2 cursor-pointer"
          >
            {gerandoStory ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Renderizando Story...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Baixar Story da Peça (PNG HD)
              </>
            )}
          </Button>
        </div>

        {/* Simulador Interativo de Story */}
        <div className="grid gap-6 lg:grid-cols-12 items-center">
          {/* Seletor de Peça para o Story (7 Colunas) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">
                Escolha a peça para estampar no Story:
              </label>
              <span className="text-[11px] text-muted-foreground">
                {produtosAtivos.length} peças disponíveis
              </span>
            </div>

            {produtosAtivos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground text-xs">
                Cadastre peças no seu estoque para gerar Stories automáticos.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {produtosAtivos.map((p) => {
                  const isSel = pecaStory?.id === p.id;
                  const cfg = showcaseConfigs[p.id];
                  const preco = cfg?.precoPromocional ?? Number(p.sale_price ?? 0);
                  const foto = cfg?.vitrineFotos?.[0] || p.photo_url;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPecaStory(p)}
                      className={`flex flex-col text-left rounded-2xl p-2.5 transition-all border ${
                        isSel
                          ? "border-primary bg-primary/5 shadow-2xs ring-2 ring-primary/20"
                          : "border-border/60 bg-secondary/30 hover:bg-secondary/60"
                      }`}
                    >
                      <div className="aspect-square w-full rounded-xl bg-secondary/80 overflow-hidden mb-2 relative">
                        {foto ? (
                          <img src={foto} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-[10px]">
                            {p.name.slice(0, 10)}
                          </div>
                        )}
                        {isSel && (
                          <span className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground p-1 rounded-full shadow-md">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs font-semibold text-foreground">{p.name}</p>
                      <p className="text-[11px] text-emerald-600 font-mono font-medium">
                        {brl(preco)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview Visual do Story estilo iPhone (5 Colunas) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-64 aspect-[9/16] rounded-[36px] bg-zinc-950 p-3 shadow-2xl border-4 border-zinc-800 flex flex-col justify-between overflow-hidden text-white select-none">
              {/* Moldura superior estilo iPhone Dynamic Island */}
              <div className="w-full flex justify-between items-center px-2 pt-1 text-[9px] text-zinc-400">
                <span>09:41</span>
                <div className="h-3.5 w-16 bg-zinc-900 rounded-full" />
                <span>5G</span>
              </div>

              {/* Cabeçalho do Story */}
              <div className="text-center mt-2">
                <p className="text-[8px] font-bold tracking-widest text-zinc-400 uppercase">
                  {storeName}
                </p>
                <p className="text-xs font-bold tracking-tight text-white">NOVA COLEÇÃO</p>
              </div>

              {/* Foto da Peça no Story */}
              <div className="w-full aspect-[4/5] rounded-2xl bg-zinc-900 overflow-hidden border border-white/10 relative my-2">
                {pecaStory?.photo_url || showcaseConfigs[pecaStory?.id || ""]?.vitrineFotos?.[0] ? (
                  <img
                    src={
                      showcaseConfigs[pecaStory?.id || ""]?.vitrineFotos?.[0] ||
                      pecaStory?.photo_url ||
                      ""
                    }
                    alt={pecaStory?.name || "Peça"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-zinc-500 text-xs">
                    Foto da Peça
                  </div>
                )}
              </div>

              {/* Informações da Peça */}
              <div className="text-center px-1">
                <p className="truncate text-xs font-bold text-white">
                  {pecaStory?.name || "Selecione uma peça"}
                </p>
                <p className="text-sm font-bold text-emerald-400 font-mono">
                  {pecaStory ? brl(Number(pecaStory.sale_price || 0)) : "R$ 0,00"}
                </p>
              </div>

              {/* Sticker do Link do Instagram */}
              <div className="mx-auto my-2 px-3 py-1.5 rounded-full bg-white text-zinc-950 text-[9px] font-bold shadow-lg flex items-center gap-1">
                <span>🔗 TOQUE PARA COMPRAR</span>
              </div>

              <div className="text-center text-[8px] text-zinc-500 pb-1">
                {slug}.vestui.com.br
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Preview em proporção real 9:16 (1080x1920)
            </p>
          </div>
        </div>
      </div>

      {/* ── CARD 4: LINKS DIRETOS DE PEÇAS (CATÁLOGO COMPLETO) ─────────── */}
      <div className="rounded-3xl border border-border/70 bg-card shadow-soft overflow-hidden">
        <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Links Diretos de Peças
            </h3>
            <p className="text-xs text-muted-foreground">
              Envie a peça exata para a cliente que perguntou no direct do Instagram ou no WhatsApp.
            </p>
          </div>

          {/* Barra de Busca de Peças */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={buscaPeca}
              onChange={(e) => setBuscaPeca(e.target.value)}
              placeholder="Buscar peça por nome..."
              className="h-9 pl-9 text-xs rounded-xl bg-secondary/40 border-border/80"
            />
          </div>
        </div>

        {pecasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <ShoppingBag className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Nenhuma peça encontrada</p>
            <p className="text-xs max-w-sm">
              {buscaPeca ? "Tente buscar por outro termo." : "Cadastre produtos no Estoque da loja para compartilhar."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50 max-h-[460px] overflow-y-auto">
            {pecasFiltradas.map((p) => {
              const cfg = showcaseConfigs[p.id];
              const preco = cfg?.precoPromocional ?? Number(p.sale_price ?? 0);
              const foto = cfg?.vitrineFotos?.[0] || p.photo_url;
              const linkPeca = `${linkLojaBase}?p=${p.id}`;

              return (
                <li
                  key={p.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-6 py-3.5 transition-colors duration-150 hover:bg-secondary/30"
                >
                  <div className="h-12 w-10 rounded-xl bg-secondary/80 flex items-center justify-center overflow-hidden border border-border/50">
                    {foto ? (
                      <img src={foto} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-muted-foreground text-center px-1">
                        {p.name.slice(0, 8)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{brl(preco)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full text-xs px-3"
                      onClick={() => copiar(linkPeca, `Link de "${p.name}" copiado!`)}
                    >
                      <Copy className="mr-1.5 h-3 w-3" /> Copiar link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full text-xs px-3"
                      onClick={() => {
                        const msg = encodeURIComponent(
                          `Olá! Olha essa peça incrível que você perguntou: *${p.name}* por *${brl(preco)}*!\n\nConfira todos os detalhes e compre direto aqui: ${linkPeca}`,
                        );
                        window.open(
                          `https://api.whatsapp.com/send?text=${msg}`,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                    >
                      <MessageCircle className="mr-1.5 h-3 w-3 text-emerald-600" /> WhatsApp
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full text-xs px-2 text-primary hover:bg-primary/10"
                      onClick={() => {
                        setPecaStory(p);
                        window.scrollTo({ top: 380, behavior: "smooth" });
                        toast.success(`"${p.name}" carregada no Estúdio de Stories!`);
                      }}
                      title="Carregar no Gerador de Stories"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── CARD 5: LINKS COM CUPOM PROMOCIONAL ─────────────────────────── */}
      {cuponsAtivos.length > 0 && (
        <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600">
                Campanhas & Descontos
              </span>
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                Links Promocionais com Cupom Automático
              </h3>
              <p className="text-xs text-muted-foreground">
                Compartilhe estes links: ao abrir a vitrine, o desconto é aplicado instantaneamente no carrinho da cliente!
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {cuponsAtivos.map((c) => {
              const link = `${linkLojaBase}?c=${encodeURIComponent(c.codigo)}`;
              const descricao =
                c.tipo === "percentual"
                  ? `${c.valor}% de desconto`
                  : `R$ ${c.valor.toFixed(2).replace(".", ",")} de desconto`;

              return (
                <div
                  key={c.codigo}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-border/70 bg-secondary/20 p-4 transition-all hover:bg-secondary/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-600">
                      <Ticket className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-foreground">
                          {c.codigo}
                        </span>
                        <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                          {descricao}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {c.valor_minimo
                          ? `Pedido mínimo: ${brl(c.valor_minimo)}`
                          : "Sem valor mínimo"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 rounded-full text-xs"
                      onClick={() => copiar(link, `Link com cupom ${c.codigo} copiado!`)}
                    >
                      <Copy className="mr-1.5 h-3 w-3" /> Copiar link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 rounded-full text-xs"
                      onClick={() => {
                        const msg = encodeURIComponent(
                          `Olá! Preparamos um presente exclusivo para você: use o cupom *${c.codigo}* e ganhe *${descricao}* na nossa loja online!\n\nAcesse aqui com o cupom já aplicado: ${link}`,
                        );
                        window.open(
                          `https://api.whatsapp.com/send?text=${msg}`,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                    >
                      <MessageCircle className="mr-1.5 h-3 w-3 text-emerald-600" /> WhatsApp VIP
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CARD 6: ROTEIROS DE COPYWRITING & MENSAGENS RÁPIDAS ─────────── */}
      <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft space-y-4">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Scripts Prontos de Conversão
          </span>
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            Mensagens Prontas para WhatsApp
          </h3>
          <p className="text-xs text-muted-foreground">
            Copie textos persuasivos prontos para disparar no WhatsApp ou no Direct do Instagram com 1 clique.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              titulo: "Lançamento de Coleção",
              desc: "Para enviar em listas de transmissão e status.",
              texto: `Meninas, novidade fresquinha! 🌸\n\nA nossa nova coleção acabou de aterrissar na vitrine online! Peças limitadas e exclusivas esperando por você.\n\nConfira todos os looks aqui: ${linkLojaBase}\n\nQualquer dúvida é só me chamar aqui! ✨`,
            },
            {
              titulo: "Atendimento Personalizado",
              desc: "Para quando a cliente pergunta sobre novidades.",
              texto: `Oi, querida! Tudo bem? 💕\n\nLembrei de você com essas novidades lindas que acabaram de chegar na boutique!\n\nDá uma olhadinha na nossa vitrine: ${linkLojaBase}\n\nSe gostar de alguma peça, já me avisa por aqui que reservo para você! ✨`,
            },
            {
              titulo: "Convite com Frete ou Mimo",
              desc: "Para reativação de clientes que não compram há algum tempo.",
              texto: `Oi linda! Saudades de você por aqui! 🥰\n\nPassando para avisar que preparamos uma seleção especial na nossa loja online!\n\nAcesse nossa vitrine oficial: ${linkLojaBase}\n\nEstamos à disposição para te atender! 💖`,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-3"
            >
              <div>
                <p className="text-xs font-bold text-foreground">{item.titulo}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                <div className="mt-2.5 rounded-xl bg-background/80 p-2.5 border border-border/40 text-[11px] text-muted-foreground whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
                  {item.texto}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 rounded-full text-xs"
                  onClick={() => copiar(item.texto, "Mensagem copiada para a área de transferência!")}
                >
                  <Copy className="mr-1.5 h-3 w-3" /> Copiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 rounded-full text-xs"
                  onClick={() => {
                    const msg = encodeURIComponent(item.texto);
                    window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank", "noopener,noreferrer");
                  }}
                >
                  <MessageCircle className="mr-1.5 h-3 w-3 text-emerald-600" /> WhatsApp
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MODAL: DISPLAY DE BALCÃO PARA IMPRESSÃO ──────────────────────── */}
      {modalDisplayBalcao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl text-zinc-950 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-100 text-zinc-900">
                  <Printer className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">Display Oficial de Balcão</h4>
                  <p className="text-[11px] text-zinc-500">Pronto para colocar em porta-retrato ou display acrílico A5/A6</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalDisplayBalcao(false)}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Folha de Exibição do Display */}
            <div
              id="display-balcao-print"
              className="rounded-2xl border-2 border-zinc-200 p-8 flex flex-col items-center text-center space-y-4 bg-gradient-to-b from-zinc-50 via-white to-zinc-50"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-[0.25em] text-zinc-400 uppercase">
                  {storeName}
                </span>
                <h2 className="text-2xl font-serif font-bold text-zinc-900 tracking-tight">
                  Conheça Nossa Vitrine Online
                </h2>
                <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
                  Aponte a câmera do seu celular para o QR Code abaixo e leve nossa boutique com você!
                </p>
              </div>

              {/* QR Code Nítido Central */}
              <div className="p-4 rounded-2xl bg-white shadow-lg border border-zinc-200">
                <div
                  className="h-44 w-44 flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </div>

              <div className="space-y-1 pt-2">
                <p className="text-xs font-semibold text-zinc-800">
                  Compre online e receba no conforto da sua casa
                </p>
                <p className="font-mono text-[11px] text-zinc-500">
                  {linkLojaBase.replace(/^https?:\/\//, "")}
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl h-10 text-xs"
                onClick={() => setModalDisplayBalcao(false)}
              >
                Fechar
              </Button>
              <Button
                className="flex-1 rounded-xl h-10 text-xs bg-zinc-950 text-white hover:bg-zinc-800 gap-1.5"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="h-4 w-4" /> Imprimir Display
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
