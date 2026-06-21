import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useReplays, toEmbedUrl, type Replay } from "@/lib/replays-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Play, Lock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bayzz — Replay Live Streaming" },
      { name: "description", content: "Tonton replay live streaming eksklusif di Bayzz. Akses dilindungi dengan token unik." },
      { property: "og:title", content: "Bayzz — Replay Live Streaming" },
      { property: "og:description", content: "Katalog replay live streaming eksklusif. Akses dengan token." },
    ],
  }),
  component: Index,
});

function Index() {
  const { items, ready, validateToken } = useReplays();
  const [active, setActive] = useState<Replay | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const openReplay = (r: Replay) => {
    setActive(r);
    setTokenInput("");
    setUnlocked(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (validateToken(active.id, tokenInput)) {
      setUnlocked(true);
      toast.success("Token valid! Memuat video...");
    } else {
      toast.error("Token tidak valid!");
    }
  };

  const closeModal = (open: boolean) => {
    if (!open) {
      setActive(null);
      setUnlocked(false);
      setTokenInput("");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster theme="dark" position="top-center" richColors />
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-30 bg-background/70">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-black">
              B
            </div>
            <span className="font-black tracking-tight text-xl">Bayzz</span>
          </div>
          <Link
            to="/admin-bayzz"
            className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition"
          >
            Admin
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground mb-5">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Replay Live Streaming Eksklusif
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
          Tonton ulang momen terbaik.
        </h1>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Masukkan token akses untuk membuka replay favoritmu di Bayzz.
        </p>
      </section>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        {!ready ? null : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            Belum ada replay. Tambahkan dari halaman admin.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((r) => (
              <article
                key={r.id}
                className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/60 transition shadow-lg shadow-black/20"
              >
                <div className="relative aspect-video bg-gradient-to-br from-primary/30 via-card to-accent/20 grid place-items-center overflow-hidden">
                  <Lock className="h-10 w-10 text-foreground/40 group-hover:scale-110 transition" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.72_0.2_320/0.25),transparent_60%)]" />
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg leading-snug line-clamp-2">{r.name}</h3>
                  <Button
                    onClick={() => openReplay(r)}
                    className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                  >
                    <Play className="h-4 w-4 mr-2" /> Tonton Replay
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Bayzz. All replays protected.
      </footer>

      <Dialog open={!!active} onOpenChange={closeModal}>
        <DialogContent className="bg-card border-border max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{active?.name}</DialogTitle>
            <DialogDescription>
              {unlocked ? "Selamat menonton!" : "Masukkan token akses untuk membuka replay."}
            </DialogDescription>
          </DialogHeader>

          {unlocked && active ? (
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                src={toEmbedUrl(active.youtubeUrl)}
                title={active.name}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                autoFocus
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Contoh: BAYZZ-001"
                className="bg-secondary border-border text-base"
              />
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                Buka Replay
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
