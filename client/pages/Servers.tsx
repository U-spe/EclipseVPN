import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVpn } from "@/contexts/VpnContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { REGIONS, type ServerView } from "@shared/vpn";
import { Activity, Loader2, Search, Star, Wifi, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type RegionFilter = "All" | (typeof REGIONS)[number];
const FILTERS: RegionFilter[] = ["All", "Americas", "Europe", "Asia-Pacific"];

function loadColor(load: number) {
  if (load < 40) return "bg-accent";
  if (load < 70) return "bg-yellow-400";
  return "bg-destructive";
}

function latencyColor(ms: number) {
  if (ms < 40) return "text-accent";
  if (ms < 90) return "text-yellow-400";
  return "text-destructive";
}

function ServerRow({
  server,
  isActive,
  onConnect,
  onToggleFav,
  busy,
}: {
  server: ServerView;
  isActive: boolean;
  onConnect: () => void;
  onToggleFav: () => void;
  busy: boolean;
}) {
  return (
    <div
      className={cn(
        "glass group flex items-center gap-3 rounded-xl border border-border p-3 transition-all duration-200",
        isActive ? "glow-cyan" : "hover:border-primary/40"
      )}
      style={{ transitionTimingFunction: "var(--ease-out-snappy)" }}
    >
      <button
        onClick={onToggleFav}
        className="shrink-0 rounded-md p-1 transition-transform active:scale-90"
        aria-label="Toggle favorite"
      >
        <Star className={cn("h-4 w-4", server.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
      </button>

      <span className="text-2xl leading-none">{server.flag}</span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{server.city}</p>
          {server.isPremium && (
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
              Plus
            </span>
          )}
          {isActive && <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent">Active</span>}
        </div>
        <p className="truncate text-xs text-muted-foreground">{server.country} · {server.region}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all", loadColor(server.load))} style={{ width: `${server.load}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground">{server.load}% load</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <span className={cn("flex items-center gap-1 font-mono text-xs", latencyColor(server.latency))}>
          <Wifi className="h-3 w-3" /> {server.latency} ms
        </span>
        <Button size="sm" variant={isActive ? "secondary" : "default"} disabled={busy} onClick={onConnect} className="h-7 px-3 text-xs">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : isActive ? "Connected" : "Connect"}
        </Button>
      </div>
    </div>
  );
}

export default function Servers() {
  const [region, setRegion] = useState<RegionFilter>("All");
  const [query, setQuery] = useState("");
  const { connect, activeServerId, state, isBusy } = useVpn();
  const utils = trpc.useUtils();
  const serversQuery = trpc.servers.list.useQuery({ region }, { refetchOnWindowFocus: false });
  const toggleFav = trpc.servers.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.servers.list.invalidate();
      utils.activity.list.invalidate();
    },
  });

  const all = serversQuery.data?.servers ?? [];
  const favoriteIds = new Set(serversQuery.data?.favoriteIds ?? []);
  const recentIds = serversQuery.data?.recentIds ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(s => `${s.city} ${s.country} ${s.region}`.toLowerCase().includes(q));
  }, [all, query]);

  const favoriteServers = filtered.filter(s => favoriteIds.has(s.id));
  const recentServers = recentIds
    .map(id => filtered.find(s => s.id === id))
    .filter((s): s is ServerView => Boolean(s) && !favoriteIds.has(s!.id));
  const others = filtered.filter(s => !favoriteIds.has(s.id) && !recentIds.includes(s.id));

  const handleConnect = async (id: number) => {
    try {
      await connect(id);
      const s = all.find(x => x.id === id);
      toast.success(`Connected to ${s?.city ?? "server"}`);
    } catch {
      toast.error("Connection failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Servers</h1>
          <p className="mt-1 text-sm text-muted-foreground">{all.length} global locations · live load &amp; latency</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search city or country…"
            className="border-border bg-card/40 pl-9"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setRegion(f)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200",
              region === f ? "border-primary bg-primary/15 text-foreground glow-purple" : "border-border bg-card/30 text-muted-foreground hover:text-foreground"
            )}
            style={{ transitionTimingFunction: "var(--ease-out-snappy)" }}
          >
            {f}
          </button>
        ))}
      </div>

      {serversQuery.isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading servers…
        </div>
      ) : (
        <div className="space-y-6">
          {favoriteServers.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-yellow-400">
                <Star className="h-3.5 w-3.5 fill-yellow-400" /> Favorites
              </h2>
              <div className="grid gap-2 lg:grid-cols-2">
                {favoriteServers.map(s => (
                  <ServerRow key={s.id} server={s} isActive={state === "connected" && activeServerId === s.id} busy={isBusy} onConnect={() => handleConnect(s.id)} onToggleFav={() => toggleFav.mutate({ serverId: s.id })} />
                ))}
              </div>
            </section>
          )}

          {recentServers.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                <Activity className="h-3.5 w-3.5" /> Recently Used
              </h2>
              <div className="grid gap-2 lg:grid-cols-2">
                {recentServers.map(s => (
                  <ServerRow key={s.id} server={s} isActive={state === "connected" && activeServerId === s.id} busy={isBusy} onConnect={() => handleConnect(s.id)} onToggleFav={() => toggleFav.mutate({ serverId: s.id })} />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Zap className="h-3.5 w-3.5" /> All Locations
            </h2>
            <div className="grid gap-2 lg:grid-cols-2">
              {others.map(s => (
                <ServerRow key={s.id} server={s} isActive={state === "connected" && activeServerId === s.id} busy={isBusy} onConnect={() => handleConnect(s.id)} onToggleFav={() => toggleFav.mutate({ serverId: s.id })} />
              ))}
            </div>
            {others.length === 0 && favoriteServers.length === 0 && recentServers.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">No servers match your search.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
