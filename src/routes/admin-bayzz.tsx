import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminReplays, useAdminAuth, adminLogin, adminLogout, type Replay } from "@/lib/replays-store";
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
import { Pencil, Trash2, Plus, LogOut, ArrowLeft } from "lucide-react";
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

function Dashboard() {
  const { items, add, update, remove } = useAdminReplays();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Replay | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };
  const openEdit = (r: Replay) => {
    setEditing(r);
    setForm({ name: r.name, youtubeUrl: r.youtubeUrl, token: r.token });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.youtubeUrl.trim() || !form.token.trim()) {
      toast.error("Semua field wajib diisi");
      return;
    }
    try {
      if (editing) {
        await update(editing.id, form);
        toast.success("Replay diperbarui");
      } else {
        await add(form);
        toast.success("Replay ditambahkan");
      }
      setOpen(false);
    } catch {
      toast.error("Gagal menyimpan. Pastikan kamu masih login.");
    }
  };

  const handleDelete = async (r: Replay) => {
    if (confirm(`Hapus "${r.name}"?`)) {
      try {
        await remove(r.id);
        toast.success("Replay dihapus");
      } catch {
        toast.error("Gagal menghapus.");
      }
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
                            onClick={() => handleDelete(r)}
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
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Replay</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Link YouTube</Label>
              <Input
                value={form.youtubeUrl}
                onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Token Akses</Label>
              <Input
                value={form.token}
                onChange={(e) => setForm({ ...form, token: e.target.value })}
                placeholder="BAYZZ-XXX"
                className="bg-secondary border-border"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}