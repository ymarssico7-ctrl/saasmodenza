import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

export type MissionId = "lucro" | "meta" | "venda" | "vitrine";

export interface MissionInfo {
  id: MissionId;
  stepNumber: number;
  title: string;
  tagline: string;
  route: string;
  tipByRoute: Record<string, string>;
  defaultTip: string;
  nextMissionId: MissionId | null;
}

export const MISSIONS: Record<MissionId, MissionInfo> = {
  lucro: {
    id: "lucro",
    stepNumber: 1,
    title: "Descubra seu lucro real em 60s",
    tagline: "Cadastre sua primeira peça e veja sua margem calculada.",
    route: "/estoque",
    tipByRoute: {
      "/estoque": "💡 Veja a peça modelo abaixo para aprender ou preencha os campos acima para cadastrar a sua.",
      "/precificacao": "💡 Digite o custo da peça e taxas. O Modaly calcula o preço ideal para você não vender no prejuízo.",
    },
    defaultTip: "💡 Cadastre uma peça no estoque ou calcule o preço para desbloquear esta conquista.",
    nextMissionId: "meta",
  },
  meta: {
    id: "meta",
    stepNumber: 2,
    title: "Calibre seu alvo de faturamento",
    tagline: "Defina a meta do mês para saber o ritmo diário da boutique.",
    route: "/metas",
    tipByRoute: {
      "/metas": "🎯 Digite quanto você quer faturar este mês. Nós dividimos a meta pelos dias úteis automaticamente.",
    },
    defaultTip: "🎯 Acesse a aba Metas para definir o alvo de vendas da sua loja.",
    nextMissionId: "venda",
  },
  venda: {
    id: "venda",
    stepNumber: 3,
    title: "Simule sua primeira venda no balcão",
    tagline: "Experimente a baixa de estoque automática e veja o lucro cair no caixa.",
    route: "/caixa",
    tipByRoute: {
      "/caixa": "⚡ Lance uma venda rápida em dinheiro, Pix ou cartão. O estoque dá baixa na hora!",
    },
    defaultTip: "⚡ Acesse o Caixa para registrar uma venda e ver o lucro do dia.",
    nextMissionId: "vitrine",
  },
  vitrine: {
    id: "vitrine",
    stepNumber: 4,
    title: "Ative seu link de vendas no Instagram",
    tagline: "Sua vitrine pronta para receber pedidos direto no WhatsApp.",
    route: "/loja",
    tipByRoute: {
      "/loja": "✨ Copie o link da sua vitrine e coloque na bio do Instagram para suas clientes comprarem.",
      "/loja/produtos": "✨ Ative as peças que você quer exibir no catálogo online.",
    },
    defaultTip: "✨ Acesse a Loja Online para conferir sua vitrine e compartilhar o link.",
    nextMissionId: null,
  },
};

interface GuideContextValue {
  activeMission: MissionId | null;
  activeMissionInfo: MissionInfo | null;
  isPillDismissed: boolean;
  isTourActive: boolean;
  currentTip: string;
  startMission: (mission: MissionId) => void;
  advanceToNextMission: () => void;
  dismissPill: () => void;
  reopenPill: () => void;
  closeTour: () => void;
}

const GuideContext = createContext<GuideContextValue | undefined>(undefined);

const STORAGE_KEY_ACTIVE_MISSION = "modaly_guide_active_mission";
const STORAGE_KEY_PILL_DISMISSED = "modaly_guide_pill_dismissed";

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [activeMission, setActiveMission] = useState<MissionId | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_MISSION);
    if (saved && saved in MISSIONS) {
      return saved as MissionId;
    }
    return null;
  });

  const [isPillDismissed, setIsPillDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(STORAGE_KEY_PILL_DISMISSED) === "true";
  });

  const startMission = (mission: MissionId) => {
    setActiveMission(mission);
    setIsPillDismissed(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_ACTIVE_MISSION, mission);
      sessionStorage.removeItem(STORAGE_KEY_PILL_DISMISSED);
    }
  };

  const advanceToNextMission = () => {
    if (!activeMission) return;
    const current = MISSIONS[activeMission];
    if (current.nextMissionId) {
      startMission(current.nextMissionId);
    } else {
      closeTour();
    }
  };

  const dismissPill = () => {
    setIsPillDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY_PILL_DISMISSED, "true");
    }
  };

  const reopenPill = () => {
    setIsPillDismissed(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY_PILL_DISMISSED);
    }
  };

  const closeTour = () => {
    setActiveMission(null);
    setIsPillDismissed(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_MISSION);
      sessionStorage.removeItem(STORAGE_KEY_PILL_DISMISSED);
    }
  };

  const activeMissionInfo = activeMission ? MISSIONS[activeMission] : null;

  // Calcula a dica contextual com base na rota atual
  let currentTip = "";
  if (activeMissionInfo) {
    currentTip =
      activeMissionInfo.tipByRoute[pathname] ?? activeMissionInfo.defaultTip;
  }

  return (
    <GuideContext.Provider
      value={{
        activeMission,
        activeMissionInfo,
        isPillDismissed,
        isTourActive: activeMission !== null,
        currentTip,
        startMission,
        advanceToNextMission,
        dismissPill,
        reopenPill,
        closeTour,
      }}
    >
      {children}
    </GuideContext.Provider>
  );
}

const fallbackValue: GuideContextValue = {
  activeMission: null,
  activeMissionInfo: null,
  isPillDismissed: false,
  isTourActive: false,
  currentTip: "",
  startMission: () => {},
  advanceToNextMission: () => {},
  dismissPill: () => {},
  reopenPill: () => {},
  closeTour: () => {},
};

export function useGuideTour() {
  const context = useContext(GuideContext);
  return context ?? fallbackValue;
}
