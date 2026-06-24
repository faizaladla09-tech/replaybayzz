import { useEffect, useState, useCallback } from "react";
import {
  listReplaysPublic,
  listReplaysAdmin,
  addReplayFn,
  updateReplayFn,
  removeReplayFn,
  unlockReplay,
  getAdminSession,
  adminLoginFn,
  adminLogoutFn,
  getMembership,
  redeemMembershipCode,
  memberLogoutFn,
} from "./bayzz.functions";

export type Replay = {
  id: string;
  name: string;
  youtubeUrl: string;
  token: string;
};
export type PublicReplay = { id: string; name: string };

// Public listing (no tokens, no URLs)
export function usePublicReplays() {
  const [items, setItems] = useState<PublicReplay[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await listReplaysPublic();
      setItems(data);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const h = () => void refresh();
    window.addEventListener("bayzz:replays-changed", h);
    return () => window.removeEventListener("bayzz:replays-changed", h);
  }, [refresh]);

  return { items, ready, refresh };
}

// Admin CRUD — all server-validated
export function useAdminReplays() {
  const [items, setItems] = useState<Replay[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await listReplaysAdmin();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (r: Omit<Replay, "id">) => {
      await addReplayFn({ data: r });
      window.dispatchEvent(new Event("bayzz:replays-changed"));
      await refresh();
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, patch: Omit<Replay, "id">) => {
      await updateReplayFn({ data: { id, ...patch } });
      window.dispatchEvent(new Event("bayzz:replays-changed"));
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await removeReplayFn({ data: { id } });
      window.dispatchEvent(new Event("bayzz:replays-changed"));
      await refresh();
    },
    [refresh],
  );

  return { items, ready, add, update, remove, refresh };
}

export async function validateAndUnlock(id: string, token: string) {
  return unlockReplay({ data: { id, token } });
}

export async function unlockAsMember(id: string) {
  return unlockReplay({ data: { id } });
}

// Membership
export function useMembership() {
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await getMembership();
      setExpiresAt(r.active ? r.expiresAt : null);
    } catch {
      setExpiresAt(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const h = () => void refresh();
    window.addEventListener("bayzz:member-changed", h);
    return () => window.removeEventListener("bayzz:member-changed", h);
  }, [refresh]);

  const active = expiresAt !== null && expiresAt > Date.now();
  return { active, expiresAt, ready, refresh };
}

export async function redeemCode(code: string) {
  const r = await redeemMembershipCode({ data: { code } });
  if (r.ok) window.dispatchEvent(new Event("bayzz:member-changed"));
  return r;
}

export async function memberLogout() {
  await memberLogoutFn();
  window.dispatchEvent(new Event("bayzz:member-changed"));
}

export function toEmbedUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") {
        const v = u.searchParams.get("v");
        if (v) return `https://www.youtube.com/embed/${v}`;
      }
      if (u.pathname.startsWith("/embed/")) return url;
      if (u.pathname.startsWith("/shorts/")) {
        return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
      }
    }
    return url;
  } catch {
    return url;
  }
}

export function toVideoId(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v") || "";
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || "";
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || "";
    }
    return "";
  } catch {
    return /^[a-zA-Z0-9_-]{6,}$/.test(url) ? url : "";
  }
}

// Server-validated admin auth (session cookie, httpOnly)
export async function adminLogin(username: string, password: string): Promise<boolean> {
  const res = await adminLoginFn({ data: { username, password } });
  if (res.ok) window.dispatchEvent(new Event("bayzz:auth-changed"));
  return res.ok;
}

export async function adminLogout() {
  await adminLogoutFn();
  window.dispatchEvent(new Event("bayzz:auth-changed"));
}

export function useAdminAuth() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  const check = useCallback(async () => {
    try {
      const s = await getAdminSession();
      setAuthed(!!s.authed);
    } catch {
      setAuthed(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void check();
    const h = () => void check();
    window.addEventListener("bayzz:auth-changed", h);
    return () => window.removeEventListener("bayzz:auth-changed", h);
  }, [check]);

  return { authed, ready };
}
