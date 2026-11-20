import type { ThemeConfig, ThemeSettings } from "./schema";

// ── Storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = "vestui_theme_config";
const LEGACY_STORAGE_KEY = "modaly_theme_config";
const ANCESTRAL_STORAGE_KEY = "vestuli_theme_config";

const SETTINGS_DEFAULTS: Partial<ThemeSettings> = {
  checkoutMode: "whatsapp",
  storeWhatsApp: "",
  storeDescription: "",
  politicaTroca: "Trocas em até 7 dias corridos após o recebimento, com etiqueta e nota fiscal.",
  mostrarEstoque: false,
};

export function loadTheme(): ThemeConfig {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY) ||
      localStorage.getItem(ANCESTRAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ThemeConfig;
      // Merge default values for any new fields missing from older saved themes
      parsed.settings = { ...SETTINGS_DEFAULTS, ...parsed.settings };
      return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return CATALOGO_EXPRESS_THEME;
}

export function saveTheme(theme: ThemeConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch (err) {
    console.warn("Aviso ao salvar tema no localStorage:", err);
  }
  // Notifica outras abas e componentes que escutam o evento (ex: /loja/preview)
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    window.dispatchEvent(new CustomEvent("theme-changed", { detail: theme }));
  } catch {
    // SSR / Node: ignorar
  }
}

/**
 * Injeta dinamicamente a tag <link> do Google Fonts no <head> do documento
 * para a fonte solicitada. Idempotente: não duplica links já existentes.
 */
export function ensureFontLoaded(fontName: string): void {
  if (typeof document === "undefined") return;
  const id = `gfont-${fontName.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;
  const url = FONT_URLS[fontName];
  if (!url) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);
}

// ── Font Google URLs ───────────────────────────────────────────────────────────
export const FONT_URLS: Record<string, string> = {
  // Fontes do Template 01 (Atelier Nove)
  "Cormorant Garamond":
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap",
  Jost: "https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap",
  // Fontes extras disponíveis para personalização
  Outfit: "https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500&display=swap",
  Figtree: "https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600&display=swap",
  "Playfair Display":
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap",
  Sora: "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap",
  "DM Serif Display": "https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap",
  "Libre Baskerville":
    "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap",
  Manrope: "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap",
  Inter: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  "DM Sans": "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap",
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
    storeName: "",
    tagline: "Moda atemporal em pequenos lotes",
    freeShippingBanner: "Frete grátis acima de R$ 599",
    freeShippingBannerEnabled: true,
    checkoutMode: "whatsapp",
    storeWhatsApp: "",
    storeDescription: "",
    politicaTroca: "Trocas em até 7 dias corridos após o recebimento, com etiqueta e nota fiscal.",
    mostrarEstoque: false,

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
        imageAlt: "Modelo vestindo vestido de linho off-white com casaco de lã preto sobre o ombro",
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
        imageAlt: "Duas modelos em alfaiataria preta e creme sentadas em banco de gesso",
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
        imageAlt: "Detalhe de tricô de cashmere creme e cetim cinza sobre superfície de gesso",
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
    storeName: "",
    tagline: "Moda atemporal em edições limitadas",
    freeShippingBanner: "Frete cortesia acima de R$ 800 · Troca sem custo em 30 dias",
    freeShippingBannerEnabled: true,
    checkoutMode: "whatsapp",
    storeWhatsApp: "",
    storeDescription: "",
    politicaTroca: "Trocas em até 7 dias corridos após o recebimento, com etiqueta e nota fiscal.",
    mostrarEstoque: false,
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
  order: ["t01-hero", "t01-features", "t01-grid", "t01-testimonials", "t01-faq", "t01-newsletter"],
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
    {
      id: "t01-grid",
      type: "product_grid",
      visible: true,
      settings: {
        kicker: "SELEÇÃO DA CASA",
        title: "Mais Desejados",
        source: "featured",
        count: 4,
        columns: 4,
        showViewAll: true,
      },
    },
    {
      id: "t01-testimonials",
      type: "testimonials",
      visible: true,
      settings: {
        kicker: "EXPERIÊNCIA REAL",
        title: "Relatos das nossas clientes",
        items: [
          {
            name: "Marina L.",
            city: "São Paulo, SP",
            rating: 5,
            comment: "O caimento é de outro nível. Comprei o casaco no inverno passado e continua impecável.",
          },
          {
            name: "Rafael T.",
            city: "Curitiba, PR",
            rating: 5,
            comment: "Atendimento impecável, embalagem linda e entrega antes do prazo.",
          },
          {
            name: "Ana P.",
            city: "Belo Horizonte, MG",
            rating: 5,
            comment: "Poucas peças, todas certas. Meu guarda-roupa ficou mais leve e muito mais elegante.",
          },
        ],
      },
    },
    {
      id: "t01-faq",
      type: "faq",
      visible: true,
      settings: {
        kicker: "ATENDIMENTO",
        title: "Perguntas Frequentes",
        items: [
          {
            question: "Qual o prazo de envio?",
            answer: "Despachamos em até 24 horas úteis com rastreio enviado direto no seu WhatsApp.",
          },
          {
            question: "Como funciona a primeira troca?",
            answer: "A primeira troca é totalmente cortesia em até 7 dias corridos após o recebimento.",
          },
        ],
      },
    },
    {
      id: "t01-newsletter",
      type: "newsletter",
      visible: true,
      settings: {
        heading: "Cartas do Atelier",
        subheading: "Lançamentos e acesso antecipado às edições limitadas. Uma carta por mês.",
        buttonText: "Inscrever-se",
        couponBadge: "ATELIER10",
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
    storeName: "",
    tagline: "Moda atemporal em pequenos lotes",
    freeShippingBanner: "Frete grátis acima de R$ 500 · Trocas em 30 dias",
    freeShippingBannerEnabled: true,
    checkoutMode: "whatsapp",
    storeWhatsApp: "",
    storeDescription: "",
    politicaTroca: "Trocas em até 7 dias corridos após o recebimento, com etiqueta e nota fiscal.",
    mostrarEstoque: false,
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
  order: [
    "t02-hero",
    "t02-features",
    "t02-grid",
    "t02-split",
    "t02-testimonials",
    "t02-faq",
    "t02-instagram",
    "t02-newsletter",
  ],
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
      id: "t02-features",
      type: "features",
      visible: true,
      settings: {
        items: [
          { title: "Trocas em 30 dias", description: "Primeira troca sem custo em todo o Brasil." },
          { title: "Envio em 24h", description: "Pedidos até 14h saem no mesmo dia útil." },
          {
            title: "Atendimento humano",
            description: "Consultoria de estilo por WhatsApp, de seg. a sáb.",
          },
        ],
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
      id: "t02-testimonials",
      type: "testimonials",
      visible: true,
      settings: {
        kicker: "AVALIAÇÕES REAIS",
        title: "O que nossas clientes dizem",
        items: [
          {
            name: "Camila V.",
            city: "Rio de Janeiro, RJ",
            rating: 5,
            comment: "As peças de linho têm um caimento surreal! Vale cada centavo investido.",
          },
          {
            name: "Leticia M.",
            city: "São Paulo, SP",
            rating: 5,
            comment: "Chegou super rápido, perfumado e com um bilhetinho carinhoso. Amei!",
          },
          {
            name: "Fernanda R.",
            city: "Porto Alegre, RS",
            rating: 5,
            comment: "Costuras perfeitas e caimento impecável. Virei cliente assídua.",
          },
        ],
      },
    },
    {
      id: "t02-faq",
      type: "faq",
      visible: true,
      settings: {
        kicker: "TIRE SUAS DÚVIDAS",
        title: "Perguntas Frequentes",
        items: [
          {
            question: "Como escolher o tamanho correto?",
            answer: "Consulte a tabela de medidas em cada produto ou tire dúvidas conosco no WhatsApp.",
          },
          {
            question: "Como funciona o frete e entrega?",
            answer: "Enviamos em até 24 horas úteis com código de rastreamento enviado automaticamente.",
          },
        ],
      },
    },
    {
      id: "t02-instagram",
      type: "instagram_feed",
      visible: true,
      settings: {
        kicker: "COMUNIDADE",
        title: "No dia a dia com você",
        handle: "@atelieminimalist",
        images: [
          "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80",
          "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80",
          "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80",
          "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80",
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
          "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&q=80",
        ],
      },
    },
    {
      id: "t02-newsletter",
      type: "newsletter",
      visible: true,
      settings: {
        heading: "Ganhe 10% OFF no primeiro pedido",
        subheading: "Cadastre-se para receber convites exclusivos e lançamentos em primeira mão.",
        buttonText: "Quero Desconto",
        couponBadge: "MINIMAL10",
      },
    },
  ],
};

// ── Template Catálogo Express (Base Gratuita) ──────────────────────────────────
export const CATALOGO_EXPRESS_THEME: ThemeConfig = {
  settings: {
    templateId: "catalogo-express",
    storeName: "",
    tagline: "Vendas Rápidas & WhatsApp",
    freeShippingBanner: "Compre pelo site ou peça direto no WhatsApp",
    freeShippingBannerEnabled: true,
    checkoutMode: "whatsapp",
    storeWhatsApp: "",
    storeDescription: "",
    politicaTroca: "Trocas em até 7 dias corridos após o recebimento, com etiqueta e nota fiscal.",
    mostrarEstoque: false,
    colorBackground: "#FAFAF8",
    colorForeground: "#18181b",
    colorPrimary: "#2563eb",
    colorCanvas: "#f4f4f5",
    colorBorder: "#e4e4e7",
    fontDisplay: "Inter" as never,
    fontBody: "Inter" as never,
    borderRadius: "md",
  },
  order: [],
  sections: [],
};

/**
 * Retorna a configuração de tema canônica e completa para um templateId específico,
 * preservando dados vitais do lojista (nome da loja, whatsapp, logo) caso existam.
 */
export function getPresetThemeForTemplate(
  templateId: string,
  overrides?: {
    storeName?: string;
    storeWhatsApp?: string;
    logoUrl?: string;
  }
): ThemeConfig {
  const storeName = overrides?.storeName || "";
  const storeWhatsApp = overrides?.storeWhatsApp ?? "";
  const logoUrl = overrides?.logoUrl;

  if (templateId === "template-01") {
    return {
      ...TEMPLATE_01_THEME,
      settings: {
        ...TEMPLATE_01_THEME.settings,
        templateId: "template-01",
        storeName: storeName || TEMPLATE_01_THEME.settings.storeName,
        storeWhatsApp: storeWhatsApp || TEMPLATE_01_THEME.settings.storeWhatsApp || "",
        ...(logoUrl ? { logoUrl } : {}),
      },
    };
  }

  if (templateId === "catalogo-express") {
    return {
      ...CATALOGO_EXPRESS_THEME,
      settings: {
        ...CATALOGO_EXPRESS_THEME.settings,
        templateId: "catalogo-express",
        storeName: storeName || CATALOGO_EXPRESS_THEME.settings.storeName,
        storeWhatsApp: storeWhatsApp || CATALOGO_EXPRESS_THEME.settings.storeWhatsApp || "",
        ...(logoUrl ? { logoUrl } : {}),
      },
    };
  }

  if (templateId === "template-03") {
    return {
      ...TEMPLATE_02_THEME,
      settings: {
        ...TEMPLATE_02_THEME.settings,
        templateId: "template-03",
        storeName: storeName || TEMPLATE_02_THEME.settings.storeName,
        storeWhatsApp: storeWhatsApp || TEMPLATE_02_THEME.settings.storeWhatsApp || "",
        colorBackground: "#09090b",
        colorForeground: "#fafafa",
        colorPrimary: "#f43f5e",
        colorCanvas: "#18181b",
        colorBorder: "#27272a",
        fontDisplay: "Sora",
        fontBody: "Inter",
        borderRadius: "sm",
        freeShippingBanner: "DROP LIMITADO · Envios express para todo o Brasil",
        ...(logoUrl ? { logoUrl } : {}),
      },
      sections: TEMPLATE_02_THEME.sections.map((s) =>
        s.type === "hero"
          ? {
              ...s,
              settings: {
                ...s.settings,
                heading: "Drop 04\nSem limites, sem regras.",
                subheading: "Edição Urbana",
                buttonText: "Ver Drop",
              },
            }
          : s
      ),
    };
  }

  if (templateId === "template-04") {
    return {
      ...TEMPLATE_02_THEME,
      settings: {
        ...TEMPLATE_02_THEME.settings,
        templateId: "template-04",
        storeName: storeName || TEMPLATE_02_THEME.settings.storeName,
        storeWhatsApp: storeWhatsApp || TEMPLATE_02_THEME.settings.storeWhatsApp || "",
        colorBackground: "#fdfbf7",
        colorForeground: "#292524",
        colorPrimary: "#c2410c",
        colorCanvas: "#f7f2ea",
        colorBorder: "#e7decb",
        fontDisplay: "Outfit",
        fontBody: "Figtree",
        borderRadius: "lg",
        freeShippingBanner: "Frete grátis em compras acima de R$ 399 · Parcelamento em até 6x",
        ...(logoUrl ? { logoUrl } : {}),
      },
      sections: TEMPLATE_02_THEME.sections.map((s) =>
        s.type === "hero"
          ? {
              ...s,
              settings: {
                ...s.settings,
                heading: "O sol como\nessência e destino.",
                subheading: "Coleção Resort",
                buttonText: "Ver Coleção",
              },
            }
          : s
      ),
    };
  }

  if (templateId === "template-05") {
    return {
      ...TEMPLATE_02_THEME,
      settings: {
        ...TEMPLATE_02_THEME.settings,
        templateId: "template-05",
        storeName: storeName || TEMPLATE_02_THEME.settings.storeName,
        storeWhatsApp: storeWhatsApp || TEMPLATE_02_THEME.settings.storeWhatsApp || "",
        colorBackground: "#faf9f6",
        colorForeground: "#1c1917",
        colorPrimary: "#b45309",
        colorCanvas: "#f3ede2",
        colorBorder: "#e2d7c5",
        fontDisplay: "Playfair Display",
        fontBody: "Manrope",
        borderRadius: "none",
        freeShippingBanner: "Atendimento exclusivo sob medida · Envio cortesia acima de R$ 600",
        ...(logoUrl ? { logoUrl } : {}),
      },
      sections: TEMPLATE_02_THEME.sections.map((s) =>
        s.type === "hero"
          ? {
              ...s,
              settings: {
                ...s.settings,
                heading: "Preciosidade\nem cada ponto.",
                subheading: "Ateliê Exclusivo",
                buttonText: "Explorar Ateliê",
              },
            }
          : s
      ),
    };
  }

  // Padrão: Template 02 (Atelie Minimalist)
  return {
    ...TEMPLATE_02_THEME,
    settings: {
      ...TEMPLATE_02_THEME.settings,
      templateId: "template-02",
      storeName: storeName || TEMPLATE_02_THEME.settings.storeName,
      storeWhatsApp: storeWhatsApp || TEMPLATE_02_THEME.settings.storeWhatsApp || "",
      ...(logoUrl ? { logoUrl } : {}),
    },
  };
}
