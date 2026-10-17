import { Outlet, NavLink, useNavigate, Link } from "react-router-dom"
import {
  LayoutDashboard,
  PlusCircle,
  History,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ModeToggle } from "@/components/mode-toggle"

const navItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/analyze", label: "Analyze Repository", icon: PlusCircle },
  { to: "/app/history", label: "Analysis History", icon: History },
]

export function AppLayout() {
  const navigate = useNavigate()

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link to="/" className="flex items-center gap-2 px-2 py-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <BarChart3 className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
              GitIssue
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild tooltip={item.label}>
                  <NavLink to={item.to} end={item.end}>
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton tooltip="User" size="lg">
                    <Avatar size="sm">
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left group-data-[collapsible=icon]:hidden">
                      <span className="text-sm font-medium truncate">User Name</span>
                      <span className="text-xs text-muted-foreground truncate">user@example.com</span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" className="w-56">
                  <DropdownMenuItem>
                    <Settings className="size-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/")}>
                    <LogOut className="size-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => navigate("/app/analyze")}>
              <PlusCircle className="size-4" /> New Analysis
            </Button>
            <ModeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
