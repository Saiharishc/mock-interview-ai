import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Bar, BarChart,
} from "recharts";
import { apiClient } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface SessionSummary {
  id: number;
  role: string;
  difficulty: string;
  interview_type: string;
  mode: string;
  status: string;
  overall_score: number | null;
  created_at: string;
}

interface Analytics {
  total_sessions: number;
  avg_score: number;
  score_trend: { date: string; score: number; role: string }[];
  avg_topic_scores: Record<string, number>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "completed"
      ? "bg-emerald-500/10 text-emerald-500"
      : status === "active"
        ? "bg-primary/10 text-primary"
        : status === "cancelled"
          ? "bg-muted text-muted-foreground"
          : "bg-accent text-accent-foreground";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}

export function DashboardPage() {
  const { data: sessions = [] } = useQuery<SessionSummary[]>({
    queryKey: ["sessions"],
    queryFn: async () => (await apiClient.get("/sessions")).data,
  });

  const { data: analytics } = useQuery<Analytics>({
    queryKey: ["analytics"],
    queryFn: async () => (await apiClient.get("/analytics")).data,
  });

  const topicData = Object.entries(analytics?.avg_topic_scores ?? {}).map(([topic, score]) => ({ topic, score }));

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button asChild><Link to="/configure">New interview</Link></Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total sessions", value: analytics?.total_sessions ?? 0 },
          { label: "Avg score", value: analytics?.avg_score != null ? `${analytics.avg_score}/10` : "—" },
          { label: "Completed", value: sessions.filter((s) => s.status === "completed").length },
          { label: "Topics covered", value: Object.keys(analytics?.avg_topic_scores ?? {}).length },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Score trend */}
      {(analytics?.score_trend.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Score trend over time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics!.score_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v}/10`, "Score"]} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Topic averages */}
      {topicData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Average scores by topic</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topicData} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="topic" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v}/10`, "Avg score"]} />
                <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Session history */}
      <Card>
        <CardHeader><CardTitle className="text-base">Session history</CardTitle></CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions yet. <Link to="/" className="underline">Start your first interview.</Link></p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between border border-border rounded-md p-3">
                  <div className="text-sm">
                    <div className="font-medium">{s.role}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.difficulty} &middot; {s.interview_type} &middot; {s.mode} &middot; {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    {s.overall_score != null && (
                      <span className={cn(
                        "text-sm font-bold",
                        s.overall_score >= 7 ? "text-emerald-500" : s.overall_score >= 5 ? "text-yellow-400" : "text-destructive",
                      )}>
                        {s.overall_score.toFixed(1)}/10
                      </span>
                    )}
                    {s.status === "completed" && (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/report/${s.id}`}>View report</Link>
                      </Button>
                    )}
                    {s.status === "active" && (
                      <Button asChild size="sm">
                        <Link to={`/interview/${s.id}`}>Resume</Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
