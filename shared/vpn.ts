export const PROTOCOLS = ["WireGuard", "OpenVPN", "IKEv2"] as const;
export type Protocol = (typeof PROTOCOLS)[number];

export const REGIONS = ["Americas", "Europe", "Asia-Pacific"] as const;
export type Region = (typeof REGIONS)[number];

export type EventType =
  | "connected"
  | "disconnected"
  | "switched"
  | "error"
  | "settings"
  | "favorite";

/** A server with live (jittered) load/latency and per-user flags merged in. */
export type ServerView = {
  id: number;
  slug: string;
  country: string;
  countryCode: string;
  flag: string;
  city: string;
  region: Region;
  latency: number;
  load: number;
  ipAddress: string;
  isPremium: boolean;
  isFavorite: boolean;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
