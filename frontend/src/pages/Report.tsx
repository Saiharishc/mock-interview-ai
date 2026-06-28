import { useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreCard } from "@/components/report/ScoreCard";
import { TopicChart } from "@/components/report/TopicChart";
import type { Report } from "@/hooks/useInterviewSocket";

function TagList({ items, variant }: { items: string[]; variant: "good" | "bad" | "study" }) {
  const cls =
    variant === "good"
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      : variant === "bad"
        ? "bg-destructive/10 text-destructive border-destructive/20"
        : "bg-primary/10 text-primary border-primary/20";
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <span key={t} className={`px-3 py-1 rounded-full border text-sm ${cls}`}>{t}</span>
      ))}
    </div>
  );
}

export function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();

  // Prefer the report passed via navigate state (available immediately after interview ends)
  const passedReport = location.state?.report as Report | undefined;

  const { data: fetchedReport } = useQuery<Report>({
    queryKey: ["report", sessionId],
    queryFn: async () => (await apiClient.get(`/sessions/${sessionId}/report`)).data,
    enabled: !passedReport,
  });

  const report = passedReport ?? fetchedReport;

  async function downloadPdf() {
    const res = await apiClient.get(`/sessions/${sessionId}/report.pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-report-${sessionId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading report…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Interview Report</h1>
        <Button onClick={downloadPdf} variant="outline">
          <Download className="h-4 w-4 mr-1" /> Download PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ScoreCard score={report.overall_score} />
        <div className="sm:col-span-2 rounded-xl border border-border bg-card p-6 flex items-center">
          <p className="text-sm leading-relaxed text-muted-foreground">{report.summary}</p>
        </div>
      </div>

      <TopicChart topicScores={report.topic_scores} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Strong Areas</CardTitle></CardHeader>
          <CardContent><TagList items={report.strong_areas} variant="good" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Weak Areas</CardTitle></CardHeader>
          <CardContent><TagList items={report.weak_areas} variant="bad" /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recommended Study Topics</CardTitle></CardHeader>
        <CardContent><TagList items={report.recommended_topics} variant="study" /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Suggestions for Improvement</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {report.suggestions.map((s, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-primary font-bold shrink-0">{i + 1}.</span> {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
