import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";

export type CartItem = {
  id: string;
  nome: string;
  imagem: string;
  preco: number;
  tamanho: string;
  cor: string;
  quantidade: number;
  /** Estoque máximo disponível — impede incrementar além do estoque real */
  maxQuantity?: number;
};

type CartState = { items: CartItem[] };

type CartAction =
  | { type: "ADD"; item: CartItem }
  | { type: "REMOVE"; id: string; tamanho: string; cor: string }
  | { type: "INCREMENT"; id: string; tamanho: string; cor: string }
  | { type: "DECREMENT"; id: string; tamanho: string; cor: string }
  | { type: "CLEAR" };

function key(id: string, tamanho: string, cor: string) {
  return `${id}::${tamanho}::${cor}`;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD": {
      const k = key(action.item.id, action.item.tamanho, action.item.cor);
      const existing = state.items.find((i) => key(i.id, i.tamanho, i.cor) === k);
      if (existing) {
        return {
          items: state.items.map((i) =>
            key(i.id, i.tamanho, i.cor) === k
              ? { ...i, quantidade: i.quantidade + action.item.quantidade }
              : i,
          ),
        };
      }
      return { items: [...state.items, action.item] };
    }
    case "REMOVE":
      return {
        items: state.items.filter(
          (i) => key(i.id, i.tamanho, i.cor) !== key(action.id, action.tamanho, action.cor),
        ),
      };
    case "INCREMENT":
      return {
        items: state.items.map((i) => {
          if (key(i.id, i.tamanho, i.cor) !== key(action.id, action.tamanho, action.cor)) return i;
          // Fix 6: respeita teto de estoque se definido
          const max = i.maxQuantity ?? Infinity;
          return { ...i, quantidade: Math.min(i.quantidade + 1, max) };
        }),
      };
    case "DECREMENT":
      return {
        items: state.items.map((i) =>
          key(i.id, i.tamanho, i.cor) === key(action.id, action.tamanho, action.cor)
            ? { ...i, quantidade: Math.max(1, i.quantidade - 1) }
            : i,
        ),
      };
    case "CLEAR":
      return { items: [] };
    default:
      return state;
  }
}

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  add: (item: CartItem) => void;
  remove: (id: string, tamanho: string, cor: string) => void;
  increment: (id: string, tamanho: string, cor: string) => void;
  decrement: (id: string, tamanho: string, cor: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = "vestuli_cart_items_v1";
const LEGACY_CART_STORAGE_KEY = "modaly_cart_items_v1";

function loadInitialCartItems(): CartItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem(LEGACY_CART_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, null, () => ({
    items: loadInitialCartItems(),
  }));

  // Sincroniza estado do carrinho no localStorage a cada alteração
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // silenciar erros de cota/localStorage
    }
  }, [state.items]);

  const totalItems = state.items.reduce((s, i) => s + i.quantidade, 0);
  const totalPrice = state.items.reduce((s, i) => s + i.preco * i.quantidade, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        totalItems,
        totalPrice,
        add: (item) => dispatch({ type: "ADD", item }),
        remove: (id, tamanho, cor) => dispatch({ type: "REMOVE", id, tamanho, cor }),
        increment: (id, tamanho, cor) => dispatch({ type: "INCREMENT", id, tamanho, cor }),
        decrement: (id, tamanho, cor) => dispatch({ type: "DECREMENT", id, tamanho, cor }),
        clear: () => dispatch({ type: "CLEAR" }),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
