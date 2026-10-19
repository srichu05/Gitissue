import { Outlet, NavLink, useNavigate, Link } from "react-router-dom"
import {
  LayoutDashboard,
  PlusCircle,
  History,
  LogOut,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ModeToggle } from "@/components/mode-toggle"
import { useAppAuth } from "@/components/auth/AuthProvider"

const navItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/analyze", label: "Analyze Repository", icon: PlusCircle },
  { to: "/app/history", label: "Analysis History", icon: History },
]

function UserProfileMenu() {
  const navigate = useNavigate()
  const { user, signOut } = useAppAuth()

  const displayName = user?.fullName || user?.firstName || user?.email?.split("@")[0] || "User"
  const email = user?.email || ""
  const initials = user?.initials || displayName.slice(0, 2).toUpperCase() || "U"

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      console.warn("Sign out error:", err)
    }
    navigate("/")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full p-0 ring-1 ring-border/50 hover:ring-white/40 transition-all overflow-hidden"
          title={displayName}
        >
          <Avatar className="h-8 w-8">
            {user?.imageUrl && <AvatarImage src={user.imageUrl} alt={displayName} />}
            <AvatarFallback className="bg-white/10 text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-1">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-0.5 leading-none overflow-hidden">
            <p className="font-medium text-sm text-foreground truncate">{displayName}</p>
            {email && (
              <p className="w-[180px] truncate text-xs text-muted-foreground">
                {email}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/app")}>
          <LayoutDashboard className="size-4 mr-2" /> Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/app/analyze")}>
          <PlusCircle className="size-4 mr-2" /> New Analysis
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/app/history")}>
          <History className="size-4 mr-2" /> Analysis History
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="size-4 mr-2 text-destructive" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppLayout() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-white/20 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand + Nav Items */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90" title="GitIssue Home">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-zinc-950 shrink-0 font-extrabold text-sm tracking-tight shadow-sm">
                GI
              </div>
              <span className="text-base font-bold tracking-tight text-white">
                GITISSUE
              </span>
            </Link>

            {/* Top Navigation Links — white only */}
            <nav className="flex items-center gap-1 sm:gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white/15 text-white shadow-xs"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`
                  }
                >
                  <item.icon className="size-4 text-white shrink-0" />
                  <span className="text-white whitespace-nowrap">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right: Actions, Theme, and User Profile */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => navigate("/app/analyze")}
              className="hidden sm:inline-flex bg-white text-zinc-950 hover:bg-white/90 font-medium border-0 shadow-sm transition-all"
            >
              <PlusCircle className="size-4 mr-1 text-zinc-950" />
              <span>New Analysis</span>
            </Button>

            <ModeToggle />

            <UserProfileMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}

