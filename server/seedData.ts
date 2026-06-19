import type { InsertServer } from "../drizzle/schema";

/**
 * 24 seed VPN server locations across Americas, Europe, and Asia-Pacific.
 * baseLatency (ms) and baseLoad (%) are anchors; live values are jittered at query time.
 */
export const SERVER_SEED: Omit<InsertServer, "id" | "createdAt">[] = [
  // Americas
  { slug: "us-nyc", country: "United States", countryCode: "US", flag: "🇺🇸", city: "New York", region: "Americas", baseLatency: 24, baseLoad: 41, ipAddress: "104.21.48.12", isPremium: false },
  { slug: "us-lax", country: "United States", countryCode: "US", flag: "🇺🇸", city: "Los Angeles", region: "Americas", baseLatency: 38, baseLoad: 55, ipAddress: "172.67.142.7", isPremium: false },
  { slug: "us-chi", country: "United States", countryCode: "US", flag: "🇺🇸", city: "Chicago", region: "Americas", baseLatency: 31, baseLoad: 33, ipAddress: "192.241.18.90", isPremium: false },
  { slug: "us-mia", country: "United States", countryCode: "US", flag: "🇺🇸", city: "Miami", region: "Americas", baseLatency: 43, baseLoad: 60, ipAddress: "159.203.77.21", isPremium: true },
  { slug: "ca-tor", country: "Canada", countryCode: "CA", flag: "🇨🇦", city: "Toronto", region: "Americas", baseLatency: 29, baseLoad: 28, ipAddress: "138.197.64.5", isPremium: false },
  { slug: "ca-van", country: "Canada", countryCode: "CA", flag: "🇨🇦", city: "Vancouver", region: "Americas", baseLatency: 47, baseLoad: 36, ipAddress: "159.89.120.44", isPremium: false },
  { slug: "br-sao", country: "Brazil", countryCode: "BR", flag: "🇧🇷", city: "São Paulo", region: "Americas", baseLatency: 92, baseLoad: 48, ipAddress: "177.71.207.18", isPremium: true },
  { slug: "mx-mex", country: "Mexico", countryCode: "MX", flag: "🇲🇽", city: "Mexico City", region: "Americas", baseLatency: 64, baseLoad: 39, ipAddress: "201.144.16.30", isPremium: false },

  // Europe
  { slug: "uk-lon", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", city: "London", region: "Europe", baseLatency: 18, baseLoad: 52, ipAddress: "51.140.22.9", isPremium: false },
  { slug: "de-fra", country: "Germany", countryCode: "DE", flag: "🇩🇪", city: "Frankfurt", region: "Europe", baseLatency: 21, baseLoad: 45, ipAddress: "85.214.132.11", isPremium: false },
  { slug: "nl-ams", country: "Netherlands", countryCode: "NL", flag: "🇳🇱", city: "Amsterdam", region: "Europe", baseLatency: 19, baseLoad: 37, ipAddress: "94.142.241.6", isPremium: false },
  { slug: "fr-par", country: "France", countryCode: "FR", flag: "🇫🇷", city: "Paris", region: "Europe", baseLatency: 23, baseLoad: 49, ipAddress: "163.172.55.8", isPremium: false },
  { slug: "ch-zrh", country: "Switzerland", countryCode: "CH", flag: "🇨🇭", city: "Zurich", region: "Europe", baseLatency: 26, baseLoad: 22, ipAddress: "185.19.142.14", isPremium: true },
  { slug: "se-sto", country: "Sweden", countryCode: "SE", flag: "🇸🇪", city: "Stockholm", region: "Europe", baseLatency: 28, baseLoad: 31, ipAddress: "46.246.93.7", isPremium: false },
  { slug: "es-mad", country: "Spain", countryCode: "ES", flag: "🇪🇸", city: "Madrid", region: "Europe", baseLatency: 33, baseLoad: 44, ipAddress: "185.93.3.20", isPremium: false },
  { slug: "it-mil", country: "Italy", countryCode: "IT", flag: "🇮🇹", city: "Milan", region: "Europe", baseLatency: 35, baseLoad: 40, ipAddress: "151.80.44.16", isPremium: false },

  // Asia-Pacific
  { slug: "jp-tyo", country: "Japan", countryCode: "JP", flag: "🇯🇵", city: "Tokyo", region: "Asia-Pacific", baseLatency: 51, baseLoad: 58, ipAddress: "133.18.236.4", isPremium: false },
  { slug: "sg-sin", country: "Singapore", countryCode: "SG", flag: "🇸🇬", city: "Singapore", region: "Asia-Pacific", baseLatency: 67, baseLoad: 50, ipAddress: "128.199.96.10", isPremium: false },
  { slug: "hk-hkg", country: "Hong Kong", countryCode: "HK", flag: "🇭🇰", city: "Hong Kong", region: "Asia-Pacific", baseLatency: 72, baseLoad: 62, ipAddress: "103.10.197.5", isPremium: true },
  { slug: "au-syd", country: "Australia", countryCode: "AU", flag: "🇦🇺", city: "Sydney", region: "Asia-Pacific", baseLatency: 88, baseLoad: 35, ipAddress: "13.55.12.7", isPremium: false },
  { slug: "kr-sel", country: "South Korea", countryCode: "KR", flag: "🇰🇷", city: "Seoul", region: "Asia-Pacific", baseLatency: 58, baseLoad: 47, ipAddress: "121.78.118.9", isPremium: false },
  { slug: "in-mum", country: "India", countryCode: "IN", flag: "🇮🇳", city: "Mumbai", region: "Asia-Pacific", baseLatency: 79, baseLoad: 53, ipAddress: "139.59.2.13", isPremium: false },
  { slug: "id-jkt", country: "Indonesia", countryCode: "ID", flag: "🇮🇩", city: "Jakarta", region: "Asia-Pacific", baseLatency: 84, baseLoad: 42, ipAddress: "103.28.149.6", isPremium: true },
  { slug: "nz-akl", country: "New Zealand", countryCode: "NZ", flag: "🇳🇿", city: "Auckland", region: "Asia-Pacific", baseLatency: 96, baseLoad: 24, ipAddress: "163.47.144.8", isPremium: false },
];
