import { SectionLabel } from './primitives';

const STEPS = [
  {
    step: '01',
    title: 'GitHub Issue Ingestion',
    description: 'Fetch issues across open and closed states via GitHub REST API without retaining raw issue bodies in persistent storage.',
  },
  {
    step: '02',
    title: 'Corpus Preprocessing',
    description: 'Deterministic spaCy tokenization, stopword removal, code block stripping, and extreme frequency pruning.',
  },
  {
    step: '03',
    title: 'K-Sweep Coherence',
    description: 'Automated evaluation across topic counts K=2..15 to find the global maximum of the Cv coherence curve.',
  },
  {
    step: '04',
    title: 'Variational LDA Training',
    description: 'Train Gensim or collapsed Gibbs LDA to learn document-topic (theta) and topic-word (beta) Dirichlet distributions.',
  },
  {
    step: '05',
    title: 'Interactive Intelligence',
    description: 'Explore topics, review temporal trends, re-label clusters, and export research-grade Markdown, CSV, and JSON reports.',
  },
] as const;

export const Workflow = () => {
  return (
    <section id="workflow" data-slot="workflow" className="border-t border-border/40 bg-[var(--akor-ink)] px-8 py-24 lg:px-16 lg:py-32">
      <SectionLabel>Architecture & Workflow</SectionLabel>

      <div className="mb-14 max-w-2xl">
        <h2 className="text-3xl font-light tracking-tight text-foreground sm:text-4xl">
          Five-stage probabilistic pipeline from raw GitHub API to actionable intelligence
        </h2>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          Every stage enforces the PRD invariants: mathematical determinism, continuous percentage formatting, and absolute database data hygiene.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((s) => (
          <div
            key={s.step}
            className="group relative flex flex-col justify-between rounded-lg border border-border/40 bg-card/60 p-6 transition-all duration-300 hover:border-primary/50 hover:bg-card hover:-translate-y-1"
          >
            <div>
              <span className="text-2xl font-light tracking-tight text-primary/80 group-hover:text-primary transition-colors">
                {s.step}
              </span>
              <h3 className="mt-4 text-base font-medium text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {s.description}
              </p>
            </div>
            <div className="mt-6 h-0.5 w-full bg-secondary overflow-hidden rounded-full">
              <div className="h-full w-0 bg-primary transition-all duration-500 group-hover:w-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
