import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  useAdminReplays,
  useAdminAuth,
  adminLogin,
  adminLogout,
  toVideoId,
  type Replay,
} from "@/lib/replays-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  Plus,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminMembershipCodes } from "@/components/AdminMembershipCodes";

export const Route = createFileRoute("/admin-bayzz")({
  head: () => ({
    meta: [
      { title: "Admin — Bayzz" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { authed, ready } = useAdminAuth();
  if (!ready) return null;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster theme="dark" position="top-center" richColors />
      {authed ? <Dashboard /> : <LoginForm />}
    </div>
  );
}

function LoginForm() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await adminLogin(u, p);
    if (ok) {
      toast.success("Login berhasil");
    } else {
      toast.error("Username atau password salah");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4 shadow-2xl"
      >
        <div className="text-center">
          <div className="mx-auto h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-black">
            B
          </div>
          <h1 className="mt-3 text-xl font-bold">Bayzz Admin</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Masuk untuk mengelola katalog replay
          </p>
        </div>
        <div className="space-y-2">
          <Label>Username</Label>
          <Input value={u} onChange={(e) => setU(e.target.value)} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" value={p} onChange={(e) => setP(e.target.value)} className="bg-secondary border-border" />
        </div>
        <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
          Masuk
        </Button>
        <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground">
          ← Kembali ke katalog
        </Link>
      </form>
    </div>
  );
}

type FormState = { name: string; youtubeUrl: string; token: string };
const EMPTY: FormState = { name: "", youtubeUrl: "", token: "" };
type FieldErrors = Partial<Record<keyof FormState, string>>;
type StatusMsg = { kind: "success" | "error"; text: string } | null;

const replaySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(120, "Nama maksimal 120 karakter"),
  youtubeUrl: z
    .string()
    .trim()
    .min(1, "Link YouTube wajib diisi")
    .max(500, "Link terlalu panjang")
    .refine((v) => toVideoId(v).length > 0, {
      message: "Bukan link YouTube yang valid",
    }),
  token: z
    .string()
    .trim()
    .min(4, "Token minimal 4 karakter")
    .max(64, "Token maksimal 64 karakter")
    .regex(/^[A-Za-z0-9_-]+$/, "Hanya huruf, angka, '-' atau '_'"),
});

function Dashboard() {
  const { items, add, update, remove } = useAdminReplays();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Replay | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusMsg>(null);
  const [confirmDel, setConfirmDel] = useState<Replay | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Auto-hide inline status after 4s
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setOpen(true);
  };
  const openEdit = (r: Replay) => {
    setEditing(r);
    setForm({ name: r.name, youtubeUrl: r.youtubeUrl, token: r.token });
    setErrors({});
    setOpen(true);
  };

  const validate = (data: FormState): FieldErrors => {
    const res = replaySchema.safeParse(data);
    if (res.success) return {};
    const errs: FieldErrors = {};
    for (const issue of res.error.issues) {
      const k = issue.path[0] as keyof FormState | undefined;
      if (k && !errs[k]) errs[k] = issue.message;
    }
    // Duplicate-name guard
    const dupName = items.some(
      (r) =>
        r.name.trim().toLowerCase() === data.name.trim().toLowerCase() &&
        r.id !== editing?.id,
    );
    if (!errs.name && dupName) errs.name = "Nama ini sudah dipakai replay lain";
    return errs;
  };

  const onChange = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await update(editing.id, form);
        setStatus({ kind: "success", text: `Replay "${form.name}" diperbarui` });
        toast.success("Replay diperbarui");
      } else {
        await add(form);
        setStatus({ kind: "success", text: `Replay "${form.name}" ditambahkan` });
        toast.success("Replay ditambahkan");
      }
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan replay";
      setStatus({ kind: "error", text: msg });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await remove(confirmDel.id);
      setStatus({ kind: "success", text: `Replay "${confirmDel.name}" dihapus` });
      toast.success("Replay dihapus");
      setConfirmDel(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus replay";
      setStatus({ kind: "error", text: msg });
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <header className="border-b border-border/60 sticky top-0 bg-background/80 backdrop-blur z-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-bold">Bayzz Admin</h1>
              <p className="text-xs text-muted-foreground">Kelola katalog replay</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
              onClick={async () => {
              await adminLogout();
              toast.success("Logged out");
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" /> Keluar
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {status && (
          <div
            role="status"
            aria-live="polite"
            className={`mb-5 flex items-start gap-3 rounded-xl border p-3 text-sm ${
              status.kind === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {status.kind === "success" ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            )}
            <p className="flex-1">{status.text}</p>
            <button
              type="button"
              onClick={() => setStatus(null)}
              className="opacity-70 hover:opacity-100"
              aria-label="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">
            {items.length} replay tersimpan
          </h2>
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            <Plus className="h-4 w-4 mr-2" /> Tambah Replay
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Nama Replay</TableHead>
                  <TableHead>Link YouTube</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                      Belum ada data. Klik "Tambah Replay".
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((r) => (
                    <TableRow key={r.id} className="border-border">
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground">
                        {r.youtubeUrl}
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-secondary px-2 py-1 text-xs">{r.token}</code>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setConfirmDel(r)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="mt-8">
          <AdminMembershipCodes />
        </div>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Replay" : "Tambah Replay"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4" noValidate>
            <FieldRow
              label="Nama Replay"
              error={errors.name}
              input={
                <Input
                  value={form.name}
                  onChange={(e) => onChange("name", e.target.value)}
                  maxLength={120}
                  aria-invalid={!!errors.name}
                  className={`bg-secondary border-border ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
              }
            />
            <FieldRow
              label="Link YouTube"
              error={errors.youtubeUrl}
              hint="Mendukung youtube.com/watch, youtu.be, shorts, embed."
              input={
                <Input
                  value={form.youtubeUrl}
                  onChange={(e) => onChange("youtubeUrl", e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  maxLength={500}
                  aria-invalid={!!errors.youtubeUrl}
                  className={`bg-secondary border-border ${errors.youtubeUrl ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
              }
            />
            <FieldRow
              label="Token Akses"
              error={errors.token}
              hint="4–64 karakter, hanya huruf/angka/'-'/'_'."
              input={
                <Input
                  value={form.token}
                  onChange={(e) => onChange("token", e.target.value)}
                  placeholder="BAYZZ-XXX"
                  maxLength={64}
                  aria-invalid={!!errors.token}
                  className={`bg-secondary border-border font-mono ${errors.token ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
              }
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {submitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus replay?</AlertDialogTitle>
            <AlertDialogDescription>
              Replay <span className="font-semibold text-foreground">"{confirmDel?.name}"</span> akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void doDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FieldRow({
  label,
  input,
  error,
  hint,
}: {
  label: string;
  input: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {input}
      {error ? (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}