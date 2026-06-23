import { useCallback, useEffect, useState } from "react";

export type Comment = {
  id: string;
  replayId: string;
  name: string;
  text: string;
  createdAt: number;
};

export type Rating = {
  replayId: string;
  userKey: string;
  value: number; // 1..5
};

const C_KEY = "bayzz_comments_v1";
const R_KEY = "bayzz_ratings_v1";
const U_KEY = "bayzz_user_key_v1";

function readC(): Comment[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(C_KEY) || "[]"); } catch { return []; }
}
function writeC(items: Comment[]) {
  localStorage.setItem(C_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("bayzz:comments-changed"));
}
function readR(): Rating[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(R_KEY) || "[]"); } catch { return []; }
}
function writeR(items: Rating[]) {
  localStorage.setItem(R_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("bayzz:ratings-changed"));
}

export function getUserKey(): string {
  if (typeof window === "undefined") return "anon";
  let k = localStorage.getItem(U_KEY);
  if (!k) {
    k = crypto.randomUUID();
    localStorage.setItem(U_KEY, k);
  }
  return k;
}

export function useComments(replayId: string) {
  const [items, setItems] = useState<Comment[]>([]);
  useEffect(() => {
    const load = () => setItems(readC().filter((c) => c.replayId === replayId).sort((a, b) => b.createdAt - a.createdAt));
    load();
    const h = () => load();
    window.addEventListener("bayzz:comments-changed", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("bayzz:comments-changed", h);
      window.removeEventListener("storage", h);
    };
  }, [replayId]);

  const add = useCallback((name: string, text: string) => {
    const c: Comment = {
      id: crypto.randomUUID(),
      replayId,
      name: name.trim().slice(0, 40) || "Anonim",
      text: text.trim().slice(0, 500),
      createdAt: Date.now(),
    };
    writeC([...readC(), c]);
  }, [replayId]);

  const remove = useCallback((id: string) => {
    writeC(readC().filter((c) => c.id !== id));
  }, []);

  return { items, add, remove };
}

export function useRatings(replayId: string) {
  const [all, setAll] = useState<Rating[]>([]);
  useEffect(() => {
    const load = () => setAll(readR().filter((r) => r.replayId === replayId));
    load();
    const h = () => load();
    window.addEventListener("bayzz:ratings-changed", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("bayzz:ratings-changed", h);
      window.removeEventListener("storage", h);
    };
  }, [replayId]);

  const userKey = typeof window !== "undefined" ? getUserKey() : "";
  const mine = all.find((r) => r.userKey === userKey)?.value ?? 0;
  const count = all.length;
  const avg = count ? all.reduce((s, r) => s + r.value, 0) / count : 0;

  const setMine = useCallback((value: number) => {
    const k = getUserKey();
    const next = readR().filter((r) => !(r.replayId === replayId && r.userKey === k));
    next.push({ replayId, userKey: k, value: Math.max(1, Math.min(5, Math.round(value))) });
    writeR(next);
  }, [replayId]);

  return { avg, count, mine, setMine };
}