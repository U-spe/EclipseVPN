import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeftRight,
  Loader2,
  PlugZap,
  PowerOff,
  Settings as SettingsIcon,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const ICONS: Record<string, { icon: typeof PlugZap; color: string }> = {
  connected: { icon: PlugZap, color: "text-accent" },
  disconnected: { icon: PowerOff, color: "text-muted-foreground" },
  switched: { icon: ArrowLeftRight, color: "text-primary" },
  error: { icon: AlertTriangle, color: "text-destructive" },
  settings: { icon: SettingsIcon, color: "text-primary" },
  favorite: { icon: Star, color: "text-yellow-400" },
};

export default function Activity() {
  const utils = trpc.useUtils();
  const activityQuery = trpc.activity.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const clear = trpc.activity.clear.useMutation({
    onSuccess: () => {
      utils.activity.list.invalidate();
      toast.success("Activity log cleared");
    },
  });

  const entries = activityQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Activity Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">Timestamped connection events, stored to your account.</p>
        </div>
        {entries.length > 0 && (
          <Button variant="outline" size="sm" className="border-border bg-card/30" disabled={clear.isPending} onClick={() => clear.mutate()}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {activityQuery.isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading activity…
        </div>
      ) : entries.length === 0 ? (
        <div className="glass rounded-xl border border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No activity yet. Connect to a server to start logging events.</p>
        </div>
      ) : (
        <div className="relative space-y-0 before:absolute before:left-[19px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
          {entries.map(entry => {
            const meta = ICONS[entry.eventType] ?? ICONS.settings;
            const Icon = meta.icon;
            return (
              <div key={entry.id} className="relative flex gap-4 py-3 pl-0">
                <span className={cn("glass z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border", meta.color)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-sm text-foreground">{entry.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
