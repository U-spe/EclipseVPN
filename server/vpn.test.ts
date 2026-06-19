import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * These tests exercise the router logic against an in-memory fake of the db helpers,
 * verifying favorites toggling, connect/disconnect session flow, activity logging,
 * and settings updates without requiring a live database.
 */

type ServerRow = {
  id: number;
  slug: string;
  country: string;
  countryCode: string;
  flag: string;
  city: string;
  region: "Americas" | "Europe" | "Asia-Pacific";
  baseLatency: number;
  baseLoad: number;
  ipAddress: string;
  isPremium: boolean;
};

const SERVERS: ServerRow[] = [
  { id: 1, slug: "us-nyc", country: "United States", countryCode: "US", flag: "US", city: "New York", region: "Americas", baseLatency: 24, baseLoad: 41, ipAddress: "104.21.48.12", isPremium: false },
  { id: 2, slug: "uk-lon", country: "United Kingdom", countryCode: "GB", flag: "GB", city: "London", region: "Europe", baseLatency: 18, baseLoad: 52, ipAddress: "51.140.22.9", isPremium: false },
  { id: 3, slug: "jp-tyo", country: "Japan", countryCode: "JP", flag: "JP", city: "Tokyo", region: "Asia-Pacific", baseLatency: 51, baseLoad: 58, ipAddress: "133.18.236.4", isPremium: false },
];

// In-memory state for the fake db layer.
const state = {
  favorites: new Set<number>(),
  recents: [] as number[],
  activeSession: null as null | { id: number; serverId: number; protocol: string; assignedIp: string; startedAt: Date },
  activity: [] as Array<{ id: number; eventType: string; message: string; serverLabel?: string | null; createdAt: Date }>,
  settings: {
    userId: 1,
    protocol: "WireGuard" as "WireGuard" | "OpenVPN" | "IKEv2",
    killSwitch: true,
    autoConnect: false,
    dnsLeakProtection: true,
    splitTunnelApps: "[]",
  },
  nextActivityId: 1,
  nextSessionId: 1,
};

vi.mock("./db", () => ({
  listServersRaw: async () => SERVERS,
  getServerById: async (id: number) => SERVERS.find(s => s.id === id),
  listFavoriteServerIds: async () => Array.from(state.favorites),
  toggleFavorite: async (_u: number, serverId: number) => {
    if (state.favorites.has(serverId)) {
      state.favorites.delete(serverId);
      return { favorited: false };
    }
    state.favorites.add(serverId);
    return { favorited: true };
  },
  listRecentServerIds: async () => state.recents,
  recordRecent: async (_u: number, serverId: number) => {
    state.recents = [serverId, ...state.recents.filter(id => id !== serverId)];
  },
  getActiveSession: async () => state.activeSession ?? undefined,
  startSession: async (p: { serverId: number; protocol: string; assignedIp: string }) => {
    const id = state.nextSessionId++;
    state.activeSession = { id, serverId: p.serverId, protocol: p.protocol, assignedIp: p.assignedIp, startedAt: new Date() };
    return id;
  },
  endSession: async () => {
    state.activeSession = null;
  },
  updateSessionBytes: async () => {},
  addActivity: async (p: { eventType: string; message: string; serverLabel?: string | null }) => {
    state.activity.unshift({ id: state.nextActivityId++, eventType: p.eventType, message: p.message, serverLabel: p.serverLabel ?? null, createdAt: new Date() });
  },
  listActivity: async () => state.activity,
  clearActivity: async () => {
    state.activity = [];
  },
  getUserSettings: async () => state.settings,
  updateUserSettings: async (_u: number, patch: Record<string, unknown>) => {
    state.settings = { ...state.settings, ...patch };
    return state.settings;
  },
}));

function ctx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "t@example.com",
      name: "Tester",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

beforeEach(() => {
  state.favorites = new Set();
  state.recents = [];
  state.activeSession = null;
  state.activity = [];
  state.settings = { userId: 1, protocol: "WireGuard", killSwitch: true, autoConnect: false, dnsLeakProtection: true, splitTunnelApps: "[]" };
  state.nextActivityId = 1;
  state.nextSessionId = 1;
});

describe("servers", () => {
  it("lists all servers with live latency/load and favorite flags", async () => {
    const caller = appRouter.createCaller(ctx());
    const res = await caller.servers.list({ region: "All" });
    expect(res.servers).toHaveLength(3);
    for (const s of res.servers) {
      expect(s.latency).toBeGreaterThan(0);
      expect(s.load).toBeGreaterThanOrEqual(1);
      expect(s.load).toBeLessThanOrEqual(99);
      expect(typeof s.isFavorite).toBe("boolean");
    }
  });

  it("filters by region", async () => {
    const caller = appRouter.createCaller(ctx());
    const res = await caller.servers.list({ region: "Europe" });
    expect(res.servers.every(s => s.region === "Europe")).toBe(true);
    expect(res.servers).toHaveLength(1);
  });

  it("toggles favorite and writes an activity entry", async () => {
    const caller = appRouter.createCaller(ctx());
    const first = await caller.servers.toggleFavorite({ serverId: 1 });
    expect(first.favorited).toBe(true);
    expect(state.favorites.has(1)).toBe(true);
    const second = await caller.servers.toggleFavorite({ serverId: 1 });
    expect(second.favorited).toBe(false);
    expect(state.activity.some(a => a.eventType === "favorite")).toBe(true);
  });
});

describe("session flow", () => {
  it("connect creates active session, records recent, logs connected", async () => {
    const caller = appRouter.createCaller(ctx());
    const res = await caller.session.connect({ serverId: 2 });
    expect(res.serverId).toBe(2);
    expect(state.activeSession?.serverId).toBe(2);
    expect(state.recents[0]).toBe(2);
    expect(state.activity[0].eventType).toBe("connected");
  });

  it("connecting again while active logs a switch", async () => {
    const caller = appRouter.createCaller(ctx());
    await caller.session.connect({ serverId: 1 });
    await caller.session.connect({ serverId: 3 });
    expect(state.activity[0].eventType).toBe("switched");
    expect(state.activeSession?.serverId).toBe(3);
  });

  it("current returns masked IP when connected", async () => {
    const caller = appRouter.createCaller(ctx());
    await caller.session.connect({ serverId: 1 });
    const current = await caller.session.current();
    expect(current.connected).toBe(true);
    if (current.connected) {
      expect(current.maskedIp).toContain("•");
      expect(current.maskedIp).not.toEqual(current.assignedIp);
    }
  });

  it("disconnect ends session and logs disconnected", async () => {
    const caller = appRouter.createCaller(ctx());
    await caller.session.connect({ serverId: 1 });
    const res = await caller.session.disconnect({ bytesUp: 100, bytesDown: 200 });
    expect(res.disconnected).toBe(true);
    expect(state.activeSession).toBeNull();
    expect(state.activity[0].eventType).toBe("disconnected");
  });
});

describe("activity", () => {
  it("lists then clears per-user entries", async () => {
    const caller = appRouter.createCaller(ctx());
    await caller.session.connect({ serverId: 1 });
    const before = await caller.activity.list();
    expect(before.length).toBeGreaterThan(0);
    await caller.activity.clear();
    // clear() also logs one "settings" event, so length should be 1.
    const after = await caller.activity.list();
    expect(after.length).toBe(1);
    expect(after[0].eventType).toBe("settings");
  });
});

describe("settings", () => {
  it("updates protocol and persists", async () => {
    const caller = appRouter.createCaller(ctx());
    const res = await caller.settings.update({ protocol: "OpenVPN" });
    expect(res?.protocol).toBe("OpenVPN");
  });

  it("serializes split tunnel apps as JSON", async () => {
    const caller = appRouter.createCaller(ctx());
    const res = await caller.settings.update({ splitTunnelApps: ["Spotify", "Bank"] });
    expect(res?.splitTunnelApps).toBe(JSON.stringify(["Spotify", "Bank"]));
  });

  it("toggles boolean settings", async () => {
    const caller = appRouter.createCaller(ctx());
    const res = await caller.settings.update({ killSwitch: false, autoConnect: true });
    expect(res?.killSwitch).toBe(false);
    expect(res?.autoConnect).toBe(true);
  });
});
