import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"

export function LandingNav() {
  const navigate = useNavigate()

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-zinc-950 font-extrabold text-sm tracking-tight shadow-sm">
            GI
          </div>
          <span className="text-lg font-bold tracking-tight">GitIssue</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#lda" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Topic Intelligence
          </a>
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button variant="ghost" size="sm" onClick={() => navigate("/sign-in")}>
            Sign In
          </Button>
          <Button size="sm" onClick={() => navigate("/sign-up")}>
            Get Started
          </Button>
        </div>
      </div>
    </nav>
  )
}
