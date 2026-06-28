import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrowserWarning } from "@/components/BrowserWarning";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/configure", label: "New Interview" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/settings", label: "Settings" },
];

export function AppLayout() {
  const { user, clear } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">Mock Interview AI</Link>
          <nav className="flex items-center gap-1">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-1.5 rounded-md text-sm hover:bg-accent transition",
                    isActive && "bg-accent",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">{user.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clear();
                    navigate("/login");
                  }}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <BrowserWarning />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
