import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import * as React from "react";
import type { Category, MenuItem, Restaurant } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ImageUpload";
import { deleteMenuImageByUrl } from "@/lib/storage";

export const Route = createFileRoute("/dashboard/menu")({
  component: MenuPage,
});

function MenuPage() {
  const { isSuperAdmin, restaurantId } = useAuth();
  const qc = useQueryClient();
  const [selectedRestaurant, setSelectedRestaurant] = React.useState<string | null>(restaurantId);
  const [editing, setEditing] = React.useState<MenuItem | null>(null);
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

  const { data: categories } = useQuery({
    queryKey: ["categories-for-menu", selectedRestaurant],
    enabled: !!selectedRestaurant,
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*")
        .eq("restaurant_id", selectedRestaurant!).order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["menu_items", selectedRestaurant],
    enabled: !!selectedRestaurant,
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*")
        .eq("restaurant_id", selectedRestaurant!).order("sort_order").order("created_at");
      if (error) throw error;
      return data as MenuItem[];
    },
  });

  const del = useMutation({
    mutationFn: async (item: MenuItem) => {
      if (item.image_url) await deleteMenuImageByUrl(item.image_url).catch(() => {});
      const { error } = await supabase.from("menu_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["menu_items"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const catName = (id: string | null) => categories?.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Menu items</h1>
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
        <div className="rounded border bg-background p-6 text-sm text-muted-foreground">Select a restaurant.</div>
      ) : (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
              {rows?.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    {m.image_url
                      ? <img src={m.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                      : <div className="h-10 w-10 rounded bg-muted" />}
                  </TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">{catName(m.category_id)}</TableCell>
                  <TableCell>
                    {m.discount_price != null
                      ? <><span className="line-through text-muted-foreground mr-1">{m.price}</span>{m.discount_price}</>
                      : m.price}
                  </TableCell>
                  <TableCell>{m.is_available ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(m); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost"
                        onClick={() => { if (confirm(`Delete ${m.name}?`)) del.mutate(m); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && rows?.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No items</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <MenuItemDialog
        open={open} onOpenChange={setOpen} editing={editing}
        restaurantId={selectedRestaurant} categories={categories ?? []}
      />
    </div>
  );
}

function MenuItemDialog({
  open, onOpenChange, editing, restaurantId, categories,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; editing: MenuItem | null;
  restaurantId: string | null; categories: Category[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState<Partial<MenuItem>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setForm(editing ?? { is_available: true, sort_order: 0, price: 0 });
  }, [editing, open]);

  const save = async () => {
    if (!restaurantId) return;
    if (!form.name?.trim()) { toast.error("Name required"); return; }
    if (form.price == null || isNaN(Number(form.price))) { toast.error("Price required"); return; }
    if (form.discount_price != null && form.discount_price !== ("" as unknown) &&
        Number(form.discount_price) >= Number(form.price)) {
      toast.error("Discount must be less than price");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        restaurant_id: restaurantId,
        category_id: form.category_id || null,
        image_url: form.image_url ?? null,
        name: form.name.trim(),
        description: form.description || null,
        price: Number(form.price),
        discount_price: form.discount_price == null || (form.discount_price as unknown) === ""
          ? null : Number(form.discount_price),
        is_available: form.is_available ?? true,
        sort_order: Number(form.sort_order ?? 0),
      };
      if (editing) {
        const { error } = await supabase.from("menu_items").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menu_items").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["menu_items"] });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit menu item" : "New menu item"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {restaurantId && (
            <ImageUpload
              restaurantId={restaurantId}
              value={form.image_url ?? null}
              onChange={(url) => setForm({ ...form, image_url: url })}
              label="Item image"
            />
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Name *</Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={form.category_id ?? ""} onValueChange={(v) => setForm({ ...form, category_id: v || null })}>
              <SelectTrigger><SelectValue placeholder="Uncategorized" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Price *</Label>
              <Input type="number" step="0.01" value={form.price ?? ""}
                onChange={(e) => setForm({ ...form, price: e.target.value === "" ? undefined : Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Discount price</Label>
              <Input type="number" step="0.01" value={form.discount_price ?? ""}
                onChange={(e) => setForm({ ...form, discount_price: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sort order</Label>
            <Input type="number" value={form.sort_order ?? 0}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </div>
          <div className="flex items-center justify-between rounded border p-3">
            <Label>Available</Label>
            <Switch checked={form.is_available ?? true} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
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
