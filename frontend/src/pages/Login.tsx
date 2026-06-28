import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginPage() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to Mock Interview AI</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Practice realistic interviews for your target role with an AI interviewer that adapts to your answers.
          </p>
        </CardHeader>
        <CardContent className="flex justify-center">
          <GoogleLogin
            onSuccess={async (resp) => {
              if (!resp.credential) return;
              const { data } = await apiClient.post("/auth/google", { id_token: resp.credential });
              setAuth(data.access_token, data.user);
              navigate("/");
            }}
            onError={() => alert("Google sign-in failed")}
            useOneTap={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
