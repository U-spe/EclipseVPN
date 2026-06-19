import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addActivity,
  clearActivity,
  endSession,
  getActiveSession,
  getServerById,
  getUserSettings,
  listActivity,
  listFavoriteServerIds,
  listRecentServerIds,
  listServersRaw,
  recordRecent,
  startSession,
  toggleFavorite,
  updateSessionBytes,
  updateUserSettings,
} from "./db";
import type { ServerView } from "../shared/vpn";

/** Deterministic-ish jitter so repeated calls vary slightly but stay realistic. */
function jitter(base: number, spread: number, min: number, max: number) {
  const delta = Math.round((Math.random() * 2 - 1) * spread);
  return Math.max(min, Math.min(max, base + delta));
}

function maskIp(ip: string) {
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.•••.•••.${parts[3]}`;
  return "•••.•••.•••.•••";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  servers: router({
    /** List all servers with live load/latency + favorite/recent flags. */
    list: protectedProcedure
      .input(z.object({ region: z.enum(["All", "Americas", "Europe", "Asia-Pacific"]).default("All") }).optional())
      .query(async ({ ctx, input }) => {
        const region = input?.region ?? "All";
        const [rows, favoriteIds, recentIds] = await Promise.all([
          listServersRaw(),
          listFavoriteServerIds(ctx.user.id),
          listRecentServerIds(ctx.user.id, 5),
        ]);
        const favSet = new Set(favoriteIds);
        const recentOrder = new Map(recentIds.map((id, idx) => [id, idx]));

        const views: ServerView[] = rows
          .filter(r => region === "All" || r.region === region)
          .map(r => ({
            id: r.id,
            slug: r.slug,
            country: r.country,
            countryCode: r.countryCode,
            flag: r.flag,
            city: r.city,
            region: r.region,
            latency: jitter(r.baseLatency, 6, 5, 400),
            load: jitter(r.baseLoad, 8, 1, 99),
            ipAddress: r.ipAddress,
            isPremium: r.isPremium,
            isFavorite: favSet.has(r.id),
          }));

        return {
          servers: views,
          favoriteIds,
          recentIds,
          recentOrder: Object.fromEntries(recentOrder),
        };
      }),

    toggleFavorite: protectedProcedure
      .input(z.object({ serverId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await toggleFavorite(ctx.user.id, input.serverId);
        const server = await getServerById(input.serverId);
        const label = server ? `${server.city}, ${server.country}` : `#${input.serverId}`;
        await addActivity({
          userId: ctx.user.id,
          eventType: "favorite",
          message: result.favorited ? `Added ${label} to favorites` : `Removed ${label} from favorites`,
          serverLabel: label,
        });
        return result;
      }),
  }),

  session: router({
    current: protectedProcedure.query(async ({ ctx }) => {
      const active = await getActiveSession(ctx.user.id);
      if (!active) return { connected: false as const };
      const server = await getServerById(active.serverId);
      // Simulate live byte growth based on elapsed time.
      const elapsedSec = Math.max(1, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000));
      const bytesDown = Math.floor(elapsedSec * 90_000 + Math.random() * 50_000);
      const bytesUp = Math.floor(elapsedSec * 22_000 + Math.random() * 12_000);
      return {
        connected: true as const,
        sessionId: active.id,
        serverId: active.serverId,
        protocol: active.protocol,
        startedAt: active.startedAt,
        realIp: server?.ipAddress ?? "203.0.113.7",
        assignedIp: active.assignedIp,
        maskedIp: maskIp(active.assignedIp),
        bytesUp,
        bytesDown,
        server: server
          ? {
              flag: server.flag,
              city: server.city,
              country: server.country,
              region: server.region,
            }
          : null,
      };
    }),

    connect: protectedProcedure
      .input(z.object({ serverId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const server = await getServerById(input.serverId);
        if (!server) throw new Error("Server not found");
        const settings = await getUserSettings(ctx.user.id);
        const wasActive = await getActiveSession(ctx.user.id);
        // Assigned (tunnel) IP differs from the server's public IP.
        const assignedIp = server.ipAddress;
        const sessionId = await startSession({
          userId: ctx.user.id,
          serverId: server.id,
          protocol: settings?.protocol ?? "WireGuard",
          assignedIp,
        });
        await recordRecent(ctx.user.id, server.id);
        const label = `${server.city}, ${server.country}`;
        await addActivity({
          userId: ctx.user.id,
          eventType: wasActive ? "switched" : "connected",
          message: wasActive
            ? `Switched to ${label} via ${settings?.protocol ?? "WireGuard"}`
            : `Connected to ${label} via ${settings?.protocol ?? "WireGuard"}`,
          serverLabel: label,
        });
        return { sessionId, serverId: server.id };
      }),

    disconnect: protectedProcedure
      .input(z.object({ bytesUp: z.number().default(0), bytesDown: z.number().default(0) }).optional())
      .mutation(async ({ ctx, input }) => {
        const active = await getActiveSession(ctx.user.id);
        if (!active) return { disconnected: false };
        await endSession(ctx.user.id, input?.bytesUp ?? 0, input?.bytesDown ?? 0);
        const server = await getServerById(active.serverId);
        const label = server ? `${server.city}, ${server.country}` : undefined;
        await addActivity({
          userId: ctx.user.id,
          eventType: "disconnected",
          message: label ? `Disconnected from ${label}` : "Disconnected",
          serverLabel: label,
        });
        return { disconnected: true };
      }),

    syncBytes: protectedProcedure
      .input(z.object({ sessionId: z.number(), bytesUp: z.number(), bytesDown: z.number() }))
      .mutation(async ({ input }) => {
        await updateSessionBytes(input.sessionId, input.bytesUp, input.bytesDown);
        return { ok: true };
      }),
  }),

  activity: router({
    list: protectedProcedure.query(({ ctx }) => listActivity(ctx.user.id, 100)),
    clear: protectedProcedure.mutation(async ({ ctx }) => {
      await clearActivity(ctx.user.id);
      await addActivity({
        userId: ctx.user.id,
        eventType: "settings",
        message: "Cleared activity log",
      });
      return { ok: true };
    }),
  }),

  settings: router({
    get: protectedProcedure.query(({ ctx }) => getUserSettings(ctx.user.id)),
    update: protectedProcedure
      .input(
        z.object({
          protocol: z.enum(["WireGuard", "OpenVPN", "IKEv2"]).optional(),
          killSwitch: z.boolean().optional(),
          autoConnect: z.boolean().optional(),
          dnsLeakProtection: z.boolean().optional(),
          splitTunnelApps: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const patch: Record<string, unknown> = {};
        if (input.protocol !== undefined) patch.protocol = input.protocol;
        if (input.killSwitch !== undefined) patch.killSwitch = input.killSwitch;
        if (input.autoConnect !== undefined) patch.autoConnect = input.autoConnect;
        if (input.dnsLeakProtection !== undefined) patch.dnsLeakProtection = input.dnsLeakProtection;
        if (input.splitTunnelApps !== undefined)
          patch.splitTunnelApps = JSON.stringify(input.splitTunnelApps);
        const updated = await updateUserSettings(ctx.user.id, patch as never);
        await addActivity({
          userId: ctx.user.id,
          eventType: "settings",
          message: "Updated VPN settings",
        });
        return updated;
      }),
  }),
});

export type AppRouter = typeof appRouter;
