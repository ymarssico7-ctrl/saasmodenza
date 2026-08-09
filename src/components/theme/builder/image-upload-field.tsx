import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Utility: Compressão local via Canvas ──────────────────────────────────────
/**
 * Comprime uma imagem usando o Canvas API e retorna como base64 (WebP ou JPEG).
 * Mantém aspecto proporcional, limitando às dimensões máximas fornecidas.
 */
export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context not available"));
        ctx.drawImage(img, 0, 0, width, height);

        // Tenta WebP primeiro, cai para JPEG
        const webp = canvas.toDataURL("image/webp", quality);
        const jpeg = canvas.toDataURL("image/jpeg", quality);
        resolve(webp.length < jpeg.length ? webp : jpeg);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── ImageUploadField ──────────────────────────────────────────────────────────
interface ImageUploadFieldProps {
  label: string;
  /** Texto de orientação exibido abaixo do campo (ex: "1920×800 px recomendado") */
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  /** Largura máxima para compressão (px). Default: 1920 */
  maxWidth?: number;
  /** Altura máxima para compressão (px). Default: 1080 */
  maxHeight?: number;
  /** Altura do preview da imagem em pixels. Default: 112 */
  previewHeight?: number;
}

export function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  maxWidth = 1920,
  maxHeight = 1080,
  previewHeight = 112,
}: ImageUploadFieldProps) {
  const [tab, setTab] = useState<"url" | "upload">(
    value && !value.startsWith("data:") ? "url" : value ? "upload" : "url",
  );
  const [isCompressing, setIsCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fieldId = `img-upload-${label.replace(/\s+/g, "-").toLowerCase()}`;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    try {
      const compressed = await compressImage(file, maxWidth, maxHeight);
      onChange(compressed);
      setTab("upload");
    } catch (err) {
      console.error("Erro ao comprimir imagem:", err);
    } finally {
      setIsCompressing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>

      {/* ── Tab Toggle ───────────────────────────────────────────────────────── */}
      <div className="flex overflow-hidden rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
            tab === "url"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary/60"
          }`}
        >
          🔗 Link (URL)
        </button>
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
            tab === "upload"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary/60"
          }`}
        >
          📁 Upload
        </button>
      </div>

      {/* ── URL Input ────────────────────────────────────────────────────────── */}
      {tab === "url" && (
        <Input
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 text-xs"
          placeholder="https://exemplo.com/banner.jpg"
        />
      )}

      {/* ── Upload Zone ──────────────────────────────────────────────────────── */}
      {tab === "upload" && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFile}
            className="hidden"
            id={fieldId}
          />
          <label
            htmlFor={fieldId}
            className="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border transition-all hover:border-primary hover:bg-primary/5"
          >
            {isCompressing ? (
              <div className="flex flex-col items-center gap-1">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-[11px] text-muted-foreground">Comprimindo…</span>
              </div>
            ) : (
              <>
                <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">
                  Clique para selecionar
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  JPEG · PNG · WebP
                </span>
              </>
            )}
          </label>
        </div>
      )}

      {/* ── Dica de medidas ──────────────────────────────────────────────────── */}
      {hint && (
        <p className="text-[10px] leading-relaxed text-muted-foreground">{hint}</p>
      )}

      {/* ── Preview ──────────────────────────────────────────────────────────── */}
      {value && (
        <div className="overflow-hidden rounded-xl border border-border">
          <img
            src={value}
            alt="Preview"
            className="w-full object-cover"
            style={{ height: previewHeight }}
          />
        </div>
      )}
    </div>
  );
}
