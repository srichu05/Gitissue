import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Cpu } from 'lucide-react';

import { CtaButton, SectionLabel } from './primitives';
import { useAppAuth } from '@/components/auth/AuthProvider';

const ABOUT_VIDEO = 'https://hirael.com/media/templates/akor/about.mp4';

export const About = () => {
  const [hasVideoFailed, setHasVideoFailed] = React.useState(false);
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAppAuth();

  const handleStartAnalysis = () => {
    if (isLoaded && !isSignedIn) {
      navigate('/sign-in?redirect_url=/app/analyze');
    } else {
      navigate('/app/analyze');
    }
  };

  return (
    <section id="about" data-slot="about" className="bg-[var(--akor-ink)] px-8 pt-12 pb-24 lg:px-16 lg:pt-16 lg:pb-32">
      <SectionLabel>Methodology & Architecture</SectionLabel>

      <div className="flex flex-col items-stretch gap-12 lg:flex-row lg:gap-0">
        <div className="lg:w-[45%]">
          <div className="relative overflow-hidden rounded-md border border-border/40 bg-card min-h-[380px] lg:min-h-[500px] flex items-center justify-center shadow-2xl">
            {hasVideoFailed ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-gradient-to-br from-card via-background to-card w-full h-full">
                <Cpu className="size-12 text-primary mb-3 animate-pulse" />
                <p className="font-mono text-sm text-foreground">Deterministic NLP Preprocessing</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Variational Bayes inference running over filtered dictionary vocabulary.
                </p>
              </div>
            ) : (
              <video
                className="h-full w-full rounded-sm object-cover"
                src={ABOUT_VIDEO}
                autoPlay
                loop
                muted
                playsInline
                aria-hidden
                tabIndex={-1}
                onError={() => setHasVideoFailed(true)}
              />
            )}
            <div className="absolute bottom-3 left-3 rounded-md bg-background/85 backdrop-blur-md px-3 py-1.5 text-xs font-medium tracking-wide text-muted-foreground border border-border/40 shadow-sm">
              Corpus Pipeline · LDA Variational Bayes
            </div>
          </div>
        </div>

        <div aria-hidden className="mx-10 mt-8 hidden w-px bg-muted-foreground/20 lg:block" />

        <div className="flex min-h-[480px] flex-1 flex-col justify-between lg:min-h-[560px]">
          <div>
            <h2 className="text-3xl leading-[1.15] font-normal tracking-tight text-foreground sm:text-4xl">
              Deterministic NLP pipelines and probabilistic modeling for modern open-source repositories
            </h2>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {[
                'spaCy Tokenization',
                'Extreme Filter (no_below=5, no_above=0.5)',
                'Collapsed Gibbs Sampler',
                'Gensim LdaModel',
                'Per-document \u03B8 vector',
              ].map((badge) => (
                <span
                  key={badge}
                  className="rounded-md border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs font-medium tracking-wide text-foreground/80 hover:border-primary/40 hover:bg-secondary/70 transition-all"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-10">
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              GitIssue designs and executes issue intelligence systems that learn. We pair GitHub data extraction with unsupervised topic models trained on real issue corpora, so maintainers diagnose structural bottlenecks before they compound into blocker incidents. In accordance with PRD data hygiene invariants, raw issue bodies are excluded from database persistence.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <CtaButton onClick={handleStartAnalysis} className="flex items-center gap-2">
                Start Free Analysis <ArrowRight className="size-4" />
              </CtaButton>
              <span className="text-xs text-muted-foreground/60 tracking-wider uppercase font-medium">
                No credit card required
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
