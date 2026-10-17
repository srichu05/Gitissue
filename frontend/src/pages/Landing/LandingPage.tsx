import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LandingNav } from "@/components/navigation/LandingNav"
import { HeroVisualization } from "@/components/landing/HeroVisualization"
import { LandingFooter } from "@/components/landing/LandingFooter"

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-svh bg-background">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <motion.div
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.1 }}
          >
            <motion.div variants={fadeUp}>
              <Badge variant="secondary" className="mb-4 gap-1.5">
                <Sparkles className="size-3" /> NLP-Powered Topic Intelligence
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-4xl font-bold tracking-tight text-balance sm:text-5xl"
            >
              Turn GitHub Issues Into Actionable Topic Intelligence
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-4 max-w-lg text-lg text-muted-foreground text-pretty"
            >
              GitIssue uses probabilistic LDA topic modeling to discover hidden
              themes across thousands of GitHub issues — transforming unstructured
              text into structured, navigable insight.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/app/analyze")}>
                Analyze a Repository <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/app")}>
                Explore GitIssue
              </Button>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">1,248</span> issues analyzed
              </div>
              <div>
                <span className="font-semibold text-foreground">6</span> topics discovered
              </div>
              <div>
                <span className="font-semibold text-foreground">4,312</span> word vocabulary
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <HeroVisualization />
          </motion.div>
        </div>
      </section>

      {/* Product Introduction */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            From scattered issues to structured intelligence
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Every GitHub repository accumulates hundreds of issues. GitIssue
            applies Latent Dirichlet Allocation to uncover the natural topic
            structure hidden in that text — so you can understand what your
            community is actually talking about.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="mb-12 text-3xl font-semibold tracking-tight text-center">
            How GitIssue Works
          </h2>
          <div className="grid gap-8 md:grid-cols-5">
            {[
              { n: 1, label: "GitHub Repository", desc: "Connect any public repository" },
              { n: 2, label: "Issue Collection", desc: "Fetch all open and closed issues" },
              { n: 3, label: "NLP Preprocessing", desc: "Tokenize, clean, filter, lemmatize" },
              { n: 4, label: "LDA Topic Modeling", desc: "Discover latent topics with LDA" },
              { n: 5, label: "Topic Intelligence", desc: "Explore, label, and export insights" },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card font-semibold text-primary">
                  {step.n}
                </div>
                <p className="mt-3 font-medium">{step.label}</p>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
                {i < 4 && (
                  <div className="absolute -right-4 top-5 hidden h-px w-8 bg-border md:block" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LDA Explanation */}
      <section id="lda" className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              LDA Topic Intelligence
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Latent Dirichlet Allocation is a generative probabilistic model
              that treats each issue as a mixture of topics, and each topic as
              a distribution over words. GitIssue trains this model on your
              repository's issues and surfaces the underlying themes.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Automatic K selection via coherence optimization",
                "Per-issue topic distribution for granular analysis",
                "Human-in-the-loop topic labeling",
                "Topic prevalence trends over time",
                "Academic evaluation metrics (C_v coherence, perplexity)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-lg border bg-card p-6 shadow-sm"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Example Topic Output
            </p>
            <div className="space-y-4">
              {[
                { label: "Topic 1 — Performance & Rendering", words: "performance / render / fiber / concurrent / scheduler", pct: "24%" },
                { label: "Topic 2 — Hooks & State", words: "hook / state / effect / useState / context", pct: "21%" },
                { label: "Topic 3 — TypeScript & Types", words: "typescript / type / interface / generic", pct: "18%" },
              ].map((t) => (
                <div key={t.label} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{t.label}</span>
                    <Badge variant="secondary">{t.pct}</Badge>
                  </div>
                  <p className="mt-1.5 text-xs font-mono text-muted-foreground">{t.words}</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: t.pct }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="mb-12 text-3xl font-semibold tracking-tight text-center">
            Feature Highlights
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: "Topic Discovery", desc: "Uncover latent themes with probabilistic LDA modeling and coherence-optimized K selection." },
              { title: "Issue Classification", desc: "Every issue gets a topic distribution, showing which themes it belongs to and how strongly." },
              { title: "Trend Analysis", desc: "Track how topic prevalence shifts month over month with stacked area visualizations." },
              { title: "Model Evaluation", desc: "Review C_v coherence scores, perplexity, and K-sweep results to understand model quality." },
              { title: "Corpus Statistics", desc: "Inspect preprocessing pipeline results — retained documents, vocabulary size, token statistics." },
              { title: "Export & Report", desc: "Download results as Markdown reports, JSON, or CSV files for further analysis and sharing." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg border bg-card p-6 shadow-sm"
              >
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="rounded-xl border bg-primary/5 p-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Start analyzing your repository
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Connect a GitHub repository and discover what your issues are
            really about.
          </p>
          <Button size="lg" className="mt-6" onClick={() => navigate("/app/analyze")}>
            Analyze a Repository <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      <LandingFooter />
    </div>
  )
}
