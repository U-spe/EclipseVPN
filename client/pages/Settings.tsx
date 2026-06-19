import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { PROTOCOLS, type Protocol } from "@shared/vpn";
import { Loader2, Plus, ShieldCheck, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const PROTOCOL_DESC: Record<Protocol, string> = {
  WireGuard: "Modern, fast, lean. Best default for most connections.",
  OpenVPN: "Battle-tested and highly compatible across networks.",
  IKEv2: "Stable on mobile; reconnects quickly when switching networks.",
};

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/30 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export default function Settings() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.settings.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const update = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      utils.activity.list.invalidate();
    },
  });

  const [splitApps, setSplitApps] = useState<string[]>([]);
  const [newApp, setNewApp] = useState("");

  useEffect(() => {
    if (settingsQuery.data?.splitTunnelApps) {
      try {
        setSplitApps(JSON.parse(settingsQuery.data.splitTunnelApps));
      } catch {
        setSplitApps([]);
      }
    }
  }, [settingsQuery.data?.splitTunnelApps]);

  const s = settingsQuery.data;

  const save = (patch: Parameters<typeof update.mutate>[0]) => {
    update.mutate(patch, {
      onSuccess: () => toast.success("Settings saved"),
      onError: () => toast.error("Could not save settings"),
    });
  };

  const addApp = () => {
    const name = newApp.trim();
    if (!name || splitApps.includes(name)) return;
    const next = [...splitApps, name];
    setSplitApps(next);
    setNewApp("");
    save({ splitTunnelApps: next });
  };

  const removeApp = (name: string) => {
    const next = splitApps.filter(a => a !== name);
    setSplitApps(next);
    save({ splitTunnelApps: next });
  };

  if (settingsQuery.isLoading || !s) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tune your tunnel, protocols, and protection.</p>
      </div>

      {/* Protocol selector */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Zap className="h-3.5 w-3.5" /> Protocol
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {PROTOCOLS.map(p => {
            const active = s.protocol === p;
            return (
              <button
                key={p}
                onClick={() => save({ protocol: p })}
                disabled={update.isPending}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.98]",
                  active ? "border-primary bg-primary/10 glow-purple" : "border-border bg-card/30 hover:border-primary/40"
                )}
                style={{ transitionTimingFunction: "var(--ease-out-snappy)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-semibold">{p}</span>
                  {active && <ShieldCheck className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{PROTOCOL_DESC[p]}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Protection toggles */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
          <ShieldCheck className="h-3.5 w-3.5" /> Protection
        </h2>
        <div className="grid gap-3">
          <ToggleRow title="Kill Switch" description="Block all traffic if the VPN tunnel drops unexpectedly." checked={s.killSwitch} disabled={update.isPending} onChange={v => save({ killSwitch: v })} />
          <ToggleRow title="Auto-connect on launch" description="Automatically connect to the last server when the app starts." checked={s.autoConnect} disabled={update.isPending} onChange={v => save({ autoConnect: v })} />
          <ToggleRow title="DNS Leak Protection" description="Force all DNS queries through the encrypted tunnel." checked={s.dnsLeakProtection} disabled={update.isPending} onChange={v => save({ dnsLeakProtection: v })} />
        </div>
      </section>

      {/* Split tunneling */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">Split Tunneling</h2>
        <p className="text-xs text-muted-foreground">Apps listed here bypass the VPN and use your direct connection.</p>
        <div className="flex gap-2">
          <Input
            value={newApp}
            onChange={e => setNewApp(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addApp()}
            placeholder="e.g. Spotify, Banking App"
            className="border-border bg-card/40"
          />
          <Button onClick={addApp} disabled={!newApp.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {splitApps.length === 0 ? (
            <p className="text-xs text-muted-foreground">No apps excluded. All traffic routes through the VPN.</p>
          ) : (
            splitApps.map(app => (
              <span key={app} className="flex items-center gap-1.5 rounded-full border border-border bg-card/40 px-3 py-1 text-xs">
                {app}
                <button onClick={() => removeApp(app)} className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${app}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
