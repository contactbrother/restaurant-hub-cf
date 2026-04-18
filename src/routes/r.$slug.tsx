import { createFileRoute, notFound } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import type { Restaurant, Category, MenuItem } from "@/lib/database.types";

export const Route = createFileRoute("/r/$slug")({
  loader: async ({ params }) => {
    const { data: restaurant, error: rErr } = await supabase
      .from("restaurants").select("*")
      .eq("slug", params.slug).eq("is_active", true).maybeSingle();
    if (rErr) throw rErr;
    if (!restaurant) throw notFound();

    const [catRes, itemRes] = await Promise.all([
      supabase.from("categories").select("*")
        .eq("restaurant_id", restaurant.id).eq("is_active", true)
        .order("sort_order").order("name"),
      supabase.from("menu_items").select("*")
        .eq("restaurant_id", restaurant.id).eq("is_available", true)
        .order("sort_order").order("name"),
    ]);
    if (catRes.error) throw catRes.error;
    if (itemRes.error) throw itemRes.error;
    return {
      restaurant: restaurant as Restaurant,
      categories: catRes.data as Category[],
      items: itemRes.data as MenuItem[],
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.restaurant.name} — Menu` },
      { name: "description", content: `Browse the menu of ${loaderData.restaurant.name}` },
      { property: "og:title", content: `${loaderData.restaurant.name} — Menu` },
      { property: "og:description", content: `Browse the menu of ${loaderData.restaurant.name}` },
      ...(loaderData.restaurant.cover_image_url
        ? [{ property: "og:image", content: loaderData.restaurant.cover_image_url }] : []),
    ] : [],
  }),
  component: PublicMenu,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Restaurant not found</h1>
      </div>
    </div>
  ),
});

function PublicMenu() {
  const data = Route.useLoaderData() as {
    restaurant: Restaurant;
    categories: Category[];
    items: MenuItem[];
  };
  const { restaurant, categories, items } = data;
  const uncategorized = items.filter((i) => !i.category_id);

  return (
    <div className="min-h-screen bg-background">
      <div className="relative">
        {restaurant.cover_image_url && (
          <div className="h-48 w-full overflow-hidden bg-muted sm:h-64">
            <img src={restaurant.cover_image_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="flex items-center gap-3">
            {restaurant.logo_url && (
              <img src={restaurant.logo_url} alt="" className="h-14 w-14 rounded-full border bg-background object-cover" />
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{restaurant.name}</h1>
              {restaurant.address && <p className="text-sm text-muted-foreground">{restaurant.address}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-8 px-4 pb-16">
        {categories.map((c) => {
          const list = items.filter((i) => i.category_id === c.id);
          if (list.length === 0) return null;
          return <CategorySection key={c.id} title={c.name} items={list} />;
        })}
        {uncategorized.length > 0 && <CategorySection title="Other" items={uncategorized} />}
        {items.length === 0 && (
          <div className="rounded border bg-muted/20 p-8 text-center text-muted-foreground">
            No menu items yet.
          </div>
        )}
      </div>
    </div>
  );
}

function CategorySection({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold tracking-tight">{title}</h2>
      <div className="divide-y rounded-md border bg-background">
        {items.map((i) => (
          <article key={i.id} className="flex gap-3 p-3">
            {i.image_url && (
              <img src={i.image_url} alt={i.name} loading="lazy"
                className="h-20 w-20 flex-shrink-0 rounded object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium leading-tight">{i.name}</h3>
                <div className="whitespace-nowrap text-right text-sm">
                  {i.discount_price != null ? (
                    <>
                      <div className="text-muted-foreground line-through">{formatPrice(i.price)}</div>
                      <div className="font-semibold">{formatPrice(i.discount_price)}</div>
                    </>
                  ) : (
                    <div className="font-semibold">{formatPrice(i.price)}</div>
                  )}
                </div>
              </div>
              {i.description && <p className="mt-1 text-sm text-muted-foreground">{i.description}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatPrice(n: number) {
  return Number(n).toFixed(2);
}
