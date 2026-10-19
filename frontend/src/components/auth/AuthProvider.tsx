import React, { createContext, useContext } from "react"
import { ClerkProvider, useAuth, useUser, useClerk } from "@clerk/clerk-react"

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export function isClerkConfigured(): boolean {
  return Boolean(clerkPubKey && clerkPubKey.trim().length > 0 && clerkPubKey.startsWith("pk_"))
}

export interface AppUser {
  id: string
  fullName: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  imageUrl: string | null
  initials: string
}

interface AppAuthContextValue {
  isLoaded: boolean
  isSignedIn: boolean
  userId: string | null
  user: AppUser | null
  signOut: () => Promise<void>
}

const AppAuthContext = createContext<AppAuthContextValue>({
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  user: null,
  signOut: async () => {},
})

export function useAppAuth(): AppAuthContextValue {
  return useContext(AppAuthContext)
}

function ClerkBridge({ children }: { children: React.ReactNode }) {
  const { isLoaded: isAuthLoaded, isSignedIn, userId } = useAuth()
  const { isLoaded: isUserLoaded, user: clerkUser } = useUser()
  const { signOut } = useClerk()

  const isLoaded = Boolean(isAuthLoaded && isUserLoaded)

  let user: AppUser | null = null
  if (clerkUser) {
    const fullName =
      clerkUser.fullName ||
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      null
    const email = clerkUser.primaryEmailAddress?.emailAddress || null
    const initials = (
      clerkUser.firstName && clerkUser.lastName
        ? `${clerkUser.firstName[0]}${clerkUser.lastName[0]}`
        : (fullName || "U").slice(0, 2)
    ).toUpperCase()

    user = {
      id: clerkUser.id,
      fullName,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      email,
      imageUrl: clerkUser.imageUrl,
      initials,
    }
  }

  return (
    <AppAuthContext.Provider
      value={{
        isLoaded,
        isSignedIn: Boolean(isSignedIn),
        userId: userId || null,
        user,
        signOut: async () => {
          await signOut()
        },
      }}
    >
      {children}
    </AppAuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (isClerkConfigured()) {
    return (
      <ClerkProvider publishableKey={clerkPubKey!}>
        <ClerkBridge>{children}</ClerkBridge>
      </ClerkProvider>
    )
  }

  return (
    <AppAuthContext.Provider
      value={{
        isLoaded: true,
        isSignedIn: false,
        userId: null,
        user: null,
        signOut: async () => {},
      }}
    >
      {children}
    </AppAuthContext.Provider>
  )
}

