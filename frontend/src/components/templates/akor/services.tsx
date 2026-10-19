import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { CtaButton, SectionLabel } from './primitives';
import { useAppAuth } from '@/components/auth/AuthProvider';

const SERVICES = [
  {
    icon: 'https://hirael.com/media/templates/akor/service-1.webp',
    title: 'Latent Topic\nDiscovery',
    description:
      'Generative probabilistic modeling isolates orthogonal technical clusters across untagged issue backlogs with automated coherence-optimized K selection.',
  },
  {
    icon: 'https://hirael.com/media/templates/akor/service-2.webp',
    title: 'Per-Issue\nDistribution',
    description:
      'Every bug report and feature request receives a Dirichlet posterior distribution, quantifying primary and cross-cutting architectural concerns.',
  },
  {
    icon: 'https://hirael.com/media/templates/akor/service-3.webp',
    title: 'Temporal Trend\nTracking',
    description:
      'Track month-over-month topic velocity to detect regressions, emerging tech debt, and shifting community discussions before they escalate.',
  },
  {
    icon: 'https://hirael.com/media/templates/akor/service-4.webp',
    title: 'Academic\nEvaluation',
    description:
      'Verify model validity with C_v topic coherence, perplexity curves, Gibbs sampling diagnostics, and exportable research-ready reports.',
  },
] as const;

const ROWS = [SERVICES.slice(0, 2), SERVICES.slice(2)];

export const Services = () => {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAppAuth();

  const handleLaunchWorkspace = () => {
    if (isLoaded && !isSignedIn) {
      navigate('/sign-in?redirect_url=/app/analyze');
    } else {
      navigate('/app/analyze');
    }
  };

  return (
    <section id="services" data-slot="services" className="bg-foreground px-8 py-24 text-background lg:px-16 lg:py-32">
      <SectionLabel className="[&_p]:text-background/60 [&_div]:bg-background/20">
        Platform Capabilities
      </SectionLabel>

      <div className="flex flex-col gap-16 lg:flex-row lg:gap-24">
        <div className="flex flex-col justify-center lg:w-[38%]">
          <h2 className="text-3xl leading-[1.15] font-normal tracking-tight text-background sm:text-4xl">
            Topic modeling, Dirichlet distributions, and NLP, helping engineering teams resolve issues faster
          </h2>
          <p className="mt-6 text-sm leading-relaxed text-background/70">
            Replace manual issue triage with unsupervised probabilistic machine learning that runs deterministically and reproduces across datasets.
          </p>
          <div className="mt-10">
            <CtaButton
              onClick={handleLaunchWorkspace}
              className="bg-background text-foreground hover:bg-background/90 inline-flex items-center gap-2"
            >
              Launch Workspace <ArrowRight className="size-4" />
            </CtaButton>
          </div>
        </div>

        <div className="lg:w-[62%]">
          {ROWS.map((row, rowIndex) => (
            <React.Fragment key={rowIndex}>
              {rowIndex > 0 ? <div aria-hidden className="my-12 h-px w-full bg-background/15" /> : null}
              <div className="grid grid-cols-1 gap-12 sm:grid-cols-2">
                {row.map((service, index) => {
                  const number = rowIndex * 2 + index + 1;

                  return (
                    <article key={service.title} className="border-s border-background/15 ps-8 transition-transform hover:-translate-y-0.5 duration-200">
                      <img
                        src={service.icon}
                        alt=""
                        width={64}
                        height={64}
                        className="size-16 object-contain mix-blend-multiply"
                        loading="lazy"
                      />
                      <p className="mt-6 text-xs text-background/40 tabular-nums tracking-wider font-medium">
                        {String(number).padStart(2, '0')}
                      </p>
                      <h3 className="mt-2 text-xl leading-tight font-medium whitespace-pre-line text-background">
                        {service.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-background/60">{service.description}</p>
                    </article>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
