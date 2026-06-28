import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionDraftStore } from "@/stores/sessionDraftStore";

export function LandingPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");
  const setDraft = useSessionDraftStore((s) => s.setDraft);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Become interview-ready.</h1>
        <p className="mt-3 text-muted-foreground">
          AI interviewer for any role. Realistic questions, adaptive follow-ups, and a detailed score report.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>What role are you preparing for?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder='e.g. "Generative AI Engineer", "Data Scientist", "SAP Technical Lead"'
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <Textarea
            placeholder="Paste the job description here (optional). The interviewer will tailor questions to it."
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
          <Button
            size="lg"
            disabled={!role.trim()}
            onClick={() => {
              setDraft({ role: role.trim(), jd_text: jd.trim() || null });
              navigate("/configure");
            }}
          >
            Configure interview →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
