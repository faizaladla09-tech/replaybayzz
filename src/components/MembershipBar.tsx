import { useEffect, useState } from "react";
import { Crown, LogOut, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMembership, redeemCode, memberLogout } from "@/lib/replays-store";
import { toast } from "sonner";

function fmt(ms: number) {
  if (ms <= 0) return "00d 00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d)}d ${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function MembershipBar() {
  const { active, expiresAt, ready, refresh } = useMembership();
  const [code, setCode] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => {
    if (active && expiresAt && expiresAt <= now) void refresh();
  }, [active, expiresAt, now, refresh]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    try {
      const r = await redeemCode(code.trim());
      if (r.ok) {
        toast.success("Membership aktif! Selamat menonton 🎉");
        setCode("");
      } else {
        toast.error(r.reason || "Kode tidak valid");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  if (active && expiresAt) {
    const remaining = expiresAt - now;
    const expiringSoon = remaining < 24 * 60 * 60 * 1000;
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-accent/10 p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/20 grid place-items-center shrink-0">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Membership aktif</p>
              <p className={`font-mono font-bold tabular-nums ${expiringSoon ? "text-amber-400" : "text-foreground"}`}>
                {fmt(remaining)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await memberLogout();
              toast.success("Sesi membership diakhiri");
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-1" /> Keluar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-md rounded-2xl border border-border bg-card/60 p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-sm">
        <KeyRound className="h-4 w-4 text-accent" />
        <span className="font-semibold">Aktifkan Membership</span>
        <span className="text-xs text-muted-foreground">— akses semua replay</span>
      </div>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="BAYZZ-XXXX-XXXX"
          className="bg-secondary border-border font-mono"
          maxLength={64}
        />
        <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
          Aktifkan
        </Button>
      </div>
    </form>
  );
}
