import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLoginUrl } from "@/const";
import { useVpn } from "@/contexts/VpnContext";
import { trpc } from "@/lib/trpc";
import { formatDuration } from "@shared/vpn";
import {
  Activity,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Server,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

const NAV = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Servers", path: "/servers", icon: Server },
  { label: "Activity Log", path: "/activity", icon: ListChecks },
  { label: "Settings", path: "/settings", icon: SettingsIcon },
] as const;

function LoginGate() {
  return (
    <div className="cyber-bg relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="cyber-grid absolute inset-0" />
      <div className="glass relative z-10 flex flex-col items-center gap-6 rounded-2xl border border-border p-10 max-w-md w-full mx-4 glow-purple">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 glow-purple">
            <Shield className="h-6 w-6 text-primary" />
          </span>
          <span className="font-display text-3xl font-bold tracking-tight text-glow-purple">
            Eclipse<span className="text-accent">+</span>
          </span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Secure, private, fast. Sign in to access your encrypted tunnel and global server network.
        </p>
        <Button
          size="lg"
          className="w-full font-medium"
          onClick={() => {
            window.location.href = getLoginUrl();
          }}
        >
          <Zap className="mr-2 h-4 w-4" /> Enter Eclipse+
        </Button>
      </div>
    </div>
  );
}

function ConnectionStatusBar() {
  const { state, elapsedMs, disconnect, isBusy } = useVpn();
  const sessionQuery = trpc.session.current.useQuery(undefined, { refetchOnWindowFocus: false });
  const server = sessionQuery.data?.connected ? sessionQuery.data.server : null;

  const statusColor =
    state === "connected" ? "text-accent" : state === "connecting" ? "text-yellow-400" : "text-muted-foreground";
  const dotColor =
    state === "connected" ? "bg-accent" : state === "connecting" ? "bg-yellow-400" : "bg-muted-foreground";

  return (
    <div className="glass fixed bottom-0 left-0 right-0 z-50 border-t border-border">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex h-3 w-3 shrink-0">
            {state === "connected" && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" style={{ animation: "pulse-ring 1.8s var(--ease-out-snappy) infinite" }} />
            )}
            <span className={`relative inline-flex h-3 w-3 rounded-full ${dotColor}`} />
          </span>
          <div className="min-w-0">
            <p className={`text-xs font-medium uppercase tracking-wider ${statusColor}`}>
              {state === "connected" ? "connected" : state === "connecting" ? "connecting" : "disconnected"}
            </p>
            <p className="truncate text-sm text-foreground">
              {state === "connected" && server
                ? `${server.flag} ${server.city}, ${server.country}`
                : state === "connecting"
                  ? "Establishing secure tunnel…"
                  : "Not protected"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {state === "connected" && (
            <span className="hidden font-mono text-sm tabular-nums text-accent sm:inline">
              {formatDuration(elapsedMs)}
            </span>
          )}
          {state === "connected" ? (
            <Button variant="destructive" size="sm" onClick={() => disconnect()} disabled={isBusy}>
              Disconnect
            </Button>
          ) : (
            <Link href="/servers">
              <Button size="sm" disabled={isBusy} className="bg-primary">
                <ShieldCheck className="mr-1.5 h-4 w-4" /> {state === "connecting" ? "Connecting…" : "Connect"}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VpnLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [location] = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (loading) {
    return (
      <div className="cyber-bg min-h-screen flex items-center justify-center">
        <Shield className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (!user) return <LoginGate />;

  return (
    <div className="cyber-bg relative min-h-screen">
      <div className="cyber-grid pointer-events-none absolute inset-0" />
      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar (desktop) */}
        <aside className="glass sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border md:flex">
          <div className="flex h-16 items-center gap-2 px-5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 glow-purple">
              <Shield className="h-5 w-5 text-primary" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-glow-purple">
              Eclipse<span className="text-accent">+</span>
            </span>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {NAV.map(item => {
              const active = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <span
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                      active
                        ? "bg-primary/15 text-foreground glow-purple"
                        : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                    }`}
                    style={{ transitionTimingFunction: "var(--ease-out-snappy)" }}
                  >
                    <item.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent/10">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="bg-primary/20 text-xs">
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-none">{user?.name || "User"}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{user?.email || ""}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="glass sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
            <span className="font-display text-lg font-bold text-glow-purple">
              Eclipse<span className="text-accent">+</span>
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-primary/20 text-xs">
                    {user?.name?.charAt(0).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main
            className={`flex-1 px-4 pb-24 pt-6 transition-opacity duration-500 sm:px-6 lg:px-8 ${
              mounted ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>

          {/* Mobile bottom nav */}
          <nav className="glass fixed bottom-16 left-0 right-0 z-40 flex items-center justify-around border-t border-border py-2 md:hidden">
            {NAV.map(item => {
              const active = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <span className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <ConnectionStatusBar />
      <Activity className="hidden" />
    </div>
  );
}
