import { trpc } from "@/lib/trpc";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ConnState = "disconnected" | "connecting" | "connected";

type VpnContextValue = {
  state: ConnState;
  activeServerId: number | null;
  sessionId: number | null;
  startedAt: Date | null;
  elapsedMs: number;
  bytesUp: number;
  bytesDown: number;
  connect: (serverId: number) => Promise<void>;
  disconnect: () => Promise<void>;
  isBusy: boolean;
};

const VpnContext = createContext<VpnContextValue | null>(null);

export function VpnProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();
  const currentQuery = trpc.session.current.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const connectMutation = trpc.session.connect.useMutation();
  const disconnectMutation = trpc.session.disconnect.useMutation();

  const [state, setState] = useState<ConnState>("disconnected");
  const [activeServerId, setActiveServerId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bytesUp, setBytesUp] = useState(0);
  const [bytesDown, setBytesDown] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hydrate from server on first load (persists across reloads).
  useEffect(() => {
    const data = currentQuery.data;
    if (!data) return;
    if (data.connected) {
      setState("connected");
      setActiveServerId(data.serverId);
      setSessionId(data.sessionId);
      setStartedAt(new Date(data.startedAt));
      setBytesUp(data.bytesUp);
      setBytesDown(data.bytesDown);
    } else {
      setState("disconnected");
      setActiveServerId(null);
      setSessionId(null);
      setStartedAt(null);
    }
  }, [currentQuery.data]);

  // Live ticker: elapsed time + simulated throughput while connected.
  useEffect(() => {
    if (state !== "connected" || !startedAt) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      const ms = Date.now() - startedAt.getTime();
      setElapsedMs(ms);
      const sec = Math.max(1, Math.floor(ms / 1000));
      setBytesDown(Math.floor(sec * 90_000 + (sec % 7) * 6_000));
      setBytesUp(Math.floor(sec * 22_000 + (sec % 5) * 2_500));
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [state, startedAt]);

  const connect = useCallback(
    async (serverId: number) => {
      setState("connecting");
      setActiveServerId(serverId);
      // Deliberate connecting animation window, then commit.
      await new Promise(r => setTimeout(r, 1400));
      const res = await connectMutation.mutateAsync({ serverId });
      setSessionId(res.sessionId ?? null);
      const now = new Date();
      setStartedAt(now);
      setElapsedMs(0);
      setBytesUp(0);
      setBytesDown(0);
      setState("connected");
      await Promise.all([
        utils.session.current.invalidate(),
        utils.activity.list.invalidate(),
        utils.servers.list.invalidate(),
      ]);
    },
    [connectMutation, utils]
  );

  const disconnect = useCallback(async () => {
    await disconnectMutation.mutateAsync({ bytesUp, bytesDown });
    setState("disconnected");
    setActiveServerId(null);
    setSessionId(null);
    setStartedAt(null);
    setElapsedMs(0);
    await Promise.all([
      utils.session.current.invalidate(),
      utils.activity.list.invalidate(),
    ]);
  }, [disconnectMutation, utils, bytesUp, bytesDown]);

  const value = useMemo<VpnContextValue>(
    () => ({
      state,
      activeServerId,
      sessionId,
      startedAt,
      elapsedMs,
      bytesUp,
      bytesDown,
      connect,
      disconnect,
      isBusy: connectMutation.isPending || disconnectMutation.isPending || state === "connecting",
    }),
    [state, activeServerId, sessionId, startedAt, elapsedMs, bytesUp, bytesDown, connect, disconnect, connectMutation.isPending, disconnectMutation.isPending]
  );

  return <VpnContext.Provider value={value}>{children}</VpnContext.Provider>;
}

export function useVpn() {
  const ctx = useContext(VpnContext);
  if (!ctx) throw new Error("useVpn must be used within VpnProvider");
  return ctx;
}
