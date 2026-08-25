import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Calculator,
  HandCoins,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import heroImage from "@/assets/hero-boutique.jpg";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vestuli — Gestão financeira & Loja online para moda" },
      {
        name: "description",
        content:
          "Precificação com margem real, controle de caixa, fiado, estoque, DRE e vitrine online: a plataforma feita para o varejo de moda.",
      },
      { property: "og:title", content: "Vestuli — Gestão financeira & Loja online para moda" },
      {
        property: "og:description",
        content:
          "Saiba exatamente quanto lucra em cada peça, controle o caixa e venda online com sua vitrine conectada.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Calculator,
    title: "Precificação inteligente",
    text: "Atacado, frete, embalagem e imposto entram na conta. Você vê o preço mínimo e o sugerido com margem real.",
  },
  {
    icon: Wallet,
    title: "Caixa diário",
    text: "Entradas e saídas por categoria e forma de pagamento, com saldo do dia e do mês sempre visível.",
  },
  {
    icon: HandCoins,
    title: "Pró-labore separado",
    text: "Defina sua retirada mensal e nunca mais confunda o dinheiro da loja com o dinheiro pessoal.",
  },
  {
    icon: Users,
    title: "Fiado sob controle",
    text: "Clientes, vencimentos, pagamentos parciais e alertas do que está atrasado.",
  },
  {
    icon: Boxes,
    title: "Estoque por grade",
    text: "Peças, tamanhos, custo e preço de venda — com giro de saída no mês.",
  },
  {
    icon: Target,
    title: "Metas e projeção",
    text: "Meta mensal com barra de progresso e projeção de fechamento baseada no seu ritmo.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-40">
        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#recursos" className="transition-colors hover:text-foreground">
              Recursos
            </a>
            <a href="#como-funciona" className="transition-colors hover:text-foreground">
              Como funciona
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="rounded-full text-sm">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild className="rounded-full text-sm font-semibold">
              <Link to="/auth">Começar agora</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> Feito para lojas de moda
          </span>
          <h1 className="mt-7 font-display text-[2.75rem] font-semibold leading-[1.03] tracking-tight sm:text-[4rem]">
            O financeiro da sua loja com <span className="gradient-ink">clareza total</span>.
          </h1>
          <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            O Vestuli mostra quanto você realmente lucra em cada peça, organiza o caixa, separa seu
            pró-labore e coloca o fiado no lugar. Sem planilha, sem achismo.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-13 rounded-full px-7 text-sm font-semibold">
              <Link to="/auth">
                Entrar no painel <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 rounded-full px-7 text-sm font-semibold"
            >
              <a href="#recursos">Ver recursos</a>
            </Button>
          </div>
          <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Seus dados são privados — cada loja vê apenas o seu.
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-primary/5 blur-2xl" />
          <img
            src={heroImage}
            alt="Interior claro e minimalista de uma boutique de moda"
            width={1280}
            height={1600}
            className="relative aspect-[4/5] w-full rounded-[2rem] object-cover shadow-lift"
          />
          <div className="panel absolute -bottom-8 left-4 w-[240px] p-5 sm:left-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Lucro do mês
            </p>
            <p className="numeric mt-2 text-2xl font-semibold text-success">R$ 12.480</p>
            <p className="mt-2 text-xs text-muted-foreground">Margem real de 38,4%</p>
          </div>
        </div>
      </section>

      <section id="recursos" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <h2 className="max-w-xl font-display text-3xl font-semibold leading-tight sm:text-[2.5rem]">
          Tudo que uma loja de moda precisa controlar.
        </h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="panel p-7 transition-shadow hover:shadow-lift">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <div className="panel overflow-hidden p-8 sm:p-14">
          <h2 className="max-w-lg font-display text-3xl font-semibold leading-tight sm:text-[2.4rem]">
            Comece em três passos.
          </h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                n: "01",
                t: "Configure sua loja",
                d: "Nome, cidade e a retirada mensal que você quer fazer.",
              },
              {
                n: "02",
                t: "Lance o dia",
                d: "Vendas e despesas em segundos, no celular ou no computador.",
              },
              {
                n: "03",
                t: "Decida com dados",
                d: "Preço certo, meta clara e fiado sob controle.",
              },
            ].map((s) => (
              <li key={s.n}>
                <p className="numeric text-sm font-semibold text-primary">{s.n}</p>
                <p className="mt-3 text-base font-semibold">{s.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="h-13 rounded-full px-7 text-sm font-semibold">
              <Link to="/auth">
                Acessar plataforma <ArrowRight className="size-4" />
              </Link>
            </Button>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <BarChart3 className="size-4 text-primary" /> Relatórios prontos desde o primeiro mês
            </span>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 text-xs text-muted-foreground sm:flex-row sm:px-8">
          <Logo />
          <p>© {new Date().getFullYear()} Vestuli. Gestão financeira e loja online para moda.</p>
        </div>
      </footer>
    </div>
  );
}
