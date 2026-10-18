import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface WordmarkProps {
  className?: string;
  showBadge?: boolean;
}

export const Wordmark = ({ className }: WordmarkProps) => {
  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <span className="text-xl font-semibold tracking-tight text-foreground">
        GIT<span className="text-primary font-bold">ISSUE</span>
      </span>
    </div>
  );
};

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionLabel = ({ children, className }: SectionLabelProps) => {
  return (
    <div className={className}>
      <p className="mb-8 text-xs tracking-[0.25em] text-muted-foreground/60 uppercase">{children}</p>
      <div aria-hidden className="mb-16 h-px w-full bg-muted-foreground/20" />
    </div>
  );
};

type CtaButtonProps = React.ComponentProps<typeof Button>;

export const CtaButton = ({ className, variant = 'default', ...props }: CtaButtonProps) => {
  return (
    <Button
      type="button"
      variant={variant}
      size="lg"
      className={cn(
        'h-11 rounded-md px-6 text-sm font-medium transition-all active:scale-[0.97]',
        variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/40',
        className
      )}
      {...props}
    />
  );
};

type TextLinkProps = React.ComponentProps<'a'>;

export const TextLink = ({ className, ...props }: TextLinkProps) => {
  return (
    <a
      className={cn(
        'border-b border-primary pb-1 text-xs tracking-widest text-foreground uppercase transition-colors hover:text-primary active:scale-[0.97] cursor-pointer inline-flex items-center gap-1.5',
        className
      )}
      {...props}
    />
  );
};
