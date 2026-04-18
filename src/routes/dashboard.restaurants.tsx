import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import * as React from "react";
import type { Restaurant } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/restaurants")({
  component: RestaurantsPage,
});

function RestaurantsPage() {
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState<Restaurant | null>(null);
  const [open, setOpen] = React.useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("restaurants").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Restaurant[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("restaurants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["restaurants"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (!isSuperAdmin) {
    return <div className="rounded-md border bg-background p-6 text-sm text-muted-foreground">Super admin only.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Restaurants</h1>
          <p className="text-sm text-muted-foreground">Manage all tenants</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add restaurant
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
            )}
            {rows?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-muted-foreground">{r.slug}</TableCell>
                <TableCell className="text-muted-foreground">{r.email ?? "—"}</TableCell>
                <TableCell>{r.is_active ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/r/$slug" params={{ slug: r.slug }} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => { if (confirm(`Delete ${r.name}? This cascades.`)) del.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && rows?.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No restaurants yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <RestaurantDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function RestaurantDialog({
  open, onOpenChange, editing,
}: { open: boolean; onOpenChange: (o: boolean) => void; editing: Restaurant | null }) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState<Partial<Restaurant>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setForm(editing ?? { is_active: true });
  }, [editing, open]);

  const save = async () => {
    setSaving(true);
    try {
      if (!form.name?.trim() || !form.slug?.trim()) {
        toast.error("Name and slug required");
        return;
      }
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        is_active: form.is_active ?? true,
      };
      if (editing) {
        const { error } = await supabase.from("restaurants").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("restaurants").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["restaurants"] });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><span /></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit restaurant" : "New restaurant"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Name *">
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Slug *">
            <Input value={form.slug ?? ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="my-restaurant" />
          </Field>
          <Field label="Phone">
            <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Address">
            <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <div className="flex items-center justify-between rounded border p-3">
            <Label>Active</Label>
            <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
