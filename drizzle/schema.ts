import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * VPN server locations. Seeded with 20+ global entries.
 * region is one of: Americas, Europe, Asia-Pacific
 */
export const servers = mysqlTable("servers", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  country: varchar("country", { length: 64 }).notNull(),
  countryCode: varchar("countryCode", { length: 8 }).notNull(),
  flag: varchar("flag", { length: 16 }).notNull(),
  city: varchar("city", { length: 64 }).notNull(),
  region: mysqlEnum("region", ["Americas", "Europe", "Asia-Pacific"]).notNull(),
  // Base values; live load/latency are jittered around these at query time.
  baseLatency: int("baseLatency").notNull(),
  baseLoad: int("baseLoad").notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }).notNull(),
  isPremium: boolean("isPremium").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Server = typeof servers.$inferSelect;
export type InsertServer = typeof servers.$inferInsert;

/** Per-user favorite servers. */
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  serverId: int("serverId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;

/** Per-user recently used servers (most recent first). */
export const recents = mysqlTable("recents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  serverId: int("serverId").notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

export type Recent = typeof recents.$inferSelect;

/** VPN sessions. One active session per user (endedAt null = active). */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  serverId: int("serverId").notNull(),
  protocol: varchar("protocol", { length: 32 }).notNull(),
  assignedIp: varchar("assignedIp", { length: 64 }).notNull(),
  bytesUp: bigint("bytesUp", { mode: "number" }).default(0).notNull(),
  bytesDown: bigint("bytesDown", { mode: "number" }).default(0).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});

export type Session = typeof sessions.$inferSelect;

/** Per-user, timestamped connection activity log. */
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // connected | disconnected | switched | error | settings | favorite
  eventType: varchar("eventType", { length: 32 }).notNull(),
  message: text("message").notNull(),
  serverLabel: varchar("serverLabel", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityEntry = typeof activityLog.$inferSelect;

/** Per-user VPN settings. */
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  protocol: mysqlEnum("protocol", ["WireGuard", "OpenVPN", "IKEv2"]).default("WireGuard").notNull(),
  killSwitch: boolean("killSwitch").default(true).notNull(),
  autoConnect: boolean("autoConnect").default(false).notNull(),
  dnsLeakProtection: boolean("dnsLeakProtection").default(true).notNull(),
  // JSON string array of split-tunnel app names that bypass the VPN
  splitTunnelApps: text("splitTunnelApps").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
