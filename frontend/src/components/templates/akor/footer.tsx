import { ExternalLink } from 'lucide-react';
import { Github } from '@/components/ui/github-icon';
import { NAV_LINKS } from './navbar';
import { Wordmark } from './primitives';

export const Footer = () => {
  return (
    <footer data-slot="footer" className="border-t border-border/40 bg-[var(--akor-ink)] px-8 py-12 lg:px-16">
      <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <Wordmark showBadge />
        <nav className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://github.com/srichu05/Gitissue"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs tracking-widest text-muted-foreground uppercase transition-colors hover:text-primary"
          >
            <Github className="size-3.5" /> GitHub <ExternalLink className="size-3" />
          </a>
        </nav>
      </div>

      <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border/20 pt-8 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground/60 tracking-wide font-normal">
          &copy; 2026 GitIssue Platform. NLP-Powered GitHub Topic Intelligence.
        </p>
        <p className="text-xs text-muted-foreground/40 tracking-wide font-normal">
          Latent Dirichlet Allocation &middot; Sora &middot; Radix UI &middot; Neon Serverless
        </p>
      </div>
    </footer>
  );
};
