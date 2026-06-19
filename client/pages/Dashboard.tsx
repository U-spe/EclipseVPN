import { StatCard } from "@/components/vpn/StatCard";
import { Button } from "@/components/ui/button";
import { useVpn } from "@/contexts/VpnContext";
import { trpc } from "@/lib/trpc";
import { formatBytes, formatDuration } from "@shared/vpn";
import { ArrowDownToLine, ArrowUpFromLine, Clock, Globe, MapPin, Power, ShieldCheck, ShieldOff } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { state, elapsedMs, bytesUp, bytesDown, disconnect, connect, isBusy, activeServerId } = useVpn();
  const [, navigate] = useLocation();
  const sessionQuery = trpc.session.current.useQuery(undefined, { refetchOnWindowFocus: false });
  const serversQuery = trpc.servers.list.useQuery(undefined, { refetchOnWindowFocus: false });

  const data = sessionQuery.data;
  const connected = state === "connected" && data?.connected;

  // Pick a recommended server (lowest load) for the quick-connect button.
  const recommended = useMemo(() => {
    const list = serversQuery.data?.servers ?? [];
    if (list.length === 0) return null;
    return [...list].sort((a, b) => a.load + a.latency / 4 - (b.load + b.latency / 4))[0];
  }, [serversQuery.data]);

  const ipDisplay = connected
    ? data?.maskedIp ?? "•••.•••.•••.•••"
    : data && "realIp" in data
      ? "Exposed"
      : "203.0.113.7";

  const location =
    connected && data?.server ? `${data.server.flag} ${data.server.city}, ${data.server.country}` : "—";

  const ringState =
    state === "connected" ? "glow-cyan" : state === "connecting" ? "glow-purple" : "";

  const handlePrimary = async () => {
    if (state === "connected") {
      await disconnect();
    } else if (recommended) {
      await connect(activeServerId ?? recommended.id);
    } else {
      navigate("/servers");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your encrypted tunnel status and live session metrics.
        </p>
      </div>

      {/* Connection orb */}
      <div className="glass relative overflow-hidden rounded-2xl border border-border p-8">
        <div className="cyber-grid pointer-events-none absolute inset-0" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <button
            onClick={handlePrimary}
            disabled={isBusy}
            className={`group relative grid h-44 w-44 place-items-center rounded-full border border-border bg-card/40 transition-transform duration-200 active:scale-[0.97] ${ringState}`}
            style={{ transitionTimingFunction: "var(--ease-out-snappy)" }}
            aria-label={state === "connected" ? "Disconnect" : "Connect"}
          >
            {state === "connecting" && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-primary/40" style={{ animation: "pulse-ring 1.6s var(--ease-out-snappy) infinite" }} />
                <span className="absolute inset-0 rounded-full border-2 border-primary/30" style={{ animation: "pulse-ring 1.6s var(--ease-out-snappy) 0.5s infinite" }} />
              </>
            )}
            <div className="flex flex-col items-center gap-2">
              {state === "connected" ? (
                <ShieldCheck className="h-12 w-12 text-accent text-glow-cyan" />
              ) : state === "connecting" ? (
                <Power className="h-12 w-12 animate-pulse text-primary" />
              ) : (
                <ShieldOff className="h-12 w-12 text-muted-foreground" />
              )}
              <span className={`text-xs font-medium uppercase tracking-widest ${state === "connected" ? "text-accent" : state === "connecting" ? "text-primary" : "text-muted-foreground"}`}>
                {state}
              </span>
            </div>
          </button>

          <div className="text-center">
            <p className="font-display text-xl font-semibold">
              {state === "connected" ? "Protected" : state === "connecting" ? "Securing connection…" : "Not protected"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{location !== "—" ? location : "Tap to connect to a recommended server"}</p>
          </div>

          <div className="flex gap-3">
            {state === "connected" ? (
              <Button variant="destructive" onClick={() => disconnect()} disabled={isBusy}>
                Disconnect
              </Button>
            ) : (
              <Button onClick={handlePrimary} disabled={isBusy || !recommended}>
                {state === "connecting" ? "Connecting…" : recommended ? `Quick Connect · ${recommended.flag} ${recommended.city}` : "Choose a server"}
              </Button>
            )}
            <Button variant="outline" className="border-border bg-card/30" onClick={() => navigate("/servers")}>
              <Globe className="mr-1.5 h-4 w-4" /> Servers
            </Button>
          </div>
        </div>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={ArrowDownToLine} label="Downloaded" value={connected ? formatBytes(bytesDown) : "0 B"} accent="cyan" sub="this session" />
        <StatCard icon={ArrowUpFromLine} label="Uploaded" value={connected ? formatBytes(bytesUp) : "0 B"} accent="purple" sub="this session" />
        <StatCard icon={Clock} label="Duration" value={connected ? formatDuration(elapsedMs) : "00:00:00"} accent="cyan" sub="elapsed" />
        <StatCard
          icon={MapPin}
          label="IP Address"
          value={<span className={`text-base ${connected ? "text-accent" : "text-destructive"}`}>{ipDisplay}</span>}
          accent="purple"
          sub={connected ? "masked & encrypted" : "your real IP is exposed"}
        />
        <StatCard
          icon={Globe}
          label="VPN Location"
          value={<span className="text-base">{connected && data?.server ? `${data.server.flag} ${data.server.city}` : "—"}</span>}
          accent="cyan"
          sub={connected && data?.server ? data.server.country : "not assigned"}
        />
      </div>
    </div>
  );
}
