import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  listMembershipCodes,
  createMembershipCodes,
  deleteMembershipCode,
} from "@/lib/bayzz.functions";

type Row = {
  id: string;
  code: string;
  durationDays: number;
  createdAt: number;
  usedAt?: number;
};

export function AdminMembershipCodes() {
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(1);
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await listMembershipCodes();
      setRows(r as Row[]);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const generate = async () => {
    setBusy(true);
    try {
      const r = await createMembershipCodes({ data: { count, durationDays: days } });
      toast.success(`${r.created.length} kode dibuat`);
      await refresh();
    } catch {
      toast.error("Gagal membuat kode");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus kode ini?")) return;
    try {
      await deleteMembershipCode({ data: { id } });
      await refresh();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1200);
  };

  const active = rows.filter((r) => !r.usedAt);
  const used = rows.filter((r) => r.usedAt);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <div>
        <h2 className="font-semibold">Kode Membership</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Generate kode untuk diberikan ke user. Setiap kode hanya bisa dipakai 1x dan langsung mengaktifkan membership selama durasi yang dipilih.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs">Jumlah kode</Label>
          <Input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            className="bg-secondary border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Durasi (hari)</Label>
          <Input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 30)))}
            className="bg-secondary border-border"
          />
        </div>
        <Button onClick={generate} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
          <Plus className="h-4 w-4 mr-2" /> Generate
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Kode</TableHead>
                <TableHead>Durasi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Belum ada kode.
                  </TableCell>
                </TableRow>
              ) : (
                [...active, ...used].map((r) => (
                  <TableRow key={r.id} className="border-border">
                    <TableCell>
                      <code className={`rounded bg-secondary px-2 py-1 text-xs font-mono ${r.usedAt ? "line-through opacity-60" : ""}`}>
                        {r.code}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.durationDays} hari</TableCell>
                    <TableCell>
                      {r.usedAt ? (
                        <span className="text-xs text-muted-foreground">
                          Dipakai {new Date(r.usedAt).toLocaleDateString("id-ID")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Aktif
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        {!r.usedAt && (
                          <Button size="icon" variant="ghost" onClick={() => copy(r.code)}>
                            {copied === r.code ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove(r.id)}
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
    </section>
  );
}
