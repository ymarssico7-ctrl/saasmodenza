import heroImg from "@/assets/store/hero.jpg";
import { lookbook1, lookbook2, STORE_PRODUCTS, STORE_CATEGORIES, brl, type StoreProduct } from "@/data/store-products";
import { ArrowRight } from "lucide-react";

// ── Componente Principal da Vitrine (Atelier Mod fiel ao original) ─────────────
export function AtelierModStore() {
  const novidades = STORE_PRODUCTS.slice(0, 6);
  const essenciais = STORE_PRODUCTS.slice(6, 10);

  return (
    <div className="atelier-store min-h-screen bg-[--at-bg] text-[--at-fg]" style={{
      "--at-bg": "#F5F4F0",
      "--at-fg": "#1C1A16",
      "--at-canvas": "#ECEAE4",
      "--at-border": "#DEDAD2",
      "--at-muted": "#7A7672",
      fontFamily: "'Figtree', 'Outfit', ui-sans-serif, system-ui, sans-serif",
    } as React.CSSProperties}>

      {/* ── Announcement Bar ── */}
      <div style={{
        background: "var(--at-fg)",
        color: "var(--at-bg)",
        padding: "8px 16px",
        textAlign: "center",
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.16em",
      }}>
        Frete grátis acima de R$ 599
      </div>

      {/* ── Header ── */}
      <header style={{
        borderBottom: "1px solid var(--at-border)",
        background: "rgba(245,244,240,0.88)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}>
        <div className="at-shell" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", height: "64px", gap: "16px" }}>
          <nav style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            {STORE_CATEGORIES.slice(0, 4).map((c) => (
              <a
                key={c.slug}
                href="#"
                style={{
                  fontSize: "13px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--at-fg)",
                  textDecoration: "none",
                }}
              >
                {c.label}
              </a>
            ))}
          </nav>
          <div style={{ textAlign: "center" }}>
            <a href="#" style={{
              fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif",
              fontSize: "17px",
              letterSpacing: "-0.03em",
              color: "var(--at-fg)",
              textDecoration: "none",
            }}>
              ATELIER MOD
            </a>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <a href="#" style={{ width: 44, height: 44, display: "grid", placeItems: "center", color: "var(--at-fg)", textDecoration: "none", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em" }}>🔍</a>
            <a href="#" style={{ width: 44, height: 44, display: "grid", placeItems: "center", color: "var(--at-fg)", textDecoration: "none", fontSize: "18px" }}>🛍</a>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ position: "relative" }}>
        <img
          src={heroImg}
          alt="Modelo vestindo vestido de linho off-white com casaco de lã preto sobre o ombro"
          style={{
            width: "100%",
            height: "86svh",
            objectFit: "cover",
            objectPosition: "62% center",
            display: "block",
          }}
        />
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(28,26,22,0.45) 0%, rgba(28,26,22,0.05) 50%, transparent 100%)",
        }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <div className="at-shell" style={{ paddingBottom: "64px" }}>
            <p style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(245,244,240,0.8)",
              margin: 0,
            }}>
              Coleção Outono 26
            </p>
            <h1 style={{
              fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif",
              fontWeight: 300,
              fontSize: "clamp(2.5rem, 11vw, 7rem)",
              lineHeight: 0.94,
              letterSpacing: "-0.045em",
              color: "#F5F4F0",
              marginTop: "12px",
              marginBottom: "28px",
            }}>
              O essencial,<br />refeito à mão
            </h1>
            <a
              href="#"
              style={{
                display: "inline-block",
                height: "52px",
                lineHeight: "52px",
                padding: "0 32px",
                background: "#F5F4F0",
                color: "#1C1A16",
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                textDecoration: "none",
              }}
            >
              Ver a coleção
            </a>
          </div>
        </div>
      </section>

      {/* ── Barra de Categorias ── */}
      <section style={{ borderBottom: "1px solid var(--at-border)", padding: "24px 0" }}>
        <div className="at-shell">
          <ul style={{ display: "flex", gap: "8px", overflowX: "auto", listStyle: "none", margin: 0, padding: 0 }}>
            {STORE_CATEGORIES.map((c) => (
              <li key={c.slug} style={{ flexShrink: 0 }}>
                <a
                  href="#"
                  style={{
                    display: "inline-flex",
                    height: "40px",
                    alignItems: "center",
                    padding: "0 16px",
                    border: "1px solid var(--at-border)",
                    fontSize: "13px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--at-fg)",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    transition: "border-color 0.2s",
                  }}
                >
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Novidades ── */}
      <section className="at-shell" style={{ paddingTop: "80px", paddingBottom: "80px" }}>
        <header style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "flex-end", gap: "16px", marginBottom: "32px" }}>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--at-muted)", margin: 0 }}>Chegou agora</p>
            <h2 style={{ fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif", fontWeight: 300, fontSize: "clamp(1.875rem, 6vw, 3.5rem)", lineHeight: 1, letterSpacing: "-0.04em", margin: "8px 0 0 0" }}>Novidades</h2>
          </div>
          <a href="#" style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--at-fg)", textDecoration: "none", paddingBottom: "4px" }}>
            Ver tudo
          </a>
        </header>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px 12px" }}>
          {novidades.map((p, i) => (
            <StoreProductCard key={p.id} product={p} priority={i < 2} />
          ))}
        </div>
      </section>

      {/* ── Lookbook Split 01 ── */}
      <section style={{ background: "var(--at-canvas)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <img
            src={lookbook1}
            alt="Duas modelos em alfaiataria preta e creme"
            style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block" }}
          />
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "64px 56px" }}>
            <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--at-muted)", margin: "0 0 12px 0" }}>Lookbook 01</p>
            <h2 style={{ fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif", fontWeight: 300, fontSize: "clamp(1.875rem, 4vw, 3rem)", lineHeight: 1, letterSpacing: "-0.04em", margin: "0 0 20px 0", maxWidth: "400px" }}>
              Alfaiataria que respira
            </h2>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "var(--at-muted)", maxWidth: "400px", margin: "0 0 32px 0" }}>
              Lã fria de gramatura média, ombro estruturado sem enchimento e pregas que caem retas. Uma silhueta desenhada para durar mais de uma estação.
            </p>
            <a
              href="#"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                height: "48px",
                padding: "0 28px",
                border: "1px solid var(--at-fg)",
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--at-fg)",
                textDecoration: "none",
                width: "fit-content",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              Ver alfaiataria
              <ArrowRight size={16} strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </section>

      {/* ── Essenciais ── */}
      <section className="at-shell" style={{ paddingTop: "80px", paddingBottom: "80px" }}>
        <header style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "flex-end", gap: "16px", marginBottom: "32px" }}>
          <div>
            <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--at-muted)", margin: 0 }}>Seleção</p>
            <h2 style={{ fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif", fontWeight: 300, fontSize: "clamp(1.875rem, 6vw, 3.5rem)", lineHeight: 1, letterSpacing: "-0.04em", margin: "8px 0 0 0" }}>Essenciais da casa</h2>
          </div>
          <a href="#" style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--at-fg)", textDecoration: "none", paddingBottom: "4px" }}>
            Ver tudo
          </a>
        </header>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px 20px" }}>
          {essenciais.map((p) => (
            <StoreProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ── Matéria-Prima ── */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "64px 56px", order: 1 }}>
          <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--at-muted)", margin: "0 0 12px 0" }}>Matéria-prima</p>
          <h2 style={{ fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif", fontWeight: 300, fontSize: "clamp(1.875rem, 4vw, 3rem)", lineHeight: 1, letterSpacing: "-0.04em", margin: "0 0 32px 0", maxWidth: "400px" }}>
            Poucos tecidos, bem escolhidos
          </h2>
          <dl style={{ maxWidth: "400px", margin: 0, padding: 0 }}>
            {[
              { t: "Cashmere de fio duplo", d: "Fiado na Itália, canelado largo que mantém a forma." },
              { t: "Linho lavado", d: "Amaciado antes do corte, amassa com elegância." },
              { t: "Couro curtido a vegetal", d: "Sem cromo, ganha pátina própria com o uso." },
            ].map((item) => (
              <div key={item.t} style={{ borderTop: "1px solid var(--at-border)", paddingTop: "16px", marginTop: "16px" }}>
                <dt style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{item.t}</dt>
                <dd style={{ fontSize: "14px", color: "var(--at-muted)", marginTop: "4px", marginLeft: 0 }}>{item.d}</dd>
              </div>
            ))}
          </dl>
        </div>
        <img
          src={lookbook2}
          alt="Detalhe de tricô de cashmere creme e cetim cinza"
          style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block", order: 2 }}
        />
      </section>

      {/* ── Serviços ── */}
      <section className="at-shell" style={{ paddingTop: "56px", paddingBottom: "56px" }}>
        <ul style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "32px", borderTop: "1px solid var(--at-border)", paddingTop: "40px", listStyle: "none", margin: 0, padding: "40px 0 0 0" }}>
          {[
            { t: "Frete grátis", d: "Em pedidos acima de R$ 599 para todo o Brasil." },
            { t: "Troca em 30 dias", d: "Primeira troca sem custo, com etiqueta pronta." },
            { t: "Ajuste sob medida", d: "Barra e cintura ajustadas no ateliê, sem taxa." },
          ].map((s) => (
            <li key={s.t}>
              <h3 style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 8px 0" }}>{s.t}</h3>
              <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--at-muted)", margin: 0 }}>{s.d}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--at-border)", marginTop: "40px" }}>
        <div className="at-shell" style={{ paddingTop: "56px", paddingBottom: "56px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "48px" }}>
            <div style={{ maxWidth: "400px" }}>
              <a href="#" style={{ fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif", fontSize: "20px", letterSpacing: "-0.04em", color: "var(--at-fg)", textDecoration: "none" }}>
                ATELIER MOD
              </a>
              <p style={{ fontSize: "14px", lineHeight: 1.7, color: "var(--at-muted)", marginTop: "16px" }}>
                Peças de guarda-roupa desenhadas em São Paulo e produzidas em pequenos lotes por ateliês parceiros.
              </p>
            </div>
            <nav>
              <h2 style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--at-muted)", margin: "0 0 16px 0" }}>Loja</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                {STORE_CATEGORIES.slice(0, 5).map((c) => (
                  <li key={c.slug}><a href="#" style={{ fontSize: "14px", color: "var(--at-muted)", textDecoration: "none" }}>{c.label}</a></li>
                ))}
              </ul>
            </nav>
            <nav>
              <h2 style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--at-muted)", margin: "0 0 16px 0" }}>Atendimento</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                {["Sobre", "Contato", "FAQ", "Trocas e devoluções"].map((l) => (
                  <li key={l}><a href="#" style={{ fontSize: "14px", color: "var(--at-muted)", textDecoration: "none" }}>{l}</a></li>
                ))}
              </ul>
            </nav>
          </div>
          <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid var(--at-border)", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--at-muted)" }}>
            <p style={{ margin: 0 }}>© {new Date().getFullYear()} Atelier Mod. Template de demonstração.</p>
            <p style={{ margin: 0 }}>Frete grátis acima de R$ 599 · Troca em até 30 dias</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Product Card interno (independente do ShopContext para o preview) ───────────
function StoreProductCard({ product, priority = false }: { product: StoreProduct; priority?: boolean }) {
  const front = product.images[0] ?? "";
  const back = product.images[1] ?? front;

  return (
    <article style={{ position: "relative" }}>
      <a href="#" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
        <div style={{ position: "relative", overflow: "hidden", background: "var(--at-canvas)", aspectRatio: "3/4" }}>
          <img
            src={front}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {product.badge && (
            <span style={{
              position: "absolute",
              left: "12px",
              top: "12px",
              background: "rgba(245,244,240,0.92)",
              padding: "4px 8px",
              fontSize: "10px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              backdropFilter: "blur(4px)",
            }}>
              {product.badge}
            </span>
          )}
        </div>
        <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: "15px", fontWeight: 400, margin: "0 0 4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</h3>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: "15px", margin: 0, fontVariantNumeric: "tabular-nums" }}>{brl(product.price)}</p>
            {product.compareAt && (
              <p style={{ fontSize: "12px", color: "var(--at-muted)", textDecoration: "line-through", margin: "2px 0 0 0", fontVariantNumeric: "tabular-nums" }}>{brl(product.compareAt)}</p>
            )}
          </div>
        </div>
      </a>
    </article>
  );
}
