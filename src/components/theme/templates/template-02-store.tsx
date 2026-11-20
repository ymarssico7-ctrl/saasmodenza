/**
 * Template02Store — "Atelie Minimalist"
 *
 * FONTE DA VERDADE: c:\Users\yande\Downloads\Vestui 2.0\atelie-loja\
 *   ├── src/routes/index.tsx        — Home page (Hero + Categorias + Novidades + Lookbook + Features)
 *   ├── src/routes/loja.tsx         — Página da loja com filtros
 *   ├── src/components/store/       — Navbar, Footer, CartDrawer, ProductCard, Icons, AnnouncementBar
 *   ├── src/lib/catalog.ts          — Produtos de demonstração
 *   └── src/styles.css              — Tokens de cor oklch + fontes Outfit/Figtree
 *
 * ESTRATÉGIA:
 *   - JSX 100% fiel ao original (HTML semântico + Tailwind puro)
 *   - Todos os subcomponentes inline (sem dependências externas ao SaaS)
 *   - Escopo CSS isolado em .t02-theme (não afeta o painel admin)
 *   - Dados variáveis injetados pelo ThemeEngine (storeName, banner, cores, fontes)
 */
import { useEffect, useRef, useState, useMemo, createContext, useContext } from "react";
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

// ── Assets locais (14 imagens, idênticas ao template original) ────────────────
import heroImg from "@/assets/template-02/hero.jpg";
import lookbookImg from "@/assets/template-02/lookbook.jpg";
import catFeminino from "@/assets/template-02/cat-feminino.jpg";
import catMasculino from "@/assets/template-02/cat-masculino.jpg";
import catAcessorios from "@/assets/template-02/cat-acessorios.jpg";
import catNovidades from "@/assets/template-02/cat-novidades.jpg";
import p1 from "@/assets/template-02/p1.jpg";
import p2 from "@/assets/template-02/p2.jpg";
import p3 from "@/assets/template-02/p3.jpg";
import p4 from "@/assets/template-02/p4.jpg";
import p5 from "@/assets/template-02/p5.jpg";
import p6 from "@/assets/template-02/p6.jpg";
import p7 from "@/assets/template-02/p7.jpg";
import p8 from "@/assets/template-02/p8.jpg";

// ── Adapter: Produto (loja.ts) → Product (template internal type) ────────────
type Product = {
  slug: string;
  name: string;
  price: number;
  compareAt?: number;
  category: string;
  categoryLabel: string;
  image: string;
  colors: { name: string; hex: string }[];
  sizes: string[];
  tag?: "Novo" | "Esgotado" | "Últimas peças";
  description: string;
  composition: string;
  isNew?: boolean;
  estoque: number;
  precoOculto?: boolean;
  mostrarEstoque?: boolean;
};

const formatPrice = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Normalizes special characters for category keys */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-");
}

/** Adapter: maps a ShowcaseProduct to the template's internal Product shape */
function adaptShowcaseProduct(p: ShowcaseProduct): Product {
  const tag =
    p.totalEstoque === 0
      ? ("Esgotado" as const)
      : p.emPromocao
        ? ("Últimas peças" as const)
        : p.showcase.destaque
          ? ("Novo" as const)
          : undefined;
  const sizesObj = (p.sizes ?? {}) as Record<string, number>;
  const sizes = Object.entries(sizesObj)
    .filter(([, qty]) => qty > 0)
    .map(([size]) => size);
  return {
    slug: p.id,
    name: p.name,
    price: p.precoEfetivo,
    ...(p.emPromocao && p.showcase.precoPromocional ? { compareAt: p.sale_price } : {}),
    category: slugify(p.category),
    categoryLabel: p.category,
    image:
      p.fotoEfetiva ?? `https://placehold.co/600x800/f5f5f5/999?text=${encodeURIComponent(p.name)}`,
    colors: p.color ? [{ name: p.color, hex: "#888888" }] : [],
    sizes: sizes.length > 0 ? sizes : ["Único"],
    ...(tag !== undefined ? { tag } : {}),
    description: "",
    composition: "",
    isNew: p.showcase.destaque,
    estoque: p.totalEstoque,
    ...(p.showcase.precoOculto ? { precoOculto: true } : {}),
  };
}

function getCategoryFallbackImage(slug: string, index: number): string {
  const s = slug.toLowerCase();
  if (s.includes("fem") || s.includes("mulher") || s.includes("vestido")) return catFeminino;
  if (s.includes("masc") || s.includes("homem")) return catMasculino;
  if (s.includes("aces") || s.includes("bolsa") || s.includes("joia")) return catAcessorios;
  if (s.includes("nov") || s.includes("lanc")) return catNovidades;
  const defaults = [catFeminino, catMasculino, catAcessorios, catNovidades];
  return defaults[index % defaults.length] ?? catFeminino;
}

// ── Ícones SVG (idênticos ao icons.tsx original) ──────────────────────────────
type IconProps = { className?: string };
const svgBase = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};
function MenuIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
function SearchIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function UserIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
    </svg>
  );
}
function BagIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <path d="M6 7h12l1 13H5L6 7Z" />
      <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
    </svg>
  );
}
function CloseIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function MinusIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <path d="M5 12h14" />
    </svg>
  );
}
function PlusIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// ── Cart Context (idêntico ao context/cart.tsx original) ──────────────────────
type CartItemT = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  color: string;
  size: string;
  quantity: number;
};
type CartCtx = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  items: CartItemT[];
  count: number;
  subtotal: number;
  add: (product: Product, color: string, size: string) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, qty: number) => void;
};
const CartContext = createContext<CartCtx | null>(null);

function useCart(): CartCtx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

function CartProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<CartItemT[]>([]);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const add = (product: Product, color: string, size: string) => {
    const id = `${product.slug}-${color}-${size}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.image,
          color,
          size,
          quantity: 1,
        },
      ];
    });
    setIsOpen(true);
  };

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const setQuantity = (id: string, qty: number) => {
    if (qty <= 0) return remove(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
  };

  return (
    <CartContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        items,
        count,
        subtotal,
        add,
        remove,
        setQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ── AnnouncementBar (idêntico ao original) ────────────────────────────────────
function AnnouncementBar({ text }: { text: string }) {
  return (
    <div className="bg-primary px-5 py-2.5 text-center">
      <p className="font-display text-[10px] uppercase tracking-[0.28em] text-primary-foreground sm:text-[11px]">
        {text}
      </p>
    </div>
  );
}

// ── Navbar (idêntico ao navbar.tsx original) ──────────────────────────────────
function Navbar({
  storeName,
  logoUrl,
  isStoreLoading,
  onOpenCart,
  cartCount,
  navLinks,
}: {
  storeName: string;
  logoUrl?: string;
  isStoreLoading?: boolean;
  onOpenCart?: (() => void) | undefined;
  cartCount?: number | undefined;
  navLinks?: { label: string; href?: string }[];
}) {
  const { count, open } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links =
    navLinks && navLinks.length > 0
      ? navLinks
      : [
          { label: "Loja", href: "#vitrine" },
          { label: "Novidades", href: "#vitrine" },
        ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto grid h-16 max-w-[1500px] grid-cols-[auto_1fr_auto] items-center gap-4 px-5 sm:h-20 lg:px-10">
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setMobileOpen((v) => !v)}
          className="-ml-1 p-1 text-foreground lg:hidden"
        >
          {mobileOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>

        <nav className="hidden min-w-0 items-center gap-7 lg:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href ?? "#vitrine"}
              className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="justify-self-center font-display text-lg font-semibold uppercase tracking-[0.42em] text-foreground sm:text-xl"
        >
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="h-8 max-h-8 w-auto object-contain" />
          ) : isStoreLoading ? (
            <Skeleton className="h-6 w-32 rounded" />
          ) : (
            storeName || "Sua loja"
          )}
        </a>

        <div className="flex items-center justify-end gap-4 sm:gap-5">
          <button
            type="button"
            aria-label="Buscar"
            className="hidden text-foreground/80 transition-colors hover:text-foreground sm:block"
          >
            <SearchIcon className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            aria-label="Minha conta"
            className="hidden text-foreground/80 transition-colors hover:text-foreground sm:block"
          >
            <UserIcon className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={onOpenCart ?? open}
            aria-label={`Sacola com ${cartCount ?? count} itens`}
            className="relative text-foreground transition-opacity hover:opacity-70"
          >
            <BagIcon className="h-[18px] w-[18px]" />
            {(cartCount ?? count) > 0 && (
              <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 font-display text-[10px] leading-none text-primary-foreground">
                {cartCount ?? count}
              </span>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-[1500px] flex-col px-5">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href ?? "#vitrine"}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between border-b border-border py-4 font-display text-sm uppercase tracking-[0.16em] text-foreground last:border-b-0"
              >
                {link.label}
                <CloseIcon className="h-3 w-3 rotate-45 text-muted-foreground" />
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

// ── ProductCard (idêntico ao product-card.tsx original) ───────────────────────
function ProductCard({
  product,
  onQuickAdd,
  onClickProduct,
}: {
  product: Product;
  onQuickAdd?: (p: Product) => void;
  onClickProduct?: () => void;
}) {
  const soldOut = product.tag === "Esgotado";
  return (
    <article className="group cursor-pointer" onClick={() => onClickProduct?.()}>
      <div className="relative overflow-hidden bg-secondary">
        <img
          src={product.image}
          alt={product.name}
          width={800}
          height={1100}
          loading="lazy"
          className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        {product.tag && (
          <span className="absolute left-3 top-3 bg-background px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.18em] text-foreground">
            {product.tag}
          </span>
        )}
        {onQuickAdd && !soldOut && (
          <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(product);
              }}
              className="w-full bg-foreground/92 py-2.5 font-display text-[10px] uppercase tracking-[0.22em] text-background backdrop-blur-sm"
            >
              Adição rápida
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-medium tracking-tight text-foreground">
            {product.name}
          </h3>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {product.categoryLabel}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-sm text-foreground">{formatPrice(product.price)}</p>
          {product.compareAt && (
            <p className="text-xs text-muted-foreground line-through">
              {formatPrice(product.compareAt)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {product.colors.map((c) => (
          <span
            key={c.name}
            title={c.name}
            className="h-2.5 w-2.5 rounded-full border border-border"
            style={{ backgroundColor: c.hex }}
          />
        ))}
        {soldOut && (
          <span className="ml-auto text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Indisponível
          </span>
        )}
      </div>
    </article>
  );
}

// ── CartDrawer (idêntico ao cart-drawer.tsx original) ─────────────────────────
function CartDrawer({ storeMeta }: { storeMeta: { name: string; whatsApp?: string } }) {
  const { isOpen, close, items, subtotal, remove, setQuantity } = useCart();
  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <div
        onClick={close}
        className={`absolute inset-0 bg-foreground/30 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col bg-background transition-transform duration-400 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <h2 className="font-display text-[11px] uppercase tracking-[0.24em] text-foreground">
            Sacola ({items.length})
          </h2>
          <button type="button" onClick={close} aria-label="Fechar sacola">
            <CloseIcon className="h-4 w-4 text-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Sua sacola está vazia.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 py-5">
                  <img
                    src={item.image}
                    alt={item.name}
                    width={800}
                    height={1100}
                    loading="lazy"
                    className="h-28 w-20 shrink-0 object-cover"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 font-display text-sm text-foreground">{item.name}</h3>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        aria-label={`Remover ${item.name}`}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <CloseIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      {item.color} · {item.size}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center border border-border">
                        <button
                          type="button"
                          aria-label="Diminuir"
                          onClick={() => setQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1.5 text-foreground"
                        >
                          <MinusIcon className="h-3 w-3" />
                        </button>
                        <span className="min-w-6 text-center font-display text-xs">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Aumentar"
                          onClick={() => setQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1.5 text-foreground"
                        >
                          <PlusIcon className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="font-display text-sm text-foreground">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-6 py-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="font-display text-base text-foreground">{formatPrice(subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Frete e impostos calculados no checkout.
          </p>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => {
              const whatsapp = storeMeta.whatsApp;
              if (whatsapp) {
                openWhatsAppCheckout(
                  whatsapp,
                  storeMeta.name,
                  items.map((i) => ({
                    id: i.id,
                    nome: i.name,
                    imagem: i.image,
                    preco: i.price,
                    tamanho: i.size,
                    cor: i.color,
                    quantidade: i.quantity,
                  })),
                  subtotal,
                );
              } else {
                openWhatsAppCheckout(
                  "",
                  storeMeta.name,
                  items.map((i) => ({
                    id: i.id,
                    nome: i.name,
                    imagem: i.image,
                    preco: i.price,
                    tamanho: i.size,
                    cor: i.color,
                    quantidade: i.quantity,
                  })),
                  subtotal,
                );
                toast.info("WhatsApp da loja não configurado", {
                  description: "Selecione o contato da loja no WhatsApp para enviar o resumo do pedido.",
                });
              }
            }}
            className="mt-5 w-full bg-primary py-4 font-display text-[11px] uppercase tracking-[0.24em] text-primary-foreground transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            Finalizar compra via WhatsApp
          </button>
        </div>
      </aside>
    </div>
  );
}

// ── QuickAdd Modal ────────────────────────────────────────────────────────────
function QuickAddModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { add } = useCart();
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  useEffect(() => {
    if (product) {
      setSelectedColor(product.colors[0]?.name ?? "");
      setSelectedSize(product.sizes[0] ?? "");
    }
  }, [product]);

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background p-8">
        <div className="flex gap-6">
          <img
            src={product.image}
            alt={product.name}
            width={800}
            height={1100}
            loading="lazy"
            className="h-36 w-24 shrink-0 object-cover"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {product.categoryLabel}
            </p>
            <h3 className="mt-2 font-display text-xl font-medium text-foreground">
              {product.name}
            </h3>
            <p className="mt-1 font-display text-sm text-foreground">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>

        <p className="mt-6 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Cor</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {product.colors.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setSelectedColor(c.name)}
              title={c.name}
              className={`h-5 w-5 rounded-full border-2 transition-all ${
                selectedColor === c.name ? "border-foreground" : "border-border"
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>

        <p className="mt-5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Tamanho
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {product.sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedSize(s)}
              className={`border px-3 py-2 font-display text-[11px] uppercase tracking-[0.14em] transition-colors ${
                selectedSize === s
                  ? "border-foreground bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => {
              add(product, selectedColor, selectedSize);
              onClose();
            }}
            className="flex-1 bg-primary py-4 font-display text-[11px] uppercase tracking-[0.24em] text-primary-foreground transition-opacity hover:opacity-85"
          >
            Adicionar à sacola
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-border px-5 font-display text-[11px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-foreground"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Footer (idêntico ao footer.tsx original) ──────────────────────────────────
function Footer({ storeName, storeDescription }: { storeName: string; storeDescription?: string }) {
  const columns = [
    { title: "Loja", links: ["Feminino", "Masculino", "Acessórios", "Novidades"] },
    { title: "Ajuda", links: ["Entrega", "Trocas e devoluções", "Guia de medidas", "Contato"] },
    { title: storeName, links: ["Nossa história", "Materiais", "Sustentabilidade"] },
  ];

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-[1500px] px-5 py-16 lg:px-10 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div className="max-w-sm">
            <p className="font-display text-lg uppercase tracking-[0.42em] text-foreground">
              {storeName}
            </p>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {storeDescription ||
                "Peças atemporais feitas em pequenos lotes, com tecidos naturais e alfaiataria cuidadosa."}
            </p>
            <form
              className="mt-8 flex items-center border-b border-foreground pb-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                required
                placeholder="Seu e-mail"
                aria-label="Seu e-mail"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="submit"
                className="font-display text-[11px] uppercase tracking-[0.2em] text-foreground"
              >
                Assinar
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <h2 className="font-display text-[11px] uppercase tracking-[0.2em] text-foreground">
                  {col.title}
                </h2>
                <ul className="mt-5 space-y-3">
                  {col.links.map((label) => (
                    <li key={label}>
                      <a
                        href="#vitrine"
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.getElementById("vitrine");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {storeName}. Todos os direitos reservados.
          </span>
          <span>Pagamento seguro · Pix, boleto e cartão</span>
        </div>
      </div>
    </footer>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Template02StoreProps {
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
export function Template02Store({
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
}: Template02StoreProps = {}) {
  const settings = theme?.settings;

  // ── Produtos reais do banco (Single Source of Truth) ──────────────────────
  const { data: rawInventory = [] } = useQuery(inventoryQuery());
  const allShowcaseProducts = useMemo(() => {
    if (showcaseProducts && showcaseProducts.length > 0) return showcaseProducts;
    return mergeInventoryWithShowcase(rawInventory as Parameters<typeof mergeInventoryWithShowcase>[0]);
  }, [showcaseProducts, rawInventory]);

  /** Apenas produtos ativos na vitrine */
  const PRODUCTS = useMemo(
    () => allShowcaseProducts.filter((p) => p.showcase.ativo !== false).map(adaptShowcaseProduct),
    [allShowcaseProducts],
  );
  /** Categorias únicas derivadas dos produtos ativos */
  const PRODUCT_CATEGORIES = useMemo(
    () =>
      Array.from(
        new Set(allShowcaseProducts.filter((p) => p.showcase.ativo !== false).map((p) => p.category)),
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
    ];
  }, [storeCategories, PRODUCT_CATEGORIES]);

  // Injeta fonte Outfit + Figtree (fontes originais do template)
  useEffect(() => {
    const url =
      "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Figtree:wght@300;400;500;600&display=swap";
    if (!document.querySelector(`link[href="${url}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }
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

  // ESC fecha tudo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuickAdd(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Variáveis CSS do Theme Engine (sobrescrevem os defaults do .t02-theme)
  const themeVars = settings
    ? ({
        "--background": settings.colorBackground,
        "--foreground": settings.colorForeground,
        "--primary": settings.colorForeground,
        "--primary-foreground": settings.colorBackground,
        "--secondary": settings.colorCanvas,
        "--secondary-foreground": settings.colorForeground,
        "--muted": settings.colorCanvas,
        "--muted-foreground": "oklch(0.475 0.006 85)",
        "--border": settings.colorBorder,
        "--accent": settings.colorCanvas,
        "--accent-foreground": settings.colorForeground,
        "--card": settings.colorBackground,
        "--card-foreground": settings.colorForeground,
      } as React.CSSProperties)
    : {};

  // State da loja
  const [quickAdd, setQuickAdd] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState("todos");
  const [activeSize, setActiveSize] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("destaque");

  // Nome da loja: 1) definido pelo usuário no builder, 2) nome real do banco de dados
  const { store: activeStore, isLoading: isStoreLoading } = useStore();
  const storeName =
    propsStoreName ||
    ((settings?.storeName && settings.storeName.trim()) ? settings.storeName : (activeStore?.name || "Boutique"));
  const storePhone =
    propsStorePhone ||
    ((settings?.storeWhatsApp && settings.storeWhatsApp.trim()) ? settings.storeWhatsApp : (activeStore?.phone || ""));
  const logoUrl = settings?.logoUrl;
  const bannerText =
    settings?.freeShippingBanner || "Frete grátis acima de R$ 500 · Trocas em 30 dias";
  const showBanner = settings?.freeShippingBannerEnabled !== false;

  // ── Extrai dados das seções do Engine (mantido para compatibilidade de ref) ──
  const sections = theme?.sections ?? [];

  // Dynamic categories derived from real product catalogue
  const categorias = useMemo(
    () => [
      { value: "todos", label: "Todos" },
      ...PRODUCT_CATEGORIES.map((cat) => ({ value: slugify(cat), label: cat })),
    ],
    [PRODUCT_CATEGORIES],
  );
  const tamanhos = useMemo(
    () => Array.from(new Set(PRODUCTS.flatMap((p) => p.sizes))).sort(),
    [PRODUCTS],
  );
  const novidades = PRODUCTS.filter((p) => p.isNew).slice(0, 4);

  const filteredProducts = useMemo(() => {
    let list = [...PRODUCTS];
    if (activeCategory !== "todos") {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (activeSize) list = list.filter((p) => p.sizes.includes(activeSize));
    if (sortBy === "menor") list.sort((a, b) => a.price - b.price);
    if (sortBy === "maior") list.sort((a, b) => b.price - a.price);
    if (sortBy === "novidades") list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    return list;
  }, [PRODUCTS, activeCategory, activeSize, sortBy]);

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
      const el = document.getElementById("vitrine");
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else if (act === "categoria" && category) {
      e.preventDefault();
      setActiveCategory(category.toLowerCase().trim());
      const el = document.getElementById("vitrine");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (act === "whatsapp") {
      e.preventDefault();
      const phone = (storePhone || settings?.storeWhatsApp || "").replace(/\D/g, "");
      if (phone) {
        const text = encodeURIComponent(
          `Olá! Estive no site da ${storeName} e gostaria de saber mais sobre as novidades!`,
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
            <AnnouncementBar text={s.settings.text} />
          </SectionWrap>
        );
      }
      case "hero": {
        const s = section as HeroSection;
        const alignClass =
          s.settings.textAlignment === "center"
            ? "text-center mx-auto items-center"
            : s.settings.textAlignment === "right"
              ? "text-right ml-auto items-end"
              : "text-left mr-auto items-start";
        const heightClass =
          s.settings.bannerHeight === "compact"
            ? "h-[55vh] min-h-[400px]"
            : s.settings.bannerHeight === "full"
              ? "h-[92vh] min-h-[640px]"
              : "h-[78vh] min-h-[520px]";
        const buttonHref =
          s.settings.buttonAction === "link" && s.settings.buttonLink
            ? s.settings.buttonLink
            : s.settings.buttonAction === "whatsapp"
              ? "#"
              : "#vitrine";

        return (
          <SectionWrap key={section.id} section={section}>
            <section className="relative">
              <img
                src={s.settings.imageUrl || heroImg}
                alt={s.settings.imageAlt || "Hero"}
                width={1920}
                height={1200}
                style={
                  s.settings.imagePosition
                    ? { objectPosition: s.settings.imagePosition }
                    : undefined
                }
                className={`${heightClass} w-full object-cover`}
              />
              {/* Overlay com opacidade customizável */}
              <div
                className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                style={{ opacity: (s.settings.overlayOpacity ?? 15) / 100 }}
              />
              <div className="absolute inset-0 flex items-end">
                <div className="mx-auto w-full max-w-[1500px] px-5 pb-14 lg:px-10 lg:pb-20">
                  <div className={`max-w-xl flex flex-col ${alignClass}`}>
                    {s.settings.subheading && (
                      <p className="font-display text-[11px] uppercase tracking-[0.28em] text-foreground/80">
                        {s.settings.subheading}
                      </p>
                    )}
                    <h1 className="mt-5 font-display text-4xl font-medium leading-[0.98] tracking-[-0.03em] text-foreground sm:text-6xl lg:text-7xl">
                      {s.settings.heading ? (
                        s.settings.heading.split("\n").map((line, i, arr) => (
                          <span key={i}>
                            {line}
                            {i < arr.length - 1 && <br />}
                          </span>
                        ))
                      ) : (
                        <>
                          Silêncio,
                          <br />
                          estrutura, tempo.
                        </>
                      )}
                    </h1>
                    {s.settings.buttonText && (
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
                        className="mt-8 inline-block border-b border-foreground pb-1 font-display text-[11px] uppercase tracking-[0.24em] text-foreground transition-opacity hover:opacity-60 cursor-pointer"
                      >
                        {s.settings.buttonText}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </SectionWrap>
        );
      }
      case "category_bar": {
        const s = section as CategoryBarSection;
        if (s.settings.enabled === false && !isEditing) return null;

        // Resolve os itens de categoria:
        // 1. Se modo custom e items configurados pelo lojista
        // 2. Senão, extrai dinamicamente das categorias reais dos produtos ou storeCategories
        const resolvedCategories: Array<{
          id: string;
          label: string;
          cat: string;
          image: string;
        }> = (() => {
          if (s.settings.mode === "custom" && s.settings.items && s.settings.items.length > 0) {
            return s.settings.items
              .filter((it) => it.visible !== false)
              .map((it, idx) => {
                const productWithCat = PRODUCTS.find(
                  (p) => (p.category || "").toLowerCase() === it.categorySlug.toLowerCase(),
                );
                return {
                  id: it.id || `custom-cat-${idx}`,
                  label: it.label,
                  cat: it.categorySlug,
                  image: it.imageUrl || productWithCat?.image || getCategoryFallbackImage(it.categorySlug, idx),
                };
              });
          }

          // Modo automático (auto)
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
            // Fallback elegante com 4 categorias padrão se a loja não tiver produtos ainda
            return [
              { id: "cat-fem", label: "Feminino", cat: "feminino", image: catFeminino },
              { id: "cat-masc", label: "Masculino", cat: "masculino", image: catMasculino },
              { id: "cat-acess", label: "Acessórios", cat: "acessorios", image: catAcessorios },
              { id: "cat-nov", label: "Novidades", cat: "todos", image: catNovidades },
            ];
          }

          return distinctCategorySlugs.slice(0, 8).map((slug, idx) => {
            const productWithCat = PRODUCTS.find(
              (p) => (p.category || "").toLowerCase() === slug,
            );
            const label =
              storeCategories?.find((sc) => sc.slug.toLowerCase() === slug)?.label ||
              productWithCat?.categoryLabel ||
              slug.charAt(0).toUpperCase() + slug.slice(1);

            return {
              id: `auto-cat-${slug}-${idx}`,
              label,
              cat: slug,
              image: productWithCat?.image || getCategoryFallbackImage(slug, idx),
            };
          });
        })();

        const layout = s.settings.layout || "grid";
        const sectionTitle = s.settings.title;

        return (
          <SectionWrap key={section.id} section={section}>
            <section className="mx-auto max-w-[1500px] px-5 py-12 lg:px-10 lg:py-16">
              {sectionTitle && (
                <div className="mb-8 text-center">
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
                    {sectionTitle}
                  </h2>
                </div>
              )}

              {layout === "pills" ? (
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveCategory("todos");
                      const el = document.getElementById("vitrine");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      activeCategory === "todos"
                        ? "bg-foreground text-background shadow-md scale-105"
                        : "bg-secondary/80 text-foreground hover:bg-secondary hover:scale-102"
                    }`}
                  >
                    Ver Tudo
                  </button>
                  {resolvedCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveCategory(cat.cat);
                        const el = document.getElementById("vitrine");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        activeCategory === cat.cat
                          ? "bg-foreground text-background shadow-md scale-105"
                          : "bg-secondary/80 text-foreground hover:bg-secondary hover:scale-102"
                      }`}
                    >
                      {cat.image && (
                        <img
                          src={cat.image}
                          alt={cat.label}
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      )}
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              ) : layout === "scroll" ? (
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory">
                  {resolvedCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveCategory(cat.cat);
                        const el = document.getElementById("vitrine");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="group relative block w-[200px] shrink-0 snap-start overflow-hidden bg-secondary text-left transition-all cursor-pointer hover:shadow-lg sm:w-[240px]"
                    >
                      <img
                        src={cat.image}
                        alt={cat.label}
                        width={600}
                        height={800}
                        loading="lazy"
                        className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                      />
                      <span className="absolute bottom-3 left-3 bg-background/95 backdrop-blur-xs px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.2em] text-foreground shadow-xs">
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className={`grid gap-4 lg:gap-6 ${
                  resolvedCategories.length <= 2
                    ? "grid-cols-2 max-w-2xl mx-auto"
                    : resolvedCategories.length === 3
                      ? "grid-cols-2 md:grid-cols-3 max-w-4xl mx-auto"
                      : "grid-cols-2 lg:grid-cols-4"
                }`}>
                  {resolvedCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveCategory(cat.cat);
                        const el = document.getElementById("vitrine");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="group relative block overflow-hidden bg-secondary text-left transition-all cursor-pointer hover:shadow-lg"
                    >
                      <img
                        src={cat.image}
                        alt={cat.label}
                        width={800}
                        height={1100}
                        loading="lazy"
                        className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                      />
                      <span className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-xs px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.2em] text-foreground shadow-xs">
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </SectionWrap>
        );
      }
      case "product_grid": {
        const s = section as ProductGridSection;
        const products =
          s.settings.source === "newest"
            ? PRODUCTS.filter((p) => p.isNew).slice(0, s.settings.count)
            : s.settings.source === "featured"
              ? PRODUCTS.filter((p) => p.estoque > 0)
              : PRODUCTS;
        return (
          <SectionWrap key={section.id} section={section}>
            <section className="mx-auto max-w-[1500px] px-5 pb-16 lg:px-10 lg:pb-24">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-b border-border pb-5">
                <div>
                  {s.settings.kicker && (
                    <p className="font-display text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
                      {s.settings.kicker}
                    </p>
                  )}
                  <h2 className="min-w-0 font-display text-2xl font-medium tracking-[-0.02em] text-foreground sm:text-3xl">
                    {s.settings.title || "Produtos"}
                  </h2>
                </div>
                {s.settings.showViewAll !== false && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory("todos")}
                    className="shrink-0 font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Ver tudo
                  </button>
                )}
              </div>
              <div
                className={`mt-8 grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-${Math.min(s.settings.columns, 4)} lg:gap-x-6`}
              >
                {products.slice(0, s.settings.count).map((p) => {
                  const originalShowcase = allShowcaseProducts.find((item) => item.id === p.slug);
                  return (
                    <ProductCard
                      key={p.slug}
                      product={p}
                      onQuickAdd={setQuickAdd}
                      onClickProduct={() => {
                        if (onSelectProduct && originalShowcase) {
                          onSelectProduct(originalShowcase);
                        } else {
                          setQuickAdd(p);
                        }
                      }}
                    />
                  );
                })}
              </div>
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
              : "#vitrine";
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
              className="mt-8 inline-block border-b border-foreground pb-1 font-display text-[11px] uppercase tracking-[0.24em] text-foreground transition-opacity hover:opacity-60 cursor-pointer"
            >
              {s.settings.buttonText}
            </a>
          );
        };
        return (
          <SectionWrap key={section.id} section={section}>
            <section
              className="border-y border-border"
              style={
                s.settings.backgroundColor === "canvas"
                  ? { background: "var(--color-canvas, var(--tw-color-secondary))" }
                  : undefined
              }
            >
              <div
                className="mx-auto grid max-w-[1500px] items-center gap-10 px-5 py-16 lg:gap-20 lg:px-10 lg:py-24"
                style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
              >
                {isLeft ? (
                  <>
                    <img
                      src={s.settings.imageUrl || lookbookImg}
                      alt={s.settings.imageAlt || ""}
                      width={1408}
                      height={1600}
                      loading="lazy"
                      className="aspect-[4/5] w-full object-cover"
                    />
                    <div className="max-w-md">
                      {s.settings.kicker && (
                        <p className="font-display text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                          {s.settings.kicker}
                        </p>
                      )}
                      <h2 className="mt-5 font-display text-3xl font-medium leading-tight tracking-[-0.02em] text-foreground sm:text-4xl">
                        {s.settings.heading}
                      </h2>
                      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                        {s.settings.body}
                      </p>
                      {renderCtaBtn()}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="max-w-md">
                      {s.settings.kicker && (
                        <p className="font-display text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                          {s.settings.kicker}
                        </p>
                      )}
                      <h2 className="mt-5 font-display text-3xl font-medium leading-tight tracking-[-0.02em] text-foreground sm:text-4xl">
                        {s.settings.heading}
                      </h2>
                      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                        {s.settings.body}
                      </p>
                      {renderCtaBtn()}
                    </div>
                    <img
                      src={s.settings.imageUrl || lookbookImg}
                      alt={s.settings.imageAlt || ""}
                      width={1408}
                      height={1600}
                      loading="lazy"
                      className="aspect-[4/5] w-full object-cover"
                    />
                  </>
                )}
              </div>
            </section>
          </SectionWrap>
        );
      }
      case "features": {
        const s = section as FeaturesSection;
        return (
          <SectionWrap key={section.id} section={section}>
            <section className="mx-auto max-w-[1500px] px-5 py-16 lg:px-10 lg:py-20">
              <div className="grid gap-10 sm:grid-cols-3">
                {s.settings.items.map((item) => (
                  <div key={item.title}>
                    <h2 className="font-display text-[11px] uppercase tracking-[0.2em] text-foreground">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                ))}
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
            <section className="mx-auto max-w-[1500px] px-5 py-16 lg:px-10 lg:py-24 border-y border-border">
              <div className="mb-12 text-center">
                {s.settings.kicker && (
                  <p className="font-display text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    {s.settings.kicker}
                  </p>
                )}
                <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                  {s.settings.title}
                </h2>
              </div>
              <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col justify-between rounded-2xl border border-border/80 bg-background/50 p-6 shadow-xs"
                  >
                    <div>
                      <div className="text-amber-500 text-sm tracking-widest">
                        {"★".repeat(item.rating || 5)}
                      </div>
                      <blockquote className="mt-4 text-sm leading-relaxed text-foreground/80 italic">
                        &ldquo;{item.comment}&rdquo;
                      </blockquote>
                    </div>
                    <div className="mt-6 border-t border-border/60 pt-4">
                      <p className="font-display text-xs font-semibold uppercase tracking-wider text-foreground">
                        {item.name}
                      </p>
                      {item.city && (
                        <p className="text-[11px] text-muted-foreground">{item.city}</p>
                      )}
                    </div>
                  </div>
                ))}
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
            <section className="mx-auto max-w-3xl px-5 py-16 lg:px-8 lg:py-24">
              <div className="mb-10 text-center">
                {s.settings.kicker && (
                  <p className="font-display text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    {s.settings.kicker}
                  </p>
                )}
                <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                  {s.settings.title}
                </h2>
              </div>
              <div className="space-y-4">
                {items.map((item, i) => (
                  <details
                    key={i}
                    className="group rounded-2xl border border-border bg-card/60 p-5 [&_summary::-webkit-details-marker]:hidden transition-all duration-200 open:border-primary/40 open:bg-card"
                  >
                    <summary className="flex cursor-pointer items-center justify-between font-display text-sm font-semibold tracking-wide text-foreground">
                      <span>{item.question}</span>
                      <span className="ml-4 shrink-0 transition-transform duration-200 group-open:rotate-180">
                        ↓
                      </span>
                    </summary>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground border-t border-border/40 pt-3">
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
              : "#vitrine";
        return (
          <SectionWrap key={section.id} section={section}>
            <section className="bg-primary text-primary-foreground py-14 px-5">
              <div className="mx-auto max-w-4xl text-center space-y-4">
                {s.settings.badge && (
                  <span className="inline-block rounded-full bg-primary-foreground/15 px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                    {s.settings.badge}
                  </span>
                )}
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  {s.settings.heading}
                </h2>
                <p className="text-xs text-primary-foreground/80 max-w-xl mx-auto leading-relaxed">
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
                      className="inline-flex items-center gap-2 rounded-xl bg-background px-6 py-3 font-display text-xs font-bold uppercase tracking-wider text-foreground transition-transform hover:scale-105 shadow-sm cursor-pointer"
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
            <section className="mx-auto max-w-[1500px] px-5 py-16 lg:px-10 lg:py-24">
              <div className="mb-10 text-center">
                {s.settings.handle && (
                  <a
                    href={instaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display text-[11px] uppercase tracking-[0.24em] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {s.settings.handle}
                  </a>
                )}
                <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                  {s.settings.title}
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {imgs.map((img, i) => (
                  <a
                    key={i}
                    href={instaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-xl bg-muted block cursor-pointer"
                  >
                    <img
                      src={img}
                      alt={`Foto da comunidade ${i + 1}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold uppercase tracking-wider">
                      Ver no Insta
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
            <section className="border-t border-border bg-card py-16 px-5">
              <div className="mx-auto max-w-xl text-center space-y-4">
                {s.settings.couponBadge && (
                  <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                    Cupom: {s.settings.couponBadge}
                  </span>
                )}
                <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {s.settings.heading}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {s.settings.subheading}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2">
                  <input
                    type="email"
                    placeholder="Seu melhor e-mail"
                    className="h-10 flex-1 rounded-xl border border-input bg-background px-4 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => toast.success(`Cupom ${s.settings.couponBadge} ativado!`)}
                    className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-display text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-90"
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
    <CartProvider>
      {/* .t02-theme isola os tokens de cor deste template do painel admin */}
      <div className="t02-theme min-h-screen bg-background text-foreground" style={themeVars}>
        {/* AnnouncementBar no topo (fora do loop pois é sticky) — apenas se NÃO estiver no order */}
        {showBanner &&
          !(theme?.order ?? []).some(
            (id) => theme?.sections.find((s) => s.id === id)?.type === "announcement",
          ) && <AnnouncementBar text={bannerText} />}
        <Navbar
          storeName={storeName}
          isStoreLoading={isStoreLoading}
          navLinks={navLinks}
          {...(logoUrl ? { logoUrl } : {})}
          {...(onOpenCart ? { onOpenCart } : {})}
          {...(cartCount !== undefined ? { cartCount } : {})}
        />
        {!onOpenCart && (
          <CartDrawer
            storeMeta={{ name: storeName, whatsApp: settings?.storeWhatsApp ?? "" }}
          />
        )}
        {quickAdd && <QuickAddModal product={quickAdd} onClose={() => setQuickAdd(null)} />}

        <main>
          {/* ── SEÇÕES DINÂMICAS — iteradas por theme.order ── */}
          {dynamicSections}

          {/* ── VITRINE COMPLETA (sempre visível no final) ── */}
          <section id="vitrine" className="mx-auto max-w-[1500px] px-5 py-12 lg:px-10 lg:py-16">
            <h2 className="font-display text-3xl font-medium tracking-[-0.02em] text-foreground sm:text-4xl">
              {categorias.find((c) => c.value === activeCategory)?.label ?? "Todas as peças"}
            </h2>

            <div className="mt-8 flex flex-wrap gap-2">
              {categorias.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setActiveCategory(item.value)}
                  className={`border px-4 py-2 font-display text-[11px] uppercase tracking-[0.16em] transition-colors ${
                    activeCategory === item.value
                      ? "border-foreground bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
              <aside className="space-y-8">
                <div>
                  <h3 className="font-display text-[11px] uppercase tracking-[0.2em] text-foreground">
                    Tamanho
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tamanhos.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setActiveSize(activeSize === t ? null : t)}
                        className={`min-w-10 border px-2.5 py-1.5 text-xs transition-colors ${
                          activeSize === t
                            ? "border-foreground text-foreground"
                            : "border-border text-muted-foreground hover:border-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {activeSize && (
                  <button
                    type="button"
                    onClick={() => setActiveSize(null)}
                    className="border-b border-foreground pb-0.5 font-display text-[11px] uppercase tracking-[0.16em] text-foreground"
                  >
                    Limpar filtros
                  </button>
                )}
              </aside>

              <div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border pb-4">
                  <p className="min-w-0 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {filteredProducts.length} {filteredProducts.length === 1 ? "peça" : "peças"}
                  </p>
                  <label className="flex shrink-0 items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Ordenar
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none"
                    >
                      <option value="destaque">Destaque</option>
                      <option value="novidades">Novidades</option>
                      <option value="menor">Menor preço</option>
                      <option value="maior">Maior preço</option>
                    </select>
                  </label>
                </div>

                {filteredProducts.length === 0 ? (
                  <p className="py-20 text-center text-sm text-muted-foreground">
                    Nenhuma peça encontrada com esses filtros.
                  </p>
                ) : (
                  <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-12 lg:grid-cols-3 lg:gap-x-6">
                    {filteredProducts.map((p) => {
                      const originalShowcase = allShowcaseProducts.find((item) => item.id === p.slug);
                      return (
                        <ProductCard
                          key={p.slug}
                          product={p}
                          onQuickAdd={setQuickAdd}
                          onClickProduct={() => {
                            if (onSelectProduct && originalShowcase) {
                              onSelectProduct(originalShowcase);
                            } else {
                              setQuickAdd(p);
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>

        <Footer
          storeName={storeName}
          storeDescription={settings?.storeDescription ?? ""}
        />
      </div>
    </CartProvider>
  );
}
