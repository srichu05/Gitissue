import { Link } from "react-router-dom"
import { Github } from "@/components/ui/github-icon"
import { motion } from "framer-motion"

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: React.ReactNode
  footerText: string
  footerLink: string
  footerLinkText: string
}

export function AuthLayout({ title, subtitle, children, footerText, footerLink, footerLinkText }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left — form */}
      <div className="flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-zinc-950 font-extrabold text-sm tracking-tight shadow-sm">
              GI
            </div>
            <span className="text-lg font-bold tracking-tight">GitIssue</span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-6">{children}</div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {footerText}{" "}
            <Link to={footerLink} className="font-medium text-primary hover:underline">
              {footerLinkText}
            </Link>
          </p>
        </div>
      </div>

      {/* Right — branding / visualization */}
      <div className="relative hidden overflow-hidden border-l bg-primary/5 lg:block">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex h-full flex-col items-center justify-center p-12"
        >
          <div className="relative">
            {/* Floating document cards */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="rounded-lg border bg-card p-4 shadow-md"
            >
              <div className="flex items-center gap-2">
                <Github className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">facebook/react</span>
              </div>
              <div className="mt-3 space-y-1.5">
                {["performance / render / fiber", "hook / state / effect", "typescript / type / interface"].map((w, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground tracking-wide">{w}</span>
                    <span className="text-xs font-semibold tabular-nums text-primary">{[24, 21, 18][i]}%</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -right-20 top-12 rounded-lg border bg-card p-3 shadow-md"
            >
              <p className="text-xs font-medium text-muted-foreground">Topic #4</p>
              <p className="text-xs tracking-wide">server / component / client</p>
            </motion.div>

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -left-16 bottom-0 rounded-lg border bg-card p-3 shadow-md"
            >
              <p className="text-xs font-medium text-muted-foreground">Topic #5</p>
              <p className="text-xs tracking-wide">test / devtool / debug</p>
            </motion.div>
          </div>

          <div className="mt-16 max-w-xs text-center">
            <p className="text-sm text-muted-foreground">
              Discover hidden themes in your GitHub issues with probabilistic
              LDA topic modeling.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
