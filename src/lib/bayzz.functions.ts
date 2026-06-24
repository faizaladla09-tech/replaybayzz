import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

// ---------- ADMIN AUTH ----------

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const { adminSessionConfig } = await import("./bayzz.server");
  const s = await useSession<{ authed?: boolean }>(adminSessionConfig());
  return { authed: !!s.data.authed };
});

export const adminLoginFn = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string }) =>
    z.object({ username: z.string().min(1).max(200), password: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { adminSessionConfig, safeEqual } = await import("./bayzz.server");
    const expectedUser = process.env.BAYZZ_ADMIN_USERNAME;
    const expectedPass = process.env.BAYZZ_ADMIN_PASSWORD;
    if (!expectedUser || !expectedPass) throw new Error("Admin credentials not configured");
    const ok = safeEqual(data.username, expectedUser) && safeEqual(data.password, expectedPass);
    if (!ok) return { ok: false as const };
    const s = await useSession<{ authed?: boolean }>(adminSessionConfig());
    await s.update({ authed: true });
    return { ok: true as const };
  });

export const adminLogoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const { adminSessionConfig } = await import("./bayzz.server");
  const s = await useSession<{ authed?: boolean }>(adminSessionConfig());
  await s.clear();
  return { ok: true as const };
});

async function requireAdmin() {
  const { adminSessionConfig } = await import("./bayzz.server");
  const s = await useSession<{ authed?: boolean }>(adminSessionConfig());
  if (!s.data.authed) throw new Error("Unauthorized");
}

// ---------- MEMBER SESSION ----------

async function getActiveMember() {
  const { memberSessionConfig } = await import("./bayzz.server");
  const s = await useSession<{ memberId?: string; expiresAt?: number }>(memberSessionConfig());
  const now = Date.now();
  if (s.data.memberId && s.data.expiresAt && s.data.expiresAt > now) {
    return { active: true as const, memberId: s.data.memberId, expiresAt: s.data.expiresAt };
  }
  return { active: false as const };
}

export const getMembership = createServerFn({ method: "GET" }).handler(async () => {
  const m = await getActiveMember();
  if (m.active) return { active: true as const, expiresAt: m.expiresAt };
  return { active: false as const };
});

export const redeemMembershipCode = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string }) =>
    z.object({ code: z.string().trim().min(3).max(64) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { store, memberSessionConfig } = await import("./bayzz.server");
    const codeRow = store().codes.find(
      (c) => c.code.toUpperCase() === data.code.toUpperCase(),
    );
    if (!codeRow) return { ok: false as const, reason: "Kode tidak ditemukan" };
    if (codeRow.usedAt) return { ok: false as const, reason: "Kode sudah pernah dipakai" };

    const now = Date.now();
    const memberId = crypto.randomUUID();
    const expiresAt = now + codeRow.durationDays * 24 * 60 * 60 * 1000;
    codeRow.usedAt = now;
    codeRow.usedBy = memberId;

    const s = await useSession<{ memberId?: string; expiresAt?: number }>(memberSessionConfig());
    await s.update({ memberId, expiresAt });
    return { ok: true as const, expiresAt };
  });

export const memberLogoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const { memberSessionConfig } = await import("./bayzz.server");
  const s = await useSession<{ memberId?: string; expiresAt?: number }>(memberSessionConfig());
  await s.clear();
  return { ok: true as const };
});

// ---------- PUBLIC REPLAYS ----------

export const listReplaysPublic = createServerFn({ method: "GET" }).handler(async () => {
  const { store } = await import("./bayzz.server");
  return store().replays.map((r) => ({ id: r.id, name: r.name }));
});

// Unlock: ok if active member OR token matches
export const unlockReplay = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; token?: string }) =>
    z.object({ id: z.string().min(1).max(200), token: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { store, safeEqual } = await import("./bayzz.server");
    const r = store().replays.find((x) => x.id === data.id);
    if (!r) return { ok: false as const };
    const member = await getActiveMember();
    if (member.active) {
      return { ok: true as const, youtubeUrl: r.youtubeUrl, name: r.name, via: "member" as const };
    }
    if (data.token && safeEqual(r.token.trim(), data.token.trim())) {
      return { ok: true as const, youtubeUrl: r.youtubeUrl, name: r.name, via: "token" as const };
    }
    return { ok: false as const };
  });

// ---------- ADMIN REPLAYS ----------

export const listReplaysAdmin = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { store } = await import("./bayzz.server");
  return store().replays;
});

export const addReplayFn = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; youtubeUrl: string; token: string }) =>
    z
      .object({
        name: z.string().min(1).max(200),
        youtubeUrl: z.string().min(1).max(500),
        token: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { store } = await import("./bayzz.server");
    store().replays.push({ ...data, id: crypto.randomUUID() });
    return { ok: true as const };
  });

export const updateReplayFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; name: string; youtubeUrl: string; token: string }) =>
    z
      .object({
        id: z.string().min(1),
        name: z.string().min(1).max(200),
        youtubeUrl: z.string().min(1).max(500),
        token: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { store } = await import("./bayzz.server");
    const s = store();
    s.replays = s.replays.map((r) =>
      r.id === data.id ? { id: r.id, name: data.name, youtubeUrl: data.youtubeUrl, token: data.token } : r,
    );
    return { ok: true as const };
  });

export const removeReplayFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { store } = await import("./bayzz.server");
    const s = store();
    s.replays = s.replays.filter((r) => r.id !== data.id);
    return { ok: true as const };
  });

// ---------- ADMIN MEMBERSHIP CODES ----------

export const listMembershipCodes = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { store } = await import("./bayzz.server");
  return store().codes;
});

export const createMembershipCodes = createServerFn({ method: "POST" })
  .inputValidator((d: { count: number; durationDays: number }) =>
    z.object({ count: z.number().int().min(1).max(50), durationDays: z.number().int().min(1).max(365) }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { store, genCode } = await import("./bayzz.server");
    const now = Date.now();
    const created: { id: string; code: string; durationDays: number; createdAt: number }[] = [];
    for (let i = 0; i < data.count; i++) {
      const row = {
        id: crypto.randomUUID(),
        code: genCode(),
        durationDays: data.durationDays,
        createdAt: now,
      };
      store().codes.push(row);
      created.push(row);
    }
    return { ok: true as const, created };
  });

export const deleteMembershipCode = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { store } = await import("./bayzz.server");
    const s = store();
    s.codes = s.codes.filter((c) => c.id !== data.id);
    return { ok: true as const };
  });
