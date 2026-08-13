/**
 * Template02Store — "Atelie Minimalist"
 *
 * FONTE DA VERDADE: c:\Users\yande\Downloads\Modaly 2.0\atelie-loja\
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
  ProductGridSection,
  ImageTextSplitSection,
  FeaturesSection,
  AnnouncementSection,
} from "@/lib/theme-engine/schema";
import { FONT_URLS } from "@/lib/theme-engine/defaults";
import { SectionPreviewWrapper } from "@/components/theme/builder/section-preview-wrapper";
import { useQuery } from "@tanstack/react-query";
import { inventoryQuery } from "@/lib/db";
import { openWhatsAppCheckout } from "@/lib/whatsapp";
import { mergeInventoryWithShowcase, type ShowcaseProduct } from "@/lib/showcase-store";

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
function Navbar({ storeName, logoUrl }: { storeName: string; logoUrl?: string }) {
  const { count, open } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { label: "Loja" },
    { label: "Feminino" },
    { label: "Masculino" },
    { label: "Acessórios" },
    { label: "Lookbook" },
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
              href="#vitrine"
              className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#"
          className="justify-self-center font-display text-lg font-semibold uppercase tracking-[0.42em] text-foreground sm:text-xl"
        >
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="h-8 max-h-8 w-auto object-contain" />
          ) : (
            storeName
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
            onClick={open}
            aria-label={`Sacola com ${count} itens`}
            className="relative text-foreground transition-opacity hover:opacity-70"
          >
            <BagIcon className="h-[18px] w-[18px]" />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 font-display text-[10px] leading-none text-primary-foreground">
                {count}
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
                href="#vitrine"
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
}: {
  product: Product;
  onQuickAdd?: (p: Product) => void;
}) {
  const soldOut = product.tag === "Esgotado";
  return (
    <article className="group">
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
              onClick={() => onQuickAdd(product)}
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
                alert("Configure o WhatsApp da loja nas Configurações para receber pedidos.");
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
                        href="#"
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
  onSectionClick?: (id: string) => void;
  onToggleSection?: (id: string) => void;
  onDeleteSection?: (id: string) => void;
}

// ── Componente principal ──────────────────────────────────────────────────────
export function Template02Store({
  theme,
  highlightId,
  onSectionClick,
  onToggleSection,
  onDeleteSection,
}: Template02StoreProps = {}) {
  const settings = theme?.settings;

  // ── Produtos reais do banco (Single Source of Truth) ──────────────────────
  const { data: rawInventory = [] } = useQuery(inventoryQuery());
  const allShowcaseProducts = useMemo(
    () =>
      mergeInventoryWithShowcase(rawInventory as Parameters<typeof mergeInventoryWithShowcase>[0]),
    [rawInventory],
  );
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

  const storeName = settings?.storeName || "Atelie";
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
    [],
  );
  const tamanhos = useMemo(() => Array.from(new Set(PRODUCTS.flatMap((p) => p.sizes))).sort(), []);
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
  }, [activeCategory, activeSize, sortBy]);

  // ── Helpers de seção ────────────────────────────────────────────────────────
  const isEditing = typeof onSectionClick === "function";

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

  // ── Render de seção pelo tipo ────────────────────────────────────────────────
  function renderSection(section: Section): React.ReactNode {
    if (section.visible === false) return null;

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
                className="h-[78vh] min-h-[520px] w-full object-cover"
              />
              <div className="absolute inset-0 flex items-end">
                <div className="mx-auto w-full max-w-[1500px] px-5 pb-14 lg:px-10 lg:pb-20">
                  <div className="max-w-xl">
                    <p className="font-display text-[11px] uppercase tracking-[0.28em] text-foreground/70">
                      {s.settings.subheading}
                    </p>
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
                    <a
                      href="#vitrine"
                      className="mt-8 inline-block border-b border-foreground pb-1 font-display text-[11px] uppercase tracking-[0.24em] text-foreground transition-opacity hover:opacity-60"
                    >
                      {s.settings.buttonText || "Ver a coleção"}
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </SectionWrap>
        );
      }
      case "category_bar": {
        return (
          <SectionWrap key={section.id} section={section}>
            <section className="mx-auto max-w-[1500px] px-5 py-16 lg:px-10 lg:py-24">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
                {[
                  { label: "Feminino", image: catFeminino, cat: "feminino" },
                  { label: "Masculino", image: catMasculino, cat: "masculino" },
                  { label: "Acessórios", image: catAcessorios, cat: "acessorios" },
                  { label: "Novidades", image: catNovidades, cat: "todos" },
                ].map((cat) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setActiveCategory(cat.cat)}
                    className="group relative block overflow-hidden bg-secondary text-left"
                  >
                    <img
                      src={cat.image}
                      alt={cat.label}
                      width={800}
                      height={1100}
                      loading="lazy"
                      className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                    <span className="absolute bottom-4 left-4 bg-background px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.2em] text-foreground">
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
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
                {products.slice(0, s.settings.count).map((p) => (
                  <ProductCard key={p.slug} product={p} onQuickAdd={setQuickAdd} />
                ))}
              </div>
            </section>
          </SectionWrap>
        );
      }
      case "image_text_split": {
        const s = section as ImageTextSplitSection;
        const isLeft = s.settings.imagePosition === "left";
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
                      <a
                        href="#"
                        className="mt-8 inline-block border-b border-foreground pb-1 font-display text-[11px] uppercase tracking-[0.24em] text-foreground transition-opacity hover:opacity-60"
                      >
                        {s.settings.buttonText}
                      </a>
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
                      <a
                        href="#"
                        className="mt-8 inline-block border-b border-foreground pb-1 font-display text-[11px] uppercase tracking-[0.24em] text-foreground transition-opacity hover:opacity-60"
                      >
                        {s.settings.buttonText}
                      </a>
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
        <Navbar storeName={storeName} {...(logoUrl ? { logoUrl } : {})} />
        <CartDrawer
          storeMeta={{ name: storeName, whatsApp: settings?.storeWhatsApp ?? "" }}
        />
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
                    {filteredProducts.map((p) => (
                      <ProductCard key={p.slug} product={p} onQuickAdd={setQuickAdd} />
                    ))}
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
