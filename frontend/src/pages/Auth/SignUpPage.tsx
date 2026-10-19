import { SignUp } from "@clerk/clerk-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import React from "react"
import { Mail, ArrowRight, AlertCircle } from "lucide-react"
import { Github } from "@/components/ui/github-icon"
import { Button } from "@/components/ui/button"
import { AuthLayout } from "./AuthLayout"
import { isClerkConfigured, useAppAuth } from "@/components/auth/AuthProvider"

export function SignUpPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get("redirect_url") || "/app"
  const hasClerk = isClerkConfigured()
  const { isLoaded, isSignedIn } = useAppAuth()

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate(redirectUrl, { replace: true })
    }
  }, [isLoaded, isSignedIn, navigate, redirectUrl])

  if (hasClerk) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl={redirectUrl}
        />
      </div>
    )
  }

  // Development fallback when Clerk credentials are not yet configured in .env
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start analyzing GitHub repositories with topic intelligence"
      footerText="Already have an account?"
      footerLink="/sign-in"
      footerLinkText="Sign in"
    >
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-2 mb-4">
        <div className="flex items-center gap-1.5 font-semibold">
          <AlertCircle className="size-4 shrink-0" />
          <span>Clerk Auth Configuration Notice</span>
        </div>
        <p>
          Configure <code className="font-mono font-bold">VITE_CLERK_PUBLISHABLE_KEY</code> in <code className="font-mono font-bold">frontend/.env</code> to enable live Clerk authentication and OAuth.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full gap-2"
          type="button"
          onClick={() => navigate("/app")}
        >
          <Github className="size-4" /> Continue with GitHub (Dev Mode)
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2"
          type="button"
          onClick={() => navigate("/app")}
        >
          <Mail className="size-4" /> Continue with Google (Dev Mode)
        </Button>
      </div>

      <div className="mt-6 pt-4 border-t text-center">
        <Button className="w-full gap-2" onClick={() => navigate("/app")}>
          <span>Enter Dashboard (Development)</span>
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </AuthLayout>
  )
}
export default SignUpPage
