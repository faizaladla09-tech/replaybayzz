import { useEffect, useState, useCallback } from "react";

export type Replay = {
  id: string;
  name: string;
  youtubeUrl: string;
  token: string;
};

const KEY = "bayzz_replays_v1";
const ADMIN_KEY = "bayzz_admin_auth_v1";

const SEED: Replay[] = [
  {
    id: "demo-1",
    name: "Bayzz Opening Show",
    youtubeUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    token: "BAYZZ-001",
  },
];

function read(): Replay[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as Replay[];
  } catch {
    return [];
  }
}

function write(items: Replay[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("bayzz:replays-changed"));
}

export function useReplays() {
  const [items, setItems] = useState<Replay[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(read());
    setReady(true);
    const handler = () => setItems(read());
    window.addEventListener("bayzz:replays-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("bayzz:replays-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const add = useCallback((r: Omit<Replay, "id">) => {
    const next = [...read(), { ...r, id: crypto.randomUUID() }];
    write(next);
  }, []);

  const update = useCallback((id: string, patch: Partial<Omit<Replay, "id">>) => {
    const next = read().map((r) => (r.id === id ? { ...r, ...patch } : r));
    write(next);
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((r) => r.id !== id));
  }, []);

  const validateToken = useCallback((id: string, token: string) => {
    const r = read().find((x) => x.id === id);
    if (!r) return false;
    return r.token.trim() === token.trim();
  }, []);

  return { items, ready, add, update, remove, validateToken };
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
    // maybe a raw id
    return /^[a-zA-Z0-9_-]{6,}$/.test(url) ? url : "";
  }
}

// Simple admin auth (demo only — client side)
const DEFAULT_ADMIN = { username: "admin", password: "bayzz123" };

export function adminLogin(username: string, password: string): boolean {
  if (username === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password) {
    localStorage.setItem(ADMIN_KEY, "1");
    window.dispatchEvent(new Event("bayzz:auth-changed"));
    return true;
  }
  return false;
}

export function adminLogout() {
  localStorage.removeItem(ADMIN_KEY);
  window.dispatchEvent(new Event("bayzz:auth-changed"));
}

export function useAdminAuth() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setAuthed(localStorage.getItem(ADMIN_KEY) === "1");
    setReady(true);
    const h = () => setAuthed(localStorage.getItem(ADMIN_KEY) === "1");
    window.addEventListener("bayzz:auth-changed", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("bayzz:auth-changed", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return { authed, ready };
}