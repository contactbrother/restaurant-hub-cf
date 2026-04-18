import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import * as React from "react";
import type { Category, Restaurant } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const { isSuperAdmin, restaurantId } = useAuth();
  const qc = useQueryClient();
  const [selectedRestaurant, setSelectedRestaurant] = React.useState<string | null>(restaurantId);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isSuperAdmin) setSelectedRestaurant(restaurantId);
  }, [isSuperAdmin, restaurantId]);

  const { data: restaurants } = useQuery({
    queryKey: ["restaurants-list"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("restaurants").select("id, name, slug").order("name");
      if (error) throw error;
      return data as Pick<Restaurant, "id" | "name" | "slug">[];
    },
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["categories", selectedRestaurant],
    enabled: !!selectedRestaurant,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories").select("*")
        .eq("restaurant_id", selectedRestaurant!)
        .order("sort_order").order("created_at");
      if (error) throw error;
      return data as Category[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Select value={selectedRestaurant ?? ""} onValueChange={setSelectedRestaurant}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Select restaurant" /></SelectTrigger>
              <SelectContent>
                {restaurants?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button disabled={!selectedRestaurant} onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {!selectedRestaurant ? (
        <div className="rounded border bg-background p-6 text-sm text-muted-foreground">
          Select a restaurant to view its categories.
        </div>
      ) : (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Sort</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
              {rows?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.sort_order}</TableCell>
                  <TableCell>{c.is_active ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost"
                        onClick={() => { if (confirm(`Delete ${c.name}?`)) del.mutate(c.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && rows?.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No categories</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CategoryDialog
        open={open} onOpenChange={setOpen} editing={editing}
        restaurantId={selectedRestaurant}
      />
    </div>
  );
}

function CategoryDialog({
  open, onOpenChange, editing, restaurantId,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; editing: Category | null; restaurantId: string | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState<Partial<Category>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setForm(editing ?? { is_active: true, sort_order: 0 });
  }, [editing, open]);

  const save = async () => {
    if (!restaurantId) return;
    if (!form.name?.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sort_order: Number(form.sort_order ?? 0),
        is_active: form.is_active ?? true,
        restaurant_id: restaurantId,
      };
      if (editing) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["categories"] });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Name *</Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sort order</Label>
            <Input type="number" value={form.sort_order ?? 0}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </div>
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
