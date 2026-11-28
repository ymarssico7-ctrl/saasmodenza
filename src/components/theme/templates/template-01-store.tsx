/**
 * Template01Store — Vitrine "Atelier Nove"
 *
 * FONTE DA VERDADE: c:\Users\yande\Downloads\Vestui 2.0\template 01\
 *   ├── src/routes/index.tsx     — JSX exato da página
 *   ├── src/components/ProductCard.tsx — Card de produto
 *   └── src/styles.css          — tokens de cor e fontes
 *
 * ESTRATÉGIA:
 *   - JSX 100% fiel ao original (HTML semântico + Tailwind puro)
 *   - Dados variáveis (nome, cores, textos) injetados pelo ThemeEngine
 *   - Assets locais importados de src/assets/template-01/
 *   - Escopo CSS isolado em .t01-theme (não afeta o painel admin)
 */
import { useEffect, useRef, useState, useMemo } from "react";
import type {
  ThemeConfig,
  Section,
  HeroSection,
  CategoryBarSection,
  ProductGridSection,
  ImageTextSplitSection,
  FeaturesSection,
  AnnouncementSection,
  TestimonialsSection,
  FaqSection,
  PromotionalBannerSection,
  InstagramFeedSection,
  NewsletterSection,
} from "@/lib/theme-engine/schema";
import { FONT_URLS } from "@/lib/theme-engine/defaults";
import { SectionPreviewWrapper } from "@/components/theme/builder/section-preview-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { inventoryQuery } from "@/lib/db";
import { openWhatsAppCheckout } from "@/lib/whatsapp";
import { toast } from "sonner";
import { mergeInventoryWithShowcase, type ShowcaseProduct } from "@/lib/showcase-store";
import { useStore } from "@/lib/store-context";
import { useCart as useGlobalCart } from "@/lib/cart";

// ── Assets locais (idênticos ao template original) ────────────────────────────
import heroImg from "@/assets/template-01/hero.jpg";
import catWomenImg from "@/assets/template-01/cat-women.jpg";
import catMenImg from "@/assets/template-01/cat-men.jpg";
import catAccessoriesImg from "@/assets/template-01/cat-accessories.jpg";
import editorialImg from "@/assets/template-01/editorial.jpg";
import look1Img from "@/assets/template-01/look-1.jpg";
import look2Img from "@/assets/template-01/look-2.jpg";

// ── Tipos de produto (adaptado para o catálogo real) ─────────────────────────
type Product = {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  precoAntigo?: number;
  imagem: string;
  imagemHover: string;
  cores: { nome: string; hex: string }[];
  tamanhos: string[];
  badge?: string;
  avaliacao: number;
  estoque: number;
};

const formatBRL = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });

/** Adapter: maps a ShowcaseProduct (inventory + showcase config merged) to the template's internal Product */
function adaptShowcaseProduct(p: ShowcaseProduct): Product {
  const badge =
    p.totalEstoque === 0
      ? "Esgotado"
      : p.emPromocao
        ? "Promoção"
        : p.showcase.destaque
          ? "Novidade"
          : undefined;
  const sizesObj = (p.sizes ?? {}) as Record<string, number>;
  const tamanhos = Object.entries(sizesObj)
    .filter(([, qty]) => qty > 0)
    .map(([size]) => size);
  return {
    id: p.id,
    nome: p.name,
    categoria: p.category,
    preco: p.precoEfetivo,
    ...(p.emPromocao && p.showcase.precoPromocional ? { precoAntigo: p.sale_price } : {}),
    imagem:
      p.fotoEfetiva ?? `https://placehold.co/400x520/f5f5f5/999?text=${encodeURIComponent(p.name)}`,
    imagemHover:
      p.vitrineFotos[1] ??
      p.fotoEfetiva ??
      `https://placehold.co/400x520/f0f0f0/888?text=${encodeURIComponent(p.name)}`,
    cores: p.color ? [{ nome: p.color, hex: "#888888" }] : [],
    tamanhos: tamanhos.length > 0 ? tamanhos : ["Único"],
    ...(badge !== undefined ? { badge } : {}),
    avaliacao: 5,
    estoque: p.totalEstoque,
  };
}

// ── ProductCard (idêntico ao original ProductCard.tsx) ────────────────────────
function ProductCard({
  product,
  onQuickAdd,
  onClickProduct,
}: {
  product: Product;
  onQuickAdd: (p: Product) => void;
  onClickProduct?: () => void;
}) {
  const [corAtiva, setCorAtiva] = useState(0);
  const [favorito, setFavorito] = useState(false);

  return (
    <article className="group relative cursor-pointer" onClick={() => onClickProduct?.()}>
      <div className="relative overflow-hidden bg-muted">
        <img
          src={product.imagem}
          alt={product.nome}
          width={900}
          height={1200}
          loading="lazy"
          className="h-full w-full object-cover transition-all duration-[900ms] ease-out group-hover:scale-[1.03] group-hover:opacity-0"
        />
        <img
          src={product.imagemHover}
          alt={`${product.nome} — detalhe do tecido`}
          width={900}
          height={1200}
          loading="lazy"
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition-all duration-[900ms] ease-out group-hover:scale-100 group-hover:opacity-100"
        />

        {product.badge ? (
          <span className="absolute left-4 top-4 bg-background/85 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-foreground backdrop-blur-sm">
            {product.badge}
          </span>
        ) : null}

        <button
          type="button"
          aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          aria-pressed={favorito}
          onClick={(e) => {
            e.stopPropagation();
            setFavorito((v) => !v);
          }}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/70 text-foreground opacity-0 backdrop-blur-sm transition-all duration-300 hover:bg-background group-hover:opacity-100 focus-visible:opacity-100"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill={favorito ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <path d="M12 20.5s-7.5-4.7-7.5-9.6A4.4 4.4 0 0 1 12 8.2a4.4 4.4 0 0 1 7.5 2.7c0 4.9-7.5 9.6-7.5 9.6Z" />
          </svg>
        </button>

        {product.estoque > 0 && (
          <div className="absolute inset-x-3 bottom-3 translate-y-4 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(product);
              }}
              className="w-full bg-foreground/95 py-3 text-[11px] uppercase tracking-[0.24em] text-background backdrop-blur-sm transition-colors duration-300 hover:bg-foreground"
            >
              Adição rápida
            </button>
          </div>
        )}
      </div>

      <div className="pt-5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          {product.categoria}
        </p>
        <h3 className="mt-2 font-serif text-lg leading-snug text-foreground">
          <a
            href="#produto"
            onClick={(e) => {
              e.preventDefault();
              onClickProduct?.();
            }}
            className="transition-colors duration-300 hover:text-accent-foreground"
          >
            {product.nome}
          </a>
        </h3>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-sm text-foreground">{formatBRL(product.preco)}</span>
          {product.precoAntigo ? (
            <span className="text-xs text-muted-foreground line-through">
              {formatBRL(product.precoAntigo)}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-2">
          {product.cores.map((cor, i) => (
            <button
              key={cor.nome}
              type="button"
              aria-label={`Cor ${cor.nome}`}
              aria-pressed={corAtiva === i}
              onClick={(e) => {
                e.stopPropagation();
                setCorAtiva(i);
              }}
              className={`h-4 w-4 rounded-full border transition-all duration-300 ${
                corAtiva === i
                  ? "border-foreground ring-1 ring-foreground/30 ring-offset-2 ring-offset-background"
                  : "border-border"
              }`}
              style={{ backgroundColor: cor.hex }}
            />
          ))}
          <span className="ml-1 text-[11px] text-muted-foreground">
            {product.cores[corAtiva]?.nome}
          </span>
        </div>
      </div>
    </article>
  );
}

// ── Tipos de carrinho ─────────────────────────────────────────────────────────
type CartItem = { product: Product; tamanho: string; qtd: number };

// ── Props do componente ───────────────────────────────────────────────────────
interface Template01StoreProps {
  theme?: ThemeConfig;
  highlightId?: string | null;
  interactionMode?: "edit" | "interactive";
  onSectionClick?: (id: string) => void;
  onToggleSection?: (id: string) => void;
  onDeleteSection?: (id: string) => void;
  showcaseProducts?: ShowcaseProduct[];
  storeName?: string;
  storePhone?: string;
  onOpenCart?: () => void;
  onSelectProduct?: (product: ShowcaseProduct) => void;
  cartCount?: number;
  storeCategories?: { label: string; slug: string }[];
}

// ── Componente principal ──────────────────────────────────────────────────────
export function Template01Store({
  theme,
  highlightId,
  interactionMode,
  onSectionClick,
  onToggleSection,
  onDeleteSection,
  showcaseProducts,
  storeName: propsStoreName,
  storePhone: propsStorePhone,
  onOpenCart,
  onSelectProduct,
  cartCount,
  storeCategories,
}: Template01StoreProps = {}) {
  const settings = theme?.settings;
  const globalCart = useGlobalCart();

  // ── Produtos reais do banco (Single Source of Truth) ──────────────────────
  const { data: rawInventory = [] } = useQuery({
    ...inventoryQuery(),
    enabled: showcaseProducts === undefined,
  });
  const allShowcaseProducts = useMemo(() => {
    if (showcaseProducts !== undefined) return showcaseProducts;
    return mergeInventoryWithShowcase(rawInventory as Parameters<typeof mergeInventoryWithShowcase>[0]);
  }, [showcaseProducts, rawInventory]);
  /** Apenas produtos ativos na vitrine */
  const PRODUCTS = useMemo(
    () => allShowcaseProducts.filter((p) => p.showcase.ativo).map(adaptShowcaseProduct),
    [allShowcaseProducts],
  );
  /** Categorias únicas derivadas dos produtos ativos */
  const PRODUCT_CATEGORIES = useMemo(
    () =>
      Array.from(
        new Set(allShowcaseProducts.filter((p) => p.showcase.ativo).map((p) => p.category)),
      ),
    [allShowcaseProducts],
  );

  // ── Navegação dinâmica baseada nas categorias reais da loja ──────────────────
  const navLinks: { label: string; href: string }[] = useMemo(() => {
    if (storeCategories && storeCategories.length > 0) {
      return storeCategories.map((cat) => ({ label: cat.label, href: `#vitrine` }));
    }
    if (PRODUCT_CATEGORIES.length > 0) {
      return PRODUCT_CATEGORIES.map((cat) => ({ label: cat, href: `#vitrine` }));
    }
    return [
      { label: "Loja", href: "#vitrine" },
      { label: "Novidades", href: "#vitrine" },
      { label: "Sobre", href: "#vitrine" },
    ];
  }, [storeCategories, PRODUCT_CATEGORIES]);

  // Injeta as fontes originais (Cormorant Garamond + Jost) uma única vez
  useEffect(() => {
    const urls = [
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap",
    ];
    urls.forEach((url) => {
      if (!document.querySelector(`link[href="${url}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = url;
        document.head.appendChild(link);
      }
    });
  }, []);

  // Injeta fonte customizada do Engine (caso o usuário troque no painel)
  useEffect(() => {
    const url = settings?.fontDisplay ? FONT_URLS[settings.fontDisplay] : undefined;
    if (url && !document.querySelector(`link[href="${url}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }
  }, [settings?.fontDisplay]);

  // Variáveis CSS injetadas pelo Theme Engine (sobrescrevem os padrões do template)
  // Usando a mesma estratégia do @theme inline para compatibilidade total com Tailwind v4
  const themeVars = settings
    ? ({
        "--background": settings.colorBackground,
        "--foreground": settings.colorForeground,
        "--primary": settings.colorPrimary || settings.colorForeground,
        "--primary-foreground": settings.colorBackground,
        "--secondary": settings.colorCanvas,
        "--secondary-foreground": settings.colorForeground,
        "--muted": settings.colorCanvas,
        "--muted-foreground": "oklch(0.54 0.012 70)",
        "--border": settings.colorBorder,
        "--accent": "oklch(0.86 0.035 76)",
        "--accent-foreground": "oklch(0.45 0.06 62)",
        "--card": settings.colorBackground,
        "--card-foreground": settings.colorForeground,
      } as React.CSSProperties)
    : {};

  // ── Estado da UI (idêntico ao original) ─────────────────────────────────────
  const [anuncio, setAnuncio] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [sacolaAberta, setSacolaAberta] = useState(false);
  const [quickAdd, setQuickAdd] = useState<Product | null>(null);
  const [tamanhoSel, setTamanhoSel] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [email, setEmail] = useState("");
  const [inscrito, setInscrito] = useState(false);
  const trilha = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setBuscaAberta(false);
      setSacolaAberta(false);
      setQuickAdd(null);
      setMenuAberto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const totalItens = cart.reduce((s, i) => s + i.qtd, 0);
  const subtotal = cart.reduce((s, i) => s + i.qtd * i.product.preco, 0);

  const abrirQuickAdd = (p: Product) => {
    setQuickAdd(p);
    setTamanhoSel(p.tamanhos[0] ?? null);
  };

  useEffect(() => {
    if (quickAdd) {
      setTamanhoSel(quickAdd.tamanhos[0] ?? null);
    } else {
      setTamanhoSel(null);
    }
  }, [quickAdd]);

  const adicionar = () => {
    if (!quickAdd) return;
    if (!tamanhoSel) {
      toast.error("Selecione um tamanho antes de adicionar à sacola.");
      return;
    }
    const originalShowcase = allShowcaseProducts.find((item) => item.id === quickAdd.id);
    const sizesObj = (originalShowcase?.sizes ?? {}) as Record<string, number>;
    const estoqueTamanho = originalShowcase
      ? tamanhoSel in sizesObj
        ? sizesObj[tamanhoSel]
        : originalShowcase.totalEstoque
      : undefined;

    if (typeof estoqueTamanho === "number" && estoqueTamanho <= 0) {
      toast.error("Esta grade está esgotada no momento.");
      return;
    }

    if (onOpenCart) {
      globalCart.add({
        id: quickAdd.id,
        nome: quickAdd.nome,
        imagem: quickAdd.imagem,
        preco: quickAdd.preco,
        tamanho: tamanhoSel,
        cor: quickAdd.cores[0]?.nome ?? "",
        quantidade: 1,
        ...(typeof estoqueTamanho === "number" ? { maxQuantity: estoqueTamanho } : {}),
      });
      setQuickAdd(null);
      onOpenCart();
      return;
    }

    setCart((atual) => {
      const idx = atual.findIndex((i) => i.product.id === quickAdd.id && i.tamanho === tamanhoSel);
      const existente = idx >= 0 ? atual[idx] : undefined;
      if (existente) {
        const copia = [...atual];
        copia[idx] = { ...existente, qtd: existente.qtd + 1 };
        return copia;
      }
      return [...atual, { product: quickAdd, tamanho: tamanhoSel, qtd: 1 }];
    });
    setQuickAdd(null);
    setSacolaAberta(true);
  };

  const mover = (dir: number) => {
    trilha.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  // Nome da loja: 1) prop externa (vitrine pública), 2) definido pelo usuário no builder, 3) nome real do banco de dados
  const { store: activeStore, isLoading: isStoreLoading } = useStore();
  const storeName =
    propsStoreName ||
    ((settings?.storeName && settings.storeName.trim())
      ? settings.storeName
      : isStoreLoading
        ? ""
        : (activeStore?.name || ""));
  const logoUrl = settings?.logoUrl;
  const freeShippingText =
    settings?.freeShippingBanner || "Frete cortesia acima de R$ 800 · 1ª troca grátis em até 7 dias";

  // ── Helpers de seção ────────────────────────────────────────────────────────
  const isEditing = interactionMode !== "interactive" && typeof onSectionClick === "function";

  function SectionWrap({ section, children }: { section: Section; children: React.ReactNode }) {
    return (
      <SectionPreviewWrapper
        section={section}
        isSelected={highlightId === section.id}
        isEditing={isEditing}
        onSelect={() => onSectionClick?.(section.id)}
        onToggleVisible={() => onToggleSection?.(section.id)}
        onDelete={() => onDeleteSection?.(section.id)}
      >
        {children}
      </SectionPreviewWrapper>
    );
  }

  // ── Handler Central de Cliques em Botões e CTAs ──────────────────────────────
  const handleCtaClick = (
    e: React.MouseEvent,
    action?: string,
    link?: string,
    category?: string,
  ) => {
    const act = action || "vitrine";
    if (act === "vitrine") {
      const el = document.getElementById("produtos");
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else if (act === "categoria" && category) {
      e.preventDefault();
      setActiveCategory(category.toLowerCase().trim());
      const el = document.getElementById("produtos");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (act === "whatsapp") {
      e.preventDefault();
      const phone = (propsStorePhone || settings?.storeWhatsApp || "").replace(/\D/g, "");
      if (phone) {
        const text = encodeURIComponent(
          `Olá! Estive no site da ${storeName} e gostaria de saber mais sobre as peças da nova coleção!`,
        );
        window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
      } else {
        toast.info("WhatsApp da loja não configurado.");
      }
    } else if (act === "link" && link) {
      // Deixa a navegação de link ocorrer normalmente
    }
  };

  // ── Render de seção pelo tipo ────────────────────────────────────────────────
  function renderSection(section: Section): React.ReactNode {
    // No modo de edição (editor de temas), mantemos a seção no DOM para permitir
    // interação visual, highlight e reexibição através do SectionPreviewWrapper.
    if (section.visible === false && !isEditing) return null;

    switch (section.type) {
      case "announcement": {
        const s = section as AnnouncementSection;
        return (
          <SectionWrap key={section.id} section={section}>
            <div className="relative bg-foreground px-4 py-2.5 text-center text-[11px] uppercase tracking-[0.22em] text-background">
              {s.settings.text}
            </div>
          </SectionWrap>
        );
      }
      case "hero": {
        const s = section as HeroSection;
        return (
          <SectionWrap key={section.id} section={section}>
            <section className="relative">
              <img
                src={s.settings.imageUrl || heroImg}
                alt={s.settings.imageAlt || "Hero"}
                width={1920}
                height={1280}
                style={
                  s.settings.imagePosition
                    ? { objectPosition: s.settings.imagePosition }
                    : undefined
                }
                className="h-[78vh] min-h-[520px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/25 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="mx-auto w-full max-w-[1400px] px-6 lg:px-10">
                  <div className="max-w-xl">
                    <p className="text-[11px] uppercase tracking-[0.32em] text-foreground/70">
                      {s.settings.subheading}
                    </p>
                    <h1 className="mt-6 font-serif text-5xl leading-[1.05] text-foreground sm:text-6xl lg:text-7xl">
                      {s.settings.heading ? (
                        s.settings.heading.split("\n").map((line, i, arr) => (
                          <span key={i}>
                            {line}
                            {i < arr.length - 1 && <br />}
                          </span>
                        ))
                      ) : (
                        <>
                          A elegância que
                          <br />
                          não pede licença
                        </>
                      )}
                    </h1>
                    {s.settings.buttonText && (
                      <div className="mt-10 flex flex-wrap gap-4">
                        <a
                          href={
                            s.settings.buttonAction === "link" && s.settings.buttonLink
                              ? s.settings.buttonLink
                              : s.settings.buttonAction === "whatsapp"
                                ? "#"
                                : "#produtos"
                          }
                          target={s.settings.buttonAction === "link" ? "_blank" : undefined}
                          rel={s.settings.buttonAction === "link" ? "noopener noreferrer" : undefined}
                          onClick={(e) =>
                            handleCtaClick(
                              e,
                              s.settings.buttonAction,
                              s.settings.buttonLink,
                              s.settings.buttonCategory,
                            )
                          }
                          className="group inline-flex items-center gap-3 bg-foreground px-9 py-4 text-[11px] uppercase tracking-[0.24em] text-background transition-all duration-500 hover:bg-foreground/85 cursor-pointer"
                        >
                          {s.settings.buttonText}
                          <span className="transition-transform duration-500 group-hover:translate-x-1">
                            →
                          </span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </SectionWrap>
        );
      }
      case "features": {
        const s = section as FeaturesSection;
        return (
          <SectionWrap key={section.id} section={section}>
            <section aria-label="Vantagens" className="border-b border-border">
              <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px px-6 py-10 lg:grid-cols-4 lg:px-10">
                {s.settings.items.map((item) => (
                  <div key={item.title} className="px-2 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </SectionWrap>
        );
      }
      case "category_bar": {
        const s = section as CategoryBarSection;
        if (s.settings.enabled === false && !isEditing) return null;

        const resolvedCategories: Array<{
          id: string;
          label: string;
          cat: string;
          image: string;
          subtitle?: string;
        }> = (() => {
          const fallbacks = [catWomenImg, catMenImg, catAccessoriesImg];
          if (s.settings.mode === "custom" && s.settings.items && s.settings.items.length > 0) {
            return s.settings.items
              .filter((it) => it.visible !== false)
              .map((it, idx) => {
                const productWithCat = PRODUCTS.find(
                  (p) => (p.categoria || "").toLowerCase() === it.categorySlug.toLowerCase(),
                );
                return {
                  id: it.id || `t01-cat-${idx}`,
                  label: it.label,
                  cat: it.categorySlug,
                  image: it.imageUrl || productWithCat?.imagem || fallbacks[idx % fallbacks.length] || catWomenImg,
                  subtitle: "Coleção Exclusiva",
                };
              });
          }

          const distinctCategorySlugs: string[] = [];
          if (storeCategories && storeCategories.length > 0) {
            for (const sc of storeCategories) {
              if (!distinctCategorySlugs.includes(sc.slug.toLowerCase())) {
                distinctCategorySlugs.push(sc.slug.toLowerCase());
              }
            }
          } else if (PRODUCT_CATEGORIES.length > 0) {
            for (const c of PRODUCT_CATEGORIES) {
              if (c && !distinctCategorySlugs.includes(c.toLowerCase())) {
                distinctCategorySlugs.push(c.toLowerCase());
              }
            }
          }

          if (distinctCategorySlugs.length === 0) {
            return [
              { id: "c1", label: "Feminino", cat: "feminino", image: catWomenImg, subtitle: "Silhuetas fluidas" },
              { id: "c2", label: "Masculino", cat: "masculino", image: catMenImg, subtitle: "Alfaiataria suave" },
              { id: "c3", label: "Acessórios", cat: "acessorios", image: catAccessoriesImg, subtitle: "Couro e ouro" },
            ];
          }

          return distinctCategorySlugs.slice(0, 6).map((slug, idx) => {
            const productWithCat = PRODUCTS.find(
              (p) => (p.categoria || "").toLowerCase() === slug,
            );
            const label =
              storeCategories?.find((sc) => sc.slug.toLowerCase() === slug)?.label ||
              slug.charAt(0).toUpperCase() + slug.slice(1);

            return {
              id: `t01-cat-${slug}-${idx}`,
              label,
              cat: slug,
              image: productWithCat?.imagem || fallbacks[idx % fallbacks.length] || catWomenImg,
              subtitle: "Coleção Autoral",
            };
          });
        })();

        const sectionTitle = s.settings.title;

        return (
          <SectionWrap key={section.id} section={section}>
            <section className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10">
              {sectionTitle && (
                <div className="mb-10 text-center">
                  <h2 className="font-serif text-3xl tracking-tight text-foreground lg:text-4xl">
                    {sectionTitle}
                  </h2>
                </div>
              )}
              <div className={`grid gap-6 ${
                resolvedCategories.length <= 2
                  ? "grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto"
                  : resolvedCategories.length === 3
                    ? "grid-cols-1 md:grid-cols-3"
                    : "grid-cols-2 md:grid-cols-4"
              }`}>
                {resolvedCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveCategory(cat.cat);
                      const el = document.getElementById("vitrine") || document.getElementById("produtos");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="group relative block overflow-hidden text-left cursor-pointer"
                  >
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={`Categoria ${cat.label}`}
                        width={900}
                        height={1200}
                        loading="lazy"
                        className="h-[420px] w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = "none";
                          const fallback = target.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    {/* Fallback elegante quando sem imagem */}
                    <div
                      className="h-[420px] w-full items-center justify-center bg-gradient-to-br from-foreground/10 via-foreground/5 to-foreground/15 transition-all duration-500 group-hover:from-foreground/20 group-hover:to-foreground/25"
                      style={{ display: cat.image ? "none" : "flex" }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-foreground/25"
                        aria-hidden="true"
                      >
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                      </svg>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-90" />
                    <div className="absolute bottom-0 left-0 p-6 lg:p-8">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-background/80">
                        {cat.subtitle}
                      </p>
                      <h2 className="mt-2 font-serif text-2xl lg:text-3xl text-background">{cat.label}</h2>
                      <span className="mt-3 block h-px w-0 bg-background transition-all duration-700 group-hover:w-20" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </SectionWrap>
        );
      }
      case "product_grid": {
        const s = section as ProductGridSection;
        const filteredByCategory =
          activeCategory && activeCategory !== "todos"
            ? PRODUCTS.filter(
                (p) => p.categoria.toLowerCase().trim() === activeCategory.toLowerCase().trim(),
              )
            : PRODUCTS;
        const products =
          s.settings.source === "newest"
            ? filteredByCategory.slice(0, s.settings.count)
            : filteredByCategory.slice(0, s.settings.count);
        const colsMap: Record<number, string> = {
          2: "lg:grid-cols-2",
          3: "lg:grid-cols-3",
          4: "lg:grid-cols-4",
        };
        const colsClass = colsMap[Math.min(s.settings.columns ?? 3, 4)] ?? "lg:grid-cols-3";
        return (
          <SectionWrap key={section.id} section={section}>
            <section id="vitrine" className="mx-auto max-w-[1400px] px-6 pb-24 lg:px-10">
              <div className="mb-12 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    {s.settings.kicker || "Acabou de chegar"}
                  </p>
                  <h2 className="mt-3 font-serif text-4xl">
                    {s.settings.title || "Novidades da estação"}
                  </h2>
                </div>
                {s.settings.showViewAll !== false && (
                  <a
                    href="#vitrine"
                    onClick={(e) => {
                      if (activeCategory !== "todos") {
                        e.preventDefault();
                        setActiveCategory("todos");
                      }
                    }}
                    className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-foreground/70 transition-colors hover:text-foreground"
                  >
                    Ver tudo
                    <span className="transition-transform duration-500 group-hover:translate-x-1">
                      →
                    </span>
                  </a>
                )}
              </div>

              {products.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma peça disponível no momento. Fique de olho nas novidades! 👗
                  </p>
                  {activeCategory !== "todos" && (
                    <button
                      type="button"
                      onClick={() => setActiveCategory("todos")}
                      className="mt-4 inline-flex items-center border border-border px-5 py-2 text-[11px] uppercase tracking-[0.2em] transition-colors hover:border-foreground"
                    >
                      Ver todas as peças
                    </button>
                  )}
                </div>
              ) : (
                <div className={`grid grid-cols-2 gap-x-6 gap-y-14 ${colsClass}`}>
                  {products.map((p) => {
                    const originalShowcase = allShowcaseProducts.find((sp) => sp.id === p.id);
                    return (
                      <ProductCard
                        key={p.id}
                        product={p}
                        onQuickAdd={abrirQuickAdd}
                        onClickProduct={() => {
                          if (onSelectProduct && originalShowcase) {
                            onSelectProduct(originalShowcase);
                          } else {
                            abrirQuickAdd(p);
                          }
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </SectionWrap>
        );
      }
      case "image_text_split": {
        const s = section as ImageTextSplitSection;
        const isLeft = s.settings.imagePosition === "left";
        const buttonHref =
          s.settings.buttonAction === "link" && s.settings.buttonLink
            ? s.settings.buttonLink
            : s.settings.buttonAction === "whatsapp"
              ? "#"
              : "#produtos";
        const renderCtaBtn = () => {
          if (!s.settings.buttonText) return null;
          return (
            <a
              href={buttonHref}
              target={s.settings.buttonAction === "link" ? "_blank" : undefined}
              rel={s.settings.buttonAction === "link" ? "noopener noreferrer" : undefined}
              onClick={(e) =>
                handleCtaClick(
                  e,
                  s.settings.buttonAction,
                  s.settings.buttonLink,
                  s.settings.buttonCategory,
                )
              }
              className="mt-10 inline-flex items-center border border-foreground/25 px-9 py-4 text-[11px] uppercase tracking-[0.24em] transition-all duration-500 hover:border-foreground hover:bg-foreground hover:text-background cursor-pointer"
            >
              {s.settings.buttonText}
            </a>
          );
        };
        return (
          <SectionWrap key={section.id} section={section}>
            <section id="editorial" className="border-y border-border bg-secondary">
              <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:px-10">
                {isLeft ? (
                  <>
                    <img
                      src={s.settings.imageUrl || editorialImg}
                      alt={s.settings.imageAlt || ""}
                      width={1400}
                      height={1000}
                      loading="lazy"
                      className="h-[520px] w-full object-cover"
                    />
                    <div className="max-w-lg lg:pl-10">
                      {s.settings.kicker && (
                        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                          {s.settings.kicker}
                        </p>
                      )}
                      <h2 className="mt-4 font-serif text-4xl leading-tight">
                        {s.settings.heading}
                      </h2>
                      <p className="mt-6 text-sm leading-loose text-muted-foreground">
                        {s.settings.body}
                      </p>
                      {renderCtaBtn()}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="max-w-lg lg:pr-10">
                      {s.settings.kicker && (
                        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                          {s.settings.kicker}
                        </p>
                      )}
                      <h2 className="mt-4 font-serif text-4xl leading-tight">
                        {s.settings.heading}
                      </h2>
                      <p className="mt-6 text-sm leading-loose text-muted-foreground">
                        {s.settings.body}
                      </p>
                      {renderCtaBtn()}
                    </div>
                    <img
                      src={s.settings.imageUrl || editorialImg}
                      alt={s.settings.imageAlt || ""}
                      width={1400}
                      height={1000}
                      loading="lazy"
                      className="h-[520px] w-full object-cover"
                    />
                  </>
                )}
              </div>
            </section>
          </SectionWrap>
        );
      }
      case "testimonials": {
        const s = section as TestimonialsSection;
        const items = s.settings.items ?? [];
        return (
          <SectionWrap key={section.id} section={section}>
            <section className="border-y border-border py-20">
              <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
                <div className="mb-12 text-center">
                  {s.settings.kicker && (
                    <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                      {s.settings.kicker}
                    </p>
                  )}
                  <h2 className="mt-3 font-serif text-3xl sm:text-4xl">{s.settings.title}</h2>
                </div>
                <div className="grid gap-12 md:grid-cols-3">
                  {items.map((item, idx) => (
                    <figure key={idx} className="flex flex-col justify-between">
                      <div>
                        <div className="text-xs tracking-[0.3em] text-accent-foreground">
                          {"★".repeat(item.rating || 5)}
                        </div>
                        <blockquote className="mt-5 font-serif text-xl leading-relaxed">
                          &ldquo;{item.comment}&rdquo;
                        </blockquote>
                      </div>
                      <figcaption className="mt-6 border-t border-border/60 pt-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                        {item.name} {item.city ? `· ${item.city}` : ""}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </section>
          </SectionWrap>
        );
      }
      case "faq": {
        const s = section as FaqSection;
        const items = s.settings.items ?? [];
        return (
          <SectionWrap key={section.id} section={section}>
            <section className="mx-auto max-w-3xl px-6 py-20 lg:px-10">
              <div className="mb-10 text-center">
                {s.settings.kicker && (
                  <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    {s.settings.kicker}
                  </p>
                )}
                <h2 className="mt-3 font-serif text-3xl sm:text-4xl">{s.settings.title}</h2>
              </div>
              <div className="space-y-4">
                {items.map((item, i) => (
                  <details
                    key={i}
                    className="group border-b border-border pb-4 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer items-center justify-between font-serif text-lg text-foreground hover:text-foreground/80">
                      <span>{item.question}</span>
                      <span className="ml-4 text-xs transition-transform duration-300 group-open:rotate-180">
                        ↓
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          </SectionWrap>
        );
      }
      case "promotional_banner": {
        const s = section as PromotionalBannerSection;
        const buttonHref =
          s.settings.buttonAction === "link" && s.settings.buttonLink
            ? s.settings.buttonLink
            : s.settings.buttonAction === "whatsapp"
              ? "#"
              : "#produtos";
        return (
          <SectionWrap key={section.id} section={section}>
            <section className="bg-foreground text-background py-16 px-6 text-center">
              <div className="mx-auto max-w-2xl space-y-4">
                {s.settings.badge && (
                  <span className="inline-block border border-background/30 px-3.5 py-1 text-[9px] uppercase tracking-[0.28em] text-background">
                    {s.settings.badge}
                  </span>
                )}
                <h2 className="font-serif text-3xl sm:text-4xl text-background">{s.settings.heading}</h2>
                <p className="text-sm leading-relaxed text-background/70 max-w-md mx-auto">
                  {s.settings.subheading}
                </p>
                {s.settings.buttonText && (
                  <div className="pt-2">
                    <a
                      href={buttonHref}
                      target={s.settings.buttonAction === "link" ? "_blank" : undefined}
                      rel={s.settings.buttonAction === "link" ? "noopener noreferrer" : undefined}
                      onClick={(e) =>
                        handleCtaClick(
                          e,
                          s.settings.buttonAction,
                          s.settings.buttonLink,
                          s.settings.buttonCategory,
                        )
                      }
                      className="inline-flex items-center border border-background px-8 py-3.5 text-[11px] uppercase tracking-[0.24em] text-background transition-all hover:bg-background hover:text-foreground cursor-pointer"
                    >
                      {s.settings.buttonText}
                    </a>
                  </div>
                )}
              </div>
            </section>
          </SectionWrap>
        );
      }
      case "instagram_feed": {
        const s = section as InstagramFeedSection;
        const imgs = s.settings.images ?? [];
        const cleanHandle = (s.settings.handle || "").replace(/^@/, "").trim();
        const instaUrl = cleanHandle ? `https://instagram.com/${cleanHandle}` : "https://instagram.com";
        return (
          <SectionWrap key={section.id} section={section}>
            <section className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10">
              <div className="mb-10 text-center">
                {s.settings.handle && (
                  <a
                    href={instaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {s.settings.handle}
                  </a>
                )}
                <h2 className="mt-3 font-serif text-3xl sm:text-4xl">{s.settings.title}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {imgs.map((img, i) => (
                  <a
                    key={i}
                    href={instaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block aspect-square overflow-hidden bg-muted cursor-pointer"
                  >
                    <img
                      src={img}
                      alt={`Foto da comunidade ${i + 1}`}
                      className="h-full w-full object-cover transition-transform duration-[800ms] group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/40 text-[10px] uppercase tracking-[0.24em] text-background opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      Ver no Instagram
                    </div>
                  </a>
                ))}
              </div>
            </section>
          </SectionWrap>
        );
      }
      case "newsletter": {
        const s = section as NewsletterSection;
        return (
          <SectionWrap key={section.id} section={section}>
            <section className="bg-foreground text-background py-20 px-6 text-center">
              <div className="mx-auto max-w-xl space-y-4">
                {s.settings.couponBadge && (
                  <span className="inline-block border border-background/20 bg-background/10 px-3 py-1 text-[9px] uppercase tracking-[0.24em] text-background">
                    CUPOM: {s.settings.couponBadge}
                  </span>
                )}
                <h2 className="font-serif text-3xl sm:text-4xl text-background">{s.settings.heading}</h2>
                <p className="text-sm leading-relaxed text-background/65">
                  {s.settings.subheading}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-4">
                  <input
                    type="email"
                    placeholder="Seu melhor e-mail"
                    className="h-11 flex-1 border border-background/30 bg-transparent px-4 text-xs text-background placeholder:text-background/40 outline-none focus:border-background"
                  />
                  <button
                    type="button"
                    onClick={() => toast.success(`Cupom ${s.settings.couponBadge} liberado com sucesso!`)}
                    className="h-11 px-6 border border-background bg-background text-foreground text-[11px] uppercase tracking-[0.22em] transition-all hover:bg-transparent hover:text-background"
                  >
                    {s.settings.buttonText}
                  </button>
                </div>
              </div>
            </section>
          </SectionWrap>
        );
      }
      default:
        return null;
    }
  }

  // ── Sections dinâmicas (baseadas em theme.order) ─────────────────────────────
  const dynamicSections = (theme?.order ?? []).map((id) => {
    const section = theme?.sections.find((s) => s.id === id);
    if (!section) return null;
    return renderSection(section);
  });

  return (
    // .t01-theme isola o design system deste template do painel admin
    <div className="t01-theme min-h-screen bg-background text-foreground" style={themeVars}>
      {/* ── BARRA DE ANÚNCIO + HEADER agrupados em wrapper sticky ── */}
      <div className="sticky top-0 z-40">
        {anuncio && settings?.freeShippingBannerEnabled !== false ? (
          <div className="relative bg-foreground px-4 py-2.5 text-center text-[11px] uppercase tracking-[0.22em] text-background">
            {freeShippingText}
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => setAnuncio(false)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-background/70 transition-colors hover:text-background"
            >
              ✕
            </button>
          </div>
        ) : null}

        {/* ── HEADER (idêntico ao original lines 137-228) ── */}
        <header
          className={`border-b transition-all duration-500 ${
            scrolled
              ? "border-border bg-background py-3 shadow-2xs"
              : "border-transparent bg-background py-6"
          }`}
        >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 lg:px-10">
          <nav aria-label="Principal" className="hidden flex-1 items-center gap-8 lg:flex">
            {navLinks.map((item) => (
              <div key={item.label} className="group static">
                <a
                  href={item.href}
                  className="relative py-2 text-[11px] uppercase tracking-[0.24em] text-foreground/80 transition-colors duration-300 hover:text-foreground"
                >
                  {item.label}
                  <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-foreground transition-all duration-500 group-hover:w-full" />
                </a>
              </div>
            ))}
          </nav>

          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMenuAberto(true)}
            className="flex flex-col gap-1.5 lg:hidden"
          >
            <span className="block h-px w-6 bg-foreground" />
            <span className="block h-px w-6 bg-foreground" />
          </button>

          <a href="#" className="font-serif text-xl sm:text-2xl tracking-[0.22em] sm:tracking-[0.3em] uppercase lg:text-center max-w-[240px] sm:max-w-[400px] truncate">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="h-8 max-h-8 w-auto object-contain mx-auto" />
            ) : isStoreLoading ? (
              <Skeleton className="h-6 w-32 rounded mx-auto" />
            ) : (
              storeName || "Sua loja"
            )}
          </a>

          <div className="flex flex-1 items-center justify-end gap-5">
            <button
              type="button"
              aria-label="Buscar"
              onClick={() => setBuscaAberta(true)}
              className="text-[11px] uppercase tracking-[0.2em] text-foreground/75 transition-colors duration-300 hover:text-foreground"
            >
              Buscar
            </button>
            <a
              href="#conta"
              className="hidden text-[11px] uppercase tracking-[0.2em] text-foreground/75 transition-colors duration-300 hover:text-foreground sm:block"
            >
              Conta
            </a>
            <button
              type="button"
              onClick={onOpenCart ?? (() => setSacolaAberta(true))}
              className="text-[11px] uppercase tracking-[0.2em] text-foreground/75 transition-colors duration-300 hover:text-foreground"
            >
              Sacola ({cartCount ?? totalItens})
            </button>
          </div>
        </div>
      </header>
      </div>{/* end sticky wrapper (AnnouncementBar + Header) */}

      <main>
        {/* ── SEÇÕES DINÂMICAS ── */}
        {dynamicSections}
      </main>

      {/* ── FOOTER (idêntico ao original lines 492-544) ── */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <p className="font-serif text-2xl uppercase tracking-[0.3em]">{storeName}</p>
              <p className="mt-5 max-w-xs text-xs leading-loose text-muted-foreground">
                {settings?.storeDescription ?? ""}
              </p>
            </div>
            {[
              {
                titulo: "Loja",
                itens: ["Novidades", "Feminino", "Masculino", "Acessórios", "Últimas peças"],
              },
              {
                titulo: "Ajuda",
                itens: ["Entrega", "Trocas e devoluções", "Guia de tamanhos", "Rastrear pedido"],
              },
              {
                titulo: "Sobre",
                itens: ["O atelier", "Sustentabilidade", "Lojas físicas", "Carreiras"],
              },
              { titulo: "Legal", itens: ["Privacidade", "Termos de uso", "Cookies"] },
            ].map((col) => (
              <div key={col.titulo}>
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  {col.titulo}
                </p>
                <ul className="mt-5 space-y-3">
                  {col.itens.map((item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-sm text-foreground/75 transition-colors duration-300 hover:text-foreground"
                      >
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-border pt-8 sm:flex-row">
            <div className="flex gap-6 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {["Instagram", "Pinterest", "TikTok"].map((rede) => (
                <a
                  key={rede}
                  href="#"
                  className="transition-colors duration-300 hover:text-foreground"
                >
                  {rede}
                </a>
              ))}
            </div>
            <div className="flex gap-2">
              {["Visa", "Master", "Amex", "Pix", "Boleto"].map((m) => (
                <span
                  key={m}
                  className="border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  {m}
                </span>
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              © 2026 {storeName}
            </p>
          </div>
        </div>
      </footer>

      {/* ── MENU MOBILE (idêntico ao original lines 546-573) ── */}
      <div
        className={`fixed inset-0 z-50 bg-background transition-all duration-500 lg:hidden ${
          menuAberto ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-6">
          <span className="font-serif text-xl uppercase tracking-[0.3em]">{storeName}</span>
          <button type="button" aria-label="Fechar menu" onClick={() => setMenuAberto(false)}>
            ✕
          </button>
        </div>
        <nav className="px-6 py-10">
          <ul className="space-y-6">
            {navLinks.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={() => setMenuAberto(false)}
                  className="font-serif text-3xl transition-opacity duration-300 hover:opacity-60"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* ── BUSCA (idêntico ao original lines 575-610) ── */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-400 ${
          buscaAberta ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div
          className="absolute inset-0 bg-foreground/25 backdrop-blur-sm"
          onClick={() => setBuscaAberta(false)}
        />
        <div
          className={`relative bg-background px-6 py-14 transition-transform duration-500 ${
            buscaAberta ? "translate-y-0" : "-translate-y-6"
          }`}
        >
          <div className="mx-auto max-w-2xl">
            <label
              htmlFor="t01-busca"
              className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground"
            >
              O que você procura?
            </label>
            <input
              id="t01-busca"
              type="search"
              placeholder="Casaco de lã, camisa de seda..."
              className="mt-4 w-full border-b border-border bg-transparent py-4 font-serif text-2xl transition-colors duration-300 placeholder:text-muted-foreground/60 focus:border-foreground focus:outline-none"
            />
            <div className="mt-8 flex flex-wrap gap-3">
              {PRODUCT_CATEGORIES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="border border-border px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-all duration-300 hover:border-foreground hover:text-foreground"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SACOLA (idêntico ao original lines 612-685) ── */}
      <div className={`fixed inset-0 z-50 ${sacolaAberta ? "visible" : "invisible"}`}>
        <div
          className={`absolute inset-0 bg-foreground/30 transition-opacity duration-500 ${
            sacolaAberta ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setSacolaAberta(false)}
        />
        <aside
          aria-label="Sacola de compras"
          className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-[-20px_0_60px_-40px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-out ${
            sacolaAberta ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-6">
            <p className="text-[11px] uppercase tracking-[0.24em]">Sua sacola ({totalItens})</p>
            <button type="button" aria-label="Fechar sacola" onClick={() => setSacolaAberta(false)}>
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {cart.length === 0 ? (
              <p className="mt-16 text-center text-sm text-muted-foreground">
                Sua sacola está vazia.
              </p>
            ) : (
              <ul className="space-y-6">
                {cart.map((item) => (
                  <li key={`${item.product.id}-${item.tamanho}`} className="flex gap-4">
                    <img
                      src={item.product.imagem}
                      alt={item.product.nome}
                      width={900}
                      height={1200}
                      loading="lazy"
                      className="h-28 w-20 object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-serif text-base">{item.product.nome}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Tam. {item.tamanho} · {item.qtd} un.
                      </p>
                      <p className="mt-2 text-sm">{formatBRL(item.product.preco * item.qtd)}</p>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((c) =>
                            c.filter(
                              (x) =>
                                !(x.product.id === item.product.id && x.tamanho === item.tamanho),
                            ),
                          )
                        }
                        className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border px-6 py-6">
            <div className="flex items-center justify-between text-sm">
              <span className="uppercase tracking-[0.2em] text-muted-foreground">Subtotal</span>
              <span>{formatBRL(subtotal)}</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Frete e impostos calculados no checkout.
            </p>
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => {
                const whatsapp = settings?.storeWhatsApp ?? "";
                if (whatsapp) {
                  openWhatsAppCheckout(
                    whatsapp,
                    settings?.storeName ?? "",
                    cart.map((i) => ({
                      id: i.product.id,
                      nome: i.product.nome,
                      imagem: i.product.imagem,
                      preco: i.product.preco,
                      tamanho: i.tamanho,
                      cor: i.product.cores[0]?.nome ?? "",
                      quantidade: i.qtd,
                    })),
                    subtotal,
                  );
                } else {
                  openWhatsAppCheckout(
                    "",
                    settings?.storeName ?? "",
                    cart.map((i) => ({
                      id: i.product.id,
                      nome: i.product.nome,
                      imagem: i.product.imagem,
                      preco: i.product.preco,
                      tamanho: i.tamanho,
                      cor: i.product.cores[0]?.nome ?? "",
                      quantidade: i.qtd,
                    })),
                    subtotal,
                  );
                  toast.info("WhatsApp da loja não configurado", {
                    description: "Selecione o contato da loja no WhatsApp para enviar o resumo do pedido.",
                  });
                }
              }}
              className="mt-6 w-full bg-foreground py-4 text-[11px] uppercase tracking-[0.24em] text-background transition-opacity duration-300 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Finalizar compra via WhatsApp
            </button>
          </div>
        </aside>
      </div>

      {/* ── ADIÇÃO RÁPIDA (idêntico ao original lines 687-753) ── */}
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center ${
          quickAdd ? "visible" : "invisible"
        }`}
      >
        <div
          className={`absolute inset-0 bg-foreground/35 transition-opacity duration-400 ${
            quickAdd ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setQuickAdd(null)}
        />
        <div
          className={`relative w-full max-w-lg bg-background p-8 transition-all duration-400 ${
            quickAdd ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {quickAdd ? (
            <>
              <div className="flex gap-6">
                <img
                  src={quickAdd.imagem}
                  alt={quickAdd.nome}
                  width={900}
                  height={1200}
                  loading="lazy"
                  className="h-40 w-28 object-cover"
                />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    {quickAdd.categoria}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl">{quickAdd.nome}</h3>
                  <p className="mt-2 text-sm">{formatBRL(quickAdd.preco)}</p>
                </div>
              </div>

              <p className="mt-8 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                Tamanho
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickAdd.tamanhos.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTamanhoSel(t)}
                    className={`min-w-14 border px-4 py-2.5 text-[11px] uppercase tracking-[0.18em] transition-all duration-300 ${
                      tamanhoSel === t
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-foreground hover:border-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={adicionar}
                  className="flex-1 bg-foreground py-4 text-[11px] uppercase tracking-[0.24em] text-background transition-opacity duration-300 hover:opacity-85"
                >
                  Adicionar à sacola
                </button>
                <button
                  type="button"
                  onClick={() => setQuickAdd(null)}
                  className="border border-border px-6 text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 hover:border-foreground"
                >
                  Fechar
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
