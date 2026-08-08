/**
 * AtelierModStore — vitrine 100% fiel ao template original do Lovable.
 *
 * ESTRATÉGIA DE FIDELIDADE:
 * ─ JSX/Tailwind EXATO copiado dos arquivos originais do template:
 *     · atelier-mod-template/src/routes/index.tsx
 *     · atelier-mod-template/src/components/store/site-header.tsx
 *     · atelier-mod-template/src/components/store/product-card.tsx
 *     · atelier-mod-template/src/components/store/site-footer.tsx
 * ─ Textos/cores alimentados pelo ThemeEngine (personalizável no painel)
 * ─ CSS completamente isolado em .atelier-theme (não vaza para o SaaS)
 * ─ Fontes Outfit + Figtree carregadas via loja.preview.tsx ou injeção direta
 */

import { useEffect, useState } from "react";
import { ArrowRight, Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import type {
  ThemeConfig,
  HeroSection,
  ProductGridSection,
  ImageTextSplitSection,
  FeaturesSection,
} from "@/lib/theme-engine/schema";
import { loadTheme } from "@/lib/theme-engine/defaults";

// ── Assets (13 arquivos exatos do template original) ─────────────────────────
import heroImg         from "@/assets/store/hero.jpg";
import lookbook1       from "@/assets/store/lookbook-1.jpg";
import lookbook2       from "@/assets/store/lookbook-2.jpg";
import imgVestido      from "@/assets/store/p-vestido-linho.jpg";
import imgBlazer       from "@/assets/store/p-blazer-preto.jpg";
import imgCamisa       from "@/assets/store/p-camisa-seda.jpg";
import imgTrico        from "@/assets/store/p-trico-ecru.jpg";
import imgCalca        from "@/assets/store/p-calca-alfaiataria.jpg";
import imgTrench       from "@/assets/store/p-trench.jpg";
import imgBolsa        from "@/assets/store/p-bolsa-couro.jpg";
import imgBotas        from "@/assets/store/p-botas.jpg";
import imgSaia         from "@/assets/store/p-saia-midi.jpg";
import imgCamiseta     from "@/assets/store/p-camiseta.jpg";

// ── Categorias — exatas do template original ──────────────────────────────────
const CATEGORIES = [
  { slug: "vestidos",    label: "Vestidos" },
  { slug: "alfaiataria", label: "Alfaiataria" },
  { slug: "camisas",     label: "Camisas" },
  { slug: "trico",       label: "Tricô" },
  { slug: "saias",       label: "Saias" },
  { slug: "casacos",     label: "Casacos" },
  { slug: "acessorios",  label: "Acessórios" },
  { slug: "calcados",    label: "Calçados" },
] as const;

type Cat = (typeof CATEGORIES)[number]["slug"];

function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

function brl(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

// ── Produto — mesma estrutura do products.ts original ────────────────────────
type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAt?: number;
  category: Cat;
  badge?: string;
  images: [string, string];
};

// 13 produtos — exatos do template original (seeds array em products.ts)
const PRODUCTS: Product[] = [
  {
    id: "p01", name: "Vestido Linho Lavado",      slug: "vestido-linho-lavado",
    price: 1290, category: "vestidos", badge: "Novo",
    images: [imgVestido, lookbook1],
  },
  {
    id: "p02", name: "Vestido Slip Cetim",         slug: "vestido-slip-cetim",
    price: 1490, category: "vestidos",
    images: [imgSaia, lookbook2],
  },
  {
    id: "p03", name: "Vestido Camisa Algodão",     slug: "vestido-camisa-algodao",
    price: 1090, compareAt: 1390, category: "vestidos", badge: "Últimas peças",
    images: [imgCamisa, imgVestido],
  },
  {
    id: "p04", name: "Blazer Oversized Lã",        slug: "blazer-oversized-la",
    price: 1890, category: "alfaiataria", badge: "Ícone",
    images: [imgBlazer, lookbook1],
  },
  {
    id: "p05", name: "Calça Wide Alfaiataria",     slug: "calca-wide-alfaiataria",
    price: 1190, category: "alfaiataria",
    images: [imgCalca, lookbook1],
  },
  {
    id: "p06", name: "Colete Alfaiataria",         slug: "colete-alfaiataria",
    price: 890, category: "alfaiataria",
    images: [lookbook1, imgBlazer],
  },
  {
    id: "p07", name: "Camisa Seda Clássica",       slug: "camisa-seda-classica",
    price: 990, category: "camisas",
    images: [imgCamisa, lookbook2],
  },
  {
    id: "p08", name: "Camisa Popeline Oversized",  slug: "camisa-popeline",
    price: 690, category: "camisas",
    images: [imgCamisa, imgVestido],
  },
  {
    id: "p09", name: "Camiseta Algodão Pesado",    slug: "camiseta-algodao",
    price: 320, category: "camisas", badge: "Essencial",
    images: [imgCamiseta, lookbook2],
  },
  {
    id: "p10", name: "Tricô Cashmere Canelado",    slug: "trico-cashmere",
    price: 1690, category: "trico", badge: "Novo",
    images: [imgTrico, lookbook2],
  },
  {
    id: "p11", name: "Suéter Gola Alta",           slug: "sueter-gola-alta",
    price: 1090, category: "trico",
    images: [imgTrico, lookbook1],
  },
  {
    id: "p12", name: "Saia Midi Enviesada",        slug: "saia-midi-enviesada",
    price: 890, category: "saias",
    images: [imgSaia, lookbook2],
  },
  {
    id: "p13", name: "Trench Coat Gabardine",      slug: "trench-coat",
    price: 2290, category: "casacos", badge: "Novo",
    images: [imgTrench, lookbook1],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// AtelierModStore — componente raiz
// Aceita `theme` como prop (builder em tempo real) ou carrega do localStorage.
// ══════════════════════════════════════════════════════════════════════════════
interface Props {
  theme?: ThemeConfig;
  /** Passa highlightId para modo builder (contorno azul na seção selecionada) */
  highlightId?: string | null;
  onSectionClick?: (id: string) => void;
}

export function AtelierModStore({ theme: themeProp, highlightId, onSectionClick }: Props = {}) {
  const [theme, setTheme] = useState<ThemeConfig>(() => themeProp ?? loadTheme());

  // Sincroniza quando o builder passa novo tema em tempo real
  useEffect(() => {
    if (themeProp) setTheme(themeProp);
  }, [themeProp]);

  const { settings, sections } = theme;

  // Helpers para encontrar seções pelo tipo/id
  const hero     = sections.find((s) => s.type === "hero") as HeroSection | undefined;
  const gridNew  = sections.find((s) => s.id === "grid-new") as ProductGridSection | undefined;
  const split1   = sections.find((s) => s.id === "split-1") as ImageTextSplitSection | undefined;
  const split2   = sections.find((s) => s.id === "split-2") as ImageTextSplitSection | undefined;
  const gridEss  = sections.find((s) => s.id === "grid-ess") as ProductGridSection | undefined;
  const features = sections.find((s) => s.type === "features") as FeaturesSection | undefined;

  const novidades  = PRODUCTS.slice(0, gridNew?.settings.count ?? 6);
  const essenciais = PRODUCTS.slice(6, 6 + (gridEss?.settings.count ?? 8));

  // Injeta as variáveis CSS do Engine sobre o escopo .atelier-theme.
  // CRÍTICO: Usar os mesmos nomes de variável que o styles.css original define
  // para que as classes Tailwind com opacidade (ex: from-foreground/45) funcionem.
  const themeVars = {
    "--background":      settings.colorBackground,
    "--foreground":      settings.colorForeground,
    "--canvas":          settings.colorCanvas,
    "--border":          settings.colorBorder,
    "--primary":         settings.colorPrimary || settings.colorForeground,
    "--primary-foreground": settings.colorBackground,
    "--muted":           settings.colorCanvas,
    "--muted-foreground": "oklch(0.475 0.008 70)",
    "--card":            settings.colorBackground,
    "--card-foreground": settings.colorForeground,
    "--ink":             settings.colorForeground,
  } as React.CSSProperties;

  // Injetar fontes Outfit + Figtree uma única vez
  useEffect(() => {
    const href =
      "https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500&family=Figtree:wght@300;400;500;600&display=swap";
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div className="atelier-theme min-h-screen" style={themeVars}>
      {/* ── SiteHeader — exato do site-header.tsx original ───────────────── */}
      <StoreHeader
        storeName={settings.storeName}
        banner={settings.freeShippingBannerEnabled ? settings.freeShippingBanner : null}
      />

      <main>
        {/* ══ HERO — exato do index.tsx original (lines 34-63) ══ */}
        {hero?.visible !== false && (
          <SectionWrapper id={hero?.id} highlightId={highlightId} onSectionClick={onSectionClick}>
            <section className="relative">
              <img
                src={hero?.settings.imageUrl || heroImg}
                alt={hero?.settings.imageAlt || "Modelo vestindo vestido de linho off-white com casaco de lã preto sobre o ombro"}
                width={1600}
                height={1200}
                className="h-[78svh] w-full object-cover object-[62%_center] md:h-[86svh] md:object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/45 via-foreground/5 to-transparent md:bg-gradient-to-r md:from-foreground/35 md:via-transparent md:to-transparent" />
              <div className="absolute inset-x-0 bottom-0">
                <div className="shell pb-8 md:pb-16">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-background/80">
                    {hero?.settings.subheading || "Coleção Outono 26"}
                  </p>
                  <h1 className="display-xl mt-3 max-w-3xl text-background">
                    {hero?.settings.heading || "O essencial,\nrefeito à mão"}
                  </h1>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <a
                      href="#produtos"
                      className="h-13 bg-background px-8 text-center text-sm uppercase tracking-[0.14em] leading-[3.25rem] text-foreground transition-opacity hover:opacity-90"
                    >
                      {hero?.settings.buttonText || "Ver a coleção"}
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </SectionWrapper>
        )}

        {/* ══ CATEGORIAS — barra de pills, exata do index.tsx original (lines 65-82) ══ */}
        <section className="border-b border-border py-6">
          <div className="shell">
            <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              {CATEGORIES.map((c) => (
                <li key={c.slug} className="shrink-0">
                  <a
                    href="#"
                    className="flex h-10 items-center border border-border px-4 text-[13px] uppercase tracking-[0.1em] transition-colors hover:border-foreground"
                  >
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ══ NOVIDADES — grid de produtos, exato do index.tsx original (lines 84-104) ══ */}
        {gridNew?.visible !== false && (
          <SectionWrapper id={gridNew?.id} highlightId={highlightId} onSectionClick={onSectionClick}>
            <section id="produtos" className="shell py-14 md:py-20">
              <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
                <div className="min-w-0">
                  <p className="kicker">{gridNew?.settings.kicker || "Chegou agora"}</p>
                  <h2 className="display-lg mt-2">{gridNew?.settings.title || "Novidades"}</h2>
                </div>
                {(gridNew?.settings.showViewAll ?? true) && (
                  <a
                    href="#"
                    className="link-underline shrink-0 pb-1 text-[13px] uppercase tracking-[0.12em]"
                  >
                    Ver tudo
                  </a>
                )}
              </header>
              <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 lg:grid-cols-6">
                {novidades.map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i < 2} />
                ))}
              </div>
            </section>
          </SectionWrapper>
        )}

        {/* ══ LOOKBOOK SPLIT (split-1) — index.tsx lines 106-136 ══ */}
        {split1?.visible !== false && (
          <SectionWrapper id={split1?.id} highlightId={highlightId} onSectionClick={onSectionClick}>
            <section className="bg-canvas">
              <div className="grid md:grid-cols-2">
                {/* Imagem à esquerda — fallback para lookbook-1.jpg local */}
                <img
                  src={split1?.settings.imageUrl || lookbook1}
                  alt={split1?.settings.imageAlt || "Duas modelos em alfaiataria preta e creme sentadas em banco de gesso"}
                  width={1200}
                  height={1504}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover md:aspect-auto md:h-full"
                />
                <div className="flex flex-col justify-center px-5 py-12 md:px-14 md:py-24">
                  <p className="kicker">{split1?.settings.kicker || "Lookbook 01"}</p>
                  <h2 className="display-lg mt-3 max-w-md">
                    {split1?.settings.heading || "Alfaiataria que respira"}
                  </h2>
                  <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">
                    {split1?.settings.body ||
                      "Lã fria de gramatura média, ombro estruturado sem enchimento e pregas que caem retas. Uma silhueta desenhada para durar mais de uma estação."}
                  </p>
                  <a
                    href="#"
                    className="mt-8 inline-flex h-12 w-fit items-center gap-2 border border-foreground px-7 text-sm uppercase tracking-[0.14em] transition-colors hover:bg-foreground hover:text-background"
                  >
                    {split1?.settings.buttonText || "Ver alfaiataria"}
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                  </a>
                </div>
              </div>
            </section>
          </SectionWrapper>
        )}

        {/* ══ ESSENCIAIS — segundo grid, exato do index.tsx original (lines 138-158) ══ */}
        {gridEss?.visible !== false && (
          <SectionWrapper id={gridEss?.id} highlightId={highlightId} onSectionClick={onSectionClick}>
            <section className="shell py-14 md:py-20">
              <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
                <div className="min-w-0">
                  <p className="kicker">{gridEss?.settings.kicker || "Seleção"}</p>
                  <h2 className="display-lg mt-2">{gridEss?.settings.title || "Essenciais da casa"}</h2>
                </div>
                {(gridEss?.settings.showViewAll ?? true) && (
                  <a
                    href="#"
                    className="link-underline shrink-0 pb-1 text-[13px] uppercase tracking-[0.12em]"
                  >
                    Ver tudo
                  </a>
                )}
              </header>
              <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">
                {essenciais.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          </SectionWrapper>
        )}

        {/* ══ MATÉRIA-PRIMA (split-2) — index.tsx lines 160-194 ══ */}
        {(split2?.visible !== false) && (
          <SectionWrapper id={split2?.id} highlightId={highlightId} onSectionClick={onSectionClick}>
            <section className="grid md:grid-cols-[1fr_1.2fr]">
              <div className="order-2 flex flex-col justify-center px-5 py-12 md:order-1 md:px-14 md:py-24">
                <p className="kicker">{split2?.settings.kicker || "Matéria-prima"}</p>
                <h2 className="display-lg mt-3 max-w-md">{split2?.settings.heading || "Poucos tecidos, bem escolhidos"}</h2>
                <dl className="mt-8 max-w-md space-y-5 text-sm">
                  {[
                    { t: "Cashmere de fio duplo",   d: "Fiado na Itália, canelado largo que mantém a forma." },
                    { t: "Linho lavado",            d: "Amaciado antes do corte, amassa com elegância." },
                    { t: "Couro curtido a vegetal", d: "Sem cromo, ganha pátina própria com o uso." },
                  ].map((item) => (
                    <div key={item.t} className="border-t border-border pt-4">
                      <dt className="uppercase tracking-[0.1em]">{item.t}</dt>
                      <dd className="mt-1 text-muted-foreground">{item.d}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              {/* Imagem à direita — fallback para lookbook-2.jpg local */}
              <img
                src={split2?.settings.imageUrl || lookbook2}
                alt={split2?.settings.imageAlt || "Detalhe de tricô de cashmere creme e cetim cinza sobre superfície de gesso"}
                width={1200}
                height={912}
                loading="lazy"
                className="order-1 aspect-[4/3] w-full object-cover md:order-2 md:aspect-auto md:h-full"
              />
            </section>
          </SectionWrapper>
        )}

        {/* ══ SERVIÇOS — exato do index.tsx original (lines 196-213) ══ */}
        {features?.visible !== false && (
          <SectionWrapper id={features?.id} highlightId={highlightId} onSectionClick={onSectionClick}>
            <section className="shell py-14 md:py-20">
              <ul className="grid gap-8 border-t border-border pt-10 sm:grid-cols-3">
                {(features?.settings.items ?? [
                  { title: "Frete grátis",     description: "Em pedidos acima de R$ 599 para todo o Brasil." },
                  { title: "Troca em 30 dias", description: "Primeira troca sem custo, com etiqueta pronta." },
                  { title: "Ajuste sob medida",description: "Barra e cintura ajustadas no ateliê, sem taxa." },
                ]).map((s) => (
                  <li key={s.title}>
                    <h3 className="text-sm uppercase tracking-[0.12em]">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                  </li>
                ))}
              </ul>
            </section>
          </SectionWrapper>
        )}
      </main>

      {/* ── SiteFooter — exato do site-footer.tsx original ──────────────── */}
      <StoreFooter storeName={settings.storeName} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SectionWrapper — envolve seções com contorno azul no modo builder
// ══════════════════════════════════════════════════════════════════════════════
function SectionWrapper({
  id,
  highlightId,
  onSectionClick,
  children,
}: {
  id?: string;
  highlightId?: string | null;
  onSectionClick?: (id: string) => void;
  children: React.ReactNode;
}) {
  const isHighlighted = id != null && highlightId === id;
  if (!id || !onSectionClick) return <>{children}</>;
  return (
    <div
      onClick={() => onSectionClick(id)}
      className={`relative cursor-pointer transition-all duration-200 ${
        isHighlighted ? "outline outline-2 outline-offset-[-2px] outline-blue-500 z-10" : ""
      }`}
    >
      {isHighlighted && (
        <div className="absolute inset-x-0 top-0 z-20 bg-blue-500 py-0.5 text-center text-[10px] font-semibold uppercase tracking-widest text-white">
          Seção Selecionada
        </div>
      )}
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// StoreHeader — exato do site-header.tsx original
// ══════════════════════════════════════════════════════════════════════════════
function StoreHeader({ storeName, banner }: { storeName: string; banner: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* Announcement bar — exata do site-header.tsx original (line 32-34) */}
      {banner && (
        <div className="bg-foreground px-4 py-2 text-center text-[11px] uppercase tracking-[0.16em] text-background">
          {banner}
        </div>
      )}

      {/* Header sticky — exato do site-header.tsx original (lines 36-108) */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="shell grid h-14 grid-cols-[auto_1fr_auto] items-center gap-2 md:h-16">
          {/* Esquerda: hamburger + nav desktop */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              className="-ml-2 grid h-11 w-11 place-items-center lg:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={1.4} />
            </button>
            <nav className="hidden items-center gap-6 lg:flex" aria-label="Categorias">
              {CATEGORIES.slice(0, 5).map((c) => (
                <a
                  key={c.slug}
                  href="#"
                  className="link-underline text-[13px] uppercase tracking-[0.1em]"
                >
                  {c.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Centro: logo com storeName do Engine */}
          <div className="min-w-0 text-center">
            <a href="#" className="font-display text-[1.0625rem] tracking-[-0.03em] md:text-xl">
              {storeName || "ATELIER MOD"}
            </a>
          </div>

          {/* Direita: ícones */}
          <div className="flex items-center justify-end">
            <a href="#" aria-label="Buscar produtos" className="grid h-11 w-11 place-items-center">
              <Search className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </a>
            <a href="#" aria-label="Favoritos" className="relative hidden h-11 w-11 place-items-center sm:grid">
              <Heart className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </a>
            <a href="#" aria-label="Minha conta" className="hidden h-11 w-11 place-items-center sm:grid">
              <User className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </a>
            <button
              type="button"
              aria-label="Sacola"
              className="relative -mr-2 grid h-11 w-11 place-items-center"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </button>
          </div>
        </div>
      </header>

      {/* Menu mobile full-screen — exato do site-header.tsx original (lines 110-173) */}
      <div
        className={`fixed inset-0 z-50 flex flex-col bg-background transition-transform duration-300 lg:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="kicker">Menu</span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
            className="-mr-2 grid h-11 w-11 place-items-center"
          >
            <X className="h-5 w-5" strokeWidth={1.4} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-5 py-6" aria-label="Navegação principal">
          <ul className="space-y-1">
            <li>
              <a href="#" className="flex h-12 items-center font-display text-[1.75rem] tracking-[-0.04em]">
                Todos os produtos
              </a>
            </li>
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <a
                  href="#"
                  className="flex h-12 items-center font-display text-[1.75rem] tracking-[-0.04em] text-muted-foreground"
                >
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
          <ul className="mt-8 space-y-1 border-t border-border pt-6 text-sm">
            {["Lookbook", "Atendimento", "Trocas", "Minha conta"].map((l) => (
              <li key={l}>
                <a href="#" className="flex h-11 items-center">{l}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ProductCard — exato do product-card.tsx original
// ══════════════════════════════════════════════════════════════════════════════
function ProductCard({ product, priority = false, className }: {
  product: Product;
  priority?: boolean;
  className?: string;
}) {
  const [wished, setWished] = useState(false);
  const front = product.images[0];
  const back  = product.images[1] ?? front;

  return (
    // "group" é a classe que ativa group-hover nos filhos — exato do original
    <article className={`group relative${className ? ` ${className}` : ""}`}>
      <a href="#" className="block" aria-label={product.name}>
        {/* Container com overflow-hidden para clip do scale na imagem traseira */}
        <div className="relative overflow-hidden bg-canvas">
          {/* Imagem frontal — some no hover (group-hover:opacity-0) */}
          <img
            src={front}
            alt={product.name}
            width={900}
            height={1200}
            loading={priority ? "eager" : "lazy"}
            className="aspect-[3/4] w-full object-cover transition-opacity duration-500 group-hover:opacity-0"
          />
          {/* Imagem traseira — aparece no hover (group-hover:opacity-100, scale-100) */}
          <img
            src={back}
            alt=""
            aria-hidden="true"
            width={900}
            height={1200}
            loading="lazy"
            className="absolute inset-0 aspect-[3/4] w-full scale-[1.02] object-cover opacity-0 transition-all duration-700 group-hover:scale-100 group-hover:opacity-100"
          />
          {/* Badge — exato do product-card.tsx original */}
          {product.badge ? (
            <span className="absolute left-3 top-3 bg-background/90 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-foreground backdrop-blur">
              {product.badge}
            </span>
          ) : null}
        </div>

        {/* Informações — exatas do product-card.tsx original (lines 55-72) */}
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[0.9375rem] font-normal leading-snug">{product.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{categoryLabel(product.category)}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[0.9375rem] tabular-nums">{brl(product.price)}</p>
            {product.compareAt ? (
              <p className="text-xs text-muted-foreground line-through tabular-nums">
                {brl(product.compareAt)}
              </p>
            ) : null}
          </div>
        </div>
      </a>

      {/* Botão favorito — exato do product-card.tsx original (lines 75-86) */}
      <button
        type="button"
        onClick={() => setWished((w) => !w)}
        aria-label={wished ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        aria-pressed={wished}
        className="absolute right-2 top-2 grid h-11 w-11 place-items-center text-foreground transition-opacity"
      >
        <Heart
          className={`h-[18px] w-[18px]${wished ? " fill-foreground" : ""}`}
          strokeWidth={1.3}
        />
      </button>
    </article>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// StoreFooter — exato do site-footer.tsx original
// ══════════════════════════════════════════════════════════════════════════════
const HELP = [
  { label: "Sobre" },
  { label: "Contato" },
  { label: "Perguntas frequentes" },
  { label: "Trocas e devoluções" },
];

function StoreFooter({ storeName }: { storeName: string }) {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="shell py-14 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Marca + newsletter — exatos do site-footer.tsx original */}
          <div className="max-w-sm">
            <a href="#" className="font-display text-xl tracking-[-0.04em]">
              {storeName || "ATELIER MOD"}
            </a>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Peças de guarda-roupa desenhadas em São Paulo e produzidas em pequenos
              lotes por ateliês parceiros.
            </p>
            <form className="mt-8" onSubmit={(e) => e.preventDefault()} aria-label="Assinar novidades">
              <label htmlFor="at-footer-email" className="kicker">
                Novidades
              </label>
              <div className="mt-3 flex border-b border-foreground">
                <input
                  id="at-footer-email"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button type="submit" className="shrink-0 px-2 text-xs uppercase tracking-[0.16em]">
                  Assinar
                </button>
              </div>
            </form>
          </div>

          {/* Loja — exato do site-footer.tsx original */}
          <nav aria-label="Categorias">
            <h2 className="kicker">Loja</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <a
                    href="#"
                    className="link-underline text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Atendimento — exato do site-footer.tsx original */}
          <nav aria-label="Atendimento">
            <h2 className="kicker">Atendimento</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {HELP.map((h) => (
                <li key={h.label}>
                  <a
                    href="#"
                    className="link-underline text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {h.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Copyright — exato do site-footer.tsx original */}
        <div className="mt-14 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {storeName || "Atelier Mod"}. Template de demonstração.</p>
          <p>Frete grátis acima de R$ 599 · Troca em até 30 dias</p>
        </div>
      </div>
    </footer>
  );
}
