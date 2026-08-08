/**
 * AtelierModStore — vitrine 100% fiel ao design original do Lovable
 *
 * Baseado nas screenshots reais do projeto customizado:
 * - Logo: "ATELIER"
 * - Hero: "Silhuetas amplas, tecidos que duram"
 * - Categorias Visuais: "Escolha por onde começar" com cards-foto
 * - Produtos: "SELECIONADOS / Peças da estação"
 * - Badges: pretos sólidos (bg-foreground text-background)
 * - Tipografia: Outfit (display) + Figtree (body)
 * - Paleta: warm off-white #F5F3EE / grafite #1C1A16
 */

import { useEffect, useState } from "react";
import { ArrowRight, Heart, Menu, Search, ShoppingBag, X } from "lucide-react";

// Assets locais copiados do template original
import heroImg from "@/assets/store/hero.jpg";
import lookbook1 from "@/assets/store/lookbook-1.jpg";
import lookbook2 from "@/assets/store/lookbook-2.jpg";
import bolsaCouro from "@/assets/store/p-bolsa-couro.jpg";
import blazerPreto from "@/assets/store/p-blazer-preto.jpg";
import vestidoLinho from "@/assets/store/p-vestido-linho.jpg";
import tricoEcru from "@/assets/store/p-trico-ecru.jpg";
import saiaMidi from "@/assets/store/p-saia-midi.jpg";
import camisaSeda from "@/assets/store/p-camisa-seda.jpg";
import calcaAlfaiataria from "@/assets/store/p-calca-alfaiataria.jpg";
import trench from "@/assets/store/p-trench.jpg";
import botas from "@/assets/store/p-botas.jpg";
import camiseta from "@/assets/store/p-camiseta.jpg";

// ── Dados inline (fiel ao template original) ──────────────────────────────────
const CATS = [
  { slug: "vestidos", label: "Vestidos" },
  { slug: "alfaiataria", label: "Alfaiataria" },
  { slug: "camisas", label: "Camisas" },
  { slug: "trico", label: "Tricô" },
  { slug: "saias", label: "Saias" },
  { slug: "casacos", label: "Casacos" },
  { slug: "acessorios", label: "Acessórios" },
  { slug: "calcados", label: "Calçados" },
] as const;

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAt?: number;
  category: string;
  categoryLabel: string;
  badge?: string;
  images: [string, string];
};

const PRODUCTS: Product[] = [
  { id: "p01", name: "Blazer Alfaiataria", slug: "blazer-alfaiataria", price: 899, compareAt: 1090, category: "alfaiataria", categoryLabel: "Feminino", badge: "Novo", images: [blazerPreto, lookbook1] },
  { id: "p02", name: "Gola Alta Canelada", slug: "gola-alta-canelada", price: 429, category: "trico", categoryLabel: "Feminino", images: [tricoEcru, lookbook2] },
  { id: "p03", name: "Calça Alfaiataria", slug: "calca-alfaiataria", price: 699, category: "alfaiataria", categoryLabel: "Feminino", badge: "Best-seller", images: [calcaAlfaiataria, lookbook1] },
  { id: "p04", name: "Saia Midi Fluida", slug: "saia-midi-fluida", price: 549, category: "saias", categoryLabel: "Feminino", images: [saiaMidi, lookbook2] },
  { id: "p05", name: "Vestido Linho Lavado", slug: "vestido-linho-lavado", price: 1290, category: "vestidos", categoryLabel: "Feminino", badge: "Novo", images: [vestidoLinho, lookbook1] },
  { id: "p06", name: "Camisa Seda Clássica", slug: "camisa-seda-classica", price: 990, category: "camisas", categoryLabel: "Feminino", images: [camisaSeda, lookbook2] },
  { id: "p07", name: "Trench Coat Gabardine", slug: "trench-coat", price: 2290, category: "casacos", categoryLabel: "Feminino", badge: "Novo", images: [trench, lookbook1] },
  { id: "p08", name: "Bolsa Couro Estruturada", slug: "bolsa-couro", price: 1790, category: "acessorios", categoryLabel: "Acessórios", images: [bolsaCouro, lookbook2] },
  { id: "p09", name: "Bota Chelsea Couro", slug: "bota-chelsea", price: 1590, category: "calcados", categoryLabel: "Calçados", images: [botas, lookbook1] },
  { id: "p10", name: "Camiseta Algodão Pesado", slug: "camiseta-algodao", price: 320, category: "camisas", categoryLabel: "Feminino", badge: "Essencial", images: [camiseta, lookbook2] },
];

const PEÇAS_DA_ESTACAO = PRODUCTS.slice(0, 6);
const ESSENCIAIS = PRODUCTS.slice(6);

// ══════════════════════════════════════════════════════════════════════════════
// Componente raiz da vitrine
// ══════════════════════════════════════════════════════════════════════════════
export function AtelierModStore() {
  return (
    <div className="atelier-theme min-h-screen">
      <StoreHeader />
      <main>
        <HeroSection />
        <CategoriasVisuais />
        <PecasDaEstacao />
        <LookbookSplit />
        <EssenciaisDaCasa />
        <MateriasPrimas />
        <Servicos />
      </main>
      <StoreFooter />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Header — fiel ao Lovable: logo "ATELIER", sticky, menu mobile
// ══════════════════════════════════════════════════════════════════════════════
function StoreHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      {/* Announcement bar — fundo preto, texto "FRETE GRÁTIS ACIMA DE R$ 499" */}
      <div className="bg-foreground px-4 py-2 text-center text-[11px] uppercase tracking-[0.16em] text-background">
        Frete grátis acima de R$ 499 · Troca em 30 dias
      </div>

      {/* Header sticky com backdrop blur */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="shell grid h-14 grid-cols-[auto_1fr_auto] items-center gap-2 md:h-16">

          {/* Esquerda: hamburger mobile + nav desktop */}
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
              {CATS.slice(0, 5).map((c) => (
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

          {/* Centro: logo "ATELIER" */}
          <div className="min-w-0 text-center">
            <a href="#" className="font-display text-[1.0625rem] tracking-[-0.03em] md:text-xl">
              ATELIER
            </a>
          </div>

          {/* Direita: ícones */}
          <div className="flex items-center justify-end">
            <a href="#" aria-label="Buscar" className="grid h-11 w-11 place-items-center">
              <Search className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </a>
            <a href="#" aria-label="Sacola" className="relative -mr-2 grid h-11 w-11 place-items-center">
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </a>
          </div>
        </div>
      </header>

      {/* Menu mobile full-screen — slide-in da esquerda */}
      <div
        className={`fixed inset-0 z-50 flex flex-col bg-background transition-transform duration-300 lg:hidden ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
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
        <nav className="flex-1 overflow-y-auto px-5 py-6">
          <ul className="space-y-1">
            <li>
              <a href="#" className="flex h-12 items-center font-display text-[1.75rem] tracking-[-0.04em]">
                Todos os produtos
              </a>
            </li>
            {CATS.map((c) => (
              <li key={c.slug}>
                <a href="#" className="flex h-12 items-center font-display text-[1.75rem] tracking-[-0.04em] text-muted-foreground">
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
          <ul className="mt-8 space-y-1 border-t border-border pt-6 text-sm">
            {["Lookbook", "Sobre", "Contato", "Trocas"].map((l) => (
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
// Hero — fiel ao Lovable screenshot 3
// "Silhuetas amplas, tecidos que duram"
// ══════════════════════════════════════════════════════════════════════════════
function HeroSection() {
  return (
    <section className="relative">
      <img
        src={heroImg}
        alt="Modelo com alfaiataria bege em sala iluminada"
        width={1600}
        height={1200}
        className="h-[78svh] w-full object-cover object-[62%_center] md:h-[86svh] md:object-center"
      />
      {/* Gradiente: mobile topo → baixo, desktop lateral */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-foreground/10 to-transparent md:bg-gradient-to-r md:from-foreground/40 md:via-transparent md:to-transparent" />
      <div className="absolute inset-x-0 bottom-0">
        <div className="shell pb-8 md:pb-16">
          <p className="text-[11px] uppercase tracking-[0.2em] text-background/80">
            Coleção Outono 26
          </p>
          <h1 className="display-xl mt-3 max-w-3xl text-background">
            Silhuetas amplas,<br />
            tecidos que duram
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-background/75 md:block">
            Linho lavado, lã fria e algodão pima em peças cortadas<br className="hidden md:block" />
            para durar mais de uma estação.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="#"
              className="inline-block h-13 bg-background px-8 text-center text-sm uppercase tracking-[0.14em] leading-[3.25rem] text-foreground transition-opacity hover:opacity-90"
            >
              Comprar a coleção
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Categorias Visuais — NOVA seção do Lovable screenshot 1
// "CATEGORIAS / Escolha por onde começar"
// Cards com foto, gradient overlay e texto no rodapé
// ══════════════════════════════════════════════════════════════════════════════
function CategoriasVisuais() {
  const cards = [
    {
      slug: "feminino",
      title: "Feminino",
      subtitle: "Alfaiataria e fluidez",
      img: vestidoLinho,
      alt: "Modelo com vestido fluido bege",
    },
    {
      slug: "masculino",
      title: "Masculino",
      subtitle: "Estilo e conforto",
      img: blazerPreto,
      alt: "Modelo com blazer preto",
    },
    {
      slug: "acessorios",
      title: "Acessórios",
      subtitle: "Bolsas e calçados",
      img: bolsaCouro,
      alt: "Bolsa de couro caramelo estruturada",
    },
  ];

  return (
    <section className="shell py-14 md:py-20">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <p className="kicker">Categorias</p>
          <h2 className="display-lg mt-2">Escolha por onde começar</h2>
        </div>
        <a href="#" className="link-underline shrink-0 pb-1 text-[13px] uppercase tracking-[0.12em]">
          Ver tudo
        </a>
      </header>

      <div className="mt-8 grid gap-3 md:grid-cols-[1fr_1fr]">
        {/* Card grande — ocupa a largura toda no mobile, metade no desktop */}
        <a
          href="#"
          className="group relative block overflow-hidden"
          style={{ aspectRatio: "4/5" }}
        >
          <img
            src={cards[0].img}
            alt={cards[0].alt}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/65 via-foreground/10 to-transparent" />
          <div className="absolute bottom-0 left-0 p-5 md:p-7">
            <h3 className="font-display text-2xl font-light tracking-[-0.03em] text-background md:text-3xl">
              {cards[0].title}
            </h3>
            <p className="mt-1 text-sm text-background/75">{cards[0].subtitle}</p>
          </div>
        </a>

        {/* 2 cards menores empilhados */}
        <div className="grid gap-3 grid-rows-2">
          {cards.slice(1).map((card) => (
            <a
              key={card.slug}
              href="#"
              className="group relative block overflow-hidden"
            >
              <img
                src={card.img}
                alt={card.alt}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ aspectRatio: "16/9" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/65 via-foreground/10 to-transparent" />
              <div className="absolute bottom-0 left-0 p-4 md:p-6">
                <h3 className="font-display text-xl font-light tracking-[-0.03em] text-background">
                  {card.title}
                </h3>
                <p className="mt-0.5 text-xs text-background/75">{card.subtitle}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Peças da Estação — fiel ao Lovable screenshot 2
// "SELECIONADOS / Peças da estação"
// Grid 2 colunas mobile, badges pretos sólidos, categoria abaixo do nome
// ══════════════════════════════════════════════════════════════════════════════
function PecasDaEstacao() {
  return (
    <section className="bg-canvas py-14 md:py-20">
      <div className="shell">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0">
            <p className="kicker">Selecionados</p>
            <h2 className="display-lg mt-2">Peças da estação</h2>
          </div>
          <a href="#" className="link-underline shrink-0 pb-1 text-[13px] uppercase tracking-[0.12em]">
            Ver tudo
          </a>
        </header>
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 lg:grid-cols-6">
          {PEÇAS_DA_ESTACAO.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 2} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Product Card — fiel ao Lovable: badge preto sólido, categoria abaixo do nome,
// efeito hover troca imagem frente → costas
// ══════════════════════════════════════════════════════════════════════════════
function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [wished, setWished] = useState(false);

  return (
    <article className="group relative">
      <a
        href="#"
        className="block"
        aria-label={product.name}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Container de imagem com efeito hover */}
        <div className="relative overflow-hidden bg-canvas">
          <img
            src={product.images[0]}
            alt={product.name}
            width={900}
            height={1200}
            loading={priority ? "eager" : "lazy"}
            className={`aspect-[3/4] w-full object-cover transition-opacity duration-500 ${hovered ? "opacity-0" : "opacity-100"}`}
          />
          <img
            src={product.images[1]}
            alt=""
            aria-hidden="true"
            width={900}
            height={1200}
            loading="lazy"
            className={`absolute inset-0 aspect-[3/4] w-full object-cover transition-all duration-700 ${hovered ? "scale-100 opacity-100" : "scale-[1.02] opacity-0"}`}
          />
          {/* Badge preto sólido — igual ao Lovable */}
          {product.badge && (
            <span className="absolute left-3 top-3 bg-foreground px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-background">
              {product.badge}
            </span>
          )}
        </div>

        {/* Informações do produto */}
        <div className="mt-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 flex-1 truncate text-[0.9375rem] font-normal leading-snug">
              {product.name}
            </h3>
            <p className="shrink-0 text-[0.9375rem] tabular-nums">{brl(product.price)}</p>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{product.categoryLabel}</p>
            {product.compareAt && (
              <p className="text-xs text-muted-foreground line-through tabular-nums">
                {brl(product.compareAt)}
              </p>
            )}
          </div>
        </div>
      </a>

      {/* Botão favorito flutuante */}
      <button
        type="button"
        onClick={() => setWished((w) => !w)}
        aria-label={wished ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        aria-pressed={wished}
        className="absolute right-2 top-2 grid h-11 w-11 place-items-center text-foreground transition-opacity"
      >
        <Heart
          className={`h-[18px] w-[18px] transition-all ${wished ? "fill-foreground" : ""}`}
          strokeWidth={1.3}
        />
      </button>
    </article>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Lookbook Split — seção do template original
// ══════════════════════════════════════════════════════════════════════════════
function LookbookSplit() {
  return (
    <section className="bg-canvas">
      <div className="grid md:grid-cols-2">
        <img
          src={lookbook1}
          alt="Duas modelos em alfaiataria preta e creme sentadas em banco de gesso"
          width={1200}
          height={1504}
          loading="lazy"
          className="aspect-[4/5] w-full object-cover md:aspect-auto md:h-full"
        />
        <div className="flex flex-col justify-center px-5 py-12 md:px-14 md:py-24">
          <p className="kicker">Lookbook 01</p>
          <h2 className="display-lg mt-3 max-w-md">Alfaiataria que respira</h2>
          <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">
            Lã fria de gramatura média, ombro estruturado sem enchimento e pregas
            que caem retas. Uma silhueta desenhada para durar mais de uma estação.
          </p>
          <a
            href="#"
            className="mt-8 inline-flex h-12 w-fit items-center gap-2 border border-foreground px-7 text-sm uppercase tracking-[0.14em] transition-colors hover:bg-foreground hover:text-background"
          >
            Ver alfaiataria
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Essenciais da Casa
// ══════════════════════════════════════════════════════════════════════════════
function EssenciaisDaCasa() {
  return (
    <section className="shell py-14 md:py-20">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <p className="kicker">Seleção</p>
          <h2 className="display-lg mt-2">Essenciais da casa</h2>
        </div>
        <a href="#" className="link-underline shrink-0 pb-1 text-[13px] uppercase tracking-[0.12em]">
          Ver tudo
        </a>
      </header>
      <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">
        {ESSENCIAIS.slice(0, 4).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Matéria-prima — seção do template original
// ══════════════════════════════════════════════════════════════════════════════
function MateriasPrimas() {
  return (
    <section className="grid md:grid-cols-[1fr_1.2fr]">
      <div className="order-2 flex flex-col justify-center px-5 py-12 md:order-1 md:px-14 md:py-24">
        <p className="kicker">Matéria-prima</p>
        <h2 className="display-lg mt-3 max-w-md">Poucos tecidos, bem escolhidos</h2>
        <dl className="mt-8 max-w-md space-y-5 text-sm">
          {[
            { t: "Cashmere de fio duplo", d: "Fiado na Itália, canelado largo que mantém a forma." },
            { t: "Linho lavado", d: "Amaciado antes do corte, amassa com elegância." },
            { t: "Couro curtido a vegetal", d: "Sem cromo, ganha pátina própria com o uso." },
          ].map((item) => (
            <div key={item.t} className="border-t border-border pt-4">
              <dt className="uppercase tracking-[0.1em]">{item.t}</dt>
              <dd className="mt-1 text-muted-foreground">{item.d}</dd>
            </div>
          ))}
        </dl>
      </div>
      <img
        src={lookbook2}
        alt="Detalhe de tricô de cashmere creme e cetim cinza"
        width={1200}
        height={912}
        loading="lazy"
        className="order-1 aspect-[4/3] w-full object-cover md:order-2 md:aspect-auto md:h-full"
      />
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Serviços — 3 colunas
// ══════════════════════════════════════════════════════════════════════════════
function Servicos() {
  return (
    <section className="shell py-14 md:py-20">
      <ul className="grid gap-8 border-t border-border pt-10 sm:grid-cols-3">
        {[
          { t: "Frete grátis", d: "Em pedidos acima de R$ 499 para todo o Brasil." },
          { t: "Troca em 30 dias", d: "Primeira troca sem custo, com etiqueta pronta." },
          { t: "Ajuste sob medida", d: "Barra e cintura ajustadas no ateliê, sem taxa." },
        ].map((s) => (
          <li key={s.t}>
            <h3 className="text-sm uppercase tracking-[0.12em]">{s.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Footer — fiel ao template original com newsletter
// ══════════════════════════════════════════════════════════════════════════════
function StoreFooter() {
  return (
    <footer className="mt-10 border-t border-border">
      <div className="shell py-14 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Marca + newsletter */}
          <div className="max-w-sm">
            <a href="#" className="font-display text-xl tracking-[-0.04em]">
              ATELIER
            </a>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Peças de guarda-roupa desenhadas em São Paulo e produzidas em
              pequenos lotes por ateliês parceiros.
            </p>
            <form className="mt-8" onSubmit={(e) => e.preventDefault()} aria-label="Assinar novidades">
              <label htmlFor="at-email" className="kicker">Novidades</label>
              <div className="mt-3 flex border-b border-foreground">
                <input
                  id="at-email"
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

          {/* Loja */}
          <nav aria-label="Loja">
            <h2 className="kicker">Loja</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {CATS.map((c) => (
                <li key={c.slug}>
                  <a href="#" className="link-underline text-muted-foreground transition-colors hover:text-foreground">
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Atendimento */}
          <nav aria-label="Atendimento">
            <h2 className="kicker">Atendimento</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {["Sobre", "Contato", "Perguntas frequentes", "Trocas e devoluções"].map((l) => (
                <li key={l}>
                  <a href="#" className="link-underline text-muted-foreground transition-colors hover:text-foreground">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Atelier. Template de demonstração.</p>
          <p>Frete grátis acima de R$ 499 · Troca em até 30 dias</p>
        </div>
      </div>
    </footer>
  );
}
