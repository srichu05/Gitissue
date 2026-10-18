import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Wordmark } from './primitives';

export const NAV_LINKS = [
  { label: 'Services', href: '#services' },
  { label: 'Methodology', href: '#about' },
  { label: 'Live Showcase', href: '#showcase' },
  { label: 'Workflow', href: '#workflow' },
] as const;

const QUOTE_BUTTON = 'h-11 active:scale-[0.97]';

export const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      data-slot="navbar"
      className={cn(
        'fixed inset-x-0 top-0 z-50 px-8 py-5 transition-all duration-300 lg:px-16',
        isScrolled
          ? 'bg-background/85 backdrop-blur-md border-b border-border/40 py-4 shadow-sm'
          : 'bg-gradient-to-b from-background/80 to-transparent'
      )}
    >
      <nav className="flex items-center justify-between gap-6">
        <a href="#home" aria-label="GitIssue home" className="hover:opacity-90 transition-opacity">
          <Wordmark showBadge />
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <button
            type="button"
            onClick={() => navigate('/sign-in')}
            className="text-xs tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground active:scale-[0.97]"
          >
            Sign In
          </button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => navigate('/app/analyze')}
            className={cn(
              QUOTE_BUTTON,
              'inline-flex items-center gap-1.5 border border-border/40 hover:border-border'
            )}
          >
            Launch Workspace <ArrowUpRight className="size-3.5" />
          </Button>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="icon-lg"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
          className="md:hidden"
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </nav>

      {isOpen ? (
        <div className="mt-4 flex flex-col gap-1 rounded-lg border border-border bg-card/95 backdrop-blur-lg p-3 md:hidden shadow-2xl">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="rounded-md px-4 py-3 text-xs tracking-widest text-muted-foreground uppercase transition-colors hover:bg-secondary hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2 pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/sign-in');
              }}
              className="px-4 py-2 text-left text-xs tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Sign In
            </button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => {
                setIsOpen(false);
                navigate('/app/analyze');
              }}
              className={cn(QUOTE_BUTTON, 'w-full justify-center')}
            >
              Launch Workspace
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
};
