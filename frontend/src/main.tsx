import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { router } from "./router";
import { applyTheme, useUIStore } from "./stores/uiStore";
import "./index.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

// Apply persisted theme on first load
applyTheme(useUIStore.getState().theme);

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
