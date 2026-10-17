import React from "react"
import { ClerkProvider } from "@clerk/clerk-react"

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export function isClerkConfigured(): boolean {
  return Boolean(clerkPubKey && clerkPubKey.trim().length > 0 && clerkPubKey.startsWith("pk_"))
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (isClerkConfigured()) {
    return (
      <ClerkProvider publishableKey={clerkPubKey!}>
        {children}
      </ClerkProvider>
    )
  }

  // Fallback for development when Clerk key is not yet set in .env
  return <>{children}</>
}
