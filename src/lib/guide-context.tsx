import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

export type MissionId = "lucro" | "meta" | "venda" | "vitrine";

export interface EducationalGuide {
  title: string;
  badge: string;
  headline: string;
  financialBreakdown?: {
    label: string;
    value: string;
    description: string;
    tone?: "neutral" | "warning" | "success" | "primary";
  }[];
  expertLessons: {
    title: string;
    explanation: string;
  }[];
  goldenRule: string;
  practicalActionText: string;
  practicalActionTo: string;
}

export const ROUTE_EDUCATION: Record<string, EducationalGuide> = {
  "/precificacao": {
    title: "Consultoria: A Matemática do Preço Seguro",
    badge: "Consultoria Financeira",
    headline: "Como precificar sem ter prejuízo no final do mês",
    financialBreakdown: [
      {
        label: "1. Custo Fornecedor (Atacado)",
        value: "R$ 49,90",
        description: "O valor que você paga na nota fiscal por unidade da peça.",
        tone: "neutral",
      },
      {
        label: "2. Custo Invisível Operacional",
        value: "+ R$ 11,50",
        description: "Frete rateado (R$ 6), sacola personalizada, tag de cheirinho (R$ 3,50) e custo fixo (+R$ 2).",
        tone: "warning",
      },
      {
        label: "Custo Real de Partida",
        value: "= R$ 61,40",
        description: "Antes de você lucrar qualquer centavo, a peça já custa isso para a sua loja!",
        tone: "neutral",
      },
      {
        label: "3. Preço de Venda Sugerido (2.3x)",
        value: "R$ 139,90",
        description: "Cobre a taxa de cartão de crédito e garante lucro limpo no bolso.",
        tone: "primary",
      },
      {
        label: "Lucro Líquido Real por Peça",
        value: "R$ 68,50 (49%)",
        description: "Sobram livres no seu bolso após pagar fornecedor, custos e taxas.",
        tone: "success",
      },
    ],
    expertLessons: [
      {
        title: "A Armadilha do Dobro (Markup Ingênuo)",
        explanation:
          "Muitas lojistas compram por R$ 50 e vendem por R$ 100 achando que dobraram o dinheiro. Porém, esquecem da sacola, frete, taxa da maquininha e imposto. No fim, sobram menos de R$ 25,00.",
      },
      {
        title: "O Que é o Custo Invisível?",
        explanation:
          "Toda viagem ao atacado, frete de transportadora e embalagem bonita que sua cliente adora recebendo nos Stories tem um custo. O Modaly divide esse custo por cada peça para você nunca pagar isso do próprio bolso.",
      },
      {
        title: "Margem Segura para Boutique de Moda",
        explanation:
          "No varejo de moda feminina, a margem bruta saudável fica entre 50% e 65% (multiplicador de 2.0x a 2.5x sobre o custo total). Isso garante fôlego para fazer promoções de troca de coleção sem ter prejuízo.",
      },
    ],
    goldenRule:
      "💡 Dica de Ouro: Nunca defina o preço de venda olhando apenas o valor da nota do fornecedor. Sempre some frete, embalagem e taxa de cartão.",
    practicalActionText: "Ir para o Estoque com margem calculada",
    practicalActionTo: "/estoque",
  },
  "/estoque": {
    title: "Consultoria: Grade Inteligente & Capital Livre",
    badge: "Gestão de Coleção",
    headline: "Como montar uma grade lucrativa sem encalhar peças",
    financialBreakdown: [
      {
        label: "Curva Ideal de Grade Feminina",
        value: "1 PP · 2 P · 3 M · 2 G · 1 GG",
        description: "Distribuição clássica com maior saída nos tamanhos médios no Brasil.",
        tone: "primary",
      },
      {
        label: "Perigo de Grade Igual (2 de cada)",
        value: "Ponta de Estoque",
        description: "Comprar a mesma quantia de PP e GG costuma deixar peças paradas por meses.",
        tone: "warning",
      },
      {
        label: "Tamanho Único Estratégico",
        value: "Peças Amplas & Bolsas",
        description: "Vestidos amplos, kimonos, cintos e bolsas giram rápido sem risco de grade.",
        tone: "success",
      },
    ],
    expertLessons: [
      {
        title: "Dinheiro Parado no Cabide",
        explanation:
          "Estoque parado é dinheiro perdendo valor. Ao cadastrar grade no Modaly, você acompanha quantas unidades restam de cada tamanho em tempo real.",
      },
      {
        title: "Tamanho Único vs Grade Numérica",
        explanation:
          "Peças com amarração ou elastex devem ser cadastradas no modo 'Tamanho Único' para facilitar a gestão no balcão e agilizar a venda pelo WhatsApp.",
      },
      {
        title: "Controle de Custo Cadastrado",
        explanation:
          "Preencher o custo de aquisição de cada peça é o que permite ao sistema calcular seu lucro automaticamente a cada venda passada no caixa.",
      },
    ],
    goldenRule:
      "💡 Dica de Ouro: Use a peça modelo abaixo para aprender visualmente como a grade e o lucro se organizam, ou clique em 'Usar como modelo'.",
    practicalActionText: "Definir Meta de Vendas",
    practicalActionTo: "/metas",
  },
  "/metas": {
    title: "Consultoria: Ritmo Diário & Faturamento",
    badge: "Estratégia Financeira",
    headline: "Como transformar um alvo grande em vitórias diárias",
    financialBreakdown: [
      {
        label: "Meta Mensal da Boutique",
        value: "Ex: R$ 25.000",
        description: "Faturamento necessário para cobrir despesas, compras e seu pró-labore.",
        tone: "primary",
      },
      {
        label: "Ritmo Diário Necessário",
        value: "R$ 1.041 / dia útil",
        description: "Considerando 24 dias de funcionamento da boutique no mês.",
        tone: "neutral",
      },
      {
        label: "Peças Vendidas por Dia",
        value: "Apenas 6 a 7 peças / dia",
        description: "Com um ticket médio de R$ 150 por cliente na sua loja.",
        tone: "success",
      },
    ],
    expertLessons: [
      {
        title: "Desmistificando o Alvo do Mês",
        explanation:
          "R$ 25.000 pode parecer muito, mas 7 peças por dia é um número tangível que você e sua equipe conseguem visualizar e buscar a cada atendimento.",
      },
      {
        title: "O Poder do Ticket Médio",
        explanation:
          "Oferecer um brinco, cinto ou acessório para cada cliente que já comprou um vestido eleva seu ticket médio e antecipa o cumprimento da meta em até 5 dias.",
      },
    ],
    goldenRule:
      "💡 Dica de Ouro: Acompanhe seu ritmo todo fim de tarde. Se hoje vendeu 5 peças, amanhã o foco é buscar 9 para manter o mês no verde.",
    practicalActionText: "Simular Venda no Caixa",
    practicalActionTo: "/caixa",
  },
  "/caixa": {
    title: "Consultoria: O Coração da Operação",
    badge: "Controle de Caixa",
    headline: "Como a baixa automática protege seu estoque e seu caixa",
    financialBreakdown: [
      {
        label: "Baixa em Tempo Real",
        value: "Zero Risco de Furo",
        description: "A peça vendida no balcão sai do estoque na hora, evitando venda duplicada.",
        tone: "success",
      },
      {
        label: "Separação de Meios de Pagamento",
        value: "Pix vs Cartão",
        description: "O Pix entra livre no mesmo dia; o cartão deduz a taxa sem iludir seu saldo.",
        tone: "primary",
      },
    ],
    expertLessons: [
      {
        title: "Fim das Planilhas Paralelas",
        explanation:
          "Ao registrar a venda no caixa do Modaly, você resolve 3 coisas com um clique: baixa o estoque, registra a entrada no DRE e atualiza o progresso da sua meta do mês.",
      },
      {
        title: "Avisos de Estoque Zerado",
        explanation:
          "Se uma peça acabou no estoque físico, o sistema te alerta antes de fechar o lançamento, garantindo precisão cirúrgica no inventário.",
      },
    ],
    goldenRule:
      "💡 Dica de Ouro: Registre todas as vendas no mesmo instante em que a cliente passa no balcão para seu saldo financeiro bater 100% no fechamento do dia.",
    practicalActionText: "Conhecer a Vitrine Online",
    practicalActionTo: "/loja",
  },
  "/loja": {
    title: "Consultoria: Vitrine Online & Vendas 24h",
    badge: "Canais Digitais",
    headline: "Como transformar visualizações do Instagram em Pix na conta",
    financialBreakdown: [
      {
        label: "Catálogo Online Sempre Atualizado",
        value: "Integrado ao Estoque",
        description: "Peça cadastrada na loja física aparece na vitrine automaticamente.",
        tone: "primary",
      },
      {
        label: "Conversão via WhatsApp",
        value: "Pedido Pronto com 1 Clique",
        description: "A cliente escolhe o tamanho e clica em Comprar, caindo no seu WhatsApp já com os dados.",
        tone: "success",
      },
    ],
    expertLessons: [
      {
        title: "Eliminando o Atrito do Direct",
        explanation:
          "Perguntar 'qual o preço?' no direct faz você perder 60% das vendas por demora na resposta. Com a vitrine na bio, a cliente já vê o preço correto, fotos e tamanhos disponíveis.",
      },
      {
        title: "Status Automático para a Cliente",
        explanation:
          "Ao atualizar o status do pedido na aba Pedidos, sua cliente pode receber mensagens automáticas de confirmação e envio sem você digitar nada.",
      },
    ],
    goldenRule:
      "💡 Dica de Ouro: Adicione o link da sua vitrine na bio do Instagram e faça stories semanais com o link direto da coleção em destaque.",
    practicalActionText: "Ir para o Painel Geral",
    practicalActionTo: "/painel",
  },
};

export const DEFAULT_EDUCATION: EducationalGuide = {
  title: "Coach Financeiro & Operacional da Boutique",
  badge: "Mentoria Vestuli",
  headline: "Como gerenciar sua boutique no padrão de grandes marcas",
  expertLessons: [
    {
      title: "O Segredo da Boutique Lucrativa",
      explanation:
        "Gerenciar uma loja de moda com sucesso exige 3 pilares alinhados: Precificação com custos invisíveis, controle rigoroso de estoque e acompanhamento diário da meta de vendas.",
    },
    {
      title: "Use o Coach em Cada Tela",
      explanation:
        "Em qualquer aba do Modaly que você acessar (Precificação, Estoque, Metas, Caixa ou Vitrine), abra este painel para receber orientações financeiras exclusivas e práticas.",
    },
  ],
  goldenRule:
    "💡 Dica de Ouro: Pequenas melhorias na margem e no controle de despesas somam milhares de reais a mais de lucro no final do ano.",
  practicalActionText: "Iniciar com a Precificação",
  practicalActionTo: "/precificacao",
};

interface GuideContextValue {
  isCoachOpen: boolean;
  openCoach: () => void;
  closeCoach: () => void;
  toggleCoach: () => void;
  currentEducation: EducationalGuide;
}

const GuideContext = createContext<GuideContextValue | undefined>(undefined);

const STORAGE_KEY_COACH_OPEN = "modaly_guide_coach_open";

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Por padrão, o Coach inicia recolhido para nunca atrapalhar o uso livre da tela
  const [isCoachOpen, setIsCoachOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY_COACH_OPEN) === "true";
  });

  const openCoach = () => {
    setIsCoachOpen(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_COACH_OPEN, "true");
    }
  };

  const closeCoach = () => {
    setIsCoachOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_COACH_OPEN, "false");
    }
  };

  const toggleCoach = () => {
    setIsCoachOpen((v) => {
      const next = !v;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_COACH_OPEN, String(next));
      }
      return next;
    });
  };

  // Encontra o guia educativo da rota atual
  let currentEducation = DEFAULT_EDUCATION;
  if (pathname in ROUTE_EDUCATION) {
    currentEducation = ROUTE_EDUCATION[pathname]!;
  } else if (pathname.startsWith("/loja")) {
    currentEducation = ROUTE_EDUCATION["/loja"]!;
  }

  return (
    <GuideContext.Provider
      value={{
        isCoachOpen,
        openCoach,
        closeCoach,
        toggleCoach,
        currentEducation,
      }}
    >
      {children}
    </GuideContext.Provider>
  );
}

const fallbackValue: GuideContextValue = {
  isCoachOpen: false,
  openCoach: () => {},
  closeCoach: () => {},
  toggleCoach: () => {},
  currentEducation: DEFAULT_EDUCATION,
};

export function useGuideTour() {
  const context = useContext(GuideContext);
  return context ?? fallbackValue;
}
