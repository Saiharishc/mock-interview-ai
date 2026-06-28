import { useAuthStore } from "@/stores/authStore";

export function useAuth() {
  const { user, token, setAuth, clear } = useAuthStore();
  return { user, token, isAuthenticated: !!token, setAuth, logout: clear };
}
