import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

function Overview() {
  const { isSuperAdmin, restaurantId } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["overview", isSuperAdmin, restaurantId],
    queryFn: async () => {
      const restaurantsQ = supabase.from("restaurants").select("*", { count: "exact", head: true });
      const categoriesQ = supabase.from("categories").select("*", { count: "exact", head: true });
      const itemsQ = supabase.from("menu_items").select("*", { count: "exact", head: true });
      if (!isSuperAdmin && restaurantId) {
        categoriesQ.eq("restaurant_id", restaurantId);
        itemsQ.eq("restaurant_id", restaurantId);
      }
      const [r, c, m] = await Promise.all([restaurantsQ, categoriesQ, itemsQ]);
      return {
        restaurants: r.count ?? 0,
        categories: c.count ?? 0,
        items: m.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          {isSuperAdmin ? "All restaurants" : "Your restaurant"}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {isSuperAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Restaurants</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{stats?.restaurants ?? "–"}</CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Categories</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats?.categories ?? "–"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Menu items</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats?.items ?? "–"}</CardContent>
        </Card>
      </div>
    </div>
  );
}
