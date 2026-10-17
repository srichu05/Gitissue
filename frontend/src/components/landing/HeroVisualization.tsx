import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { FileText, Network, Boxes, Lightbulb, ArrowRight } from "lucide-react"

export function HeroVisualization() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReduced || !containerRef.current) return

    const ctx = gsap.context(() => {
      gsap.from(".hero-node", {
        opacity: 0,
        scale: 0.5,
        duration: 0.8,
        stagger: 0.12,
        ease: "power2.out",
        delay: 0.3,
      })

      gsap.from(".hero-line", {
        strokeDashoffset: 200,
        duration: 1.2,
        stagger: 0.1,
        ease: "power2.inOut",
        delay: 0.5,
      })

      gsap.to(".hero-float", {
        y: -12,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.3,
      })

      gsap.to(".hero-float-slow", {
        y: -8,
        x: 4,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.5,
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef} className="relative h-[400px] w-full md:h-[460px]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 420" fill="none">
        {/* Connection lines */}
        <line className="hero-line" x1="80" y1="80" x2="220" y2="160" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="4 4" />
        <line className="hero-line" x1="220" y1="160" x2="380" y2="120" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="4 4" />
        <line className="hero-line" x1="220" y1="160" x2="380" y2="240" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="4 4" />
        <line className="hero-line" x1="380" y1="120" x2="520" y2="200" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="4 4" />
        <line className="hero-line" x1="380" y1="240" x2="520" y2="200" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="4 4" />
        <line className="hero-line" x1="380" y1="120" x2="380" y2="240" stroke="var(--border)" strokeWidth="1" strokeDasharray="2 6" />
      </svg>

      {/* GitHub Issues source */}
      <div className="hero-node hero-float absolute left-[3%] top-[12%] flex flex-col items-center gap-1.5">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-card shadow-sm">
          <FileText className="size-7 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">GitHub Issues</span>
      </div>

      {/* NLP Preprocessing */}
      <div className="hero-node hero-float-slow absolute left-[30%] top-[34%] flex flex-col items-center gap-1.5">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-card shadow-sm">
          <Network className="size-7 text-chart-2" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">NLP Preprocessing</span>
      </div>

      {/* Topic clusters */}
      <div className="hero-node hero-float absolute left-[60%] top-[20%] flex flex-col items-center gap-1.5">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-card shadow-sm">
          <Boxes className="size-7 text-chart-3" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">Topic Clusters</span>
      </div>

      <div className="hero-node hero-float-slow absolute left-[60%] top-[52%] flex flex-col items-center gap-1.5">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-card shadow-sm">
          <Boxes className="size-7 text-chart-4" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">LDA Model</span>
      </div>

      {/* Insights */}
      <div className="hero-node hero-float absolute left-[84%] top-[40%] flex flex-col items-center gap-1.5">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-primary/10 shadow-sm">
          <Lightbulb className="size-7 text-primary" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">Insights</span>
      </div>

      {/* Floating word chips */}
      <div className="hero-float absolute left-[14%] top-[52%] rounded-md border bg-card px-2 py-1 text-xs font-mono shadow-sm">
        dependency
      </div>
      <div className="hero-float-slow absolute left-[42%] top-[64%] rounded-md border bg-card px-2 py-1 text-xs font-mono shadow-sm">
        performance
      </div>
      <div className="hero-float absolute left-[72%] top-[70%] rounded-md border bg-card px-2 py-1 text-xs font-mono shadow-sm">
        hooks
      </div>
      <div className="hero-float-slow absolute left-[24%] top-[68%] rounded-md border bg-card px-2 py-1 text-xs font-mono shadow-sm">
        <ArrowRight className="inline size-3" /> topic #3
      </div>
    </div>
  )
}
