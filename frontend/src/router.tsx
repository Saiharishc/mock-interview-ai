import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoginPage } from "@/pages/Login";
import { LandingPage } from "@/pages/Landing";
import { ConfigurePage } from "@/pages/Configure";
import { InterviewPage } from "@/pages/Interview";
import { ReportPage } from "@/pages/Report";
import { DashboardPage } from "@/pages/Dashboard";
import { SettingsPage } from "@/pages/Settings";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <LandingPage /> },
          { path: "/configure", element: <ConfigurePage /> },
          { path: "/interview/:sessionId", element: <InterviewPage /> },
          { path: "/report/:sessionId", element: <ReportPage /> },
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
