/**
 * ImageUploader — Componente universal de upload de imagem.
 *
 * - Abre o popup/seletor nativo de arquivos do dispositivo (câmera/galeria/arquivos)
 * - Preview imediato da imagem selecionada
 * - Em modo autenticado: faz upload para o Supabase Storage e retorna a URL pública
 * - Em modo demo: converte para Base64 Data URL local (sem chamada de rede)
 * - Suporta prop `currentUrl` para exibir foto já salva
 */
import { useRef, useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export type ImageUploaderProps = {
  /** URL da imagem já salva (exibida no preview inicial) */
  currentUrl?: string | null;
  /** Pasta/bucket no Supabase Storage onde o arquivo será salvo */
  bucket?: string;
  /** Prefixo do path no bucket (ex: "products", "logos") */
  folder?: string;
  /** Callback chamado com a URL pública após o upload */
  onUploaded: (url: string) => void;
  /** Texto do botão quando nenhuma foto está selecionada */
  placeholder?: string;
  /** Proporção do preview: "square" | "portrait" */
  aspect?: "square" | "portrait";
};

export function ImageUploader({
  currentUrl,
  bucket = "product-photos",
  folder = "items",
  onUploaded,
  placeholder = "Escolher foto",
  aspect = "portrait",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [loading, setLoading] = useState(false);

  const aspectClass = aspect === "portrait" ? "aspect-[3/4]" : "aspect-square";

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      return;
    }

    setLoading(true);

    // Verifica se o usuário está autenticado
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      // Modo demo: converte para Base64 local (sem chamada ao Supabase Storage)
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreview(dataUrl);
        onUploaded(dataUrl);
        setLoading(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Modo real: envia para o Supabase Storage
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${folder}/${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      // Fallback: converte para Base64 se o upload falhar
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreview(dataUrl);
        onUploaded(dataUrl);
        setLoading(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    setPreview(publicUrl);
    onUploaded(publicUrl);
    setLoading(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // Limpa o input para permitir re-selecionar o mesmo arquivo
    e.target.value = "";
  }

  function openPicker() {
    inputRef.current?.click();
  }

  function clearPhoto() {
    setPreview(null);
    onUploaded("");
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Input oculto que abre o seletor nativo */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleChange}
        aria-label="Selecionar imagem"
      />

      {/* Preview ou placeholder */}
      <button
        type="button"
        onClick={openPicker}
        disabled={loading}
        className={`group relative flex w-full max-w-[160px] ${aspectClass} cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-secondary/30 transition-colors hover:border-primary hover:bg-secondary/60 disabled:opacity-60`}
        aria-label={placeholder}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="size-6 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-3 text-center">
            {loading ? (
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Upload className="size-5 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">
              {loading ? "Enviando…" : placeholder}
            </span>
          </div>
        )}
      </button>

      {/* Botões de ação */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full text-xs"
          onClick={openPicker}
          disabled={loading}
        >
          <Camera className="mr-1.5 size-3.5" />
          {preview ? "Trocar foto" : "Escolher foto"}
        </Button>
        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-xs text-destructive hover:text-destructive"
            onClick={clearPhoto}
            disabled={loading}
          >
            <X className="mr-1 size-3.5" />
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}
