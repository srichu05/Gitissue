import { SignIn } from "@clerk/clerk-react"
import { useNavigate } from "react-router-dom"
import { Mail, ArrowRight, AlertCircle } from "lucide-react"
import { Github } from "@/components/ui/github-icon"
import { Button } from "@/components/ui/button"
import { AuthLayout } from "./AuthLayout"
import { isClerkConfigured } from "@/components/auth/AuthProvider"

export function SignInPage() {
  const navigate = useNavigate()
  const hasClerk = isClerkConfigured()

  if (hasClerk) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/app"
        />
      </div>
    )
  }

  // Development fallback when Clerk credentials are not yet configured in .env
  return (
    <AuthLayout
      title="Sign in to GitIssue"
      subtitle="Enter your credentials to access your analysis dashboard"
      footerText="Don't have an account?"
      footerLink="/sign-up"
      footerLinkText="Sign up"
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
export default SignInPage
