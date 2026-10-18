import { Link } from "react-router-dom"

export function LandingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-zinc-950 font-extrabold text-xs tracking-tight shadow-sm">
            GI
          </div>
          <span className="font-bold">GitIssue</span>
        </div>
        <p className="text-sm text-muted-foreground">
          NLP-Powered GitHub Issue Topic Intelligence
        </p>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <Link to="/sign-in" className="hover:text-foreground transition-colors">Sign In</Link>
          <Link to="/sign-up" className="hover:text-foreground transition-colors">Sign Up</Link>
        </div>
      </div>
    </footer>
  )
}
