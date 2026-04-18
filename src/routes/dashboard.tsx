import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, LayoutDashboard, Store, FolderTree, UtensilsCrossed, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { loading, isAuthenticated, profile, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAuthenticated) {
    void navigate({ to: "/login" });
    return null;
  }

  const nav = [
    { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
    ...(isSuperAdmin
      ? [{ to: "/dashboard/restaurants", label: "Restaurants", icon: Store, exact: false }]
      : []),
    { to: "/dashboard/categories", label: "Categories", icon: FolderTree, exact: false },
    { to: "/dashboard/menu", label: "Menu items", icon: UtensilsCrossed, exact: false },
    ...(isSuperAdmin ? [{ to: "/dashboard/users", label: "Users", icon: Users, exact: false }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-60 flex-col border-r bg-background md:flex">
        <div className="border-b px-4 py-4">
          <div className="text-sm font-semibold">Restaurant Admin</div>
          <div className="mt-1 text-xs text-muted-foreground truncate">{profile?.email}</div>
          <div className="mt-1 inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
            {profile?.role.replace("_", " ")}
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {nav.map((item) => {
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-secondary font-medium" : "hover:bg-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-2">
          <Button variant="ghost" className="w-full justify-start" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1">
        <header className="flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
          <div className="text-sm font-semibold">Restaurant Admin</div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <div className="mx-auto max-w-6xl p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
