import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAppAuth } from "@/components/auth/AuthProvider"

export function ProtectedRoute() {
  const { isLoaded, isSignedIn } = useAppAuth()
  const location = useLocation()

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-xs text-muted-foreground tracking-wider uppercase font-medium">
            Verifying Authentication...
          </p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    const redirectTarget = location.pathname + location.search
    return (
      <Navigate
        to={`/sign-in?redirect_url=${encodeURIComponent(redirectTarget)}`}
        replace
        state={{ from: location }}
      />
    )
  }

  return <Outlet />
}

export default ProtectedRoute
