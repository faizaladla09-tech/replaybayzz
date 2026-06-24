import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";


export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const { sessionConfig } = await import("./bayzz.server");
  const session = await useSession<{ authed?: boolean }>(sessionConfig());
  return { authed: !!session.data.authed };
});

export const adminLoginFn = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string }) =>
    z.object({ username: z.string().min(1).max(200), password: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { sessionConfig, safeEqual } = await import("./bayzz.server");
    const expectedUser = process.env.BAYZZ_ADMIN_USERNAME;
    const expectedPass = process.env.BAYZZ_ADMIN_PASSWORD;
    if (!expectedUser || !expectedPass) {
      throw new Error("Admin credentials not configured on the server");
    }
    const ok = safeEqual(data.username, expectedUser) && safeEqual(data.password, expectedPass);
    if (!ok) return { ok: false as const };
    const session = await useSession<{ authed?: boolean }>(sessionConfig());
    await session.update({ authed: true });
    return { ok: true as const };
  });

export const adminLogoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const { sessionConfig } = await import("./bayzz.server");
  const session = await useSession<{ authed?: boolean }>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

// PUBLIC: list replays without tokens or YouTube URLs.
export const listReplaysPublic = createServerFn({ method: "GET" }).handler(async () => {
  const { getAllReplays } = await import("./bayzz.server");
  return getAllReplays().map((r) => ({ id: r.id, name: r.name }));
});

// PUBLIC: validate token and return the YouTube URL only on success.
export const unlockReplay = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; token: string }) =>
    z.object({ id: z.string().min(1).max(200), token: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getAllReplays, safeEqual } = await import("./bayzz.server");
    const r = getAllReplays().find((x) => x.id === data.id);
    if (!r) return { ok: false as const };
    if (!safeEqual(r.token.trim(), data.token.trim())) return { ok: false as const };
    return { ok: true as const, youtubeUrl: r.youtubeUrl, name: r.name };
  });

// ADMIN
export const listReplaysAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const { sessionConfig, getAllReplays } = await import("./bayzz.server");
  const session = await useSession<{ authed?: boolean }>(sessionConfig());
  if (!session.data.authed) throw new Error("Unauthorized");
  return getAllReplays();
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
    const { sessionConfig, getAllReplays, setAllReplays } = await import("./bayzz.server");
    const session = await useSession<{ authed?: boolean }>(sessionConfig());
    if (!session.data.authed) throw new Error("Unauthorized");
    const items = [...getAllReplays(), { ...data, id: crypto.randomUUID() }];
    setAllReplays(items);
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
    const { sessionConfig, getAllReplays, setAllReplays } = await import("./bayzz.server");
    const session = await useSession<{ authed?: boolean }>(sessionConfig());
    if (!session.data.authed) throw new Error("Unauthorized");
    setAllReplays(
      getAllReplays().map((r) =>
        r.id === data.id ? { id: r.id, name: data.name, youtubeUrl: data.youtubeUrl, token: data.token } : r,
      ),
    );
    return { ok: true as const };
  });

export const removeReplayFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { sessionConfig, getAllReplays, setAllReplays } = await import("./bayzz.server");
    const session = await useSession<{ authed?: boolean }>(sessionConfig());
    if (!session.data.authed) throw new Error("Unauthorized");
    setAllReplays(getAllReplays().filter((r) => r.id !== data.id));
    return { ok: true as const };
  });
