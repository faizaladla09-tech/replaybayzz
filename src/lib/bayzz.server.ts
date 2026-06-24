import { createHash, timingSafeEqual } from "node:crypto";

export type Replay = {
  id: string;
  name: string;
  youtubeUrl: string;
  token: string;
};

// Ephemeral server-side store (per worker isolate). Seeded with demo data.
// For durable persistence, enable Lovable Cloud and back this with a DB table.
const SEED: Replay[] = [
  {
    id: "demo-1",
    name: "Bayzz Opening Show",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    token: "BAYZZ-001",
  },
];

const g = globalThis as unknown as { __bayzzReplays?: Replay[] };
if (!g.__bayzzReplays) g.__bayzzReplays = [...SEED];

export function getAllReplays(): Replay[] {
  return g.__bayzzReplays!;
}

export function setAllReplays(items: Replay[]) {
  g.__bayzzReplays = items;
}

export function sessionConfig() {
  const password = process.env.BAYZZ_SESSION_SECRET;
  if (!password) throw new Error("BAYZZ_SESSION_SECRET is not set");
  return {
    password,
    name: "bayzz-admin",
    maxAge: 60 * 60 * 8,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export type AdminSession = { authed?: boolean };
