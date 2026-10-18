import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { CtaButton, TextLink } from './primitives';

const HERO_VIDEO = 'https://hirael.com/media/templates/akor/hero.mp4';

interface HeroProps {
  videoSrc?: string;
  posterSrc?: string;
}

export const Hero = ({ videoSrc = HERO_VIDEO, posterSrc }: HeroProps) => {
  const [hasVideoFailed, setHasVideoFailed] = React.useState(false);
  const navigate = useNavigate();

  return (
    <section
      id="home"
      data-slot="hero"
      className="relative flex min-h-svh flex-col justify-end overflow-hidden bg-[var(--akor-hero)]"
    >
      {hasVideoFailed ? (
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-muted via-[var(--akor-hero)] to-background bg-cover bg-center"
          style={posterSrc ? { backgroundImage: `url(${posterSrc})` } : undefined}
        />
      ) : (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={videoSrc}
          poster={posterSrc}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden
          tabIndex={-1}
          onError={() => setHasVideoFailed(true)}
        />
      )}

      <div className="relative z-10 px-8 pt-32 pb-20 lg:px-16 lg:pb-28">
        <h1 className="rise text-5xl leading-[0.95] font-light tracking-tight text-foreground [animation-delay:0.2s] sm:text-6xl lg:text-[5.5rem]">
          Probabilistic
          <br />
          Topic Intelligence
        </h1>

        <p className="rise mt-6 mb-10 max-w-xl text-base text-muted-foreground [animation-delay:0.45s] lg:text-lg">
          Transform unstructured GitHub issues into actionable technical clusters with academic-grade Latent Dirichlet Allocation and coherence optimization.
        </p>

        <div className="fade-up flex flex-wrap items-center gap-8 [animation-delay:0.65s]">
          <CtaButton onClick={() => navigate('/app/analyze')} className="flex items-center gap-2">
            Analyze Repository <ArrowRight className="size-4" />
          </CtaButton>
          <TextLink href="#services">Explore Capabilities</TextLink>
        </div>

        {/* Meaningful technical context without fake numbers */}
        <div className="fade-up mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 pt-6 border-t border-border/30 text-xs tracking-wider text-muted-foreground [animation-delay:0.8s]">
          <div>
            <span className="font-semibold text-foreground text-sm tracking-widest">UNSUPERVISED</span> CLUSTERING
          </div>
          <div aria-hidden className="hidden sm:block size-1 rounded-full bg-primary" />
          <div>
            <span className="font-semibold text-primary text-sm tracking-widest">DIRICHLET</span> POSTERIORS
          </div>
          <div aria-hidden className="hidden sm:block size-1 rounded-full bg-primary" />
          <div>
            <span className="font-semibold text-foreground text-sm tracking-widest">K-SWEEP</span> AUTO-OPTIMIZATION
          </div>
          <div aria-hidden className="hidden sm:block size-1 rounded-full bg-primary" />
          <div>
            <span className="font-semibold text-foreground text-sm tracking-widest">ZERO</span> BODY PERSISTENCE
          </div>
        </div>
      </div>
    </section>
  );
};
