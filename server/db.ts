import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  activityLog,
  favorites,
  InsertUser,
  recents,
  servers,
  sessions,
  userSettings,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { SERVER_SEED } from "./seedData";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/* ----------------------------- Users ----------------------------- */

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/* ----------------------------- Servers ----------------------------- */

/** Ensure the servers table is seeded; idempotent. Returns the seeded rows. */
export async function ensureServersSeeded() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select({ id: servers.id }).from(servers).limit(1);
  if (existing.length > 0) return;
  await db.insert(servers).values(SERVER_SEED);
}

export async function listServersRaw() {
  const db = await getDb();
  if (!db) return [];
  await ensureServersSeeded();
  return db.select().from(servers).orderBy(servers.country, servers.city);
}

export async function getServerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

/* ----------------------------- Favorites ----------------------------- */

export async function listFavoriteServerIds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ serverId: favorites.serverId })
    .from(favorites)
    .where(eq(favorites.userId, userId));
  return rows.map(r => r.serverId);
}

export async function toggleFavorite(userId: number, serverId: number) {
  const db = await getDb();
  if (!db) return { favorited: false };
  const existing = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.serverId, serverId)))
    .limit(1);
  if (existing.length > 0) {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.serverId, serverId)));
    return { favorited: false };
  }
  await db.insert(favorites).values({ userId, serverId });
  return { favorited: true };
}

/* ----------------------------- Recents ----------------------------- */

export async function listRecentServerIds(userId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ serverId: recents.serverId, usedAt: recents.usedAt })
    .from(recents)
    .where(eq(recents.userId, userId))
    .orderBy(desc(recents.usedAt))
    .limit(limit);
  return rows.map(r => r.serverId);
}

export async function recordRecent(userId: number, serverId: number) {
  const db = await getDb();
  if (!db) return;
  // Keep recents unique per server: delete prior then insert fresh.
  await db
    .delete(recents)
    .where(and(eq(recents.userId, userId), eq(recents.serverId, serverId)));
  await db.insert(recents).values({ userId, serverId });
}

/* ----------------------------- Sessions ----------------------------- */

export async function getActiveSession(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.endedAt)))
    .orderBy(desc(sessions.startedAt))
    .limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

export async function startSession(params: {
  userId: number;
  serverId: number;
  protocol: string;
  assignedIp: string;
}) {
  const db = await getDb();
  if (!db) return undefined;
  // Close any dangling active sessions first.
  await db
    .update(sessions)
    .set({ endedAt: new Date() })
    .where(and(eq(sessions.userId, params.userId), isNull(sessions.endedAt)));
  const result = await db.insert(sessions).values({
    userId: params.userId,
    serverId: params.serverId,
    protocol: params.protocol,
    assignedIp: params.assignedIp,
  });
  const header = (result as unknown as [{ insertId: number }])[0];
  return header?.insertId;
}

export async function endSession(userId: number, bytesUp: number, bytesDown: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(sessions)
    .set({ endedAt: new Date(), bytesUp, bytesDown })
    .where(and(eq(sessions.userId, userId), isNull(sessions.endedAt)));
}

export async function updateSessionBytes(sessionId: number, bytesUp: number, bytesDown: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(sessions)
    .set({ bytesUp, bytesDown })
    .where(eq(sessions.id, sessionId));
}

/* ----------------------------- Activity Log ----------------------------- */

export async function addActivity(params: {
  userId: number;
  eventType: string;
  message: string;
  serverLabel?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLog).values({
    userId: params.userId,
    eventType: params.eventType,
    message: params.message,
    serverLabel: params.serverLabel ?? null,
  });
}

export async function listActivity(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(activityLog)
    .where(eq(activityLog.userId, userId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

export async function clearActivity(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(activityLog).where(eq(activityLog.userId, userId));
}

/* ----------------------------- Settings ----------------------------- */

const DEFAULT_SETTINGS = {
  protocol: "WireGuard" as const,
  killSwitch: true,
  autoConnect: false,
  dnsLeakProtection: true,
  splitTunnelApps: "[]",
};

export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return { userId, ...DEFAULT_SETTINGS };
  const rows = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  if (rows.length > 0) return rows[0];
  // Lazily create defaults.
  await db.insert(userSettings).values({ userId, ...DEFAULT_SETTINGS });
  const created = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return created[0];
}

export async function updateUserSettings(
  userId: number,
  patch: Partial<{
    protocol: "WireGuard" | "OpenVPN" | "IKEv2";
    killSwitch: boolean;
    autoConnect: boolean;
    dnsLeakProtection: boolean;
    splitTunnelApps: string;
  }>
) {
  const db = await getDb();
  if (!db) return;
  await getUserSettings(userId); // ensure row exists
  await db.update(userSettings).set(patch).where(eq(userSettings.userId, userId));
  return getUserSettings(userId);
}

export async function countServers() {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ c: sql<number>`count(*)` }).from(servers);
  return Number(rows[0]?.c ?? 0);
}
