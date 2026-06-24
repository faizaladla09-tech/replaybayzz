import { createHash, timingSafeEqual } from "node:crypto";

export type Replay = {
  id: string;
  name: string;
  youtubeUrl: string;
  token: string;
};

export type MembershipCode = {
  id: string;
  code: string;
  durationDays: number;
  createdAt: number;
  usedAt?: number;
  usedBy?: string; // opaque member id
};

const SEED_REPLAYS: Replay[] = [];

type Store = {
  replays: Replay[];
  codes: MembershipCode[];
};

const g = globalThis as unknown as { __bayzzStore?: Store };
if (!g.__bayzzStore) g.__bayzzStore = { replays: [...SEED_REPLAYS], codes: [] };

export function store(): Store {
  return g.__bayzzStore!;
}

export function adminSessionConfig() {
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

export function memberSessionConfig() {
  const password = process.env.BAYZZ_SESSION_SECRET;
  if (!password) throw new Error("BAYZZ_SESSION_SECRET is not set");
  return {
    password,
    name: "bayzz-member",
    maxAge: 60 * 60 * 24 * 60, // cookie can live up to 60d; we enforce expiresAt
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export type MemberSession = { memberId?: string; expiresAt?: number };

export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export function genCode(): string {
  // BAYZZ-XXXX-XXXX (alphanumeric, no ambiguous chars)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `BAYZZ-${pick()}-${pick()}`;
}
