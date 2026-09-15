import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { brl } from "./format";

const PRIVACY_KEY = "vestui_privacy_mode";
const PRIVACY_EVENT = "vestui_privacy_changed";

export function usePrivacyMode() {
  const [ocultarSaldos, setOcultarSaldos] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
    return localStorage.getItem(PRIVACY_KEY) === "true";
  });

  useEffect(() => {
    const handlePrivacyChange = () => {
      if (typeof localStorage !== "undefined") {
        setOcultarSaldos(localStorage.getItem(PRIVACY_KEY) === "true");
      }
    };
    window.addEventListener(PRIVACY_EVENT, handlePrivacyChange);
    return () => window.removeEventListener(PRIVACY_EVENT, handlePrivacyChange);
  }, []);

  const togglePrivacidade = useCallback(() => {
    setOcultarSaldos((prev) => {
      const nextVal = !prev;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(PRIVACY_KEY, String(nextVal));
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(PRIVACY_EVENT));
      }
      toast.info(nextVal ? "Modo Balcão Ativado" : "Modo Balcão Desativado", {
        description: nextVal
          ? "Valores monetários ocultados para proteção no balcão da loja."
          : "Valores visíveis na tela.",
      });
      return nextVal;
    });
  }, []);

  const mascaraSaldo = useCallback(
    (valor: number | string | null | undefined, customPlaceholder = "R$ ••••••"): string => {
      if (ocultarSaldos) return customPlaceholder;
      if (typeof valor === "string") return valor;
      if (typeof valor === "number") return brl(valor);
      return "R$ 0,00";
    },
    [ocultarSaldos],
  );

  return {
    ocultarSaldos,
    togglePrivacidade,
    mascaraSaldo,
  };
}
