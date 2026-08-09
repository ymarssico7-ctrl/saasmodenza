/**
 * Template01Store — Vitrine "Atelier Nove"
 *
 * FONTE DA VERDADE: c:\Users\yande\Downloads\Modaly 2.0\template 01\
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
import { useEffect, useRef, useState } from "react";
import type { ThemeConfig } from "@/lib/theme-engine/schema";
import { FONT_URLS } from "@/lib/theme-engine/defaults";

// ── Assets locais (idênticos ao template original) ────────────────────────────
import heroImg from "@/assets/template-01/hero.jpg";
import catWomenImg from "@/assets/template-01/cat-women.jpg";
import catMenImg from "@/assets/template-01/cat-men.jpg";
import catAccessoriesImg from "@/assets/template-01/cat-accessories.jpg";
import editorialImg from "@/assets/template-01/editorial.jpg";
import look1Img from "@/assets/template-01/look-1.jpg";
import look2Img from "@/assets/template-01/look-2.jpg";
import p1 from "@/assets/template-01/p1.jpg";
import p2 from "@/assets/template-01/p2.jpg";
import p3 from "@/assets/template-01/p3.jpg";
import p4 from "@/assets/template-01/p4.jpg";
import p5 from "@/assets/template-01/p5.jpg";
import p6 from "@/assets/template-01/p6.jpg";
import d1 from "@/assets/template-01/detail-1.jpg";
import d2 from "@/assets/template-01/detail-2.jpg";

// ── Tipos de produto (idênticos ao data/products.ts original) ─────────────────
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
};

const formatBRL = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  });

// ── Dados de produtos (idênticos ao data/products.ts original) ────────────────
const PRODUCTS: Product[] = [
  {
    id: "casaco-alba",
    nome: "Casaco Alba em Lã Dupla",
    categoria: "Casacos",
    preco: 2890,
    imagem: p1,
    imagemHover: d1,
    cores: [
      { nome: "Marfim", hex: "#efe8dc" },
      { nome: "Grafite", hex: "#3b3b3b" },
    ],
    tamanhos: ["PP", "P", "M", "G"],
    badge: "Novo",
    avaliacao: 5,
  },
  {
    id: "alfaiataria-vienna",
    nome: "Calça Vienna Alfaiataria",
    categoria: "Alfaiataria",
    preco: 1190,
    precoAntigo: 1490,
    imagem: p2,
    imagemHover: d1,
    cores: [
      { nome: "Camel", hex: "#b8804f" },
      { nome: "Preto", hex: "#1c1c1c" },
    ],
    tamanhos: ["36", "38", "40", "42"],
    badge: "Últimas peças",
    avaliacao: 4,
  },
  {
    id: "camisa-luce",
    nome: "Camisa Luce em Popeline",
    categoria: "Camisaria",
    preco: 790,
    imagem: p3,
    imagemHover: d1,
    cores: [
      { nome: "Branco", hex: "#f7f5f1" },
      { nome: "Areia", hex: "#d9c9b2" },
    ],
    tamanhos: ["PP", "P", "M", "G", "GG"],
    avaliacao: 5,
  },
  {
    id: "vestido-noir",
    nome: "Vestido Noir em Seda",
    categoria: "Vestidos",
    preco: 2190,
    imagem: p4,
    imagemHover: d2,
    cores: [
      { nome: "Preto", hex: "#141414" },
      { nome: "Bordô", hex: "#5b2530" },
    ],
    tamanhos: ["P", "M", "G"],
    badge: "Novo",
    avaliacao: 5,
  },
  {
    id: "bolsa-mila",
    nome: "Bolsa Mila Couro Nappa",
    categoria: "Acessórios",
    preco: 1690,
    precoAntigo: 1990,
    imagem: p5,
    imagemHover: d1,
    cores: [
      { nome: "Taupe", hex: "#c79c73" },
      { nome: "Preto", hex: "#1c1c1c" },
    ],
    tamanhos: ["Único"],
    avaliacao: 4,
  },
  {
    id: "tricot-ondine",
    nome: "Tricot Ondine Merino",
    categoria: "Malharia",
    preco: 990,
    imagem: p6,
    imagemHover: d1,
    cores: [
      { nome: "Cinza", hex: "#7c7c7c" },
      { nome: "Creme", hex: "#e6ded0" },
    ],
    tamanhos: ["P", "M", "G"],
    avaliacao: 5,
  },
];

// ── Navegação original ─────────────────────────────────────────────────────────
const NAV = [
  {
    label: "Feminino",
    colunas: [
      { titulo: "Vestuário", itens: ["Casacos", "Alfaiataria", "Vestidos", "Camisaria", "Malharia"] },
      { titulo: "Coleções", itens: ["Inverno 26", "Essenciais", "Edição Limitada", "Últimas peças"] },
    ],
  },
  {
    label: "Masculino",
    colunas: [
      { titulo: "Vestuário", itens: ["Blazers", "Calças", "Camisas", "Tricôs", "Sobretudos"] },
      { titulo: "Coleções", itens: ["Sob medida", "Essenciais", "Viagem"] },
    ],
  },
  {
    label: "Acessórios",
    colunas: [
      { titulo: "Couro", itens: ["Bolsas", "Cintos", "Carteiras"] },
      { titulo: "Detalhes", itens: ["Lenços", "Joias", "Óculos"] },
    ],
  },
];

// ── ProductCard (idêntico ao original ProductCard.tsx) ────────────────────────
function ProductCard({
  product,
  onQuickAdd,
}: {
  product: Product;
  onQuickAdd: (p: Product) => void;
}) {
  const [corAtiva, setCorAtiva] = useState(0);
  const [favorito, setFavorito] = useState(false);

  return (
    <article className="group relative">
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
          onClick={() => setFavorito((v) => !v)}
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

        <div className="absolute inset-x-3 bottom-3 translate-y-4 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onQuickAdd(product)}
            className="w-full bg-foreground/95 py-3 text-[11px] uppercase tracking-[0.24em] text-background backdrop-blur-sm transition-colors duration-300 hover:bg-foreground"
          >
            Adição rápida
          </button>
        </div>
      </div>

      <div className="pt-5">
        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          {product.categoria}
        </p>
        <h3 className="mt-2 font-serif text-lg leading-snug text-foreground">
          <a href="#produto" className="transition-colors duration-300 hover:text-accent-foreground">
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
              onClick={() => setCorAtiva(i)}
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
  onSectionClick?: (id: string) => void;
  onToggleSection?: (id: string) => void;
  onDeleteSection?: (id: string) => void;
}

// ── Componente principal ──────────────────────────────────────────────────────
export function Template01Store({ theme }: Template01StoreProps = {}) {
  const settings = theme?.settings;

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

  const adicionar = () => {
    if (!quickAdd || !tamanhoSel) return;
    setCart((atual) => {
      const idx = atual.findIndex(
        (i) => i.product.id === quickAdd.id && i.tamanho === tamanhoSel
      );
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

  // Nome da loja e textos do Theme Engine (com fallback para os originais)
  const storeName = settings?.storeName || "Nove";
  const logoUrl = settings?.logoUrl;
  const freeShippingText =
    settings?.freeShippingBanner || "Frete cortesia acima de R$ 800 · Troca sem custo em 30 dias";

  // ── Extrai dados das seções do Engine ──────────────────────────────────────
  const sections = theme?.sections ?? [];
  const heroSec = sections.find((s) => s.type === "hero") as (typeof sections[0] & { type: "hero" }) | undefined;
  const featuresSec = sections.find((s) => s.type === "features") as (typeof sections[0] & { type: "features" }) | undefined;
  const splitSec = sections.find((s) => s.type === "image_text_split") as (typeof sections[0] & { type: "image_text_split" }) | undefined;

  return (
    // .t01-theme isola o design system deste template do painel admin
    <div className="t01-theme min-h-screen bg-background text-foreground" style={themeVars}>
      {/* ── BARRA DE ANÚNCIO (idêntica ao original line 122-135) ── */}
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
        className={`sticky top-0 z-40 border-b transition-all duration-500 ${
          scrolled
            ? "border-border bg-background/90 py-3 backdrop-blur-md"
            : "border-transparent bg-background py-6"
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 lg:px-10">
          <nav aria-label="Principal" className="hidden flex-1 items-center gap-8 lg:flex">
            {NAV.map((item) => (
              <div key={item.label} className="group static">
                <a
                  href="#vitrine"
                  className="relative py-2 text-[11px] uppercase tracking-[0.24em] text-foreground/80 transition-colors duration-300 hover:text-foreground"
                >
                  {item.label}
                  <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-foreground transition-all duration-500 group-hover:w-full" />
                </a>
                <div className="invisible absolute inset-x-0 top-full z-30 border-b border-border bg-background opacity-0 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.35)] transition-all duration-300 group-hover:visible group-hover:opacity-100">
                  <div className="mx-auto grid max-w-[1400px] grid-cols-4 gap-10 px-10 py-12">
                    {item.colunas.map((col) => (
                      <div key={col.titulo}>
                        <p className="mb-4 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                          {col.titulo}
                        </p>
                        <ul className="space-y-2.5">
                          {col.itens.map((sub) => (
                            <li key={sub}>
                              <a
                                href="#vitrine"
                                className="text-sm text-foreground/75 transition-colors duration-300 hover:text-foreground"
                              >
                                {sub}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <div className="col-span-2">
                      <img
                        src={look2Img}
                        alt="Peças da coleção Inverno 26"
                        width={1000}
                        height={1000}
                        loading="lazy"
                        className="h-56 w-full object-cover"
                      />
                      <p className="mt-3 font-serif text-lg">Coleção Inverno 26</p>
                    </div>
                  </div>
                </div>
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

          <a href="#" className="font-serif text-2xl tracking-[0.3em] uppercase lg:text-center">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="h-8 max-h-8 w-auto object-contain" />
            ) : (
              storeName
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
              onClick={() => setSacolaAberta(true)}
              className="text-[11px] uppercase tracking-[0.2em] text-foreground/75 transition-colors duration-300 hover:text-foreground"
            >
              Sacola ({totalItens})
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO — vinculado ao ThemeEngine ── */}
        {(!heroSec || heroSec.visible !== false) && (
        <section className="relative">
          <img
            src={heroSec?.settings?.imageUrl || heroImg}
            alt={heroSec?.settings?.imageAlt || "Modelo com sobretudo de lã marfim em galeria minimalista"}
            width={1920}
            height={1280}
            style={heroSec?.settings?.imagePosition ? { objectPosition: heroSec.settings.imagePosition } : undefined}
            className="h-[78vh] min-h-[520px] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/25 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-[1400px] px-6 lg:px-10">
              <div className="max-w-xl">
                <p className="text-[11px] uppercase tracking-[0.32em] text-foreground/70">
                  {heroSec?.settings?.subheading || "Inverno 26"}
                </p>
                <h1 className="mt-6 font-serif text-5xl leading-[1.05] text-foreground sm:text-6xl lg:text-7xl">
                  {heroSec?.settings?.heading
                    ? heroSec.settings.heading.split("\n").map((line, i, arr) => (
                        <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                      ))
                    : (<>A elegância que<br />não pede licença</>)
                  }
                </h1>
                <div className="mt-10 flex flex-wrap gap-4">
                  <a
                    href="#vitrine"
                    className="group inline-flex items-center gap-3 bg-foreground px-9 py-4 text-[11px] uppercase tracking-[0.24em] text-background transition-all duration-500 hover:bg-foreground/85"
                  >
                    {heroSec?.settings?.buttonText || "Ver a coleção"}
                    <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                  </a>
                  <a
                    href="#editorial"
                    className="inline-flex items-center border border-foreground/30 px-9 py-4 text-[11px] uppercase tracking-[0.24em] text-foreground transition-all duration-500 hover:border-foreground hover:bg-foreground/5"
                  >
                    O atelier
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ── DIFERENCIAIS — vinculado ao ThemeEngine ── */}
        <section aria-label="Vantagens" className="border-b border-border">
          <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px px-6 py-10 lg:grid-cols-4 lg:px-10">
            {(featuresSec?.settings?.items
              ? featuresSec.settings.items.map((item) => ({ titulo: item.title, texto: item.description }))
              : [
                  { titulo: "Frete cortêsia", texto: "Acima de R$ 800 para todo o Brasil" },
                  { titulo: "Troca simples", texto: "30 dias, sem custo e sem burocracia" },
                  { titulo: "Pagamento seguro", texto: "Até 6x sem juros ou Pix com 5% off" },
                  { titulo: "Atendimento pessoal", texto: "Consultoria de estilo por WhatsApp" },
                ]
            ).map(({ titulo, texto }) => (
              <div key={titulo} className="px-2 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-foreground">{titulo}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CATEGORIAS (idêntico ao original lines 291-317) ── */}
        <section className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { img: catWomenImg, nome: "Feminino", texto: "Silhuetas fluidas" },
              { img: catMenImg, nome: "Masculino", texto: "Alfaiataria suave" },
              { img: catAccessoriesImg, nome: "Acessórios", texto: "Couro e ouro" },
            ].map((cat) => (
              <a key={cat.nome} href="#vitrine" className="group relative block overflow-hidden">
                <img
                  src={cat.img}
                  alt={`Categoria ${cat.nome}`}
                  width={900}
                  height={1200}
                  loading="lazy"
                  className="h-[460px] w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/45 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-90" />
                <div className="absolute bottom-0 left-0 p-8">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-background/80">
                    {cat.texto}
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-background">{cat.nome}</h2>
                  <span className="mt-3 block h-px w-0 bg-background transition-all duration-700 group-hover:w-20" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── VITRINE (idêntico ao original lines 319-340) ── */}
        <section id="vitrine" className="mx-auto max-w-[1400px] px-6 pb-24 lg:px-10">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Acabou de chegar
              </p>
              <h2 className="mt-3 font-serif text-4xl">Novidades da estação</h2>
            </div>
            <a
              href="#vitrine"
              className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-foreground/70 transition-colors hover:text-foreground"
            >
              Ver tudo
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-14 lg:grid-cols-4">
            {PRODUCTS.map((p) => (
              <ProductCard key={p.id} product={p} onQuickAdd={abrirQuickAdd} />
            ))}
          </div>
        </section>

        {/* ── EDITORIAL (idêntico ao original lines 342-368) ── */}
        <section id="editorial" className="border-y border-border bg-secondary">
          <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:px-10">
            <img
              src={editorialImg}
              alt="Ajuste manual de peça de cashmere em manequim no atelier"
              width={1400}
              height={1000}
              loading="lazy"
              className="h-[520px] w-full object-cover"
            />
            <div className="max-w-lg lg:pl-10">
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                O atelier
              </p>
              <h2 className="mt-4 font-serif text-4xl leading-tight">
                Feito devagar, para durar muito
              </h2>
              <p className="mt-6 text-sm leading-loose text-muted-foreground">
                Cada peça nasce de um molde próprio e passa por sete pares de mãos antes de chegar
                até você. Trabalhamos com lãs italianas, sedas naturais e couro de curtume vegetal
                — em produções pequenas, sem pressa e sem excesso.
              </p>
              <a
                href="#vitrine"
                className="mt-10 inline-flex items-center border border-foreground/25 px-9 py-4 text-[11px] uppercase tracking-[0.24em] transition-all duration-500 hover:border-foreground hover:bg-foreground hover:text-background"
              >
                Conhecer a produção
              </a>
            </div>
          </div>
        </section>

        {/* ── CARROSSEL (idêntico ao original lines 370-404) ── */}
        <section className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Preferidos da casa
              </p>
              <h2 className="mt-3 font-serif text-4xl">Mais desejados</h2>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Anterior"
                onClick={() => mover(-1)}
                className="flex h-11 w-11 items-center justify-center border border-border transition-all duration-300 hover:border-foreground hover:bg-foreground hover:text-background"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Próximo"
                onClick={() => mover(1)}
                className="flex h-11 w-11 items-center justify-center border border-border transition-all duration-300 hover:border-foreground hover:bg-foreground hover:text-background"
              >
                →
              </button>
            </div>
          </div>

          <div
            ref={trilha}
            className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2"
          >
            {[...PRODUCTS].reverse().map((p) => (
              <div key={p.id} className="w-[280px] shrink-0 snap-start sm:w-[320px]">
                <ProductCard product={p} onQuickAdd={abrirQuickAdd} />
              </div>
            ))}
          </div>
        </section>

        {/* ── DEPOIMENTOS (idêntico ao original lines 406-421) ── */}
        <section className="border-y border-border">
          <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-20 md:grid-cols-3 lg:px-10">
            <figure>
              <div className="text-xs tracking-[0.3em] text-accent-foreground">★★★★★</div>
              <blockquote className="mt-5 font-serif text-xl leading-relaxed">
                &ldquo;O caimento é de outro nível. Comprei o casaco no inverno passado e continua impecável.&rdquo;
              </blockquote>
              <figcaption className="mt-5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Marina L., São Paulo
              </figcaption>
            </figure>
            <figure>
              <div className="text-xs tracking-[0.3em] text-accent-foreground">★★★★★</div>
              <blockquote className="mt-5 font-serif text-xl leading-relaxed">
                &ldquo;Atendimento impecável, embalagem linda e entrega antes do prazo.&rdquo;
              </blockquote>
              <figcaption className="mt-5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Rafael T., Curitiba
              </figcaption>
            </figure>
            <figure>
              <div className="text-xs tracking-[0.3em] text-accent-foreground">★★★★★</div>
              <blockquote className="mt-5 font-serif text-xl leading-relaxed">
                &ldquo;Poucas peças, todas certas. Meu guarda-roupa ficou mais leve e mais bonito.&rdquo;
              </blockquote>
              <figcaption className="mt-5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Ana P., Belo Horizonte
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ── LOOKBOOK (idêntico ao original lines 423-446) ── */}
        <section className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10">
          <div className="mb-10 text-center">
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              @ateliernove
            </p>
            <h2 className="mt-3 font-serif text-4xl">No dia a dia</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {[look1Img, look2Img, catWomenImg, catAccessoriesImg, catMenImg, editorialImg].map(
              (img, i) => (
                <a key={i} href="#vitrine" className="group relative block overflow-hidden">
                  <img
                    src={img}
                    alt={`Look da comunidade ${i + 1}`}
                    width={1000}
                    height={1000}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-transform duration-[1000ms] ease-out group-hover:scale-105"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-foreground/40 text-[10px] uppercase tracking-[0.24em] text-background opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                    Ver look
                  </span>
                </a>
              )
            )}
          </div>
        </section>

        {/* ── NEWSLETTER (idêntico ao original lines 448-489) ── */}
        <section className="bg-foreground">
          <div className="mx-auto max-w-2xl px-6 py-24 text-center">
            <h2 className="font-serif text-4xl text-background">Cartas do atelier</h2>
            <p className="mt-4 text-sm leading-relaxed text-background/65">
              Novos lançamentos, bastidores e acesso antecipado às edições limitadas. Uma carta por
              mês, no máximo.
            </p>
            {inscrito ? (
              <p className="mt-10 text-[11px] uppercase tracking-[0.24em] text-background">
                Obrigado — confira sua caixa de entrada.
              </p>
            ) : (
              <form
                className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!email.includes("@")) return;
                  setInscrito(true);
                }}
              >
                <label htmlFor="t01-email" className="sr-only">
                  Seu e-mail
                </label>
                <input
                  id="t01-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="flex-1 border-b border-background/30 bg-transparent px-1 py-3 text-sm text-background placeholder:text-background/40 transition-colors duration-300 focus:border-background focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-background px-8 py-3 text-[11px] uppercase tracking-[0.24em] text-foreground transition-opacity duration-300 hover:opacity-85"
                >
                  Inscrever
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* ── FOOTER (idêntico ao original lines 492-544) ── */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-10">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <p className="font-serif text-2xl uppercase tracking-[0.3em]">{storeName}</p>
              <p className="mt-5 max-w-xs text-xs leading-loose text-muted-foreground">
                Atelier de moda atemporal. Rua Oscar Freire 900, São Paulo.
              </p>
            </div>
            {[
              { titulo: "Loja", itens: ["Novidades", "Feminino", "Masculino", "Acessórios", "Últimas peças"] },
              { titulo: "Ajuda", itens: ["Entrega", "Trocas e devoluções", "Guia de tamanhos", "Rastrear pedido"] },
              { titulo: "Sobre", itens: ["O atelier", "Sustentabilidade", "Lojas físicas", "Carreiras"] },
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
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
          >
            ✕
          </button>
        </div>
        <nav className="px-6 py-10">
          <ul className="space-y-6">
            {NAV.map((item) => (
              <li key={item.label}>
                <a
                  href="#vitrine"
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
              {["Casacos", "Alfaiataria", "Seda", "Bolsas", "Tricô"].map((t) => (
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
            <p className="text-[11px] uppercase tracking-[0.24em]">
              Sua sacola ({totalItens})
            </p>
            <button
              type="button"
              aria-label="Fechar sacola"
              onClick={() => setSacolaAberta(false)}
            >
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
                  <li
                    key={`${item.product.id}-${item.tamanho}`}
                    className="flex gap-4"
                  >
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
                      <p className="mt-2 text-sm">
                        {formatBRL(item.product.preco * item.qtd)}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((c) =>
                            c.filter(
                              (x) =>
                                !(
                                  x.product.id === item.product.id &&
                                  x.tamanho === item.tamanho
                                )
                            )
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
              className="mt-6 w-full bg-foreground py-4 text-[11px] uppercase tracking-[0.24em] text-background transition-opacity duration-300 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Finalizar compra
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

