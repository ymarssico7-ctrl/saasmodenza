import type { ThemeConfig } from "./schema";

// ── Storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = "modaly_theme_config";

export function loadTheme(): ThemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ThemeConfig;
  } catch {
    // ignore parse errors
  }
  return TEMPLATE_02_THEME;
}

export function saveTheme(theme: ThemeConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  // Notifica outras abas e componentes que escutam o evento (ex: /loja/preview)
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    window.dispatchEvent(new CustomEvent("theme-changed", { detail: theme }));
  } catch {
    // SSR / Node: ignorar
  }
}

// ── Font Google URLs ───────────────────────────────────────────────────────────
export const FONT_URLS: Record<string, string> = {
  // Fontes do Template 01 (Atelier Nove)
  "Cormorant Garamond":
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap",
  Jost:
    "https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap",
  // Fontes extras disponíveis para personalização
  Outfit:
    "https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500&display=swap",
  Figtree:
    "https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600&display=swap",
  "Playfair Display":
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap",
  Sora: "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap",
  "DM Serif Display":
    "https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap",
  "Libre Baskerville":
    "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap",
  Manrope:
    "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap",
  Inter:
    "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  "DM Sans":
    "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap",
  "Plus Jakarta Sans":
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap",
};

// ── Default Theme (Atelier Mod) ────────────────────────────────────────────────
//
// FONTE DA VERDADE: atelier-mod-template/
//   ├── src/routes/index.tsx          — estrutura das seções e textos
//   ├── src/components/store/site-header.tsx — nome, banner
//   ├── src/components/store/site-footer.tsx — rodapé
//   ├── src/styles.css                — cores oklch exatas
//   └── src/data/products.ts         — produtos de demonstração
//
// REGRA: Todos os valores abaixo são LITERAIS dos arquivos originais acima.
//        imageUrl: "" → o componente usa o asset local (hero.jpg, lookbook-1.jpg, etc.)
//        Nunca usar URLs do Unsplash aqui.
//
export const ATELIER_MOD_THEME: ThemeConfig = {
  settings: {
    // ── Identidade (site-header.tsx: "ATELIER MOD") ─────────────────────────
    storeName: "ATELIER MOD",
    tagline: "Moda atemporal em pequenos lotes",

    // ── Banner (site-header.tsx line 32-34) ──────────────────────────────────
    freeShippingBanner: "Frete grátis acima de R$ 599",
    freeShippingBannerEnabled: true,

    // ── Cores (styles.css :root — valores oklch exatos) ────────────────────
    // --background: oklch(0.963 0.008 85)
    colorBackground: "oklch(0.963 0.008 85)",
    // --foreground: oklch(0.155 0.002 60)
    colorForeground: "oklch(0.155 0.002 60)",
    // --primary: oklch(0.155 0.002 60)  (preto profundo = ink)
    colorPrimary: "oklch(0.155 0.002 60)",
    // --canvas: oklch(0.915 0.008 82)  (off-white levemente mais escuro)
    colorCanvas: "oklch(0.915 0.008 82)",
    // --border: oklch(0.862 0.008 82)
    colorBorder: "oklch(0.862 0.008 82)",

    // ── Tipografia (styles.css @theme inline) ──────────────────────────────
    // --font-display: "Outfit"
    // --font-sans:    "Figtree"
    fontDisplay: "Outfit",
    fontBody: "Figtree",

    // ── Forma ──────────────────────────────────────────────────────────────
    // --radius: 4px  (estilo editorializado — quase quadrado)
    borderRadius: "none",
  },

  order: ["hero", "cat-bar", "grid-new", "split-1", "grid-ess", "split-2", "features"],

  sections: [
    // ── HERO (index.tsx lines 34-63) ────────────────────────────────────────
    {
      id: "hero",
      type: "hero",
      visible: true,
      settings: {
        // index.tsx line 48-52:
        //   <h1 className="display-xl mt-3 max-w-3xl text-background">
        //     O essencial,<br />refeito à mão
        //   </h1>
        heading: "O essencial,\nrefeito à mão",
        // index.tsx line 45-47:
        //   <p className="text-[11px] uppercase tracking-[0.2em] text-background/80">
        //     Coleção Outono 26
        //   </p>
        subheading: "Coleção Outono 26",
        // index.tsx line 54-59: "Ver a coleção"
        buttonText: "Ver a coleção",
        // imageUrl vazio → componente usa heroImg (hero.jpg) como fallback
        imageUrl: "",
        imageAlt:
          "Modelo vestindo vestido de linho off-white com casaco de lã preto sobre o ombro",
        // index.tsx line 40: object-[62%_center]
        imagePosition: "62% center",
        // index.tsx line 42: from-foreground/45
        overlayOpacity: 45,
      },
    },

    // ── BARRA DE CATEGORIAS (index.tsx lines 65-82) ─────────────────────────
    {
      id: "cat-bar",
      type: "category_bar",
      visible: true,
      settings: { enabled: true },
    },

    // ── NOVIDADES — primeiro grid (index.tsx lines 84-104) ──────────────────
    {
      id: "grid-new",
      type: "product_grid",
      visible: true,
      settings: {
        // index.tsx line 88: <p className="kicker">Chegou agora</p>
        kicker: "Chegou agora",
        // index.tsx line 89: <h2 className="display-lg mt-2">Novidades</h2>
        title: "Novidades",
        source: "newest",
        // index.tsx line 28: const novidades = PRODUCTS.slice(0, 6)
        count: 6,
        // index.tsx line 99: lg:grid-cols-6
        columns: 6,
        showViewAll: true,
      },
    },

    // ── LOOKBOOK SPLIT (index.tsx lines 106-136) ────────────────────────────
    {
      id: "split-1",
      type: "image_text_split",
      visible: true,
      settings: {
        // index.tsx line 118: <p className="kicker">Lookbook 01</p>
        kicker: "Lookbook 01",
        // index.tsx line 119-121:
        //   <h2 className="display-lg mt-3 max-w-md">
        //     Alfaiataria que respira
        //   </h2>
        heading: "Alfaiataria que respira",
        // index.tsx line 122-125:
        body: "Lã fria de gramatura média, ombro estruturado sem enchimento e pregas que caem retas. Uma silhueta desenhada para durar mais de uma estação.",
        // index.tsx line 131: "Ver alfaiataria"
        buttonText: "Ver alfaiataria",
        // imageUrl vazio → componente usa lookbook1 (lookbook-1.jpg) como fallback
        imageUrl: "",
        imageAlt:
          "Duas modelos em alfaiataria preta e creme sentadas em banco de gesso",
        imagePosition: "right",
        // index.tsx line 107: <section className="bg-canvas">
        backgroundColor: "canvas",
      },
    },

    // ── ESSENCIAIS — segundo grid (index.tsx lines 138-158) ─────────────────
    {
      id: "grid-ess",
      type: "product_grid",
      visible: true,
      settings: {
        // index.tsx line 142: <p className="kicker">Seleção</p>
        kicker: "Seleção",
        // index.tsx line 143: <h2 className="display-lg mt-2">Essenciais da casa</h2>
        title: "Essenciais da casa",
        source: "featured",
        // index.tsx line 29: const essenciais = PRODUCTS.slice(6, 14) → 8 itens
        count: 8,
        // index.tsx line 153: md:grid-cols-4
        columns: 4,
        showViewAll: true,
      },
    },

    // ── MATÉRIA-PRIMA split (index.tsx lines 160-194) ───────────────────────
    {
      id: "split-2",
      type: "image_text_split",
      visible: true,
      settings: {
        // index.tsx line 163: <p className="kicker">Matéria-prima</p>
        kicker: "Matéria-prima",
        // index.tsx line 164: <h2 className="display-lg mt-3 max-w-md">Poucos tecidos, bem escolhidos</h2>
        heading: "Poucos tecidos, bem escolhidos",
        body: "Cashmere de fio duplo fiado na Itália, linho lavado amaciado antes do corte e couro curtido a vegetal — sem cromo, que ganha pátina própria com o uso.",
        buttonText: "Conhecer os materiais",
        // imageUrl vazio → usa lookbook2 (lookbook-2.jpg) como fallback
        imageUrl: "",
        imageAlt:
          "Detalhe de tricô de cashmere creme e cetim cinza sobre superfície de gesso",
        imagePosition: "left",
        backgroundColor: "background",
      },
    },

    // ── SERVIÇOS (index.tsx lines 196-213) ──────────────────────────────────
    {
      id: "features",
      type: "features",
      visible: true,
      settings: {
        items: [
          // index.tsx line 200-202:
          {
            title: "Frete grátis",
            description: "Em pedidos acima de R$ 599 para todo o Brasil.",
          },
          // index.tsx line 203:
          {
            title: "Troca em 30 dias",
            description: "Primeira troca sem custo, com etiqueta pronta.",
          },
          // index.tsx line 204:
          {
            title: "Ajuste sob medida",
            description: "Barra e cintura ajustadas no ateliê, sem taxa.",
          },
        ],
      },
    },
  ],
};

// ── Template 01 — "Atelier Nove" ─────────────────────────────────────────────
// FONTE DA VERDADE: c:\Users\yande\Downloads\Modaly 2.0\template 01\src\styles.css
// REGRA: Todos os valores abaixo são LITERAIS do arquivo original acima.
export const TEMPLATE_01_THEME: ThemeConfig = {
  settings: {
    storeName: "Nove",
    tagline: "Moda atemporal em edições limitadas",
    freeShippingBanner: "Frete cortesia acima de R$ 800 · Troca sem custo em 30 dias",
    freeShippingBannerEnabled: true,
    // Cores — idênticas ao :root do template 01/src/styles.css
    colorBackground: "oklch(0.98 0.006 85)",
    colorForeground: "oklch(0.28 0.008 60)",
    colorPrimary: "oklch(0.28 0.008 60)",
    colorCanvas: "oklch(0.945 0.012 82)",
    colorBorder: "oklch(0.9 0.012 82)",
    // Tipografia — Cormorant Garamond (serif) + Jost (sans)
    fontDisplay: "Cormorant Garamond",
    fontBody: "Manrope",
    // Border radius mínimo — estilo editorial
    borderRadius: "none",
  },
  order: ["t01-hero", "t01-features"],
  sections: [
    {
      id: "t01-hero",
      type: "hero",
      visible: true,
      settings: {
        heading: "A elegância que\nnão pede licença",
        subheading: "Inverno 26",
        buttonText: "Ver a coleção",
        imageUrl: "",
        imageAlt: "Modelo com sobretudo de lã marfim em galeria minimalista",
        imagePosition: "center",
        overlayOpacity: 30,
      },
    },
    {
      id: "t01-features",
      type: "features",
      visible: true,
      settings: {
        items: [
          { title: "Frete cortesia", description: "Acima de R$ 800 para todo o Brasil" },
          { title: "Troca simples", description: "30 dias, sem custo e sem burocracia" },
          { title: "Pagamento seguro", description: "Até 6x sem juros ou Pix com 5% off" },
          { title: "Atendimento pessoal", description: "Consultoria de estilo por WhatsApp" },
        ],
      },
    },
  ],
};

// ── Border Radius Map ─────────────────────────────────────────────────────────
export const RADIUS_MAP: Record<string, string> = {
  none: "2px",
  sm: "4px",
  md: "8px",
  lg: "16px",
  full: "9999px",
};

// ── Template 02 — "Atelie Minimalist" ────────────────────────────────────────
// FONTE DA VERDADE: c:\Users\yande\Downloads\Modaly 2.0\atelie-loja\src\styles.css
// REGRA: Todos os valores abaixo são LITERAIS do arquivo original acima.
export const TEMPLATE_02_THEME: ThemeConfig = {
  settings: {
    templateId: "template-02",
    storeName: "Atelie",
    tagline: "Moda atemporal em pequenos lotes",
    freeShippingBanner: "Frete grátis acima de R$ 500 · Trocas em 30 dias",
    freeShippingBannerEnabled: true,
    // Cores — idênticas ao :root do atelie-loja/src/styles.css
    colorBackground: "oklch(0.962 0.006 85)",
    colorForeground: "oklch(0.155 0 0)",
    colorPrimary: "oklch(0.155 0 0)",
    colorCanvas: "oklch(0.914 0.009 85)",
    colorBorder: "oklch(0.874 0.009 85)",
    // Tipografia — Outfit (display) + Figtree (sans)
    fontDisplay: "Outfit",
    fontBody: "Figtree",
    // Border radius mínimo — estilo editorial
    borderRadius: "none",
  },
  order: ["t02-hero", "t02-grid", "t02-split", "t02-features"],
  sections: [
    {
      id: "t02-hero",
      type: "hero",
      visible: true,
      settings: {
        heading: "Silêncio,\nestrutura, tempo.",
        subheading: "Coleção Inverno 26",
        buttonText: "Ver a coleção",
        imageUrl: "",
        imageAlt: "Modelo com casaco de alfaiataria cru em galeria minimalista",
        imagePosition: "center",
        overlayOpacity: 20,
      },
    },
    {
      id: "t02-grid",
      type: "product_grid",
      visible: true,
      settings: {
        kicker: "Chegou agora",
        title: "Novidades",
        source: "newest",
        count: 4,
        columns: 4,
        showViewAll: true,
      },
    },
    {
      id: "t02-split",
      type: "image_text_split",
      visible: true,
      settings: {
        kicker: "Lookbook",
        heading: "Um guarda-roupa que não pede licença.",
        body: "Modelagens amplas, tecidos naturais e uma paleta reduzida ao essencial.",
        buttonText: "Conhecer o ateliê",
        imageUrl: "",
        imageAlt: "Dois modelos com looks em preto e creme",
        imagePosition: "left",
        backgroundColor: "canvas",
      },
    },
    {
      id: "t02-features",
      type: "features",
      visible: true,
      settings: {
        items: [
          { title: "Trocas em 30 dias", description: "Primeira troca sem custo em todo o Brasil." },
          { title: "Envio em 24h", description: "Pedidos até 14h saem no mesmo dia útil." },
          { title: "Atendimento humano", description: "Consultoria de estilo por WhatsApp, de seg. a sáb." },
        ],
      },
    },
  ],
};
