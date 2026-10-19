import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Layers, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionLabel, CtaButton } from './primitives';
import { useAppAuth } from '@/components/auth/AuthProvider';

interface DemoTopic {
  id: number;
  label: string;
  share: number;
  words: { word: string; weight: number }[];
  sampleIssue: { title: string; number: number; prob: string };
}

const DEMO_TOPICS: DemoTopic[] = [
  {
    id: 0,
    label: 'State Management & Re-renders',
    share: 26.4,
    words: [
      { word: 'render', weight: 0.048 },
      { word: 'hook', weight: 0.041 },
      { word: 'state', weight: 0.038 },
      { word: 'effect', weight: 0.029 },
      { word: 'update', weight: 0.024 },
      { word: 'batch', weight: 0.019 },
    ],
    sampleIssue: {
      title: 'Unexpected re-rendering when state setter invoked inside useEffect clean-up',
      number: 2841,
      prob: '99.2%',
    },
  },
  {
    id: 1,
    label: 'Hydration & SSR Streaming',
    share: 22.1,
    words: [
      { word: 'hydrate', weight: 0.052 },
      { word: 'server', weight: 0.044 },
      { word: 'stream', weight: 0.037 },
      { word: 'mismatch', weight: 0.031 },
      { word: 'client', weight: 0.025 },
      { word: 'suspense', weight: 0.021 },
    ],
    sampleIssue: {
      title: 'Hydration mismatch attribute value difference during selective boundary stream',
      number: 3109,
      prob: '97.8%',
    },
  },
  {
    id: 2,
    label: 'TypeScript & Type Inference',
    share: 19.8,
    words: [
      { word: 'type', weight: 0.056 },
      { word: 'generic', weight: 0.039 },
      { word: 'infer', weight: 0.034 },
      { word: 'prop', weight: 0.028 },
      { word: 'interface', weight: 0.024 },
      { word: 'dts', weight: 0.018 },
    ],
    sampleIssue: {
      title: 'Generic ComponentPropsWithRef loses polymorphic element type inference',
      number: 3450,
      prob: '98.5%',
    },
  },
  {
    id: 3,
    label: 'Concurrent Scheduler & Fiber',
    share: 17.5,
    words: [
      { word: 'fiber', weight: 0.049 },
      { word: 'schedule', weight: 0.042 },
      { word: 'priority', weight: 0.035 },
      { word: 'transition', weight: 0.029 },
      { word: 'lane', weight: 0.022 },
      { word: 'yield', weight: 0.017 },
    ],
    sampleIssue: {
      title: 'startTransition starved under high frequency continuous input events',
      number: 3612,
      prob: '96.4%',
    },
  },
  {
    id: 4,
    label: 'Build Tooling & Bundler Plugins',
    share: 14.2,
    words: [
      { word: 'plugin', weight: 0.045 },
      { word: 'bundle', weight: 0.038 },
      { word: 'vite', weight: 0.032 },
      { word: 'transform', weight: 0.027 },
      { word: 'source', weight: 0.021 },
      { word: 'minify', weight: 0.016 },
    ],
    sampleIssue: {
      title: 'Fast Refresh babel runtime transform missing sourcemap column offset',
      number: 3824,
      prob: '94.9%',
    },
  },
];

export const Showcase = () => {
  const [selectedTopic, setSelectedTopic] = React.useState<DemoTopic>(DEMO_TOPICS[0]);
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAppAuth();

  const handleAnalyze = () => {
    if (isLoaded && !isSignedIn) {
      navigate('/sign-in?redirect_url=/app/analyze');
    } else {
      navigate('/app/analyze');
    }
  };

  const maxWeight = Math.max(...selectedTopic.words.map((w) => w.weight));

  return (
    <section id="showcase" data-slot="showcase" className="border-t border-border/40 bg-[var(--background)] px-8 py-24 lg:px-16 lg:py-32">
      <SectionLabel>Live Intelligence Showcase</SectionLabel>

      <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
        {/* Left Side: Topic Selector */}
        <div className="lg:w-[40%] flex flex-col gap-4">
          <div className="mb-2">
            <h2 className="text-3xl font-light tracking-tight text-foreground sm:text-4xl">
              Real Model Discovery
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Select any discovered latent topic from this trained <span className="text-foreground font-semibold">K=5</span> model to inspect word probabilities and mapped GitHub issues.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {DEMO_TOPICS.map((topic) => {
              const isSelected = selectedTopic.id === topic.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopic(topic)}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-4 text-left transition-all active:scale-[0.98]',
                    isSelected
                      ? 'border-primary/60 bg-card shadow-md shadow-primary/5'
                      : 'border-border/40 bg-card/40 hover:border-border hover:bg-card/70'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex size-7 items-center justify-center rounded-md text-xs font-semibold',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                      )}
                    >
                      {String(topic.id + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{topic.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {topic.words.slice(0, 3).map((w) => w.word).join(', ')}...
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-semibold tabular-nums',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {topic.share}%
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-border/40 bg-secondary/30 p-4 text-xs text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="size-4 text-primary" /> Topic Coherence evaluation:
            </span>
            <span className="font-semibold text-primary">C_v = 0.448 (Optimal)</span>
          </div>
        </div>

        {/* Right Side: Deep Dive Card */}
        <div className="lg:w-[60%] rounded-xl border border-border/60 bg-card p-6 lg:p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-5">
            <div>
              <span className="text-[10px] tracking-widest uppercase text-primary font-medium">
                TOPIC {String(selectedTopic.id + 1).padStart(2, '0')} · {selectedTopic.share}% OVERALL SHARE
              </span>
              <h3 className="mt-1 text-2xl font-normal tracking-tight text-foreground">
                {selectedTopic.label}
              </h3>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-secondary px-3 py-1 text-xs text-muted-foreground">
              <Layers className="size-3.5 text-primary" /> Dirichlet Posterior
            </div>
          </div>

          {/* Word Distributions */}
          <div className="mt-6">
            <p className="text-xs tracking-wider uppercase text-muted-foreground/80 font-medium mb-4">
              Top Vocabulary Term Weights (&beta; Distribution)
            </p>
            <div className="space-y-3">
              {selectedTopic.words.map((item) => {
                const widthPercent = (item.weight / maxWeight) * 100;
                return (
                  <div key={item.word} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground font-medium">{item.word}</span>
                      <span className="text-muted-foreground tabular-nums">{item.weight.toFixed(3)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Representative Issue Sample */}
          <div className="mt-8 rounded-lg border border-border/60 bg-background/50 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1.5 text-primary">
                <CheckCircle2 className="size-3.5" /> High-Confidence Assigned Issue
              </span>
              <span className="rounded-md border border-border/60 bg-secondary/60 px-2.5 py-0.5 text-xs text-foreground font-semibold tabular-nums">
                P = {selectedTopic.sampleIssue.prob}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">
              #{selectedTopic.sampleIssue.number}: {selectedTopic.sampleIssue.title}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/40">
            <span className="text-xs text-muted-foreground">
              Run this exact model on your own GitHub repositories in seconds.
            </span>
            <CtaButton onClick={handleAnalyze} className="flex items-center gap-2">
              Analyze Your Repo <ArrowRight className="size-4" />
            </CtaButton>
          </div>
        </div>
      </div>
    </section>
  );
};
