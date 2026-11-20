import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from "react";
import {
  SECTION_META,
  type Section,
  type ThemeConfig,
  type ThemeSettings,
  type SectionType,
} from "./schema";
import { ATELIER_MOD_THEME, loadTheme } from "./defaults";
import { nanoid } from "./nanoid";

// ── State ─────────────────────────────────────────────────────────────────────
export interface BuilderState {
  theme: ThemeConfig;
  past: ThemeConfig[]; // histórico para UNDO
  future: ThemeConfig[]; // histórico para REDO
  selectedSectionId: string | null;
  activeTab: "sections" | "global";
  previewMode: "desktop" | "mobile";
  interactionMode: "edit" | "interactive"; // "edit" = seleção visual; "interactive" = loja 100% navegável
  isDirty: boolean;
  isSidebarOpen: boolean; // controla visibilidade do painel lateral de edição
}

// ── Actions ───────────────────────────────────────────────────────────────────
type Action =
  | { type: "SET_TAB"; tab: BuilderState["activeTab"] }
  | { type: "SET_PREVIEW"; mode: BuilderState["previewMode"] }
  | { type: "SET_INTERACTION_MODE"; mode: BuilderState["interactionMode"] }
  | { type: "SELECT_SECTION"; id: string | null }
  | { type: "UPDATE_SETTINGS"; patch: Partial<ThemeSettings> }
  | { type: "UPDATE_SECTION"; id: string; patch: Partial<Section["settings"]> }
  | { type: "REORDER"; order: string[] }
  | { type: "TOGGLE_VISIBLE"; id: string }
  | { type: "DELETE_SECTION"; id: string }
  | { type: "ADD_SECTION"; sectionType: SectionType }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SAVE" }
  | { type: "RESET" }
  | { type: "LOAD_THEME"; theme: ThemeConfig }
  | { type: "TOGGLE_SIDEBAR" };

// ── Helpers ───────────────────────────────────────────────────────────────────
const MAX_HISTORY = 50;

/** Aplica uma mudança ao estado guardando o snapshot atual em `past`. */
function withHistory(state: BuilderState, newTheme: ThemeConfig): BuilderState {
  return {
    ...state,
    past: [...state.past.slice(-MAX_HISTORY), state.theme],
    future: [],
    theme: newTheme,
    isDirty: true,
  };
}

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state: BuilderState, action: Action): BuilderState {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, activeTab: action.tab, selectedSectionId: null };

    case "SET_PREVIEW":
      return { ...state, previewMode: action.mode };

    case "SET_INTERACTION_MODE":
      return {
        ...state,
        interactionMode: action.mode,
        selectedSectionId: action.mode === "interactive" ? null : state.selectedSectionId,
      };

    case "TOGGLE_SIDEBAR":
      return { ...state, isSidebarOpen: !state.isSidebarOpen };

    case "SELECT_SECTION":
      return {
        ...state,
        selectedSectionId: action.id,
        activeTab: action.id ? "sections" : state.activeTab,
      };

    case "UPDATE_SETTINGS":
      return withHistory(state, {
        ...state.theme,
        settings: { ...state.theme.settings, ...action.patch },
      });

    case "UPDATE_SECTION": {
      const sections = state.theme.sections.map((s) => {
        if (s.id !== action.id) return s;
        return {
          ...s,
          settings: { ...s.settings, ...action.patch },
        } as Section;
      });
      return withHistory(state, { ...state.theme, sections });
    }

    case "REORDER":
      return withHistory(state, { ...state.theme, order: action.order });

    case "TOGGLE_VISIBLE": {
      const sections = state.theme.sections.map((s) =>
        s.id === action.id ? { ...s, visible: !s.visible } : s,
      );
      return withHistory(state, { ...state.theme, sections });
    }

    case "DELETE_SECTION": {
      const sections = state.theme.sections.filter((s) => s.id !== action.id);
      const order = state.theme.order.filter((id) => id !== action.id);
      const selectedSectionId =
        state.selectedSectionId === action.id ? null : state.selectedSectionId;
      return {
        ...withHistory(state, { ...state.theme, sections, order }),
        selectedSectionId,
      };
    }

    case "ADD_SECTION": {
      const meta = SECTION_META.find((m) => m.type === action.sectionType);
      if (!meta) return state;
      const newSection = createDefaultSection(action.sectionType);
      const newTheme: ThemeConfig = {
        ...state.theme,
        sections: [...state.theme.sections, newSection],
        order: [...state.theme.order, newSection.id],
      };
      return {
        ...withHistory(state, newTheme),
        selectedSectionId: newSection.id,
      };
    }

    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1]!;
      const newPast = state.past.slice(0, -1);
      return {
        ...state,
        theme: previous,
        past: newPast,
        future: [state.theme, ...state.future.slice(0, MAX_HISTORY - 1)],
        isDirty: newPast.length > 0 || state.isDirty,
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0]!;
      const newFuture = state.future.slice(1);
      return {
        ...state,
        theme: next,
        past: [...state.past.slice(-MAX_HISTORY), state.theme],
        future: newFuture,
        isDirty: true,
      };
    }

    case "SAVE":
      return { ...state, isDirty: false };

    case "LOAD_THEME":
      return { ...state, theme: action.theme, isDirty: false, past: [], future: [] };

    case "RESET":
      return { ...initialState, theme: ATELIER_MOD_THEME };

    default:
      return state;
  }
}

function createDefaultSection(type: SectionType): Section {
  const id = `${type}-${nanoid()}`;
  switch (type) {
    case "hero":
      return {
        id,
        type: "hero",
        visible: true,
        settings: {
          heading: "Novo Banner",
          subheading: "Subtítulo",
          buttonText: "Ver mais",
          imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80",
          imageAlt: "Banner",
          imagePosition: "center",
          overlayOpacity: 40,
        },
      };
    case "category_bar":
      return { id, type: "category_bar", visible: true, settings: { enabled: true } };
    case "product_grid":
      return {
        id,
        type: "product_grid",
        visible: true,
        settings: {
          kicker: "",
          title: "Produtos",
          source: "all",
          count: 4,
          columns: 4,
          showViewAll: true,
        },
      };
    case "image_text_split":
      return {
        id,
        type: "image_text_split",
        visible: true,
        settings: {
          kicker: "",
          heading: "Título da seção",
          body: "Texto descritivo da seção.",
          buttonText: "Saiba mais",
          imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80",
          imageAlt: "Imagem",
          imagePosition: "right",
          backgroundColor: "canvas",
        },
      };
    case "features":
      return {
        id,
        type: "features",
        visible: true,
        settings: {
          items: [
            { title: "Benefício 1", description: "Descrição do benefício." },
            { title: "Benefício 2", description: "Descrição do benefício." },
            { title: "Benefício 3", description: "Descrição do benefício." },
          ],
        },
      };
    case "announcement":
      return {
        id,
        type: "announcement",
        visible: true,
        settings: { text: "Novidade! Confira nossa nova coleção.", backgroundColor: "#1C1C1A" },
      };
    case "testimonials":
      return {
        id,
        type: "testimonials",
        visible: true,
        settings: {
          kicker: "Quem comprou, amou",
          title: "O que nossas clientes dizem",
          items: [
            {
              name: "Marina L.",
              city: "São Paulo, SP",
              rating: 5,
              comment: "O caimento das peças é impecável! Tecido nobre, acabamento de alfaiataria fina. Com certeza comprarei mais vezes.",
            },
            {
              name: "Juliana R.",
              city: "Belo Horizonte, MG",
              rating: 5,
              comment: "Atendimento excepcional no WhatsApp e a entrega chegou antes do prazo com uma embalagem muito cheirosa!",
            },
            {
              name: "Carla S.",
              city: "Curitiba, PR",
              rating: 5,
              comment: "Modelagem perfeita que valoriza o corpo com elegância e conforto. Recomendo de olhos fechados!",
            },
          ],
        },
      };
    case "faq":
      return {
        id,
        type: "faq",
        visible: true,
        settings: {
          kicker: "Tire suas dúvidas",
          title: "Perguntas Frequentes",
          items: [
            {
              question: "Qual o prazo de envio e entrega?",
              answer: "Enviamos todos os pedidos em até 24 horas úteis após a confirmação. O prazo final varia conforme o seu CEP e método de envio escolhido.",
            },
            {
              question: "Como funciona a política de trocas?",
              answer: "A primeira troca é totalmente gratuita em até 7 dias corridos após o recebimento, mantendo etiquetas e a peça intacta.",
            },
            {
              question: "Como escolher o tamanho ideal?",
              answer: "Disponibilizamos nossa tabela de medidas detalhada em cada produto. Se preferir, nossa equipe auxilia diretamente pelo WhatsApp.",
            },
            {
              question: "Quais são as formas de pagamento?",
              answer: "Aceitamos Pix com aprovação imediata e cartões de crédito em até 6x sem juros.",
            },
          ],
        },
      };
    case "promotional_banner":
      return {
        id,
        type: "promotional_banner",
        visible: true,
        settings: {
          badge: "OFERTA RELÂMPAGO",
          heading: "Coleção Cápsula com até 30% OFF",
          subheading: "Condição exclusiva por tempo limitado para peças selecionadas.",
          buttonText: "Aproveitar Descontos",
          endDateHours: 48,
        },
      };
    case "instagram_feed":
      return {
        id,
        type: "instagram_feed",
        visible: true,
        settings: {
          kicker: "Siga nosso universo",
          title: "No dia a dia com você",
          handle: "@sualoja",
          images: [
            "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80",
            "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80",
            "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80",
            "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80",
            "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80",
            "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&q=80",
          ],
        },
      };
    case "newsletter":
      return {
        id,
        type: "newsletter",
        visible: true,
        settings: {
          heading: "Ganhe 10% OFF na primeira compra",
          subheading: "Cadastre-se para receber novidades exclusivas, lançamentos antecipados e cupons especiais.",
          buttonText: "Quero meu desconto",
          couponBadge: "PRIMEIRACOMPRA",
        },
      };
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const initialState: BuilderState = {
  theme: loadTheme(),
  past: [],
  future: [],
  selectedSectionId: null,
  activeTab: "sections",
  previewMode: "desktop",
  interactionMode: "edit",
  isDirty: false,
  isSidebarOpen: true,
};

type ContextValue = BuilderState & {
  dispatch: React.Dispatch<Action>;
  selectedSection: Section | null;
  canUndo: boolean;
  canRedo: boolean;
};

const BuilderContext = createContext<ContextValue | null>(null);

export function BuilderProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme?: ThemeConfig | undefined;
}) {
  const [state, dispatch] = useReducer(
    reducer,
    initialTheme ? { ...initialState, theme: initialTheme } : initialState,
  );
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Se initialTheme carregar posteriormente (ex: busca assíncrona do Supabase), sincroniza se não houver edição não salva
  useEffect(() => {
    if (initialTheme && !state.isDirty) {
      dispatch({ type: "LOAD_THEME", theme: initialTheme });
    }
  }, [initialTheme]); // eslint-disable-line react-hooks/exhaustive-deps

  // Abre um único canal persistente ao montar — evita criar/destruir instâncias a cada render
  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel("vestui_theme_preview");
    } catch {
      // BroadcastChannel não disponível (SSR / Node)
    }
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, []);

  // Transmite atualizações de tema para o iframe de preview mobile em tempo real
  useEffect(() => {
    channelRef.current?.postMessage({ type: "THEME_UPDATE", payload: state.theme });
  }, [state.theme]);

  // Transmite seção selecionada (highlight) para o iframe
  useEffect(() => {
    channelRef.current?.postMessage({ type: "SELECT_SECTION", payload: state.selectedSectionId });
  }, [state.selectedSectionId]);

  // Transmite modo de interação ("edit" vs "interactive") para o iframe
  useEffect(() => {
    channelRef.current?.postMessage({
      type: "SET_INTERACTION_MODE",
      payload: state.interactionMode,
    });
  }, [state.interactionMode]);

  const selectedSection =
    state.theme.sections.find((s) => s.id === state.selectedSectionId) ?? null;

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  return (
    <BuilderContext.Provider value={{ ...state, dispatch, selectedSection, canUndo, canRedo }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error("useBuilder must be used inside BuilderProvider");
  return ctx;
}
