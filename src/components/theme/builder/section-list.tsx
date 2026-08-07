import { useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilder } from "@/lib/theme-engine/context";
import { SECTION_META } from "@/lib/theme-engine/schema";
import type { SectionType } from "@/lib/theme-engine/schema";

const SECTION_ICONS: Record<string, React.ReactNode> = {
  hero: <ImageIcon className="h-4 w-4" />,
  category_bar: <Tag className="h-4 w-4" />,
  product_grid: <ShoppingBag className="h-4 w-4" />,
  image_text_split: <LayoutTemplate className="h-4 w-4" />,
  features: <Star className="h-4 w-4" />,
  announcement: <Megaphone className="h-4 w-4" />,
};

const SECTION_LABELS: Record<string, string> = {
  hero: "Banner Principal",
  category_bar: "Barra de Categorias",
  product_grid: "Grade de Produtos",
  image_text_split: "Imagem & Texto",
  features: "Diferenciais",
  announcement: "Faixa de Anúncio",
};

// ── Sortable Item ─────────────────────────────────────────────────────────────
function SortableSectionItem({ id }: { id: string }) {
  const { theme, selectedSectionId, dispatch } = useBuilder();
  const section = theme.sections.find((s) => s.id === id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

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
        isSelected
          ? "bg-primary text-primary-foreground shadow-glow"
          : "hover:bg-secondary/60"
      } ${!section.visible ? "opacity-50" : ""}`}
      onClick={() =>
        dispatch({ type: "SELECT_SECTION", id: isSelected ? null : section.id })
      }
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

      <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`} />
    </div>
  );
}

// ── Add Section Panel ─────────────────────────────────────────────────────────
function AddSectionPanel() {
  const { dispatch } = useBuilder();

  return (
    <div className="mt-3 rounded-2xl border border-dashed border-border p-3">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Adicionar Seção
      </p>
      <div className="space-y-1">
        {SECTION_META.map((meta) => (
          <button
            key={meta.type}
            onClick={() =>
              dispatch({ type: "ADD_SECTION", sectionType: meta.type as SectionType })
            }
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/60"
          >
            <span className="text-muted-foreground">
              {SECTION_ICONS[meta.type]}
            </span>
            <div className="min-w-0">
              <p className="font-medium leading-tight">{meta.label}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {meta.description}
              </p>
            </div>
            <Plus className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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

  return (
    <div className="flex flex-col gap-1 overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={theme.order} strategy={verticalListSortingStrategy}>
          {theme.order.map((id) => (
            <SortableSectionItem key={id} id={id} />
          ))}
        </SortableContext>
      </DndContext>

      <AddSectionPanel />
    </div>
  );
}
