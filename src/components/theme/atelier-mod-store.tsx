import { useEffect, useState } from "react";
import { ArrowRight, Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import heroImg from "@/assets/store/hero.jpg";
import {
  lookbook1,
  lookbook2,
  STORE_PRODUCTS,
  STORE_CATEGORIES,
  brl,
  type StoreProduct,
} from "@/data/store-products";

// ── Dados de navegação secundária ─────────────────────────────────────────────
const SECONDARY_NAV = [
  { label: "Lookbook", href: "#" },
  { label: "Atendimento", href: "#" },
  { label: "Trocas", href: "#" },
];

// ══════════════════════════════════════════════════════════════════════════════
// AtelierModStore — vitrine fiel ao template original do Lovable
// Usa o CSS class .atelier-theme para variáveis e utilitários isolados.
// ══════════════════════════════════════════════════════════════════════════════
export function AtelierModStore() {
  const novidades = STORE_PRODUCTS.slice(0, 6);
  const essenciais = STORE_PRODUCTS.slice(6, 14);

  return (
    <div className="atelier-theme min-h-screen">
      <AtelierHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative">
        <img
          src={heroImg}
          alt="Modelo vestindo vestido de linho off-white com casaco de lã preto sobre o ombro"
          width={1600}
          height={1200}
          className="h-[78svh] w-full object-cover object-[62%_center] md:h-[86svh] md:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/45 via-foreground/5 to-transparent md:bg-gradient-to-r md:from-foreground/35 md:via-transparent md:to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="shell pb-8 md:pb-16">
            <p className="text-[11px] uppercase tracking-[0.2em] text-background/80">
              Coleção Outono 26
            </p>
            <h1 className="display-xl mt-3 max-w-3xl text-background">
              O essencial,
              <br />
              refeito à mão
            </h1>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#"
                className="inline-block h-13 bg-background px-8 text-center text-sm uppercase tracking-[0.14em] leading-[3.25rem] text-foreground transition-opacity hover:opacity-90"
              >
                Ver a coleção
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categorias ───────────────────────────────────────────────────── */}
      <section className="border-b border-border py-6">
        <div className="shell">
          <ul className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {STORE_CATEGORIES.map((c) => (
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

      {/* ── Novidades ────────────────────────────────────────────────────── */}
      <section className="shell py-14 md:py-20">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0">
            <p className="kicker">Chegou agora</p>
            <h2 className="display-lg mt-2">Novidades</h2>
          </div>
          <a
            href="#"
            className="link-underline shrink-0 pb-1 text-[13px] uppercase tracking-[0.12em]"
          >
            Ver tudo
          </a>
        </header>
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 lg:grid-cols-6">
          {novidades.map((p, i) => (
            <AtelierProductCard key={p.id} product={p} priority={i < 2} />
          ))}
        </div>
      </section>

      {/* ── Lookbook split ───────────────────────────────────────────────── */}
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
              Lã fria de gramatura média, ombro estruturado sem enchimento e
              pregas que caem retas. Uma silhueta desenhada para durar mais de
              uma estação.
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

      {/* ── Essenciais ───────────────────────────────────────────────────── */}
      <section className="shell py-14 md:py-20">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0">
            <p className="kicker">Seleção</p>
            <h2 className="display-lg mt-2">Essenciais da casa</h2>
          </div>
          <a
            href="#"
            className="link-underline shrink-0 pb-1 text-[13px] uppercase tracking-[0.12em]"
          >
            Ver tudo
          </a>
        </header>
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">
          {essenciais.map((p) => (
            <AtelierProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ── Matéria-prima ────────────────────────────────────────────────── */}
      <section className="grid md:grid-cols-[1fr_1.2fr]">
        <div className="order-2 flex flex-col justify-center px-5 py-12 md:order-1 md:px-14 md:py-24">
          <p className="kicker">Matéria-prima</p>
          <h2 className="display-lg mt-3 max-w-md">Poucos tecidos, bem escolhidos</h2>
          <dl className="mt-8 max-w-md space-y-5 text-sm">
            {[
              {
                t: "Cashmere de fio duplo",
                d: "Fiado na Itália, canelado largo que mantém a forma.",
              },
              {
                t: "Linho lavado",
                d: "Amaciado antes do corte, amassa com elegância.",
              },
              {
                t: "Couro curtido a vegetal",
                d: "Sem cromo, ganha pátina própria com o uso.",
              },
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
          alt="Detalhe de tricô de cashmere creme e cetim cinza sobre superfície de gesso"
          width={1200}
          height={912}
          loading="lazy"
          className="order-1 aspect-[4/3] w-full object-cover md:order-2 md:aspect-auto md:h-full"
        />
      </section>

      {/* ── Serviços ─────────────────────────────────────────────────────── */}
      <section className="shell py-14 md:py-20">
        <ul className="grid gap-8 border-t border-border pt-10 sm:grid-cols-3">
          {[
            { t: "Frete grátis", d: "Em pedidos acima de R$ 599 para todo o Brasil." },
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

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <AtelierFooter />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Header — com announcement bar, sticky glassmorphism e menu mobile
// ══════════════════════════════════════════════════════════════════════════════
function AtelierHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Trava scroll do body quando menu mobile está aberto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-foreground px-4 py-2 text-center text-[11px] uppercase tracking-[0.16em] text-background">
        Frete grátis acima de R$ 599
      </div>

      {/* Header principal sticky */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="shell grid h-14 grid-cols-[auto_1fr_auto] items-center gap-2 md:h-16">
          {/* Lado esquerdo — hamburger mobile + nav desktop */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              className="grid h-11 w-11 place-items-center lg:hidden"
            >
              <Menu className="h-5 w-5" strokeWidth={1.4} />
            </button>
            <nav className="hidden items-center gap-6 lg:flex" aria-label="Categorias">
              {STORE_CATEGORIES.slice(0, 5).map((c) => (
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

          {/* Centro — logo */}
          <div className="min-w-0 text-center">
            <a href="#" className="font-display text-[1.0625rem] tracking-[-0.03em] md:text-xl">
              ATELIER MOD
            </a>
          </div>

          {/* Lado direito — ícones */}
          <div className="flex items-center justify-end">
            <a href="#" aria-label="Buscar produtos" className="grid h-11 w-11 place-items-center">
              <Search className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </a>
            <a
              href="#"
              aria-label="Favoritos"
              className="relative hidden h-11 w-11 place-items-center sm:grid"
            >
              <Heart className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </a>
            <a href="#" aria-label="Minha conta" className="hidden h-11 w-11 place-items-center sm:grid">
              <User className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </a>
            <a href="#" aria-label="Sacola" className="relative grid h-11 w-11 place-items-center">
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </a>
          </div>
        </div>
      </header>

      {/* Menu mobile full-screen — slide-in */}
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
            className="grid h-11 w-11 place-items-center"
          >
            <X className="h-5 w-5" strokeWidth={1.4} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-5 py-6" aria-label="Navegação principal">
          <ul className="space-y-1">
            <li>
              <a
                href="#"
                className="flex h-12 items-center font-display text-[1.75rem] tracking-[-0.04em]"
              >
                Todos os produtos
              </a>
            </li>
            {STORE_CATEGORIES.map((c) => (
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
            {SECONDARY_NAV.map((s) => (
              <li key={s.href}>
                <a href={s.href} className="flex h-11 items-center">
                  {s.label}
                </a>
              </li>
            ))}
            <li>
              <a href="#" className="flex h-11 items-center">
                Minha conta
              </a>
            </li>
            <li>
              <a href="#" className="flex h-11 items-center">
                Favoritos
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Product Card — efeito hover troca imagem frente → costas (group)
// ══════════════════════════════════════════════════════════════════════════════
function AtelierProductCard({
  product,
  priority = false,
}: {
  product: StoreProduct;
  priority?: boolean;
}) {
  const front = product.images[0] ?? "";
  const back = product.images[1] ?? front;

  return (
    <article className="group relative">
      <a href="#" className="block" aria-label={product.name}>
        {/* Imagem com hover swap */}
        <div className="relative overflow-hidden bg-canvas">
          {/* Imagem frente */}
          <img
            src={front}
            alt={product.name}
            width={900}
            height={1200}
            loading={priority ? "eager" : "lazy"}
            className="at-img-front aspect-[3/4] w-full object-cover transition-opacity duration-500"
          />
          {/* Imagem costas (aparece no hover via CSS .atelier-theme) */}
          <img
            src={back}
            alt=""
            aria-hidden="true"
            width={900}
            height={1200}
            loading="lazy"
            className="at-img-back absolute inset-0 aspect-[3/4] w-full scale-[1.02] object-cover opacity-0 transition-all duration-700"
          />
          {/* Badge */}
          {product.badge && (
            <span className="absolute left-3 top-3 bg-background/90 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-foreground backdrop-blur">
              {product.badge}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[0.9375rem] font-normal leading-snug">
              {product.name}
            </h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[0.9375rem] tabular-nums">{brl(product.price)}</p>
            {product.compareAt && (
              <p className="text-xs text-muted-foreground line-through tabular-nums">
                {brl(product.compareAt)}
              </p>
            )}
          </div>
        </div>
      </a>

      {/* Botão de favorito flutuante */}
      <button
        type="button"
        aria-label="Adicionar aos favoritos"
        className="absolute right-2 top-2 grid h-11 w-11 place-items-center text-foreground transition-opacity"
      >
        <Heart className="h-[18px] w-[18px]" strokeWidth={1.3} />
      </button>
    </article>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Footer — grid responsivo 3 colunas → 1 coluna no mobile
// ══════════════════════════════════════════════════════════════════════════════
function AtelierFooter() {
  return (
    <footer className="border-t border-border mt-10">
      <div className="shell py-14 md:py-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          {/* Marca */}
          <div>
            <a href="#" className="font-display text-xl tracking-[-0.04em]">
              ATELIER MOD
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Peças de guarda-roupa desenhadas em São Paulo e produzidas em
              pequenos lotes por ateliês parceiros.
            </p>
          </div>

          {/* Loja */}
          <nav aria-label="Loja">
            <h2 className="kicker mb-4">Loja</h2>
            <ul className="space-y-2.5">
              {STORE_CATEGORIES.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Atendimento */}
          <nav aria-label="Atendimento">
            <h2 className="kicker mb-4">Atendimento</h2>
            <ul className="space-y-2.5">
              {["Sobre", "Contato", "FAQ", "Trocas e devoluções"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Atelier Mod. Template de demonstração.</p>
          <p>Frete grátis acima de R$ 599 · Troca em até 30 dias</p>
        </div>
      </div>
    </footer>
  );
}
