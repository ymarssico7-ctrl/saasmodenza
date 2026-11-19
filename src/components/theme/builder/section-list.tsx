import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Eye,
  EyeOff,
  GripVertical,
  ImageIcon,
  LayoutTemplate,
  ShoppingBag,
  Star,
  Tag,
  Megaphone,
  Trash2,
  Plus,
  ChevronRight,
  MessageSquareQuote,
  HelpCircle,
  Timer,
  Instagram,
  Mail,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilder } from "@/lib/theme-engine/context";
import { SECTION_META } from "@/lib/theme-engine/schema";
import type { SectionType } from "@/lib/theme-engine/schema";

export const SECTION_ICONS: Record<string, React.ReactNode> = {
  hero: <ImageIcon className="h-4 w-4" />,
  category_bar: <Tag className="h-4 w-4" />,
  product_grid: <ShoppingBag className="h-4 w-4" />,
  image_text_split: <LayoutTemplate className="h-4 w-4" />,
  features: <Star className="h-4 w-4" />,
  announcement: <Megaphone className="h-4 w-4" />,
  testimonials: <MessageSquareQuote className="h-4 w-4" />,
  faq: <HelpCircle className="h-4 w-4" />,
  promotional_banner: <Timer className="h-4 w-4" />,
  instagram_feed: <Instagram className="h-4 w-4" />,
  newsletter: <Mail className="h-4 w-4" />,
};

export const SECTION_LABELS: Record<string, string> = {
  hero: "Banner Principal",
  category_bar: "Barra de Categorias",
  product_grid: "Grade de Produtos",
  image_text_split: "Imagem & Texto",
  features: "Diferenciais",
  announcement: "Faixa de Anúncio",
  testimonials: "Depoimentos de Clientes",
  faq: "Perguntas Frequentes (FAQ)",
  promotional_banner: "Banner com Cronômetro",
  instagram_feed: "Feed do Instagram",
  newsletter: "Newsletter & Desconto",
};

// ── Sortable Item ─────────────────────────────────────────────────────────────
function SortableSectionItem({ id }: { id: string }) {
  const { theme, selectedSectionId, dispatch } = useBuilder();
  const section = theme.sections.find((s) => s.id === id);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  if (!section) return null;
  const isSelected = selectedSectionId === section.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all cursor-pointer ${
        isSelected ? "bg-primary text-primary-foreground shadow-glow" : "hover:bg-secondary/60"
      } ${!section.visible ? "opacity-50" : ""}`}
      onClick={() => dispatch({ type: "SELECT_SECTION", id: section.id })}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Icon */}
      <span className={isSelected ? "text-primary-foreground" : "text-muted-foreground"}>
        {SECTION_ICONS[section.type]}
      </span>

      {/* Label */}
      <span className="flex-1 truncate font-medium">
        {SECTION_LABELS[section.type] ?? section.type}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "TOGGLE_VISIBLE", id: section.id });
          }}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
          title={section.visible ? "Ocultar seção" : "Mostrar seção"}
        >
          {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "DELETE_SECTION", id: section.id });
          }}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:text-destructive"
          title="Excluir seção"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <ChevronRight
        className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`}
      />
    </div>
  );
}

// ── Add Section Panel ─────────────────────────────────────────────────────────
function AddSectionPanel() {
  const { dispatch } = useBuilder();
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="mt-3 w-full h-11 gap-2 rounded-2xl border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary font-semibold text-xs transition-all shadow-2xs cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        Adicionar Nova Seção
      </Button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-primary/30 bg-card p-3 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-150">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <p className="text-xs font-bold text-foreground">
          Escolha uma Seção para Adicionar
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer px-2 py-0.5 rounded-lg hover:bg-secondary"
        >
          Cancelar
        </button>
      </div>

      <div className="space-y-1 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
        {SECTION_META.map((meta) => (
          <button
            key={meta.type}
            type="button"
            onClick={() => {
              dispatch({ type: "ADD_SECTION", sectionType: meta.type as SectionType });
              setIsOpen(false);
            }}
            className="flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left text-sm transition-colors hover:bg-secondary/70 border border-transparent hover:border-border cursor-pointer group"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              {SECTION_ICONS[meta.type]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-xs leading-tight text-foreground group-hover:text-primary transition-colors">
                {meta.label}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {meta.description}
              </p>
            </div>
            <Plus className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Section List (main export) ────────────────────────────────────────────────
export function SectionList() {
  const { theme, dispatch } = useBuilder();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = theme.order.indexOf(active.id as string);
        const newIndex = theme.order.indexOf(over.id as string);
        dispatch({
          type: "REORDER",
          order: arrayMove(theme.order, oldIndex, newIndex),
        });
      }
    },
    [theme.order, dispatch],
  );

  // Sugestão contextual inteligente para aumentar a conversão da loja
  const hasTestimonials = theme.sections.some((s) => s.type === "testimonials");
  const hasFaq = theme.sections.some((s) => s.type === "faq");
  const hasPromo = theme.sections.some((s) => s.type === "promotional_banner");

  const suggestion = useMemo(() => {
    if (!hasTestimonials) {
      return {
        type: "testimonials" as SectionType,
        title: "Adicione Depoimentos de Clientes",
        desc: "Lojas de moda com avaliações de clientes convertem até 25% mais.",
      };
    }
    if (!hasPromo) {
      return {
        type: "promotional_banner" as SectionType,
        title: "Adicione Banner Promocional",
        desc: "Destaque promoções, frete grátis ou cupom da semana no topo.",
      };
    }
    if (!hasFaq) {
      return {
        type: "faq" as SectionType,
        title: "Adicione Perguntas Frequentes (FAQ)",
        desc: "Tire dúvidas sobre prazos e trocas e reduza o suporte no WhatsApp.",
      };
    }
    return null;
  }, [hasTestimonials, hasPromo, hasFaq]);

  return (
    <div className="flex flex-col gap-1 overflow-hidden">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={theme.order} strategy={verticalListSortingStrategy}>
          {theme.order.map((id) => (
            <SortableSectionItem key={id} id={id} />
          ))}
        </SortableContext>
      </DndContext>

      <AddSectionPanel />

      {/* Dica Inteligente de Conversão */}
      {suggestion && (
        <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 shadow-sm">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">{suggestion.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {suggestion.desc}
              </p>
              <button
                type="button"
                onClick={() => dispatch({ type: "ADD_SECTION", sectionType: suggestion.type })}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary hover:underline cursor-pointer"
              >
                + Adicionar Seção Sugerida
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
