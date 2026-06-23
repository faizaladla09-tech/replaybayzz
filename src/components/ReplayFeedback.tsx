import { useState } from "react";
import { Star, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRatings, useComments, getUserKey } from "@/lib/feedback-store";
import { toast } from "sonner";

function Stars({ value, onChange, size = 5 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  const px = size === 5 ? "h-6 w-6" : "h-4 w-4";
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange?.(n)}
          className={`${onChange ? "cursor-pointer" : "cursor-default"} transition`}
          aria-label={`${n} bintang`}
        >
          <Star
            className={`${px} ${n <= display ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/50"}`}
          />
        </button>
      ))}
    </div>
  );
}

export function ReplayFeedback({ replayId }: { replayId: string }) {
  const { avg, count, mine, setMine } = useRatings(replayId);
  const { items, add, remove } = useComments(replayId);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const me = typeof window !== "undefined" ? getUserKey() : "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error("Komentar tidak boleh kosong");
      return;
    }
    if (text.length > 500) {
      toast.error("Maksimal 500 karakter");
      return;
    }
    add(name, text);
    setText("");
    toast.success("Komentar terkirim");
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Penilaianmu</div>
          <Stars value={mine} onChange={(v) => { setMine(v); toast.success(`Diberi ${v} bintang`); }} />
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Rata-rata</div>
          <div className="flex items-center gap-2">
            <Stars value={Math.round(avg)} size={4} />
            <span className="text-sm font-semibold">{avg.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({count})</span>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="Nama (opsional)"
            className="bg-background border-border sm:col-span-1"
            maxLength={40}
          />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder="Tulis komentar..."
            className="bg-background border-border sm:col-span-2"
            maxLength={500}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Send className="h-4 w-4 mr-1.5" /> Kirim
          </Button>
        </div>
      </form>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Belum ada komentar. Jadilah yang pertama!</p>
        ) : (
          items.map((c) => (
            <div key={c.id} className="rounded-lg bg-background/60 border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-[10px] font-bold text-primary-foreground shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium truncate">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(c.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                {me && (
                  <button
                    onClick={() => remove(c.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label="Hapus"
                    title="Hapus komentar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-sm text-foreground/90 whitespace-pre-wrap break-words">{c.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}