import { Moon, Sun } from "lucide-react";
import { applyTheme, useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useUIStore();
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
