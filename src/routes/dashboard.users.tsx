import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UserProfile, Restaurant } from "@/lib/database.types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/dashboard/users")({
  component: UsersPage,
});

function UsersPage() {
  const { isSuperAdmin } = useAuth();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["user_profiles"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const [users, rests] = await Promise.all([
        supabase.from("user_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("restaurants").select("id, name"),
      ]);
      if (users.error) throw users.error;
      if (rests.error) throw rests.error;
      const map = new Map((rests.data as Pick<Restaurant, "id" | "name">[]).map((r) => [r.id, r.name]));
      return (users.data as UserProfile[]).map((u) => ({
        ...u, restaurant_name: u.restaurant_id ? map.get(u.restaurant_id) ?? "—" : "—",
      }));
    },
  });

  if (!isSuperAdmin) {
    return <div className="rounded-md border bg-background p-6 text-sm text-muted-foreground">Super admin only.</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Create auth users in the Supabase dashboard, then insert their profile row via SQL.
        </p>
      </div>
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Restaurant</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {rows?.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>{u.role.replace("_", " ")}</TableCell>
                <TableCell className="text-muted-foreground">{u.restaurant_name}</TableCell>
                <TableCell>{u.is_active ? "Yes" : "No"}</TableCell>
              </TableRow>
            ))}
            {!isLoading && rows?.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No users</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
